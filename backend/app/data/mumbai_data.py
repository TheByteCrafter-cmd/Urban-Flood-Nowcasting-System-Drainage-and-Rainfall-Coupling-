from typing import Dict, Any, List

MUMBAI_CITY_INFO = {
    "city_id": "mumbai",
    "city_name": "Mumbai Metropolitan Region",
    "state": "Maharashtra",
    "center": [72.8777, 19.0760],  # [lng, lat]
    "zoom": 12
}

MUMBAI_NOWCAST_SUMMARY = {
    "city_id": "mumbai",
    "last_updated": "2026-09-10T09:00:00Z",
    "nowcast_window_hours": 3,
    "current_rainfall_mm_hr": 48.5,
    "max_predicted_water_depth_cm": 120.0,
    "critical_intersections_count": 5,
    "surcharged_manholes_count": 14,
    "model_status": "ACTIVE_RUNNING"
}

# Flood Inundation Polygons over Mumbai Hotspots
MUMBAI_FLOOD_ZONES_BASE = [
    {
        "id": "FLOOD-ZONE-01",
        "location_name": "Hindmata Junction & Dadar TT Basin",
        "area_name": "Hindmata Junction & Dadar TT Basin",
        "street_name": "Dr. Babasaheb Ambedkar Road",
        "zone_id": "ZONE-F-SOUTH-01",
        "coordinates": [
            [
                [72.8415, 19.0140],
                [72.8465, 19.0152],
                [72.8490, 19.0185],
                [72.8472, 19.0220],
                [72.8420, 19.0205],
                [72.8395, 19.0168],
                [72.8415, 19.0140],
            ]
        ],
        "depth_t0": 85.0,
        "depth_t1": 120.0,
        "depth_t2": 95.0,
        "depth_t3": 45.0,
    },
    {
        "id": "FLOOD-ZONE-02",
        "location_name": "Kurla West & Mithi River Corridor",
        "area_name": "Kurla West & Mithi River Corridor",
        "street_name": "LBS Marg / Premier Road",
        "zone_id": "ZONE-F-CENTRAL-02",
        "coordinates": [
            [
                [72.8690, 19.0640],
                [72.8750, 19.0665],
                [72.8795, 19.0710],
                [72.8760, 19.0745],
                [72.8705, 19.0725],
                [72.8675, 19.0680],
                [72.8690, 19.0640],
            ]
        ],
        "depth_t0": 70.0,
        "depth_t1": 105.0,
        "depth_t2": 80.0,
        "depth_t3": 35.0,
    },
    {
        "id": "FLOOD-ZONE-03",
        "location_name": "Sion Railway Low-Lying Depression",
        "area_name": "Sion Railway Low-Lying Depression",
        "street_name": "Sion-Bandra Link Road",
        "zone_id": "ZONE-F-CENTRAL-03",
        "coordinates": [
            [
                [72.8580, 19.0380],
                [72.8635, 19.0395],
                [72.8660, 19.0435],
                [72.8615, 19.0450],
                [72.8565, 19.0420],
                [72.8580, 19.0380],
            ]
        ],
        "depth_t0": 45.0,
        "depth_t1": 78.0,
        "depth_t2": 60.0,
        "depth_t3": 25.0,
    },
    {
        "id": "FLOOD-ZONE-04",
        "location_name": "Andheri Subway & SV Road Junction",
        "area_name": "Andheri Subway & SV Road Junction",
        "street_name": "Swami Vivekananda Road",
        "zone_id": "ZONE-F-WEST-04",
        "coordinates": [
            [
                [72.8360, 19.1170],
                [72.8410, 19.1185],
                [72.8430, 19.1220],
                [72.8390, 19.1235],
                [72.8345, 19.1200],
                [72.8360, 19.1170],
            ]
        ],
        "depth_t0": 55.0,
        "depth_t1": 92.0,
        "depth_t2": 72.0,
        "depth_t3": 30.0,
    },
    {
        "id": "FLOOD-ZONE-05",
        "location_name": "Byculla Police Station Lowpoint",
        "area_name": "Byculla Police Station Lowpoint",
        "street_name": "Sane Guruji Marg",
        "zone_id": "ZONE-F-SOUTH-05",
        "coordinates": [
            [
                [72.8290, 18.9750],
                [72.8340, 18.9765],
                [72.8365, 18.9800],
                [72.8320, 18.9815],
                [72.8275, 18.9785],
                [72.8290, 18.9750],
            ]
        ],
        "depth_t0": 30.0,
        "depth_t1": 48.0,
        "depth_t2": 35.0,
        "depth_t3": 12.0,
    },
    {
        "id": "FLOOD-ZONE-06",
        "location_name": "Milan Subway / Santacruz West",
        "area_name": "Milan Subway / Santacruz West",
        "street_name": "Milan Subway Underpass",
        "zone_id": "ZONE-F-WEST-06",
        "coordinates": [
            [
                [72.8410, 19.0880],
                [72.8455, 19.0895],
                [72.8480, 19.0930],
                [72.8435, 19.0945],
                [72.8395, 19.0915],
                [72.8410, 19.0880],
            ]
        ],
        "depth_t0": 62.0,
        "depth_t1": 88.0,
        "depth_t2": 65.0,
        "depth_t3": 28.0,
    },
    {
        "id": "FLOOD-ZONE-07",
        "location_name": "King Circle & Matunga Bridge",
        "area_name": "King Circle & Matunga Bridge",
        "street_name": "Bhaudaji Road",
        "zone_id": "ZONE-F-SOUTH-07",
        "coordinates": [
            [
                [72.8510, 19.0270],
                [72.8560, 19.0285],
                [72.8580, 19.0320],
                [72.8535, 19.0335],
                [72.8490, 19.0300],
                [72.8510, 19.0270],
            ]
        ],
        "depth_t0": 40.0,
        "depth_t1": 68.0,
        "depth_t2": 52.0,
        "depth_t3": 18.0,
    }
]

