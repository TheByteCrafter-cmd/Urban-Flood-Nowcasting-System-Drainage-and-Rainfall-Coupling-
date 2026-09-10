from fastapi import APIRouter, Query
from app.schemas.schemas import AlertsResponse
from app.services.alert_service import get_active_alerts

router = APIRouter()

@router.get("/alerts", response_model=AlertsResponse)
def get_alerts_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    alerts = get_active_alerts(rainfall_mm_hr)
    return {
        "status": "success",
        "is_demo_data": True,
        "data": alerts
    }
