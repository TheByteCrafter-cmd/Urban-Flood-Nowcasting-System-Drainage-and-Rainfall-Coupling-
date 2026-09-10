from fastapi import APIRouter, Query
from app.schemas.schemas import WeatherCurrentResponse
from app.services.weather_service import get_current_weather

router = APIRouter()

@router.get("/weather/current", response_model=WeatherCurrentResponse)
def get_current_weather_endpoint(
    city_id: str = Query("mumbai", description="City identifier"),
    rainfall_mm_hr: float = Query(None, description="Optional override for testing")
):
    data = get_current_weather(city_id, force_rainfall=rainfall_mm_hr)
    return {
        "status": "success",
        "is_demo_data": True,
        "data": data
    }
