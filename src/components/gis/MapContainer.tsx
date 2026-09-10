import React, { useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight } from 'lucide-react';
import { MOCK_RAINFALL_GEOJSON, RainfallFeatureProperties } from '../../mock/rainfall';
import { MOCK_DEM_GEOJSON } from '../../mock/dem';
import { FloodFeatureProperties } from '../../mock/flood';
import { PROTOTYPE_CATCHMENTS } from '../../mock/catchments';
import { MOCK_NOWCAST_TIMESTEPS, NowcastHour } from '../../mock/nowcast';
import { NormalizedWeatherObservation } from '../../types/weather';
import { RunoffForecast } from '../../types/runoff';
import { SurfaceFlowForecast } from '../../types/surfaceFlow';
import { DrainageForecast } from '../../types/drainage';
import { getPipeUtilizationCategory, getNodeSurchargeStatus } from '../../services/drainageService';
import { CoupledForecast } from '../../types/coupling';
import { RiskForecast } from '../../types/risk';
import { generateRunoffForecast } from '../../services/runoffService';
import { generateSurfaceFlowForecast } from '../../services/surfaceFlowService';
import { generateDrainageForecast } from '../../services/drainageService';
import { generateCoupledForecast } from '../../services/couplingService';
import { generateRiskForecast } from '../../services/riskService';
import L from 'leaflet';

export interface MapContainerProps {
  cityId?: string;
  cityName?: string;
  center?: [number, number]; // Handles both [lat, lng] and [lng, lat]
  zoom?: number;
  onMapLoad?: (map: L.Map) => void;
  className?: string;
  weather?: NormalizedWeatherObservation | null;
  runoffForecast?: RunoffForecast | null;
  surfaceFlowForecast?: SurfaceFlowForecast | null;
  drainageForecast?: DrainageForecast | null;
  coupledForecast?: CoupledForecast | null;
  riskForecast?: RiskForecast | null;
  selectedNowcastHour?: NowcastHour;
  // External Layer Visibility Controls
  showBaseMap?: boolean;
  showDEM?: boolean;
  showRainfall?: boolean;
  showRunoff?: boolean;
  showSurfaceFlow?: boolean;
  showDrainage?: boolean;
  showCoupled?: boolean;
  showRisk?: boolean;
  showFlood?: boolean;
}

