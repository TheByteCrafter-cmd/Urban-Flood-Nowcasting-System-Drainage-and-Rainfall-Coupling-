from fastapi import APIRouter
from app.models.schemas import SafeRoutingRequest, SafeRoutingResponse
from app.routing.flood_router import calculate_dual_safe_route

router = APIRouter()

@router.post("/routing/safe-path", response_model=SafeRoutingResponse)
def compute_safe_route(request: SafeRoutingRequest):
    """
    Computes standard route (shortest path) vs flood-aware safe route bypassing waterlogged corridors.
    Returns travel distance, estimated travel time, water depth metrics, avoided hazard segments, and route polyline coordinates.
    """
    result = calculate_dual_safe_route(
        origin_lat=request.origin.lat,
        origin_lng=request.origin.lng,
        dest_lat=request.destination.lat,
        dest_lng=request.destination.lng,
        vehicle_type=request.vehicle_type or "EMERGENCY_AMBULANCE",
        max_allowable_depth_cm=request.max_allowable_depth_cm or 20.0,
        horizon=(request.horizon or "t1").upper()
    )
    
    return result
