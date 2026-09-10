from fastapi import APIRouter, Query
from app.schemas.schemas import CouplingResponse
from app.services.coupling_service import compute_coupling_mass_balance

router = APIRouter()

@router.get("/coupling", response_model=CouplingResponse)
def get_coupling_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    return compute_coupling_mass_balance(rainfall_mm_hr)
