import { CoupledCellState, CoupledForecast, CoupledSimulationState } from '../types/coupling';
import { DrainageEdgeState, DrainageNodeState, DrainageNetworkState } from '../types/drainage';
import {
  Alert,
  AlertSeverity,
  HorizonRiskState,
  RiskAssessment,
  RiskForecast,
  RiskLevel,
  RISK_COLORS,
} from '../types/risk';

/**
 * Classifies raw flood inundation depth (in cm) into baseline hydrologic risk categories.
 * 
 * Thresholds:
 * - 0 to <5 cm: LOW
 * - 5 to <20 cm: MODERATE
 * - 20 to <50 cm: HIGH
 * - 50 to <100 cm: VERY_HIGH
 * - >=100 cm: CRITICAL
 */
export function classifyFloodDepth(depth_cm: number): RiskLevel {
  const depth = Math.max(0, depth_cm);
  if (depth < 5.0) return 'LOW';
  if (depth < 20.0) return 'MODERATE';
  if (depth < 50.0) return 'HIGH';
  if (depth < 100.0) return 'VERY_HIGH';
  return 'CRITICAL';
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  CRITICAL: 5,
  VERY_HIGH: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
};

/**
 * Evaluates the combined hydrologic and infrastructure risk for an individual coupled cell.
 * Combines 2D surface inundation depth with 1D drainage node surcharge and pipe capacity.
 */
