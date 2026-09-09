import React, { useState, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { LayerControl } from './LayerControl';
import { RainfallLegend } from './RainfallLegend';
import { DEMLegend } from './DEMLegend';
import { MOCK_RAINFALL_GEOJSON, RainfallFeatureProperties } from '../../mock/rainfall';
import { MOCK_DEM_GEOJSON, DEMFeatureProperties } from '../../mock/dem';
import L from 'leaflet';

interface MapContainerProps {
  cityId?: string;
  cityName?: string;
  center?: [number, number]; // Handles both [lat, lng] and [lng, lat]
  zoom?: number;
  onMapLoad?: (map: L.Map) => void;
  className?: string;
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
  }, [map]);
  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  cityName = 'Mumbai Metropolitan Region',
  center = [19.0760, 72.8777],
  zoom = 11.5,
  className = 'h-full w-full',
}) => {
  const [showRainfall, setShowRainfall] = useState<boolean>(true); // Default ON
  const [showDEM, setShowDEM] = useState<boolean>(true); // Default ON for Phase 2B-2

  // Normalize coordinate order: Leaflet requires [lat, lng]
  const mapCenter: [number, number] = center[0] > 50 ? [center[1], center[0]] : center;

  const handleToggleRainfall = (active: boolean) => {
    setShowRainfall(active);
  };

  const handleToggleDEM = (active: boolean) => {
    setShowDEM(active);
  };

  // DEM Elevation GeoJSON Styling (Subtle & Muted Terrain Palette, fillOpacity 0.30)
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
    };
  };

  const onEachDEMFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties as DEMFeatureProperties;
    if (!props) return;

    const popupContent = `
      <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 150px;">
        <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #166534;">DEM / ELEVATION</span>
          <span style="font-size: 9px; font-weight: 700; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px;">DEMO DATA</span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${props.zone_name || 'Mumbai Zone'}</div>
        <div style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; margin-bottom: 2px;">Elevation</div>
        <div style="font-size: 18px; font-weight: 800; color: #166534; margin-bottom: 4px;">
          ${props.elevation_m} m
        </div>
        <div style="font-size: 11px; color: #64748b;">
          <span>Category: </span>
          <span style="font-weight: 700; color: ${props.color};">${props.category} m</span>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.50, weight: 1.5, opacity: 0.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: 0.30, weight: 0.5, opacity: 0.20 });
      },
    });
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
          <DemoBadge compact />
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
            LEAFLET GIS READY
          </span>
        </div>
      </div>

      {/* Floating Layer Controller (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] hidden sm:block">
        <LayerControl
          showRainfall={showRainfall}
          onToggleRainfall={handleToggleRainfall}
          showDEM={showDEM}
          onToggleDEM={handleToggleDEM}
        />
      </div>

      {/* Floating Stacked Legends (Bottom Left) */}
      <div className="absolute bottom-6 left-3 z-[1000] flex flex-col sm:flex-row gap-2">
        {showDEM && <DEMLegend />}
        {showRainfall && <RainfallLegend />}
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

        {/* 1. DEM Terrain Elevation Layer (demPane, zIndex 400) */}
        {showDEM && (
          <GeoJSON
            key="dem-geojson-layer"
            data={MOCK_DEM_GEOJSON as any}
            style={getDEMStyle}
            onEachFeature={onEachDEMFeature}
            pane="demPane"
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
      </LeafletMap>
    </div>
  );
};

