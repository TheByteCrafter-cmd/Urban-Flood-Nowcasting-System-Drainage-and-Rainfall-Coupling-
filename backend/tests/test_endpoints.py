import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api import (
    system, weather, nowcast, runoff, surface_flow,
    drainage, coupling, risk, alerts, routing, map as map_api
)
from app.schemas.schemas import SafeRouteRequest, CoordinatePoint

def test_all_12_endpoints():
    # 1. Health
    res_health = system.get_health()
    assert res_health["status"] == "ok"
    
    # 2. System status
    res_sys = system.get_system_status()
    assert res_sys["status"] == "success"
    
    # 3. Weather current
    res_weather = weather.get_current_weather_endpoint("mumbai")
    assert res_weather["status"] == "success"
    
    # 4. Nowcast
    res_nowcast = nowcast.get_nowcast_endpoint(48.5)
    assert res_nowcast["status"] == "success"
    assert len(res_nowcast["horizons"]) == 4
    
    # 5. Runoff
    res_runoff = runoff.get_runoff_endpoint(48.5)
    assert res_runoff["status"] == "success"
    assert len(res_runoff["catchments"]) > 0
    
    # 6. Surface flow
    res_sf = surface_flow.get_surface_flow_endpoint(48.5)
    assert res_sf["status"] == "success"
    assert res_sf["total_cells"] == 16
    
    # 7. Drainage network
    res_dr = drainage.get_drainage_endpoint(48.5)
    assert res_dr["type"] == "FeatureCollection"
    assert len(res_dr["features"]) > 0
    
    # 8. Coupling mass balance
    res_coup = coupling.get_coupling_endpoint(48.5)
    assert res_coup["status"] == "success"
    assert res_coup["mass_balance"]["is_conserved"] is True
    
    # 9. Risk breakdown
    res_risk = risk.get_risk_endpoint(48.5)
    assert res_risk["status"] == "success"
    
    # 10. Alerts
    res_alerts = alerts.get_alerts_endpoint(48.5)
    assert res_alerts["status"] == "success"
    assert len(res_alerts["data"]) > 0
    
    # 11. Safe routing
    req_route = SafeRouteRequest(
        city_id="mumbai",
        origin=CoordinatePoint(lat=18.9750, lng=72.8330),
        destination=CoordinatePoint(lat=19.0660, lng=72.8680),
        routing_mode="SAFEST",
        vehicle_type="EMERGENCY_AMBULANCE",
        max_allowable_depth_cm=20.0
    )
    res_route = routing.compute_safe_route_endpoint(req_route)
    assert res_route["status"] == "success"
    assert res_route["primary"]["mode"] == "SAFEST"
    
    # 12. Map layers metadata
    res_map = map_api.get_map_layers_endpoint()
    assert res_map["status"] == "success"
    assert len(res_map["layers"]) > 0
    
    print("[OK] All 12 API endpoint tests passed successfully!")

if __name__ == "__main__":
    test_all_12_endpoints()
