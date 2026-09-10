import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Urban Flood Nowcasting System (Drainage and Rainfall Coupling)"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Environment Variables & Defaults
    IMD_API_URL: str = os.getenv("IMD_API_URL", "https://api.imd.gov.in/v1/rainfall")
    WEATHER_API_URL: str = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "sample_demo_key_sih2026")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./urban_flood.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ]
    
    DEFAULT_CITY_ID: str = "mumbai"

settings = Settings()
