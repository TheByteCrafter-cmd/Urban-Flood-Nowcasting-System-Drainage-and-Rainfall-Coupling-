export interface FloodFeatureProperties {
  id: string;
  area_name: string;
  street_name?: string;
  zone_id?: string;
  water_depth_cm: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Critical';
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
  properties: FloodFeatureProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONPolygonFeature[];
}

/**
 * Depth classifications & color ramp for flood inundation
 * Restrained semantic colors:
 * 0–5 cm:    #DBEAFE (Low)
 * 5–20 cm:   #93C5FD (Moderate)
 * 20–50 cm:  #F59E0B (High)
 * 50–100 cm: #EA580C (Very High)
 * 100+ cm:   #B91C1C (Critical)
 */
export const getFloodDepthCategory = (depth: number): {
  category: '0-5' | '5-20' | '20-50' | '50-100' | '100+';
  risk_level: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Critical';
  color: string;
} => {
  if (depth <= 5) return { category: '0-5', risk_level: 'Low', color: '#DBEAFE' };
  if (depth <= 20) return { category: '5-20', risk_level: 'Moderate', color: '#93C5FD' };
  if (depth <= 50) return { category: '20-50', risk_level: 'High', color: '#F59E0B' };
  if (depth <= 100) return { category: '50-100', risk_level: 'Very High', color: '#EA580C' };
  return { category: '100+', risk_level: 'Critical', color: '#B91C1C' };
};

/**
 * 10 Irregular Urban Inundation Polygons across Mumbai Metropolitan Region
 * Represents realistic street corridors, underpasses, road intersections, and natural depressions.
 * Demo/illustrative data only — not live telemetry.
 */
