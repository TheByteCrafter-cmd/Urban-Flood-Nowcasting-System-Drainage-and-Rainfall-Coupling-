import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.runoff_service import calculate_rational_runoff_m3_s
from app.services.surface_flow_service import compute_surface_flow_grid
from app.services.drainage_service import compute_drainage_network_state
from app.services.coupling_service import compute_coupling_mass_balance
from app.services.alert_service import get_active_alerts
from app.services.routing_service import compute_safe_route_pair

def test_heavy_rain_storm_simulation():
    """
    Test Heavy Rain Storm (65 mm/hr):
    rainfall = 65 -> runoff > 0 -> surface accumulation -> drainage overload -> surcharge -> higher flood depth -> elevated risk -> alerts -> route changes
    """
    rainfall = 65.0
    
    # 1. Peak Runoff generated
    runoff_q = calculate_rational_runoff_m3_s(rainfall, area_m2=25000.0, c_val=0.90)
    assert runoff_q > 0.35  # > 0.35 m³/s
    
    # 2. Surface Flow Grid water depth > 0 with critical cells
    surface_cells = compute_surface_flow_grid(rainfall)
    max_depth = max(c["water_depth_cm"] for c in surface_cells)
    assert max_depth >= 100.0  # Inundation reaches critical depth
    
    # 3. Drainage Network surcharges detected
    drainage_features = compute_drainage_network_state(rainfall)
    surcharged_nodes = [f for f in drainage_features if f["properties"]["feature_type"] == "NODE" and f["properties"]["status"] == "SURCHARGE"]
    assert len(surcharged_nodes) > 0
    
    # 4. Strict Mass balance conserved
    mb_res = compute_coupling_mass_balance(rainfall)
    mb = mb_res["mass_balance"]
    assert mb["input_runoff_volume_m3"] > 10000.0
    assert mb["is_conserved"] is True
    assert mb["internal_surcharge_return_m3"] > 0.0
    
    # 5. Active flood alerts generated
    alerts = get_active_alerts(rainfall)
    assert len(alerts) >= 3
    assert any(a["severity"] == "CRITICAL" for a in alerts)
    
    # 6. Routing penalties force safe route onto flyovers
    route_res = compute_safe_route_pair(
        origin_lat=18.9750, origin_lng=72.8330,
        dest_lat=19.0660, dest_lng=72.8680,
        rainfall_mm_hr=rainfall
    )
    assert route_res["status"] == "success"
    primary = route_res["primary"]
    assert primary["mode"] == "SAFEST"
    assert len(primary["avoided_segments"]) > 0

if __name__ == "__main__":
    test_heavy_rain_storm_simulation()
    print("[OK] Heavy rain storm simulation test passed successfully!")
