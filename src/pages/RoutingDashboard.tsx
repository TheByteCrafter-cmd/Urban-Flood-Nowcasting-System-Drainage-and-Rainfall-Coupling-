import React, { useState, useEffect, useMemo } from 'react';
import {
  MapContainer as LeafletMap,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Clock,
  MapPin,
  RotateCcw,
  Compass,
  Info,
  ShieldAlert,
  Layers,
  Car,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PROTOTYPE_ROAD_GRAPH, PROTOTYPE_ROAD_NODES } from '../mock/roadNetwork';
import { findRoute, getEdgeFloodStatus } from '../services/routingService';
import { generateRiskForecast } from '../services/riskService';
import { generateCoupledForecast } from '../services/couplingService';
import { generateRunoffForecast } from '../services/runoffService';
import { fetchLiveWeatherData, getDemoFallbackWeather } from '../services/weatherService';
import { NormalizedWeatherObservation } from '../types/weather';
import { RiskForecast, RISK_COLORS } from '../types/risk';
import { RoutingMode, RoutePairResult } from '../types/routing';
import { DemoBadge } from '../components/ui/DemoBadge';

// Map pane setup for layered rendering
const RoutingMapPanes: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('roadNetworkPane')) {
      const p = map.createPane('roadNetworkPane');
      p.style.zIndex = '450';
    }
    if (!map.getPane('routeAltPane')) {
      const p = map.createPane('routeAltPane');
      p.style.zIndex = '470';
    }
    if (!map.getPane('routeActivePane')) {
      const p = map.createPane('routeActivePane');
      p.style.zIndex = '490';
    }
    if (!map.getPane('markerPaneCustom')) {
      const p = map.createPane('markerPaneCustom');
      p.style.zIndex = '520';
    }
  }, [map]);
  return null;
};

// Auto-pan / fit bounds hook when route changes
const MapFitRoute: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length >= 2) {
      const bounds = coordinates.map((c) => [c[0], c[1]] as [number, number]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [coordinates, map]);
  return null;
};

