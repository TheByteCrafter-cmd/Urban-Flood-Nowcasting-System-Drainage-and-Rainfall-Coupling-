# GeoNexus — Urban Flood Nowcasting System (Drainage and Rainfall Coupling)

**Smart India Hackathon (SIH 2026)**  
**Problem Statement ID:** SIH26085  
**Domain:** Disaster Management / Urban Hydrology  
**Team:** GeoNexus  
**Status:** Phase 5 Architecture Freeze • Verified SIH Prototype  

---

## 1. Executive Summary & Problem Context

Rapid urbanisation, altered land use, and high-intensity, short-duration convective precipitation events frequently overwhelm municipal drainage infrastructure across Indian metropolitan areas. Traditional flood models either:
1. Treat flood modeling purely as static bathtub depressions without hydrodynamic flow routing, or
2. Model underground pipe hydraulics in isolation from overland street runoff without bidirectional dynamic coupling.

**GeoNexus** is a physics-grounded, high-resolution urban flood nowcasting system with a **0–3 hour lead time**. It dynamically couples high-resolution rainfall nowcasts, 2D kinematic overland surface flow, and 1D underground stormwater drainage network hydraulics. The system delivers predictive flood depths, surcharge alerts, and flood-resilient emergency routing.

---

## 2. System Architecture & Phased Implementation

The system is constructed as a modular, deterministic pipeline across distinct computational layers:

```
+-----------------------------------------------------------------------------------+
|                              LIVE WEATHER / RADAR                                 |
|            Open-Meteo Live API (0 mm/hr baseline) / Demo Surge (65 mm/hr)          |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        PHASE 3A: RUNOFF GENERATION SERVICE                        |
|        Rational Method (Q = C*I*A / 360) with Soil & Land-Cover Infiltration      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     PHASE 3B: 2D OVERLAND SURFACE FLOW ENGINE                     |
|           D8 Kinematic Routing on DEM Elevation Grid + CFL Stability Check        |
+--------------------+------------------------------------+-------------------------+
                     |                                    ^
        Surface Inflow (Inlets)             Surcharge Return Water
                     v                                    |
+--------------------+------------------------------------+-------------------------+
|                  PHASE 3C: 1D DRAINAGE NETWORK HYDRAULICS ENGINE                  |
|     Manning's Equation for Circular Pipes & Box Culverts + Outflow Routing       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                    PHASE 3D: DYNAMIC 2D-1D COUPLING SOLVER                        |
|       Orifice/Weir Intake Capture + Pipe Surcharge + Deposition Redistribution    |
+--------------------+------------------------------------+-------------------------+
                     |                                    |
                     v                                    v
+-------------------------------------+  +------------------------------------------+
|      PHASE 4B: RISK & ALERTS        |  |        PHASE 4C: FLOOD-SAFE ROUTING      |
|  Depth, Velocity & Critical Assets  |  |   A* Pathfinding on Road Network with    |
|   4-Tier Alerting (Low -> Extreme)  |  |   Hydraulic Penalty (Pedestrian/Vehicle) |
+--------------------+----------------+  +--------------------+---------------------+
                     \                                    /
                      \                                  /
                       v                                v
+-----------------------------------------------------------------------------------+
|                      PHASE 4A & 5: PRESENTATION & UI POLISH                       |
|        Interactive Leaflet GIS, 0-3h Horizon Slider, System Status Engine         |
+-----------------------------------------------------------------------------------+
```

### Module Breakdown
- **Phase 3A (`runoffService.ts`)**: Converts precipitation intensity into surface runoff volume per sub-catchment using weighted Rational runoff coefficients ($C$).
- **Phase 3B (`surfaceFlowService.ts`)**: Solves 2D overland flow using a DEM-derived D8 steepest descent matrix, enforcing volume conservation and sink handling.
- **Phase 3C (`drainageService.ts`)**: 1D directed acyclic graph (DAG) hydraulic model calculating pipe capacity, friction slope, and surcharge thresholds.
- **Phase 3D (`couplingService.ts`)**: Solves bidirectional mass exchange at inlet junctions without double-counting runoff or surcharge return volume.
- **Phase 4A (`nowcastService.ts` / `NowcastDashboard.tsx`)**: Synchronizes a 0–3 hour predictive timeline (T+0, T+1, T+2, T+3) with synchronized playback.
- **Phase 4B (`riskService.ts` / `AlertsPanel.tsx`)**: Evaluates multi-criteria risk (Depth + Velocity + Network Failure + Critical Asset Proximity).
- **Phase 4C (`routingService.ts` / `RoutingDashboard.tsx`)**: Computes optimal detour paths for emergency responders, transit, and pedestrians via flood-weighted $A^*$.
- **Phase 5 (`SystemStatusPanel.tsx` / Integration)**: Unified diagnostic dashboard, telemetry checks, provenance badges, and system verification.

