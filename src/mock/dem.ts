export interface DEMFeatureProperties {
  grid_id: string;
  zone_name: string;
  elevation_m: number;
  category: '0-10' | '10-25' | '25-50' | '50-75' | '75+';
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
  properties: DEMFeatureProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONPolygonFeature[];
}

/**
 * Programmatic 5x5 DEM Grid Generator over Mumbai Viewport [72.8777, 19.0760]
 * Bounds: Lng 72.78 to 72.98 (5 columns), Lat 18.92 to 19.22 (5 rows)
 * Illustrative elevation profile (4m to 95m) representing coastal lowlands and eastern hills.
 */
const generateMumbaiDEMGrid = (): GeoJSONFeatureCollection => {
  const minLng = 72.78;
  const maxLng = 72.98;
  const minLat = 18.92;
  const maxLat = 19.22;

  const cols = 5;
  const rows = 5;

  const lngStep = (maxLng - minLng) / cols;
  const latStep = (maxLat - minLat) / rows;

  // Preset illustrative elevation pattern (m)
  // Low elevation along coast/subways (Colaba, BKC, Mithi), higher towards Powai / SGNP hills
  const elevationPattern: number[][] = [
    [4, 6, 8, 12, 18],     // Row 0 (South Mumbai Coastal Lowlands)
    [5, 12, 16, 24, 38],   // Row 1 (Worli / Dadar / Wadala Basin)
    [4, 8, 14, 45, 68],    // Row 2 (Subway Lowlands / BKC vs Eastern Hills)
    [6, 18, 35, 75, 95],   // Row 3 (Juhu / Andheri vs Powai / SGNP Range)
    [8, 22, 40, 60, 85],   // Row 4 (Malad / Borivali Lowlands vs Thane Hills)
  ];

  const zoneNames: string[][] = [
    ['Colaba Coast', 'Churchgate', 'Fort / Marine Drive', 'Navy Nagar', 'Nariman Point'],
    ['Worli Seaface', 'Lower Parel', 'Dadar / Hindmata', 'Wadala', 'Sion East'],
    ['Bandra West', 'Santacruz Subway', 'Kurla / BKC', 'Chembur', 'Ghatkopar'],
    ['Juhu Beach', 'Andheri West', 'MIDC / SEEPZ', 'Powai Lake', 'Vikhroli'],
    ['Malad West', 'Goregaon', 'Borivali West', 'Thane West', 'Majiwada'],
  ];

  const getColorAndCategory = (elevation: number): { color: string; category: '0-10' | '10-25' | '25-50' | '50-75' | '75+' } => {
    if (elevation <= 10) return { color: '#15803D', category: '0-10' };    // Lowland (Darker Green)
    if (elevation <= 25) return { color: '#65A30D', category: '10-25' };   // Moderate (Olive Green)
    if (elevation <= 50) return { color: '#D97706', category: '25-50' };   // Ridge (Muted Amber)
    if (elevation <= 75) return { color: '#B45309', category: '50-75' };   // Hilly (Muted Terracotta)
    return { color: '#78350F', category: '75+' };                          // Peak (Dark Timber Brown)
  };

  const features: GeoJSONPolygonFeature[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinLng = minLng + c * lngStep;
      const cellMaxLng = minLng + (c + 1) * lngStep;
      const cellMinLat = minLat + r * latStep;
      const cellMaxLat = minLat + (r + 1) * latStep;

      const elevation = elevationPattern[r][c];
      const { color, category } = getColorAndCategory(elevation);
      const name = zoneNames[r][c];
      const gridId = `DEM-GRID-${r}-${c}`;

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
              [cellMinLng, cellMinLat],
            ],
          ],
        },
        properties: {
          grid_id: gridId,
          zone_name: name,
          elevation_m: elevation,
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

export const MOCK_DEM_GEOJSON: GeoJSONFeatureCollection = generateMumbaiDEMGrid();
