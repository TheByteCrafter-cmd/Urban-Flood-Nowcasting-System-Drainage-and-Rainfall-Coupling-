import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import cities, nowcast, flood, drainage, alerts, routing

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Deterministic Hydro-meteorological & Dynamic 1D/2D Hydraulic Coupling FastAPI Backend (SIH26085)"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(cities.router, prefix=settings.API_V1_STR, tags=["Cities"])
app.include_router(nowcast.router, prefix=settings.API_V1_STR, tags=["Nowcast"])
app.include_router(flood.router, prefix=settings.API_V1_STR, tags=["Flood Depth GeoJSON"])
app.include_router(drainage.router, prefix=settings.API_V1_STR, tags=["Drainage Network"])
app.include_router(alerts.router, prefix=settings.API_V1_STR, tags=["Alerts"])
app.include_router(routing.router, prefix=settings.API_V1_STR, tags=["Safe Routing"])

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "ONLINE",
        "docs_url": "/docs",
        "api_v1_prefix": settings.API_V1_STR
    }

@app.get("/health")
def health_check():
    return {"status": "HEALTHY"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
