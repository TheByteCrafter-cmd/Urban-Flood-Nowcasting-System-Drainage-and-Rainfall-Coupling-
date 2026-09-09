import { RunoffDataStatus, RunoffProvenance } from './runoff';

export type DrainageNodeType = 'INLET' | 'MANHOLE' | 'OUTFALL';

export type DrainageNodeStatus = 'NORMAL' | 'WATCH' | 'SURCHARGE' | 'OVERFLOW';

export type PipeType = 'CIRCULAR_PIPE' | 'BOX_CULVERT' | 'OPEN_CANAL';

export type PipeUtilizationCategory = 'NORMAL' | 'MODERATE' | 'HIGH' | 'OVER_CAPACITY';

export interface DrainageNodeParameters {
  id: string;
  name: string;
  node_type: DrainageNodeType;
  lat: number;
  lng: number;
  elevation_m: number;
  catchment_cell_id: string; // Associated 5x5 catchment cell (e.g. DEM-GRID-2-1)
  explicit_outlet_capacity_m3_s?: number; // Used for designated outfall throttles / gates
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface DrainageEdgeParameters {
  id: string;
  name: string;
  from_node: string;
  to_node: string;
  edge_type: PipeType;
  coordinates: [[number, number], [number, number]]; // [[from_lng, from_lat], [to_lng, to_lat]]
  length_m: number;
  diameter_m?: number;      // For CIRCULAR_PIPE
  width_m?: number;         // For BOX_CULVERT / OPEN_CANAL
  height_m?: number;        // For BOX_CULVERT / OPEN_CANAL
  slope: number;            // Hydraulic bed slope S (m/m)
  roughness_n: number;      // Manning's n (e.g. 0.013 for concrete, 0.015 for masonry)
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface DrainageNodeState {
  id: string;
  name: string;
  node_type: DrainageNodeType;
  lat: number;
  lng: number;
  elevation_m: number;
  catchment_cell_id: string;
  surface_inflow_m3_s: number;    // Inflow from surface runoff (Inlets only)
  upstream_pipe_inflow_m3_s: number; // Inflow from incoming upstream edges
  total_inflow_m3_s: number;      // surface_inflow + upstream_pipe_inflow
  discharged_outflow_m3_s: number;// Flow passed to downstream pipes or outfall
  surcharge_rate_m3_s: number;    // Q_excess = max(0, Q_in - Q_node_capacity)
  node_capacity_m3_s: number;     // Sum of outgoing edge capacities or explicit outlet cap
  surcharge_ratio: number;        // total_inflow / node_capacity
  status: DrainageNodeStatus;
  status_reason: string;
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface DrainageEdgeState {
  id: string;
  name: string;
  from_node: string;
  to_node: string;
  edge_type: PipeType;
  coordinates: [[number, number], [number, number]];
  length_m: number;
  diameter_m?: number;
  width_m?: number;
  height_m?: number;
  slope: number;
  roughness_n: number;
  cross_sectional_area_m2: number;
  hydraulic_radius_m: number;
  capacity_m3_s: number;          // Manning's gravity capacity Q_cap
  actual_flow_m3_s: number;       // Q_flow conveyed through pipe
  utilization_pct: number;        // (actual_flow / capacity) * 100
  status: PipeUtilizationCategory;
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface DrainageNetworkState {
  network_name: 'Prototype Drainage Network (DAG)';
  timestamp: string;
  hour_offset: 0 | 1 | 2 | 3;
  horizon_label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  status: RunoffDataStatus;
  status_reason: string;
  provenance: RunoffProvenance;

  // Instantaneous flow-rate balance (m³/s)
  total_surface_inflow_m3_s: number;
  total_outfall_discharge_m3_s: number;
  total_surcharge_rate_m3_s: number;
  flow_balance_ratio: number; // (total_outfall + total_surcharge) / total_surface_inflow (~1.0)
  flow_balance_conserved: boolean;

  // Timestep interval volume accounting (m³ over 1 hour interval)
  total_inflow_volume_m3: number;
  total_outfall_volume_m3: number;
  total_surcharge_volume_m3: number;
  volume_balance_conserved: boolean;

  // Network statistics
  total_nodes_count: number;
  total_edges_count: number;
  surcharged_nodes_count: number;
  overcapacity_pipes_count: number;
  average_pipe_utilization_pct: number;

  nodes: DrainageNodeState[];
  edges: DrainageEdgeState[];
}

export interface DrainageForecast {
  generated_at: string;
  source_runoff_status: RunoffDataStatus;
  status: RunoffDataStatus;
  horizons: Record<0 | 1 | 2 | 3, DrainageNetworkState>;
}
