from typing import List, Optional, Dict, Any, Tuple, Union
from pydantic import BaseModel, Field

# 1. Health & System Status
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"

class SystemStatusData(BaseModel):
    backend_status: str = "HEALTHY"
    weather_source_status: str = "IMD_CONNECTED"
    database_status: str = "SQLITE_ONLINE"
    cache_status: str = "IN_MEMORY_TTL_ACTIVE"
    last_sync: str

class SystemStatusResponse(BaseModel):
    status: str = "success"
    data: SystemStatusData

# 2. Weather
class WeatherCurrentData(BaseModel):
    city_id: str = "mumbai"
    rainfall_mm_hr: float
    temperature_c: float = 28.5
    humidity_pct: float = 88.0
    wind_speed_kmh: float = 14.2
    source: str = "IMD_LIVE"
    timestamp: str

class WeatherCurrentResponse(BaseModel):
    status: str = "success"
    is_demo_data: bool = True
    data: WeatherCurrentData

# 3. Nowcast
class NowcastHorizonData(BaseModel):
    horizon_label: str  # T+0, T+1, T+2, T+3
    hour_offset: int
    rainfall_mm_hr: float
    max_water_depth_cm: float
    surcharged_manholes_count: int
    critical_hotspots_count: int

class NowcastResponse(BaseModel):
    status: str = "success"
    city_id: str = "mumbai"
    generated_at: str
    horizons: List[NowcastHorizonData]

# 4. Runoff
class CatchmentRunoffItem(BaseModel):
    catchment_id: str
    zone_name: str
    area_m2: float
    land_use: str
    runoff_coefficient_c: float
    rainfall_mm_hr: float
    peak_runoff_m3_s: float
    total_volume_1h_m3: float

class RunoffResponse(BaseModel):
    status: str = "success"
    city_id: str = "mumbai"
    formula: str = "Q = (C * I * A) / 3.6e6"
    catchments: List[CatchmentRunoffItem]

# 5. Surface Flow
class SurfaceFlowCellItem(BaseModel):
    cell_id: str
    grid_row: int
    grid_col: int
    elevation_m: float
    retained_volume_m3: float
    boundary_outflow_m3: float
    water_depth_m: float
    water_depth_cm: float
    depth_category: str
    color: str

class SurfaceFlowResponse(BaseModel):
    status: str = "success"
    grid_resolution_m: float = 5.0
    total_cells: int
    cells: List[SurfaceFlowCellItem]

# 6. Drainage
class PointGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [lng, lat]

class LineStringGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]  # [[lng, lat], ...]

class DrainageNodeProperties(BaseModel):
    feature_type: str = "NODE"
    node_id: str
    node_type: str
    current_flow_m3_s: float
    capacity_m3_s: float
    capacity_utilization_pct: float
    status: str
    surcharge_state: str
    backflow_state: str
    surface_impact_depth_cm: float

class DrainageEdgeProperties(BaseModel):
    feature_type: str = "EDGE"
    pipe_id: str
    start_node: str
    end_node: str
    diameter_mm: Optional[float] = 1200
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    current_flow_m3_s: float
    capacity_m3_s: float
    capacity_utilization_pct: float
    flow_direction: str
    status: str

class GeoJSONNodeFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: PointGeometry
    properties: DrainageNodeProperties

class GeoJSONEdgeFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: LineStringGeometry
    properties: DrainageEdgeProperties

class DrainageResponse(BaseModel):
    type: str = "FeatureCollection"
    is_demo_data: bool = True
    features: List[Union[GeoJSONNodeFeature, GeoJSONEdgeFeature]]

# 7. Coupling & Mass Balance
class MassBalanceData(BaseModel):
    input_runoff_volume_m3: float
    drainage_outfall_volume_m3: float
    surface_boundary_outflow_m3: float
    surface_stored_volume_m3: float
    total_accounted_volume_m3: float
    volume_balance_ratio: float
    volume_balance_error_pct: float
    is_conserved: bool
    internal_drainage_intake_m3: float
    internal_surcharge_return_m3: float

