from fastapi import APIRouter, Query
from app.schemas.schemas import RiskResponse
from app.services.risk_service import compute_risk_summary

router = APIRouter()

@router.get("/risk", response_model=RiskResponse)
def get_risk_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    return compute_risk_summary(rainfall_mm_hr)
