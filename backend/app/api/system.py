from datetime import datetime
from fastapi import APIRouter
from app.schemas.schemas import HealthResponse, SystemStatusResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def get_health():
    return {"status": "ok", "version": "1.0.0"}

@router.get("/system/status", response_model=SystemStatusResponse)
def get_system_status():
    return {
        "status": "success",
        "data": {
            "backend_status": "HEALTHY",
            "weather_source_status": "IMD_CONNECTED",
            "database_status": "SQLITE_ONLINE",
            "cache_status": "IN_MEMORY_TTL_ACTIVE",
            "last_sync": datetime.utcnow().isoformat() + "Z"
        }
    }