class CouplingResponse(BaseModel):
    status: str = "success"
    timestamp: str
    horizon: str = "T+1"
    iterations_run: int = 3
    mass_balance: MassBalanceData

# 8. Risk
class RiskSummaryData(BaseModel):
    low_risk_cells: int
    moderate_risk_cells: int
    high_risk_cells: int
    very_high_risk_cells: int
    critical_risk_cells: int
    max_flood_depth_cm: float

class RiskResponse(BaseModel):
    status: str = "success"
    city_id: str = "mumbai"
    risk_summary: RiskSummaryData

# 9. Alerts
class AlertItem(BaseModel):
    alert_id: str
    severity: str  # CRITICAL, HIGH, MODERATE
    location: str
    predicted_depth_cm: float
    time_window: str
    recommended_action: str
    issued_at: str

class AlertsResponse(BaseModel):
    status: str = "success"
    is_demo_data: bool = True
    data: List[AlertItem]

# 10. Safe Routing
class CoordinatePoint(BaseModel):
    lat: float
    lng: float

class SafeRouteRequest(BaseModel):
    city_id: str = "mumbai"
    origin: CoordinatePoint
    destination: CoordinatePoint
    routing_mode: Optional[str] = "SAFEST"  # SAFEST, FASTEST, EMERGENCY
    vehicle_type: Optional[str] = "EMERGENCY_AMBULANCE"
    max_allowable_depth_cm: float = 20.0
    horizon: Optional[str] = "t1"

class RouteRiskExposure(BaseModel):
    low_m: float = 0.0
    moderate_m: float = 0.0
    high_m: float = 0.0
    very_high_m: float = 0.0
    critical_m: float = 0.0

class AvoidedHazardSegment(BaseModel):
    edge_id: str
    name: str
    risk_level: str
    depth_cm: float
    reason: str

class RouteSegmentSchema(BaseModel):
    edge_id: str
    name: str
    from_node_id: str
    to_node_id: str
    from_node_name: str
    to_node_name: str
    distance_m: float
    base_speed_kmh: float
    effective_speed_kmh: float
    travel_time_s: float
    flood_depth_cm: float
    risk_level: str
    penalty_factor: float
    is_blocked: bool
    coordinates: List[Tuple[float, float]]

class RoadNodeSchema(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    type: str
    catchment_cell_id: str
    provenance: str = "ASSUMED_PROTOTYPE"

class RouteResultSchema(BaseModel):
    status: str
    mode: str
    horizon: str
    origin: RoadNodeSchema
    destination: RoadNodeSchema
    total_distance_m: float
    total_distance_km: float
    total_time_s: float
    total_time_min: float
    max_flood_depth_cm: float
    highest_risk_level: str
    segments: List[RouteSegmentSchema]
    path_node_ids: List[str]
    coordinates: List[Tuple[float, float]]
    risk_exposure: RouteRiskExposure
    avoided_segments: List[AvoidedHazardSegment]
    explanation: str
    is_alternative: Optional[bool] = False
    provenance: str = "MODEL OUTPUT / DERIVED"

class SafeRouteResponse(BaseModel):
    status: str = "success"
    primary: RouteResultSchema
    alternative: Optional[RouteResultSchema] = None
    evaluated_at: str
    horizon: str = "T+1"
    mode: str = "SAFEST"

# 11. Map Layers Metadata
class MapLayerMetadata(BaseModel):
    layer_id: str
    layer_name: str
    type: str  # raster, vector-polygon, vector-point, vector-linestring
    visible_default: bool
    opacity: float

class MapLayersResponse(BaseModel):
    status: str = "success"
    city_id: str = "mumbai"
    crs: str = "EPSG:4326"
    layers: List[MapLayerMetadata]
