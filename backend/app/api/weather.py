from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.schemas import WeatherCurrentResponse
from app.services.weather_service import get_current_weather

router = APIRouter()

@router.get("/weather/current", response_model=WeatherCurrentResponse)
def get_current_weather_endpoint(
    city_id: str = Query("mumbai", description="City identifier"),
    rainfall_mm_hr: Optional[float] = Query(None, description="Optional override for testing"),
    fresh: bool = Query(False, description="Bypass cache and force fresh upstream fetch")
):
    actual_city = city_id if isinstance(city_id, str) else "mumbai"
    actual_rain = rainfall_mm_hr if isinstance(rainfall_mm_hr, (int, float)) else None
    data = get_current_weather(actual_city, force_rainfall=actual_rain, fresh=fresh)
    return {
        "status": "success",
        "is_demo_data": data.get("is_demo_data", False),
        "data": data
    }
