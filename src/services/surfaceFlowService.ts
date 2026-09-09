import {
  SurfaceFlowCell,
  SurfaceFlowGrid,
  SurfaceFlowForecast,
  FlowDirection,
  DepthRiskCategory,
} from '../types/surfaceFlow';
import { RunoffForecast, RunoffGrid, RunoffProvenance } from '../types/runoff';
import { PROTOTYPE_CATCHMENTS } from '../mock/catchments';

// Macro cell spatial dimensions (m)
const CELL_DX_M = 4240; // Longitude step (~4.24 km)
const CELL_DY_M = 6640; // Latitude step (~6.64 km)
const CELL_DIAG_M = Math.sqrt(CELL_DX_M * CELL_DX_M + CELL_DY_M * CELL_DY_M); // ~7878.8 m

interface DirectionVector {
  dir: FlowDirection;
  dr: number; // Row offset
  dc: number; // Col offset
  dist_m: number;
}

const D8_DIRECTIONS: DirectionVector[] = [
  { dir: 'N', dr: 1, dc: 0, dist_m: CELL_DY_M },
  { dir: 'NE', dr: 1, dc: 1, dist_m: CELL_DIAG_M },
  { dir: 'E', dr: 0, dc: 1, dist_m: CELL_DX_M },
  { dir: 'SE', dr: -1, dc: 1, dist_m: CELL_DIAG_M },
  { dir: 'S', dr: -1, dc: 0, dist_m: CELL_DY_M },
  { dir: 'SW', dr: -1, dc: -1, dist_m: CELL_DIAG_M },
  { dir: 'W', dr: 0, dc: -1, dist_m: CELL_DX_M },
  { dir: 'NW', dr: 1, dc: -1, dist_m: CELL_DIAG_M },
];

/**
 * Maps calculated surface water depth in cm to UI risk category and color.
 */
export function getDepthCategoryAndColor(depthCm: number): {
  category: DepthRiskCategory;
  color: string;
} {
  if (depthCm >= 100) return { category: 'Critical', color: '#172554' }; // Deep Navy / Critical
  if (depthCm >= 50) return { category: 'Very High', color: '#1D4ED8' };  // Royal Blue / Very High
  if (depthCm >= 20) return { category: 'High', color: '#3B82F6' };       // Vivid Blue / High
  if (depthCm >= 5) return { category: 'Moderate', color: '#93C5FD' };    // Soft Blue / Moderate
  return { category: 'Low', color: '#DBEAFE' };                           // Very Light Blue / Low
}

interface PrecomputedD8Topology {
  cell_id: string;
  grid_row: number;
  grid_col: number;
  elevation_m: number;
  flow_direction: FlowDirection;
  downstream_cell_id: string | null;
  downstream_zone_name: string | null;
  elevation_diff_m: number;
  slope_pct: number;
  is_sink: boolean;
  is_boundary_outflow: boolean;
  conveyance_fraction: number;
}

/**
 * Precomputes D8 flow directions and downstream neighbors from the DEM grid.
 * Runs once deterministically.
 */
