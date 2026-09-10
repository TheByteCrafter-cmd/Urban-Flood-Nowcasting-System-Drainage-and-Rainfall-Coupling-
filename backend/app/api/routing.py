from fastapi import APIRouter
from app.schemas.schemas import SafeRouteRequest, SafeRouteResponse
from app.services.routing_service import compute_safe_route_pair

router = APIRouter()

@router.post("/routing/safe-route", response_model=SafeRouteResponse)
def compute_safe_route_endpoint(request: SafeRouteRequest):
    return compute_safe_route_pair(
        origin_lat=request.origin.lat,
        origin_lng=request.origin.lng,
        dest_lat=request.destination.lat,
        dest_lng=request.destination.lng,
        routing_mode=request.routing_mode or "SAFEST",
        vehicle_type=request.vehicle_type or "EMERGENCY_AMBULANCE",
        max_allowable_depth_cm=request.max_allowable_depth_cm or 20.0
    )
