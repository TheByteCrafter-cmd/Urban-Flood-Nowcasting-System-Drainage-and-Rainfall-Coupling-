import React, { useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { LayerControl } from './LayerControl';
import { RainfallLegend } from './RainfallLegend';
import { MOCK_RAINFALL_GEOJSON, RainfallFeatureProperties } from '../../mock/rainfall';
import L from 'leaflet';

interface MapContainerProps {
  cityId?: string;
  cityName?: string;
  center?: [number, number]; // Handles both [lat, lng] and [lng, lat]
  zoom?: number;
  onMapLoad?: (map: L.Map) => void;
  className?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  cityName = 'Mumbai Metropolitan Region',
  center = [19.0760, 72.8777],
  zoom = 11.5,
  className = 'h-full w-full',
}) => {
  const [showRainfall, setShowRainfall] = useState<boolean>(true); // Default ON for demo

  // Normalize coordinate order: Leaflet requires [lat, lng]
  const mapCenter: [number, number] = center[0] > 50 ? [center[1], center[0]] : center;

  const handleToggleRainfall = (active: boolean) => {
    setShowRainfall(active);
  };

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
      <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 140px;">
        <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${props.zone_name || 'Mumbai Zone'}</span>
          <span style="font-size: 9px; font-weight: 700; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px;">DEMO DATA</span>
        </div>
        <div style="font-size: 12px; margin-bottom: 4px;">
          <span style="color: #64748b;">Rainfall Intensity:</span>
          <span style="font-weight: 800; color: #1d4ed8; font-size: 13px; margin-left: 4px;">${props.rainfall_intensity_mm_hr} mm/hr</span>
        </div>
        <div style="font-size: 11px; color: #475569;">
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
        <LayerControl showRainfall={showRainfall} onToggleRainfall={handleToggleRainfall} />
      </div>

      {/* Floating Rainfall Legend (Bottom Left) */}
      {showRainfall && (
        <div className="absolute bottom-6 left-3 z-[1000]">
          <RainfallLegend />
        </div>
      )}

      {/* Leaflet Map Container */}
      <LeafletMap
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={true}
        className="w-full flex-1 min-h-[500px] z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showRainfall && (
          <GeoJSON
            key="rainfall-geojson-layer"
            data={MOCK_RAINFALL_GEOJSON as any}
            style={getRainfallStyle}
            onEachFeature={onEachRainfallFeature}
          />
        )}
      </LeafletMap>
    </div>
  );
};

