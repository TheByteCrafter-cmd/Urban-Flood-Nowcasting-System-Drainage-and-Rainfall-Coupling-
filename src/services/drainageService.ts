import {
  DrainageNodeStatus,
  PipeType,
  PipeUtilizationCategory,
  DrainageNodeParameters,
  DrainageEdgeParameters,
  DrainageNodeState,
  DrainageEdgeState,
  DrainageNetworkState,
  DrainageForecast,
} from '../types/drainage';
import { RunoffForecast, RunoffGrid, RunoffProvenance } from '../types/runoff';
import { PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES } from '../mock/drainageNetwork';

/**
 * Ratio of regional macro-cell runoff (28.15 km²) intercepted by each prototype trunk inlet.
 * In a real catchment, multiple minor gutters convey runoff to the trunk. Here, the prototype
 * trunk collector intercepts ~10% of the regional macro-cell runoff rate.
 */
const INLET_CAPTURE_RATIO = 0.10;

/**
 * Calculates gravity hydraulic capacity Q (m³/s) using Manning's equation:
 * Q = (1/n) * A * R^(2/3) * S^(1/2)
 *
 * Dimensionally exact:
 * - A: Cross-sectional area (m²)
 * - R: Hydraulic radius A / P (m)
 * - S: Hydraulic bed slope (m/m)
 * - n: Manning roughness coefficient (s/m^(1/3))
 */
export function calculateManningCapacity(edge: {
  edge_type: PipeType;
  diameter_m?: number;
  width_m?: number;
  height_m?: number;
  slope: number;
  roughness_n: number;
}): {
  area_m2: number;
  hydraulic_radius_m: number;
  capacity_m3_s: number;
} {
  const S = Math.max(0.0001, edge.slope);
  const n = Math.max(0.009, edge.roughness_n);

  let A = 0;
  let P = 0; // Wetted perimeter

  if (edge.edge_type === 'CIRCULAR_PIPE') {
    const D = edge.diameter_m || 1.0;
    A = (Math.PI * D * D) / 4;
    P = Math.PI * D;
  } else if (edge.edge_type === 'BOX_CULVERT') {
    const W = edge.width_m || 2.0;
    const H = edge.height_m || 1.5;
    A = W * H;
    P = 2 * (W + H); // Enclosed box culvert flowing full
  } else {
    // OPEN_CANAL
    const W = edge.width_m || 3.0;
    const H = edge.height_m || 2.0;
    A = W * H;
    P = W + 2 * H; // Open top canal
  }

  const R = A / P;
  // Manning equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
  const capacity = (1 / n) * A * Math.pow(R, 2 / 3) * Math.sqrt(S);

  return {
    area_m2: Number(A.toFixed(4)),
    hydraulic_radius_m: Number(R.toFixed(4)),
    capacity_m3_s: Number(capacity.toFixed(3)),
  };
}

/**
 * Classifies pipe flow utilization percentage.
 */
export function getPipeUtilizationCategory(pct: number): {
  category: PipeUtilizationCategory;
  color: string;
} {
  if (pct >= 100) return { category: 'OVER_CAPACITY', color: '#EF4444' }; // Red
  if (pct >= 80) return { category: 'HIGH', color: '#F97316' };           // Orange
  if (pct >= 50) return { category: 'MODERATE', color: '#F59E0B' };       // Amber
  return { category: 'NORMAL', color: '#10B981' };                        // Emerald
}

/**
 * Classifies node surcharge ratio.
 */
export function getNodeSurchargeStatus(ratio: number, isOutfall: boolean): {
  status: DrainageNodeStatus;
  color: string;
} {
  if (isOutfall) {
    return { status: 'NORMAL', color: '#06B6D4' }; // Cyan / Marine Outfall
  }
  if (ratio >= 1.25) return { status: 'OVERFLOW', color: '#DC2626' };     // Deep Red
  if (ratio >= 1.00) return { status: 'SURCHARGE', color: '#EA580C' };    // Vibrant Orange
  if (ratio >= 0.75) return { status: 'WATCH', color: '#EAB308' };        // Yellow
  return { status: 'NORMAL', color: '#3B82F6' };                          // Blue
}

