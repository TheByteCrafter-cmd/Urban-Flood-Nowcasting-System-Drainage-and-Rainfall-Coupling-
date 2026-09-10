# Urban Flood Nowcasting System — Python FastAPI Backend

**Event:** Smart India Hackathon (SIH 2026) — Problem Statement SIH26085  
**Team Name:** GeoNexus  
**Tech Stack:** Python 3.10+, FastAPI, Uvicorn, Pydantic v2, NetworkX, NumPy, SciPy  

---

## 1. Overview & Hydrodynamic Core

This backend provides deterministic hydro-meteorological and hydraulic coupling API endpoints for urban flood nowcasting (0–3 hour lead time). 

### Scientific Modeling Pipeline:
1. **Rational Method Runoff Generation ($Q = C \cdot I \cdot A$):** Surface runoff generated from 0–3h rainfall intensity.
2. **Manning’s Equation 1D Hydraulic Capacity ($Q = \frac{1}{n} A R_h^{2/3} S^{1/2}$):** Gravity conveyance capacity of underground pipes, box culverts, and open canals.
3. **Dynamic 1D-2D Coupling & Surcharge Surcharge Depth:** Computes node surcharge overflow rates ($m^3/s$) when $Q_{in} > Q_{cap}$ and calculates street-level water depth (cm).
4. **NetworkX Penalty Dijkstra Routing:** Computes standard routes vs flood-aware safe paths steering emergency vehicles away from low-lying flooded junctions onto elevated flyovers and freeways.

---

## 2. Requirements & Setup

### Requirements
- Python 3.10 or higher
- Dependencies listed in `requirements.txt`:
  - `fastapi`
  - `uvicorn[standard]`
  - `pydantic`
  - `networkx`
  - `numpy`
  - `scipy`

### Installation
From the `backend/` directory, install all required Python packages:

```bash
pip install -r requirements.txt
```

---

## 3. Running the FastAPI Server

To launch the backend server with auto-reload enabled:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Or run directly via Python:

```bash
python main.py
```

- **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`

---

## 4. API Endpoints (`/api/v1`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/cities` | Returns dynamic listing of supported city basins (Default: Mumbai MMR) |
| `GET` | `/api/v1/nowcast/summary?city_id=mumbai` | Live system status, rainfall mm/hr, max depth, surcharged manholes count |
| `GET` | `/api/v1/flood/depth?city_id=mumbai&time_step=t1` | Inundation GeoJSON polygons with depth (cm), risk level, and color scale |
| `GET` | `/api/v1/drainage/network?city_id=mumbai` | 1D Hydraulic graph GeoJSON (Point nodes + LineString edges) with utilization % |
| `GET` | `/api/v1/alerts?city_id=mumbai` | Active critical flood warnings and municipal advisories |
| `POST` | `/api/v1/routing/safe-path` | Calculates standard route vs flood-aware safe route using penalty Dijkstra |

---

## 5. Sample Requests

### Safe Routing Request (`POST /api/v1/routing/safe-path`)
```json
{
  "city_id": "mumbai",
  "origin": { "lat": 18.9750, "lng": 72.8330 },
  "destination": { "lat": 19.0660, "lng": 72.8680 },
  "vehicle_type": "EMERGENCY_AMBULANCE",
  "max_allowable_depth_cm": 20.0,
  "horizon": "t1"
}
```

---

## 6. Verification & Automated Tests

Run the test suite inside `backend/`:

```bash
python test_api.py
```