---

## 3. Mathematical Formulations

### 3.1 Runoff Generation (Rational Method)
Runoff discharge $Q$ ($\text{m}^3/\text{s}$) is computed per catchment zone:
$$Q = \frac{C \cdot I \cdot A}{360}$$
Where:
- $C$: Composite runoff coefficient based on land use ($C_{impervious} = 0.85$, $C_{residential} = 0.65$, $C_{park} = 0.25$).
- $I$: Rainfall intensity ($\text{mm/hr}$).
- $A$: Catchment area ($\text{ha}$).

### 3.2 2D Overland Surface Flow (D8 Kinematic Routing)
Flow direction from grid cell $(i, j)$ to neighbor $(i', j')$ is assigned along the maximum downward topographic gradient:
$$S_{i, j \to i', j'} = \frac{z_{i, j} - z_{i', j'}}{d}$$
Where $z$ is elevation ($\text{m}$) and $d$ is spatial step distance ($\text{m}$). Timestep $\Delta t$ satisfies the Courant-Friedrichs-Lewy (CFL) numerical stability condition:
$$\Delta t \le \frac{\Delta x}{v_{max}}$$

### 3.3 1D Pipe & Canal Hydraulics (Manning's Equation)
Full-flow pipe conveyance capacity $Q_{cap}$ ($\text{m}^3/\text{s}$):
$$Q_{cap} = \frac{1}{n} A R_h^{2/3} S_0^{1/2}$$
Where:
- $n$: Manning's roughness coefficient ($n = 0.013$ for concrete pipe, $n = 0.025$ for masonry canal).
- $S_0$: Invert bed slope $\frac{z_{inv, in} - z_{inv, out}}{L}$.
- **Circular Conduit ($D$):** $A = \frac{\pi D^2}{4}$, $R_h = \frac{D}{4}$.
- **Rectangular Box Culvert ($W \times H$):** $A = W \cdot H$, $R_h = \frac{W \cdot H}{W + 2H}$.

### 3.4 2D-1D Coupling & Surcharge Return
Surface intake capacity at grate inlet $k$:
$$Q_{inlet, k} = \min\left( Q_{surface, k},\; C_d A_g \sqrt{2 g h_{surface}} \right)$$
When upstream flow exceeds conduit discharge capacity, node surcharge is returned to the 2D surface:
$$Q_{surcharge} = \max\left(0,\; Q_{in, node} - Q_{cap, outgoing}\right)$$
$$\Delta h_{surface} = \frac{Q_{surcharge} \cdot \Delta t}{A_{cell}}$$

### 3.5 Flood Risk Index (Multi-Criteria)
Composite risk score $R \in [0, 100]$:
$$R = 0.45 D_{norm} + 0.25 V_{norm} + 0.20 S_{norm} + 0.10 C_{norm}$$
- $D_{norm}$: Normalized flood depth ($d / 1.0\text{ m}$).
- $V_{norm}$: Overland flow velocity ($v / 2.0\text{ m/s}$).
- $S_{norm}$: Drainage network surcharge ratio ($Q_{in} / Q_{cap}$).
- $C_{norm}$: Critical infrastructure proximity weight (Hospitals, Substations, Metro).

### 3.6 Flood-Safe Routing ($A^*$ Path Cost)
Road segment traversal cost $C_{edge}$:
$$C_{edge} = \text{Length} \times \left(1 + \alpha \left(\frac{h_{flood}}{h_{critical}}\right)^\beta\right)$$
Where $\alpha = 100.0$, $\beta = 2.0$, and $h_{critical}$ is mode-dependent:
- **Pedestrian:** $h_{critical} = 0.15\text{ m}$ ($15\text{ cm}$)
- **Standard Commuter Vehicle:** $h_{critical} = 0.30\text{ m}$ ($30\text{ cm}$)
- **Emergency Rescue Vehicle:** $h_{critical} = 0.60\text{ m}$ ($60\text{ cm}$)

Road segments with $h_{flood} \ge h_{critical}$ are hard-blocked for standard traffic, triggering emergency bypasses.

---

## 4. Rigorous Provenance Model

To guarantee academic and operational honesty, the system labels every telemetry stream and visualization layer:

| Provenance Label | Scope / Data Elements | Operational Meaning |
|---|---|---|
| `LIVE` | Open-Meteo REST API (Latitude: 13.0827, Longitude: 80.2707) | Real-time weather observation and short-term rainfall nowcast. |
| `MODEL OUTPUT / DERIVED` | Runoff volume, 2D depth grids, pipe discharge, risk index, detour routes | Deterministic physics simulation computed dynamically in-memory. |
| `ASSUMED PROTOTYPE` | 10m DEM elevation grid, pipe diameters, invert levels, road graph | Synthetic high-fidelity GIS topology calibrated for Chennai prototype basin. |
| `DEMO SCENARIO` | 65 mm/hr convective cloudburst surge | Preconfigured extreme scenario for stress testing hydraulic surcharge. |

> **Disclaimer:** This software is an engineering proof-of-concept for SIH 2026. The drainage network, DEM topology, and road graph represent synthetic calibration assets and must be connected to municipal GIS geodatabases before deployment in active flood management rooms.

---

## 5. Technology Stack

- **Frontend Core:** React 18, TypeScript, Vite
- **Mapping & GIS Visualization:** Leaflet, React-Leaflet, GeoJSON
- **Styling & UI:** Tailwind CSS, Lucide React icons
- **Physics Solvers:** In-browser TypeScript numerical routines (0 client latency, offline-capable)
- **Testing & Verification:** tsx runner, Playwright browser automation
- **External Data:** Open-Meteo Weather API

---

## 6. Quick Start & Execution

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/geonexus-sih/urban-flood-nowcast.git
cd "D:\SIH 2026 PROTOTYPE"

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 7. Verification & Automated Test Suites

The prototype includes an automated test harness covering all mathematical equations, mass balance conservation, zero-weather grounding, and routing logic:

```bash
# 1. Phase 3A: Runoff Generation Service
npx tsx scripts/verify_runoff_engine.ts

# 2. Phase 3B: 2D Surface Flow Engine
npx tsx scripts/verify_surface_flow.ts

# 3. Phase 3C: 1D Drainage Hydraulics Engine
npx tsx scripts/verify_drainage_network.ts

# 4. Phase 3D: Dynamic 2D-1D Coupling Solver
npx tsx scripts/verify_coupled_engine.ts

# 5. Phase 4A: 0-3 Hour Nowcast Integration
npx tsx scripts/verify_nowcast_integration.ts

# 6. Phase 4B: Flood Risk & Infrastructure Alerts
npx tsx scripts/verify_risk_engine.ts

# 7. Phase 4C: Flood-Safe Routing Engine
npx tsx scripts/verify_routing_engine.ts

# 8. Phase 5: Complete End-to-End Integration Suite (19 Checks)
npx tsx scripts/verify_phase5_integration.ts

# 9. Phase 5: Playwright UI Smoke Test (Headless Browser)
node scripts/verify_ui_phase5.cjs
```

**Test Suite Coverage Summary:** 109 / 109 Tests Passing (100% pass rate).

---

## 8. Verification Results & Zero-Rainfall Grounding

1. **Zero-Rainfall Invariant:** Under live zero rainfall ($0.0\text{ mm/hr}$), the system guarantees:
   - Runoff = $0.000\text{ m}^3$
   - Max Surface Flood Depth = $0.00\text{ cm}$
   - Active Critical Alerts = $0$
   - Drainage Surcharges = $0$
   - Routing Road Speeds = $100\%$ free-flow baseline
2. **Stress-Test Surge Invariant:** Under 65 mm/hr monsoon surge:
   - Runoff rises to $> 22,000\text{ m}^3$
   - Surcharge overflows triggered at bottleneck nodes (ND-03, ND-05)
   - Dynamic rerouting successfully detours traffic around inundated arterial corridors
3. **Mass Conservation:** Coupling mass balance error $< 0.001\%$ across all simulation steps.

---

## 9. Limitations & Scaling Roadmap

- **Prototype Domain:** The prototype is calibrated on a $1.2\text{ km} \times 1.0\text{ km}$ urban basin (Central Chennai / Buckingham Canal vicinity) with 20 nodes, 22 pipe segments, and 5 catchment zones.
- **Backwater Effects:** 1D pipe hydraulics uses kinematic/Manning routing; tidal backwater or pump station head-loss can be added via full Saint-Venant equations in municipal integration.
- **Live Municipal SCADA:** Ready to ingest real-time ultrasonic water level sensors via standard REST/MQTT endpoints.

---

**Developed for Smart India Hackathon 2026 by Team GeoNexus.**