export function precomputeGridD8Topology(): PrecomputedD8Topology[] {
  // Create quick 2D lookup map for elevations and catchments
  const gridMap: Record<string, typeof PROTOTYPE_CATCHMENTS[0]> = {};
  PROTOTYPE_CATCHMENTS.forEach((c) => {
    gridMap[`${c.grid_row}-${c.grid_col}`] = c;
  });

  return PROTOTYPE_CATCHMENTS.map((cell) => {
    const r = cell.grid_row;
    const c = cell.grid_col;
    const z = cell.elevation_m;

    let bestSlope = -Infinity;
    let bestDir: FlowDirection = 'SINK';
    let bestDownstreamId: string | null = null;
    let bestDownstreamName: string | null = null;
    let bestElevDiff = 0;
    let isBoundary = false;

    for (const d of D8_DIRECTIONS) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      const neighbor = gridMap[`${nr}-${nc}`];

      let nz = 0;
      let nId: string | null = null;
      let nName: string | null = null;
      let targetIsBoundary = false;

      if (neighbor) {
        // Internal neighbor cell
        nz = neighbor.elevation_m;
        nId = neighbor.cell_id;
        nName = neighbor.zone_name;
      } else {
        // Neighbor is off-grid (domain boundary)
        targetIsBoundary = true;
        if (nc < 0) {
          // West: Arabian Sea (Elevation = 0m)
          nz = 0;
          nName = 'Arabian Sea (Coastal Outflow)';
        } else if (nr < 0) {
          // South: Southern Sea / Harbour (Elevation = 0m)
          nz = 0;
          nName = 'Mumbai Harbour (Coastal Outflow)';
        } else if (nc >= 5) {
          // East: Thane Creek Basin (Elevation = 0m)
          nz = 0;
          nName = 'Thane Creek (Estuarine Outflow)';
        } else {
          // North: Northern Basin boundary (Elevation = 0m)
          nz = 0;
          nName = 'Northern Domain Outflow';
        }
      }

      const diff = z - nz;
      const slope = diff / d.dist_m;

      if (slope > bestSlope) {
        bestSlope = slope;
        bestDir = targetIsBoundary && (nc < 0 || nr < 0) ? 'COASTAL_OUTFLOW' : d.dir;
        bestDownstreamId = nId;
        bestDownstreamName = nName;
        bestElevDiff = diff;
        isBoundary = targetIsBoundary;
      }
    }

    const isSink = bestSlope <= 0;
    if (isSink) {
      bestDir = 'SINK';
      bestDownstreamId = null;
      bestDownstreamName = 'Local Topographic Depression';
      bestElevDiff = 0;
      bestSlope = 0;
      isBoundary = false;
    }

    // Kinematic conveyance fraction: higher slope yields higher transfer fraction (0.15 to 0.80)
    // Sinks retain 100% of water (conveyance = 0)
    const conveyanceFraction = isSink
      ? 0
      : Number(Math.min(0.80, Math.max(0.15, 0.20 + 0.35 * Math.sqrt(bestSlope))).toFixed(3));

    return {
      cell_id: cell.cell_id,
      grid_row: r,
      grid_col: c,
      elevation_m: z,
      flow_direction: bestDir,
      downstream_cell_id: bestDownstreamId,
      downstream_zone_name: bestDownstreamName,
      elevation_diff_m: Number(bestElevDiff.toFixed(1)),
      slope_pct: Number((Math.max(0, bestSlope) * 100).toFixed(2)),
      is_sink: isSink,
      is_boundary_outflow: isBoundary,
      conveyance_fraction: conveyanceFraction,
    };
  });
}

// Singleton precomputed topology for the 5x5 DEM grid
export const GRID_D8_TOPOLOGY = precomputeGridD8Topology();

/**
 * Routes Phase 3A runoff across the DEM using deterministic 2D surface routing.
 * Strictly conserves water:
 * Total Input Runoff = Total Retained Surface Water + Total Boundary Outflow
 */
