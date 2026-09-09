import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';

interface MapContainerProps {
  cityId?: string;
  cityName?: string;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  onMapLoad?: (map: maplibregl.Map) => void;
  className?: string;
}

// Clean, neutral Esri World Light Gray Canvas Style (100% public, zero watermarks, no API key required)
const ESRI_LIGHT_GRAY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-light-gray': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution:
        'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), TomTom',
    },
  },
  layers: [
    {
      id: 'esri-light-gray-layer',
      type: 'raster',
      source: 'esri-light-gray',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Helper to resolve map style: checks VITE_MAP_STYLE env var first, defaults to Esri Light Gray Canvas
const getInitialStyle = (): string | maplibregl.StyleSpecification => {
  const envStyle = import.meta.env.VITE_MAP_STYLE;
  if (envStyle && typeof envStyle === 'string' && envStyle.trim() !== '') {
    return envStyle.trim();
  }
  return ESRI_LIGHT_GRAY_STYLE;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  cityName = 'Mumbai Metropolitan Region',
  center = [72.8777, 19.0760], // Mumbai Center [lng, lat]
  zoom = 11.5,
  onMapLoad,
  className = 'h-full w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);

  const initializeMap = () => {
    if (!mapContainerRef.current) return;

    setIsLoading(true);
    setHasError(false);

    try {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: getInitialStyle(),
        center: center,
        zoom: zoom,
        attributionControl: false,
      });

      // Add Navigation controls (Zoom in/out, pitch/compass)
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      // Add Fullscreen control
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');

      // Add Attribution control (Mandatory for provider license compliance)
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
        }),
        'bottom-right'
      );

      map.on('load', () => {
        setIsLoading(false);
        setMapReady(true);
        if (onMapLoad) {
          onMapLoad(map);
        }
      });

      map.on('error', (e: maplibregl.ErrorEvent) => {
        console.error('MapLibre GL Tile Error:', e);
        if (!map.loaded()) {
          setIsLoading(false);
          setHasError(true);
        }
      });

      mapInstanceRef.current = map;
    } catch (err) {
      console.error('Failed to initialize MapLibre GL:', err);
      setIsLoading(false);
      setHasError(true);
    }
  };

  useEffect(() => {
    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col ${className}`}>
      {/* Top Context Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-xs text-white px-3.5 py-2 rounded-lg border border-slate-700/80 shadow-md flex items-center gap-3">
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
          {mapReady && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              BASE MAP READY
            </span>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-xs font-medium text-slate-200">Initializing Base Map...</p>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="p-3 bg-red-100 text-red-700 rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Map tiles could not be loaded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Unable to connect to the neutral base map tile server. Please check your network connection and try again.
            </p>
          </div>
          <button
            onClick={initializeMap}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading Map</span>
          </button>
        </div>
      )}

      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full flex-1 min-h-[500px]" aria-label="Interactive GIS Base Map" />
    </div>
  );
};
