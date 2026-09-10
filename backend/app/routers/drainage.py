from fastapi import APIRouter, Query
from app.models.schemas import DrainageNetworkGeoJSONResponse
from app.data.mumbai_data import MUMBAI_DRAINAGE_NODES, MUMBAI_DRAINAGE_EDGES
from app.physics.hydraulic_coupling import compute_dynamic_hydraulic_coupling

router = APIRouter()

@router.get("/drainage/network", response_model=DrainageNetworkGeoJSONResponse)
def get_drainage_network(
    city_id: str = Query("mumbai", description="City identifier"),
    time_step: str = Query("t1", description="Time step horizon: t0, t1, t2, t3")
):
    """
    Returns 1D hydraulic graph (Point features for manholes/nodes, LineString features for pipes/edges)
    coupled dynamically with surface runoff nowcast to reflect capacity utilization %, surcharge state, and status.
    """
    nodes_state, edges_state, summary = compute_dynamic_hydraulic_coupling(
        rainfall_mm_hr=48.5,
        nodes_params=MUMBAI_DRAINAGE_NODES,
        edges_params=MUMBAI_DRAINAGE_EDGES,
        time_step=time_step
    )

    features = []

    # Map Node features (Point)
    for n in nodes_state:
        feature = {
            "type": "Feature",
            "id": n["id"],
            "geometry": {
                "type": "Point",
                "coordinates": [n["lng"], n["lat"]]  # [lng, lat]
            },
            "properties": {
                "feature_type": "NODE",
                "node_id": n["node_id"],
                "node_type": n["node_type"],
                "current_flow_m3_s": n["total_inflow_m3_s"],
                "capacity_m3_s": n["capacity_m3_s"],
                "capacity_utilization_pct": n["capacity_utilization_pct"],
                "status": n["status"],
                "surcharge_state": n["surcharge_state"],
                "backflow_state": n["backflow_state"],
                "surface_impact_depth_cm": n["surface_impact_depth_cm"]
            }
        }
        features.append(feature)

    # Map Edge features (LineString)
    for e in edges_state:
        feature = {
            "type": "Feature",
            "id": e["id"],
            "geometry": {
                "type": "LineString",
                "coordinates": e["coordinates"]  # [[lng, lat], ...]
            },
            "properties": {
                "feature_type": "EDGE",
                "pipe_id": e["pipe_id"],
                "start_node": e["from_node"],
                "end_node": e["to_node"],
                "diameter_mm": int(e.get("diameter_m", 1.2) * 1000),
                "width_mm": int(e["width_m"] * 1000) if "width_m" in e else None,
                "height_mm": int(e["height_m"] * 1000) if "height_m" in e else None,
                "current_flow_m3_s": e["actual_flow_m3_s"],
                "capacity_m3_s": e["capacity_m3_s"],
                "capacity_utilization_pct": e["utilization_pct"],
                "flow_direction": e["flow_direction"],
                "status": e["status"]
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "is_demo_data": True,
        "features": features
    }
