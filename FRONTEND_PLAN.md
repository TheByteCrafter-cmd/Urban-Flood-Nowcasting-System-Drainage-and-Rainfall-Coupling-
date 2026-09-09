# PHASE 0 — FRONTEND SPECIFICATION & ARCHITECTURE CONTRACT
## Urban Flood Nowcasting System (Drainage and Rainfall Coupling)
**Team Name:** GeoNexus  
**Event:** Smart India Hackathon (SIH 2026) — Problem Statement SIH26085  
**Document Version:** 1.0.1  
**Phase:** Phase 0 — Revised After Human Review  

---

## HUMAN REVIEW CORRECTIONS APPLIED

This document has been updated to **v1.0.1** following explicit human architectural review:

1. **No AI/ML as a Core Claim:** Re-focused system framing strictly on deterministic, hydro-meteorological, and hydraulic coupled physics modeling (Rainfall Nowcast + 2D Overland Runoff + 1D Underground Drainage Hydraulics). Removed all generic AI/ML branding and hype claims.
2. **City-Independent Architecture:** Decoupled all UI components from hardcoded city logic. Configured Mumbai (BMC) as the default initial demo/mock dataset while mandating dynamic `city_id` backend data binding for future multi-city deployment (e.g., Chennai, Delhi).
3. **Transparent Demo Data State:** Mandated explicit `DEMO MODE` / `SAMPLE DATA` visual badges whenever mock data is displayed. Prohibited fake "LIVE NOWCAST" labels on unverified sample data.
4. **Minimal Technology & File Count Discipline:** Enforced a strict dependency evaluation rule. Added dependencies only if existing tools cannot fulfill the feature. Maintained a minimal practical file count for easy handoff to the backend developer.
5. **Drainage Analysis as Core Differentiator:** Strengthened Section 10 and Phase 4 specifications to visually trace the exact causal chain: *Underground Pipe Capacity Exceeded → Hydrodynamic Surcharge/Backflow → Water Reaches Surface → Street-Level Flooding*. Added comprehensive Node and Edge inspector specifications.
6. **Core Demo Flow Priority:** Confirmed the primary screen as the **Main GIS Dashboard**. Defined the demo flow as `HOME → LIVE GIS DASHBOARD → 0–3 HOUR NOWCAST → DRAINAGE ANALYSIS → ALERTS → SAFE ROUTING`.

---

## 1. PROJECT UNDERSTANDING

Urban flooding in major Indian metropolitan regions (such as Mumbai, Chennai, and Delhi) is a recurring socio-economic and public safety crisis. During heavy monsoon events, traditional Numerical Weather Prediction (NWP) models provide estimates of cumulative or spatial rainfall depth. However, **rainfall information alone is insufficient to predict street-level flooding**.

Localized urban inundation is determined by a complex hydro-meteorological and hydraulic interplay involving:
- **Micro-topography & Digital Elevation Models (DEM):** Elevation contours, low-lying depressions, and slope gradients.
- **Land Use & Impervious Surfaces:** High concrete cover, reduced infiltration rates, and dense building footprints.
- **Underground Drainage Network:** Manhole/inlet intake capacity, pipe diameters, slope, flow capacity, and hydro-dynamic surcharge/backflow.
- **Hydraulic Bottlenecks:** Surcharged pipes pushing water back up through manholes onto urban streets.

### Non-AI Technical Core
This system is **NOT** an AI/ML-first black-box system. The core technical approach is a physics-based coupled hydrodynamic model:

$$\text{Rainfall Nowcast} + \text{DEM/Terrain} + \text{Land Cover} + \text{2D Surface Flow} + \text{1D Drainage Network} + \text{Hydraulic Capacity Analysis} + \text{Surcharge/Backflow} = \text{Street-Level Inundation}$$

### The Objective
GeoNexus is building a high-resolution, real-time **Urban Flood Nowcasting System** with a **0–3 hour lead time**. The system couples high-resolution rainfall nowcasts with 2D surface runoff models and 1D underground drainage network hydraulics to predict street-level water depth and generate actionable disaster response decisions.

---

## 2. PROBLEM SUMMARY & SYSTEM DATA FLOW

The frontend must clearly convey the full scientific and operational pipeline:

```
[ RAIN / DOPPLER RADAR ]
          ↓
[ RAINFALL NOWCAST (0-3 HR) ]
          ↓
[ OVERLAND RUNOFF MODEL ]
          ↓
[ 2D SURFACE FLOW MODEL (DEM + Land Cover) ]
          ↓
[ 1D UNDERGROUND DRAINAGE NETWORK ]
          ↓
[ HYDRAULIC CAPACITY & SURCHARGE / BACKFLOW ANALYSIS ]
          ↓
[ STREET-LEVEL WATER DEPTH PREDICTION (cm) ]
          ↓
[ GIS DASHBOARD & REAL-TIME MAP OVERLAYS ]
          ↓
[ LOCALIZED ALERTS & FLOOD-AWARE SAFE ROUTING ]
```

### Core Thesis of the UI
> **"Knowing rainfall is not enough. We couple rainfall + terrain + land use + underground drainage hydraulics to predict exactly where streets will flood before it happens."**

---

## 3. CORE USER GOALS

1. **Disaster Management & Municipal Authorities (BMC, GCC, NDRF, SDMA):**
   - Gain real-time situational awareness of current and 0–3 hour predicted inundation across the metro area.
   - Pinpoint surcharged manholes, pipe bottlenecks, and submerged intersections to dispatch dewatering pumps and emergency teams proactively.
2. **Emergency First Responders (Ambulance, Fire, Police):**
   - Calculate flood-safe navigation routes between stations, incident locations, and hospitals.
   - Avoid low-lying roads predicted to exceed vehicle safe depth thresholds (e.g., >20 cm for emergency vehicles).
3. **Urban Commuters & Transit Operators:**
   - Check real-time street risk before commuting during monsoon storms.
   - View safe alternative transit corridors bypassing flooded arterial roads.

---

## 4. FRONTEND GOALS & DESIGN PHILOSOPHY

- **Disaster Management & Engineering Aesthetic:** Clean, academic, highly functional civil engineering and GIS visual language.
- **Anti-Gimmick Design:** Strictly **NO** neon colors, cyberpunk dark themes, glowing particle effects, or generic crypto/SaaS admin aesthetics.
- **City-Independent Architecture:** All components take dynamic `city_id` props and API data structures. Mumbai is used as the initial demo dataset without hardcoding city-specific assumptions into component code.
- **Transparent Data Modes:** Mandatory `[DEMO MODE — ILLUSTRATIVE DATA]` badge displayed prominently whenever mock fixtures are loaded. No fake "LIVE NOWCAST" claims during demo/offline states.
- **Minimal Technology & File Footprint:** Minimal dependencies, no unnecessary abstractions or redundant files.

---

## 5. FINAL SCREEN / PAGE ARCHITECTURE

The primary operational screen is the **Main GIS Dashboard**. The application is structured around a focused 6-screen flow:

```
DEMO FLOW:
[ 1. HOME ] ──► [ 2. MAIN GIS DASHBOARD ] ──► [ 3. 0-3h NOWCAST ] ──► [ 4. DRAINAGE ANALYSIS ] ──► [ 5. ALERTS ] ──► [ 6. SAFE ROUTING ]
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GEONEXUS NAVIGATION SHELL                             │
│  [Logo & Title]  [City Switcher]  [DEMO MODE / LIVE Badge]  [Last Sync Time]    │
└─────────────────────────────────────────────────────────────────────────────────┘
         │               │                │               │               │
         ▼               ▼                ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ 1. LANDING│   │  2. MAIN  │   │ 3. 0-3 HR │   │4. DRAINAGE│   │5. ALERTS &│
   │  / HOME   │   │  GIS MAP  │   │  NOWCAST  │   │  ANALYSIS │   │  ROUTING  │
   └───────────┘   └───────────┘   └───────────┘   └───────────┘   └───────────┘
```

### Screen Breakdown

#### Screen 1: Landing / Home (`/`) — *Minimal Overview*
- **Purpose:** Brief system introduction and entry portal.
- **Key Modules:**
  - Concise problem summary: Rainfall + Terrain + Drainage Coupling.
  - City selector dropdown (Default: `Mumbai (BMC)`).
  - High-level system data flow diagram.
  - Primary Action Button: `"Launch GIS Dashboard"`.
  - Placeholder: `[PHOTO PLACEHOLDER — URBAN MONSOON FLOODING / CITY INFRASTRUCTURE]`.