export const RoutingDashboard: React.FC = () => {
  // Navigation input state
  const [originId, setOriginId] = useState<string>('RN-CST');
  const [destinationId, setDestinationId] = useState<string>('RN-ANDHERI');
  const [routingMode, setRoutingMode] = useState<RoutingMode>('SAFEST');
  const [horizon, setHorizon] = useState<'T+0' | 'T+1' | 'T+2' | 'T+3'>('T+1');
  const [scenarioMode, setScenarioMode] = useState<'LIVE' | 'DEMO_SURGE' | 'DRY'>('DEMO_SURGE');

  // Weather & Hydro Risk pipeline state
  const [weather, setWeather] = useState<NormalizedWeatherObservation>(() =>
    getDemoFallbackWeather('Monsoon Flood Scenario (65 mm/hr)')
  );
  const [riskForecast, setRiskForecast] = useState<RiskForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSegmentDetails, setShowSegmentDetails] = useState<boolean>(false);

  // Initialize weather and risk forecast
  useEffect(() => {
    const updateSimulation = async () => {
      setIsLoading(true);
      let targetWeather: NormalizedWeatherObservation;

      if (scenarioMode === 'LIVE') {
        targetWeather = await fetchLiveWeatherData();
      } else if (scenarioMode === 'DRY') {
        const dry = getDemoFallbackWeather('Dry Weather Baseline (0 mm/hr)');
        dry.status = 'DEMO';
        dry.current_rainfall_mm_hr = 0;
        dry.nowcast_steps = dry.nowcast_steps.map((s) => ({
          ...s,
          rainfall_intensity_mm_hr: 0,
          accumulated_rainfall_mm: 0,
        }));
        targetWeather = dry;
      } else {
        // DEMO_SURGE: Heavy Monsoon Inundation
        const surge = getDemoFallbackWeather('Monsoon Inundation Scenario (65 mm/hr)');
        surge.status = 'DEMO';
        surge.current_rainfall_mm_hr = 65;
        surge.nowcast_steps = [
          { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: 50, accumulated_rainfall_mm: 50, warning_level: 'Watch' },
          { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: 65, accumulated_rainfall_mm: 115, warning_level: 'Warning' },
          { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: 75, accumulated_rainfall_mm: 190, warning_level: 'Warning' },
          { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: 80, accumulated_rainfall_mm: 270, warning_level: 'Warning' },
        ];
        targetWeather = surge;
      }

      setWeather(targetWeather);

      // Hydrologic & Hydraulic Cascade
      const runoff = generateRunoffForecast(targetWeather);
      const coupled = generateCoupledForecast(runoff);
      if (coupled) {
        const risk = generateRiskForecast(coupled);
        setRiskForecast(risk);
      }
      setIsLoading(false);
    };

    updateSimulation();
  }, [scenarioMode]);

  // Compute flood-safe route dynamically whenever inputs or risk forecast change
  const routeResult: RoutePairResult | null = useMemo(() => {
    if (!riskForecast) return null;
    try {
      return findRoute(originId, destinationId, routingMode, horizon, riskForecast, PROTOTYPE_ROAD_GRAPH);
    } catch (err) {
      console.error('Routing computation error:', err);
      return null;
    }
  }, [originId, destinationId, routingMode, horizon, riskForecast]);

  const primary = routeResult?.primary;
  const alternative = routeResult?.alternative;

  // Swap Origin and Destination
  const handleSwap = () => {
    const temp = originId;
    setOriginId(destinationId);
    setDestinationId(temp);
  };

  // Quick preset corridor selection
  const applyPreset = (orig: string, dest: string, mode: RoutingMode, hr: 'T+0' | 'T+1' | 'T+2' | 'T+3') => {
    setOriginId(orig);
    setDestinationId(dest);
    setRoutingMode(mode);
    setHorizon(hr);
  };

  const assessments = riskForecast?.horizons[horizon]?.cellAssessments || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Flood-Safe Routing & Navigation</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded uppercase tracking-wider">
                Phase 4C
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hydrologically penalized transit pathfinding for emergency services, buses, and commuters
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                Weather: <strong>{weather.current_rainfall_mm_hr.toFixed(1)} mm/hr</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                Data Status: <strong>{weather.status}</strong>
              </span>
              {isLoading && (
                <span className="text-blue-600 font-semibold animate-pulse">
                  Computing routing graph...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scenario Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setScenarioMode('DEMO_SURGE')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scenarioMode === 'DEMO_SURGE' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monsoon Surge (65 mm/hr)
            </button>
            <button
              onClick={() => setScenarioMode('DRY')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scenarioMode === 'DRY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dry Baseline (0 mm/hr)
            </button>
            <button
              onClick={() => setScenarioMode('LIVE')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                scenarioMode === 'LIVE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Weather
            </button>
          </div>
          <DemoBadge />
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Origin Node Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Origin Location
            </label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PROTOTYPE_ROAD_NODES.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.type})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center pt-5">
            <button
              onClick={handleSwap}
              title="Swap Origin and Destination"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Node Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              Destination Location
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PROTOTYPE_ROAD_NODES.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.type})
                </option>
              ))}
            </select>
          </div>

          {/* Forecast Horizon Selector */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Nowcast Horizon
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              {(['T+0', 'T+1', 'T+2', 'T+3'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`py-1.5 rounded text-center transition-colors ${
                    horizon === h ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Mode Selector & Preset Corridors */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 gap-1 text-xs font-semibold">
              <button
                onClick={() => setRoutingMode('SAFEST')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                  routingMode === 'SAFEST'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Safest (Flood Aversion)
              </button>
              <button
                onClick={() => setRoutingMode('FASTEST')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                  routingMode === 'FASTEST'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Zap className="w-4 h-4" />
                Fastest
              </button>
              <button
                onClick={() => setRoutingMode('EMERGENCY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                  routingMode === 'EMERGENCY'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Emergency (Rescue / 50cm Limit)
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Quick Presets:</span>
            <button
              onClick={() => applyPreset('RN-CST', 'RN-ANDHERI', 'SAFEST', 'T+1')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
            >
              CST → Andheri (Sea Link Detour)
            </button>
            <button
              onClick={() => applyPreset('RN-DADAR-HINDMATA', 'RN-KURLA', 'SAFEST', 'T+2')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
            >
              Hindmata → Kurla
            </button>
            <button
              onClick={() => applyPreset('RN-WORLI', 'RN-POWAI', 'FASTEST', 'T+1')}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
            >
              Worli → Powai
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Route Results + Interactive Leaflet Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Navigation Route Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {primary ? (
            <>
              {/* Primary Route Summary Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-xs font-extrabold rounded-md uppercase tracking-wider ${
                        primary.status === 'FOUND'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : primary.status === 'ORIGIN_EQUALS_DESTINATION'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {primary.status === 'FOUND' ? 'Optimal Route Found' : primary.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {routingMode} Mode • Horizon {horizon}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    PROVENANCE: DERIVED
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Distance</span>
                    <span className="text-lg font-extrabold text-slate-900">{primary.total_distance_km}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">km</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Travel Time</span>
                    <span className="text-lg font-extrabold text-slate-900">{primary.total_time_min}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">minutes</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Max Inundation</span>
                    <span
                      className={`text-lg font-extrabold ${
                        primary.max_flood_depth_cm > 20
                          ? 'text-rose-600'
                          : primary.max_flood_depth_cm > 5
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {primary.max_flood_depth_cm}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block">cm</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Worst Hazard</span>
                    <span
                      className="inline-block mt-0.5 px-2 py-0.5 text-xs font-bold rounded text-white"
                      style={{ backgroundColor: RISK_COLORS[primary.highest_risk_level] }}
                    >
                      {primary.highest_risk_level}
                    </span>
                  </div>
                </div>

                {/* Explanation Callout Box */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Routing Advisory & Rationale:
                  </p>
                  <p>{primary.explanation}</p>
                </div>

                {/* Flood Risk Exposure Breakdown Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Inundation Exposure by Distance:</span>
                    <span>{primary.total_distance_km} km total</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {primary.total_distance_m > 0 && (
                      <>
                        <div
                          style={{
                            width: `${(primary.risk_exposure.low_m / primary.total_distance_m) * 100}%`,
                            backgroundColor: RISK_COLORS.LOW,
                          }}
                          title={`Low Risk: ${(primary.risk_exposure.low_m / 1000).toFixed(1)} km`}
                        />
                        <div
                          style={{
                            width: `${(primary.risk_exposure.moderate_m / primary.total_distance_m) * 100}%`,
                            backgroundColor: RISK_COLORS.MODERATE,
                          }}
                          title={`Moderate Risk: ${(primary.risk_exposure.moderate_m / 1000).toFixed(1)} km`}
                        />
                        <div
                          style={{
                            width: `${(primary.risk_exposure.high_m / primary.total_distance_m) * 100}%`,
                            backgroundColor: RISK_COLORS.HIGH,
                          }}
                          title={`High Risk: ${(primary.risk_exposure.high_m / 1000).toFixed(1)} km`}
                        />
                        <div
                          style={{
                            width: `${(primary.risk_exposure.very_high_m / primary.total_distance_m) * 100}%`,
                            backgroundColor: RISK_COLORS.VERY_HIGH,
                          }}
                          title={`Very High Risk: ${(primary.risk_exposure.very_high_m / 1000).toFixed(1)} km`}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: RISK_COLORS.LOW }} />
                      Low: {(primary.risk_exposure.low_m / 1000).toFixed(1)} km
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: RISK_COLORS.MODERATE }} />
                      Mod: {(primary.risk_exposure.moderate_m / 1000).toFixed(1)} km
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: RISK_COLORS.HIGH }} />
                      High: {(primary.risk_exposure.high_m / 1000).toFixed(1)} km
                    </span>
                  </div>
                </div>

                {/* Avoided Flood Chokepoints */}
                {primary.avoided_segments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Avoided Inundated Chokepoints ({primary.avoided_segments.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {primary.avoided_segments.slice(0, 4).map((h) => (
                        <span
                          key={h.edge_id}
                          className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-md font-medium"
                          title={h.reason}
                        >
                          {h.name} ({h.depth_cm.toFixed(0)}cm)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Alternative Route Comparison Card (if available) */}
              {alternative && (
                <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-purple-600" />
                      Alternative Viable Route:
                    </span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded">
                      Detour Option
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-purple-50 p-2 rounded border border-purple-100 text-center">
                      <span className="text-[10px] text-purple-600 font-semibold block">Distance</span>
                      <span className="font-bold text-purple-950">{alternative.total_distance_km} km</span>
                    </div>
                    <div className="bg-purple-50 p-2 rounded border border-purple-100 text-center">
                      <span className="text-[10px] text-purple-600 font-semibold block">Time</span>
                      <span className="font-bold text-purple-950">{alternative.total_time_min} min</span>
                    </div>
                    <div className="bg-purple-50 p-2 rounded border border-purple-100 text-center">
                      <span className="text-[10px] text-purple-600 font-semibold block">Max Depth</span>
                      <span className="font-bold text-purple-950">{alternative.max_flood_depth_cm} cm</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Shown as purple dashed line on the GIS map.
                  </p>
                </div>
              )}

              {/* Turn-by-Turn Segment Breakdown (Collapsible) */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setShowSegmentDetails(!showSegmentDetails)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs font-bold text-slate-700"
                >
                  <span className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-slate-500" />
                    Turn-by-Turn Road Segments ({primary.segments.length})
                  </span>
                  {showSegmentDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSegmentDetails && (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {primary.segments.map((seg, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50/80 transition-colors text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>
                            {idx + 1}. {seg.name}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] text-white font-bold"
                            style={{ backgroundColor: RISK_COLORS[seg.risk_level] }}
                          >
                            {seg.risk_level}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>
                            {seg.from_node_name} → {seg.to_node_name}
                          </span>
                          <span>{(seg.distance_m / 1000).toFixed(1)} km</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>
                            Water Depth: <strong className="text-slate-700">{seg.flood_depth_cm} cm</strong>
                          </span>
                          <span>
                            Speed: <strong className="text-slate-700">{seg.effective_speed_kmh} km/h</strong> (Base {seg.base_speed_kmh})
                          </span>
                          <span>Time: {Math.round(seg.travel_time_s / 60)}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Calculating flood-safe routes...</p>
            </div>
          )}
        </div>

        {/* Right Column: GIS Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-[650px] relative">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Interactive Road Network & Dynamic Flood Inundation GIS
            </span>
            <span className="text-slate-500 font-medium">
              Click any road or node on map to inspect
            </span>
          </div>

          <div className="flex-1 relative">
            <LeafletMap
              center={[19.04, 72.87]}
              zoom={11}
              className="w-full h-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <RoutingMapPanes />

              {primary && primary.coordinates.length >= 2 && (
                <MapFitRoute coordinates={primary.coordinates} />
              )}

              {/* Base Road Network Edges colored by current flood risk */}
              {PROTOTYPE_ROAD_GRAPH.edges.map((edge) => {
                const flood = getEdgeFloodStatus(edge, assessments);
                const color = RISK_COLORS[flood.risk_level];

                return (
                  <Polyline
                    key={`edge-${edge.id}`}
                    positions={edge.coordinates}
                    pathOptions={{
                      color: color,
                      weight: 4,
                      opacity: 0.7,
                      pane: 'roadNetworkPane',
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1 text-xs">
                        <strong className="block text-slate-900">{edge.name}</strong>
                        <div className="text-slate-600">
                          Type: <strong>{edge.road_type}</strong>
                          {edge.is_elevated && ' (Elevated)'}
                        </div>
                        <div className="text-slate-600">
                          Length: {(edge.distance_m / 1000).toFixed(1)} km • Speed: {edge.base_speed_kmh} km/h
                        </div>
                        <div className="text-slate-600 flex items-center gap-1.5">
                          Flood Depth: <strong>{flood.depth_cm.toFixed(1)} cm</strong>
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] text-white font-bold"
                            style={{ backgroundColor: color }}
                          >
                            {flood.risk_level}
                          </span>
                        </div>
                        {flood.reason && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            {flood.reason}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* Alternative Route Polyline (Dashed Purple) */}
              {alternative && alternative.coordinates.length >= 2 && (
                <Polyline
                  positions={alternative.coordinates}
                  pathOptions={{
                    color: '#8b5cf6',
                    weight: 5,
                    dashArray: '8, 8',
                    opacity: 0.85,
                    pane: 'routeAltPane',
                  }}
                />
              )}

              {/* Active Selected Route Polyline (Glowing Blue / Cyan) */}
              {primary && primary.coordinates.length >= 2 && (
                <Polyline
                  positions={primary.coordinates}
                  pathOptions={{
                    color: '#0284c7',
                    weight: 7,
                    opacity: 0.95,
                    pane: 'routeActivePane',
                  }}
                />
              )}

              {/* Road Network Nodes */}
              {PROTOTYPE_ROAD_NODES.map((node) => {
                const isOrigin = node.id === originId;
                const isDest = node.id === destinationId;

                const fillColor = isOrigin
                  ? '#10b981' // Green
                  : isDest
                  ? '#ef4444' // Red
                  : '#475569'; // Slate

                const radius = isOrigin || isDest ? 8 : 4.5;

                return (
                  <CircleMarker
                    key={`node-${node.id}`}
                    center={[node.lat, node.lng]}
                    radius={radius}
                    pathOptions={{
                      fillColor,
                      fillOpacity: 1,
                      color: '#ffffff',
                      weight: 2,
                      pane: 'markerPaneCustom',
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 text-xs">
                        <strong className="block text-slate-900">{node.name}</strong>
                        <div className="text-slate-500">ID: {node.id}</div>
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            onClick={() => setOriginId(node.id)}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                          >
                            Set Origin
                          </button>
                          <button
                            onClick={() => setDestinationId(node.id)}
                            className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                          >
                            Set Dest
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </LeafletMap>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-2 max-w-[240px]">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                GIS Navigation Legend
              </span>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-2 bg-[#0284c7] rounded inline-block" />
                  <span className="text-slate-700 font-semibold">Active Selected Route</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-0.5 border-b-2 border-dashed border-purple-500 inline-block" />
                  <span className="text-slate-700 font-semibold">Alternative Route</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200 space-y-1 text-[10px]">
                <span className="font-semibold text-slate-600 block">Road Inundation Hazard:</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.LOW }} />
                    <span>Low (&lt;5 cm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.MODERATE }} />
                    <span>Mod (5-20 cm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.HIGH }} />
                    <span>High (20-50 cm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.VERY_HIGH }} />
                    <span>V.High (50-100)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Provenance & Technical Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-700 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
          Technical Formulation & Municipal Disclaimer:
        </p>
        <p className="leading-relaxed">
          Route optimization is performed by Dijkstra's shortest-path solver operating over dynamic flood-penalized edge impedances:
          <span className="font-mono text-slate-800"> Cost(e) = T_base(e) × Multiplier(Risk, Depth, Mode)</span>.
          In SAFEST mode, flooded segments are heavily penalized to divert traffic onto elevated expressways (Bandra-Worli Sea Link, Eastern Freeway).
          In EMERGENCY mode, heavy disaster response vehicles are allowed wading clearance up to 50 cm before critical exclusion.
          Road network and hydraulic surcharge states represent calibrated SIH26085 prototype abstractions (ASSUMED_PROTOTYPE) and do not substitute official BMC disaster management directives.
        </p>
      </div>
    </div>
  );
};
