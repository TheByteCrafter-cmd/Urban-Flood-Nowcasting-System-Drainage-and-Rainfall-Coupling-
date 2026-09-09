import React, { useState, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ArrowRight } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { LayerControl } from './LayerControl';
import { RainfallLegend } from './RainfallLegend';
import { DEMLegend } from './DEMLegend';
import { FloodLegend } from './FloodLegend';
import { RunoffLegend } from './RunoffLegend';
import { RunoffSummaryCard } from './RunoffSummaryCard';
import { SurfaceFlowLegend } from './SurfaceFlowLegend';
import { SurfaceFlowSummaryCard } from './SurfaceFlowSummaryCard';
import { DrainageLegend } from './DrainageLegend';
import { DrainageSummaryCard } from './DrainageSummaryCard';
import { CoupledSummaryCard } from './CoupledSummaryCard';
import { RiskLegend } from './RiskLegend';
import { NowcastTimeControl } from './NowcastTimeControl';
import { MOCK_RAINFALL_GEOJSON, RainfallFeatureProperties } from '../../mock/rainfall';
import { MOCK_DEM_GEOJSON } from '../../mock/dem';
import { FloodFeatureProperties } from '../../mock/flood';
import { PROTOTYPE_CATCHMENTS } from '../../mock/catchments';
import { MOCK_NOWCAST_TIMESTEPS, NowcastHour } from '../../mock/nowcast';
import { NormalizedWeatherObservation } from '../../types/weather';
import { RunoffForecast, RunoffDataStatus } from '../../types/runoff';
import { SurfaceFlowForecast } from '../../types/surfaceFlow';
import { CoupledForecast } from '../../types/coupling';
import { generateRunoffForecast } from '../../services/runoffService';
import { generateSurfaceFlowForecast } from '../../services/surfaceFlowService';
import { generateDrainageForecast, getPipeUtilizationCategory, getNodeSurchargeStatus } from '../../services/drainageService';
import { generateCoupledForecast } from '../../services/couplingService';
import { generateRiskForecast } from '../../services/riskService';
import L from 'leaflet';

