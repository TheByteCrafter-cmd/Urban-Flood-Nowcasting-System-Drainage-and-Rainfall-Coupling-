import { FeatureCollection, Polygon } from 'geojson';

export interface RainfallFeatureProperties {
  grid_id: string;
  zone_name: string;
  rainfall_intensity_mm_hr: number;
  category: '0-5' | '5-20' | '20-50' | '50-100' | '100+';
  color: string;
  is_demo_data: boolean;
}

/**
 * Centralized Mock GeoJSON Rainfall Intensity Dataset
 * Illustrative Doppler Radar Grid over Mumbai Metropolitan Area.
 * Explicitly tagged with is_demo_data: true.
 */
export const MOCK_RAINFALL_GEOJSON: FeatureCollection<Polygon, RainfallFeatureProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'rf_zone_dadar',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8300, 19.0050],
            [72.8600, 19.0050],
            [72.8600, 19.0300],
            [72.8300, 19.0300],
            [72.8300, 19.0050],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-01',
        zone_name: 'Hindmata / Dadar Ward (F-South)',
        rainfall_intensity_mm_hr: 78.5,
        category: '50-100',
        color: '#F59E0B', // Muted Amber (High Rainfall)
        is_demo_data: true,
      },
    },
    {
      type: 'Feature',
      id: 'rf_zone_santacruz',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8250, 19.0700],
            [72.8650, 19.0700],
            [72.8650, 19.1050],
            [72.8250, 19.1050],
            [72.8250, 19.0700],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-02',
        zone_name: 'Santacruz / Milan Subway (H-East)',
        rainfall_intensity_mm_hr: 112.0,
        category: '100+',
        color: '#DC2626', // Deep Red (Extreme Rainfall)
        is_demo_data: true,
      },
    },
    {
      type: 'Feature',
      id: 'rf_zone_kurla',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8650, 19.0550],
            [72.9050, 19.0550],
            [72.9050, 19.0850],
            [72.8650, 19.0850],
            [72.8650, 19.0550],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-03',
        zone_name: 'Kurla / Mithi Basin (L-Ward)',
        rainfall_intensity_mm_hr: 42.0,
        category: '20-50',
        color: '#60A5FA', // Royal Blue (Moderate Rainfall)
        is_demo_data: true,
      },
    },
    {
      type: 'Feature',
      id: 'rf_zone_south_mumbai',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8100, 18.9200],
            [72.8500, 18.9200],
            [72.8500, 18.9900],
            [72.8100, 18.9900],
            [72.8100, 18.9200],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-04',
        zone_name: 'Colaba / Churchgate (A-Ward)',
        rainfall_intensity_mm_hr: 18.5,
        category: '5-20',
        color: '#93C5FD', // Light Blue (Low Rainfall)
        is_demo_data: true,
      },
    },
    {
      type: 'Feature',
      id: 'rf_zone_andheri',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8250, 19.1050],
            [72.8750, 19.1050],
            [72.8750, 19.1450],
            [72.8250, 19.1450],
            [72.8250, 19.1050],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-05',
        zone_name: 'Andheri West / Lokhandwala (K-West)',
        rainfall_intensity_mm_hr: 64.0,
        category: '50-100',
        color: '#F59E0B', // Muted Amber (High Rainfall)
        is_demo_data: true,
      },
    },
    {
      type: 'Feature',
      id: 'rf_zone_borivali',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8350, 19.2000],
            [72.8850, 19.2000],
            [72.8850, 19.2500],
            [72.8350, 19.2500],
            [72.8350, 19.2000],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-06',
        zone_name: 'Borivali / Dahisar (R-Central)',
        rainfall_intensity_mm_hr: 3.5,
        category: '0-5',
        color: '#DBEAFE', // Soft Sky Blue (Very Low Rainfall)
        is_demo_data: true,
      },
    },
  ],
};