#### Screen 2: Main GIS Dashboard (`/dashboard`) — *PRIMARY SCREEN (Highest Implementation Priority)*
- **Purpose:** Central command center for real-time spatial monitoring and inundation analysis.
- **Key Modules:**
  - Full-screen interactive GIS map canvas (MapLibre GL JS).
  - Floating Layer Control Panel (Base map, Radar Rainfall, DEM Terrain, Flood Depth Polygons, Drainage Network Nodes/Edges).
  - Interactive Forecast Time Slider (`T+0h` to `T+3h` in 15-minute steps).
  - Quick Feature Inspector Drawer (Displays properties when clicking a street, pipe, or manhole).
  - Dynamic Map Legend (Semantic depth scale in cm and hydraulic status keys).

#### Screen 3: 0–3 Hour Nowcast View (`/nowcast`)
- **Purpose:** Temporal predictive breakdown showing flood progression over time.
- **Key Modules:**
  - Side-by-side time-step comparison tiles (`T+0`, `T+1`, `T+2`, `T+3`).
  - Hyetograph & Hydrograph charts (Rainfall Intensity vs. Predicted Water Depth).
  - Critical Intersections Risk Table (Top 10 predicted flood hotspots with depth trends).

#### Screen 4: Drainage Network View (`/drainage`) — *CORE TECHNICAL DIFFERENTIATOR*
- **Purpose:** 1D hydraulic graph inspector visually linking underground drainage surcharges to surface flooding.
- **Key Modules:**
  - 1D Network Topology Graph (Manholes / Inlets & Pipes / Culverts / Canals).
  - Hydraulic State Filters: `Normal Flow`, `Capacity Exceeded`, `Surcharge`, `Backflow`.
  - Causal Pipeline Callout: *Underground Capacity Exceeded → Surcharge/Backflow → Surface Flooding*.
  - Node Detail Inspector Drawer & Edge Detail Inspector Drawer.

#### Screen 5: Flood Risk & Alert View (`/alerts`)
- **Purpose:** Consolidated emergency feed and warning broadcast portal.
- **Key Modules:**
  - Filterable Alert Feed (Severity: Critical, High, Moderate; Filter by Ward / Zone).
  - Alert Detail Card: Affected streets, estimated time window, depth range, recommended action.
  - Emergency Advisory Template Generator (Public SMS preview).

#### Screen 6: Safe Routing View (`/routing`)
- **Purpose:** Flood-aware route planning for emergency services and public transit.
- **Key Modules:**
  - Origin & Destination geocoding search input.
  - Dual Route Comparison Panel:
    - **Standard/Normal Route:** Shortest path (marked with flooded segments & max water depth).
    - **Flood-Aware Safe Route:** Bypasses flooded roads (>20 cm depth) via higher elevation corridors.
  - Route Elevation & Water Depth Profile chart.

---

## 6. NAVIGATION STRUCTURE

- **Top Navigation Bar (Global):**
  - System Identity: **GeoNexus | Urban Flood Nowcasting System**
  - City Selector Dropdown (`city_id` dynamic picker, default: `mumbai`)
  - Mode Indicator Badge:
    - When using mock data: `[ ⚠️ DEMO MODE — SAMPLE DATA ]` (Amber/Neutral)
    - When connected to live API: `[ ● LIVE SYSTEM ACTIVE ]` (Emerald)
  - Data Sync Timestamp: `Data Refreshed: T+00m`
  - Quick nav links: Home | GIS Dashboard | 0-3h Nowcast | Drainage Analysis | Alerts | Safe Routing

---

## 7. UI COMPONENT ARCHITECTURE

Components are organized into a clean, low-file-count hierarchy to avoid fragmentation:

```
src/
├── components/
│   ├── ui/                   # Shared UI primitives (Button, Card, Badge, Modal, Drawer, Slider)
│   ├── layout/               # Shell header, navigation bar, photo placeholder component
│   ├── gis/                  # MapContainer, LayerControl, TimeSlider, MapLegend, FeatureInspector
│   ├── hydraulic/            # NodeInspectorCard, EdgeInspectorCard, CausalPipelineBanner
│   ├── analytics/            # RainfallChart, DepthTimelineChart, ElevationProfile
│   └── routing/              # RoutePlannerPanel, RouteSummaryCard
```