export function assessCellRisk(
  cell: CoupledCellState,
  drainageState: DrainageNetworkState
): RiskAssessment {
  const depth_cm = Math.max(0, cell.water_depth_cm);
  const depth_m = depth_cm / 100;
  const baselineRisk = classifyFloodDepth(depth_cm);

  // Identify nodes associated with this cell
  const cellNodes: DrainageNodeState[] = drainageState.nodes.filter(
    (n) => n.catchment_cell_id === cell.cell_id || cell.associated_node_ids?.includes(n.id)
  );

  const hasDrainageNode = cellNodes.length > 0;

  // Find worst node status among associated nodes
  let worstNodeStatus: 'NORMAL' | 'WATCH' | 'SURCHARGE' | 'OVERFLOW' | undefined = undefined;
  let totalNodeSurchargeRate = 0;

  if (hasDrainageNode) {
    for (const node of cellNodes) {
      totalNodeSurchargeRate += node.surcharge_rate_m3_s;
      if (node.status === 'OVERFLOW') {
        worstNodeStatus = 'OVERFLOW';
      } else if (node.status === 'SURCHARGE' && worstNodeStatus !== 'OVERFLOW') {
        worstNodeStatus = 'SURCHARGE';
      } else if (node.status === 'WATCH' && !worstNodeStatus) {
        worstNodeStatus = 'WATCH';
      } else if (!worstNodeStatus) {
        worstNodeStatus = 'NORMAL';
      }
    }
  }

  // Find associated outgoing/connected pipes
  const nodeIds = new Set(cellNodes.map((n) => n.id));
  const cellPipes: DrainageEdgeState[] = drainageState.edges.filter(
    (e) => nodeIds.has(e.from_node) || nodeIds.has(e.to_node)
  );

  const pipeOverCapacity = cellPipes.some(
    (p) => p.status === 'OVER_CAPACITY' || p.utilization_pct >= 100
  );

  const surcharge_m3 = Math.max(0, cell.drainage_surcharge_return_m3);
  const hasSurcharge = surcharge_m3 > 0 || totalNodeSurchargeRate > 0 || worstNodeStatus === 'SURCHARGE' || worstNodeStatus === 'OVERFLOW';
  const hasOverflow = worstNodeStatus === 'OVERFLOW';

  const reasons: string[] = [];
  if (depth_cm > 0) {
    reasons.push(`Surface depth: ${depth_cm.toFixed(1)} cm (${baselineRisk} baseline)`);
  }

  // Multi-variable Escalation Logic
  let finalRisk: RiskLevel = baselineRisk;

  if (depth_cm >= 100.0) {
    finalRisk = 'CRITICAL';
    reasons.push(`Inundation depth >= 100 cm triggers automatic CRITICAL risk`);
  } else if (depth_cm >= 50.0) {
    // 50-100 cm: VERY_HIGH baseline
    if (hasOverflow || (hasSurcharge && depth_cm >= 75.0)) {
      finalRisk = 'CRITICAL';
      reasons.push(`Escalated to CRITICAL due to severe depth (${depth_cm.toFixed(1)} cm) with active drainage surcharge/overflow`);
    } else {
      finalRisk = 'VERY_HIGH';
      if (hasSurcharge) {
        reasons.push(`Active drainage surcharge adds hydraulic backpressure`);
      }
    }
  } else if (depth_cm >= 20.0) {
    // 20-50 cm: HIGH baseline
    if (hasOverflow) {
      finalRisk = 'CRITICAL';
      reasons.push(`Escalated to CRITICAL due to node hydraulic OVERFLOW`);
    } else if (hasSurcharge || pipeOverCapacity) {
      finalRisk = 'VERY_HIGH';
      reasons.push(`Escalated from HIGH to VERY_HIGH due to drainage surcharge/pipe overcapacity`);
    } else {
      finalRisk = 'HIGH';
    }
  } else if (depth_cm >= 5.0) {
    // 5-20 cm: MODERATE baseline
    if (hasOverflow) {
      finalRisk = 'VERY_HIGH';
      reasons.push(`Escalated to VERY_HIGH due to underground node OVERFLOW`);
    } else if (hasSurcharge || pipeOverCapacity) {
      finalRisk = 'HIGH';
      reasons.push(`Escalated from MODERATE to HIGH due to drainage surcharge/pipe overcapacity`);
    } else {
      finalRisk = 'MODERATE';
    }
  } else {
    // < 5 cm: LOW baseline
    if (hasOverflow) {
      finalRisk = 'HIGH';
      reasons.push(`Escalated from LOW to HIGH due to underground node OVERFLOW`);
    } else if (hasSurcharge || (pipeOverCapacity && depth_cm > 0)) {
      finalRisk = 'MODERATE';
      reasons.push(`Escalated from LOW to MODERATE due to active drainage surcharge`);
    } else {
      finalRisk = 'LOW';
      if (depth_cm === 0 && surcharge_m3 === 0) {
        reasons.push(`Dry surface and normal underground drainage`);
      }
    }
  }

  if (surcharge_m3 > 0) {
    reasons.push(`Surcharge volume returned to surface: ${surcharge_m3.toFixed(1)} m³`);
  }
  if (pipeOverCapacity) {
    const overPipes = cellPipes.filter((p) => p.status === 'OVER_CAPACITY' || p.utilization_pct >= 100);
    for (const p of overPipes) {
      reasons.push(`Pipe ${p.name} at ${p.utilization_pct.toFixed(0)}% capacity`);
    }
  }

  return {
    cellId: cell.cell_id,
    row: cell.grid_row,
    col: cell.grid_col,
    zoneName: cell.zone_name,
    depth_cm,
    depth_m,
    riskLevel: finalRisk,
    depthCategory: baselineRisk,
    color: RISK_COLORS[finalRisk],
    surcharge_m3,
    surcharge_m3s: totalNodeSurchargeRate,
    hasDrainageNode,
    drainageNodeStatus: worstNodeStatus,
    pipeOverCapacity,
    reasons,
  };
}

/**
 * Generates alerts for an individual simulation horizon.
 */
