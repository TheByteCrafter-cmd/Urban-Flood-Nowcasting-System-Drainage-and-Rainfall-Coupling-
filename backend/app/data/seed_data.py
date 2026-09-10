from typing import List, Dict, Any

MUMBAI_CATCHMENTS = [
    {
        "catchment_id": "CATCH-01",
        "zone_name": "Hindmata / Dadar Lowlands",
        "area_m2": 25000.0,
        "land_use": "COMMERCIAL_DENSE_URBAN",
        "runoff_coefficient_c": 0.90
    },
    {
        "catchment_id": "CATCH-02",
        "zone_name": "Kurla West / Mithi River Basin",
        "area_m2": 32000.0,
        "land_use": "RESIDENTIAL_HIGH_DENSITY",
        "runoff_coefficient_c": 0.85
    },
    {
        "catchment_id": "CATCH-03",
        "zone_name": "Andheri Station / SV Road",
        "area_m2": 28000.0,
        "land_use": "COMMERCIAL_DENSE_URBAN",
        "runoff_coefficient_c": 0.90
    },
    {
        "catchment_id": "CATCH-04",
        "zone_name": "Byculla Police Basin",
        "area_m2": 18000.0,
        "land_use": "SUBURBAN_LOW_DENSITY",
        "runoff_coefficient_c": 0.65
    }
]

MUMBAI_DRAINAGE_NODES = [
    {
        "id": "MH-2091",
        "node_id": "MH-2091",
        "name": "Hindmata Junction Main Hub",
        "node_type": "MANHOLE",
        "lat": 19.0185,
        "lng": 72.8425,
        "elevation_m": 8.5,
        "capacity_m3_s": 2.41
    },
    {
        "id": "MH-2092",
        "node_id": "MH-2092",
        "name": "Dadar TT Chamber",
        "node_type": "MANHOLE",
        "lat": 19.0205,
        "lng": 72.8460,
        "elevation_m": 9.2,
        "capacity_m3_s": 3.10
    },
    {
        "id": "MH-3041",
        "node_id": "MH-3041",
        "name": "Kurla LBS Junction Manhole",
        "node_type": "MANHOLE",
        "lat": 19.0680,
        "lng": 72.8720,
        "elevation_m": 11.0,
        "capacity_m3_s": 2.80
    },
    {
        "id": "IN-101",
        "node_id": "IN-101",
        "name": "Andheri Subway Catch Basin",
        "node_type": "CATCH_BASIN",
        "lat": 19.1185,
        "lng": 72.8390,
        "elevation_m": 7.8,
        "capacity_m3_s": 1.95
    },
    {
        "id": "OUT-01",
        "node_id": "OUT-01",
        "name": "Mahalaxmi Outfall Gate",
        "node_type": "OUTFALL",
        "lat": 18.9810,
        "lng": 72.8250,
        "elevation_m": 2.1,
        "capacity_m3_s": 8.50
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
        "roughness_n": 0.013
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
        "roughness_n": 0.015
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
        "roughness_n": 0.013
    }
]

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

MAP_LAYERS_METADATA = [
    {"layer_id": "basemap", "layer_name": "Neutral Light Canvas", "type": "raster", "visible_default": True, "opacity": 1.0},
    {"layer_id": "radar", "layer_name": "Doppler Radar Rainfall Heatmap", "type": "raster", "visible_default": True, "opacity": 0.65},
    {"layer_id": "dem", "layer_name": "Digital Elevation Model Hillshade", "type": "raster", "visible_default": False, "opacity": 0.5},
    {"layer_id": "flood_polygons", "layer_name": "Street Inundation Depth Polygons", "type": "vector-polygon", "visible_default": True, "opacity": 0.7},
    {"layer_id": "drainage_nodes", "layer_name": "Underground Manholes & Catch Basins", "type": "vector-point", "visible_default": True, "opacity": 1.0},
    {"layer_id": "drainage_edges", "layer_name": "Underground Pipe & Canal Graph", "type": "vector-linestring", "visible_default": True, "opacity": 0.95},
    {"layer_id": "routing_path", "layer_name": "Flood-Aware Safe Route Polyline", "type": "vector-linestring", "visible_default": True, "opacity": 1.0}
]