---

## 8. GIS REQUIREMENTS

- **Mapping Engine:** MapLibre GL JS (WebGL vector tile rendering).
- **Coordinate Reference System:** WGS 84 (`EPSG:4326`).
- **Required Map Layers:**
  1. **Base Map:** Neutral Light Canvas (Carto Positron / OSM Light).
  2. **Doppler Radar Rainfall Layer:** Semi-transparent raster heatmap overlay showing mm/hr intensity.
  3. **Digital Elevation Model (DEM) Layer:** Terrain hillshade / elevation contour lines.
  4. **Street-Level Inundation Layer:** GeoJSON Polygon layer styled by water depth.
  5. **Drainage Network Nodes (Manholes):** Point layer styled by hydraulic state.
  6. **Drainage Network Edges (Pipes/Canals):** Line layer styled by capacity utilization with flow direction arrows.
  7. **Risk Hotspots:** Clustered points for critical intersections.
  8. **Navigation Routes:** Dual polyline overlays for standard vs. flood-safe routes.

---

## 9. FLOOD DEPTH VISUALIZATION SYSTEM

Water depth visualization uses a **strict semantic color scale** compliant with civil safety guidelines:

| Inundation Range | Classification | Hex Color Code | UI Palette Name | Human Meaning / Impact |
| :--- | :--- | :--- | :--- | :--- |
| **0 cm** | Dry / Safe | `#F8FAFC` / Transparent | Slate 50 | Normal street conditions |
| **>0 – 5 cm** | Very Low | `#DBEAFE` | Soft Sky Blue | Minor puddle / nuisance runoff |
| **5 – 20 cm** | Low / Moderate | `#93C5FD` | Medium Blue | Curb-level water; slow pedestrian traffic |
| **20 – 50 cm** | Moderate / High | `#FDBA74` | Warm Amber | Wheel-height water; light cars unsafe |
| **50 – 100 cm** | High / Severe | `#F87171` | Muted Red | Engine flooding; major traffic stoppage |
| **>100 cm** | Critical Inundation | `#991B1B` | Deep Crimson | Life-threatening flood; submerged vehicles |

*Visual Styling Note: Polygons use a opacity of 0.65 with solid 1px stroke borders to maintain map readability.*

---

## 10. DRAINAGE NETWORK VISUALIZATION REQUIREMENTS (CORE DIFFERENTIATOR)

Underground drainage analysis is a primary technical differentiator of GeoNexus. The UI must clearly illustrate the causal physical chain:

```
[ DRAINAGE NODE ] ──► [ PIPE FLOW ] ──► [ CAPACITY UTILIZATION ] ──► [ SURCHARGE / BACKFLOW ] ──► [ SURFACE FLOOD IMPACT ]
```

### Node Inspector (Manholes / Inlets)
When a drainage node is selected, the inspector drawer displays:
- **Node ID** (e.g., `MH-2091`)
- **Node Type** (`Manhole`, `Catch Basin`, `Outfall`, `Pumping Station`)
- **Current Flow Rate** ($m^3/s$)
- **Node Capacity** ($m^3/s$)
- **Capacity Utilization %** (e.g., `118.4%`)
- **Hydraulic Status** (`NORMAL`, `HIGH_LOAD`, `SURCHARGE`, `BACKFLOW`)
- **Surcharge State** (`No Surcharge` vs. `Active Overflow: 0.44 m³/s onto surface`)
- **Backflow State** (`Normal Forward Flow` vs. `Reverse Hydraulic Pressure Detected`)
- **Associated Surface Impact** (Directly linked street intersection and predicted surface flood depth in cm)

### Edge Inspector (Pipes / Culverts / Canals)
When a drainage pipe/edge is selected, the inspector drawer displays:
- **Pipe ID** (e.g., `P-4012`)
- **Start Node & End Node** (`MH-2091` $\rightarrow$ `MH-2092`)
- **Pipe Diameter / Dimensions** (e.g., `1200 mm circular RC pipe`)
- **Flow Direction** (`Forward`, `Reverse/Backflow`, `Stagnant`)
- **Current Flow Rate** ($m^3/s$)
- **Hydraulic Pipe Capacity** ($m^3/s$)
- **Capacity Utilization %** (e.g., `85.2%`)
- **Hydraulic Status** (`NORMAL`, `CAPACITY_EXCEEDED`, `BACKFLOW`)