interface MapContainerProps {
  cityId?: string;
  cityName?: string;
  center?: [number, number]; // Handles both [lat, lng] and [lng, lat]
  zoom?: number;
  onMapLoad?: (map: L.Map) => void;
  className?: string;
  weather?: NormalizedWeatherObservation | null;
  runoffForecast?: RunoffForecast | null;
  surfaceFlowForecast?: SurfaceFlowForecast | null;
  coupledForecast?: CoupledForecast | null;
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
  cityName = 'Mumbai Metropolitan Region',
  center = [19.0760, 72.8777],
  zoom = 11.5,
  className = 'h-full w-full',
  weather,
  runoffForecast,
  surfaceFlowForecast,
  coupledForecast,
}) => {
  const [showRainfall, setShowRainfall] = useState<boolean>(true); // Default ON
  const [showDEM, setShowDEM] = useState<boolean>(true); // Default ON for Phase 2B-2
  const [showRunoff, setShowRunoff] = useState<boolean>(true); // Default ON for Phase 3A
  const [showSurfaceFlow, setShowSurfaceFlow] = useState<boolean>(true); // Default ON for Phase 3B
  const [showDrainage, setShowDrainage] = useState<boolean>(true); // Default ON for Phase 3C
  const [showCoupled, setShowCoupled] = useState<boolean>(true); // Default ON for Phase 3D
  const [showRisk, setShowRisk] = useState<boolean>(false); // Phase 4B Risk Scoring
  const [showFlood, setShowFlood] = useState<boolean>(true); // Default ON for Phase 2B-3 Demo
  const [selectedNowcastHour, setSelectedNowcastHour] = useState<NowcastHour>(0); // Default T+0 Current
  const [activeHudTab, setActiveHudTab] = useState<'coupled' | 'drainage' | 'flow' | 'runoff'>('coupled'); // Active HUD tab

  // Normalize coordinate order: Leaflet requires [lat, lng]
  const mapCenter: [number, number] = center[0] > 50 ? [center[1], center[0]] : center;

  const handleToggleRainfall = (active: boolean) => {
    setShowRainfall(active);
  };

  const handleToggleDEM = (active: boolean) => {
    setShowDEM(active);
  };

  const handleToggleRunoff = (active: boolean) => {
    setShowRunoff(active);
    if (active) setActiveHudTab('runoff');
  };

  const handleToggleSurfaceFlow = (active: boolean) => {
    setShowSurfaceFlow(active);
    if (active) setActiveHudTab('flow');
  };

  const handleToggleDrainage = (active: boolean) => {
    setShowDrainage(active);
    if (active) setActiveHudTab('drainage');
  };

  const handleToggleCoupled = (active: boolean) => {
    setShowCoupled(active);
    if (active) setActiveHudTab('coupled');
  };

  const handleToggleRisk = (active: boolean) => {
    setShowRisk(active);
  };

  const handleToggleFlood = (active: boolean) => {
    setShowFlood(active);
  };

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
    if (activeRunoffForecast) return generateDrainageForecast(activeRunoffForecast);
    return null;
  }, [activeRunoffForecast]);

  // Derive 1D-2D coupled forecast from Phase 3A runoff forecast
  const activeCoupledForecast = React.useMemo(() => {
    if (coupledForecast) return coupledForecast;
    if (activeRunoffForecast) return generateCoupledForecast(activeRunoffForecast);
    return null;
  }, [coupledForecast, activeRunoffForecast]);

  // Derive Risk Forecast from Coupled Forecast (Phase 4B)
  const activeRiskForecast = React.useMemo(() => {
    if (activeCoupledForecast) return generateRiskForecast(activeCoupledForecast);
    return null;
  }, [activeCoupledForecast]);

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
      features: grid.cells.map((cell) => {
        return {
          type: 'Feature',
          id: cell.cell_id,
          geometry: cell.geometry,
          properties: {
            ...cell,
          },
        };
      }),
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

  // DEM Elevation GeoJSON Styling (Subtle & Muted Terrain Palette, fillOpacity 0.30 - Non-interactive terrain context)
  const getDEMStyle = (feature: any): L.PathOptions => {
    const elevation = feature?.properties?.elevation_m ?? 0;

    let fillColor = '#2E8B57'; // 0-10 m (Low / Coastal Muted Sea Green)
    if (elevation > 75) {
      fillColor = '#6B3F1D'; // 75+ m (Very High Deep Brown)
    } else if (elevation > 50) {
      fillColor = '#8B5A2B'; // 50-75 m (High Muted Brown)
    } else if (elevation > 25) {
      fillColor = '#B8860B'; // 25-50 m (Elevated Muted Ochre)
    } else if (elevation > 10) {
      fillColor = '#6B8E23'; // 10-25 m (Moderate Muted Olive)
    }

    return {
      fillColor,
      fillOpacity: 0.30,
      color: '#4A3B32',
      weight: 0.5,
      opacity: 0.20,
      interactive: false,
    };
  };

  // Rainfall Intensity GeoJSON Styling (fillOpacity 0.60)
  const getRainfallStyle = (feature: any): L.PathOptions => {
    const intensity = feature?.properties?.rainfall_intensity_mm_hr ?? 0;

    let fillColor = '#DBEAFE'; // 0-5 mm/hr (Soft Sky Blue)
    if (intensity > 100) {
      fillColor = '#B91C1C'; // 100+ mm/hr (Deep Crimson Red)
    } else if (intensity > 50) {
      fillColor = '#F59E0B'; // 50-100 mm/hr (Muted Amber)
    } else if (intensity > 20) {
      fillColor = '#60A5FA'; // 20-50 mm/hr (Royal Blue)
    } else if (intensity > 5) {
      fillColor = '#93C5FD'; // 5-20 mm/hr (Light Blue)
    }

    return {
      fillColor,
      fillOpacity: 0.60,
      color: '#0F172A',
      weight: 1.5,
      opacity: 0.8,
    };
  };

  const onEachRainfallFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties as RainfallFeatureProperties;
    if (!props) return;

    const popupContent = `
      <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 150px;">
        <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #1d4ed8;">RAINFALL</span>
          <span style="font-size: 9px; font-weight: 700; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px;">DEMO DATA</span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${props.zone_name || 'Mumbai Zone'}</div>
        <div style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; margin-bottom: 2px;">Rainfall Intensity</div>
        <div style="font-size: 18px; font-weight: 800; color: #1d4ed8; margin-bottom: 4px;">
          ${props.rainfall_intensity_mm_hr} mm/hr
        </div>
        <div style="font-size: 11px; color: #64748b;">
          <span>Category: </span>
          <span style="font-weight: 700; color: ${props.color};">${props.category} mm/hr</span>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.85, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.60, weight: 1.5 });
      },
    });
  };

  // Flood Inundation GeoJSON Styling (fillOpacity 0.55, depth-based semantic palette)
  const getFloodStyle = (feature: any): L.PathOptions => {
    const depth = feature?.properties?.water_depth_cm ?? 0;

    let fillColor = '#DBEAFE'; // 0-5 cm (Low)
    if (depth > 100) {
      fillColor = '#B91C1C'; // 100+ cm (Critical)
    } else if (depth > 50) {
      fillColor = '#EA580C'; // 50-100 cm (Very High)
    } else if (depth > 20) {
      fillColor = '#F59E0B'; // 20-50 cm (High)
    } else if (depth > 5) {
      fillColor = '#93C5FD'; // 5-20 cm (Moderate)
    }

    return {
      fillColor,
      fillOpacity: 0.55,
      color: '#1E293B',
      weight: 1.5,
      opacity: 0.8,
    };
  };

  const onEachFloodFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties as FloodFeatureProperties;
    if (!props) return;

    const popupContent = `
      <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 175px;">
        <div style="border-bottom: 2px solid ${props.color === '#DBEAFE' ? '#3B82F6' : props.color}; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${props.color === '#DBEAFE' ? '#1E293B' : props.color};">FLOOD INUNDATION</span>
          <span style="font-size: 9px; font-weight: 700; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px;">DEMO DATA</span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${props.area_name}</div>
        ${props.street_name ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${props.street_name}</div>` : ''}
        <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #1d4ed8; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">
          FORECAST: T+${selectedNowcastHour} (${selectedNowcastHour === 0 ? 'CURRENT' : `+${selectedNowcastHour}H`})
        </div>
        <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Water Depth</div>
        <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 6px; display: flex; align-items: baseline; gap: 4px;">
          <span>${props.water_depth_cm}</span>
          <span style="font-size: 13px; font-weight: 600; color: #64748b;">cm</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; background-color: #f8fafc; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <span style="color: #64748b; font-weight: 600;">Risk Level:</span>
          <span style="font-weight: 800; color: ${props.color === '#DBEAFE' ? '#1E3A8A' : props.color};">${props.risk_level}</span>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.75, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.55, weight: 1.5 });
      },
    });
  };

  // Runoff Generation GeoJSON Styling (Phase 3A, fillOpacity 0.55, palette from minimal to extreme)
  const getRunoffStyle = (feature: any): L.PathOptions => {
    const rate = feature?.properties?.runoff_rate_m3_s ?? 0;

    let fillColor = '#A5F3FC'; // 0-5 m³/s (Minimal)
    if (rate > 100) {
      fillColor = '#312E81'; // 100+ m³/s (Extreme)
    } else if (rate > 50) {
      fillColor = '#4338CA'; // 50-100 m³/s (High)
    } else if (rate > 20) {
      fillColor = '#2563EB'; // 20-50 m³/s (Substantial)
    } else if (rate > 5) {
      fillColor = '#38BDF8'; // 5-20 m³/s (Moderate)
    }

    return {
      fillColor,
      fillOpacity: 0.55,
      color: '#1E1B4B',
      weight: 1.5,
      opacity: 0.85,
    };
  };

  const getStatusBadgeHtml = (status: RunoffDataStatus) => {
    switch (status) {
      case 'LIVE':
        return '<span style="font-size: 9px; font-weight: 800; color: #065f46; background-color: #d1fae5; border: 1px solid #6ee7b7; padding: 2px 6px; border-radius: 4px;">LIVE RUNOFF</span>';
      case 'DERIVED':
        return '<span style="font-size: 9px; font-weight: 800; color: #0e7490; background-color: #ecfeff; border: 1px solid #a5f3fc; padding: 2px 6px; border-radius: 4px;">DERIVED NOWCAST</span>';
      case 'STALE':
        return '<span style="font-size: 9px; font-weight: 800; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px;">STALE INPUT</span>';
      case 'DEMO':
        return '<span style="font-size: 9px; font-weight: 800; color: #1e40af; background-color: #dbeafe; border: 1px solid #93c5fd; padding: 2px 6px; border-radius: 4px;">DEMO BASELINE</span>';
      case 'ERROR':
        return '<span style="font-size: 9px; font-weight: 800; color: #991b1b; background-color: #fee2e2; border: 1px solid #fca5a5; padding: 2px 6px; border-radius: 4px;">ERROR</span>';
    }
  };

  const onEachRunoffFeature = (feature: any, layer: L.Layer) => {
    layer.bindPopup(() => {
      const currentForecast = forecastRef.current;
      const currentHour = hourRef.current;
      const grid = currentForecast?.horizons[currentHour];
      const cellIdx = PROTOTYPE_CATCHMENTS.findIndex((c) => c.cell_id === feature.id);
      const cellState = grid?.cells[cellIdx];
      const catchment = PROTOTYPE_CATCHMENTS[cellIdx];

      if (!cellState || !catchment) {
        return '<div style="padding: 8px; font-family: Inter, sans-serif; font-size: 11px;">No telemetry data available</div>';
      }

      const statusBadge = getStatusBadgeHtml(cellState.status);

      return `
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 220px;">
          <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #0891b2;">RUNOFF GENERATION</span>
            ${statusBadge}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${cellState.zone_name || catchment.zone_name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; font-family: monospace;">${cellState.cell_id} • Area: ${(catchment.area_m2 / 1e6).toFixed(1)} km²</div>

          <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #0284c7; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">
            HORIZON: T+${currentHour} (${currentHour === 0 ? 'CURRENT' : `+${currentHour}H`})
          </div>

          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">Runoff Flow Rate (q_gen)</div>
          <div style="font-size: 20px; font-weight: 900; color: #0284c7; margin-bottom: 4px; display: flex; align-items: baseline; gap: 4px;">
            <span>${cellState.runoff_rate_m3_s.toFixed(2)}</span>
            <span style="font-size: 12px; font-weight: 600; color: #64748b;">m³/s</span>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px; font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Rainfall Intensity (I):</span>
              <strong style="color: #0f172a;">${cellState.rainfall_intensity_mm_hr} mm/hr</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Runoff Depth (R):</span>
              <strong style="color: #0f172a;">${cellState.effective_runoff_depth_mm} mm</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Runoff Coeff (C):</span>
              <strong style="color: #0f172a;">${catchment.runoff_coefficient} (f_imp: ${(catchment.impervious_fraction * 100).toFixed(0)}%)</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Water Balance:</span>
              <strong style="color: #059669;">${cellState.water_balance_conserved ? '✓ Conserved' : 'Violation'}</strong>
            </div>
          </div>

          <div style="font-size: 9px; color: #94a3b8; line-height: 1.3;">
            <div><strong style="color: #64748b;">Provenance:</strong> ASSUMED_PROTOTYPE (CPHEEO)</div>
            <div style="font-style: italic;">Runoff generation input to routing. Not street flood depth.</div>
          </div>
        </div>
      `;
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.80, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.55, weight: 1.5 });
      },
    });
  };

  // 2D Surface Flow GeoJSON Styling (Phase 3B, water depth in cm, palette from light blue to deep navy)
  const getSurfaceFlowStyle = (feature: any): L.PathOptions => {
    const depthCm = feature?.properties?.water_depth_cm ?? 0;

    let fillColor = '#DBEAFE'; // Low (0-5 cm)
    if (depthCm >= 100) {
      fillColor = '#172554'; // Critical (100+ cm)
    } else if (depthCm >= 50) {
      fillColor = '#1D4ED8'; // Very High (50-100 cm)
    } else if (depthCm >= 20) {
      fillColor = '#3B82F6'; // High (20-50 cm)
    } else if (depthCm >= 5) {
      fillColor = '#93C5FD'; // Moderate (5-20 cm)
    }

    return {
      fillColor,
      fillOpacity: 0.60,
      color: '#1E3A8A',
      weight: 1.5,
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
      const catchment = PROTOTYPE_CATCHMENTS[cellIdx];

      if (!cellState || !catchment) {
        return '<div style="padding: 8px; font-family: Inter, sans-serif; font-size: 11px;">No telemetry data available</div>';
      }

      const statusBadge = getStatusBadgeHtml(cellState.status);

      return `
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 230px;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #1d4ed8;">2D SURFACE FLOW</span>
            ${statusBadge}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${cellState.zone_name || catchment.zone_name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; font-family: monospace;">${cellState.cell_id} • Elev: ${cellState.elevation_m}m • Slope: ${cellState.slope_pct}%</div>

          <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #1d4ed8; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">
            HORIZON: T+${currentHour} (${currentHour === 0 ? 'CURRENT' : `+${currentHour}H`})
          </div>

          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">Surface Water Depth</div>
          <div style="font-size: 20px; font-weight: 900; color: #1d4ed8; margin-bottom: 4px; display: flex; align-items: baseline; gap: 4px;">
            <span>${cellState.water_depth_cm.toFixed(1)}</span>
            <span style="font-size: 12px; font-weight: 600; color: #64748b;">cm</span>
            <span style="font-size: 10px; font-weight: 700; margin-left: 6px; color: ${cellState.color};">(${cellState.depth_category})</span>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-bottom: 6px; font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Flow Direction:</span>
              <strong style="color: #0f172a;">${cellState.flow_direction} (${cellState.downstream_zone_name || 'Sink'})</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Stored Water:</span>
              <strong style="color: #0f172a;">${Math.round(cellState.retained_surface_volume_m3).toLocaleString('en-IN')} m³</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Upstream Inflow:</span>
              <strong style="color: #0f172a;">${Math.round(cellState.upstream_inflow_volume_m3).toLocaleString('en-IN')} m³</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Discharged Outflow:</span>
              <strong style="color: #0f172a;">${Math.round(cellState.transferred_outflow_m3 + cellState.boundary_outflow_m3).toLocaleString('en-IN')} m³</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Mass Balance:</span>
              <strong style="color: #059669;">${cellState.water_balance_conserved ? '✓ Conserved' : 'Violation'}</strong>
            </div>
          </div>

          <div style="font-size: 9px; color: #94a3b8; line-height: 1.3;">
            <div><strong style="color: #64748b;">Terrain:</strong> ASSUMED_PROTOTYPE DEM (5×5 D8 routing)</div>
            <div style="font-style: italic;">Prototype 2D surface-flow simulation. Not calibrated municipal flood prediction.</div>
          </div>
        </div>
      `;
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.80, weight: 2.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.60, weight: 1.5 });
      },
    });
  };

  const getCoupledStyle = (feature: any): L.PathOptions => {
    const depthCm = feature?.properties?.water_depth_cm ?? 0;
    let fillColor = '#DBEAFE'; // Low (0-5 cm)
    if (depthCm >= 100) {
      fillColor = '#172554'; // Critical (100+ cm)
    } else if (depthCm >= 50) {
      fillColor = '#1D4ED8'; // Very High (50-100 cm)
    } else if (depthCm >= 20) {
      fillColor = '#3B82F6'; // High (20-50 cm)
    } else if (depthCm >= 5) {
      fillColor = '#93C5FD'; // Moderate (5-20 cm)
    }

    return {
      fillColor,
      fillOpacity: 0.65,
      color: '#0284C7',
      weight: 1.5,
      opacity: 0.90,
    };
  };

  const onEachCoupledFeature = (feature: any, layer: L.Layer) => {
    layer.bindPopup(() => {
      const currentForecast = coupledForecastRef.current;
      const currentHour = hourRef.current;
      const state = currentForecast?.horizons[currentHour];
      const cell = state?.cells.find((c) => c.cell_id === feature.id);

      if (!cell) {
        return '<div style="padding: 8px; font-family: Inter, sans-serif; font-size: 11px;">No telemetry data available</div>';
      }

      const statusBadge = getStatusBadgeHtml(cell.status);

      return `
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 250px;">
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #0369a1;">1D-2D COUPLED MODEL</span>
            ${statusBadge}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${cell.zone_name}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; font-family: monospace;">${cell.cell_id} • Elev: ${cell.elevation_m}m</div>

          <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #0369a1; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">
            HORIZON: T+${currentHour} (${currentHour === 0 ? 'CURRENT' : `+${currentHour}H`})
          </div>

          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">Coupled Inundation Depth</div>
          <div style="font-size: 20px; font-weight: 900; color: #0284c7; margin-bottom: 4px; display: flex; align-items: baseline; gap: 4px;">
            <span>${cell.water_depth_cm.toFixed(1)}</span>
            <span style="font-size: 12px; font-weight: 600; color: #64748b;">cm</span>
            <span style="font-size: 10px; font-weight: 700; margin-left: 6px; color: ${cell.color};">(${cell.depth_category})</span>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; font-size: 10px; font-family: monospace; margin-bottom: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>Initial Overland: <strong>${(cell.initial_surface_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
            <div>Drainage Intake: <strong style="color: #059669;">-${(cell.drainage_intake_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
            <div>Surcharge Return: <strong style="color: ${cell.drainage_surcharge_return_m3 > 0 ? '#dc2626' : '#64748b'};">+${(cell.drainage_surcharge_return_m3 / 1000).toFixed(1)}k m³</strong></div>
            <div>Net Stored: <strong>${(cell.net_surface_volume_m3 / 1000).toFixed(1)}k m³</strong></div>
          </div>

          <div style="font-size: 9px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 4px;">
            <span>Classification: <strong>MODEL OUTPUT</strong></span>
            <span style="color: #0284c7; font-weight: 600;">PHASE 3D</span>
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

  // Risk Assessment GeoJSON Styling (Phase 4B)
  const getRiskStyle = (feature: any): L.PathOptions => {
    const color = feature?.properties?.color ?? '#10b981';
    return {
      fillColor: color,
      fillOpacity: 0.65,
      color: '#0F172A',
      weight: 2,
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

      if (!assessment) {
        return '<div style="padding: 8px; font-family: Inter, sans-serif; font-size: 11px;">No assessment available</div>';
      }

      return `
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 250px;">
          <div style="border-bottom: 2px solid ${assessment.color}; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${assessment.color};">RISK ASSESSMENT</span>
            <span style="font-size: 9px; font-weight: 800; color: #fff; background-color: ${assessment.color}; padding: 2px 6px; border-radius: 4px;">${assessment.riskLevel}</span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 1px;">${assessment.zoneName}</div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; font-family: monospace;">${assessment.cellId} • Horizon: T+${currentHour}</div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; font-size: 11px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">Inundation Depth:</span>
              <strong>${assessment.depth_cm.toFixed(1)} cm</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">Baseline Depth Risk:</span>
              <span>${assessment.depthCategory}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">Drainage Node Status:</span>
              <strong>${assessment.drainageNodeStatus ?? 'NONE'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Pipe Overcapacity:</span>
              <strong style="color: ${assessment.pipeOverCapacity ? '#dc2626' : '#059669'};">${assessment.pipeOverCapacity ? 'YES' : 'NO'}</strong>
            </div>
          </div>

          <div style="font-size: 10px; color: #334155; margin-bottom: 6px; line-height: 1.3;">
            <strong style="color: #475569;">Factors:</strong>
            <ul style="margin: 2px 0 0 12px; padding: 0;">
              ${assessment.reasons.map((r) => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <div style="font-size: 9px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 4px;">
            <span>Classification: <strong>MODEL OUTPUT / DERIVED</strong></span>
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

  return (
    <div className={`relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col ${className}`}>
      {/* Top Left Context Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-xs text-white px-3.5 py-2 rounded-lg border border-slate-700/80 shadow-md flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <h2 className="text-xs font-bold tracking-wide uppercase text-slate-300">GIS Command Map</h2>
            <p className="text-xs font-semibold text-white">{cityName}</p>
          </div>
        </div>
        <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />
        <div className="hidden sm:flex items-center gap-2">
          {weather?.status === 'LIVE' ? (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IMD LIVE FEED
            </span>
          ) : (
            <DemoBadge compact />
          )}
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
            LEAFLET GIS READY
          </span>
        </div>
      </div>

      {/* Floating Nowcast Time Control (Top Center) */}
      {(showFlood || showRunoff || showSurfaceFlow) && (
        <div className="absolute top-16 sm:top-3 left-1/2 -translate-x-1/2 z-[1000] max-w-[95vw]">
          <NowcastTimeControl
            selectedHour={selectedNowcastHour}
            onSelectHour={setSelectedNowcastHour}
          />
        </div>
      )}

      {/* Floating Layer Controller (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] hidden sm:block">
        <LayerControl
          showRainfall={showRainfall}
          onToggleRainfall={handleToggleRainfall}
          showDEM={showDEM}
          onToggleDEM={handleToggleDEM}
          showRunoff={showRunoff}
          onToggleRunoff={handleToggleRunoff}
          showSurfaceFlow={showSurfaceFlow}
          onToggleSurfaceFlow={handleToggleSurfaceFlow}
          showFlood={showFlood}
          onToggleFlood={handleToggleFlood}
          showDrainage={showDrainage}
          onToggleDrainage={handleToggleDrainage}
          showCoupled={showCoupled}
          onToggleCoupled={handleToggleCoupled}
          showRisk={showRisk}
          onToggleRisk={handleToggleRisk}
        />
      </div>

      {/* Floating Hydrology Summary Card (Bottom Right) */}
      {(showSurfaceFlow || showRunoff || showDrainage || showCoupled) && (
        <div className="absolute bottom-6 right-3 z-[1000] hidden md:flex flex-col gap-1">
          {/* Tab switcher for active components */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800 self-end text-[10px] shadow-lg">
            {showCoupled && (
              <button
                type="button"
                onClick={() => setActiveHudTab('coupled')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  activeHudTab === 'coupled'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Coupled
              </button>
            )}
            {showDrainage && (
              <button
                type="button"
                onClick={() => setActiveHudTab('drainage')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  activeHudTab === 'drainage'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Drainage
              </button>
            )}
            {showSurfaceFlow && (
              <button
                type="button"
                onClick={() => setActiveHudTab('flow')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  activeHudTab === 'flow'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2D Flow
              </button>
            )}
            {showRunoff && (
              <button
                type="button"
                onClick={() => setActiveHudTab('runoff')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  activeHudTab === 'runoff'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Runoff
              </button>
            )}
          </div>

          {activeHudTab === 'coupled' && showCoupled ? (
            <CoupledSummaryCard
              coupledState={activeCoupledForecast?.horizons[selectedNowcastHour] ?? null}
              selectedHour={selectedNowcastHour}
            />
          ) : activeHudTab === 'drainage' && showDrainage ? (
            <DrainageSummaryCard
              networkState={activeDrainageForecast?.horizons[selectedNowcastHour] ?? null}
              selectedHour={selectedNowcastHour}
            />
          ) : activeHudTab === 'flow' && showSurfaceFlow ? (
            <SurfaceFlowSummaryCard
              flowGrid={activeSurfaceFlowForecast?.horizons[selectedNowcastHour] ?? null}
              selectedHour={selectedNowcastHour}
            />
          ) : showRunoff ? (
            <RunoffSummaryCard
              runoffGrid={activeRunoffForecast?.horizons[selectedNowcastHour] ?? null}
              selectedHour={selectedNowcastHour}
            />
          ) : null}
        </div>
      )}

      {/* Floating Stacked Legends (Bottom Left) */}
      <div className="absolute bottom-6 left-3 z-[1000] flex flex-col sm:flex-row gap-2 max-w-[calc(100%-400px)] overflow-x-auto pb-1 pointer-events-auto">
        {showDEM && <DEMLegend />}
        {showRainfall && <RainfallLegend />}
        {showRunoff && <RunoffLegend />}
        {showSurfaceFlow && <SurfaceFlowLegend />}
        {showDrainage && <DrainageLegend />}
        {showCoupled && <FloodLegend badgeText="COUPLED DEPTH" />}
        {showRisk && <RiskLegend />}
        {showFlood && !showCoupled && <FloodLegend />}
      </div>

      {/* Leaflet Map Canvas */}
      <LeafletMap
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={true}
        className="w-full flex-1 min-h-[500px] z-0"
      >
        <MapPanes />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. DEM Terrain Elevation Layer (Visual terrain context only - non-interactive) */}
        {showDEM && (
          <GeoJSON
            key="dem-geojson-layer"
            data={MOCK_DEM_GEOJSON as any}
            style={getDEMStyle}
            pane="demPane"
            interactive={false}
          />
        )}

        {/* 2. Rainfall Intensity Layer (rainfallPane, zIndex 450) */}
        {showRainfall && (
          <GeoJSON
            key="rainfall-geojson-layer"
            data={MOCK_RAINFALL_GEOJSON as any}
            style={getRainfallStyle}
            onEachFeature={onEachRainfallFeature}
            pane="rainfallPane"
          />
        )}

        {/* 3. Runoff Generation Layer (Phase 3A: runoffPane, zIndex 480) */}
        {showRunoff && runoffGeoJSON && (
          <GeoJSON
            key={`runoff-h${selectedNowcastHour}-${activeRunoffForecast?.status}-${activeRunoffForecast?.generated_at}`}
            data={runoffGeoJSON as any}
            style={getRunoffStyle}
            onEachFeature={onEachRunoffFeature}
            pane="runoffPane"
          />
        )}

        {/* 4. 2D Surface Flow Routing Layer (Phase 3B: surfaceFlowPane, zIndex 490) */}
        {showSurfaceFlow && surfaceFlowGeoJSON && (
          <GeoJSON
            key={`flow-h${selectedNowcastHour}-${activeSurfaceFlowForecast?.status}-${activeSurfaceFlowForecast?.generated_at}`}
            data={surfaceFlowGeoJSON as any}
            style={getSurfaceFlowStyle}
            onEachFeature={onEachSurfaceFlowFeature}
            pane="surfaceFlowPane"
          />
        )}

        {/* 4.5. Coupled 1D-2D Flood Layer (Phase 3D: coupledPane, zIndex 495) */}
        {showCoupled && coupledGeoJSON && (
          <GeoJSON
            key={`coupled-h${selectedNowcastHour}-${activeCoupledForecast?.status}-${activeCoupledForecast?.generated_at}`}
            data={coupledGeoJSON as any}
            style={getCoupledStyle}
            onEachFeature={onEachCoupledFeature}
            pane="coupledPane"
          />
        )}

        {/* 4.8. Flood Risk Scoring Layer (Phase 4B: riskPane, zIndex 508) */}
        {showRisk && riskGeoJSON && (
          <GeoJSON
            key={`risk-h${selectedNowcastHour}-${activeRiskForecast?.highestRiskAcrossAllHorizons}`}
            data={riskGeoJSON as any}
            style={getRiskStyle}
            onEachFeature={onEachRiskFeature}
            pane="riskPane"
          />
        )}

        {/* 5. Flood Inundation Layer (floodPane, zIndex 500) */}
        {showFlood && (
          <GeoJSON
            key={`flood-nowcast-hour-${selectedNowcastHour}`}
            data={MOCK_NOWCAST_TIMESTEPS[selectedNowcastHour].features as any}
            style={getFloodStyle}
            onEachFeature={onEachFloodFeature}
            pane="floodPane"
          />
        )}

        {/* 6. Drainage Network Pipes (Phase 3C: pipePane, zIndex 510) */}
        {showDrainage &&
          activeDrainageForecast?.horizons[selectedNowcastHour]?.edges.map((edge) => {
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
                  <div className="text-xs p-1 space-y-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b pb-1 font-bold">
                      <span>DRAINAGE PIPE: {edge.id}</span>
                      <span className="px-1 py-0.5 rounded text-[9px] text-white" style={{ backgroundColor: color }}>
                        {edge.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">{edge.name}</div>
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

        {/* 7. Drainage Network Nodes (Phase 3C: nodePane, zIndex 520) */}
        {showDrainage &&
          activeDrainageForecast?.horizons[selectedNowcastHour]?.nodes.map((node) => {
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
                  <div className="text-xs p-1 space-y-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b pb-1 font-bold">
                      <span>{node.node_type}: {node.id}</span>
                      <span className="px-1 py-0.5 rounded text-[9px] text-white" style={{ backgroundColor: color }}>
                        {isOutfall ? 'MARINE OUTFALL' : node.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800">{node.name}</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div>Inflow: <strong>{node.total_inflow_m3_s} m³/s</strong></div>
                      <div>Cap: <strong>{node.node_capacity_m3_s} m³/s</strong></div>
                      <div>Discharge: <strong>{node.discharged_outflow_m3_s} m³/s</strong></div>
                      <div>Surcharge: <strong className={node.surcharge_rate_m3_s > 0 ? 'text-red-600' : ''}>{node.surcharge_rate_m3_s} m³/s</strong></div>
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