export function generateHorizonAlerts(
  state: CoupledSimulationState,
  assessments: RiskAssessment[]
): Alert[] {
  const alerts: Alert[] = [];
  const horizon = state.horizon_label;
  const horizonHours = state.hour_offset;
  const timestamp = state.timestamp;

  // 1. Critical Flood Risk Alerts & Deep Inundation Alerts
  for (const a of assessments) {
    if (a.riskLevel === 'CRITICAL') {
      alerts.push({
        id: `ALERT-CRIT-${horizon}-${a.cellId}`,
        type: 'CRITICAL_FLOOD_RISK',
        severity: 'CRITICAL',
        horizon,
        horizonHours,
        title: `Critical Flood Risk: ${a.zoneName}`,
        description: `Critical inundation hazard (${a.depth_cm.toFixed(1)} cm depth) with compounding hydraulic stress in ${a.zoneName}. Immediate evacuation or flood barrier deployment advised.`,
        location: a.zoneName,
        cellId: a.cellId,
        metricValue: a.depth_cm,
        metricUnit: 'cm',
        timestamp,
        provenance: 'MODEL OUTPUT / DERIVED',
      });
    } else if (a.depth_cm >= 20.0) {
      const severity: AlertSeverity = a.depth_cm >= 50.0 ? 'VERY_HIGH' : 'HIGH';
      alerts.push({
        id: `ALERT-DEPTH-${horizon}-${a.cellId}`,
        type: 'FLOOD_DEPTH',
        severity,
        horizon,
        horizonHours,
        title: `High Surface Inundation: ${a.zoneName}`,
        description: `Water depth has reached ${a.depth_cm.toFixed(1)} cm in ${a.zoneName}, exceeding standard road curb clearance and causing vehicular stalling.`,
        location: a.zoneName,
        cellId: a.cellId,
        metricValue: a.depth_cm,
        metricUnit: 'cm',
        timestamp,
        provenance: 'MODEL OUTPUT / DERIVED',
      });
    }
  }

  // 2. Drainage Node Surcharge Alerts
  for (const node of state.drainage_network.nodes) {
    if (node.status === 'OVERFLOW' || node.status === 'SURCHARGE') {
      const isOverflow = node.status === 'OVERFLOW';
      const severity: AlertSeverity = isOverflow ? 'CRITICAL' : 'HIGH';
      alerts.push({
        id: `ALERT-NODE-${horizon}-${node.id}`,
        type: 'DRAINAGE_SURCHARGE',
        severity,
        horizon,
        horizonHours,
        title: `${isOverflow ? 'Drainage Overflow' : 'Drainage Surcharge'}: ${node.name}`,
        description: `Node ${node.name} (${node.node_type}) is surcharging at ${node.surcharge_rate_m3_s.toFixed(2)} m³/s (${(node.surcharge_ratio * 100).toFixed(0)}% load) due to downstream capacity limits.`,
        location: `${node.name} (${node.catchment_cell_id})`,
        nodeId: node.id,
        cellId: node.catchment_cell_id,
        metricValue: node.surcharge_rate_m3_s,
        metricUnit: 'm³/s',
        timestamp,
        provenance: 'MODEL OUTPUT / DERIVED',
      });
    }
  }

  // 3. Pipe Overcapacity Alerts
  for (const edge of state.drainage_network.edges) {
    if (edge.status === 'OVER_CAPACITY' || edge.utilization_pct >= 100.0) {
      const severity: AlertSeverity = edge.utilization_pct >= 125.0 ? 'VERY_HIGH' : 'HIGH';
      alerts.push({
        id: `ALERT-PIPE-${horizon}-${edge.id}`,
        type: 'PIPE_OVER_CAPACITY',
        severity,
        horizon,
        horizonHours,
        title: `Pipe Overcapacity: ${edge.name}`,
        description: `Conduit ${edge.name} hydraulic capacity exceeded: utilization is at ${edge.utilization_pct.toFixed(1)}% (${edge.actual_flow_m3_s.toFixed(2)} / ${edge.capacity_m3_s.toFixed(2)} m³/s).`,
        location: `${edge.name} (${edge.from_node} → ${edge.to_node})`,
        pipeId: edge.id,
        metricValue: edge.utilization_pct,
        metricUnit: '%',
        timestamp,
        provenance: 'MODEL OUTPUT / DERIVED',
      });
    }
  }

  // Sort alerts: Highest severity first, then by metricValue descending
  alerts.sort((a, b) => {
    const diff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (diff !== 0) return diff;
    return b.metricValue - a.metricValue;
  });

  return alerts;
}

