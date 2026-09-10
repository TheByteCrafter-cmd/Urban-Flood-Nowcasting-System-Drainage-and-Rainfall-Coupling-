from typing import Dict, Any, List, Tuple
from app.physics.manning import compute_pipe_utilization
from app.physics.rational import calculate_rational_runoff

def get_risk_classification(depth_cm: float) -> Dict[str, str]:
    """
    Map water depth in cm to strict civil safety risk classification and color ramp.
    """
    if depth_cm <= 5.0:
        return {"category": "0-5", "risk_level": "Low", "color": "#DBEAFE"}
    elif depth_cm <= 20.0:
        return {"category": "5-20", "risk_level": "Moderate", "color": "#93C5FD"}
    elif depth_cm <= 50.0:
        return {"category": "20-50", "risk_level": "High", "color": "#F59E0B"}
    elif depth_cm <= 100.0:
        return {"category": "50-100", "risk_level": "Very High", "color": "#EA580C"}
    else:
        return {"category": "100+", "risk_level": "Critical", "color": "#B91C1C"}

def compute_dynamic_hydraulic_coupling(
    rainfall_mm_hr: float,
    nodes_params: List[Dict[str, Any]],
    edges_params: List[Dict[str, Any]],
    time_step: str = "t1"
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Couples surface rainfall nowcast with 1D underground pipe hydraulic capacities.
    
    Returns:
    - Computed Node States (with surcharge rate, status, surface depth)
    - Computed Edge States (with capacity utilization %, flow direction, status)
    - Coupled Summary Metrics (total surface inflow, surcharge rate, surcharged nodes count, max surface depth)
    """
    # Time step intensity factor (t0 = 0.6x, t1 = 1.0x peak, t2 = 0.85x, t3 = 0.5x)
    tf_map = {"t0": 0.6, "t1": 1.0, "t2": 0.85, "t3": 0.5}
    intensity_factor = tf_map.get(time_step, 1.0)
    effective_rainfall = rainfall_mm_hr * intensity_factor

    # Process edges first to determine Manning's capacity Q_cap for each edge
    edges_state = []
    edge_cap_map = {}
    
    for edge in edges_params:
        edge_id = edge["id"]
        # Basic pipe capacity calculation (using Manning's formula approximations)
        d_m = edge.get("diameter_m", 1.2)
        slope = edge.get("slope", 0.005)
        n_rough = edge.get("roughness_n", 0.013)
        
        # Simplified circular full flow capacity
        area = 3.14159 * (d_m / 2.0) ** 2
        r_h = d_m / 4.0
        cap_m3_s = (1.0 / n_rough) * area * (r_h ** (2.0 / 3.0)) * (slope ** 0.5)
        cap_m3_s = round(cap_m3_s, 2)
        edge_cap_map[edge_id] = cap_m3_s
        
        # Actual flow conveyed based on rainfall nowcast
        flow_factor = min(1.35, 0.4 + 0.8 * intensity_factor)
        actual_flow = round(cap_m3_s * flow_factor, 2)
        util_info = compute_pipe_utilization(actual_flow, cap_m3_s)
        
        edges_state.append({
            "id": edge_id,
            "pipe_id": edge_id,
            "name": edge.get("name", f"Pipe-{edge_id}"),
            "from_node": edge["from_node"],
            "to_node": edge["to_node"],
            "edge_type": edge.get("edge_type", "CIRCULAR_PIPE"),
            "coordinates": edge["coordinates"],
            "length_m": edge.get("length_m", 250),
            "diameter_m": d_m,
            "slope": slope,
            "roughness_n": n_rough,
            "cross_sectional_area_m2": round(area, 4),
            "hydraulic_radius_m": round(r_h, 4),
            "capacity_m3_s": cap_m3_s,
            "actual_flow_m3_s": actual_flow,
            "utilization_pct": util_info["utilization_pct"],
            "flow_direction": "FORWARD" if actual_flow <= cap_m3_s else "FORWARD",
            "status": util_info["status"],
            "provenance": "ASSUMED_PROTOTYPE"
        })

    # Process nodes
    nodes_state = []
    surcharged_count = 0
    total_surface_inflow = 0.0
    total_surcharge_rate = 0.0
    max_depth_cm = 0.0

    for node in nodes_params:
        node_id = node["id"]
        # Estimate surface runoff entering this node (catchment ~ 15,000 m²)
        catchment_area = 15000.0
        q_surface = calculate_rational_runoff(effective_rainfall, catchment_area, 0.85)
        total_surface_inflow += q_surface
        
        # Find outgoing edges capacity for node capacity
        outgoing_cap = sum(e["capacity_m3_s"] for e in edges_state if e["from_node"] == node_id)
        if outgoing_cap == 0:
            outgoing_cap = node.get("explicit_outlet_capacity_m3_s", 2.5)
            
        total_inflow = round(q_surface * 1.25, 2)  # includes upstream pipe contribution
        surcharge_rate = max(0.0, round(total_inflow - outgoing_cap, 2))
        surcharge_ratio = round(total_inflow / outgoing_cap, 2) if outgoing_cap > 0 else 1.0
        
        # Compute surface inundation depth (cm) from surcharge rate
        # Depth cm = (surcharge_rate m³/s * 1800 s) / catchment_area m² * 100
        surface_depth_cm = round((surcharge_rate * 1800.0 / catchment_area) * 100.0, 1) if surcharge_rate > 0 else 0.0
        if surface_depth_cm > max_depth_cm:
            max_depth_cm = surface_depth_cm

        if surcharge_rate > 0:
            surcharged_count += 1
            status = "SURCHARGE"
            surcharge_state = f"Overflowing {surcharge_rate} m³/s to surface"
            backflow_state = "Reverse Hydraulic Pressure Detected" if surcharge_ratio > 1.2 else "Normal Forward Flow"
        else:
            status = "NORMAL" if surcharge_ratio < 0.8 else "WATCH"
            surcharge_state = "No Surcharge"
            backflow_state = "Normal Forward Flow"
            
        total_surcharge_rate += surcharge_rate

        nodes_state.append({
            "id": node_id,
            "node_id": node_id,
            "name": node.get("name", f"Node-{node_id}"),
            "node_type": node.get("node_type", "MANHOLE"),
            "lat": node["lat"],
            "lng": node["lng"],
            "elevation_m": node.get("elevation_m", 10.0),
            "catchment_cell_id": node.get("catchment_cell_id", "DEM-GRID-1-1"),
            "surface_inflow_m3_s": q_surface,
            "upstream_pipe_inflow_m3_s": round(total_inflow - q_surface, 2),
            "total_inflow_m3_s": total_inflow,
            "discharged_outflow_m3_s": min(total_inflow, outgoing_cap),
            "surcharge_rate_m3_s": surcharge_rate,
            "capacity_m3_s": outgoing_cap,
            "node_capacity_m3_s": outgoing_cap,
            "capacity_utilization_pct": round(surcharge_ratio * 100.0, 1),
            "surcharge_ratio": surcharge_ratio,
            "status": status,
            "surcharge_state": surcharge_state,
            "backflow_state": backflow_state,
            "surface_impact_depth_cm": surface_depth_cm,
            "status_reason": f"Capacity utilization {round(surcharge_ratio * 100, 1)}%",
            "provenance": "ASSUMED_PROTOTYPE"
        })

    summary = {
        "time_step": time_step,
        "effective_rainfall_mm_hr": effective_rainfall,
        "total_surface_inflow_m3_s": round(total_surface_inflow, 2),
        "total_surcharge_rate_m3_s": round(total_surcharge_rate, 2),
        "surcharged_nodes_count": surcharged_count,
        "max_surface_depth_cm": max_depth_cm
    }

    return nodes_state, edges_state, summary