---

## 11. SAFE ROUTING VISUALIZATION REQUIREMENTS

The routing interface provides side-by-side comparative visualization:

```
[ ORIGIN ] ──────────────────────────────────────────► [ DESTINATION ]

STANDARD ROUTE (Shortest Path)
⚠️ RISKY: Intersects Flooded Junction (Predicted Depth: 45 cm @ T+1h)
[========== RED DASHED POLYLINE ON MAP ==========]

FLOOD-AWARE SAFE ROUTE (Alternative Path)
✅ SAFE: Bypasses low-lying areas via elevated flyover (Max Depth: 4 cm)
[────────── SOLID GREEN POLYLINE ON MAP ──────────]
```

### Route Summary Metrics
- Total Distance (km) & Estimated Travel Time (mins).
- Maximum Water Depth along route path (cm).
- Highest Risk Hazard Index (Safe / Caution / Hazardous).
- Elevation & Depth Profile Chart along the route path.

---

## 12. DATA STATES & RESILIENCY

Every UI component handles 6 asynchronous lifecycle states:

1. **Loading State:** Skeleton shimmers for cards, spinner overlay on map tile updates.
2. **Success State:** Rendered map features, active stats, and timestamp.
3. **Empty State:** Clean fallback state (`"No active flood alerts for selected zone"`).
4. **Error State:** Human-readable notification (`"Unable to fetch updated nowcast grid. Showing cached state"`).
5. **Unavailable Data State:** Badge warning (`"Radar rainfall feed offline. Showing numerical fallback"`).
6. **Data Mode State Indicator:**
   - `[ ⚠️ DEMO MODE — SAMPLE DATA ]` when displaying mock fixtures.
   - `[ ● LIVE SYSTEM ACTIVE ]` when connected to live backend endpoints.

---

## 13. MOCK DATA STRATEGY

During frontend development prior to backend integration:
- All mock data resides in a centralized directory: `src/mock/`.
- Mock GeoJSON datasets strictly follow official GeoJSON specifications (`FeatureCollection`).
- Mock fixtures are organized by `city_id` (e.g., `mumbai_drainage_nodes.json`, `mumbai_flood_depth_t0.json`).
- Mock data is explicitly tagged with `is_demo_data: true`.
- A global service toggle in `src/services/apiClient.ts` swaps between local mock fixtures and live HTTP backend endpoints without modifying component code.

---

## 14. PROPOSED TECH STACK & DEPENDENCY DISCIPLINE

### Minimal Dependency Policy
Do **NOT** install libraries simply because they are listed. Build features using native React/TypeScript patterns first. Add external dependencies only when they provide clear technical value.

| Category | Reference Technology | Evaluation Rule |
| :--- | :--- | :--- |
| **Framework & Build** | **React 18 + Vite + TypeScript** | Core framework. Fast HMR, zero SSR overhead for WebGL maps. |
| **Styling** | **Tailwind CSS v3** | Utility-first styling. Eliminates duplicate CSS files. |
| **GIS Map Engine** | **MapLibre GL JS v4 (`react-map-gl`)** | Essential for WebGL GPU rendering of 10,000+ vector elements at 60fps. |
| **Charting** | **Recharts** | Evaluated for hyetograph/hydrograph curves. Use simple SVG components if charts are basic. |
| **State Management** | **Zustand** | Optional. Use standard React state/context first; add Zustand only if global map state becomes complex. |
| **Data Fetching** | **TanStack Query (React Query v5)** | Optional. Use standard `fetch` hooks initially; add React Query only if caching/polling demands it. |

---

## 15. PROPOSED FOLDER STRUCTURE (MINIMAL FILE COUNT)

