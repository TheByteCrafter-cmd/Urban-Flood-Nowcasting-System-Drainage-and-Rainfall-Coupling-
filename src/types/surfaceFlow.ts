import { RunoffDataStatus, RunoffProvenance } from './runoff';

export type FlowDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'
  | 'SINK'
  | 'COASTAL_OUTFLOW';

export type DepthRiskCategory =
  | 'Low'       // 0–5 cm
  | 'Moderate'  // 5–20 cm
  | 'High'      // 20–50 cm
  | 'Very High' // 50–100 cm
  | 'Critical'; // 100+ cm

export interface SurfaceFlowCell {
  cell_id: string;
  grid_row: number;
  grid_col: number;
  zone_name: string;
  centroid: [number, number]; // [lng, lat]
  bounds: [[number, number], [number, number]]; // [[minLat, minLng], [maxLat, maxLng]]
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_m2: number;
  elevation_m: number;
  flow_direction: FlowDirection;
  downstream_cell_id: string | null;
  downstream_zone_name: string | null;
  elevation_diff_m: number;
  slope_pct: number;
  input_runoff_volume_m3: number;       // V_source from Phase 3A
  upstream_inflow_volume_m3: number;    // Inflow from higher adjacent cells
  total_available_volume_m3: number;    // input_runoff + upstream_inflow
  transferred_outflow_m3: number;       // Transferred to downstream cell
  boundary_outflow_m3: number;          // Exits model boundary (e.g. Arabian Sea)
  retained_surface_volume_m3: number;   // Water volume remaining on surface
  water_depth_m: number;                // retained_volume / area
  water_depth_cm: number;               // water_depth_m * 100
  depth_category: DepthRiskCategory;
  color: string;
  is_sink: boolean;
  water_balance_conserved: boolean;
  status: RunoffDataStatus;
  provenance: RunoffProvenance;
}

export interface SurfaceFlowGrid {
  grid_name: 'Prototype 2D Surface Flow Grid (5x5)';
  timestamp: string;
  hour_offset: 0 | 1 | 2 | 3;
  horizon_label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  status: RunoffDataStatus;
  status_reason: string;
  total_catchment_area_m2: number;
  total_input_runoff_volume_m3: number;
  total_retained_surface_volume_m3: number;
  total_boundary_outflow_volume_m3: number;
  max_water_depth_cm: number;
  mean_water_depth_cm: number;
  critical_cells_count: number;
  water_balance_ratio: number; // (retained + boundary_outflow) / input (~1.0)
  water_balance_conserved: boolean;
  cells: SurfaceFlowCell[];
}

export interface SurfaceFlowForecast {
  generated_at: string;
  source_runoff_status: RunoffDataStatus;
  status: RunoffDataStatus;
  horizons: Record<0 | 1 | 2 | 3, SurfaceFlowGrid>;
}
