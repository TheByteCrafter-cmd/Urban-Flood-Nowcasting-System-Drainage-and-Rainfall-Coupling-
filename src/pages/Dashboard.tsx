import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  SlidersHorizontal,
  Radio,
  Clock,
  Navigation,
  GitCommit,
  Info,
  RefreshCw,
} from 'lucide-react';
import { MapContainer } from '../components/gis/MapContainer';
import { MapControlsPanel } from '../components/gis/MapControlsPanel';
import { fetchLiveWeatherData, getDemoFallbackWeather, getInitialWeatherObservation } from '../services/weatherService';
import { generateRunoffForecast } from '../services/runoffService';
import { generateSurfaceFlowForecast } from '../services/surfaceFlowService';
import { generateDrainageForecast } from '../services/drainageService';
import { generateCoupledForecast } from '../services/couplingService';
import { generateRiskForecast } from '../services/riskService';
import { NormalizedWeatherObservation, WeatherDataStatus } from '../types/weather';
import { NowcastHour } from '../mock/nowcast';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Primary states: Hydrated immediately from cached observation if available; null on first cold visit
  const [weather, setWeather] = useState<NormalizedWeatherObservation | null>(getInitialWeatherObservation);
  const [isLoading, setIsLoading] = useState<boolean>(!weather);
  const [scenarioMode, setScenarioMode] = useState<'LIVE' | 'DEMO_SURGE' | 'DRY'>('LIVE');
  const [selectedNowcastHour, setSelectedNowcastHour] = useState<NowcastHour>(0);
  const [viewMode, setViewMode] = useState<'depth' | 'risk'>('depth');
  const [mapControlsOpen, setMapControlsOpen] = useState<boolean>(true);

  // Layer visibility states (controlled from collapsible panel)
  const [showBaseMap, setShowBaseMap] = useState<boolean>(true);
  const [showDEM, setShowDEM] = useState<boolean>(true);
  const [showRainfall, setShowRainfall] = useState<boolean>(true);
  const [showRunoff, setShowRunoff] = useState<boolean>(false);
  const [showSurfaceFlow, setShowSurfaceFlow] = useState<boolean>(false);
  const [showDrainage, setShowDrainage] = useState<boolean>(true);
  const [showCoupled, setShowCoupled] = useState<boolean>(true);
  const [showRisk, setShowRisk] = useState<boolean>(false);
  const [showFlood, setShowFlood] = useState<boolean>(false);

  // Synchronize view mode with layers
  const handleSetViewMode = (mode: 'depth' | 'risk') => {
    setViewMode(mode);
    if (mode === 'depth') {
      setShowCoupled(true);
      setShowRisk(false);
    } else {
      setShowRisk(true);
      setShowCoupled(false);
    }
  };

  const loadWeatherData = async (forcedStatus?: WeatherDataStatus, forceFresh?: boolean) => {
    setIsLoading(true);
    try {
      if (scenarioMode === 'DEMO_SURGE') {
        const surge = getDemoFallbackWeather('Monsoon Storm Scenario (65 mm/hr)');
        surge.status = 'DEMO';
        surge.current_rainfall_mm_hr = 65;
        surge.nowcast_steps = [
          { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: 50, accumulated_rainfall_mm: 50, warning_level: 'Watch' },
          { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: 65, accumulated_rainfall_mm: 115, warning_level: 'Warning' },
          { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: 75, accumulated_rainfall_mm: 190, warning_level: 'Warning' },
          { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: 80, accumulated_rainfall_mm: 270, warning_level: 'Warning' },
        ];
        setWeather(surge);
      } else if (scenarioMode === 'DRY') {
        const dry = getDemoFallbackWeather('Dry Baseline (0 mm/hr)');
        dry.status = 'DEMO';
        dry.current_rainfall_mm_hr = 0;
        dry.nowcast_steps = dry.nowcast_steps.map((s) => ({
          ...s,
          rainfall_intensity_mm_hr: 0,
          accumulated_rainfall_mm: 0,
        }));
        setWeather(dry);
      } else {
        const data = await fetchLiveWeatherData({ forceStatus: forcedStatus, fresh: forceFresh });
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

  useEffect(() => {
    loadWeatherData();
  }, [scenarioMode]);

  // Computational Engines Pipeline (uses effective weather fallback during cold initial loading)
  const effectiveWeather = useMemo(() => {
    return weather ?? getDemoFallbackWeather('Initializing baseline...');
  }, [weather]);

  const runoffForecast = useMemo(() => {
    return generateRunoffForecast(effectiveWeather);
  }, [effectiveWeather]);

  const surfaceFlowForecast = useMemo(() => {
    return generateSurfaceFlowForecast(runoffForecast);
  }, [runoffForecast]);

  const drainageForecast = useMemo(() => {
    return generateDrainageForecast(runoffForecast);
  }, [runoffForecast]);

  const coupledForecast = useMemo(() => {
    return generateCoupledForecast(runoffForecast)!;
  }, [runoffForecast]);

  const riskForecast = useMemo(() => {
    return generateRiskForecast(coupledForecast);
  }, [coupledForecast]);

  // Derived KPI metrics for current horizon
  const activeCoupledState = coupledForecast.horizons[selectedNowcastHour];
  const activeRunoffGrid = runoffForecast.horizons[selectedNowcastHour];
  const activeDrainageState = drainageForecast.horizons[selectedNowcastHour];
  const horizonKey = `T+${selectedNowcastHour}` as 'T+0' | 'T+1' | 'T+2' | 'T+3';
  const activeRiskState = riskForecast.horizons[horizonKey];

  const totalRunoffRate = activeRunoffGrid?.cells.reduce((sum, c) => sum + c.runoff_rate_m3_s, 0) ?? 0;
  const maxDepthCm = activeCoupledState?.max_water_depth_cm ?? 0;
  const surchargedNodesCount = activeDrainageState?.nodes.filter(
    (n) => n.status === 'SURCHARGE' || n.status === 'OVERFLOW' || n.surcharge_rate_m3_s > 0
  ).length ?? 0;
  const totalNodesCount = activeDrainageState?.nodes.length ?? 31;
  const activeAlerts = activeRiskState?.alerts ?? [];

  // Computed truthful provenance and display status
  const displayStatus: WeatherDataStatus | 'INITIALIZING' = useMemo(() => {
    if (scenarioMode === 'DEMO_SURGE' || scenarioMode === 'DRY') {
      return 'DEMO';
    }
    if (!weather || (isLoading && weather.status === 'DEMO')) {
      return 'INITIALIZING';
    }
    if (weather.status === 'DEMO') {
      // User selected LIVE weather: upstream network failure is marked STALE, never DEMO
      return weather.is_fallback ? 'STALE' : 'LIVE';
    }
    return weather.status;
  }, [scenarioMode, weather, isLoading]);

  // Synchronize global application header with active scenario and status
  useEffect(() => {
    const sourceText =
      scenarioMode === 'LIVE'
        ? (weather?.source === 'IMD_NOWCAST'
            ? 'IMD & Open-Meteo'
            : weather?.source_label || 'IMD & Open-Meteo')
        : scenarioMode === 'DEMO_SURGE'
        ? 'Monsoon Storm Scenario'
        : 'Dry Weather Baseline';

    const timestampText =
      scenarioMode === 'LIVE'
        ? (weather?.source_timestamp || (isLoading ? 'Syncing...' : 'Live Observation'))
        : 'Scenario Model';

    window.dispatchEvent(
      new CustomEvent('weather-status-update', {
        detail: {
          status: displayStatus,
          source: sourceText,
          lastUpdated: timestampText,
          isDemoMode: scenarioMode !== 'LIVE',
        },
      })
    );
  }, [displayStatus, scenarioMode, weather, isLoading]);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] min-h-[640px] space-y-2 bg-slate-950 text-slate-100 select-none">
      {/* ==================================================================== */}
      {/* 1. TOP SUBHEADER & SCENARIO SELECTOR                                */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-semibold text-slate-300">Spatial Radar:</span>
            <span className="font-mono text-white text-[11px]">IMD Radar Product / Prototype Spatial Layer</span>
          </div>

          <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] text-slate-400">Updated:</span>
            <span className="font-mono text-[11px] text-slate-200">
              {scenarioMode === 'LIVE'
                ? (weather?.source_timestamp || (isLoading ? 'Syncing...' : 'Live Observation'))
                : scenarioMode === 'DEMO_SURGE'
                ? 'Monsoon Storm Scenario (65 mm/hr)'
                : 'Dry Weather Baseline (0 mm/hr)'}
            </span>
            {isLoading && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
          </div>

          <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />

          {displayStatus === 'INITIALIZING' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60 animate-pulse">
              INITIALIZING
            </span>
          ) : displayStatus === 'LIVE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE OBSERVATION
            </span>
          ) : displayStatus === 'CACHED' ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60"
              title="Observation served from high-speed cache; background telemetry sync active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              CACHED OBSERVATION
            </span>
          ) : displayStatus === 'STALE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
              STALE OBSERVATION
            </span>
          ) : displayStatus === 'ERROR' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700/60">
              ERROR
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60">
              DEMO SCENARIO
            </span>
          )}
        </div>

        {/* Compact Scenario Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs self-start sm:self-auto shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setScenarioMode('LIVE')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              scenarioMode === 'LIVE' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Weather
          </button>
          <button
            type="button"
            onClick={() => setScenarioMode('DEMO_SURGE')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              scenarioMode === 'DEMO_SURGE' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monsoon Demo (65 mm/hr)
          </button>
          <button
            type="button"
            onClick={() => setScenarioMode('DRY')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              scenarioMode === 'DRY' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dry (0 mm/hr)
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP KPI ROW (5 Compact Cards ~70px)                               */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
        {/* Card 1: Rainfall Intensity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Rainfall Rate</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                displayStatus === 'INITIALIZING'
                  ? 'bg-blue-950 text-blue-300 border border-blue-800/40 animate-pulse'
                  : displayStatus === 'LIVE'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                  : displayStatus === 'CACHED'
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40'
                  : displayStatus === 'STALE'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                  : displayStatus === 'ERROR'
                  ? 'bg-red-950 text-red-400 border border-red-800/40'
                  : 'bg-blue-950 text-blue-400 border border-blue-800/40'
              }`}
            >
              {displayStatus === 'INITIALIZING' ? 'SYNCING...' : displayStatus}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            {displayStatus === 'INITIALIZING' ? (
              <span className="text-sm font-semibold text-slate-400 animate-pulse">Syncing feed...</span>
            ) : (
              <>
                <span className="text-xl font-black text-white">
                  {(scenarioMode === 'DEMO_SURGE'
                    ? 65.0
                    : scenarioMode === 'DRY'
                    ? 0.0
                    : weather?.current_rainfall_mm_hr ?? 0.0
                  ).toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-semibold">mm/hr</span>
              </>
            )}
          </div>
          <span
            className="text-[10px] text-slate-500 truncate"
            title={
              scenarioMode === 'LIVE'
                ? (weather?.source === 'IMD_NOWCAST'
                    ? 'India Meteorological Department (IMD) & Open-Meteo'
                    : weather?.source_label || 'Open-Meteo & IMD Mausam')
                : scenarioMode === 'DEMO_SURGE'
                ? 'Monsoon Storm Scenario (65 mm/hr)'
                : 'Dry Weather Baseline (0 mm/hr)'
            }
          >
            {scenarioMode === 'LIVE'
              ? (weather?.source === 'IMD_NOWCAST'
                  ? 'IMD & Open-Meteo'
                  : weather?.source_label || 'Open-Meteo & IMD Mausam')
              : scenarioMode === 'DEMO_SURGE'
              ? 'Monsoon Storm Scenario (65 mm/hr)'
              : 'Dry Weather Baseline (0 mm/hr)'}
          </span>
        </div>

        {/* Card 2: Runoff Generation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Runoff Rate</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-400">
              MODEL OUTPUT
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-cyan-400">{totalRunoffRate.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-semibold">m³/s</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">Rational Infiltration</span>
        </div>

        {/* Card 3: Max Flood Depth */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Max Inundation</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-950 text-sky-400">
              MODEL OUTPUT
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-black ${maxDepthCm > 20 ? 'text-amber-400' : 'text-sky-400'}`}>
              {maxDepthCm.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">cm</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">
            {maxDepthCm === 0 ? 'No Street Pooling' : 'Coupled Surface Peak'}
          </span>
        </div>

        {/* Card 4: Surcharged Nodes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pipe Surcharge</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                surchargedNodesCount > 0 ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
              }`}
            >
              {surchargedNodesCount > 0 ? `${surchargedNodesCount} SURCHARGED` : 'NORMAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-black ${surchargedNodesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {surchargedNodesCount}
            </span>
            <span className="text-xs text-slate-400 font-semibold">/ {totalNodesCount} Nodes</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">1D Hydraulic Capacity</span>
        </div>

        {/* Card 5: Active Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Alerts</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                activeAlerts.length > 0 ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
              }`}
            >
              {activeAlerts.length > 0 ? 'ATTENTION' : 'NORMAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-black ${activeAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {activeAlerts.length}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              {activeAlerts.length === 1 ? 'Alert' : 'Alerts'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">
            {activeAlerts.length > 0 ? 'Infrastructure Risk' : 'No active alerts'}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MAIN MAP WORKSPACE (Dominant 65–75%)                               */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl min-h-[360px]">
        {/* Map Top Controls Bar */}
        <div className="h-10 px-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-2 shrink-0">
          {/* Left: View Mode Segmented Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('depth')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                viewMode === 'depth' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Depth View
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('risk')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                viewMode === 'risk' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Risk View
            </button>
          </div>

          {/* Center: Search / Click Prompt */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Click any catchment grid or drainage node on the map to inspect hydraulic telemetry</span>
          </div>

          {/* Right: Horizon Selector + Map Controls Drawer Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
              {([0, 1, 2, 3] as NowcastHour[]).map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => setSelectedNowcastHour(hour)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                    selectedNowcastHour === hour ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  T+{hour}
                </button>
              ))}
            </div>

            {/* Toggle Right Collapsible Panel */}
            <button
              type="button"
              onClick={() => setMapControlsOpen(!mapControlsOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                mapControlsOpen
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
              title="Toggle Map Controls & Layers"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map Controls</span>
            </button>
          </div>
        </div>

        {/* Map Body: Map Canvas + Collapsible Right Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 h-full w-full relative">
            <MapContainer
              cityName="Mumbai Metropolitan Region"
              center={[19.0760, 72.8777]}
              zoom={11.5}
              className="h-full w-full"
              weather={weather}
              runoffForecast={runoffForecast}
              surfaceFlowForecast={surfaceFlowForecast}
              drainageForecast={drainageForecast}
              coupledForecast={coupledForecast}
              riskForecast={riskForecast}
              selectedNowcastHour={selectedNowcastHour}
              showBaseMap={showBaseMap}
              showDEM={showDEM}
              showRainfall={showRainfall}
              showRunoff={showRunoff}
              showSurfaceFlow={showSurfaceFlow}
              showDrainage={showDrainage}
              showCoupled={showCoupled}
              showRisk={showRisk}
              showFlood={showFlood}
            />
          </div>

          {/* Right-Side Collapsible Panel */}
          <MapControlsPanel
            isOpen={mapControlsOpen}
            onClose={() => setMapControlsOpen(false)}
            showBaseMap={showBaseMap}
            onToggleBaseMap={setShowBaseMap}
            showDEM={showDEM}
            onToggleDEM={setShowDEM}
            showRainfall={showRainfall}
            onToggleRainfall={setShowRainfall}
            showRunoff={showRunoff}
            onToggleRunoff={setShowRunoff}
            showSurfaceFlow={showSurfaceFlow}
            onToggleSurfaceFlow={setShowSurfaceFlow}
            showDrainage={showDrainage}
            onToggleDrainage={setShowDrainage}
            showCoupled={showCoupled}
            onToggleCoupled={setShowCoupled}
            showFlood={showFlood}
            onToggleFlood={setShowFlood}
            showRisk={showRisk}
            onToggleRisk={setShowRisk}
            selectedHour={selectedNowcastHour}
            scenarioMode={scenarioMode}
            weatherStatus={displayStatus}
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. BOTTOM SUMMARY AREA (3 Compact Cards)                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
        {/* CARD 1 — RECENT ALERTS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Recent Alerts (T+{selectedNowcastHour})
            </span>
            <span className="text-[10px] font-mono text-slate-500">{activeAlerts.length} Total</span>
          </div>

          <div className="py-2 flex-1 flex flex-col justify-center">
            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white text-xs">No active flood risk alerts</p>
                  <p className="text-[11px] text-slate-400">System operating within normal parameters.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[55px] pr-1">
                {activeAlerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-[11px] bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-medium text-slate-200 truncate">{alert.title}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0 ml-1">
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Phase 4B Alerts Engine</span>
            <span>MODEL OUTPUT / DERIVED</span>
          </div>
        </div>

        {/* CARD 2 — FORECAST TIMELINE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              0–3h Forecast Depth Profile
            </span>
            <span className="text-[10px] font-mono text-blue-400">Click to Switch</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 py-1.5 flex-1 items-center">
            {([0, 1, 2, 3] as NowcastHour[]).map((h) => {
              const depth = coupledForecast.horizons[h]?.max_water_depth_cm ?? 0;
              const rain = weather?.nowcast_steps?.[h]?.rainfall_intensity_mm_hr ?? 0;
              const isSelected = selectedNowcastHour === h;

              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSelectedNowcastHour(h)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-md border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-blue-950/80 border-blue-500 text-white shadow-xs'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold font-mono">T+{h}</span>
                  <span className={`text-xs font-black ${depth > 20 ? 'text-amber-400' : 'text-sky-400'}`}>
                    {depth.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">cm</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{rain} mm/h</span>
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Phase 3D Coupled Engine</span>
            <span>Lead Time: 0–3 Hours</span>
          </div>
        </div>

        {/* CARD 3 — QUICK ACTIONS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Decision Support Actions
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Quick Launch</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 py-1.5 flex-1 items-center">
            <button
              type="button"
              onClick={() => navigate('/nowcast')}
              className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-700 text-slate-200 transition-colors cursor-pointer group text-center"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold leading-tight">View Nowcast</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/drainage')}
              className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-700 text-slate-200 transition-colors cursor-pointer group text-center"
            >
              <GitCommit className="w-3.5 h-3.5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold leading-tight">Infrastructure</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/routing')}
              className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-950 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-700 text-slate-200 transition-colors cursor-pointer group text-center"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-semibold leading-tight">Plan Route</span>
            </button>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Verified SIH Prototype</span>
            <span className="text-blue-400 hover:underline cursor-pointer" onClick={() => navigate('/')}>
              About & Docs →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};