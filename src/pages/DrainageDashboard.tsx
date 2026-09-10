import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight } from 'lucide-react';
import { LiveWeatherStatusBar } from '../components/gis/LiveWeatherStatusBar';
import { DrainageLegend } from '../components/gis/DrainageLegend';
import { DrainageSummaryCard } from '../components/gis/DrainageSummaryCard';
import { NowcastTimeControl } from '../components/gis/NowcastTimeControl';
import { fetchLiveWeatherData, getDemoFallbackWeather, getInitialWeatherObservation } from '../services/weatherService';
import { generateRunoffForecast } from '../services/runoffService';
import { generateDrainageForecast, getPipeUtilizationCategory, getNodeSurchargeStatus } from '../services/drainageService';
import { NormalizedWeatherObservation, WeatherDataStatus } from '../types/weather';
import { NowcastHour } from '../mock/nowcast';

// Sub-component to manage map bounds and custom Leaflet panes
const DrainageMapPanes: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('pipePane')) {
      const pipePane = map.createPane('pipePane');
      pipePane.style.zIndex = '460';
    }
    if (!map.getPane('nodePane')) {
      const nodePane = map.createPane('nodePane');
      nodePane.style.zIndex = '470';
    }
  }, [map]);
  return null;
};

export const DrainageDashboard: React.FC = () => {
  const [weather, setWeather] = useState<NormalizedWeatherObservation | null>(getInitialWeatherObservation);
  const [isLoading, setIsLoading] = useState<boolean>(!weather);
  const [selectedHour, setSelectedHour] = useState<NowcastHour>(0);

  const loadWeatherData = async (forcedStatus?: WeatherDataStatus, forceFresh?: boolean) => {
    setIsLoading(true);
    try {
      const data = await fetchLiveWeatherData({ forceStatus: forcedStatus, fresh: forceFresh });
      setWeather(data);
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
  }, []);

  // Compute Phase 3A runoff forecast from weather (uses effective baseline during cold initial load)
  const effectiveWeather = useMemo(() => {
    return weather ?? getDemoFallbackWeather('Initializing baseline...');
  }, [weather]);

  const runoffForecast = useMemo(() => {
    return generateRunoffForecast(effectiveWeather);
  }, [effectiveWeather]);

  // Compute Phase 3C drainage network forecast from runoff
  const drainageForecast = useMemo(() => {
    return generateDrainageForecast(runoffForecast);
  }, [runoffForecast]);

  const currentNetworkState = drainageForecast.horizons[selectedHour];

  const center: [number, number] = [19.055, 72.88]; // Centered over Mumbai core network

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[550px] space-y-2">
      {/* Real-Time Official Meteorological Ingestion Bar (IMD / DWR) */}
      <div className="relative z-[1100]">
        <LiveWeatherStatusBar
          weather={weather}
          isLoading={isLoading}
          onRefresh={(forcedStatus, forceFresh) => loadWeatherData(forcedStatus, forceFresh)}
        />
      </div>

      {/* Primary Drainage GIS Map Container */}
      <div className="flex-1 w-full h-full relative rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950">
        <LeafletMap
          center={center}
          zoom={12}
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <DrainageMapPanes />

          {/* Neutral Base Cartography */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Drainage Pipe Edges (Polylines) */}
          {currentNetworkState.edges.map((edge) => {
            const { color } = getPipeUtilizationCategory(edge.utilization_pct);
            const positions: [number, number][] = [
              [edge.coordinates[0][1], edge.coordinates[0][0]],
              [edge.coordinates[1][1], edge.coordinates[1][0]],
            ];

            return (
              <Polyline
                key={edge.id}
                positions={positions}
                pane="pipePane"
                pathOptions={{
                  color,
                  weight: edge.status === 'OVER_CAPACITY' ? 5 : edge.status === 'HIGH' ? 4 : 3,
                  opacity: 0.88,
                  dashArray: edge.status === 'OVER_CAPACITY' ? '6, 6' : undefined,
                }}
              >
                <Popup className="custom-drainage-popup">
                  <div className="text-xs p-1 space-y-1.5 min-w-[240px] text-slate-900">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
                        DRAINAGE PIPE: {edge.id}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {edge.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-800 text-[11px]">{edge.name}</div>

                    <div className="flex items-center gap-1.5 text-slate-600 text-[10px] bg-slate-100 p-1 rounded">
                      <span className="font-mono font-bold text-blue-700">{edge.from_node}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-mono font-bold text-emerald-700">{edge.to_node}</span>
                      <span className="ml-auto text-slate-400">{edge.edge_type.replace('_', ' ')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">Current Flow (Q):</span>
                        <span className="font-bold text-blue-800 text-xs">{edge.actual_flow_m3_s} m³/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Hydraulic Capacity:</span>
                        <span className="font-bold text-slate-800 text-xs">{edge.capacity_m3_s} m³/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Utilization:</span>
                        <span className="font-bold text-xs" style={{ color }}>
                          {edge.utilization_pct}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Length:</span>
                        <span className="font-semibold text-slate-700">{edge.length_m} m</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Geometry:</span>
                        <span className="font-semibold text-slate-700">
                          {edge.edge_type === 'CIRCULAR_PIPE'
                            ? `Ø ${edge.diameter_m}m`
                            : `${edge.width_m}m × ${edge.height_m}m`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Manning Bed Slope:</span>
                        <span className="font-semibold text-slate-700">{(edge.slope * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 border-t pt-1">
                      Manning Equation: Q = (1/n)·A·R^(2/3)·S^(1/2) • Provenance: {edge.provenance}
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Drainage Nodes (CircleMarkers) */}
          {currentNetworkState.nodes.map((node) => {
            const isOutfall = node.node_type === 'OUTFALL';
            const { color } = getNodeSurchargeStatus(node.surcharge_ratio, isOutfall);
            const radius = isOutfall ? 8 : node.node_type === 'MANHOLE' ? 6 : 5;

            return (
              <CircleMarker
                key={node.id}
                center={[node.lat, node.lng]}
                radius={radius}
                pane="nodePane"
                pathOptions={{
                  color: '#0F172A',
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup className="custom-drainage-popup">
                  <div className="text-xs p-1 space-y-1.5 min-w-[240px] text-slate-900">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
                        {node.node_type}: {node.id}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {isOutfall ? 'MARINE OUTFALL' : node.status}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-800 text-[11px]">{node.name}</div>

                    <div className="flex items-center justify-between text-slate-500 text-[10px] bg-slate-100 p-1 rounded">
                      <span>Elev: <strong className="text-slate-800">{node.elevation_m} m MSL</strong></span>
                      <span>Grid: <strong className="text-slate-800">{node.catchment_cell_id}</strong></span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">Total Inflow (Q_in):</span>
                        <span className="font-bold text-blue-800 text-xs">{node.total_inflow_m3_s} m³/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Discharge Capacity:</span>
                        <span className="font-bold text-slate-800 text-xs">{node.node_capacity_m3_s} m³/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Discharged Outflow:</span>
                        <span className="font-bold text-emerald-800 text-xs">{node.discharged_outflow_m3_s} m³/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Surcharge Excess:</span>
                        <span className={`font-bold text-xs ${node.surcharge_rate_m3_s > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {node.surcharge_rate_m3_s} m³/s
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Surface Inflow:</span>
                        <span className="font-semibold text-slate-700">{node.surface_inflow_m3_s} m³/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Upstream Pipe Inflow:</span>
                        <span className="font-semibold text-slate-700">{node.upstream_pipe_inflow_m3_s} m³/s</span>
                      </div>
                    </div>

                    {node.status_reason && (
                      <div className="text-[10px] text-slate-600 bg-amber-50 border border-amber-200 p-1 rounded">
                        {node.status_reason}
                      </div>
                    )}

                    <div className="text-[9px] text-slate-400 border-t pt-1">
                      Provenance: {node.provenance} (Prototype Drainage Node)
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </LeafletMap>

        {/* Top-Center: 0–3 Hour Nowcast Time Control */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
          <NowcastTimeControl
            selectedHour={selectedHour}
            onSelectHour={setSelectedHour}
          />
        </div>

        {/* Bottom-Left: Drainage Network Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
          <DrainageLegend />
        </div>

        {/* Bottom-Right: Drainage Summary HUD Card */}
        <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto">
          <DrainageSummaryCard
            networkState={currentNetworkState}
            selectedHour={selectedHour}
          />
        </div>
      </div>
    </div>
  );
};
