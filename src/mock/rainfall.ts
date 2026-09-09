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
 * High-visibility contiguous spatial tessellation across Mumbai Metropolitan Region.
 * Explicitly tagged with is_demo_data: true.
 */
export const MOCK_RAINFALL_GEOJSON: FeatureCollection<Polygon, RainfallFeatureProperties> = {
  type: 'FeatureCollection',
  features: [
    // 1. South Mumbai (Colaba / Churchgate) - Low Rainfall (14.2 mm/hr - Light Blue)
    {
      type: 'Feature',
      id: 'rf_zone_south_mumbai',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8000, 18.9000],
            [72.8600, 18.9000],
            [72.8600, 18.9800],
            [72.8000, 18.9800],
            [72.8000, 18.9000],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-01',
        zone_name: 'South Mumbai',
        rainfall_intensity_mm_hr: 14.2,
        category: '5-20',
        color: '#93C5FD', // Light Blue
        is_demo_data: true,
      },
    },

    // 2. Worli / Lower Parel - Moderate Rainfall (38.5 mm/hr - Royal Blue)
    {
      type: 'Feature',
      id: 'rf_zone_worli',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8100, 18.9800],
            [72.8600, 18.9800],
            [72.8600, 19.0150],
            [72.8100, 19.0150],
            [72.8100, 18.9800],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-02',
        zone_name: 'Worli / Lower Parel',
        rainfall_intensity_mm_hr: 38.5,
        category: '20-50',
        color: '#2563EB', // Royal Blue
        is_demo_data: true,
      },
    },

    // 3. Dadar / Hindmata - High Rainfall (84.0 mm/hr - Vivid Amber)
    {
      type: 'Feature',
      id: 'rf_zone_dadar',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8300, 19.0150],
            [72.8800, 19.0150],
            [72.8800, 19.0600],
            [72.8300, 19.0600],
            [72.8300, 19.0150],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-03',
        zone_name: 'Dadar / Hindmata (F-South)',
        rainfall_intensity_mm_hr: 84.0,
        category: '50-100',
        color: '#F59E0B', // Vivid Amber
        is_demo_data: true,
      },
    },

    // 4. Bandra / Santacruz / BKC - Extreme Rainfall (126.0 mm/hr - Deep Crimson Red)
    {
      type: 'Feature',
      id: 'rf_zone_santacruz',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8150, 19.0600],
            [72.8750, 19.0600],
            [72.8750, 19.1050],
            [72.8150, 19.1050],
            [72.8150, 19.0600],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-04',
        zone_name: 'Bandra / Santacruz / Milan Subway',
        rainfall_intensity_mm_hr: 126.0,
        category: '100+',
        color: '#DC2626', // Deep Crimson Red
        is_demo_data: true,
      },
    },

    // 5. Kurla / Kalina / Mithi Basin - Extreme Rainfall (118.5 mm/hr - Deep Crimson Red)
    {
      type: 'Feature',
      id: 'rf_zone_kurla',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8750, 19.0600],
            [72.9300, 19.0600],
            [72.9300, 19.1050],
            [72.8750, 19.1050],
            [72.8750, 19.0600],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-05',
        zone_name: 'Kurla / Mithi Basin (L-Ward)',
        rainfall_intensity_mm_hr: 118.5,
        category: '100+',
        color: '#DC2626', // Deep Crimson Red
        is_demo_data: true,
      },
    },

    // 6. Andheri West / Juhu - High Rainfall (74.0 mm/hr - Vivid Amber)
    {
      type: 'Feature',
      id: 'rf_zone_andheri_w',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8100, 19.1050],
            [72.8650, 19.1050],
            [72.8650, 19.1600],
            [72.8100, 19.1600],
            [72.8100, 19.1050],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-06',
        zone_name: 'Andheri West / Juhu',
        rainfall_intensity_mm_hr: 74.0,
        category: '50-100',
        color: '#F59E0B', // Vivid Amber
        is_demo_data: true,
      },
    },

    // 7. Powai / Kanjurmarg - Moderate Rainfall (44.5 mm/hr - Royal Blue)
    {
      type: 'Feature',
      id: 'rf_zone_powai',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8650, 19.1050],
            [72.9400, 19.1050],
            [72.9400, 19.1600],
            [72.8650, 19.1600],
            [72.8650, 19.1050],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-07',
        zone_name: 'Powai / Kanjurmarg',
        rainfall_intensity_mm_hr: 44.5,
        category: '20-50',
        color: '#2563EB', // Royal Blue
        is_demo_data: true,
      },
    },

    // 8. Borivali / Dahisar - Very Low Rainfall (4.2 mm/hr - Soft Sky Blue)
    {
      type: 'Feature',
      id: 'rf_zone_borivali',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8200, 19.1600],
            [72.9200, 19.1600],
            [72.9200, 19.2600],
            [72.8200, 19.2600],
            [72.8200, 19.1600],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-08',
        zone_name: 'Borivali / Dahisar',
        rainfall_intensity_mm_hr: 4.2,
        category: '0-5',
        color: '#DBEAFE', // Soft Sky Blue
        is_demo_data: true,
      },
    },
  ],
};
