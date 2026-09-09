import { GeoJSONFeatureCollection } from './flood';

export type NowcastHour = 0 | 1 | 2 | 3;

export interface NowcastSummary {
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  max_depth_cm: number;
  affected_zones_count: number;
  description: string;
}

export interface NowcastTimeStep {
  time_offset: NowcastHour;
  label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  title: string;
  horizon_label: string;
  summary: NowcastSummary;
  rainfall_summary: string;
  features: GeoJSONFeatureCollection;
}

// Shared Polygon Coordinate Definitions (MMR Coordinates)
const POLYGON_COORDINATES = {
  HINDMATA: [
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
  KURLA: [
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
  MILAN_SUBWAY: [
    [
      [72.8390, 19.0805],
      [72.8445, 19.0818],
      [72.8460, 19.0855],
      [72.8410, 19.0862],
      [72.8375, 19.0832],
      [72.8390, 19.0805],
    ],
  ],
  ANDHERI_SUBWAY: [
    [
      [72.8420, 19.1150],
      [72.8475, 19.1165],
      [72.8490, 19.1210],
      [72.8440, 19.1225],
      [72.8405, 19.1188],
      [72.8420, 19.1150],
    ],
  ],
  KINGS_CIRCLE: [
    [
      [72.8520, 19.0280],
      [72.8575, 19.0295],
      [72.8590, 19.0340],
      [72.8545, 19.0355],
      [72.8505, 19.0320],
      [72.8520, 19.0280],
    ],
  ],
  BKC: [
    [
      [72.8610, 19.0570],
      [72.8680, 19.0585],
      [72.8710, 19.0630],
      [72.8645, 19.0645],
      [72.8595, 19.0605],
      [72.8610, 19.0570],
    ],
  ],
  SION: [
    [
      [72.8650, 19.0350],
      [72.8705, 19.0365],
      [72.8725, 19.0405],
      [72.8675, 19.0418],
      [72.8635, 19.0380],
      [72.8650, 19.0350],
    ],
  ],
  MALAD: [
    [
      [72.8440, 19.1780],
      [72.8495, 19.1795],
      [72.8510, 19.1840],
      [72.8460, 19.1855],
      [72.8420, 19.1815],
      [72.8440, 19.1780],
    ],
  ],
  WORLI: [
    [
      [72.8150, 19.0080],
      [72.8205, 19.0095],
      [72.8225, 19.0135],
      [72.8175, 19.0150],
      [72.8135, 19.0115],
      [72.8150, 19.0080],
    ],
  ],
  POWAI: [
    [
      [72.9020, 19.1210],
      [72.9080, 19.1225],
      [72.9100, 19.1270],
      [72.9045, 19.1285],
      [72.9005, 19.1245],
      [72.9020, 19.1210],
    ],
  ],
};

/**
 * 0-3 Hour Nowcast Dataset
 * Time steps:
 * T+0: Initial baseline ponding (4 localized pockets)
 * T+1: Rapid runoff accumulation (+1 hour, 6 pockets)
 * T+2: Severe spreading inundation (+2 hours, 8 pockets)
 * T+3: Peak catchment flooding (+3 hours, 10 pockets)
 */
export const MOCK_NOWCAST_TIMESTEPS: Record<NowcastHour, NowcastTimeStep> = {
  // --- T+0: Current State ---
  0: {
    time_offset: 0,
    label: 'T+0',
    title: 'Current Observations',
    horizon_label: 'Current (T+0)',
    rainfall_summary: 'Heavy localized storm cell over central corridor',
    summary: {
      risk_level: 'Moderate',
      max_depth_cm: 28,
      affected_zones_count: 4,
      description: 'Initial surface ponding at vulnerable subway underpasses and coastal basins.',
    },
    features: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-01',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.HINDMATA },
          properties: {
            id: 'FLOOD-ZONE-01',
            area_name: 'Hindmata Junction & Dadar TT Basin',
            street_name: 'Dr. Babasaheb Ambedkar Road',
            zone_id: 'ZONE-F-SOUTH-01',
            water_depth_cm: 28,
            risk_level: 'High',
            category: '20-50',
            color: '#F59E0B',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-03',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MILAN_SUBWAY },
          properties: {
            id: 'FLOOD-ZONE-03',
            area_name: 'Milan Subway Underpass',
            street_name: 'Western Railway Crossing Subway',
            zone_id: 'ZONE-HW-SUBWAY-01',
            water_depth_cm: 18,
            risk_level: 'Moderate',
            category: '5-20',
            color: '#93C5FD',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-08',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MALAD },
          properties: {
            id: 'FLOOD-ZONE-08',
            area_name: 'Malad Subway Junction',
            street_name: 'Malad Railway Subway Approach',
            zone_id: 'ZONE-P-NORTH-01',
            water_depth_cm: 8,
            risk_level: 'Moderate',
            category: '5-20',
            color: '#93C5FD',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-09',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.WORLI },
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
      ],
    },
  },

  // --- T+1: 1 Hour Ahead ---
  1: {
    time_offset: 1,
    label: 'T+1',
    title: '1 Hour Horizon',
    horizon_label: '1 Hour Ahead (T+1)',
    rainfall_summary: 'Sustained precipitation causing storm drain saturation',
    summary: {
      risk_level: 'High',
      max_depth_cm: 65,
      affected_zones_count: 6,
      description: 'Runoff accumulating rapidly across major road arteries and subways.',
    },
    features: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-01',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.HINDMATA },
          properties: {
            id: 'FLOOD-ZONE-01',
            area_name: 'Hindmata Junction & Dadar TT Basin',
            street_name: 'Dr. Babasaheb Ambedkar Road',
            zone_id: 'ZONE-F-SOUTH-01',
            water_depth_cm: 65,
            risk_level: 'Very High',
            category: '50-100',
            color: '#EA580C',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-03',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MILAN_SUBWAY },
          properties: {
            id: 'FLOOD-ZONE-03',
            area_name: 'Milan Subway Underpass',
            street_name: 'Western Railway Crossing Subway',
            zone_id: 'ZONE-HW-SUBWAY-01',
            water_depth_cm: 48,
            risk_level: 'High',
            category: '20-50',
            color: '#F59E0B',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-04',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.ANDHERI_SUBWAY },
          properties: {
            id: 'FLOOD-ZONE-04',
            area_name: 'Andheri Subway & SV Road Pocket',
            street_name: 'Swami Vivekanand Road',
            zone_id: 'ZONE-K-WEST-01',
            water_depth_cm: 36,
            risk_level: 'High',
            category: '20-50',
            color: '#F59E0B',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-06',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.BKC },
          properties: {
            id: 'FLOOD-ZONE-06',
            area_name: 'BKC Connector Lowland',
            street_name: 'G-Block / Asian Heart Institute Road',
            zone_id: 'ZONE-HE-COMMERCIAL-01',
            water_depth_cm: 18,
            risk_level: 'Moderate',
            category: '5-20',
            color: '#93C5FD',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-08',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MALAD },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-09',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.WORLI },
          properties: {
            id: 'FLOOD-ZONE-09',
            area_name: 'Worli Naka Coastal Pocket',
            street_name: 'Dr. Annie Besant Road',
            zone_id: 'ZONE-G-SOUTH-01',
            water_depth_cm: 5,
            risk_level: 'Low',
            category: '0-5',
            color: '#DBEAFE',
            is_demo_data: true,
          },
        },
      ],
    },
  },

  // --- T+2: 2 Hours Ahead ---
  2: {
    time_offset: 2,
    label: 'T+2',
    title: '2 Hours Horizon',
    horizon_label: '2 Hours Ahead (T+2)',
    rainfall_summary: 'Peak storm intensity coinciding with high tidal curve',
    summary: {
      risk_level: 'Critical',
      max_depth_cm: 95,
      affected_zones_count: 8,
      description: 'Severe inundation across central transport hubs; subways submerged.',
    },
    features: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-01',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.HINDMATA },
          properties: {
            id: 'FLOOD-ZONE-01',
            area_name: 'Hindmata Junction & Dadar TT Basin',
            street_name: 'Dr. Babasaheb Ambedkar Road',
            zone_id: 'ZONE-F-SOUTH-01',
            water_depth_cm: 95,
            risk_level: 'Very High',
            category: '50-100',
            color: '#EA580C',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-02',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.KURLA },
          properties: {
            id: 'FLOOD-ZONE-02',
            area_name: 'Kurla West Mithi River Overflow',
            street_name: 'LBS Marg / CST Road Corridor',
            zone_id: 'ZONE-L-CENTRAL-01',
            water_depth_cm: 82,
            risk_level: 'Very High',
            category: '50-100',
            color: '#EA580C',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-03',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MILAN_SUBWAY },
          properties: {
            id: 'FLOOD-ZONE-03',
            area_name: 'Milan Subway Underpass',
            street_name: 'Western Railway Crossing Subway',
            zone_id: 'ZONE-HW-SUBWAY-01',
            water_depth_cm: 74,
            risk_level: 'Very High',
            category: '50-100',
            color: '#EA580C',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-04',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.ANDHERI_SUBWAY },
          properties: {
            id: 'FLOOD-ZONE-04',
            area_name: 'Andheri Subway & SV Road Pocket',
            street_name: 'Swami Vivekanand Road',
            zone_id: 'ZONE-K-WEST-01',
            water_depth_cm: 56,
            risk_level: 'Very High',
            category: '50-100',
            color: '#EA580C',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-05',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.KINGS_CIRCLE },
          properties: {
            id: 'FLOOD-ZONE-05',
            area_name: "King's Circle / Gandhi Market Basin",
            street_name: 'Maheshwari Udyan Roundabout',
            zone_id: 'ZONE-F-NORTH-01',
            water_depth_cm: 38,
            risk_level: 'High',
            category: '20-50',
            color: '#F59E0B',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-06',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.BKC },
          properties: {
            id: 'FLOOD-ZONE-06',
            area_name: 'BKC Connector Lowland',
            street_name: 'G-Block / Asian Heart Institute Road',
            zone_id: 'ZONE-HE-COMMERCIAL-01',
            water_depth_cm: 28,
            risk_level: 'High',
            category: '20-50',
            color: '#F59E0B',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-07',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.SION },
          properties: {
            id: 'FLOOD-ZONE-07',
            area_name: 'Sion East Road Depression',
            street_name: 'Sion-Trombay Road Junction',
            zone_id: 'ZONE-F-NORTH-02',
            water_depth_cm: 14,
            risk_level: 'Moderate',
            category: '5-20',
            color: '#93C5FD',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-08',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MALAD },
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
      ],
    },
  },

  // --- T+3: 3 Hours Ahead (Peak Inundation) ---
  3: {
    time_offset: 3,
    label: 'T+3',
    title: '3 Hours Horizon',
    horizon_label: '3 Hours Ahead (T+3)',
    rainfall_summary: 'Widespread catchment overflow and severe backwater pressure',
    summary: {
      risk_level: 'Critical',
      max_depth_cm: 120,
      affected_zones_count: 10,
      description: 'Peak flood inundation output; major arterial routes impassable.',
    },
    features: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-01',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.HINDMATA },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-02',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.KURLA },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-03',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MILAN_SUBWAY },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-04',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.ANDHERI_SUBWAY },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-05',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.KINGS_CIRCLE },
          properties: {
            id: 'FLOOD-ZONE-05',
            area_name: "King's Circle / Gandhi Market Basin",
            street_name: 'Maheshwari Udyan Roundabout',
            zone_id: 'ZONE-F-NORTH-01',
            water_depth_cm: 42,
            risk_level: 'High',
            category: '20-50',
            color: '#F59E0B',
            is_demo_data: true,
          },
        },
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-06',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.BKC },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-07',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.SION },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-08',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.MALAD },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-09',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.WORLI },
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
        {
          type: 'Feature',
          id: 'FLOOD-ZONE-10',
          geometry: { type: 'Polygon', coordinates: POLYGON_COORDINATES.POWAI },
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
    },
  },
};
