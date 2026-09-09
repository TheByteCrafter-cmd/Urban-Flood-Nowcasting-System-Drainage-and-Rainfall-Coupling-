export interface RainfallFeatureProperties {
  grid_id: string;
  zone_name: string;
  rainfall_intensity_mm_hr: number;
  category: '0-5' | '5-20' | '20-50' | '50-100' | '100+';
  color: string;
  is_demo_data: boolean;
}

export interface GeoJSONPolygonFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: RainfallFeatureProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONPolygonFeature[];
}

/**
 * Programmatic 5x5 Grid Generator centered over Mumbai Viewport [72.8777, 19.0760]
 * Bounds: Lng 72.78 to 72.98 (5 columns), Lat 18.92 to 19.22 (5 rows)
 * Guarantees 25 contiguous spatial cells with varied rainfall intensities (0 to 140 mm/hr).
 * Zero external package dependencies.
 */
const generateMumbaiRainfallGrid = (): GeoJSONFeatureCollection => {
  const minLng = 72.78;
  const maxLng = 72.98;
  const minLat = 18.92;
  const maxLat = 19.22;

  const cols = 5;
  const rows = 5;

  const lngStep = (maxLng - minLng) / cols;
  const latStep = (maxLat - minLat) / rows;

  // Preset illustrative rainfall intensities (mm/hr) for the 5x5 grid
  // Storm cell pattern: Extreme in central Mumbai (Santacruz / Kurla), lower on outskirts
  const intensityPattern: number[][] = [
    [5, 12, 18, 10, 4],     // Row 0 (South Mumbai / Colaba)
    [15, 45, 85, 38, 12],   // Row 1 (Worli / Dadar / Wadala)
    [25, 95, 135, 110, 42], // Row 2 (Santacruz / BKC / Mithi River - Peak Storm Cell)
    [18, 70, 90, 65, 20],   // Row 3 (Andheri / Powai)
    [4, 15, 25, 14, 5],     // Row 4 (Borivali / Thane)
  ];

  const zoneNames: string[][] = [
    ['Colaba Coast', 'Churchgate', 'Fort / Marine Drive', 'Navy Nagar', 'Nariman Point'],
    ['Worli Seaface', 'Lower Parel', 'Dadar / Hindmata', 'Wadala', 'Sion East'],
    ['Bandra West', 'Santacruz Subway', 'Kurla / BKC', 'Chembur', 'Ghatkopar'],
    ['Juhu Beach', 'Andheri West', 'MIDC / SEEPZ', 'Powai Lake', 'Vikhroli'],
    ['Malad West', 'Goregaon', 'Borivali West', 'Thane West', 'Majiwada'],
  ];

  const getColorAndCategory = (intensity: number): { color: string; category: '0-5' | '5-20' | '20-50' | '50-100' | '100+' } => {
    if (intensity <= 5) return { color: '#DBEAFE', category: '0-5' };       // Very Low (Soft Sky Blue)
    if (intensity <= 20) return { color: '#93C5FD', category: '5-20' };     // Low (Light Blue)
    if (intensity <= 50) return { color: '#60A5FA', category: '20-50' };    // Moderate (Royal Blue)
    if (intensity <= 100) return { color: '#F59E0B', category: '50-100' };  // High (Muted Amber)
    return { color: '#DC2626', category: '100+' };                          // Extreme (Deep Crimson Red)
  };

  const features: GeoJSONPolygonFeature[] = [];

  const insetLng = lngStep * 0.05;
  const insetLat = latStep * 0.05;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinLng = minLng + c * lngStep + insetLng;
      const cellMaxLng = minLng + (c + 1) * lngStep - insetLng;
      const cellMinLat = minLat + r * latStep + insetLat;
      const cellMaxLat = minLat + (r + 1) * latStep - insetLat;

      const intensity = intensityPattern[r][c];
      const { color, category } = getColorAndCategory(intensity);
      const name = zoneNames[r][c];
      const gridId = `GRID-${r}-${c}`;

      features.push({
        type: 'Feature',
        id: gridId,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [cellMinLng, cellMinLat],
              [cellMaxLng, cellMinLat],
              [cellMaxLng, cellMaxLat],
              [cellMinLng, cellMaxLat],
              [cellMinLng, cellMinLat], // Closed linear ring
            ],
          ],
        },
        properties: {
          grid_id: gridId,
          zone_name: name,
          rainfall_intensity_mm_hr: intensity,
          category,
          color,
          is_demo_data: true,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};

export const MOCK_RAINFALL_GEOJSON: GeoJSONFeatureCollection = generateMumbaiRainfallGrid();
