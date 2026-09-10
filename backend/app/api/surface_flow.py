from fastapi import APIRouter, Query
from app.schemas.schemas import SurfaceFlowResponse
from app.services.surface_flow_service import compute_surface_flow_grid

router = APIRouter()

@router.get("/surface-flow", response_model=SurfaceFlowResponse)
def get_surface_flow_endpoint(
    rainfall_mm_hr: float = Query(48.5, description="Rainfall intensity mm/hr")
):
    cells = compute_surface_flow_grid(rainfall_mm_hr)
    return {
        "status": "success",
        "grid_resolution_m": 5.0,
        "total_cells": len(cells),
        "cells": cells
    }
