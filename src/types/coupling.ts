import { RunoffDataStatus } from './runoff';
import { DepthRiskCategory, SurfaceFlowGrid } from './surfaceFlow';
import { DrainageNetworkState } from './drainage';

/**
 * Hydraulic state of an individual 2D surface grid cell after dynamic coupling
 * with the underground drainage network.
 */
export interface CoupledCellState {
  cell_id: string;
  grid_row: number;
  grid_col: number;
  zone_name: string;
  centroid: [number, number]; // [lng, lat]
  bounds: [[number, number], [number, number]];
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_m2: number;
  elevation_m: number;

  // External & Phase 3B overland baseline inputs (m³)
  phase3a_runoff_input_m3: number;      // Reference accounting from Phase 3A (NOT re-added)
  initial_surface_volume_m3: number;    // From Phase 3B retained_surface_volume_m3
  surface_boundary_outflow_m3: number;  // From Phase 3B boundary_outflow_m3

  // Dynamic 1D-2D internal coupling transfers (m³)
  drainage_intake_volume_m3: number;     // Water captured into local drainage inlets
  drainage_surcharge_return_m3: number;  // Surcharge/overflow returned from surcharged nodes

  // Net coupled surface water & inundation depth
  net_surface_volume_m3: number;        // initial - intake + surcharge_return
  water_depth_m: number;                // net_surface_volume / area_m2
  water_depth_cm: number;               // water_depth_m * 100
  depth_category: DepthRiskCategory;
  color: string;

  // Associated network nodes in this cell
  associated_inlet_ids: string[];
  associated_node_ids: string[];

  is_sink: boolean;
  status: RunoffDataStatus;
  provenance: 'DERIVED_COUPLED' | 'DEMO_BASELINE';
}

/**
 * Diagnostic record of a single coupling iteration within a timestep.
 */
export interface CouplingIterationLog {
  iteration: number;
  total_surface_storage_m3: number;
  total_drainage_intake_m3: number;
  total_surcharge_return_m3: number;
  delta_storage_m3: number;
  converged: boolean;
}

/**
 * Rigorous total-system mass-balance accounting for Phase 3D.
 * Formulation:
 * INPUT RUNOFF VOLUME = DRAINAGE OUTFALL VOLUME + SURFACE BOUNDARY OUTFLOW + FINAL SURFACE STORED VOLUME
 * Internal transfers (drainage intake and surcharge return) cancel out exactly.
 */
export interface CouplingMassBalance {
  input_runoff_volume_m3: number;       // External input (from Phase 3A/3B)
  drainage_outfall_volume_m3: number;   // External loss: gravity flow through pipes to marine outfalls
  surface_boundary_outflow_m3: number;  // External loss: overland D8 flow across domain boundary to sea
  surface_stored_volume_m3: number;     // Remaining storage: water on the 2D surface
  total_accounted_volume_m3: number;    // outfall + boundary + surface_stored
  volume_balance_ratio: number;         // accounted / input (~1.0)
  volume_balance_error_pct: number;     // |input - accounted| / input * 100%
  is_conserved: boolean;                // Error within numerical tolerance (< 0.001% or <= 2 m³)

  // Internal transfers tracked separately (NOT double-counted in external mass balance)
  internal_drainage_intake_m3: number;  // Surface -> Drainage
  internal_surcharge_return_m3: number; // Drainage -> Surface
}

/**
 * Complete coupled simulation state for a single forecast horizon (e.g. T+0).
 */
export interface CoupledSimulationState {
  timestamp: string;
  hour_offset: 0 | 1 | 2 | 3;
  horizon_label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  status: RunoffDataStatus;
  status_reason: string;
  provenance: 'DERIVED_COUPLED' | 'DEMO_BASELINE';

  // Component states
  cells: CoupledCellState[];
  drainage_network: DrainageNetworkState;
  surface_flow_grid: SurfaceFlowGrid;

  // Coupling iteration metadata
  iterations_run: number;
  iteration_logs: CouplingIterationLog[];
  mass_balance: CouplingMassBalance;

  // Grid-wide summary metrics
  max_water_depth_cm: number;
  mean_water_depth_cm: number;
  critical_cells_count: number;
  total_drainage_intake_m3_s: number;
  total_surcharge_return_m3_s: number;
}

/**
 * 0 to 3 hour predictive coupled forecast.
 */
export interface CoupledForecast {
  generated_at: string;
  source_runoff_status: RunoffDataStatus;
  status: RunoffDataStatus;
  horizons: Record<0 | 1 | 2 | 3, CoupledSimulationState>;
}