# Drainage Nodes & Pipes for Mumbai Basin
MUMBAI_DRAINAGE_NODES = [
    {
        "id": "MH-2091",
        "node_id": "MH-2091",
        "name": "Hindmata Junction Main Hub",
        "node_type": "Manhole",
        "lat": 19.0185,
        "lng": 72.8425,
        "elevation_m": 8.5,
        "catchment_cell_id": "DEM-GRID-1-1",
        "explicit_outlet_capacity_m3_s": 2.41,
        "provenance": "ASSUMED_PROTOTYPE"
    },
    {
        "id": "MH-2092",
        "node_id": "MH-2092",
        "name": "Dadar TT Chamber",
        "node_type": "Manhole",
        "lat": 19.0205,
        "lng": 72.8460,
        "elevation_m": 9.2,
        "catchment_cell_id": "DEM-GRID-1-1",
        "explicit_outlet_capacity_m3_s": 3.10,
        "provenance": "ASSUMED_PROTOTYPE"
    },
    {
        "id": "MH-3041",
        "node_id": "MH-3041",
        "name": "Kurla LBS Junction Manhole",
        "node_type": "Manhole",
        "lat": 19.0680,
        "lng": 72.8720,
        "elevation_m": 11.0,
        "catchment_cell_id": "DEM-GRID-2-1",
        "explicit_outlet_capacity_m3_s": 2.80,
        "provenance": "ASSUMED_PROTOTYPE"
    },
    {
        "id": "IN-101",
        "node_id": "IN-101",
        "name": "Andheri Subway Catch Basin",
        "node_type": "Catch Basin",
        "lat": 19.1185,
        "lng": 72.8390,
        "elevation_m": 7.8,
        "catchment_cell_id": "DEM-GRID-3-1",
        "explicit_outlet_capacity_m3_s": 1.95,
        "provenance": "ASSUMED_PROTOTYPE"
    },
    {
        "id": "OUT-01",
        "node_id": "OUT-01",
        "name": "Mahalaxmi Outfall Gate",
        "node_type": "Outfall",
        "lat": 18.9810,
        "lng": 72.8250,
        "elevation_m": 2.1,
        "catchment_cell_id": "DEM-GRID-0-1",
        "explicit_outlet_capacity_m3_s": 8.50,
        "provenance": "ASSUMED_PROTOTYPE"
    }
]