/**
 * Generates the complete Risk Assessment State for a single simulation horizon.
 */
export function generateHorizonRiskState(state: CoupledSimulationState): HorizonRiskState {
  const cellAssessments = state.cells.map((cell) =>
    assessCellRisk(cell, state.drainage_network)
  );

  const riskCounts: Record<RiskLevel, number> = {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
    VERY_HIGH: 0,
    CRITICAL: 0,
  };

  let highestRisk: RiskLevel = 'LOW';

  for (const a of cellAssessments) {
    riskCounts[a.riskLevel]++;
    if (SEVERITY_RANK[a.riskLevel] > SEVERITY_RANK[highestRisk]) {
      highestRisk = a.riskLevel;
    }
  }

  const alerts = generateHorizonAlerts(state, cellAssessments);

  const surchargedNodeCount = state.drainage_network.nodes.filter(
    (n) => n.status === 'SURCHARGE'
  ).length;

  const overflowNodeCount = state.drainage_network.nodes.filter(
    (n) => n.status === 'OVERFLOW'
  ).length;

  const overCapacityPipeCount = state.drainage_network.edges.filter(
    (e) => e.status === 'OVER_CAPACITY' || e.utilization_pct >= 100.0
  ).length;

  const criticalCellCount = riskCounts.CRITICAL;
  const highOrVeryHighCellCount = riskCounts.HIGH + riskCounts.VERY_HIGH;

  return {
    horizon: state.horizon_label,
    horizonHours: state.hour_offset,
    timestamp: state.timestamp,
    cellAssessments,
    highestRisk,
    riskCounts,
    alerts,
    surchargedNodeCount,
    overflowNodeCount,
    overCapacityPipeCount,
    criticalCellCount,
    highOrVeryHighCellCount,
    provenance: 'MODEL OUTPUT / DERIVED',
  };
}

/**
 * Evaluates the full 0–3 hour risk forecast from a Phase 3D CoupledForecast.
 */
export function generateRiskForecast(coupledForecast: CoupledForecast): RiskForecast {
  const h0 = generateHorizonRiskState(coupledForecast.horizons[0]);
  const h1 = generateHorizonRiskState(coupledForecast.horizons[1]);
  const h2 = generateHorizonRiskState(coupledForecast.horizons[2]);
  const h3 = generateHorizonRiskState(coupledForecast.horizons[3]);

  const horizons: Record<'T+0' | 'T+1' | 'T+2' | 'T+3', HorizonRiskState> = {
    'T+0': h0,
    'T+1': h1,
    'T+2': h2,
    'T+3': h3,
  };

  const currentRisk = h0.highestRisk;

  let highestRiskAcrossAllHorizons: RiskLevel = 'LOW';
  for (const h of [h0, h1, h2, h3]) {
    if (SEVERITY_RANK[h.highestRisk] > SEVERITY_RANK[highestRiskAcrossAllHorizons]) {
      highestRiskAcrossAllHorizons = h.highestRisk;
    }
  }

  // Combine all alerts across horizons sorted by severity descending, then horizon ascending
  const allAlerts: Alert[] = [...h0.alerts, ...h1.alerts, ...h2.alerts, ...h3.alerts];
  allAlerts.sort((a, b) => {
    const sDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sDiff !== 0) return sDiff;
    const hDiff = a.horizonHours - b.horizonHours;
    if (hDiff !== 0) return hDiff;
    return b.metricValue - a.metricValue;
  });

  return {
    generatedAt: coupledForecast.generated_at,
    currentRisk,
    highestRiskAcrossAllHorizons,
    horizons,
    allAlerts,
    provenance: 'MODEL OUTPUT / DERIVED',
  };
}
