import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api import (
    system,
    weather,
    nowcast,
    runoff,
    surface_flow,
    drainage,
    coupling,
    risk,
    alerts,
    routing,
    map as map_router
)

# Initialize database tables for SQLite fallback
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Coupled Hydrodynamic & Drainage Nowcasting Backend (SIH 2026)"
)

# Enable CORS for local dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under prefix /api
app.include_router(system.router, prefix=settings.API_PREFIX, tags=["System & Health"])
app.include_router(weather.router, prefix=settings.API_PREFIX, tags=["Weather"])
app.include_router(nowcast.router, prefix=settings.API_PREFIX, tags=["Nowcast"])
app.include_router(runoff.router, prefix=settings.API_PREFIX, tags=["Runoff"])
app.include_router(surface_flow.router, prefix=settings.API_PREFIX, tags=["Surface Flow"])
app.include_router(drainage.router, prefix=settings.API_PREFIX, tags=["Drainage"])
app.include_router(coupling.router, prefix=settings.API_PREFIX, tags=["Coupling Engine"])
app.include_router(risk.router, prefix=settings.API_PREFIX, tags=["Risk Breakdown"])
app.include_router(alerts.router, prefix=settings.API_PREFIX, tags=["Alerts"])
app.include_router(routing.router, prefix=settings.API_PREFIX, tags=["Safe Routing"])
app.include_router(map_router.router, prefix=settings.API_PREFIX, tags=["GIS Map Metadata"])

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
