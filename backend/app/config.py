class Settings:
    PROJECT_NAME: str = "Urban Flood Nowcasting System (Drainage and Rainfall Coupling)"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS settings - enable full access for local frontend dev server
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",
    ]
    
    DEFAULT_CITY_ID: str = "mumbai"

settings = Settings()
