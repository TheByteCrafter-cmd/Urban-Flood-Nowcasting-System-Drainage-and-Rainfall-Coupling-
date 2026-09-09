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
 * Contiguous Spatial Tessellation across Mumbai Metropolitan Region.
 * Explicitly tagged with is_demo_data: true.
 */
export const MOCK_RAINFALL_GEOJSON: FeatureCollection<Polygon, RainfallFeatureProperties> = {
  type: 'FeatureCollection',
  features: [
    // 1. South Mumbai (Colaba / Churchgate) - Low Rainfall (14 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_south_mumbai',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8000, 18.9000],
            [72.8550, 18.9000],
            [72.8550, 18.9800],
            [72.8000, 18.9800],
            [72.8000, 18.9000],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-01',
        zone_name: 'South Mumbai (Colaba / Fort / Marine Drive)',
        rainfall_intensity_mm_hr: 14.2,
        category: '5-20',
        color: '#93C5FD', // Light Blue
        is_demo_data: true,
      },
    },

    // 2. Worli / Lower Parel - Moderate Rainfall (38 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_worli',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8100, 18.9800],
            [72.8500, 18.9800],
            [72.8500, 19.0150],
            [72.8100, 19.0150],
            [72.8100, 18.9800],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-02',
        zone_name: 'Worli / Lower Parel / Prabhadevi',
        rainfall_intensity_mm_hr: 38.5,
        category: '20-50',
        color: '#60A5FA', // Royal Blue
        is_demo_data: true,
      },
    },

    // 3. Dadar / Hindmata - High Rainfall (84 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_dadar',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8300, 19.0150],
            [72.8700, 19.0150],
            [72.8700, 19.0500],
            [72.8300, 19.0500],
            [72.8300, 19.0150],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-03',
        zone_name: 'Dadar / Hindmata / Wadala (F-South)',
        rainfall_intensity_mm_hr: 84.0,
        category: '50-100',
        color: '#F59E0B', // Muted Amber
        is_demo_data: true,
      },
    },

    // 4. Kurla / Kalina / Mithi Basin - Extreme Rainfall (118 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_kurla',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8600, 19.0500],
            [72.9100, 19.0500],
            [72.9100, 19.0900],
            [72.8600, 19.0900],
            [72.8600, 19.0500],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-04',
        zone_name: 'Kurla / Kalina / Mithi River Basin (L-Ward)',
        rainfall_intensity_mm_hr: 118.5,
        category: '100+',
        color: '#DC2626', // Deep Red
        is_demo_data: true,
      },
    },

    // 5. Bandra / Santacruz - Extreme Rainfall (126 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_santacruz',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8150, 19.0500],
            [72.8600, 19.0500],
            [72.8600, 19.0950],
            [72.8150, 19.0950],
            [72.8150, 19.0500],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-05',
        zone_name: 'Bandra West / Santacruz / Milan Subway',
        rainfall_intensity_mm_hr: 126.0,
        category: '100+',
        color: '#DC2626', // Deep Red
        is_demo_data: true,
      },
    },

    // 6. Andheri West / Juhu - High Rainfall (74 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_andheri_w',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8100, 19.0950],
            [72.8550, 19.0950],
            [72.8550, 19.1450],
            [72.8100, 19.1450],
            [72.8100, 19.0950],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-06',
        zone_name: 'Andheri West / Juhu / Versova',
        rainfall_intensity_mm_hr: 74.0,
        category: '50-100',
        color: '#F59E0B', // Muted Amber
        is_demo_data: true,
      },
    },

    // 7. Andheri East / MIDC / Powai - Moderate Rainfall (44 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_andheri_e',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8550, 19.0950],
            [72.9200, 19.0950],
            [72.9200, 19.1450],
            [72.8550, 19.1450],
            [72.8550, 19.0950],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-07',
        zone_name: 'Andheri East / SEEPZ / Powai Lake',
        rainfall_intensity_mm_hr: 44.5,
        category: '20-50',
        color: '#60A5FA', // Royal Blue
        is_demo_data: true,
      },
    },

    // 8. Goregaon / Malad - Low Rainfall (16 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_malad',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8150, 19.1450],
            [72.8850, 19.1450],
            [72.8850, 19.1950],
            [72.8150, 19.1950],
            [72.8150, 19.1450],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-08',
        zone_name: 'Goregaon / Malad West (P-North)',
        rainfall_intensity_mm_hr: 16.5,
        category: '5-20',
        color: '#93C5FD', // Light Blue
        is_demo_data: true,
      },
    },

    // 9. Borivali / Dahisar - Very Low Rainfall (4.2 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_borivali',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8200, 19.1950],
            [72.8950, 19.1950],
            [72.8950, 19.2600],
            [72.8200, 19.2600],
            [72.8200, 19.1950],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-09',
        zone_name: 'Borivali / Dahisar / SGNP',
        rainfall_intensity_mm_hr: 4.2,
        category: '0-5',
        color: '#DBEAFE', // Soft Sky Blue
        is_demo_data: true,
      },
    },

    // 10. Thane West / Ghodbunder - Low Rainfall (12 mm/hr)
    {
      type: 'Feature',
      id: 'rf_zone_thane',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.9200, 19.1450],
            [72.9900, 19.1450],
            [72.9900, 19.2400],
            [72.9200, 19.2400],
            [72.9200, 19.1450],
          ],
        ],
      },
      properties: {
        grid_id: 'GRID-MH-10',
        zone_name: 'Thane City / Majiwada',
        rainfall_intensity_mm_hr: 12.0,
        category: '5-20',
        color: '#93C5FD', // Light Blue
        is_demo_data: true,
      },
    },
  ],
};