```
urban-flood-nowcasting/
├── public/
│   └── assets/
├── src/
│   ├── assets/                # Icons & placeholders
│   ├── components/            # Reusable UI components (Grouped, low file count)
│   │   ├── ui/                # Base primitives (Button, Card, Badge, Modal, Drawer, Slider)
│   │   ├── layout/            # Header, Shell, PhotoPlaceholder
│   │   ├── gis/               # MapContainer, LayerControl, TimeSlider, MapLegend, FeatureInspector
│   │   ├── hydraulic/         # NodeInspectorCard, EdgeInspectorCard, CausalPipelineBanner
│   │   ├── analytics/         # RainfallChart, DepthTimelineChart, ElevationProfile
│   │   └── routing/           # RoutePlannerPanel, RouteSummaryCard
│   ├── features/              # Screen views (Home, Dashboard, Nowcast, Drainage, Alerts, Routing)
│   ├── mock/                  # Centralized GeoJSON mock fixtures (City-independent)
│   ├── services/              # API client & endpoint service mappers
│   ├── store/                 # Global state management
│   ├── types/                 # Shared TypeScript contracts & GeoJSON schemas
│   ├── utils/                 # Formatters, color mappers, geometry helpers
│   ├── App.tsx                # Main router & layout wrapper
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind base imports
├── FRONTEND_PLAN.md           # This document
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 16. PROPOSED BACKEND API CONTRACT

The backend API contract is city-independent via the `city_id` parameter:

### Endpoint 1: Get Cities List
- **`GET /api/v1/cities`**
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "city_id": "mumbai",
      "city_name": "Mumbai Metropolitan Region",
      "state": "Maharashtra",
      "center": [72.8777, 19.0760],
      "zoom": 12
    },
    {
      "city_id": "chennai",
      "city_name": "Chennai Metropolitan Area",
      "state": "Tamil Nadu",
      "center": [80.2707, 13.0827],
      "zoom": 12
    }
  ]
}
```

### Endpoint 2: Get Dashboard Summary & Status
- **`GET /api/v1/nowcast/summary?city_id=mumbai`**
- **Response `200 OK`:**
```json
{
  "status": "success",
  "is_demo_data": true,
  "data": {
    "city_id": "mumbai",
    "last_updated": "2026-09-09T17:30:00Z",
    "nowcast_window_hours": 3,
    "current_rainfall_mm_hr": 34.5,
    "max_predicted_water_depth_cm": 68.2,
    "critical_intersections_count": 4,
    "surcharged_manholes_count": 14,
    "model_status": "ACTIVE_RUNNING"
  }
}
```

### Endpoint 3: Get Inundation GeoJSON (Time-Stepped)
- **`GET /api/v1/flood/depth?city_id=mumbai&time_step=t1`**
- **Parameters:** `time_step`: `t0` (current), `t1` (+1h), `t2` (+2h), `t3` (+3h)
- **Response `200 OK`:**
```json
{
  "type": "FeatureCollection",
  "timestamp": "2026-09-09T18:30:00Z",
  "time_step": "t1",
  "is_demo_data": true,
  "features": [
    {
      "type": "Feature",
      "id": "flood_zone_104",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[72.841, 19.012], [72.845, 19.012], [72.845, 19.016], [72.841, 19.016], [72.841, 19.012]]]
      },
      "properties": {
        "location_name": "Sample Inundation Zone A",
        "predicted_depth_cm": 48.5,
        "risk_level": "MODERATE_HIGH",
        "confidence": 0.89
      }
    }
  ]
}
```

### Endpoint 4: Get Drainage Network Topology & Status
- **`GET /api/v1/drainage/network?city_id=mumbai`**
- **Response `200 OK`:**
```json
{
  "type": "FeatureCollection",
  "is_demo_data": true,
  "features": [
    {
      "type": "Feature",
      "id": "mh_2091",
      "geometry": { "type": "Point", "coordinates": [72.8425, 19.0135] },
      "properties": {
        "feature_type": "NODE",
        "node_id": "MH-2091",
        "node_type": "Manhole",
        "current_flow_m3_s": 2.85,
        "capacity_m3_s": 2.41,
        "capacity_utilization_pct": 118.2,
        "status": "SURCHARGE",
        "surcharge_state": "Overflowing 0.44 m³/s to surface",
        "backflow_state": "Normal Forward Flow",
        "surface_impact_depth_cm": 48.5
      }
    },
    {
      "type": "Feature",
      "id": "pipe_4012",
      "geometry": {
        "type": "LineString",
        "coordinates": [[72.8425, 19.0135], [72.8460, 19.0150]]
      },
      "properties": {
        "feature_type": "EDGE",
        "pipe_id": "P-4012",
        "start_node": "MH-2091",
        "end_node": "MH-2092",
        "diameter_mm": 1200,
        "current_flow_m3_s": 2.85,
        "capacity_m3_s": 2.41,
        "capacity_utilization_pct": 118.2,
        "flow_direction": "FORWARD",
        "status": "CAPACITY_EXCEEDED"
      }
    }
  ]
}
```

