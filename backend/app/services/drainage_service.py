import math
from typing import List, Dict, Any, Tuple
from app.data.seed_data import MUMBAI_DRAINAGE_NODES, MUMBAI_DRAINAGE_EDGES

def calculate_manning_capacity(
    diameter_m: float,
    slope: float,
    roughness_n: float = 0.013,
    width_m: float = None,
    height_m: float = None,
    edge_type: str = "CIRCULAR_PIPE"
) -> float:
    """
    Calculate full-flow gravity capacity Q (m³/s) via Manning's Equation:
    Q = (1/n) * A * R^(2/3) * S^(1/2)
    """
    if slope <= 0 or roughness_n <= 0:
        return 0.0
        
    if edge_type == "BOX_CULVERT" and width_m and height_m:
        area = width_m * height_m
        perimeter = 2.0 * (width_m + height_m)
    else: # CIRCULAR_PIPE default
        d = diameter_m if diameter_m else 1.2
        area = math.pi * (d / 2.0) ** 2
        perimeter = math.pi * d
        
    r_h = area / perimeter if perimeter > 0 else 0.0
    q_cap = (1.0 / roughness_n) * area * (r_h ** (2.0 / 3.0)) * math.sqrt(slope)
    return round(q_cap, 2)

def compute_drainage_network_state(rainfall_mm_hr: float = 48.5) -> List[Dict[str, Any]]:
    """
    Builds GeoJSON features for 1D drainage network with hydraulic load calculations.
    """
    intensity_ratio = rainfall_mm_hr / 48.5 if rainfall_mm_hr > 0 else 0.0
    features = []
    
    # Process edges
    for edge in MUMBAI_DRAINAGE_EDGES:
        q_cap = calculate_manning_capacity(
            diameter_m=edge.get("diameter_m", 1.2),
            slope=edge.get("slope", 0.004),
            roughness_n=edge.get("roughness_n", 0.013),
            width_m=edge.get("width_m"),
            height_m=edge.get("height_m"),
            edge_type=edge.get("edge_type", "CIRCULAR_PIPE")
        )
        actual_flow = round(q_cap * min(1.35, 0.4 + 0.8 * intensity_ratio), 2)
        util_pct = round((actual_flow / q_cap * 100.0), 1) if q_cap > 0 else 0.0
        
        status = "NORMAL"
        if util_pct > 100.0:
            status = "CAPACITY_EXCEEDED"
        elif util_pct > 80.0:
            status = "HIGH"
            
        features.append({
            "type": "Feature",
            "id": edge["id"],
            "geometry": {
                "type": "LineString",
                "coordinates": edge["coordinates"]
            },
            "properties": {
                "feature_type": "EDGE",
                "pipe_id": edge["pipe_id"],
                "start_node": edge["from_node"],
                "end_node": edge["to_node"],
                "diameter_mm": int(edge.get("diameter_m", 1.2) * 1000),
                "width_mm": int(edge["width_m"] * 1000) if "width_m" in edge else None,
                "height_mm": int(edge["height_m"] * 1000) if "height_m" in edge else None,
                "current_flow_m3_s": actual_flow,
                "capacity_m3_s": q_cap,
                "capacity_utilization_pct": util_pct,
                "flow_direction": "FORWARD",
                "status": status
            }
        })

    # Process nodes
    for node in MUMBAI_DRAINAGE_NODES:
        cap = node["capacity_m3_s"]
        inflow = round(cap * min(1.4, 0.5 + 0.9 * intensity_ratio), 2)
        surcharge = max(0.0, round(inflow - cap, 2))
        util_pct = round((inflow / cap * 100.0), 1) if cap > 0 else 0.0
        
        if surcharge > 0:
            status = "SURCHARGE"
            surcharge_state = f"Overflowing {surcharge} m³/s to surface"
            backflow_state = "Reverse Hydraulic Pressure Detected" if util_pct > 120.0 else "Normal Forward Flow"
            depth_cm = min(120.0, round(surcharge * 120.0 / 0.44, 1))
        else:
            status = "NORMAL" if util_pct < 80.0 else "WATCH"
            surcharge_state = "No Surcharge"
            backflow_state = "Normal Forward Flow"
            depth_cm = 0.0

        features.append({
            "type": "Feature",
            "id": node["id"],
            "geometry": {
                "type": "Point",
                "coordinates": [node["lng"], node["lat"]]
            },
            "properties": {
                "feature_type": "NODE",
                "node_id": node["node_id"],
                "node_type": node["node_type"],
                "current_flow_m3_s": inflow,
                "capacity_m3_s": cap,
                "capacity_utilization_pct": util_pct,
                "status": status,
                "surcharge_state": surcharge_state,
                "backflow_state": backflow_state,
                "surface_impact_depth_cm": depth_cm
            }
        })
        
    return features