export const MOCK_FLOOD_GEOJSON: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // 1. Hindmata Junction / Dadar TT Basin — Critical Inundation (120 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-01',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8415, 19.0140],
            [72.8465, 19.0152],
            [72.8490, 19.0185],
            [72.8472, 19.0220],
            [72.8420, 19.0205],
            [72.8395, 19.0168],
            [72.8415, 19.0140],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-01',
        area_name: 'Hindmata Junction & Dadar TT Basin',
        street_name: 'Dr. Babasaheb Ambedkar Road',
        zone_id: 'ZONE-F-SOUTH-01',
        water_depth_cm: 120,
        risk_level: 'Critical',
        category: '100+',
        color: '#B91C1C',
        is_demo_data: true,
      },
    },

    // 2. Kurla West / Mithi River Corridor — Critical Inundation (105 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-02',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8690, 19.0640],
            [72.8750, 19.0665],
            [72.8795, 19.0710],
            [72.8760, 19.0745],
            [72.8705, 19.0725],
            [72.8665, 19.0680],
            [72.8690, 19.0640],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-02',
        area_name: 'Kurla West Mithi River Overflow',
        street_name: 'LBS Marg / CST Road Corridor',
        zone_id: 'ZONE-L-CENTRAL-01',
        water_depth_cm: 105,
        risk_level: 'Critical',
        category: '100+',
        color: '#B91C1C',
        is_demo_data: true,
      },
    },

    // 3. Milan Subway Underpass — Very High Inundation (85 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-03',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8390, 19.0805],
            [72.8445, 19.0818],
            [72.8460, 19.0855],
            [72.8410, 19.0862],
            [72.8375, 19.0832],
            [72.8390, 19.0805],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-03',
        area_name: 'Milan Subway Underpass',
        street_name: 'Western Railway Crossing Subway',
        zone_id: 'ZONE-HW-SUBWAY-01',
        water_depth_cm: 85,
        risk_level: 'Very High',
        category: '50-100',
        color: '#EA580C',
        is_demo_data: true,
      },
    },

    // 4. Andheri Subway & S.V. Road Pocket — Very High Inundation (68 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-04',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8420, 19.1150],
            [72.8475, 19.1165],
            [72.8490, 19.1210],
            [72.8440, 19.1225],
            [72.8405, 19.1188],
            [72.8420, 19.1150],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-04',
        area_name: 'Andheri Subway & SV Road Pocket',
        street_name: 'Swami Vivekanand Road',
        zone_id: 'ZONE-K-WEST-01',
        water_depth_cm: 68,
        risk_level: 'Very High',
        category: '50-100',
        color: '#EA580C',
        is_demo_data: true,
      },
    },

    // 5. King\'s Circle / Gandhi Market Basin — High Inundation (42 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-05',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8520, 19.0280],
            [72.8575, 19.0295],
            [72.8590, 19.0340],
            [72.8545, 19.0355],
            [72.8505, 19.0320],
            [72.8520, 19.0280],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-05',
        area_name: 'King\'s Circle / Gandhi Market Basin',
        street_name: 'Maheshwari Udyan Roundabout',
        zone_id: 'ZONE-F-NORTH-01',
        water_depth_cm: 42,
        risk_level: 'High',
        category: '20-50',
        color: '#F59E0B',
        is_demo_data: true,
      },
    },

    // 6. Bandra-Kurla Complex (BKC) Connector — High Inundation (32 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-06',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8610, 19.0570],
            [72.8680, 19.0585],
            [72.8710, 19.0630],
            [72.8645, 19.0645],
            [72.8595, 19.0605],
            [72.8610, 19.0570],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-06',
        area_name: 'BKC Connector Lowland',
        street_name: 'G-Block / Asian Heart Institute Road',
        zone_id: 'ZONE-HE-COMMERCIAL-01',
        water_depth_cm: 32,
        risk_level: 'High',
        category: '20-50',
        color: '#F59E0B',
        is_demo_data: true,
      },
    },

    // 7. Sion East Road Depression — Moderate Inundation (16 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-07',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8650, 19.0350],
            [72.8705, 19.0365],
            [72.8725, 19.0405],
            [72.8675, 19.0418],
            [72.8635, 19.0380],
            [72.8650, 19.0350],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-07',
        area_name: 'Sion East Road Depression',
        street_name: 'Sion-Trombay Road Junction',
        zone_id: 'ZONE-F-NORTH-02',
        water_depth_cm: 16,
        risk_level: 'Moderate',
        category: '5-20',
        color: '#93C5FD',
        is_demo_data: true,
      },
    },

    // 8. Malad Subway / S.V. Road Junction — Moderate Inundation (12 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-08',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8440, 19.1780],
            [72.8495, 19.1795],
            [72.8510, 19.1840],
            [72.8460, 19.1855],
            [72.8420, 19.1815],
            [72.8440, 19.1780],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-08',
        area_name: 'Malad Subway Junction',
        street_name: 'Malad Railway Subway Approach',
        zone_id: 'ZONE-P-NORTH-01',
        water_depth_cm: 12,
        risk_level: 'Moderate',
        category: '5-20',
        color: '#93C5FD',
        is_demo_data: true,
      },
    },

    // 9. Worli Seaface Coastal Backflow Pocket — Low Inundation (4 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-09',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.8150, 19.0080],
            [72.8205, 19.0095],
            [72.8225, 19.0135],
            [72.8175, 19.0150],
            [72.8135, 19.0115],
            [72.8150, 19.0080],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-09',
        area_name: 'Worli Naka Coastal Pocket',
        street_name: 'Dr. Annie Besant Road',
        zone_id: 'ZONE-G-SOUTH-01',
        water_depth_cm: 4,
        risk_level: 'Low',
        category: '0-5',
        color: '#DBEAFE',
        is_demo_data: true,
      },
    },

    // 10. Powai Lake Spillway Margin — Low Inundation (5 cm)
    {
      type: 'Feature',
      id: 'FLOOD-ZONE-10',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [72.9020, 19.1210],
            [72.9080, 19.1225],
            [72.9100, 19.1270],
            [72.9045, 19.1285],
            [72.9005, 19.1245],
            [72.9020, 19.1210],
          ],
        ],
      },
      properties: {
        id: 'FLOOD-ZONE-10',
        area_name: 'Powai Lake Spillway Margin',
        street_name: 'Adi Shankaracharya Marg',
        zone_id: 'ZONE-S-CENTRAL-01',
        water_depth_cm: 5,
        risk_level: 'Low',
        category: '0-5',
        color: '#DBEAFE',
        is_demo_data: true,
      },
    },
  ],
};
