import React, { useState, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { LayerControl } from './LayerControl';
import { RainfallLegend } from './RainfallLegend';
import { DEMLegend } from './DEMLegend';
import { FloodLegend } from './FloodLegend';
import { RunoffLegend } from './RunoffLegend';
import { RunoffSummaryCard } from './RunoffSummaryCard';
import { SurfaceFlowLegend } from './SurfaceFlowLegend';
import { SurfaceFlowSummaryCard } from './SurfaceFlowSummaryCard';
import { NowcastTimeControl } from './NowcastTimeControl';
import { MOCK_RAINFALL_GEOJSON, RainfallFeatureProperties } from '../../mock/rainfall';
import { MOCK_DEM_GEOJSON } from '../../mock/dem';
import { FloodFeatureProperties } from '../../mock/flood';
import { PROTOTYPE_CATCHMENTS } from '../../mock/catchments';
import { MOCK_NOWCAST_TIMESTEPS, NowcastHour } from '../../mock/nowcast';
import { NormalizedWeatherObservation } from '../../types/weather';
import { RunoffForecast, RunoffDataStatus } from '../../types/runoff';
import { SurfaceFlowForecast } from '../../types/surfaceFlow';
import { generateRunoffForecast } from '../../services/runoffService';
import { generateSurfaceFlowForecast } from '../../services/surfaceFlowService';
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
}) => {
  const [showRainfall, setShowRainfall] = useState<boolean>(true); // Default ON
  const [showDEM, setShowDEM] = useState<boolean>(true); // Default ON for Phase 2B-2
  const [showRunoff, setShowRunoff] = useState<boolean>(true); // Default ON for Phase 3A
  const [showSurfaceFlow, setShowSurfaceFlow] = useState<boolean>(true); // Default ON for Phase 3B
  const [showFlood, setShowFlood] = useState<boolean>(true); // Default ON for Phase 2B-3 Demo
  const [selectedNowcastHour, setSelectedNowcastHour] = useState<NowcastHour>(0); // Default T+0 Current
  const [activeHudTab, setActiveHudTab] = useState<'flow' | 'runoff'>('flow'); // Active HUD tab

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

  // Keep live references so that popups always read the exact current forecast & horizon
  const forecastRef = React.useRef(activeRunoffForecast);
  forecastRef.current = activeRunoffForecast;

  const flowForecastRef = React.useRef(activeSurfaceFlowForecast);
  flowForecastRef.current = activeSurfaceFlowForecast;

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
        />
      </div>

      {/* Floating Hydrology Summary Card (Bottom Right) */}
      {(showSurfaceFlow || showRunoff) && (
        <div className="absolute bottom-6 right-3 z-[1000] hidden md:flex flex-col gap-1">
          {/* Tab switcher if both are active */}
          {showSurfaceFlow && showRunoff && (
            <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800 self-end text-[10px] shadow-lg">
              <button
                type="button"
                onClick={() => setActiveHudTab('flow')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  activeHudTab === 'flow'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2D Surface Flow
              </button>
              <button
                type="button"
                onClick={() => setActiveHudTab('runoff')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  activeHudTab === 'runoff'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Runoff Engine
              </button>
            </div>
          )}

          {activeHudTab === 'flow' && showSurfaceFlow ? (
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
        {showFlood && <FloodLegend />}
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
      </LeafletMap>
    </div>
  );
};
