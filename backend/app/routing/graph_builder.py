import math
import networkx as nx
from typing import List, Dict, Any, Tuple
from app.data.mumbai_data import MUMBAI_ROAD_NODES, MUMBAI_ROAD_EDGES

def calculate_haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate great circle distance between two points in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_nearest_road_node(lat: float, lng: float, nodes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Find nearest graph node for given lat/lng coordinate.
    """
    if nodes is None:
        nodes = MUMBAI_ROAD_NODES
        
    best_node = nodes[0]
    min_dist = float('inf')
    
    for n in nodes:
        dist = calculate_haversine_distance(lat, lng, n["lat"], n["lng"])
        if dist < min_dist:
            min_dist = dist
            best_node = n
            
    return best_node

def build_mumbai_road_graph() -> Tuple[nx.Graph, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Construct NetworkX graph for Mumbai road network.
    """
    G = nx.Graph()
    nodes = MUMBAI_ROAD_NODES
    edges = MUMBAI_ROAD_EDGES
    
    for n in nodes:
        G.add_node(
            n["id"],
            name=n["name"],
            lat=n["lat"],
            lng=n["lng"],
            node_type=n.get("type", "JUNCTION"),
            catchment_cell_id=n.get("catchment_cell_id", "DEM-GRID-1-1"),
            elevation_m=n.get("elevation_m", 10.0)
        )
        
    for e in edges:
        dist = e["distance_m"]
        speed = e["base_speed_kmh"]
        travel_time = dist / (speed / 3.6) if speed > 0 else 60.0
        
        G.add_edge(
            e["source"],
            e["target"],
            id=e["id"],
            name=e["name"],
            distance_m=dist,
            base_speed_kmh=speed,
            base_travel_time_s=travel_time,
            road_type=e.get("road_type", "ARTERIAL"),
            is_elevated=e.get("is_elevated", False),
            coordinates=e["coordinates"]
        )
        
    return G, nodes, edges
