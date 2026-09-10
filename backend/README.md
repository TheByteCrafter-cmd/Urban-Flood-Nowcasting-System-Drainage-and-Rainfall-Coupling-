# Urban Flood Nowcasting System — Python FastAPI Backend

**Event:** Smart India Hackathon (SIH 2026) — Problem Statement SIH26085  
**Team Name:** GeoNexus  
**Tech Stack:** Python 3.10+, FastAPI, Uvicorn, Pydantic, SQLAlchemy (SQLite Phase 1), NetworkX, NumPy, SciPy, Pytest  

---

## 1. Directory Tree Architecture

```
backend/
├── app/
│   ├── main.py                     # Main FastAPI App, CORS, Router Registration
│   ├── api/                        # API Route Handlers (12 Endpoints)
│   │   ├── system.py               # GET /api/health, GET /api/system/status
│   │   ├── weather.py              # GET /api/weather/current
│   │   ├── nowcast.py              # GET /api/nowcast
│   │   ├── runoff.py               # GET /api/runoff
│   │   ├── surface_flow.py         # GET /api/surface-flow
│   │   ├── drainage.py             # GET /api/drainage
│   │   ├── coupling.py             # GET /api/coupling
│   │   ├── risk.py                 # GET /api/risk
│   │   ├── alerts.py               # GET /api/alerts
│   │   ├── routing.py              # POST /api/routing/safe-route
│   │   └── map.py                  # GET /api/map/layers
│   ├── services/                   # Business & Physics Calculation Services
│   │   ├── weather_service.py      # Live/IMD telemetry & TTL caching
│   │   ├── runoff_service.py       # Rational Method (Q = C * I * A / 3.6e6)
│   │   ├── surface_flow_service.py # DEM 2D terrain elevation & surface storage grid
│   │   ├── drainage_service.py     # 1D underground network & Manning's equation
│   │   ├── coupling_service.py     # 1D-2D Dynamic Coupling Engine & Mass Balance
│   │   ├── nowcast_service.py      # T+0 to T+3 horizon generators
│   │   ├── risk_service.py         # Risk classification (LOW, MODERATE, HIGH, VERY_HIGH, CRITICAL)
│   │   ├── alert_service.py        # Active flood advisory generator
│   │   └── routing_service.py      # NetworkX Dijkstra pathfinder (SAFEST, FASTEST, EMERGENCY)
│   ├── models/                     # SQLAlchemy ORM Entities (SQLite Phase 1)
│   │   └── database_models.py
│   ├── schemas/                    # Pydantic Validation Schemas
│   │   └── schemas.py
│   ├── core/                       # App Configuration, DB Session, TTL Cache
│   │   ├── config.py
│   │   ├── database.py
│   │   └── cache.py
│   └── data/                       # Seed & Prototype Graph Data
│       └── seed_data.py
├── tests/                          # Automated Pytest Test Suite
│   ├── test_dry_case.py            # Dry case (0 mm/hr -> 0 runoff -> 0 depth -> 0 alerts)
│   ├── test_heavy_rain.py          # Heavy storm (65 mm/hr -> surcharge -> alerts -> route changes)
│   └── test_endpoints.py           # Verification of all 12 API endpoints
├── scripts/                        # Database Seeding Scripts
│   └── seed_db.py
├── requirements.txt
├── .env.example
└── README.md
```

---

## 2. Mass Balance & Physics Formulation

### 1. Rational Method Runoff Generation:
$$Q = \frac{C \cdot I \cdot A}{3.6 \times 10^6}$$
- $Q$: Peak runoff rate ($m^3/s$)
- $C$: Runoff coefficient ($0.85 - 0.90$ for dense urban concrete)
- $I$: Nowcast rainfall intensity ($mm/hr$)
- $A$: Catchment area ($m^2$)

### 2. Manning's 1D Underground Capacity:
$$Q = \frac{1}{n} A R_h^{2/3} S^{1/2}$$
- $Q$: Full-flow gravity pipe capacity ($m^3/s$)
- $n$: Manning's roughness coefficient ($0.013$ for concrete)
- $A$: Cross-sectional flow area ($m^2$)
- $R_h$: Hydraulic radius ($m$)
- $S$: Bed slope ($m/m$)

### 3. Strict Mass Balance Coupling:
$$\text{Input Runoff Volume} = \text{Drainage Outfall Volume} + \text{Surface Boundary Outflow} + \text{Final Surface Storage}$$
*Strict Rule: Surcharge is an internal hydraulic transfer between 1D pipes and 2D surface, not an external loss or double-counted volume.*

### 4. Civil Safety Risk Thresholds:
- **< 5 cm:** `LOW` (`#DBEAFE`)
- **5 – 20 cm:** `MODERATE` (`#93C5FD`)
- **20 – 50 cm:** `HIGH` (`#F59E0B`)
- **50 – 100 cm:** `VERY_HIGH` (`#EA580C`)
- **>= 100 cm:** `CRITICAL` (`#B91C1C`)

---

## 3. Quick Start & Execution

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Seed Database
```bash
python scripts/seed_db.py
```

### Launch Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`

---

## 4. Running Tests

Run the complete test suite:

```bash
python tests/test_dry_case.py
python tests/test_heavy_rain.py
python tests/test_endpoints.py
```

Or via pytest:
```bash
pytest tests/
```
