from fastapi import APIRouter, Query
from app.schemas.schemas import NowcastResponse
from app.services.nowcast_service import get_nowcast_horizons

router = APIRouter()

@router.get("/nowcast", response_model=NowcastResponse)
def get_nowcast_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    return get_nowcast_horizons(rainfall_mm_hr)
