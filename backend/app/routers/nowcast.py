from fastapi import APIRouter, Query
from app.models.schemas import NowcastSummaryResponse
from app.data.mumbai_data import MUMBAI_NOWCAST_SUMMARY
from app.data.chennai_data import CHENNAI_NOWCAST_SUMMARY

router = APIRouter()

@router.get("/nowcast/summary", response_model=NowcastSummaryResponse)
def get_nowcast_summary(city_id: str = Query("mumbai", description="City identifier")):
    """
    Returns high-level live nowcast status, rainfall intensity, max predicted water depth,
    critical intersections count, and surcharged manholes count.
    """
    if city_id.lower() == "chennai":
        data = CHENNAI_NOWCAST_SUMMARY
    else:
        data = MUMBAI_NOWCAST_SUMMARY

    return {
        "status": "success",
        "is_demo_data": True,
        "data": data
    }
