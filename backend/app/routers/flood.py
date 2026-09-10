from fastapi import APIRouter, Query
from app.models.schemas import FloodDepthGeoJSONResponse
from app.data.mumbai_data import MUMBAI_FLOOD_ZONES_BASE
from app.physics.hydraulic_coupling import get_risk_classification

router = APIRouter()

@router.get("/flood/depth", response_model=FloodDepthGeoJSONResponse)
def get_flood_depth_geojson(
    city_id: str = Query("mumbai", description="City identifier"),
    time_step: str = Query("t1", description="Time step forecast horizon: t0, t1, t2, t3")
):
    """
    Returns valid GeoJSON FeatureCollection containing inundation depth polygons,
    predicted depth (cm), risk level, and semantic color palette for the selected time step.
    """
    ts = time_step.lower()
    if ts not in ["t0", "t1", "t2", "t3"]:
        ts = "t1"

    depth_key = f"depth_{ts}"
    features = []

    for zone in MUMBAI_FLOOD_ZONES_BASE:
        depth_cm = zone.get(depth_key, zone["depth_t1"])
        risk_info = get_risk_classification(depth_cm)

        feature = {
            "type": "Feature",
            "id": zone["id"],
            "geometry": {
                "type": "Polygon",
                "coordinates": zone["coordinates"]
            },
            "properties": {
                "id": zone["id"],
                "location_name": zone["location_name"],
                "area_name": zone["area_name"],
                "street_name": zone["street_name"],
                "zone_id": zone["zone_id"],
                "predicted_depth_cm": depth_cm,
                "water_depth_cm": depth_cm,
                "risk_level": risk_info["risk_level"],
                "category": risk_info["category"],
                "color": risk_info["color"],
                "confidence": 0.89,
                "is_demo_data": True
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "timestamp": "2026-09-10T09:00:00Z",
        "time_step": ts,
        "is_demo_data": True,
        "features": features
    }
