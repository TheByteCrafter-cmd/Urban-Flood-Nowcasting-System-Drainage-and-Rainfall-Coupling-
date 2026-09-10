import networkx as nx
from typing import Dict, Any, List, Optional
from app.routing.graph_builder import build_mumbai_road_graph, find_nearest_road_node
from app.physics.hydraulic_coupling import get_risk_classification
from app.data.mumbai_data import MUMBAI_FLOOD_ZONES_BASE

def get_edge_flood_depth(edge_data: Dict[str, Any], horizon: str = "T+1") -> float:
    """
    Determine predicted flood water depth (cm) for a road edge based on its location and elevation.
    Elevated highways/flyovers have 0 depth.
    Low-lying corridors (Hindmata, Kurla LBS Marg, Andheri Subway) have high depths.
    """
    if edge_data.get("is_elevated", False):
        return 0.0
        
    edge_id = edge_data.get("id", "")
    edge_name = edge_data.get("name", "")
    
    # Specific known flood hotspots in Mumbai
    if "Hindmata" in edge_name or "Ambedkar" in edge_name or edge_id == "RE-02":
        return 120.0 if horizon == "T+1" else 85.0
    elif "Kurla" in edge_name or "LBS Marg" in edge_name or edge_id == "RE-07":
        return 105.0 if horizon == "T+1" else 70.0
    elif "Andheri" in edge_name:
        return 92.0 if horizon == "T+1" else 55.0
    elif "BKC-Kurla" in edge_name or edge_id == "RE-09":
        return 45.0 if horizon == "T+1" else 30.0
    elif "Dadar-Wadala" in edge_name or edge_id == "RE-05":
        return 18.0
    else:
        return 4.0  # Minor baseline surface runoff

def compute_route_metrics(
    G: nx.Graph,
    path_nodes: List[str],
    max_allowable_depth_cm: float,
    horizon: str = "T+1"
) -> Dict[str, Any]:
    """
    Compute detailed segment metrics, exposure breakdown, and totals for a path.
    """
    segments = []
    total_distance_m = 0.0
    total_time_s = 0.0
    max_depth_cm = 0.0
    highest_risk = "Low"
    coordinates = []
    
    risk_exposure = {
        "low_m": 0.0,
        "moderate_m": 0.0,
        "high_m": 0.0,
        "very_high_m": 0.0,
        "critical_m": 0.0
    }
    avoided_segments = []
    
    for i in range(len(path_nodes) - 1):
        u = path_nodes[i]
        v = path_nodes[i+1]
        edge_data = G[u][v]
        
        node_u_data = G.nodes[u]
        node_v_data = G.nodes[v]
        
        dist = edge_data.get("distance_m", 1000.0)
        base_speed = edge_data.get("base_speed_kmh", 40.0)
        base_time = edge_data.get("base_travel_time_s", dist / (base_speed / 3.6))
        
        depth = get_edge_flood_depth(edge_data, horizon)
        risk_info = get_risk_classification(depth)
        risk_lvl = risk_info["risk_level"]
        
        # Speed degradation due to water depth
        if depth > 100.0:
            eff_speed = 5.0
            penalty = 15.0
            is_blocked = True
        elif depth > 50.0:
            eff_speed = 12.0
            penalty = 6.0
            is_blocked = depth > max_allowable_depth_cm
        elif depth > 20.0:
            eff_speed = 25.0
            penalty = 2.5
            is_blocked = depth > max_allowable_depth_cm
        elif depth > 5.0:
            eff_speed = base_speed * 0.8
            penalty = 1.3
            is_blocked = False
        else:
            eff_speed = base_speed
            penalty = 1.0
            is_blocked = False
            
        travel_time = dist / (eff_speed / 3.6)
        
        total_distance_m += dist
        total_time_s += travel_time
        
        if depth > max_depth_cm:
            max_depth_cm = depth
            highest_risk = risk_lvl
            
        # Exposure breakdown
        if depth <= 5.0:
            risk_exposure["low_m"] += dist
        elif depth <= 20.0:
            risk_exposure["moderate_m"] += dist
        elif depth <= 50.0:
            risk_exposure["high_m"] += dist
        elif depth <= 100.0:
            risk_exposure["very_high_m"] += dist
        else:
            risk_exposure["critical_m"] += dist
            
        coords = edge_data.get("coordinates", [[node_u_data["lat"], node_u_data["lng"]], [node_v_data["lat"], node_v_data["lng"]]])
        if i == 0:
            coordinates.extend(coords)
        else:
            coordinates.extend(coords[1:])
            
        segments.append({
            "edge_id": edge_data.get("id", f"E-{u}-{v}"),
            "name": edge_data.get("name", "Arterial Road"),
            "from_node_id": u,
            "to_node_id": v,
            "from_node_name": node_u_data.get("name", u),
            "to_node_name": node_v_data.get("name", v),
            "distance_m": round(dist, 1),
            "base_speed_kmh": base_speed,
            "effective_speed_kmh": round(eff_speed, 1),
            "travel_time_s": round(travel_time, 1),
            "flood_depth_cm": depth,
            "risk_level": risk_lvl,
            "penalty_factor": penalty,
            "is_blocked": is_blocked,
            "coordinates": coords
        })

    return {
        "total_distance_m": round(total_distance_m, 1),
        "total_distance_km": round(total_distance_m / 1000.0, 2),
        "total_time_s": round(total_time_s, 1),
        "total_time_min": round(total_time_s / 60.0, 1),
        "max_flood_depth_cm": max_depth_cm,
        "highest_risk_level": highest_risk,
        "segments": segments,
        "coordinates": coordinates,
        "risk_exposure": risk_exposure,
        "avoided_segments": avoided_segments
    }