### Endpoint 5: Get Active Alerts
- **`GET /api/v1/alerts?city_id=mumbai`**
- **Response `200 OK`:**
```json
{
  "status": "success",
  "is_demo_data": true,
  "data": [
    {
      "alert_id": "ALT-2026-0891",
      "severity": "CRITICAL",
      "location": "Sample Low-Lying Underpass",
      "predicted_depth_cm": 75.0,
      "time_window": "18:00 - 20:30 IST",
      "recommended_action": "Close subway to vehicular traffic immediately. Deploy dewatering pump #4.",
      "issued_at": "2026-09-09T17:25:00Z"
    }
  ]
}
```

### Endpoint 6: Calculate Safe Flood-Aware Route
- **`POST /api/v1/routing/safe-path`**
- **Request Body:**
```json
{
  "city_id": "mumbai",
  "origin": { "lat": 19.0182, "lng": 72.8433 },
  "destination": { "lat": 19.0330, "lng": 72.8570 },
  "vehicle_type": "EMERGENCY_AMBULANCE",
  "max_allowable_depth_cm": 20.0
}
```

---

## 17. BACKEND INTEGRATION ASSUMPTIONS

1. **CORS Configuration:** Backend developer will enable `Access-Control-Allow-Origin: *` or allow `http://localhost:5173` during development.
2. **GeoJSON Standard:** Backend will return valid GeoJSON using `WGS84` (`[longitude, latitude]`) coordinate order.
3. **Timestamp Standard:** ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ssZ`).

---

## 18. VISUAL DESIGN SYSTEM

### Color Palette (Strictly Non-Neon)
- **Backgrounds:** Off-white / Clean slate (`#F8FAFC`, `#FFFFFF`).
- **Header & Sidebar:** Deep Navy Slate (`#0F172A`, `#1E293B`).
- **Primary Text:** Dark Charcoal (`#0F172A`, `#334155`).
- **Secondary Text:** Cool Gray (`#64748B`).
- **Brand / Action Accent:** Royal Blue (`#1D4ED8`, `#2563EB`).
- **Semantic Status Palette:** Safe (Emerald `#059669`), Caution (Amber `#D97706`), Danger (Red `#DC2626`), Critical (Deep Crimson `#991B1B`).

### Photographic Content Policy
- All real-world photos or field imagery are strictly represented by standard visual container placeholders:
  ```
  ┌────────────────────────────────────────────────────────┐
  │ [PHOTO PLACEHOLDER — URBAN FLOOD / CITY INFRASTRUCTURE] │
  │ Caption: Sample inundation event during peak rainfall   │
  └────────────────────────────────────────────────────────┘
  ```

---

## 19. RESPONSIVE DESIGN STRATEGY

- **Primary Target:** Desktop displays (Command & Control Centers: `1920x1080` & `1440x900`).
- **Secondary Target:** Field tablet displays (`1024x768` iPad / Android tablets for emergency crews).

---

## 20. ACCESSIBILITY CONSIDERATIONS

- **Color Contrast:** All UI text meets WCAG 2.1 AA minimum contrast (4.5:1).
- **Non-Color Dependent Indicators:** All flood risk zones combine color coding with textual badges (`CRITICAL`, `HIGH`, `MODERATE`).

---

## 21. PERFORMANCE CONSIDERATIONS

- **WebGL Canvas Rendering:** MapLibre GL JS handles heavy polygon rendering on the GPU.
- **Debounced Bounds Queries:** Map pan/zoom events debounce API refetch calls by 300ms.

---

## 22. SECURITY CONSIDERATIONS

- **Input Sanitization:** Geocoding search inputs sanitized to prevent XSS.
- **Environment Variables:** API Base URL managed via `.env` without exposing keys.

---

## 23. PHASE-BY-PHASE IMPLEMENTATION PLAN