MUMBAI_DRAINAGE_EDGES = [
    {
        "id": "pipe_4012",
        "pipe_id": "P-4012",
        "name": "Hindmata-Dadar Main Trunk Line",
        "from_node": "MH-2091",
        "to_node": "MH-2092",
        "edge_type": "CIRCULAR_PIPE",
        "coordinates": [[72.8425, 19.0185], [72.8460, 19.0205]],
        "length_m": 420.0,
        "diameter_m": 1.2,
        "slope": 0.004,
        "roughness_n": 0.013,
        "provenance": "ASSUMED_PROTOTYPE"
    },
    {
        "id": "pipe_4013",
        "pipe_id": "P-4013",
        "name": "Kurla-Mithi Discharge Canal",
        "from_node": "MH-3041",
        "to_node": "MH-2091",
        "edge_type": "BOX_CULVERT",
        "coordinates": [[72.8720, 19.0680], [72.8425, 19.0185]],
        "length_m": 1250.0,
        "width_m": 2.0,
        "height_m": 1.5,
        "slope": 0.003,
        "roughness_n": 0.015,
        "provenance": "ASSUMED_PROTOTYPE"
    },
    {
        "id": "pipe_4014",
        "pipe_id": "P-4014",
        "name": "Andheri Storm Drain Feeder",
        "from_node": "IN-101",
        "to_node": "MH-3041",
        "edge_type": "CIRCULAR_PIPE",
        "coordinates": [[72.8390, 19.1185], [72.8720, 19.0680]],
        "length_m": 890.0,
        "diameter_m": 1.0,
        "slope": 0.005,
        "roughness_n": 0.013,
        "provenance": "ASSUMED_PROTOTYPE"
    }
]

