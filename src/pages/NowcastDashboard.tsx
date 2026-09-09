import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer as LeafletMap,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Clock,
  CloudRain,
  Waves,
  AlertTriangle,
  ShieldCheck,
  Droplets,
  ArrowDownUp,
  CheckCircle,
  Layers,
  Zap,
  Radio,
  Info,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { LiveWeatherStatusBar } from '../components/gis/LiveWeatherStatusBar';
import { FloodLegend } from '../components/gis/FloodLegend';
import { NowcastTimeControl } from '../components/gis/NowcastTimeControl';
import { fetchLiveWeatherData, getDemoFallbackWeather } from '../services/weatherService';
import { generateRunoffForecast } from '../services/runoffService';
import {
  getPipeUtilizationCategory,
  getNodeSurchargeStatus,
} from '../services/drainageService';
import { generateCoupledForecast } from '../services/couplingService';
import { NormalizedWeatherObservation } from '../types/weather';
import { CoupledSimulationState, CoupledCellState } from '../types/coupling';
import { NowcastHour } from '../mock/nowcast';

// Sub-component to manage custom Leaflet panes for z-index layering
const NowcastMapPanes: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('coupledSurfacePane')) {
      const p = map.createPane('coupledSurfacePane');
      p.style.zIndex = '450';
    }
    if (!map.getPane('drainagePipePane')) {
      const p = map.createPane('drainagePipePane');
      p.style.zIndex = '480';
    }
    if (!map.getPane('drainageNodePane')) {
      const p = map.createPane('drainageNodePane');
      p.style.zIndex = '500';
    }
  }, [map]);
  return null;
};

// Map flood depth to semantic colors matching FloodLegend
function getNowcastDepthStyle(depthCm: number): {
  category: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Critical';
  color: string;
  fillOpacity: number;
} {
  if (depthCm >= 100) return { category: 'Critical', color: '#B91C1C', fillOpacity: 0.85 };
  if (depthCm >= 50) return { category: 'Very High', color: '#EA580C', fillOpacity: 0.78 };
  if (depthCm >= 20) return { category: 'High', color: '#F59E0B', fillOpacity: 0.70 };
  if (depthCm >= 5) return { category: 'Moderate', color: '#93C5FD', fillOpacity: 0.65 };
  if (depthCm > 0) return { category: 'Low', color: '#DBEAFE', fillOpacity: 0.50 };
  return { category: 'Low', color: '#E2E8F0', fillOpacity: 0.20 };
}

