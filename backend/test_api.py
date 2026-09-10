import json
from main import app

from app.physics.manning import calculate_circular_pipe_capacity, calculate_box_culvert_capacity
from app.physics.rational import calculate_rational_runoff
from app.routing.flood_router import calculate_dual_safe_route
from app.routers import cities, nowcast, flood, drainage, alerts, routing
from app.models.schemas import SafeRoutingRequest, CoordinatePoint

def test_manning_equation():
    # 1.2m diameter pipe, S=0.004, n=0.013
    res = calculate_circular_pipe_capacity(1.2, 0.004, 0.013)
    assert res["capacity_m3_s"] > 0
    assert res["hydraulic_radius_m"] == 0.3
    print(f"[OK] Manning Circular Pipe Capacity: {res['capacity_m3_s']} m3/s")

def test_rational_method():
    # 48.5 mm/hr rain on 15,000 m² catchment with C=0.85
    runoff = calculate_rational_runoff(48.5, 15000.0, 0.85)
    assert runoff > 0
    print(f"[OK] Rational Runoff Q: {runoff} m3/s")

def test_dijkstra_safe_routing():
    # Route from Byculla to BKC
    result = calculate_dual_safe_route(
        origin_lat=18.9750,
        origin_lng=72.8330,
        dest_lat=19.0660,
        dest_lng=72.8680,
        max_allowable_depth_cm=20.0
    )
    assert result["status"] == "success"
    assert "primary" in result
    assert "alternative" in result
    assert result["primary"]["mode"] == "SAFEST"
    print("[OK] Dijkstra safe routing test passed successfully!")

def test_api_cities():
    res = cities.get_cities()
    assert res["status"] == "success"
    assert len(res["data"]) >= 1
    assert res["data"][0]["city_id"] == "mumbai"
    print("[OK] GET /api/v1/cities router test passed!")

def test_api_nowcast_summary():
    res = nowcast.get_nowcast_summary("mumbai")
    assert res["status"] == "success"
    assert res["data"]["city_id"] == "mumbai"
    print("[OK] GET /api/v1/nowcast/summary router test passed!")

def test_api_flood_depth_geojson():
    res = flood.get_flood_depth_geojson("mumbai", "t1")
    assert res["type"] == "FeatureCollection"
    assert len(res["features"]) > 0
    props = res["features"][0]["properties"]
    assert "predicted_depth_cm" in props
    assert "risk_level" in props
    print("[OK] GET /api/v1/flood/depth GeoJSON router test passed!")

def test_api_drainage_network_geojson():
    res = drainage.get_drainage_network("mumbai", "t1")
    assert res["type"] == "FeatureCollection"
    assert len(res["features"]) > 0
    print("[OK] GET /api/v1/drainage/network GeoJSON router test passed!")

def test_api_alerts():
    res = alerts.get_alerts("mumbai")
    assert res["status"] == "success"
    assert len(res["data"]) > 0
    print("[OK] GET /api/v1/alerts router test passed!")

def test_api_routing():
    req = SafeRoutingRequest(
        city_id="mumbai",
        origin=CoordinatePoint(lat=18.9750, lng=72.8330),
        destination=CoordinatePoint(lat=19.0660, lng=72.8680),
        vehicle_type="EMERGENCY_AMBULANCE",
        max_allowable_depth_cm=20.0,
        horizon="t1"
    )
    res = routing.compute_safe_route(req)
    assert res["status"] == "success"
    assert "primary" in res
    assert "alternative" in res
    print("[OK] POST /api/v1/routing/safe-path router test passed!")

if __name__ == "__main__":
    test_manning_equation()
    test_rational_method()
    test_dijkstra_safe_routing()
    test_api_cities()
    test_api_nowcast_summary()
    test_api_flood_depth_geojson()
    test_api_drainage_network_geojson()
    test_api_alerts()
    test_api_routing()
    print("\n========================================================")
    print("ALL BACKEND PHYSICS & API ENDPOINT TESTS PASSED CLEANLY!")
    print("========================================================")
