import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { LayerControl } from './LayerControl';
import { RainfallLegend } from './RainfallLegend';


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
        preserveDrawingBuffer: true,
      } as any);

      // Global reference to active map instance
      (window as any)._activeMap = map;
      (window as any)._mapInstanceCount = ((window as any)._mapInstanceCount || 0) + 1;

      // Add MapLibre Controls
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      const generateViewportGrid = () => {
        if (!map) return null;
        const bounds = map.getBounds();
        const west = bounds.getWest();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const north = bounds.getNorth();

        const width = east - west;
        const height = north - south;

        // Occupy ~65% of current visible map bounds centered in viewport
        const minLng = west + width * 0.175;
        const maxLng = west + width * 0.825;
        const minLat = south + height * 0.175;
        const maxLat = south + height * 0.825;

        const cols = 5;
        const rows = 5;
        const lngStep = (maxLng - minLng) / cols;
        const latStep = (maxLat - minLat) / rows;

        // Realistic Storm Cell Intensity Distribution (mm/hr)
        const intensityPattern: number[][] = [
          [5, 15, 35, 15, 5],
          [15, 35, 70, 35, 15],
          [35, 70, 120, 70, 35],
          [15, 35, 70, 35, 15],
          [5, 15, 35, 15, 5],
        ];

        const zoneNames: string[][] = [
          ['Colaba Coast', 'Churchgate', 'Fort / Marine Drive', 'Navy Nagar', 'Nariman Point'],
          ['Worli Seaface', 'Lower Parel', 'Dadar / Hindmata', 'Wadala', 'Sion East'],
          ['Bandra West', 'Santacruz Subway', 'Kurla / BKC', 'Chembur', 'Ghatkopar'],
          ['Juhu Beach', 'Andheri West', 'MIDC / SEEPZ', 'Powai Lake', 'Vikhroli'],
          ['Malad West', 'Goregaon', 'Borivali West', 'Thane West', 'Majiwada'],
        ];

        const features: any[] = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cellMinLng = minLng + c * lngStep;
            const cellMaxLng = minLng + (c + 1) * lngStep;
            const cellMinLat = minLat + r * latStep;
            const cellMaxLat = minLat + (r + 1) * latStep;

            const intensity = intensityPattern[r][c];
            const name = zoneNames[r][c];

            features.push({
              type: 'Feature',
              id: `DEMO-GRID-${r}-${c}`,
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [cellMinLng, cellMinLat],
                    [cellMaxLng, cellMinLat],
                    [cellMaxLng, cellMaxLat],
                    [cellMinLng, cellMaxLat],
                    [cellMinLng, cellMinLat],
                  ],
                ],
              },
              properties: {
                rainfall_intensity_mm_hr: intensity,
                zone_name: name,
                grid_id: `GRID-${r}-${c}`,
                is_demo_data: true,
              },
            });
          }
        }

        return {
          type: 'FeatureCollection' as const,
          features,
        };
      };

      const ensureRainfallLayer = () => {
        if (!map || mapInstanceRef.current !== map || !map.isStyleLoaded()) return;

        const sourceId = 'rainfall-demo-source';
        const fillLayerId = 'rainfall-demo-fill';
        const outlineLayerId = 'rainfall-demo-outline';

        // 1. Generate local GeoJSON grid dynamically from current map bounds
        const rainfallGeoJSON = generateViewportGrid();
        if (!rainfallGeoJSON) return;

        // 2. Add or update source
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: rainfallGeoJSON,
          });
        } else {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(rainfallGeoJSON);
        }

        // 3. Add Fill Layer with data-driven step color interpolation
        if (!map.getLayer(fillLayerId)) {
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            layout: {
              visibility: showRainfall ? 'visible' : 'none',
            },
            paint: {
              'fill-color': [
                'step',
                ['number', ['get', 'rainfall_intensity_mm_hr'], 0],
                '#DBEAFE', // 0-5 mm/hr (Light Sky Blue)
                5, '#93C5FD', // 5-20 mm/hr (Soft Blue)
                20, '#60A5FA', // 20-50 mm/hr (Royal Blue)
                50, '#F59E0B', // 50-100 mm/hr (Amber)
                100, '#B91C1C', // 100+ mm/hr (Deep Red)
              ],
              'fill-opacity': 0.60,
              'fill-outline-color': '#FFFFFF',
            },
          });
        }

        // 4. Add Polygon Outline Layer
        if (!map.getLayer(outlineLayerId)) {
          map.addLayer({
            id: outlineLayerId,
            type: 'line',
            source: sourceId,
            layout: {
              visibility: showRainfall ? 'visible' : 'none',
            },
            paint: {
              'line-color': '#0F172A',
              'line-width': 1.5,
              'line-opacity': 0.8,
            },
          });
        }

        // 5. Ensure layer ordering above basemap
        if (map.getLayer(fillLayerId)) {
          map.moveLayer(fillLayerId);
        }
        if (map.getLayer(outlineLayerId)) {
          map.moveLayer(outlineLayerId);
        }

        map.resize();
        map.triggerRepaint();

        // Interactive Popup Inspector
        map.off('click', fillLayerId, () => {});
        map.on('click', fillLayerId, (e) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties as any;

          if (activePopupRef.current) {
            activePopupRef.current.remove();
          }

          const popupContent = document.createElement('div');
          popupContent.style.padding = '8px';
          popupContent.style.fontFamily = 'Inter, sans-serif';
          popupContent.innerHTML = `
            <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${props.zone_name || 'Mumbai Zone'}</span>
              <span style="font-size: 9px; font-weight: 700; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px;">DEMO DATA</span>
            </div>
            <div style="font-size: 12px; margin-bottom: 4px;">
              <span style="color: #64748b;">Rainfall Intensity:</span>
              <span style="font-weight: 800; color: #1d4ed8; font-size: 13px; margin-left: 4px;">${props.rainfall_intensity_mm_hr} mm/hr</span>
            </div>
          `;

          activePopupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
            .setLngLat(e.lngLat)
            .setDOMContent(popupContent)
            .addTo(map);
        });

        map.on('mouseenter', fillLayerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', fillLayerId, () => {
          map.getCanvas().style.cursor = '';
        });

        // Store runtime verification snapshot
        map.once('idle', () => {
          if (mapInstanceRef.current !== map) return;

          const renderedFeatures = map.queryRenderedFeatures({ layers: [fillLayerId] });
          (window as any).__RAINFALL_RUNTIME_VERIFICATION__ = {
            sourceExists: !!map.getSource(sourceId),
            layerExists: !!map.getLayer(fillLayerId),
            visibility: map.getLayoutProperty(fillLayerId, 'visibility'),
            renderedCount: renderedFeatures.length,
            bounds: map.getBounds().toArray(),
          };
          console.log('[GeoNexus Rainfall Runtime State]:', (window as any).__RAINFALL_RUNTIME_VERIFICATION__);
        });
      };

      const handleMapReady = () => {
        if (mapInstanceRef.current !== map) return;
        setIsLoading(false);
        setMapReady(true);
        setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
        ensureRainfallLayer();

        if (onMapLoad) {
          onMapLoad(map);
        }
      };

      if (map.isStyleLoaded()) {
        handleMapReady();
      } else {
        map.on('load', handleMapReady);
        map.on('styledata', () => {
          if (map.isStyleLoaded() && !map.getLayer('rainfall-demo-fill')) {
            ensureRainfallLayer();
          }
        });
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
    if (map && map.isStyleLoaded()) {
      const visibility = active ? 'visible' : 'none';
      if (map.getLayer('rainfall-demo-fill')) {
        map.setLayoutProperty('rainfall-demo-fill', 'visibility', visibility);
      }
      if (map.getLayer('rainfall-demo-outline')) {
        map.setLayoutProperty('rainfall-demo-outline', 'visibility', visibility);
      }
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
