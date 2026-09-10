from fastapi import APIRouter, Query
from app.schemas.schemas import DrainageResponse
from app.services.drainage_service import compute_drainage_network_state

router = APIRouter()

@router.get("/drainage", response_model=DrainageResponse)
def get_drainage_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    features = compute_drainage_network_state(rainfall_mm_hr)
    return {
        "type": "FeatureCollection",
        "is_demo_data": True,
        "features": features
    }