export function routeSurfaceFlow(
  runoffGrid: RunoffGrid
): SurfaceFlowGrid {
  const timestamp = runoffGrid.timestamp;
  const hourOffset = runoffGrid.hour_offset;
  const horizonLabel = runoffGrid.horizon_label;
  const status = runoffGrid.status;

  // Handle ERROR state: collapse immediately to zero without routing
  if (status === 'ERROR') {
    const errorCells: SurfaceFlowCell[] = PROTOTYPE_CATCHMENTS.map((catchment, idx) => {
      const topo = GRID_D8_TOPOLOGY[idx];
      const { category, color } = getDepthCategoryAndColor(0);
      return {
        cell_id: catchment.cell_id,
        grid_row: catchment.grid_row,
        grid_col: catchment.grid_col,
        zone_name: catchment.zone_name,
        centroid: catchment.centroid,
        bounds: catchment.bounds,
        geometry: catchment.geometry,
        area_m2: catchment.area_m2,
        elevation_m: catchment.elevation_m,
        flow_direction: topo.flow_direction,
        downstream_cell_id: topo.downstream_cell_id,
        downstream_zone_name: topo.downstream_zone_name,
        elevation_diff_m: topo.elevation_diff_m,
        slope_pct: topo.slope_pct,
        input_runoff_volume_m3: 0,
        upstream_inflow_volume_m3: 0,
        total_available_volume_m3: 0,
        transferred_outflow_m3: 0,
        boundary_outflow_m3: 0,
        retained_surface_volume_m3: 0,
        water_depth_m: 0,
        water_depth_cm: 0,
        depth_category: category,
        color,
        is_sink: topo.is_sink,
        water_balance_conserved: true,
        status: 'ERROR',
        provenance: 'DEMO_BASELINE',
      };
    });

    return {
      grid_name: 'Prototype 2D Surface Flow Grid (5x5)',
      timestamp,
      hour_offset: hourOffset,
      horizon_label: horizonLabel,
      status: 'ERROR',
      status_reason: 'Surface flow routing aborted: Upstream telemetry in ERROR state',
      total_catchment_area_m2: PROTOTYPE_CATCHMENTS.reduce((acc, c) => acc + c.area_m2, 0),
      total_input_runoff_volume_m3: 0,
      total_retained_surface_volume_m3: 0,
      total_boundary_outflow_volume_m3: 0,
      max_water_depth_cm: 0,
      mean_water_depth_cm: 0,
      critical_cells_count: 0,
      water_balance_ratio: 1.0,
      water_balance_conserved: true,
      cells: errorCells,
    };
  }

  // 1. Map input runoff volume from Phase 3A per cell ID
  const inputRunoffMap: Record<string, number> = {};
  const runoffProvenanceMap: Record<string, RunoffProvenance> = {};
  runoffGrid.cells.forEach((rc) => {
    inputRunoffMap[rc.cell_id] = rc.interval_runoff_volume_m3;
    runoffProvenanceMap[rc.cell_id] = rc.rainfall_provenance;
  });

  // Track state during topological transfer
  interface FlowWorkState {
    topo: PrecomputedD8Topology;
    catchment: typeof PROTOTYPE_CATCHMENTS[0];
    inputRunoffM3: number;
    inflowM3: number;
    outflowM3: number;
    boundaryOutflowM3: number;
    retainedM3: number;
    provenance: RunoffProvenance;
  }

  const workMap: Record<string, FlowWorkState> = {};
  PROTOTYPE_CATCHMENTS.forEach((catchment, idx) => {
    const topo = GRID_D8_TOPOLOGY[idx];
    const inputRunoff = inputRunoffMap[catchment.cell_id] || 0;
    workMap[catchment.cell_id] = {
      topo,
      catchment,
      inputRunoffM3: inputRunoff,
      inflowM3: 0,
      outflowM3: 0,
      boundaryOutflowM3: 0,
      retainedM3: 0,
      provenance: runoffProvenanceMap[catchment.cell_id] || 'DEMO_BASELINE',
    };
  });

  // 2. Sort cells in descending order of elevation for topological cascading
  const sortedIds = [...PROTOTYPE_CATCHMENTS]
    .sort((a, b) => b.elevation_m - a.elevation_m)
    .map((c) => c.cell_id);

  // 3. Process routing step
  for (const cellId of sortedIds) {
    const state = workMap[cellId];
    const available = state.inputRunoffM3 + state.inflowM3;

    if (state.topo.is_sink || available <= 0) {
      // Retain 100% of water in local sink / flat area
      state.outflowM3 = 0;
      state.boundaryOutflowM3 = 0;
      state.retainedM3 = available;
    } else {
      const conveyance = state.topo.conveyance_fraction;
      const transferOut = Number((available * conveyance).toFixed(1));
      const retained = Number((available - transferOut).toFixed(1));

      state.retainedM3 = retained;

      if (state.topo.is_boundary_outflow || !state.topo.downstream_cell_id) {
        // Water exits domain into sea or outer basin
        state.boundaryOutflowM3 = transferOut;
        state.outflowM3 = 0;
      } else {
        // Water flows into downstream adjacent cell
        state.outflowM3 = transferOut;
        state.boundaryOutflowM3 = 0;
        const target = workMap[state.topo.downstream_cell_id];
        if (target) {
          target.inflowM3 = Number((target.inflowM3 + transferOut).toFixed(1));
        } else {
          // Fallback if target cell not found
          state.boundaryOutflowM3 = transferOut;
          state.outflowM3 = 0;
        }
      }
    }
  }

  // 4. Compute water depth in meters and centimeters
  const cells: SurfaceFlowCell[] = PROTOTYPE_CATCHMENTS.map((catchment, idx) => {
    const topo = GRID_D8_TOPOLOGY[idx];
    const state = workMap[catchment.cell_id];
    const available = Number((state.inputRunoffM3 + state.inflowM3).toFixed(1));
    const retained = state.retainedM3;

    // Depth [m] = Volume [m³] / Area [m²]
    const depthM = catchment.area_m2 > 0 ? retained / catchment.area_m2 : 0;
    const depthCm = Number((depthM * 100).toFixed(2));
    const { category, color } = getDepthCategoryAndColor(depthCm);

    // Invariant check: input + inflow = retained + outflow + boundaryOutflow (within ±0.5 m³ rounding)
    const totalOut = Number((retained + state.outflowM3 + state.boundaryOutflowM3).toFixed(1));
    const cellConserved = Math.abs(available - totalOut) <= 0.5;

    return {
      cell_id: catchment.cell_id,
      grid_row: catchment.grid_row,
      grid_col: catchment.grid_col,
      zone_name: catchment.zone_name,
      centroid: catchment.centroid,
      bounds: catchment.bounds,
      geometry: catchment.geometry,
      area_m2: catchment.area_m2,
      elevation_m: catchment.elevation_m,
      flow_direction: topo.flow_direction,
      downstream_cell_id: topo.downstream_cell_id,
      downstream_zone_name: topo.downstream_zone_name,
      elevation_diff_m: topo.elevation_diff_m,
      slope_pct: topo.slope_pct,
      input_runoff_volume_m3: state.inputRunoffM3,
      upstream_inflow_volume_m3: state.inflowM3,
      total_available_volume_m3: available,
      transferred_outflow_m3: state.outflowM3,
      boundary_outflow_m3: state.boundaryOutflowM3,
      retained_surface_volume_m3: retained,
      water_depth_m: Number(depthM.toFixed(4)),
      water_depth_cm: depthCm,
      depth_category: category,
      color,
      is_sink: topo.is_sink,
      water_balance_conserved: cellConserved,
      status,
      provenance: state.provenance,
    };
  });

  // 5. Aggregate grid statistics and mass balance
  const totalInputRunoffM3 = cells.reduce((acc, c) => acc + c.input_runoff_volume_m3, 0);
  const totalRetainedM3 = cells.reduce((acc, c) => acc + c.retained_surface_volume_m3, 0);
  const totalBoundaryOutflowM3 = cells.reduce((acc, c) => acc + c.boundary_outflow_m3, 0);
  const maxDepthCm = Math.max(...cells.map((c) => c.water_depth_cm), 0);
  const meanDepthCm = Number(
    (cells.reduce((acc, c) => acc + c.water_depth_cm, 0) / cells.length).toFixed(2)
  );
  const criticalCount = cells.filter((c) => c.depth_category === 'Critical' || c.depth_category === 'Very High').length;

  const totalAccountedM3 = totalRetainedM3 + totalBoundaryOutflowM3;
  const balanceRatio = totalInputRunoffM3 > 0
    ? Number((totalAccountedM3 / totalInputRunoffM3).toFixed(3))
    : 1.0;

  // Mass conservation tolerance: within 0.1% or 2.0 m³
  const gridConserved = totalInputRunoffM3 === 0
    ? true
    : Math.abs(totalInputRunoffM3 - totalAccountedM3) <= Math.max(2.0, totalInputRunoffM3 * 0.001);

  return {
    grid_name: 'Prototype 2D Surface Flow Grid (5x5)',
    timestamp,
    hour_offset: hourOffset,
    horizon_label: horizonLabel,
    status,
    status_reason: `2D Surface Flow routed from Phase 3A (${status})`,
    total_catchment_area_m2: PROTOTYPE_CATCHMENTS.reduce((acc, c) => acc + c.area_m2, 0),
    total_input_runoff_volume_m3: Number(totalInputRunoffM3.toFixed(1)),
    total_retained_surface_volume_m3: Number(totalRetainedM3.toFixed(1)),
    total_boundary_outflow_volume_m3: Number(totalBoundaryOutflowM3.toFixed(1)),
    max_water_depth_cm: maxDepthCm,
    mean_water_depth_cm: meanDepthCm,
    critical_cells_count: criticalCount,
    water_balance_ratio: balanceRatio,
    water_balance_conserved: gridConserved,
    cells,
  };
}

/**
 * Generates the complete 0-3 hour Surface Flow Forecast from Phase 3A Runoff Forecast.
 */
export function generateSurfaceFlowForecast(
  runoffForecast: RunoffForecast | null | undefined
): SurfaceFlowForecast | null {
  if (!runoffForecast) return null;

  const horizons: Record<0 | 1 | 2 | 3, SurfaceFlowGrid> = {} as any;
  const steps: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];

  steps.forEach((hour) => {
    const runoffGrid = runoffForecast.horizons[hour];
    if (runoffGrid) {
      horizons[hour] = routeSurfaceFlow(runoffGrid);
    }
  });

  return {
    generated_at: new Date().toISOString(),
    source_runoff_status: runoffForecast.status,
    status: runoffForecast.status,
    horizons,
  };
}
