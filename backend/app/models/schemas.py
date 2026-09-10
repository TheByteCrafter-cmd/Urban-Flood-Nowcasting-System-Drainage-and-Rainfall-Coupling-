from typing import List, Optional, Union, Dict, Any, Tuple
from pydantic import BaseModel, Field

# =============================================================================
# CITY ENDPOINT SCHEMAS
# =============================================================================

class CityInfo(BaseModel):
    city_id: str
    city_name: str
    state: str
    center: Tuple[float, float]  # [lng, lat]
    zoom: int

class CityListResponse(BaseModel):
    status: str = "success"
    data: List[CityInfo]

# =============================================================================
# NOWCAST SUMMARY SCHEMAS
# =============================================================================

class NowcastSummaryData(BaseModel):
    city_id: str
    last_updated: str
    nowcast_window_hours: int = 3
    current_rainfall_mm_hr: float
    max_predicted_water_depth_cm: float
    critical_intersections_count: int
    surcharged_manholes_count: int
    model_status: str = "ACTIVE_RUNNING"

class NowcastSummaryResponse(BaseModel):
    status: str = "success"
    is_demo_data: bool = True
    data: NowcastSummaryData

# =============================================================================
# GEOJSON FLOOD DEPTH SCHEMAS
# =============================================================================

class PolygonGeometry(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]  # Polygon ring coordinates [[lng, lat]]

class FloodFeatureProperties(BaseModel):
    id: str
    location_name: Optional[str] = None
    area_name: Optional[str] = None
    street_name: Optional[str] = None
    zone_id: Optional[str] = None
    predicted_depth_cm: float
    water_depth_cm: Optional[float] = None
    risk_level: str  # Low, Moderate, High, Very High, Critical / MODERATE_HIGH
    category: Optional[str] = None  # 0-5, 5-20, 20-50, 50-100, 100+
    color: Optional[str] = None
    confidence: Optional[float] = 0.89
    is_demo_data: bool = True

class GeoJSONFloodFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: PolygonGeometry
    properties: FloodFeatureProperties

class FloodDepthGeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    timestamp: str
    time_step: str  # t0, t1, t2, t3
    is_demo_data: bool = True
    features: List[GeoJSONFloodFeature]

# =============================================================================
# DRAINAGE NETWORK SCHEMAS
# =============================================================================

class PointGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [lng, lat]

class LineStringGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]  # [[lng, lat], ...]

class DrainageNodeProperties(BaseModel):
    feature_type: str = "NODE"
    node_id: str
    node_type: str  # Manhole, Catch Basin, Outfall, Pumping Station, INLET
    current_flow_m3_s: float
    capacity_m3_s: float
    capacity_utilization_pct: float
    status: str  # NORMAL, WATCH, SURCHARGE, BACKFLOW, OVERFLOW
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
    flow_direction: str  # FORWARD, REVERSE, STAGNANT
    status: str  # NORMAL, CAPACITY_EXCEEDED, BACKFLOW, OVER_CAPACITY

class GeoJSONDrainageNodeFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: PointGeometry
    properties: DrainageNodeProperties

class GeoJSONDrainageEdgeFeature(BaseModel):
    type: str = "Feature"
    id: str
    geometry: LineStringGeometry
    properties: DrainageEdgeProperties

class DrainageNetworkGeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    is_demo_data: bool = True
    features: List[Union[GeoJSONDrainageNodeFeature, GeoJSONDrainageEdgeFeature]]

# =============================================================================
# ALERTS SCHEMAS
# =============================================================================

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

# =============================================================================
# ROUTING SCHEMAS
# =============================================================================

class CoordinatePoint(BaseModel):
    lat: float
    lng: float

class SafeRoutingRequest(BaseModel):
    city_id: str = "mumbai"
    origin: CoordinatePoint
    destination: CoordinatePoint
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
    coordinates: List[Tuple[float, float]]  # [lat, lng]

class RoadNodeSchema(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    type: str
    catchment_cell_id: str
    provenance: str = "ASSUMED_PROTOTYPE"

class RouteResultSchema(BaseModel):
    status: str  # FOUND, NO_SAFE_ROUTE, ORIGIN_EQUALS_DESTINATION
    mode: str  # SAFEST, FASTEST, EMERGENCY
    horizon: str  # T+0, T+1, T+2, T+3
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
    coordinates: List[Tuple[float, float]]  # [lat, lng]
    risk_exposure: RouteRiskExposure
    avoided_segments: List[AvoidedHazardSegment]
    explanation: str
    is_alternative: Optional[bool] = False
    provenance: str = "MODEL OUTPUT / DERIVED"

class SafeRoutingResponse(BaseModel):
    status: str = "success"
    primary: RouteResultSchema
    alternative: Optional[RouteResultSchema] = None
    evaluated_at: str
    horizon: str = "T+1"
    mode: str = "SAFEST"
    provenance: str = "MODEL OUTPUT / DERIVED"