// Sub-component to initialize custom Leaflet panes for z-index layer separation
const MapPanes: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('demPane')) {
      const demPane = map.createPane('demPane');
      demPane.style.zIndex = '400'; // Base terrain layer pane
    }
    if (!map.getPane('rainfallPane')) {
      const rainfallPane = map.createPane('rainfallPane');
      rainfallPane.style.zIndex = '450'; // Overlay meteorological pane
    }
    if (!map.getPane('runoffPane')) {
      const runoffPane = map.createPane('runoffPane');
      runoffPane.style.zIndex = '480'; // Surface runoff generation layer pane (Phase 3A)
    }
    if (!map.getPane('surfaceFlowPane')) {
      const surfaceFlowPane = map.createPane('surfaceFlowPane');
      surfaceFlowPane.style.zIndex = '490'; // 2D Surface flow routing layer pane (Phase 3B)
    }
    if (!map.getPane('floodPane')) {
      const floodPane = map.createPane('floodPane');
      floodPane.style.zIndex = '500'; // Top flood inundation layer pane
    }
    if (!map.getPane('pipePane')) {
      const pipePane = map.createPane('pipePane');
      pipePane.style.zIndex = '510'; // Drainage pipe edge pane (Phase 3C)
    }
    if (!map.getPane('nodePane')) {
      const nodePane = map.createPane('nodePane');
      nodePane.style.zIndex = '520'; // Drainage node pane (Phase 3C)
    }
    if (!map.getPane('coupledPane')) {
      const coupledPane = map.createPane('coupledPane');
      coupledPane.style.zIndex = '505'; // 1D-2D Coupled flood layer pane (Phase 3D)
    }
    if (!map.getPane('riskPane')) {
      const riskPane = map.createPane('riskPane');
      riskPane.style.zIndex = '508'; // Flood Risk Scoring Layer pane (Phase 4B)
    }
  }, [map]);
  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  center = [19.0760, 72.8777],
  zoom = 11.5,
  className = 'h-full w-full',
  weather,
  runoffForecast,
  surfaceFlowForecast,
  drainageForecast,
  coupledForecast,
  riskForecast,
  selectedNowcastHour = 0,
  showBaseMap = true,
  showDEM = true,
  showRainfall = true,
  showRunoff = false,
  showSurfaceFlow = false,
  showDrainage = true,
  showCoupled = true,
  showRisk = false,
  showFlood = false,
}) => {
  // Normalize coordinate order: Leaflet requires [lat, lng]
  const mapCenter: [number, number] = center[0] > 50 ? [center[1], center[0]] : center;

  // Derive runoff forecast from props or fallback to weather
  const activeRunoffForecast = React.useMemo(() => {
    if (runoffForecast) return runoffForecast;
    if (weather) return generateRunoffForecast(weather);
    return null;
  }, [runoffForecast, weather]);

  // Derive 2D surface flow forecast from Phase 3A runoff forecast
  const activeSurfaceFlowForecast = React.useMemo(() => {
    if (surfaceFlowForecast) return surfaceFlowForecast;
    if (activeRunoffForecast) return generateSurfaceFlowForecast(activeRunoffForecast);
    return null;
  }, [surfaceFlowForecast, activeRunoffForecast]);

  // Derive drainage network forecast from Phase 3A runoff forecast
  const activeDrainageForecast = React.useMemo(() => {
    if (drainageForecast) return drainageForecast;
    if (activeRunoffForecast) return generateDrainageForecast(activeRunoffForecast);
    return null;
  }, [drainageForecast, activeRunoffForecast]);

  // Derive 1D-2D coupled forecast from Phase 3A runoff forecast
  const activeCoupledForecast = React.useMemo(() => {
    if (coupledForecast) return coupledForecast;
    if (activeRunoffForecast) return generateCoupledForecast(activeRunoffForecast);
    return null;
  }, [coupledForecast, activeRunoffForecast]);

  // Derive Risk Forecast from Coupled Forecast (Phase 4B)
  const activeRiskForecast = React.useMemo(() => {
    if (riskForecast) return riskForecast;
    if (activeCoupledForecast) return generateRiskForecast(activeCoupledForecast);
    return null;
  }, [riskForecast, activeCoupledForecast]);

  // Keep live references so that popups always read the exact current forecast & horizon
  const forecastRef = React.useRef(activeRunoffForecast);
  forecastRef.current = activeRunoffForecast;

  const flowForecastRef = React.useRef(activeSurfaceFlowForecast);
  flowForecastRef.current = activeSurfaceFlowForecast;

  const coupledForecastRef = React.useRef(activeCoupledForecast);
  coupledForecastRef.current = activeCoupledForecast;

  const riskForecastRef = React.useRef(activeRiskForecast);
  riskForecastRef.current = activeRiskForecast;

  const hourRef = React.useRef(selectedNowcastHour);
  hourRef.current = selectedNowcastHour;

  // Construct GeoJSON FeatureCollection for the current Runoff nowcast horizon
  const runoffGeoJSON = React.useMemo(() => {
    if (!activeRunoffForecast) return null;
    const grid = activeRunoffForecast.horizons[selectedNowcastHour];
    if (!grid) return null;

    return {
      type: 'FeatureCollection',
      features: PROTOTYPE_CATCHMENTS.map((catchment, idx) => {
        const cellState = grid.cells[idx];
        return {
          type: 'Feature',
          id: catchment.cell_id,
          geometry: catchment.geometry,
          properties: {
            ...catchment,
            ...cellState,
          },
        };
      }),
    };
  }, [activeRunoffForecast, selectedNowcastHour]);

  // Construct GeoJSON FeatureCollection for the current 2D Surface Flow horizon
  const surfaceFlowGeoJSON = React.useMemo(() => {
    if (!activeSurfaceFlowForecast) return null;
    const grid = activeSurfaceFlowForecast.horizons[selectedNowcastHour];
    if (!grid) return null;

    return {
      type: 'FeatureCollection',
      features: grid.cells.map((cell) => ({
        type: 'Feature',
        id: cell.cell_id,
        geometry: cell.geometry,
        properties: {
          ...cell,
        },
      })),
    };
  }, [activeSurfaceFlowForecast, selectedNowcastHour]);

  // Construct GeoJSON FeatureCollection for the current 1D-2D Coupled horizon
  const coupledGeoJSON = React.useMemo(() => {
    if (!activeCoupledForecast) return null;
    const state = activeCoupledForecast.horizons[selectedNowcastHour];
    if (!state) return null;

    return {
      type: 'FeatureCollection',
      features: state.cells.map((cell) => ({
        type: 'Feature',
        id: cell.cell_id,
        geometry: cell.geometry,
        properties: {
          ...cell,
        },
      })),
    };
  }, [activeCoupledForecast, selectedNowcastHour]);

  // Construct GeoJSON FeatureCollection for the current Risk Assessment horizon (Phase 4B)
  const riskGeoJSON = React.useMemo(() => {
    if (!activeRiskForecast || !activeCoupledForecast) return null;
    const horizonKey = `T+${selectedNowcastHour}` as 'T+0' | 'T+1' | 'T+2' | 'T+3';
    const riskState = activeRiskForecast.horizons[horizonKey];
    const coupledState = activeCoupledForecast.horizons[selectedNowcastHour];
    if (!riskState || !coupledState) return null;

    return {
      type: 'FeatureCollection',
      features: riskState.cellAssessments.map((assessment) => {
        const cell = coupledState.cells.find((c) => c.cell_id === assessment.cellId);
        return {
          type: 'Feature',
          id: assessment.cellId,
          geometry: cell?.geometry,
          properties: {
            ...assessment,
          },
        };
      }),
    };
  }, [activeRiskForecast, activeCoupledForecast, selectedNowcastHour]);

  // DEM Elevation GeoJSON Styling
  const getDEMStyle = (feature: any): L.PathOptions => {
    const elevation = feature?.properties?.elevation_m ?? 0;

    let fillColor = '#2E8B57'; // 0-10 m
    if (elevation > 75) {
      fillColor = '#6B3F1D';
    } else if (elevation > 50) {
      fillColor = '#8B5A2B';
    } else if (elevation > 25) {
      fillColor = '#B8860B';
    } else if (elevation > 10) {
      fillColor = '#6B8E23';
    }

    return {
      fillColor,
      fillOpacity: 0.25,
      color: '#4A3B32',
      weight: 0.5,
      opacity: 0.20,
      interactive: false,
    };
  };

  // Rainfall Intensity GeoJSON Styling
  const getRainfallStyle = (feature: any): L.PathOptions => {
    const intensity = feature?.properties?.rainfall_intensity_mm_hr ?? 0;

    let fillColor = '#DBEAFE';
    if (intensity > 100) {
      fillColor = '#B91C1C';
    } else if (intensity > 50) {
      fillColor = '#F59E0B';
    } else if (intensity > 20) {
      fillColor = '#60A5FA';
    } else if (intensity > 5) {
      fillColor = '#93C5FD';
    }

    return {
      fillColor,
      fillOpacity: 0.50,
      color: '#0F172A',
      weight: 1.2,
      opacity: 0.7,
    };
  };

  const onEachRainfallFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties as RainfallFeatureProperties;
    if (!props) return;

    const popupContent = `
      <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 170px; color: #0f172a;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 800; font-size: 10px; color: #1d4ed8; text-transform: uppercase;">Rainfall Radar</span>
          <span style="font-size: 8px; font-weight: 700; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; padding: 1px 4px; border-radius: 3px;">DEMO DATA</span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${props.zone_name || 'Mumbai Zone'}</div>
        <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin: 4px 0;">
          ${props.rainfall_intensity_mm_hr} <span style="font-size: 11px; font-weight: 600; color: #64748b;">mm/hr</span>
        </div>
        <div style="font-size: 10px; color: #64748b;">
          Category: <strong style="color: ${props.color};">${props.category}</strong>
        </div>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  // Runoff Generation GeoJSON Styling
  const getRunoffStyle = (feature: any): L.PathOptions => {
    const rate = feature?.properties?.runoff_rate_m3_s ?? 0;
    let fillColor = '#A5F3FC';
    if (rate > 100) fillColor = '#312E81';
    else if (rate > 50) fillColor = '#4338CA';
    else if (rate > 20) fillColor = '#2563EB';
    else if (rate > 5) fillColor = '#38BDF8';

    return {
      fillColor,
      fillOpacity: 0.55,
      color: '#1E1B4B',
      weight: 1.2,
      opacity: 0.8,
    };
  };

  const onEachRunoffFeature = (feature: any, layer: L.Layer) => {
    layer.bindPopup(() => {
      const currentForecast = forecastRef.current;
      const currentHour = hourRef.current;
      const grid = currentForecast?.horizons[currentHour];
      const cellIdx = PROTOTYPE_CATCHMENTS.findIndex((c) => c.cell_id === feature.id);
      const cellState = grid?.cells[cellIdx];
      const catchment = PROTOTYPE_CATCHMENTS[cellIdx];

      if (!cellState || !catchment) return '<div style="padding: 6px; font-size: 11px;">No telemetry</div>';

      return `
        <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 200px; color: #0f172a;">
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${cellState.zone_name || catchment.zone_name}</div>
              <div style="font-size: 9px; color: #64748b; font-family: monospace;">${cellState.cell_id} • T+${currentHour}</div>
            </div>
            <span style="font-size: 8px; font-weight: 800; background: #ecfeff; color: #0891b2; border: 1px solid #a5f3fc; padding: 1px 4px; border-radius: 3px;">PHASE 3A</span>
          </div>
          <div style="margin: 4px 0;">
            <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Runoff Flow Rate (Q)</span>
            <div style="font-size: 18px; font-weight: 900; color: #0284c7;">
              ${cellState.runoff_rate_m3_s.toFixed(2)} <span style="font-size: 11px; font-weight: 600; color: #64748b;">m³/s</span>
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; font-size: 10px; margin-bottom: 4px;">
            <div>Rainfall (I): <strong>${cellState.rainfall_intensity_mm_hr} mm/hr</strong></div>
            <div>Runoff Depth: <strong>${cellState.effective_runoff_depth_mm} mm</strong></div>
            <div>Coeff (C): <strong>${catchment.runoff_coefficient}</strong></div>
          </div>
          <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 3px;">
            MODEL OUTPUT / DERIVED • Rational Infiltration
          </div>
        </div>
      `;
    });
  };

  // 2D Surface Flow GeoJSON Styling
  const getSurfaceFlowStyle = (feature: any): L.PathOptions => {
    const depthCm = feature?.properties?.water_depth_cm ?? 0;
    let fillColor = '#DBEAFE';
    if (depthCm >= 100) fillColor = '#172554';
    else if (depthCm >= 50) fillColor = '#1D4ED8';
    else if (depthCm >= 20) fillColor = '#3B82F6';
    else if (depthCm >= 5) fillColor = '#93C5FD';

    return {
      fillColor,
      fillOpacity: 0.60,
      color: '#1E3A8A',
      weight: 1.2,
      opacity: 0.85,
    };
  };

  const onEachSurfaceFlowFeature = (feature: any, layer: L.Layer) => {
    layer.bindPopup(() => {
      const currentForecast = flowForecastRef.current;
      const currentHour = hourRef.current;
      const grid = currentForecast?.horizons[currentHour];
      const cellIdx = PROTOTYPE_CATCHMENTS.findIndex((c) => c.cell_id === feature.id);
      const cellState = grid?.cells[cellIdx];

      if (!cellState) return '<div style="padding: 6px; font-size: 11px;">No telemetry</div>';

      return `
        <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 200px; color: #0f172a;">
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${cellState.zone_name}</div>
              <div style="font-size: 9px; color: #64748b; font-family: monospace;">${cellState.cell_id} • T+${currentHour}</div>
            </div>
            <span style="font-size: 8px; font-weight: 800; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 1px 4px; border-radius: 3px;">PHASE 3B</span>
          </div>
          <div style="margin: 4px 0;">
            <span style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Surface Water Depth</span>
            <div style="font-size: 18px; font-weight: 900; color: #1d4ed8;">
              ${cellState.water_depth_cm.toFixed(1)} <span style="font-size: 11px; font-weight: 600; color: #64748b;">cm</span>
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; font-size: 10px; margin-bottom: 4px;">
            <div>Direction: <strong>${cellState.flow_direction} (${cellState.downstream_zone_name || 'Sink'})</strong></div>
            <div>Stored: <strong>${Math.round(cellState.retained_surface_volume_m3).toLocaleString()} m³</strong></div>
            <div>Slope: <strong>${cellState.slope_pct}%</strong></div>
          </div>
          <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 3px;">
            MODEL OUTPUT / DERIVED • 2D D8 Kinematic Flow
          </div>
        </div>
      `;
    });
  };

  // Coupled 1D-2D Flood Layer Styling (Phase 3D)
  const getCoupledStyle = (feature: any): L.PathOptions => {
    const depthCm = feature?.properties?.water_depth_cm ?? 0;
    let fillColor = '#DBEAFE';
    if (depthCm >= 100) fillColor = '#172554';
    else if (depthCm >= 50) fillColor = '#1D4ED8';
    else if (depthCm >= 20) fillColor = '#3B82F6';
    else if (depthCm >= 5) fillColor = '#93C5FD';

    return {
      fillColor,
      fillOpacity: 0.65,
      color: '#0284C7',
      weight: 1.5,
      opacity: 0.90,
    };
  };

  // Compact Redesigned Cell Popup (Requirement 8)
  const onEachCoupledFeature = (feature: any, layer: L.Layer) => {
    layer.bindPopup(() => {
      const currentForecast = coupledForecastRef.current;
      const currentHour = hourRef.current;
      const state = currentForecast?.horizons[currentHour];
      const cell = state?.cells.find((c) => c.cell_id === feature.id);
      const horizonKey = `T+${currentHour}` as 'T+0' | 'T+1' | 'T+2' | 'T+3';
      const riskAssessment = riskForecastRef.current?.horizons[horizonKey]?.cellAssessments.find(
        (a) => a.cellId === feature.id
      );

      if (!cell) return '<div style="padding: 6px; font-size: 11px;">No telemetry</div>';

      const riskColor = riskAssessment?.color || '#10B981';
      const riskLevel = riskAssessment?.riskLevel || 'LOW';

      return `
        <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 210px; color: #0f172a;">
          {/* Header */}
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${cell.zone_name}</div>
              <div style="font-size: 10px; color: #64748b; font-family: monospace;">${cell.cell_id} • T+${currentHour}</div>
            </div>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${riskColor}; color: white; shrink-0;">
              ${riskLevel}
            </span>
          </div>

          {/* 4 Core Metrics Grid */}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; margin-bottom: 6px;">
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; color: #64748b; display: block;">Flood Depth</span>
              <strong style="font-size: 14px; color: #0284c7;">${cell.water_depth_cm.toFixed(1)} cm</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; color: #64748b; display: block;">Risk Level</span>
              <strong style="font-size: 12px; color: ${riskColor};">${riskLevel}</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; color: #64748b; display: block;">Drainage Intake</span>
              <strong>${(cell.drainage_intake_volume_m3 / 1000).toFixed(1)}k m³</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; color: #64748b; display: block;">Surcharge Return</span>
              <strong style="color: ${cell.drainage_surcharge_return_m3 > 0 ? '#dc2626' : '#64748b'};">
                ${(cell.drainage_surcharge_return_m3 / 1000).toFixed(1)}k m³
              </strong>
            </div>
          </div>

          {/* Expandable Details */}
          <details style="font-size: 10px; color: #475569; margin-bottom: 6px; cursor: pointer;">
            <summary style="font-weight: 600; color: #2563eb;">More details</summary>
            <div style="padding-top: 4px; display: flex; flex-direction: column; gap: 2px;">
              <div>Elevation: <strong>${cell.elevation_m}m</strong></div>
              <div>Net Volume: <strong>${(cell.net_surface_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
              <div>Initial Overland: <strong>${(cell.initial_surface_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
            </div>
          </details>

          {/* Provenance */}
          <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 4px; display: flex; justify-content: space-between;">
            <span>MODEL OUTPUT / DERIVED</span>
            <span style="color: #0284c7; font-weight: 600;">PHASE 3D / 4B</span>
          </div>
        </div>
      `;
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.85, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.65, weight: 1.5 });
      },
    });
  };

  // Risk Assessment Styling (Phase 4B)
  const getRiskStyle = (feature: any): L.PathOptions => {
    const color = feature?.properties?.color ?? '#10b981';
    return {
      fillColor: color,
      fillOpacity: 0.65,
      color: '#0F172A',
      weight: 1.5,
      opacity: 0.90,
    };
  };

  const onEachRiskFeature = (feature: any, layer: L.Layer) => {
    layer.bindPopup(() => {
      const currentForecast = riskForecastRef.current;
      const currentHour = hourRef.current;
      const horizonKey = `T+${currentHour}` as 'T+0' | 'T+1' | 'T+2' | 'T+3';
      const state = currentForecast?.horizons[horizonKey];
      const assessment = state?.cellAssessments.find((a) => a.cellId === feature.id);

      if (!assessment) return '<div style="padding: 6px; font-size: 11px;">No assessment</div>';

      return `
        <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 210px; color: #0f172a;">
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${assessment.zoneName}</div>
              <div style="font-size: 10px; color: #64748b; font-family: monospace;">${assessment.cellId} • T+${currentHour}</div>
            </div>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${assessment.color}; color: white; shrink-0;">
              ${assessment.riskLevel}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; margin-bottom: 6px;">
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; color: #64748b; display: block;">Flood Depth</span>
              <strong style="font-size: 14px; color: #0284c7;">${assessment.depth_cm.toFixed(1)} cm</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span style="font-size: 9px; color: #64748b; display: block;">Drainage Status</span>
              <strong style="font-size: 11px;">${assessment.drainageNodeStatus ?? 'NORMAL'}</strong>
            </div>
          </div>

          <div style="font-size: 10px; color: #475569; margin-bottom: 6px;">
            <strong>Risk Factors:</strong>
            <ul style="margin: 2px 0 0 12px; padding: 0;">
              ${assessment.reasons.map((r) => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 4px; display: flex; justify-content: space-between;">
            <span>MODEL OUTPUT / DERIVED</span>
            <span style="color: ${assessment.color}; font-weight: 600;">PHASE 4B</span>
          </div>
        </div>
      `;
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.85, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.65, weight: 1.5 });
      },
    });
  };

  // Flood Inundation GeoJSON Styling (Phase 2B-3 Demo)
  const getFloodStyle = (feature: any): L.PathOptions => {
    const depth = feature?.properties?.water_depth_cm ?? 0;
    let fillColor = '#DBEAFE';
    if (depth > 100) fillColor = '#B91C1C';
    else if (depth > 50) fillColor = '#EA580C';
    else if (depth > 20) fillColor = '#F59E0B';
    else if (depth > 5) fillColor = '#93C5FD';

    return {
      fillColor,
      fillOpacity: 0.55,
      color: '#1E293B',
      weight: 1.2,
      opacity: 0.8,
    };
  };

  const onEachFloodFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties as FloodFeatureProperties;
    if (!props) return;

    layer.bindPopup(`
      <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 170px; color: #0f172a;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 800; font-size: 10px; color: #0284c7; text-transform: uppercase;">Inundation</span>
          <span style="font-size: 8px; font-weight: 700; color: #92400e; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">DEMO DATA</span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${props.area_name}</div>
        <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 4px 0;">
          ${props.water_depth_cm} <span style="font-size: 11px; font-weight: 600; color: #64748b;">cm</span>
        </div>
        <div style="font-size: 10px; color: #64748b;">
          Risk: <strong style="color: ${props.color === '#DBEAFE' ? '#1E3A8A' : props.color};">${props.risk_level}</strong>
        </div>
      </div>
    `);
  };

  return (
    <div className={`relative bg-slate-950 overflow-hidden flex flex-col ${className}`}>
      {/* Leaflet Map Canvas — Clean, no floating overlays obstructing view */}
      <LeafletMap
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={true}
        className="w-full flex-1 min-h-[360px] z-0"
      >
        <MapPanes />

        {/* 0. Base Map TileLayer */}
        {showBaseMap && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* 1. DEM Terrain Elevation Layer */}
        {showDEM && (
          <GeoJSON
            key="dem-geojson-layer"
            data={MOCK_DEM_GEOJSON as any}
            style={getDEMStyle}
            pane="demPane"
            interactive={false}
          />
        )}

        {/* 2. Rainfall Intensity Layer */}
        {showRainfall && (
          <GeoJSON
            key="rainfall-geojson-layer"
            data={MOCK_RAINFALL_GEOJSON as any}
            style={getRainfallStyle}
            onEachFeature={onEachRainfallFeature}
            pane="rainfallPane"
          />
        )}

        {/* 3. Runoff Generation Layer (Phase 3A) */}
        {showRunoff && runoffGeoJSON && (
          <GeoJSON
            key={`runoff-h${selectedNowcastHour}-${activeRunoffForecast?.status}`}
            data={runoffGeoJSON as any}
            style={getRunoffStyle}
            onEachFeature={onEachRunoffFeature}
            pane="runoffPane"
          />
        )}

        {/* 4. 2D Surface Flow Routing Layer (Phase 3B) */}
        {showSurfaceFlow && surfaceFlowGeoJSON && (
          <GeoJSON
            key={`flow-h${selectedNowcastHour}-${activeSurfaceFlowForecast?.status}`}
            data={surfaceFlowGeoJSON as any}
            style={getSurfaceFlowStyle}
            onEachFeature={onEachSurfaceFlowFeature}
            pane="surfaceFlowPane"
          />
        )}

        {/* 4.5. Coupled 1D-2D Flood Layer (Phase 3D) */}
        {showCoupled && coupledGeoJSON && (
          <GeoJSON
            key={`coupled-h${selectedNowcastHour}-${activeCoupledForecast?.status}`}
            data={coupledGeoJSON as any}
            style={getCoupledStyle}
            onEachFeature={onEachCoupledFeature}
            pane="coupledPane"
          />
        )}

        {/* 4.8. Flood Risk Scoring Layer (Phase 4B) */}
        {showRisk && riskGeoJSON && (
          <GeoJSON
            key={`risk-h${selectedNowcastHour}-${activeRiskForecast?.highestRiskAcrossAllHorizons}`}
            data={riskGeoJSON as any}
            style={getRiskStyle}
            onEachFeature={onEachRiskFeature}
            pane="riskPane"
          />
        )}

        {/* 5. Flood Inundation Layer */}
        {showFlood && (
          <GeoJSON
            key={`flood-nowcast-hour-${selectedNowcastHour}`}
            data={MOCK_NOWCAST_TIMESTEPS[selectedNowcastHour].features as any}
            style={getFloodStyle}
            onEachFeature={onEachFloodFeature}
            pane="floodPane"
          />
        )}

        {/* 6. Drainage Network Pipes (Phase 3C) */}
        {showDrainage &&
          activeDrainageForecast?.horizons[selectedNowcastHour]?.edges.map((edge: any) => {
            const { color } = getPipeUtilizationCategory(edge.utilization_pct);
            const positions: [number, number][] = [
              [edge.coordinates[0][1], edge.coordinates[0][0]],
              [edge.coordinates[1][1], edge.coordinates[1][0]],
            ];

            return (
              <Polyline
                key={`edge-${edge.id}-${selectedNowcastHour}`}
                positions={positions}
                pane="pipePane"
                pathOptions={{
                  color,
                  weight: edge.status === 'OVER_CAPACITY' ? 5 : edge.status === 'HIGH' ? 4 : 3,
                  opacity: 0.9,
                  dashArray: edge.status === 'OVER_CAPACITY' ? '6, 6' : undefined,
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1 min-w-[210px] text-slate-900 font-sans">
                    <div className="flex items-center justify-between border-b pb-1 font-bold">
                      <span>PIPE: {edge.id}</span>
                      <span className="px-1 py-0.2 rounded text-[9px] text-white" style={{ backgroundColor: color }}>
                        {edge.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 text-[11px]">{edge.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 p-1 rounded">
                      <span className="font-mono font-bold text-blue-700">{edge.from_node}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-mono font-bold text-emerald-700">{edge.to_node}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>Flow: <strong>{edge.actual_flow_m3_s} m³/s</strong></div>
                      <div>Capacity: <strong>{edge.capacity_m3_s} m³/s</strong></div>
                      <div>Util: <strong style={{ color }}>{edge.utilization_pct}%</strong></div>
                      <div>Slope: <strong>{(edge.slope * 100).toFixed(2)}%</strong></div>
                    </div>
                    <div className="text-[9px] text-slate-400 pt-1 border-t">
                      Provenance: {edge.provenance}
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* 7. Drainage Network Nodes (Phase 3C) */}
        {showDrainage &&
          activeDrainageForecast?.horizons[selectedNowcastHour]?.nodes.map((node: any) => {
            const isOutfall = node.node_type === 'OUTFALL';
            const { color } = getNodeSurchargeStatus(node.surcharge_ratio, isOutfall);
            const radius = isOutfall ? 7 : node.node_type === 'MANHOLE' ? 5 : 4;

            return (
              <CircleMarker
                key={`node-${node.id}-${selectedNowcastHour}`}
                center={[node.lat, node.lng]}
                radius={radius}
                pane="nodePane"
                pathOptions={{
                  color: '#0F172A',
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1 min-w-[210px] text-slate-900 font-sans">
                    <div className="flex items-center justify-between border-b pb-1 font-bold">
                      <span>{node.node_type}: {node.id}</span>
                      <span className="px-1 py-0.2 rounded text-[9px] text-white" style={{ backgroundColor: color }}>
                        {isOutfall ? 'MARINE OUTFALL' : node.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 text-[11px]">{node.name}</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>Inflow: <strong>{node.total_inflow_m3_s} m³/s</strong></div>
                      <div>Capacity: <strong>{node.node_capacity_m3_s} m³/s</strong></div>
                      <div>Discharge: <strong>{node.discharged_outflow_m3_s} m³/s</strong></div>
                      <div>
                        Surcharge: <strong className={node.surcharge_rate_m3_s > 0 ? 'text-red-600' : ''}>
                          {node.surcharge_rate_m3_s} m³/s
                        </strong>
                      </div>
                    </div>
                    {node.status_reason && (
                      <div className="text-[9px] text-slate-600 bg-amber-50 p-1 rounded">
                        {node.status_reason}
                      </div>
                    )}
                    <div className="text-[9px] text-slate-400 pt-1 border-t">
                      Provenance: {node.provenance}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </LeafletMap>
    </div>
  );
};