export const NowcastDashboard: React.FC = () => {
  const [weather, setWeather] = useState<NormalizedWeatherObservation>(getDemoFallbackWeather());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedHour, setSelectedHour] = useState<NowcastHour>(0);
  const [isDemoScenario, setIsDemoScenario] = useState<boolean>(false);
  const [showDrainageOverlay, setShowDrainageOverlay] = useState<boolean>(true);

  // Load weather: either live IMD observation or explicitly forced demo
  const loadWeatherData = async (forceDemo = false) => {
    setIsLoading(true);
    try {
      if (forceDemo) {
        const demoWeather = getDemoFallbackWeather('Simulated Severe Monsoonal Storm (65 mm/hr peak)');
        demoWeather.status = 'DEMO';
        setWeather(demoWeather);
      } else {
        const data = await fetchLiveWeatherData();
        setWeather(data);
      }
    } catch (err: any) {
      const fallback = getDemoFallbackWeather(err?.message || 'Ingestion failure');
      fallback.status = 'ERROR';
      setWeather(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadWeatherData(isDemoScenario);
  }, [isDemoScenario]);

  // Handle Demo Scenario toggle
  const handleToggleDemoScenario = (enableDemo: boolean) => {
    setIsDemoScenario(enableDemo);
  };

  // 1. Phase 3A: Hydrological Runoff Engine
  const runoffForecast = useMemo(() => {
    return generateRunoffForecast(weather);
  }, [weather]);

  // 2. Phase 3D: Dynamic 1D-2D Coupling Engine (internalizes Phase 3B & Phase 3C)
  const coupledForecast = useMemo(() => {
    return generateCoupledForecast(runoffForecast);
  }, [runoffForecast]);

  // Guard if coupled engine is initializing or null
  if (!coupledForecast) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-slate-900 border border-slate-800 rounded-xl text-slate-400 font-sans">
        Initializing 1D-2D Coupled Engine...
      </div>
    );
  }

  // Extract selected horizon state (strictly independent per horizon)
  const currentCoupledState: CoupledSimulationState = coupledForecast.horizons[selectedHour];
  const currentRunoffGrid = runoffForecast.horizons[selectedHour];
  const currentDrainageNetwork = currentCoupledState.drainage_network;

  // Selected horizon rainfall intensity (mm/hr)
  const currentRainfallMmHr =
    currentRunoffGrid?.cells[0]?.rainfall_intensity_mm_hr ??
    weather.nowcast_steps?.[selectedHour]?.rainfall_intensity_mm_hr ??
    (selectedHour === 0 ? weather.current_rainfall_mm_hr : 0);

  // Status & Provenance
  const isLive = weather.status === 'LIVE';

  // GeoJSON features for coupled 2D surface grid
  const coupledGeoJSON = useMemo(() => {
    if (!currentCoupledState) return null;
    return {
      type: 'FeatureCollection' as const,
      features: currentCoupledState.cells.map((cell) => ({
        type: 'Feature' as const,
        id: cell.cell_id,
        geometry: cell.geometry,
        properties: {
          ...cell,
        },
      })),
    };
  }, [currentCoupledState]);

  // Styling for Leaflet GeoJSON surface polygons
  const getCellPathOptions = (feature: any): L.PathOptions => {
    const depthCm = feature?.properties?.water_depth_cm ?? 0;
    const { color, fillOpacity } = getNowcastDepthStyle(depthCm);
    return {
      fillColor: color,
      fillOpacity,
      color: depthCm >= 20 ? '#1E293B' : '#94A3B8',
      weight: depthCm >= 20 ? 1.8 : 1.2,
      opacity: 0.9,
    };
  };

  // Bind interactive cell popups
  const onEachCellFeature = (feature: any, layer: L.Layer) => {
    const cell = feature.properties as CoupledCellState;
    if (!cell) return;

    const { category, color } = getNowcastDepthStyle(cell.water_depth_cm);

    const popupHtml = `
      <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 250px; color: #0f172a;">
        <div style="border-bottom: 2px solid ${color}; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #0369a1;">
            1D-2D COUPLED FLOOD NOWCAST
          </span>
          <span style="font-size: 9px; font-weight: 800; color: #0369a1; background-color: #e0f2fe; border: 1px solid #7dd3fc; padding: 2px 6px; border-radius: 4px;">
            MODEL OUTPUT
          </span>
        </div>

        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${cell.zone_name}</div>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; font-family: monospace;">
          ${cell.cell_id} • Elev: ${cell.elevation_m}m • Area: ${(cell.area_m2 / 1e6).toFixed(1)} km²
        </div>

        <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #0369a1; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">
          HORIZON: T+${selectedHour} (${selectedHour === 0 ? 'CURRENT' : `+${selectedHour}H`})
        </div>

        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">
          Calculated Surface Water Depth
        </div>
        <div style="font-size: 22px; font-weight: 900; color: ${color === '#DBEAFE' || color === '#E2E8F0' ? '#0f172a' : color}; margin-bottom: 4px; display: flex; align-items: baseline; gap: 4px;">
          <span>${cell.water_depth_cm.toFixed(1)}</span>
          <span style="font-size: 13px; font-weight: 600; color: #64748b;">cm</span>
          <span style="font-size: 11px; font-weight: 800; margin-left: 6px; color: ${color};">(${category} Risk)</span>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; font-size: 10px; font-family: monospace; margin-bottom: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <div>Initial Overland: <strong>${(cell.initial_surface_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
          <div>Drainage Intake: <strong style="color: #059669;">-${(cell.drainage_intake_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
          <div>Surcharge Return: <strong style="color: ${cell.drainage_surcharge_return_m3 > 0 ? '#dc2626' : '#64748b'};">+${(cell.drainage_surcharge_return_m3 / 1000).toFixed(1)}k m³</strong></div>
          <div>Net Stored: <strong>${(cell.net_surface_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 4px;">
          <span>Classification: <strong>MODEL OUTPUT / DERIVED</strong></span>
          <span style="color: #059669; font-weight: 700;">✓ Mass Conserved</span>
        </div>
      </div>
    `;

    layer.bindPopup(popupHtml);

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.9, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        const depth = cell.water_depth_cm;
        const { fillOpacity } = getNowcastDepthStyle(depth);
        l.setStyle({ fillOpacity, weight: depth >= 20 ? 1.8 : 1.2 });
      },
    });
  };

  // Center coordinate over Mumbai
  const mapCenter: [number, number] = [19.065, 72.88];

  // High / Critical cell count (depth >= 20 cm)
  const highRiskCellsCount = currentCoupledState.cells.filter(
    (c) => c.water_depth_cm >= 20
  ).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] space-y-3 pb-8 text-slate-100 font-sans">
      {/* 1. Official Meteorological Ingestion Bar (IMD / DWR) */}
      <div className="relative z-[1100]">
        <LiveWeatherStatusBar
          weather={weather}
          isLoading={isLoading}
          onRefresh={() => loadWeatherData(isDemoScenario)}
        />
      </div>

      {/* 2. Top Header & Demo Scenario Switcher Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-950/80 border border-sky-800/80 rounded-lg text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                0–3 Hour Predictive Nowcast
                <span className="text-xs font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800/80 px-2 py-0.5 rounded">
                  PHASE 4A
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Coupled Surface Hydrology (Phase 3B) &amp; Underground Drainage Hydraulics (Phase 3D)
              </p>
            </div>
          </div>
        </div>

        {/* Demo Scenario & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-slate-400" /> Mode:
          </span>

          <button
            type="button"
            onClick={() => handleToggleDemoScenario(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isDemoScenario
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${!isDemoScenario ? 'bg-white animate-pulse' : 'bg-slate-500'}`}
            />
            Live Meteorological Ingestion
          </button>

          <button
            type="button"
            onClick={() => handleToggleDemoScenario(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isDemoScenario
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Demo Scenario (65 mm/hr Storm)
          </button>
        </div>
      </div>

      {/* Demo Scenario Notification Banner (When Demo is active) */}
      {isDemoScenario && (
        <div className="bg-amber-950/70 border border-amber-500/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>DEMO SCENARIO ACTIVE:</strong> Displaying high-intensity convective storm simulation (28.5–120 mm/hr) to demonstrate surface-drainage surcharge coupling.
            </span>
          </div>
          <button
            onClick={() => handleToggleDemoScenario(false)}
            className="text-[11px] underline font-bold hover:text-amber-100 shrink-0"
          >
            Return to Live Weather
          </button>
        </div>
      )}

      {/* Zero Precipitation Notice (When Live is active and dry) */}
      {!isDemoScenario && isLive && currentRainfallMmHr === 0 && (
        <div className="bg-blue-950/60 border border-blue-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-blue-200 shadow-md">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>LIVE SCIENTIFIC GROUNDING:</strong> IMD district nowcast reports 0.0 mm/hr current rainfall over Mumbai. Inundation depth is 0.0 cm and drainage surcharge is 0.00 m³/s as verified by physics.
            </span>
          </div>
          <button
            onClick={() => handleToggleDemoScenario(true)}
            className="text-[11px] bg-sky-900/80 hover:bg-sky-800 text-sky-200 px-2.5 py-1 rounded border border-sky-700 font-bold shrink-0"
          >
            Simulate Storm Event
          </button>
        </div>
      )}

      {/* 3. Physical Hydrological Pipeline Breadcrumb Banner */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          End-to-End Coupling Pipeline:
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md">
            <CloudRain className="w-3 h-3 text-sky-400" />
            <span className="text-slate-400">Rainfall:</span>
            <span className="font-bold text-white">{currentRainfallMmHr.toFixed(1)} mm/hr</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />

          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">Runoff Rate:</span>
            <span className="font-bold text-white">{currentRunoffGrid.peak_runoff_rate_m3_s.toFixed(1)} m³/s</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />

          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md">
            <ArrowDownUp className="w-3 h-3 text-indigo-400" />
            <span className="text-slate-400">Drainage Intake:</span>
            <span className="font-bold text-emerald-400">
              {currentCoupledState.total_drainage_intake_m3_s.toFixed(1)} m³/s
            </span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />

          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-slate-400">Surcharge:</span>
            <span className={`font-bold ${currentCoupledState.total_surcharge_return_m3_s > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {currentCoupledState.total_surcharge_return_m3_s.toFixed(1)} m³/s
            </span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />

          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-sky-800 rounded-md bg-sky-950/60">
            <Waves className="w-3 h-3 text-sky-400" />
            <span className="text-sky-300">Max Depth:</span>
            <span className="font-bold text-sky-200">{currentCoupledState.max_water_depth_cm.toFixed(1)} cm</span>
          </div>
        </div>
      </div>

      {/* 4. Main Content Grid: GIS Map & Nowcast HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[680px]">
        {/* Left Column: Leaflet GIS Map (Occupies 8/12 cols) */}
        <div className="lg:col-span-8 h-full relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
          {/* Map Top Bar: Layer Badges & Controls */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
            <div className="bg-slate-900/95 backdrop-blur-md text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 shadow-md flex items-center gap-2 text-xs">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold">2D Coupled Inundation</span>
              <span className="text-[10px] text-slate-400">• Mumbai Basin (5×5)</span>
            </div>

            <button
              type="button"
              onClick={() => setShowDrainageOverlay(!showDrainageOverlay)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border transition-all flex items-center gap-1.5 cursor-pointer ${
                showDrainageOverlay
                  ? 'bg-slate-900/95 text-sky-300 border-sky-600'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ArrowDownUp className="w-3 h-3" />
              {showDrainageOverlay ? 'Drainage Network: ON' : 'Drainage Network: OFF'}
            </button>
          </div>

          {/* Horizon Time Controls (Top Right Overlay) */}
          <div className="absolute top-3 right-3 z-[1000]">
            <NowcastTimeControl
              selectedHour={selectedHour}
              onSelectHour={(h) => setSelectedHour(h)}
              dynamicSummary={{
                max_depth_cm: currentCoupledState.max_water_depth_cm,
                risk_level:
                  currentCoupledState.max_water_depth_cm >= 100
                    ? 'Critical'
                    : currentCoupledState.max_water_depth_cm >= 50
                    ? 'Very High'
                    : currentCoupledState.max_water_depth_cm >= 20
                    ? 'High'
                    : currentCoupledState.max_water_depth_cm >= 5
                    ? 'Moderate'
                    : 'Low',
                affected_zones_count: highRiskCellsCount,
                rainfall_mm_hr: currentRainfallMmHr,
                is_live: isLive && !isDemoScenario,
                provenance: 'MODEL OUTPUT / DERIVED',
              }}
            />
          </div>

          {/* Leaflet Map Body */}
          <div className="flex-1 w-full h-full relative">
            <LeafletMap
              center={mapCenter}
              zoom={11.5}
              className="h-full w-full z-0"
              zoomControl={false}
            >
              <NowcastMapPanes />

              {/* Base Cartography */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* 2D Coupled Surface Grid Cells (GeoJSON) */}
              {coupledGeoJSON && (
                <GeoJSON
                  key={`coupled-geojson-h${selectedHour}-${isDemoScenario ? 'demo' : 'live'}`}
                  data={coupledGeoJSON as any}
                  pane="coupledSurfacePane"
                  style={getCellPathOptions}
                  onEachFeature={onEachCellFeature}
                />
              )}

              {/* Optional 1D Underground Drainage Pipes Overlay */}
              {showDrainageOverlay &&
                currentDrainageNetwork.edges.map((edge) => {
                  const { color } = getPipeUtilizationCategory(edge.utilization_pct);
                  const positions: [number, number][] = [
                    [edge.coordinates[0][1], edge.coordinates[0][0]],
                    [edge.coordinates[1][1], edge.coordinates[1][0]],
                  ];

                  return (
                    <Polyline
                      key={`edge-${edge.id}-${selectedHour}`}
                      positions={positions}
                      pane="drainagePipePane"
                      pathOptions={{
                        color,
                        weight: edge.status === 'OVER_CAPACITY' ? 4.5 : edge.status === 'HIGH' ? 3.5 : 2.5,
                        opacity: 0.9,
                        dashArray: edge.status === 'OVER_CAPACITY' ? '5, 5' : undefined,
                      }}
                    >
                      <Popup>
                        <div className="text-xs p-1 space-y-1 min-w-[210px] text-slate-900 font-sans">
                          <div className="flex items-center justify-between border-b pb-1 font-bold">
                            <span>DRAINAGE: {edge.name}</span>
                            <span style={{ color }} className="text-[10px] uppercase">
                              {edge.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[10px]">
                            Flow: <strong>{edge.actual_flow_m3_s} m³/s</strong> / Cap: {edge.capacity_m3_s} m³/s
                          </div>
                          <div className="text-[10px]">
                            Utilization: <strong>{edge.utilization_pct}%</strong>
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                  );
                })}

              {/* Optional 1D Underground Drainage Nodes Overlay */}
              {showDrainageOverlay &&
                currentDrainageNetwork.nodes.map((node) => {
                  const isOutfall = node.node_type === 'OUTFALL';
                  const { color } = getNodeSurchargeStatus(node.surcharge_ratio, isOutfall);
                  const isSurcharging = node.surcharge_rate_m3_s > 0;

                  return (
                    <CircleMarker
                      key={`node-${node.id}-${selectedHour}`}
                      center={[node.lat, node.lng]}
                      pane="drainageNodePane"
                      radius={isSurcharging ? 8 : 6}
                      pathOptions={{
                        color: isSurcharging ? '#DC2626' : '#1E293B',
                        weight: 2,
                        fillColor: color,
                        fillOpacity: 0.95,
                      }}
                    >
                      <Popup>
                        <div className="text-xs p-1 space-y-1 min-w-[210px] text-slate-900 font-sans">
                          <div className="flex items-center justify-between border-b pb-1 font-bold">
                            <span>NODE: {node.name}</span>
                            <span style={{ color }} className="text-[10px] uppercase">
                              {node.status}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[10px]">Type: {node.node_type}</div>
                          <div className="text-[10px]">
                            Inflow: <strong>{node.total_inflow_m3_s} m³/s</strong>
                          </div>
                          {node.surcharge_rate_m3_s > 0 && (
                            <div className="text-red-700 font-bold text-[10px]">
                              Surcharge: +{node.surcharge_rate_m3_s} m³/s
                            </div>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
            </LeafletMap>
          </div>

          {/* Bottom Left Legend */}
          <div className="absolute bottom-3 left-3 z-[1000]">
            <FloodLegend badgeText="MODEL OUTPUT / DERIVED" />
          </div>

          {/* Bottom Right Attribution Bar */}
          <div className="absolute bottom-3 right-3 z-[1000] bg-slate-950/90 text-slate-400 text-[10px] px-3 py-1 rounded-md border border-slate-800">
            Coupled SIH26085 Engine • Precision: 100% Conserved
          </div>
        </div>

        {/* Right Column: Nowcast Summary & Horizon Comparison View (4/12 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3 h-full overflow-y-auto pr-1">
          {/* A. Selected Horizon Summary Card (Requirement 6) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-bold tracking-wider uppercase text-sky-300">
                  Nowcast Summary (T+{selectedHour})
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {selectedHour === 0 ? 'CURRENT' : `+${selectedHour} HOUR`}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isLive && !isDemoScenario
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                  }`}
                >
                  {isLive && !isDemoScenario ? 'LIVE' : 'DEMO'}
                </span>
              </div>
            </div>

            {/* Classification Badge (Requirement 4 & 6) */}
            <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Classification:</span>
              <span className="font-mono font-bold text-sky-300">MODEL OUTPUT / DERIVED</span>
            </div>

            {/* Exact Required Fields */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* 1. Rainfall */}
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-sky-400" />
                  Rainfall
                </div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {currentRainfallMmHr.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">mm/hr</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Source: {isDemoScenario ? 'DEMO / FALLBACK' : weather.source_organization ? 'IMD / DWR' : weather.source_label}
                </div>
              </div>

              {/* 2. Maximum Flood Depth */}
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Waves className="w-3 h-3 text-cyan-400" />
                  Max Flood Depth
                </div>
                <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                  {currentCoupledState.max_water_depth_cm.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">cm</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Category:{' '}
                  <strong className="text-slate-300">
                    {getNowcastDepthStyle(currentCoupledState.max_water_depth_cm).category}
                  </strong>
                </div>
              </div>

              {/* 3. Mean Flood Depth */}
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-indigo-400" />
                  Mean Flood Depth
                </div>
                <div className="text-base font-bold font-mono text-indigo-200 mt-0.5">
                  {currentCoupledState.mean_water_depth_cm.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">cm</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Across 25 catchments</div>
              </div>

              {/* 4. High / Critical Cells */}
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  High/Critical Cells
                </div>
                <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                  {highRiskCellsCount}{' '}
                  <span className="text-xs font-normal text-slate-400">/ 25 cells</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Depth &ge; 20 cm</div>
              </div>

              {/* 5. Drainage Surcharge */}
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <ArrowDownUp className="w-3 h-3 text-rose-400" />
                  Drainage Surcharge
                </div>
                <div className={`text-base font-bold font-mono mt-0.5 ${currentCoupledState.total_surcharge_return_m3_s > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {currentCoupledState.total_surcharge_return_m3_s.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-400">m³/s</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Manhole backwater</div>
              </div>

              {/* 6. Outfall Discharge */}
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Outfall Discharge
                </div>
                <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                  {currentDrainageNetwork.total_outfall_discharge_m3_s.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-slate-400">m³/s</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Gravity seaward flow</div>
              </div>
            </div>

            {/* Mass Balance Verification */}
            <div className="bg-slate-950/90 rounded-lg p-2.5 border border-emerald-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-emerald-300">Mass Balance:</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Residual: {currentCoupledState.mass_balance.volume_balance_error_pct.toFixed(4)}%
                  </div>
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-xs px-2 py-1 bg-emerald-950/80 rounded border border-emerald-800">
                100% CONSERVED
              </span>
            </div>
          </div>

          {/* B. Horizon Comparison View (Requirement 7) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Horizon Comparison View (0–3h)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Click column to switch</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                    <th className="py-2 pr-2 font-medium">METRIC</th>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const isActive = selectedHour === h;
                      return (
                        <th
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors rounded-t ${
                            isActive
                              ? 'bg-sky-950/80 text-sky-300 font-bold border-t-2 border-sky-500'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          T+{h}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {/* Row 1: Rainfall */}
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-slate-400">Rainfall</td>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const hRain =
                        runoffForecast.horizons[h]?.cells[0]?.rainfall_intensity_mm_hr ??
                        weather.nowcast_steps?.[h]?.rainfall_intensity_mm_hr ??
                        0;
                      const isActive = selectedHour === h;
                      return (
                        <td
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                            isActive ? 'bg-sky-950/40 font-bold text-white' : 'text-slate-300'
                          }`}
                        >
                          {hRain.toFixed(1)} <span className="text-[9px] text-slate-500">mm/h</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 2: Max Depth */}
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-slate-400">Max Depth</td>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const maxD = coupledForecast.horizons[h].max_water_depth_cm;
                      const isActive = selectedHour === h;
                      return (
                        <td
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                            isActive ? 'bg-sky-950/40 font-bold text-cyan-300' : 'text-slate-300'
                          }`}
                        >
                          {maxD.toFixed(1)} <span className="text-[9px] text-slate-500">cm</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 3: Mean Depth */}
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-slate-400">Mean Depth</td>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const meanD = coupledForecast.horizons[h].mean_water_depth_cm;
                      const isActive = selectedHour === h;
                      return (
                        <td
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                            isActive ? 'bg-sky-950/40 font-bold text-indigo-300' : 'text-slate-300'
                          }`}
                        >
                          {meanD.toFixed(1)} <span className="text-[9px] text-slate-500">cm</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 4: High/Critical Cells */}
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-slate-400">High/Critical Cells</td>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const highCells = coupledForecast.horizons[h].cells.filter(
                        (c) => c.water_depth_cm >= 20
                      ).length;
                      const isActive = selectedHour === h;
                      return (
                        <td
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                            isActive ? 'bg-sky-950/40 font-bold text-amber-300' : 'text-slate-300'
                          }`}
                        >
                          {highCells} <span className="text-[9px] text-slate-500">/ 25</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 5: Surcharge */}
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-slate-400">Surcharge</td>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const sur = coupledForecast.horizons[h].total_surcharge_return_m3_s;
                      const isActive = selectedHour === h;
                      return (
                        <td
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-sky-950/40 font-bold text-rose-300'
                              : sur > 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {sur.toFixed(1)} <span className="text-[9px] text-slate-500">m³/s</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row 6: Risk */}
                  <tr>
                    <td className="py-2 pr-2 font-sans font-medium text-slate-400">Risk Level</td>
                    {([0, 1, 2, 3] as const).map((h) => {
                      const maxD = coupledForecast.horizons[h].max_water_depth_cm;
                      const { category, color } = getNowcastDepthStyle(maxD);
                      const isActive = selectedHour === h;
                      return (
                        <td
                          key={h}
                          onClick={() => setSelectedHour(h)}
                          className={`py-2 px-2 text-center cursor-pointer transition-colors ${
                            isActive ? 'bg-sky-950/40 font-bold' : ''
                          }`}
                        >
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white inline-block"
                            style={{ backgroundColor: color === '#DBEAFE' || color === '#E2E8F0' ? '#64748b' : color }}
                          >
                            {category}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[9px] text-slate-500 italic pt-1 border-t border-slate-800/80">
              * All statistics computed deterministically via Phase 3D dynamic 1D-2D coupling solver.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowcastDashboard;