def calculate_dual_safe_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    vehicle_type: str = "EMERGENCY_AMBULANCE",
    max_allowable_depth_cm: float = 20.0,
    horizon: str = "T+1"
) -> Dict[str, Any]:
    """
    Calculates Standard Route (Shortest Path) vs Flood-Aware Safe Route.
    """
    G, nodes, edges = build_mumbai_road_graph()
    
    orig_node_data = find_nearest_road_node(origin_lat, origin_lng, nodes)
    dest_node_data = find_nearest_road_node(dest_lat, dest_lng, nodes)
    
    orig_id = orig_node_data["id"]
    dest_id = dest_node_data["id"]
    
    # 1. Standard Route: Shortest distance / minimum time path
    try:
        std_path = nx.shortest_path(G, source=orig_id, target=dest_id, weight="base_travel_time_s")
    except nx.NetworkXNoPath:
        std_path = [orig_id, dest_id]
        
    std_metrics = compute_route_metrics(G, std_path, max_allowable_depth_cm, horizon)
    
    std_route_result = {
        "status": "FOUND",
        "mode": "FASTEST",
        "horizon": horizon,
        "origin": {
            "id": orig_node_data["id"],
            "name": orig_node_data["name"],
            "lat": orig_node_data["lat"],
            "lng": orig_node_data["lng"],
            "type": orig_node_data.get("type", "JUNCTION"),
            "catchment_cell_id": orig_node_data.get("catchment_cell_id", "DEM-GRID-1-1"),
            "provenance": "ASSUMED_PROTOTYPE"
        },
        "destination": {
            "id": dest_node_data["id"],
            "name": dest_node_data["name"],
            "lat": dest_node_data["lat"],
            "lng": dest_node_data["lng"],
            "type": dest_node_data.get("type", "JUNCTION"),
            "catchment_cell_id": dest_node_data.get("catchment_cell_id", "DEM-GRID-1-1"),
            "provenance": "ASSUMED_PROTOTYPE"
        },
        "total_distance_m": std_metrics["total_distance_m"],
        "total_distance_km": std_metrics["total_distance_km"],
        "total_time_s": std_metrics["total_time_s"],
        "total_time_min": std_metrics["total_time_min"],
        "max_flood_depth_cm": std_metrics["max_flood_depth_cm"],
        "highest_risk_level": std_metrics["highest_risk_level"],
        "segments": std_metrics["segments"],
        "path_node_ids": std_path,
        "coordinates": std_metrics["coordinates"],
        "risk_exposure": std_metrics["risk_exposure"],
        "avoided_segments": [],
        "explanation": f"Shortest direct path via Ambedkar Road/LBS Marg. Intersects flood hotspot with max depth {std_metrics['max_flood_depth_cm']} cm.",
        "is_alternative": False,
        "provenance": "MODEL OUTPUT / DERIVED"
    }

    # 2. Safe Route: Weighted Dijkstra with heavy penalties for flooded segments
    def safe_weight(u, v, edge_attr):
        base_time = edge_attr.get("base_travel_time_s", 60.0)
        depth = get_edge_flood_depth(edge_attr, horizon)
        if depth > max_allowable_depth_cm:
            # Heavy penalty factor to force Dijkstra around flooded roads onto elevated flyovers
            penalty = 1.0 + 100.0 * ((depth - max_allowable_depth_cm) ** 2)
            return base_time * penalty
        return base_time

    try:
        safe_path = nx.dijkstra_path(G, source=orig_id, target=dest_id, weight=safe_weight)
    except nx.NetworkXNoPath:
        safe_path = std_path
        
    safe_metrics = compute_route_metrics(G, safe_path, max_allowable_depth_cm, horizon)
    
    # Track avoided hazard segments for safe route
    avoided_hazards = []
    for seg in std_metrics["segments"]:
        if seg["flood_depth_cm"] > max_allowable_depth_cm:
            avoided_hazards.append({
                "edge_id": seg["edge_id"],
                "name": seg["name"],
                "risk_level": seg["risk_level"],
                "depth_cm": seg["flood_depth_cm"],
                "reason": f"Water depth {seg['flood_depth_cm']} cm exceeds safe threshold ({max_allowable_depth_cm} cm)"
            })

    safe_route_result = {
        "status": "FOUND",
        "mode": "SAFEST",
        "horizon": horizon,
        "origin": std_route_result["origin"],
        "destination": std_route_result["destination"],
        "total_distance_m": safe_metrics["total_distance_m"],
        "total_distance_km": safe_metrics["total_distance_km"],
        "total_time_s": safe_metrics["total_time_s"],
        "total_time_min": safe_metrics["total_time_min"],
        "max_flood_depth_cm": safe_metrics["max_flood_depth_cm"],
        "highest_risk_level": safe_metrics["highest_risk_level"],
        "segments": safe_metrics["segments"],
        "path_node_ids": safe_path,
        "coordinates": safe_metrics["coordinates"],
        "risk_exposure": safe_metrics["risk_exposure"],
        "avoided_segments": avoided_hazards,
        "explanation": f"Flood-aware safe route using elevated flyovers/freeways. Avoids flooded junctions (Max depth: {safe_metrics['max_flood_depth_cm']} cm).",
        "is_alternative": True,
        "provenance": "MODEL OUTPUT / DERIVED"
    }

    return {
        "status": "success",
        "primary": safe_route_result,
        "alternative": std_route_result,
        "evaluated_at": "2026-09-10T09:00:00Z",
        "horizon": horizon,
        "mode": "SAFEST",
        "provenance": "MODEL OUTPUT / DERIVED"
    }
