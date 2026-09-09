import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { LayerControl } from './LayerControl';
import { RainfallLegend } from './RainfallLegend';
import { MOCK_RAINFALL_GEOJSON } from '../../mock/rainfall';

interface MapContainerProps {
  cityId?: string;
  cityName?: string;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  onMapLoad?: (map: maplibregl.Map) => void;
  className?: string;
}

const ESRI_LIGHT_GRAY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-light-gray': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 16,
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
      maxzoom: 20,
    },
  ],
};

const getInitialStyle = (): string | maplibregl.StyleSpecification => {
  const envStyle = import.meta.env.VITE_MAP_STYLE;
  if (envStyle && typeof envStyle === 'string' && envStyle.trim() !== '') {
    return envStyle.trim();
  }
  return ESRI_LIGHT_GRAY_STYLE;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  cityName = 'Mumbai Metropolitan Region',
  center = [72.8777, 19.0760],
  zoom = 11.5,
  onMapLoad,
  className = 'h-full w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [showRainfall, setShowRainfall] = useState<boolean>(true); // Default ON for demo

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
        minZoom: 2,
        maxZoom: 20,
        attributionControl: false,
      });

      // Add MapLibre Controls
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      const setupMapLayers = () => {
        if (!map) return;

        // Register DEBUG Single Polygon Source for Step 4
        if (!map.getSource('rainfall-debug-source')) {
          map.addSource('rainfall-debug-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  id: 'DEBUG-POLY-1',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [
                      [
                        [72.83, 19.03],
                        [72.92, 19.03],
                        [72.92, 19.12],
                        [72.83, 19.12],
                        [72.83, 19.03],
                      ],
                    ],
                  },
                  properties: {
                    grid_id: 'DEBUG-1',
                    zone_name: 'Central Mumbai Debug Zone',
                    rainfall_intensity_mm_hr: 120,
                    category: '100+',
                    color: '#B91C1C',
                    is_demo_data: true,
                  },
                },
              ],
            },
          });

          // Temporary Debug Layer (Step 4 & 5)
          map.addLayer({
            id: 'rainfall-debug-polygon',
            type: 'fill',
            source: 'rainfall-debug-source',
            layout: {
              visibility: 'visible',
            },
            paint: {
              'fill-color': '#B91C1C',
              'fill-opacity': 0.65,
            },
          });
        }

        // Register 5x5 Deterministic Mock Rainfall GeoJSON Source
        if (!map.getSource('rainfall-mock-source')) {
          map.addSource('rainfall-mock-source', {
            type: 'geojson',
            data: MOCK_RAINFALL_GEOJSON,
          });

          // Semi-transparent Fill Layer with Data-Driven Step Color Interpolation
          map.addLayer({
            id: 'rainfall-fill-layer',
            type: 'fill',
            source: 'rainfall-mock-source',
            layout: {
              visibility: 'visible',
            },
            paint: {
              'fill-color': [
                'step',
                ['number', ['get', 'rainfall_intensity_mm_hr'], 0],
                '#DBEAFE', // 0-5 mm/hr
                5, '#93C5FD', // 5-20 mm/hr
                20, '#60A5FA', // 20-50 mm/hr
                50, '#F59E0B', // 50-100 mm/hr
                100, '#DC2626', // >100 mm/hr
              ],
              'fill-opacity': 0.65,
            },
          });

          // Polygon Grid Outline Layer
          map.addLayer({
            id: 'rainfall-outline-layer',
            type: 'line',
            source: 'rainfall-mock-source',
            layout: {
              visibility: 'visible',
            },
            paint: {
              'line-color': '#0F172A',
              'line-width': 1.5,
              'line-opacity': 0.8,
            },
          });
        }

        // Expose Runtime Diagnostics on window for automated inspection
        (window as any).__MAP_DIAGNOSTICS__ = {
          hasDebugSource: !!map.getSource('rainfall-debug-source'),
          hasDebugLayer: !!map.getLayer('rainfall-debug-polygon'),
          hasRainfallSource: !!map.getSource('rainfall-mock-source'),
          hasRainfallLayer: !!map.getLayer('rainfall-fill-layer'),
          center: map.getCenter(),
          zoom: map.getZoom(),
          debugLayerType: map.getLayer('rainfall-debug-polygon')?.type,
          debugPaint: map.getPaintProperty('rainfall-debug-polygon', 'fill-color'),
          rainfallLayerType: map.getLayer('rainfall-fill-layer')?.type,
          rainfallPaint: map.getPaintProperty('rainfall-fill-layer', 'fill-color'),
        };

        console.log('[GeoNexus GIS] Map Diagnostics:', (window as any).__MAP_DIAGNOSTICS__);
      };

      const handleMapReady = () => {
        setIsLoading(false);
        setMapReady(true);
        setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
        setupMapLayers();

        if (onMapLoad) {
          onMapLoad(map);
        }
      };

      if (map.isStyleLoaded()) {
        handleMapReady();
      } else {
        map.on('load', handleMapReady);
      }

      map.on('zoom', () => {
        setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
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

  // Toggle Rainfall Layer Visibility
  const handleToggleRainfall = (active: boolean) => {
    setShowRainfall(active);
    const map = mapInstanceRef.current;
    if (map && map.isStyleLoaded() && map.getLayer('rainfall-fill-layer')) {
      const visibility = active ? 'visible' : 'none';
      map.setLayoutProperty('rainfall-fill-layer', 'visibility', visibility);
      map.setLayoutProperty('rainfall-outline-layer', 'visibility', visibility);
    }
  };

  useEffect(() => {
    initializeMap();

    return () => {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col ${className}`}>
      {/* Top Left Context Overlay */}
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
              BASE MAP READY (z{currentZoom})
            </span>
          )}
        </div>
      </div>

      {/* Floating Layer Controller (Top Right below map navigation controls) */}
      <div className="absolute top-28 right-3 z-10 hidden sm:block">
        <LayerControl showRainfall={showRainfall} onToggleRainfall={handleToggleRainfall} />
      </div>

      {/* Floating Rainfall Legend (Bottom Left) */}
      {showRainfall && (
        <div className="absolute bottom-6 left-3 z-10">
          <RainfallLegend />
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-xs font-medium text-slate-200">Initializing Base Map & GIS Layers...</p>
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