# Mumbai Road Graph Nodes and Edges for NetworkX Dijkstra Routing
MUMBAI_ROAD_NODES = [
    {"id": "RN-COLABA", "name": "Colaba / Regal Circle", "lat": 18.9220, "lng": 72.8320, "type": "TERMINUS", "catchment_cell_id": "DEM-GRID-0-1", "elevation_m": 6.5},
    {"id": "RN-CST", "name": "CST / Fort Transit Hub", "lat": 18.9400, "lng": 72.8350, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-0-1", "elevation_m": 7.0},
    {"id": "RN-MARINE-LINES", "name": "Marine Lines / Marine Drive", "lat": 18.9450, "lng": 72.8240, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-0-1", "elevation_m": 8.0},
    {"id": "RN-BYCULLA", "name": "Byculla Junction", "lat": 18.9750, "lng": 72.8330, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-0-2", "elevation_m": 5.2},
    {"id": "RN-WORLI", "name": "Worli Seaface Point", "lat": 19.0120, "lng": 72.8180, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-1-0", "elevation_m": 12.0},
    {"id": "RN-LOWER-PAREL", "name": "Lower Parel Flyover", "lat": 18.9980, "lng": 72.8310, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-1-1", "elevation_m": 11.5},
    {"id": "RN-DADAR-HINDMATA", "name": "Dadar / Hindmata Basin", "lat": 19.0180, "lng": 72.8420, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-1-1", "elevation_m": 4.2},
    {"id": "RN-WADALA", "name": "Wadala Eastern Freeway Ramp", "lat": 19.0160, "lng": 72.8620, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-1-2", "elevation_m": 15.0},
    {"id": "RN-BANDRA-WEST", "name": "Bandra West / SV Road", "lat": 19.0550, "lng": 72.8360, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-2-1", "elevation_m": 9.0},
    {"id": "RN-BKC", "name": "BKC Financial Center", "lat": 19.0660, "lng": 72.8680, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-2-2", "elevation_m": 8.5},
    {"id": "RN-KURLA", "name": "Kurla Junction / LBS Marg", "lat": 19.0700, "lng": 72.8750, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-2-1", "elevation_m": 4.5},
    {"id": "RN-ANDHERI", "name": "Andheri Station / WEH Hub", "lat": 19.1180, "lng": 72.8460, "type": "JUNCTION", "catchment_cell_id": "DEM-GRID-3-1", "elevation_m": 10.0}
]

MUMBAI_ROAD_EDGES = [
    {"id": "RE-01", "name": "Marine Drive Coastal Corridor", "source": "RN-MARINE-LINES", "target": "RN-WORLI", "distance_m": 7200, "base_speed_kmh": 60, "road_type": "EXPRESSWAY", "is_elevated": True, "coordinates": [[18.9450, 72.8240], [18.9800, 72.8150], [19.0120, 72.8180]]},
    {"id": "RE-02", "name": "Dr. Ambedkar Road (Hindmata Stretch)", "source": "RN-BYCULLA", "target": "RN-DADAR-HINDMATA", "distance_m": 4800, "base_speed_kmh": 40, "road_type": "ARTERIAL", "is_elevated": False, "coordinates": [[18.9750, 72.8330], [18.9950, 72.8380], [19.0180, 72.8420]]},
    {"id": "RE-03", "name": "Eastern Freeway Elevated Highway", "source": "RN-CST", "target": "RN-WADALA", "distance_m": 8500, "base_speed_kmh": 70, "road_type": "EXPRESSWAY", "is_elevated": True, "coordinates": [[18.9400, 72.8350], [18.9800, 72.8550], [19.0160, 72.8620]]},
    {"id": "RE-04", "name": "Worli-Bandra Sea Link (Flyover)", "source": "RN-WORLI", "target": "RN-BANDRA-WEST", "distance_m": 5600, "base_speed_kmh": 80, "road_type": "EXPRESSWAY", "is_elevated": True, "coordinates": [[19.0120, 72.8180], [19.0350, 72.8220], [19.0550, 72.8360]]},
    {"id": "RE-05", "name": "Dadar-Wadala Connecting Road", "source": "RN-DADAR-HINDMATA", "target": "RN-WADALA", "distance_m": 2400, "base_speed_kmh": 45, "road_type": "SUB_ARTERIAL", "is_elevated": False, "coordinates": [[19.0180, 72.8420], [19.0170, 72.8520], [19.0160, 72.8620]]},
    {"id": "RE-06", "name": "Wadala-BKC Elevated Connector", "source": "RN-WADALA", "target": "RN-BKC", "distance_m": 5800, "base_speed_kmh": 60, "road_type": "EXPRESSWAY", "is_elevated": True, "coordinates": [[19.0160, 72.8620], [19.0400, 72.8650], [19.0660, 72.8680]]},
    {"id": "RE-07", "name": "LBS Marg (Kurla Waterlogged Corridor)", "source": "RN-DADAR-HINDMATA", "target": "RN-KURLA", "distance_m": 6100, "base_speed_kmh": 35, "road_type": "ARTERIAL", "is_elevated": False, "coordinates": [[19.0180, 72.8420], [19.0450, 72.8600], [19.0700, 72.8750]]},
    {"id": "RE-08", "name": "Western Express Highway (Elevated Corridor)", "source": "RN-BANDRA-WEST", "target": "RN-ANDHERI", "distance_m": 7500, "base_speed_kmh": 65, "road_type": "EXPRESSWAY", "is_elevated": True, "coordinates": [[19.0550, 72.8360], [19.0850, 72.8410], [19.1180, 72.8460]]},
    {"id": "RE-09", "name": "BKC-Kurla Internal Link", "source": "RN-BKC", "target": "RN-KURLA", "distance_m": 1200, "base_speed_kmh": 40, "road_type": "LOCAL", "is_elevated": False, "coordinates": [[19.0660, 72.8680], [19.0700, 72.8750]]},
    {"id": "RE-10", "name": "Colaba to CST Main Corridor", "source": "RN-COLABA", "target": "RN-CST", "distance_m": 2200, "base_speed_kmh": 40, "road_type": "ARTERIAL", "is_elevated": False, "coordinates": [[18.9220, 72.8320], [18.9400, 72.8350]]}
]

MUMBAI_ALERTS = [
    {
        "alert_id": "ALT-MMR-2026-0891",
        "severity": "CRITICAL",
        "location": "Hindmata Junction & Ambedkar Road Underpass",
        "predicted_depth_cm": 120.0,
        "time_window": "09:00 - 11:30 IST",
        "recommended_action": "Subway closed to vehicular traffic. Divert via Eastern Freeway elevated corridor.",
        "issued_at": "2026-09-10T08:45:00Z"
    },
    {
        "alert_id": "ALT-MMR-2026-0892",
        "severity": "CRITICAL",
        "location": "Kurla West LBS Marg & Mithi River Outfall",
        "predicted_depth_cm": 105.0,
        "time_window": "09:15 - 12:00 IST",
        "recommended_action": "High tide backflow warning. Dewatering pumps #3 & #4 deployed.",
        "issued_at": "2026-09-10T08:50:00Z"
    },
    {
        "alert_id": "ALT-MMR-2026-0893",
        "severity": "HIGH",
        "location": "Andheri Subway Underpass",
        "predicted_depth_cm": 92.0,
        "time_window": "09:30 - 11:00 IST",
        "recommended_action": "Light vehicles prohibited. Emergency vehicles use WEH flyover.",
        "issued_at": "2026-09-10T08:55:00Z"
    },
    {
        "alert_id": "ALT-MMR-2026-0894",
        "severity": "MODERATE",
        "location": "Byculla Police Station Lowpoint",
        "predicted_depth_cm": 48.0,
        "time_window": "10:00 - 12:30 IST",
        "recommended_action": "Proceed with caution. Pedestrian traffic affected.",
        "issued_at": "2026-09-10T09:00:00Z"
    }
]
