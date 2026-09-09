import {
  CoupledCellState,
  CoupledSimulationState,
  CoupledForecast,
  CouplingIterationLog,
  CouplingMassBalance,
} from '../types/coupling';
import { SurfaceFlowGrid, SurfaceFlowCell } from '../types/surfaceFlow';
import {
  DrainageNodeParameters,
  DrainageEdgeParameters,
  DrainageNetworkState,
  DrainageNodeState,
  DrainageEdgeState,
} from '../types/drainage';
import { RunoffForecast } from '../types/runoff';
import { NormalizedWeatherObservation } from '../types/weather';
import { routeSurfaceFlow, getDepthCategoryAndColor } from './surfaceFlowService';
import { generateRunoffForecast } from './runoffService';
import { getDemoFallbackWeather } from './weatherService';
import {
  calculateManningCapacity,
  getTopologicalOrder,
  getNodeSurchargeStatus,
  getPipeUtilizationCategory,
} from './drainageService';
import { PROTOTYPE_DRAINAGE_NODES, PROTOTYPE_DRAINAGE_EDGES } from '../mock/drainageNetwork';

// Simulation timestep duration in seconds (1 hour = 3600 seconds)
const TIMESTEP_DT_S = 3600;

// Maximum coupling iterations per timestep to prevent infinite loops
const MAX_COUPLING_ITERATIONS = 5;

// Storage convergence threshold (m³)
const CONVERGENCE_TOLERANCE_M3 = 0.1;

export interface CouplingOptions {
  maxIterations?: number;
  convergenceToleranceM3?: number;
  dtSeconds?: number;
}

/**
 * Simulates dynamic 1D-2D coupling between Phase 3B surface flow and Phase 3C drainage network
 * for a single simulation timestep.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. NO RUNOFF DOUBLE COUNTING: Phase 3B already consumes Phase 3A runoff. Phase 3D initializes
 *    directly from Phase 3B retained surface storage and does NOT add Phase 3A runoff a second time.
 * 2. NO SURCHARGE DOUBLE COUNTING: Surcharge returned to the surface is an INTERNAL transfer,
 *    not an external sink. Mass balance is:
 *    Input Runoff = Drainage Outfall + Surface Boundary Outflow + Final Surface Stored Storage.
 */
