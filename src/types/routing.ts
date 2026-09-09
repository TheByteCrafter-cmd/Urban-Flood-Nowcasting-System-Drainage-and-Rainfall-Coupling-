import { RiskLevel } from './risk';

export type RoadNodeType = 'JUNCTION' | 'TERMINUS' | 'LANDMARK';

export type RoadType = 'EXPRESSWAY' | 'ARTERIAL' | 'SUB_ARTERIAL' | 'LOCAL';

export type RoutingMode = 'SAFEST' | 'FASTEST' | 'EMERGENCY';

export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: RoadNodeType;
  catchment_cell_id: string;
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface RoadEdge {
  id: string;
  name: string;
  source: string;
  target: string;
  distance_m: number;
  base_speed_kmh: number;
  road_type: RoadType;
  bidirectional: boolean;
  catchment_cell_id: string;
  coordinates: [number, number][]; // [lat, lng] points along the road
  is_elevated?: boolean;
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface RoadNetworkGraph {
  nodes: RoadNode[];
  edges: RoadEdge[];
  provenance: 'ASSUMED_PROTOTYPE';
}

export interface RouteSegment {
  edge_id: string;
  name: string;
  from_node_id: string;
  to_node_id: string;
  from_node_name: string;
  to_node_name: string;
  distance_m: number;
  base_speed_kmh: number;
  effective_speed_kmh: number;
  travel_time_s: number;
  flood_depth_cm: number;
  risk_level: RiskLevel;
  penalty_factor: number;
  is_blocked: boolean;
  coordinates: [number, number][];
}

export interface RouteRiskExposure {
  low_m: number;
  moderate_m: number;
  high_m: number;
  very_high_m: number;
  critical_m: number;
}

export interface AvoidedHazardSegment {
  edge_id: string;
  name: string;
  risk_level: RiskLevel;
  depth_cm: number;
  reason: string;
}

export interface RouteResult {
  status: 'FOUND' | 'NO_SAFE_ROUTE' | 'ORIGIN_EQUALS_DESTINATION';
  mode: RoutingMode;
  horizon: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  origin: RoadNode;
  destination: RoadNode;
  total_distance_m: number;
  total_distance_km: number;
  total_time_s: number;
  total_time_min: number;
  max_flood_depth_cm: number;
  highest_risk_level: RiskLevel;
  segments: RouteSegment[];
  path_node_ids: string[];
  coordinates: [number, number][]; // Consolidated [lat, lng] array
  risk_exposure: RouteRiskExposure;
  avoided_segments: AvoidedHazardSegment[];
  explanation: string;
  is_alternative?: boolean;
  provenance: 'MODEL OUTPUT / DERIVED';
}

export interface RoutePairResult {
  primary: RouteResult;
  alternative?: RouteResult;
  evaluated_at: string;
  horizon: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  mode: RoutingMode;
  provenance: 'MODEL OUTPUT / DERIVED';
}