```
PHASE 0: Requirements Analysis & UI Contract (REVISED - CURRENT DELIVERABLE)
   │
   ▼
PHASE 1: Frontend Foundation & Project Scaffolding
   ├── Setup Vite + React + TypeScript + Tailwind CSS
   ├── Configure MapLibre GL JS & Base Layout Shell
   └── Build Navigation Shell & DEMO MODE Badge Indicator
   │
   ▼
PHASE 2: Main GIS Dashboard & Map Overlays (PRIMARY SCREEN)
   ├── Implement MapLibre vector tile canvas & controls
   ├── Build Flood Depth Polygon overlay & Semantic Legend
   ├── Build DEM Elevation & Radar Rainfall layer toggles
   └── Build Feature Inspector Drawer (Click feature on map)
   │
   ▼
PHASE 3: Rainfall + 0–3 Hour Nowcast Engine UI
   ├── Build 15-minute step Time Slider (T+0 to T+3h)
   ├── Build Hyetograph/Hydrograph chart widgets
   └── Build Critical Intersections risk table
   │
   ▼
PHASE 4: Drainage Network Graph & Hydraulic Capacity View (CORE DIFFERENTIATOR)
   ├── Render 1D Graph overlay (Manholes point layer + Pipes line layer)
   ├── Implement capacity utilization color mapper & direction vectors
   └── Build Manhole Surcharge & Pipe Capacity inspector drawers showing causal chain
   │
   ▼
PHASE 5: Flood Risk & Alert Management Center
   ├── Build filterable alert feed (Critical / High / Moderate)
   ├── Build Ward-level risk severity breakdown
   └── Implement Emergency Public Advisory template generator
   │
   ▼
PHASE 6: Flood-Aware Safe Routing Module
   ├── Build Origin/Destination picker with geocoding
   ├── Implement Dual Route Polyline Renderer (Standard vs Safe)
   └── Build Route Elevation & Water Depth Profile chart
   │
   ▼
PHASE 7: Backend Integration & Mock Swap
   ├── Connect API services to backend endpoints
   ├── Validate error handling, loading spinners & polling sync
   └── Verify GeoJSON parsing & coordinate precision
   │
   ▼
PHASE 8: Final Polish, Optimization & Developer Handoff
   ├── Performance audit & WebGL frame rate optimization
   ├── Package frontend code & documentation for backend teammate
   └── Final UI review against SIH 2026 evaluation criteria
```

---

## 24. RISKS & UNCERTAINTIES

1. **GitHub Repository Status:** The repository `https://github.com/TheByteCrafter-cmd/Urban-Flood-Nowcasting-System-Drainage-and-Rainfall-Coupling` currently returns `404 Not Found` (private or uninitialized). The frontend API contract defined in Section 16 acts as the authoritative single source of truth for the backend developer.
2. **GeoJSON Payload Size:** Large complex flood polygons for a full metropolitan area could slow down network transfer. Backend should simplify geometry or serve vector tiles sliced by bounding box.

---

## 25. QUESTIONS & ASSUMPTIONS FOR HUMAN CONFIRMATION

1. **Primary City Focus:** Confirmed Mumbai (BMC) as default initial demo dataset, with dynamic `city_id` support for other metros.
2. **Tech Stack Selection:** Confirmed React 18 + Vite + TypeScript + Tailwind CSS + MapLibre GL JS, adhering strictly to minimal dependency discipline.
3. **Repository Setup:** Since the target GitHub repo returns 404, the project will be initialized locally under `urban-flood-nowcasting` when Phase 1 is authorized.

---

## PHASE 0 REVIEW CHECKLIST

- [x] **No AI/ML-first positioning** — System framed strictly as coupled hydrodynamic/physics modeling.
- [x] **City-independent architecture** — Dynamic `city_id` binding with Mumbai as default initial demo.
- [x] **Demo/mock data clearly separated from live data** — Mandatory `[DEMO MODE — SAMPLE DATA]` badge specified.
- [x] **Minimal dependency and file strategy** — Strict evaluation criteria to prevent library bloat and code fragmentation.
- [x] **Drainage analysis treated as a core technical differentiator** — Complete node/edge causal chain specified.
- [x] **Main GIS Dashboard identified as the primary screen** — Highest priority during Phase 2 implementation.
- [x] **No frontend implementation started** — Zero code, components, CSS, or mock files created during Phase 0.

---

WAITING FOR HUMAN APPROVAL BEFORE PHASE 1