/**
 * Computes topological sorting of the directed acyclic graph (DAG)
 * using Kahn's algorithm, ensuring upstream nodes are evaluated before downstream.
 */
export function getTopologicalOrder(
  nodes: DrainageNodeParameters[],
  edges: DrainageEdgeParameters[]
): string[] {
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adjList[n.id] = [];
  });

  edges.forEach((e) => {
    if (inDegree[e.to_node] !== undefined) {
      inDegree[e.to_node]++;
      adjList[e.from_node].push(e.to_node);
    }
  });

  // Queue nodes with inDegree 0 (headwater inlets)
  const queue: string[] = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const ordered: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    ordered.push(u);

    for (const v of adjList[u] || []) {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    }
  }

  // Fallback if any unvisited nodes remain (e.g. isolated outfalls)
  if (ordered.length < nodes.length) {
    nodes.forEach((n) => {
      if (!ordered.includes(n.id)) {
        ordered.push(n.id);
      }
    });
  }

  return ordered;
}

/**
 * Simulates hydraulic flow, edge utilization, and node surcharge
 * across the prototype drainage network for a specific runoff grid.
 */
export function simulateDrainageNetwork(
  runoffGrid: RunoffGrid,
  nodesParams: DrainageNodeParameters[] = PROTOTYPE_DRAINAGE_NODES,
  edgesParams: DrainageEdgeParameters[] = PROTOTYPE_DRAINAGE_EDGES
): DrainageNetworkState {
  const timestamp = runoffGrid.timestamp;
  const hourOffset = runoffGrid.hour_offset;
  const horizonLabel = runoffGrid.horizon_label;
  const status = runoffGrid.status;
  const provenance = status === 'LIVE' ? ('DERIVED_NOWCAST' as RunoffProvenance) : runoffGrid.cells[0]?.rainfall_provenance || 'DEMO_BASELINE';

  // 1. Index cell runoff rates from Phase 3A
  const runoffByCellId: Record<string, number> = {};
  runoffGrid.cells.forEach((c) => {
    runoffByCellId[c.cell_id] = c.runoff_rate_m3_s;
  });

  // 2. Precompute edge capacities via Manning's formula
  const edgeCapacities: Record<
    string,
    { area_m2: number; hydraulic_radius_m: number; capacity_m3_s: number }
  > = {};

  edgesParams.forEach((e) => {
    edgeCapacities[e.id] = calculateManningCapacity(e);
  });

  // 3. Map outgoing and incoming edges per node
  const outgoingEdgesByNode: Record<string, DrainageEdgeParameters[]> = {};
  const incomingEdgesByNode: Record<string, DrainageEdgeParameters[]> = {};

  nodesParams.forEach((n) => {
    outgoingEdgesByNode[n.id] = [];
    incomingEdgesByNode[n.id] = [];
  });

  edgesParams.forEach((e) => {
    if (outgoingEdgesByNode[e.from_node]) {
      outgoingEdgesByNode[e.from_node].push(e);
    }
    if (incomingEdgesByNode[e.to_node]) {
      incomingEdgesByNode[e.to_node].push(e);
    }
  });

  // 4. Determine node available discharge capacities
  const nodeDischargeCapacities: Record<string, number> = {};
  nodesParams.forEach((n) => {
    if (n.node_type === 'OUTFALL' && n.explicit_outlet_capacity_m3_s !== undefined) {
      nodeDischargeCapacities[n.id] = n.explicit_outlet_capacity_m3_s;
    } else {
      const outEdges = outgoingEdgesByNode[n.id] || [];
      const sumCap = outEdges.reduce((sum, e) => sum + edgeCapacities[e.id].capacity_m3_s, 0);
      nodeDischargeCapacities[n.id] = Number(sumCap.toFixed(3));
    }
  });

  // 5. Initialize node flow states
  const nodeFlows: Record<
    string,
    {
      surface_inflow_m3_s: number;
      upstream_pipe_inflow_m3_s: number;
      total_inflow_m3_s: number;
      discharged_outflow_m3_s: number;
      surcharge_rate_m3_s: number;
    }
  > = {};

  nodesParams.forEach((n) => {
    let surfaceInflow = 0;
    if (status !== 'ERROR' && n.node_type === 'INLET') {
      const cellRunoff = runoffByCellId[n.catchment_cell_id] || 0;
      surfaceInflow = Number((cellRunoff * INLET_CAPTURE_RATIO).toFixed(3));
    }

    nodeFlows[n.id] = {
      surface_inflow_m3_s: surfaceInflow,
      upstream_pipe_inflow_m3_s: 0,
      total_inflow_m3_s: surfaceInflow,
      discharged_outflow_m3_s: 0,
      surcharge_rate_m3_s: 0,
    };
  });

  // 6. Track edge flows
  const edgeFlows: Record<string, number> = {};
  edgesParams.forEach((e) => {
    edgeFlows[e.id] = 0;
  });

  // 7. Topological flow propagation
  const topoOrder = getTopologicalOrder(nodesParams, edgesParams);

  topoOrder.forEach((nodeId) => {
    const node = nodesParams.find((n) => n.id === nodeId);
    if (!node) return;

    const flowState = nodeFlows[nodeId];
    flowState.total_inflow_m3_s = Number(
      (flowState.surface_inflow_m3_s + flowState.upstream_pipe_inflow_m3_s).toFixed(3)
    );

    const availableCapacity = nodeDischargeCapacities[nodeId];
    const Q_in = flowState.total_inflow_m3_s;

    if (node.node_type === 'OUTFALL') {
      // Outfall node: discharges up to its marine outlet capacity; excess is tidal surcharge
      const Q_discharge = Math.min(Q_in, availableCapacity);
      const Q_excess = Math.max(0, Q_in - availableCapacity);

      flowState.discharged_outflow_m3_s = Number(Q_discharge.toFixed(3));
      flowState.surcharge_rate_m3_s = Number(Q_excess.toFixed(3));
    } else {
      // Intermediate Manhole / Inlet:
      // Available outflow cannot exceed sum of outgoing pipe capacities
      const Q_discharge = Math.min(Q_in, availableCapacity);
      const Q_excess = Math.max(0, Q_in - availableCapacity);

      flowState.discharged_outflow_m3_s = Number(Q_discharge.toFixed(3));
      flowState.surcharge_rate_m3_s = Number(Q_excess.toFixed(3));

      // Distribute Q_discharge to outgoing edges proportional to capacity
      const outEdges = outgoingEdgesByNode[nodeId] || [];
      if (outEdges.length > 0 && availableCapacity > 0) {
        let remainingDischarge = Q_discharge;

        outEdges.forEach((e, idx) => {
          const cap = edgeCapacities[e.id].capacity_m3_s;
          let pipeFlow = 0;

          if (idx === outEdges.length - 1) {
            // Last pipe takes exact residual to prevent floating-point loss
            pipeFlow = Math.min(cap, Number(remainingDischarge.toFixed(3)));
          } else {
            const fraction = cap / availableCapacity;
            pipeFlow = Math.min(cap, Number((Q_discharge * fraction).toFixed(3)));
            remainingDischarge -= pipeFlow;
          }

          edgeFlows[e.id] = pipeFlow;

          // Propagate flow to downstream node
          if (nodeFlows[e.to_node]) {
            nodeFlows[e.to_node].upstream_pipe_inflow_m3_s = Number(
              (nodeFlows[e.to_node].upstream_pipe_inflow_m3_s + pipeFlow).toFixed(3)
            );
          }
        });
      }
    }
  });

  // 8. Construct final node states
  let totalSurfaceInflowM3S = 0;
  let totalOutfallDischargeM3S = 0;
  let totalSurchargeM3S = 0;
  let surchargedNodesCount = 0;

  const finalNodeStates: DrainageNodeState[] = nodesParams.map((n) => {
    const f = nodeFlows[n.id];
    const capacity = nodeDischargeCapacities[n.id];
    const surchargeRatio = capacity > 0 ? Number((f.total_inflow_m3_s / capacity).toFixed(3)) : 0;
    const { status: nodeStatus } = getNodeSurchargeStatus(surchargeRatio, n.node_type === 'OUTFALL');

    if (nodeStatus === 'SURCHARGE' || nodeStatus === 'OVERFLOW') {
      surchargedNodesCount++;
    }

    totalSurfaceInflowM3S += f.surface_inflow_m3_s;
    if (n.node_type === 'OUTFALL') {
      totalOutfallDischargeM3S += f.discharged_outflow_m3_s;
    }
    totalSurchargeM3S += f.surcharge_rate_m3_s;

    return {
      id: n.id,
      name: n.name,
      node_type: n.node_type,
      lat: n.lat,
      lng: n.lng,
      elevation_m: n.elevation_m,
      catchment_cell_id: n.catchment_cell_id,
      surface_inflow_m3_s: f.surface_inflow_m3_s,
      upstream_pipe_inflow_m3_s: f.upstream_pipe_inflow_m3_s,
      total_inflow_m3_s: f.total_inflow_m3_s,
      discharged_outflow_m3_s: f.discharged_outflow_m3_s,
      surcharge_rate_m3_s: f.surcharge_rate_m3_s,
      node_capacity_m3_s: capacity,
      surcharge_ratio: surchargeRatio,
      status: nodeStatus,
      status_reason:
        nodeStatus === 'OVERFLOW'
          ? `Severe hydraulic surcharge (Q_in = ${f.total_inflow_m3_s} m³/s exceeds capacity ${capacity} m³/s by ${f.surcharge_rate_m3_s} m³/s)`
          : nodeStatus === 'SURCHARGE'
          ? `Inflow exceeds pipe capacity by ${f.surcharge_rate_m3_s} m³/s`
          : nodeStatus === 'WATCH'
          ? `High pipe utilization (${(surchargeRatio * 100).toFixed(0)}%)`
          : 'Normal gravity conveyance',
      provenance: 'ASSUMED_PROTOTYPE',
    };
  });

  // 9. Construct final edge states
  let overcapacityPipesCount = 0;
  let totalUtilizationPct = 0;

  const finalEdgeStates: DrainageEdgeState[] = edgesParams.map((e) => {
    const capInfo = edgeCapacities[e.id];
    const actualFlow = edgeFlows[e.id] || 0;
    const utilPct = capInfo.capacity_m3_s > 0 ? Number(((actualFlow / capInfo.capacity_m3_s) * 100).toFixed(1)) : 0;
    const { category: pipeStatus } = getPipeUtilizationCategory(utilPct);

    if (pipeStatus === 'OVER_CAPACITY') {
      overcapacityPipesCount++;
    }
    totalUtilizationPct += utilPct;

    return {
      id: e.id,
      name: e.name,
      from_node: e.from_node,
      to_node: e.to_node,
      edge_type: e.edge_type,
      coordinates: e.coordinates,
      length_m: e.length_m,
      diameter_m: e.diameter_m,
      width_m: e.width_m,
      height_m: e.height_m,
      slope: e.slope,
      roughness_n: e.roughness_n,
      cross_sectional_area_m2: capInfo.area_m2,
      hydraulic_radius_m: capInfo.hydraulic_radius_m,
      capacity_m3_s: capInfo.capacity_m3_s,
      actual_flow_m3_s: Number(actualFlow.toFixed(3)),
      utilization_pct: utilPct,
      status: pipeStatus,
      provenance: 'ASSUMED_PROTOTYPE',
    };
  });

  const avgUtilization = edgesParams.length > 0 ? Number((totalUtilizationPct / edgesParams.length).toFixed(1)) : 0;

  // 10. Water-balance mass conservation check:
  // ΣQ_in = ΣQ_outfall + ΣQ_surcharge
  totalSurfaceInflowM3S = Number(totalSurfaceInflowM3S.toFixed(3));
  totalOutfallDischargeM3S = Number(totalOutfallDischargeM3S.toFixed(3));
  totalSurchargeM3S = Number(totalSurchargeM3S.toFixed(3));

  const totalSumOut = Number((totalOutfallDischargeM3S + totalSurchargeM3S).toFixed(3));
  const diffRate = Math.abs(totalSumOut - totalSurfaceInflowM3S);
  const flowBalanceConserved = totalSurfaceInflowM3S === 0 || diffRate <= 0.05;
  const flowBalanceRatio = totalSurfaceInflowM3S > 0 ? Number((totalSumOut / totalSurfaceInflowM3S).toFixed(4)) : 1.0;

  // Timestep volume accounting (m³ over 1-hr interval = 3600 s)
  const dt_s = 3600;
  const totalInflowVol = Math.round(totalSurfaceInflowM3S * dt_s);
  const totalOutfallVol = Math.round(totalOutfallDischargeM3S * dt_s);
  const totalSurchargeVol = Math.round(totalSurchargeM3S * dt_s);
  const volDiff = Math.abs((totalOutfallVol + totalSurchargeVol) - totalInflowVol);
  const volumeBalanceConserved = totalInflowVol === 0 || volDiff <= 10; // within 10 m³ out of millions

  return {
    network_name: 'Prototype Drainage Network (DAG)',
    timestamp,
    hour_offset: hourOffset,
    horizon_label: horizonLabel,
    status,
    status_reason:
      status === 'ERROR'
        ? 'Weather telemetry error; drainage flows suppressed'
        : `${surchargedNodesCount} surcharged nodes, ${overcapacityPipesCount} overcapacity pipes`,
    provenance,

    total_surface_inflow_m3_s: totalSurfaceInflowM3S,
    total_outfall_discharge_m3_s: totalOutfallDischargeM3S,
    total_surcharge_rate_m3_s: totalSurchargeM3S,
    flow_balance_ratio: flowBalanceRatio,
    flow_balance_conserved: flowBalanceConserved,

    total_inflow_volume_m3: totalInflowVol,
    total_outfall_volume_m3: totalOutfallVol,
    total_surcharge_volume_m3: totalSurchargeVol,
    volume_balance_conserved: volumeBalanceConserved,

    total_nodes_count: nodesParams.length,
    total_edges_count: edgesParams.length,
    surcharged_nodes_count: surchargedNodesCount,
    overcapacity_pipes_count: overcapacityPipesCount,
    average_pipe_utilization_pct: avgUtilization,

    nodes: finalNodeStates,
    edges: finalEdgeStates,
  };
}

/**
 * Generates a 0–3 hour drainage forecast from Phase 3A runoff forecast.
 */
export function generateDrainageForecast(
  runoffForecast: RunoffForecast,
  nodesParams: DrainageNodeParameters[] = PROTOTYPE_DRAINAGE_NODES,
  edgesParams: DrainageEdgeParameters[] = PROTOTYPE_DRAINAGE_EDGES
): DrainageForecast {
  const generatedAt = new Date().toISOString();
  const sourceStatus = runoffForecast.status;

  const horizons: Record<0 | 1 | 2 | 3, DrainageNetworkState> = {
    0: simulateDrainageNetwork(runoffForecast.horizons[0], nodesParams, edgesParams),
    1: simulateDrainageNetwork(runoffForecast.horizons[1], nodesParams, edgesParams),
    2: simulateDrainageNetwork(runoffForecast.horizons[2], nodesParams, edgesParams),
    3: simulateDrainageNetwork(runoffForecast.horizons[3], nodesParams, edgesParams),
  };

  return {
    generated_at: generatedAt,
    source_runoff_status: sourceStatus,
    status: sourceStatus,
    horizons,
  };
}