export function simulateCoupledTimestep(
  surfaceFlowGrid: SurfaceFlowGrid,
  nodesParams: DrainageNodeParameters[] = PROTOTYPE_DRAINAGE_NODES,
  edgesParams: DrainageEdgeParameters[] = PROTOTYPE_DRAINAGE_EDGES,
  options: CouplingOptions = {}
): CoupledSimulationState {
  const maxIterations = options.maxIterations ?? MAX_COUPLING_ITERATIONS;
  const toleranceM3 = options.convergenceToleranceM3 ?? CONVERGENCE_TOLERANCE_M3;
  const dt = options.dtSeconds ?? TIMESTEP_DT_S;

  const timestamp = surfaceFlowGrid.timestamp;
  const hourOffset = surfaceFlowGrid.hour_offset;
  const horizonLabel = surfaceFlowGrid.horizon_label;
  const status = surfaceFlowGrid.status;
  const provenance = status === 'LIVE' ? 'DERIVED_COUPLED' : 'DEMO_BASELINE';

  // Handle ERROR state immediately: collapse all to 0
  if (status === 'ERROR') {
    const errorCells: CoupledCellState[] = surfaceFlowGrid.cells.map((c) => {
      const { category, color } = getDepthCategoryAndColor(0);
      return {
        cell_id: c.cell_id,
        grid_row: c.grid_row,
        grid_col: c.grid_col,
        zone_name: c.zone_name,
        centroid: c.centroid,
        bounds: c.bounds,
        geometry: c.geometry,
        area_m2: c.area_m2,
        elevation_m: c.elevation_m,
        phase3a_runoff_input_m3: 0,
        initial_surface_volume_m3: 0,
        surface_boundary_outflow_m3: 0,
        drainage_intake_volume_m3: 0,
        drainage_surcharge_return_m3: 0,
        net_surface_volume_m3: 0,
        water_depth_m: 0,
        water_depth_cm: 0,
        depth_category: category,
        color,
        associated_inlet_ids: [],
        associated_node_ids: [],
        is_sink: c.is_sink,
        status: 'ERROR',
        provenance,
      };
    });

    const emptyDrainage: DrainageNetworkState = {
      network_name: 'Prototype Drainage Network (DAG)',
      timestamp,
      hour_offset: hourOffset,
      horizon_label: horizonLabel,
      status: 'ERROR',
      status_reason: 'Coupling aborted: Upstream telemetry in ERROR state',
      provenance: 'ASSUMED_PROTOTYPE',
      total_surface_inflow_m3_s: 0,
      total_outfall_discharge_m3_s: 0,
      total_surcharge_rate_m3_s: 0,
      flow_balance_ratio: 1.0,
      flow_balance_conserved: true,
      total_inflow_volume_m3: 0,
      total_outfall_volume_m3: 0,
      total_surcharge_volume_m3: 0,
      volume_balance_conserved: true,
      total_nodes_count: nodesParams.length,
      total_edges_count: edgesParams.length,
      surcharged_nodes_count: 0,
      overcapacity_pipes_count: 0,
      average_pipe_utilization_pct: 0,
      nodes: [],
      edges: [],
    };

    const emptyBalance: CouplingMassBalance = {
      input_runoff_volume_m3: 0,
      drainage_outfall_volume_m3: 0,
      surface_boundary_outflow_m3: 0,
      surface_stored_volume_m3: 0,
      total_accounted_volume_m3: 0,
      volume_balance_ratio: 1.0,
      volume_balance_error_pct: 0,
      is_conserved: true,
      internal_drainage_intake_m3: 0,
      internal_surcharge_return_m3: 0,
    };

    return {
      timestamp,
      hour_offset: hourOffset,
      horizon_label: horizonLabel,
      status: 'ERROR',
      status_reason: 'Coupled engine offline: Telemetry error',
      provenance,
      cells: errorCells,
      drainage_network: emptyDrainage,
      surface_flow_grid: surfaceFlowGrid,
      iterations_run: 0,
      iteration_logs: [],
      mass_balance: emptyBalance,
      max_water_depth_cm: 0,
      mean_water_depth_cm: 0,
      critical_cells_count: 0,
      total_drainage_intake_m3_s: 0,
      total_surcharge_return_m3_s: 0,
    };
  }

  // 1. Index Phase 3B surface cell states (INITIAL SURFACE STATE)
  // NOTE: Initial surface storage comes strictly from Phase 3B retained volume!
  // Phase 3A runoff volume is NOT added again.
  const cellMap: Record<string, SurfaceFlowCell> = {};
  const currentSurfaceVolumeM3: Record<string, number> = {};
  surfaceFlowGrid.cells.forEach((c) => {
    cellMap[c.cell_id] = c;
    currentSurfaceVolumeM3[c.cell_id] = c.retained_surface_volume_m3;
  });

  // 2. Precompute pipe capacities via Manning's formula
  const edgeCapacities: Record<
    string,
    { area_m2: number; hydraulic_radius_m: number; capacity_m3_s: number }
  > = {};
  edgesParams.forEach((e) => {
    edgeCapacities[e.id] = calculateManningCapacity(e);
  });

  // 3. Map node associations and adjacency
  const outgoingEdgesByNode: Record<string, DrainageEdgeParameters[]> = {};
  const incomingEdgesByNode: Record<string, DrainageEdgeParameters[]> = {};
  const nodesByCellId: Record<string, DrainageNodeParameters[]> = {};
  const inletsByCellId: Record<string, DrainageNodeParameters[]> = {};

  nodesParams.forEach((n) => {
    outgoingEdgesByNode[n.id] = [];
    incomingEdgesByNode[n.id] = [];
    if (!nodesByCellId[n.catchment_cell_id]) {
      nodesByCellId[n.catchment_cell_id] = [];
    }
    nodesByCellId[n.catchment_cell_id].push(n);

    if (n.node_type === 'INLET') {
      if (!inletsByCellId[n.catchment_cell_id]) {
        inletsByCellId[n.catchment_cell_id] = [];
      }
      inletsByCellId[n.catchment_cell_id].push(n);
    }
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

  const topoOrder = getTopologicalOrder(nodesParams, edgesParams);

  // Tracking working values across iterations
  const iterationLogs: CouplingIterationLog[] = [];
  let prevTotalStorageM3 = Object.values(currentSurfaceVolumeM3).reduce((a, b) => a + b, 0);

  // Per-cell cumulative coupling transfers
  const cellDrainageIntakeM3: Record<string, number> = {};
  const cellSurchargeReturnM3: Record<string, number> = {};
  surfaceFlowGrid.cells.forEach((c) => {
    cellDrainageIntakeM3[c.cell_id] = 0;
    cellSurchargeReturnM3[c.cell_id] = 0;
  });

  // Drainage flow states
  let latestNodeFlows: Record<
    string,
    {
      surface_inflow_m3_s: number;
      upstream_pipe_inflow_m3_s: number;
      total_inflow_m3_s: number;
      discharged_outflow_m3_s: number;
      surcharge_rate_m3_s: number;
    }
  > = {};
  let latestEdgeFlows: Record<string, number> = {};

  let iterationsRun = 0;

  // =========================================================================
  // DYNAMIC COUPLING ITERATION LOOP
  // =========================================================================
  for (let iter = 1; iter <= maxIterations; iter++) {
    iterationsRun = iter;

    // Reset iteration drainage flow rates
    latestNodeFlows = {};
    latestEdgeFlows = {};
    edgesParams.forEach((e) => {
      latestEdgeFlows[e.id] = 0;
    });

    // A. SURFACE -> DRAINAGE TRANSFER:
    // Read available surface water in cell and limit inlet intake
    nodesParams.forEach((n) => {
      let surfaceInflowRate = 0;

      if (n.node_type === 'INLET') {
        const currentWaterM3 = currentSurfaceVolumeM3[n.catchment_cell_id] || 0;
        const inletsInCell = inletsByCellId[n.catchment_cell_id] || [n];
        const numInlets = inletsInCell.length;

        // Maximum intake rate limited by available surface water
        // Rate (m³/s) = Volume (m³) / dt (s)
        const cellWaterRate = currentWaterM3 / dt;
        const availableInletRate = cellWaterRate / numInlets;

        // Intake limited by:
        // 1. Available surface water
        // 2. Outgoing pipe/node capacity
        const capacity = nodeDischargeCapacities[n.id] || 0;
        surfaceInflowRate = Math.max(0, Math.min(availableInletRate, capacity));
      }

      latestNodeFlows[n.id] = {
        surface_inflow_m3_s: Number(surfaceInflowRate.toFixed(3)),
        upstream_pipe_inflow_m3_s: 0,
        total_inflow_m3_s: Number(surfaceInflowRate.toFixed(3)),
        discharged_outflow_m3_s: 0,
        surcharge_rate_m3_s: 0,
      };
    });

    // B. DRAINAGE NETWORK PROPAGATION:
    // Flow travels through DAG in topological order
    topoOrder.forEach((nodeId) => {
      const node = nodesParams.find((n) => n.id === nodeId);
      if (!node) return;

      const flowState = latestNodeFlows[nodeId];
      flowState.total_inflow_m3_s = Number(
        (flowState.surface_inflow_m3_s + flowState.upstream_pipe_inflow_m3_s).toFixed(3)
      );

      const capacity = nodeDischargeCapacities[nodeId];
      const Q_in = flowState.total_inflow_m3_s;

      const Q_discharge = Math.min(Q_in, capacity);
      const Q_excess = Math.max(0, Q_in - capacity);

      flowState.discharged_outflow_m3_s = Number(Q_discharge.toFixed(3));
      flowState.surcharge_rate_m3_s = Number(Q_excess.toFixed(3));

      // Distribute to outgoing edges proportional to Manning capacity
      const outEdges = outgoingEdgesByNode[nodeId] || [];
      if (node.node_type !== 'OUTFALL' && outEdges.length > 0 && capacity > 0) {
        let remaining = Q_discharge;

        outEdges.forEach((e, idx) => {
          const cap = edgeCapacities[e.id].capacity_m3_s;
          let pipeFlow = 0;

          if (idx === outEdges.length - 1) {
            pipeFlow = Math.min(cap, Number(remaining.toFixed(3)));
          } else {
            const frac = cap / capacity;
            pipeFlow = Math.min(cap, Number((Q_discharge * frac).toFixed(3)));
            remaining -= pipeFlow;
          }

          latestEdgeFlows[e.id] = pipeFlow;

          if (latestNodeFlows[e.to_node]) {
            latestNodeFlows[e.to_node].upstream_pipe_inflow_m3_s = Number(
              (latestNodeFlows[e.to_node].upstream_pipe_inflow_m3_s + pipeFlow).toFixed(3)
            );
          }
        });
      }
    });

    // C. DRAINAGE -> SURFACE RETURN & SURFACE VOLUME UPDATE:
    // Subtract captured water from surface, and add surcharge returned from drainage
    let iterTotalIntakeM3 = 0;
    let iterTotalSurchargeM3 = 0;
    let iterTotalSurfaceStorageM3 = 0;

    surfaceFlowGrid.cells.forEach((cell) => {
      const cellId = cell.cell_id;
      const initialM3 = cell.retained_surface_volume_m3; // Phase 3B baseline

      // 1. Total drainage capture in this cell (m³)
      const inletsInCell = inletsByCellId[cellId] || [];
      const intakeRateM3S = inletsInCell.reduce(
        (acc, inl) => acc + (latestNodeFlows[inl.id]?.surface_inflow_m3_s || 0),
        0
      );
      const intakeVolumeM3 = Number((intakeRateM3S * dt).toFixed(1));

      // 2. Total surcharge returned to this cell (m³)
      const nodesInCell = nodesByCellId[cellId] || [];
      const surchargeRateM3S = nodesInCell.reduce(
        (acc, n) => acc + (latestNodeFlows[n.id]?.surcharge_rate_m3_s || 0),
        0
      );
      const surchargeVolumeM3 = Number((surchargeRateM3S * dt).toFixed(1));

      // 3. Updated net surface volume (m³)
      // Formula: V_net = V_initial - V_capture + V_surcharge
      const netVolumeM3 = Math.max(0, Number((initialM3 - intakeVolumeM3 + surchargeVolumeM3).toFixed(1)));

      currentSurfaceVolumeM3[cellId] = netVolumeM3;
      cellDrainageIntakeM3[cellId] = intakeVolumeM3;
      cellSurchargeReturnM3[cellId] = surchargeVolumeM3;

      iterTotalIntakeM3 += intakeVolumeM3;
      iterTotalSurchargeM3 += surchargeVolumeM3;
      iterTotalSurfaceStorageM3 += netVolumeM3;
    });

    const deltaStorage = Math.abs(iterTotalSurfaceStorageM3 - prevTotalStorageM3);
    const isConverged = deltaStorage <= toleranceM3;

    iterationLogs.push({
      iteration: iter,
      total_surface_storage_m3: Number(iterTotalSurfaceStorageM3.toFixed(1)),
      total_drainage_intake_m3: Number(iterTotalIntakeM3.toFixed(1)),
      total_surcharge_return_m3: Number(iterTotalSurchargeM3.toFixed(1)),
      delta_storage_m3: Number(deltaStorage.toFixed(2)),
      converged: isConverged,
    });

    prevTotalStorageM3 = iterTotalSurfaceStorageM3;

    if (isConverged) {
      break;
    }
  }

  // =========================================================================
  // 5. CONSTRUCT FINAL COUPLED CELL STATES
  // =========================================================================
  let totalIntakeM3 = 0;
  let totalSurchargeM3 = 0;
  let totalSurfaceStoredM3 = 0;
  let maxDepthCm = 0;
  let criticalCellsCount = 0;

  const coupledCells: CoupledCellState[] = surfaceFlowGrid.cells.map((baseCell) => {
    const cellId = baseCell.cell_id;
    const netVolM3 = currentSurfaceVolumeM3[cellId] || 0;
    const intakeVolM3 = cellDrainageIntakeM3[cellId] || 0;
    const surchargeVolM3 = cellSurchargeReturnM3[cellId] || 0;

    const depthM = baseCell.area_m2 > 0 ? netVolM3 / baseCell.area_m2 : 0;
    const depthCm = Number((depthM * 100).toFixed(2));
    const { category, color } = getDepthCategoryAndColor(depthCm);

    if (depthCm > maxDepthCm) {
      maxDepthCm = depthCm;
    }
    if (category === 'Critical' || category === 'Very High') {
      criticalCellsCount++;
    }

    totalIntakeM3 += intakeVolM3;
    totalSurchargeM3 += surchargeVolM3;
    totalSurfaceStoredM3 += netVolM3;

    const associatedInlets = (inletsByCellId[cellId] || []).map((i) => i.id);
    const associatedNodes = (nodesByCellId[cellId] || []).map((n) => n.id);

    return {
      cell_id: baseCell.cell_id,
      grid_row: baseCell.grid_row,
      grid_col: baseCell.grid_col,
      zone_name: baseCell.zone_name,
      centroid: baseCell.centroid,
      bounds: baseCell.bounds,
      geometry: baseCell.geometry,
      area_m2: baseCell.area_m2,
      elevation_m: baseCell.elevation_m,

      phase3a_runoff_input_m3: baseCell.input_runoff_volume_m3,
      initial_surface_volume_m3: baseCell.retained_surface_volume_m3,
      surface_boundary_outflow_m3: baseCell.boundary_outflow_m3,

      drainage_intake_volume_m3: intakeVolM3,
      drainage_surcharge_return_m3: surchargeVolM3,

      net_surface_volume_m3: netVolM3,
      water_depth_m: Number(depthM.toFixed(4)),
      water_depth_cm: depthCm,
      depth_category: category,
      color,

      associated_inlet_ids: associatedInlets,
      associated_node_ids: associatedNodes,

      is_sink: baseCell.is_sink,
      status,
      provenance,
    };
  });

  const meanDepthCm = Number(
    (coupledCells.reduce((acc, c) => acc + c.water_depth_cm, 0) / coupledCells.length).toFixed(2)
  );

  // =========================================================================
  // 6. CONSTRUCT DRAINAGE NETWORK STATE
  // =========================================================================
  let totalSurfaceInflowM3S = 0;
  let totalOutfallDischargeM3S = 0;
  let totalSurchargeM3S = 0;
  let surchargedNodesCount = 0;

  const finalNodeStates: DrainageNodeState[] = nodesParams.map((n) => {
    const f = latestNodeFlows[n.id] || {
      surface_inflow_m3_s: 0,
      upstream_pipe_inflow_m3_s: 0,
      total_inflow_m3_s: 0,
      discharged_outflow_m3_s: 0,
      surcharge_rate_m3_s: 0,
    };
    const capacity = nodeDischargeCapacities[n.id] || 0;
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
          ? `Severe hydraulic surcharge (Q_in = ${f.total_inflow_m3_s} m³/s exceeds capacity ${capacity} m³/s)`
          : nodeStatus === 'SURCHARGE'
          ? `Inflow exceeds pipe capacity by ${f.surcharge_rate_m3_s} m³/s`
          : nodeStatus === 'WATCH'
          ? `High pipe utilization (${(surchargeRatio * 100).toFixed(0)}%)`
          : 'Normal gravity conveyance',
      provenance: 'ASSUMED_PROTOTYPE',
    };
  });

  let overcapacityPipesCount = 0;
  let totalUtilizationPct = 0;

  const finalEdgeStates: DrainageEdgeState[] = edgesParams.map((e) => {
    const capInfo = edgeCapacities[e.id];
    const actualFlow = latestEdgeFlows[e.id] || 0;
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

  const totalInflowVol = Math.round(totalSurfaceInflowM3S * dt);
  const totalOutfallVol = Math.round(totalOutfallDischargeM3S * dt);
  const totalSurchargeVol = Math.round(totalSurchargeM3S * dt);

  const drainageNetworkState: DrainageNetworkState = {
    network_name: 'Prototype Drainage Network (DAG)',
    timestamp,
    hour_offset: hourOffset,
    horizon_label: horizonLabel,
    status,
    status_reason: `${surchargedNodesCount} surcharged nodes, ${overcapacityPipesCount} overcapacity pipes`,
    provenance: 'ASSUMED_PROTOTYPE',

    total_surface_inflow_m3_s: Number(totalSurfaceInflowM3S.toFixed(3)),
    total_outfall_discharge_m3_s: Number(totalOutfallDischargeM3S.toFixed(3)),
    total_surcharge_rate_m3_s: Number(totalSurchargeM3S.toFixed(3)),
    flow_balance_ratio: totalSurfaceInflowM3S > 0 ? Number(((totalOutfallDischargeM3S + totalSurchargeM3S) / totalSurfaceInflowM3S).toFixed(4)) : 1.0,
    flow_balance_conserved: Math.abs((totalOutfallDischargeM3S + totalSurchargeM3S) - totalSurfaceInflowM3S) <= 0.05,

    total_inflow_volume_m3: totalInflowVol,
    total_outfall_volume_m3: totalOutfallVol,
    total_surcharge_volume_m3: totalSurchargeVol,
    volume_balance_conserved: Math.abs((totalOutfallVol + totalSurchargeVol) - totalInflowVol) <= 10,

    total_nodes_count: nodesParams.length,
    total_edges_count: edgesParams.length,
    surcharged_nodes_count: surchargedNodesCount,
    overcapacity_pipes_count: overcapacityPipesCount,
    average_pipe_utilization_pct: avgUtilization,

    nodes: finalNodeStates,
    edges: finalEdgeStates,
  };

  // =========================================================================
  // 7. RIGOROUS MASS BALANCE VERIFICATION
  // =========================================================================
  // Total external input = Phase 3A runoff volume (from Phase 3B total_input_runoff_volume_m3)
  const inputRunoffVolumeM3 = surfaceFlowGrid.total_input_runoff_volume_m3;
  // External losses:
  const drainageOutfallVolumeM3 = totalOutfallVol;
  const surfaceBoundaryOutflowM3 = surfaceFlowGrid.total_boundary_outflow_volume_m3;
  // Remaining storage on surface:
  const surfaceStoredVolumeM3 = Number(totalSurfaceStoredM3.toFixed(1));

  // Formulation: Total Accounted = Outfall + Boundary + Surface Stored
  const totalAccountedM3 = Number((drainageOutfallVolumeM3 + surfaceBoundaryOutflowM3 + surfaceStoredVolumeM3).toFixed(1));
  const diffM3 = Math.abs(inputRunoffVolumeM3 - totalAccountedM3);

  const balanceRatio = inputRunoffVolumeM3 > 0 ? Number((totalAccountedM3 / inputRunoffVolumeM3).toFixed(5)) : 1.0;
  const errorPct = inputRunoffVolumeM3 > 0 ? Number(((diffM3 / inputRunoffVolumeM3) * 100).toFixed(4)) : 0;

  // Mass conserved if error <= 0.05% or <= 2.0 m³ out of hundreds of thousands
  const isConserved = inputRunoffVolumeM3 === 0 || diffM3 <= Math.max(5.0, inputRunoffVolumeM3 * 0.0005);

  const massBalance: CouplingMassBalance = {
    input_runoff_volume_m3: inputRunoffVolumeM3,
    drainage_outfall_volume_m3: drainageOutfallVolumeM3,
    surface_boundary_outflow_m3: surfaceBoundaryOutflowM3,
    surface_stored_volume_m3: surfaceStoredVolumeM3,
    total_accounted_volume_m3: totalAccountedM3,
    volume_balance_ratio: balanceRatio,
    volume_balance_error_pct: errorPct,
    is_conserved: isConserved,
    internal_drainage_intake_m3: Number(totalIntakeM3.toFixed(1)),
    internal_surcharge_return_m3: Number(totalSurchargeM3.toFixed(1)),
  };

  return {
    timestamp,
    hour_offset: hourOffset,
    horizon_label: horizonLabel,
    status,
    status_reason: `1D-2D Coupled Model: ${iterationsRun} iterations, max depth ${maxDepthCm} cm, mass conserved: ${isConserved}`,
    provenance,

    cells: coupledCells,
    drainage_network: drainageNetworkState,
    surface_flow_grid: surfaceFlowGrid,

    iterations_run: iterationsRun,
    iteration_logs: iterationLogs,
    mass_balance: massBalance,

    max_water_depth_cm: maxDepthCm,
    mean_water_depth_cm: meanDepthCm,
    critical_cells_count: criticalCellsCount,
    total_drainage_intake_m3_s: Number(totalSurfaceInflowM3S.toFixed(3)),
    total_surcharge_return_m3_s: Number(totalSurchargeM3S.toFixed(3)),
  };
}

/**
 * Generates the complete 0-3 hour Coupled Forecast from a Phase 3A Runoff Forecast.
 */
export function generateCoupledForecast(
  runoffForecast: RunoffForecast | null | undefined,
  nodesParams: DrainageNodeParameters[] = PROTOTYPE_DRAINAGE_NODES,
  edgesParams: DrainageEdgeParameters[] = PROTOTYPE_DRAINAGE_EDGES,
  options: CouplingOptions = {}
): CoupledForecast | null {
  if (!runoffForecast) return null;

  const generatedAt = new Date().toISOString();
  const sourceStatus = runoffForecast.status;

  const horizons: Record<0 | 1 | 2 | 3, CoupledSimulationState> = {} as any;
  const steps: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];

  steps.forEach((hour) => {
    const runoffGrid = runoffForecast.horizons[hour];
    if (runoffGrid) {
      // Step 1: Route surface flow via Phase 3B
      const surfaceFlowGrid = routeSurfaceFlow(runoffGrid);
      // Step 2: Dynamically couple surface and drainage via Phase 3D
      horizons[hour] = simulateCoupledTimestep(surfaceFlowGrid, nodesParams, edgesParams, options);
    }
  });

  return {
    generated_at: generatedAt,
    source_runoff_status: sourceStatus,
    status: sourceStatus,
    horizons,
  };
}

/**
 * Executes the controlled 65 mm/hr storm comparison test required by SIH26085 Phase 3D.
 * Compares Case A (Normal Drainage Capacity) against Case B (Restricted Drainage Capacity).
 * Proves that reducing drainage capacity increases local surcharge and surface flood depth,
 * while maintaining total system mass conservation in both cases.
 */
export function runControlledCouplingComparison(
  rainfallIntensityMmHr: number = 65.0
): {
  caseA_normal: CoupledSimulationState;
  caseB_restricted: CoupledSimulationState;
  deltaMaxDepthCm: number;
  deltaSurchargeM3S: number;
  deltaOutfallM3S: number;
  bothConserved: boolean;
} {
  // 1. Synthesize a mock 65 mm/hr weather observation and derive standard Phase 3A runoff
  const baseWeather = getDemoFallbackWeather(`Controlled Test Scenario (${rainfallIntensityMmHr} mm/hr)`);
  const mockWeather: NormalizedWeatherObservation = {
    ...baseWeather,
    current_rainfall_mm_hr: rainfallIntensityMmHr,
    nowcast_steps: [
      { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: rainfallIntensityMmHr, accumulated_rainfall_mm: rainfallIntensityMmHr, warning_level: 'Warning' },
      { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: rainfallIntensityMmHr, accumulated_rainfall_mm: rainfallIntensityMmHr * 2, warning_level: 'Warning' },
      { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: rainfallIntensityMmHr, accumulated_rainfall_mm: rainfallIntensityMmHr * 3, warning_level: 'Warning' },
      { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: rainfallIntensityMmHr, accumulated_rainfall_mm: rainfallIntensityMmHr * 4, warning_level: 'Warning' },
    ],
  };

  const runoffForecast = generateRunoffForecast(mockWeather);
  const mockRunoffGrid = runoffForecast.horizons[0];

  // 2. Generate Phase 3B surface flow
  const surfaceFlowGrid = routeSurfaceFlow(mockRunoffGrid);

  // 3. Case A: Normal Drainage Network
  const caseA_normal = simulateCoupledTimestep(
    surfaceFlowGrid,
    PROTOTYPE_DRAINAGE_NODES,
    PROTOTYPE_DRAINAGE_EDGES
  );

  // 4. Case B: Restricted Drainage Network (e.g. choked downstream trunk mains & tide-locked outfalls)
  // Surface water enters street inlets normally, but hits choked downstream conduits and blocked outfalls,
  // causing intense surcharge backflow onto the surface and reducing outfall discharge.
  const restrictedEdges: DrainageEdgeParameters[] = PROTOTYPE_DRAINAGE_EDGES.map((e) => {
    const isDownstreamTrunk = e.from_node.startsWith('MH') || e.to_node.startsWith('OF');
    return {
      ...e,
      diameter_m: isDownstreamTrunk && e.diameter_m ? e.diameter_m * 0.35 : e.diameter_m,
      width_m: isDownstreamTrunk && e.width_m ? e.width_m * 0.35 : e.width_m,
      height_m: isDownstreamTrunk && e.height_m ? e.height_m * 0.35 : e.height_m,
      roughness_n: isDownstreamTrunk ? e.roughness_n * 2.0 : e.roughness_n,
    };
  });

  const restrictedNodes: DrainageNodeParameters[] = PROTOTYPE_DRAINAGE_NODES.map((n) => ({
    ...n,
    explicit_outlet_capacity_m3_s:
      n.explicit_outlet_capacity_m3_s !== undefined
        ? n.explicit_outlet_capacity_m3_s * 0.15 // 85% tide-lock / blockage
        : undefined,
  }));

  const caseB_restricted = simulateCoupledTimestep(
    surfaceFlowGrid,
    restrictedNodes,
    restrictedEdges
  );

  const deltaMaxDepthCm = Number((caseB_restricted.max_water_depth_cm - caseA_normal.max_water_depth_cm).toFixed(2));
  const deltaSurchargeM3S = Number(
    (caseB_restricted.total_surcharge_return_m3_s - caseA_normal.total_surcharge_return_m3_s).toFixed(3)
  );
  const deltaOutfallM3S = Number(
    (caseA_normal.drainage_network.total_outfall_discharge_m3_s -
      caseB_restricted.drainage_network.total_outfall_discharge_m3_s).toFixed(3)
  );
  const bothConserved = caseA_normal.mass_balance.is_conserved && caseB_restricted.mass_balance.is_conserved;

  return {
    caseA_normal,
    caseB_restricted,
    deltaMaxDepthCm,
    deltaSurchargeM3S,
    deltaOutfallM3S,
    bothConserved,
  };
}
