from fastapi import APIRouter, Query
from app.schemas.schemas import RunoffResponse
from app.services.runoff_service import get_catchment_runoff_summary

router = APIRouter()

@router.get("/runoff", response_model=RunoffResponse)
def get_runoff_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    catchments = get_catchment_runoff_summary(rainfall_mm_hr)
    return {
        "status": "success",
        "city_id": "mumbai",
        "formula": "Q = (C * I * A) / 3.6e6",
        "catchments": catchments
    }
