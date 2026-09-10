from fastapi import APIRouter, Query
from app.models.schemas import AlertsResponse
from app.data.mumbai_data import MUMBAI_ALERTS
from app.data.chennai_data import CHENNAI_ALERTS

router = APIRouter()

@router.get("/alerts", response_model=AlertsResponse)
def get_alerts(city_id: str = Query("mumbai", description="City identifier")):
    """
    Returns active flood advisories, critical low-lying warnings, and municipal action alerts.
    """
    if city_id.lower() == "chennai":
        alerts = CHENNAI_ALERTS
    else:
        alerts = MUMBAI_ALERTS

    return {
        "status": "success",
        "is_demo_data": True,
        "data": alerts
    }
