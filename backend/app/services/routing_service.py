import math
import networkx as nx
from datetime import datetime
from typing import Dict, Any, List, Tuple
from app.data.seed_data import MUMBAI_ROAD_NODES, MUMBAI_ROAD_EDGES
from app.services.risk_service import get_risk_classification

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2.0) ** 2
    return R * (2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))

def find_nearest_node(lat: float, lng: float) -> Dict[str, Any]:
    best = MUMBAI_ROAD_NODES[0]
    min_d = float('inf')
    for n in MUMBAI_ROAD_NODES:
        d = haversine_distance(lat, lng, n["lat"], n["lng"])
        if d < min_d:
            min_d = d
            best = n
    return best

def build_road_network_graph() -> nx.Graph:
    G = nx.Graph()
    for n in MUMBAI_ROAD_NODES:
        G.add_node(n["id"], name=n["name"], lat=n["lat"], lng=n["lng"], type=n.get("type", "JUNCTION"), catchment_cell_id=n.get("catchment_cell_id", "DEM-GRID-1-1"))
    for e in MUMBAI_ROAD_EDGES:
        dist = e["distance_m"]
        speed = e["base_speed_kmh"]
        travel_time = dist / (speed / 3.6) if speed > 0 else 60.0
        G.add_edge(
            e["source"], e["target"],
            id=e["id"], name=e["name"], distance_m=dist, base_speed_kmh=speed,
            base_travel_time_s=travel_time, road_type=e.get("road_type", "ARTERIAL"),
            is_elevated=e.get("is_elevated", False), coordinates=e["coordinates"]
        )
    return G

def get_edge_depth(edge_data: Dict[str, Any], rainfall_mm_hr: float = 48.5) -> float:
    if edge_data.get("is_elevated", False) or rainfall_mm_hr <= 0:
        return 0.0
    scale = rainfall_mm_hr / 48.5
    edge_id = edge_data.get("id", "")
    edge_name = edge_data.get("name", "")
    if "Hindmata" in edge_name or edge_id == "RE-02":
        return round(120.0 * scale, 1)
    elif "Kurla" in edge_name or edge_id == "RE-07":
        return round(105.0 * scale, 1)
    elif "BKC-Kurla" in edge_name or edge_id == "RE-09":
        return round(45.0 * scale, 1)
    elif "Dadar-Wadala" in edge_name or edge_id == "RE-05":
        return round(18.0 * scale, 1)
    else:
        return 0.0

def compute_safe_route_pair(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    routing_mode: str = "SAFEST",
    vehicle_type: str = "EMERGENCY_AMBULANCE",
    max_allowable_depth_cm: float = 20.0,
    rainfall_mm_hr: float = 48.5
) -> Dict[str, Any]:
    G = build_road_network_graph()
    orig = find_nearest_node(origin_lat, origin_lng)
    dest = find_nearest_node(dest_lat, dest_lng)
    orig_id, dest_id = orig["id"], dest["id"]

    # 1. Standard Route (Shortest time)
    std_path = nx.shortest_path(G, source=orig_id, target=dest_id, weight="base_travel_time_s")
    
    # 2. Penalty Safe Route
    def safe_weight(u, v, e):
        base_t = e.get("base_travel_time_s", 60.0)
        depth = get_edge_depth(e, rainfall_mm_hr)
        if depth > max_allowable_depth_cm:
            penalty = 1.0 + 100.0 * ((depth - max_allowable_depth_cm) ** 2)
            return base_t * penalty
        return base_t

    safe_path = nx.dijkstra_path(G, source=orig_id, target=dest_id, weight=safe_weight)

    def build_result(path_nodes: List[str], mode_label: str) -> Dict[str, Any]:
        segs = []
        tot_dist, tot_time = 0.0, 0.0
        max_d = 0.0
        highest_risk = "LOW"
        coords = []
        avoided = []
        
        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i+1]
            e = G[u][v]
            dist = e.get("distance_m", 1000.0)
            speed = e.get("base_speed_kmh", 40.0)
            depth = get_edge_depth(e, rainfall_mm_hr)
            risk_info = get_risk_classification(depth)
            
            if depth > max_allowable_depth_cm:
                eff_speed = 5.0
                blocked = True
                avoided.append({
                    "edge_id": e["id"],
                    "name": e["name"],
                    "risk_level": risk_info["risk_level"],
                    "depth_cm": depth,
                    "reason": f"Depth {depth} cm exceeds allowable threshold ({max_allowable_depth_cm} cm)"
                })
            else:
                eff_speed = speed
                blocked = False
                
            t_s = dist / (eff_speed / 3.6)
            tot_dist += dist
            tot_time += t_s
            if depth > max_d:
                max_d = depth
                highest_risk = risk_info["risk_level"]
                
            edge_coords = e.get("coordinates", [[G.nodes[u]["lat"], G.nodes[u]["lng"]], [G.nodes[v]["lat"], G.nodes[v]["lng"]]])
            if i == 0:
                coords.extend(edge_coords)
            else:
                coords.extend(edge_coords[1:])
                
            segs.append({
                "edge_id": e["id"],
                "name": e["name"],
                "from_node_id": u,
                "to_node_id": v,
                "from_node_name": G.nodes[u]["name"],
                "to_node_name": G.nodes[v]["name"],
                "distance_m": round(dist, 1),
                "base_speed_kmh": speed,
                "effective_speed_kmh": round(eff_speed, 1),
                "travel_time_s": round(t_s, 1),
                "flood_depth_cm": depth,
                "risk_level": risk_info["risk_level"],
                "penalty_factor": 1.0 if not blocked else 15.0,
                "is_blocked": blocked,
                "coordinates": edge_coords
            })

        return {
            "status": "FOUND",
            "mode": mode_label,
            "horizon": "T+1",
            "origin": {
                "id": orig["id"], "name": orig["name"], "lat": orig["lat"], "lng": orig["lng"],
                "type": orig.get("type", "JUNCTION"), "catchment_cell_id": orig.get("catchment_cell_id", "DEM-GRID-1-1")
            },
            "destination": {
                "id": dest["id"], "name": dest["name"], "lat": dest["lat"], "lng": dest["lng"],
                "type": dest.get("type", "JUNCTION"), "catchment_cell_id": dest.get("catchment_cell_id", "DEM-GRID-1-1")
            },
            "total_distance_m": round(tot_dist, 1),
            "total_distance_km": round(tot_dist / 1000.0, 2),
            "total_time_s": round(tot_time, 1),
            "total_time_min": round(tot_time / 60.0, 1),
            "max_flood_depth_cm": max_d,
            "highest_risk_level": highest_risk,
            "segments": segs,
            "path_node_ids": path_nodes,
            "coordinates": coords,
            "risk_exposure": {"low_m": tot_dist if max_d < 5 else 0.0, "moderate_m": 0, "high_m": 0, "very_high_m": 0, "critical_m": tot_dist if max_d >= 100 else 0},
            "avoided_segments": avoided,
            "explanation": f"Computed {mode_label} path. Max flood depth along path: {max_d} cm.",
            "is_alternative": mode_label == "FASTEST"
        }

    primary = build_result(safe_path, routing_mode.upper())
    alternative = build_result(std_path, "FASTEST")

    return {
        "status": "success",
        "primary": primary,
        "alternative": alternative,
        "evaluated_at": datetime.utcnow().isoformat() + "Z",
        "horizon": "T+1",
        "mode": routing_mode.upper()
    }
