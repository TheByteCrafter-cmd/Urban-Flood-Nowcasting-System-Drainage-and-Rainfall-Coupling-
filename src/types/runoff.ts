export type RunoffDataStatus = 'LIVE' | 'DERIVED' | 'STALE' | 'DEMO' | 'ERROR';
export type RunoffProvenance =
  | 'OBSERVED_LIVE'
  | 'DERIVED_NOWCAST'
  | 'ASSUMED_PROTOTYPE'
  | 'DEMO_BASELINE';

export type LandUseClass =
  | 'HIGH_DENSITY_URBAN'  // Dense commercial & arterial corridors (f_imp = 0.90)
  | 'COMMERCIAL_PAVED'   // Subways, transport terminals (f_imp = 0.95)
  | 'RESIDENTIAL_MIXED'  // Residential suburbs with yards (f_imp = 0.70)
  | 'OPEN_SPACE_PARK'    // Hill slopes, public gardens (f_imp = 0.20)
  | 'WETLAND_WATER';     // Estuarine margins, creek flats (f_imp = 1.00)

export interface RunoffCellParameters {
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
  slope_pct: number;
  landuse_class: LandUseClass;
  impervious_fraction: number; // 0.0 to 1.0
  runoff_coefficient: number;  // Composite C
  depression_storage_mm: number; // Initial abstraction loss
  provenance: 'ASSUMED_PROTOTYPE'; // Explicit attribution
}

export interface RunoffCellState {
  cell_id: string;
  zone_name: string;
  hour_offset: 0 | 1 | 2 | 3;
  horizon_label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  rainfall_intensity_mm_hr: number;
  rainfall_provenance: RunoffProvenance;
  gross_rainfall_depth_mm: number;
  effective_runoff_depth_mm: number;
  runoff_rate_m3_s: number; // Dimensionally correct m³/s
  gross_rainfall_volume_m3: number;
  interval_runoff_volume_m3: number;
  cumulative_runoff_volume_m3: number;
  water_balance_conserved: boolean; // True if gross_vol >= runoff_vol
  status: RunoffDataStatus;
}

export interface RunoffGrid {
  grid_name: 'Prototype Hydrological Grid (5x5)';
  timestamp: string;
  status: RunoffDataStatus;
  status_reason: string;
  hour_offset: 0 | 1 | 2 | 3;
  horizon_label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  total_catchment_area_m2: number;
  total_gross_rainfall_volume_m3: number;
  total_runoff_volume_m3: number;
  peak_runoff_rate_m3_s: number;
  water_balance_ratio: number; // runoff_vol / gross_vol (always <= 1.0)
  cells: RunoffCellState[];
}

export interface RunoffForecast {
  generated_at: string;
  source_weather_status: string;
  source_observation_time: string;
  status: RunoffDataStatus;
  horizons: Record<0 | 1 | 2 | 3, RunoffGrid>;
}