import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.runoff_service import calculate_rational_runoff_m3_s
from app.services.surface_flow_service import compute_surface_flow_grid
from app.services.drainage_service import compute_drainage_network_state
from app.services.coupling_service import compute_coupling_mass_balance
from app.services.alert_service import get_active_alerts

def test_dry_case_simulation():
    """
    Test Dry Case:
    rainfall = 0 mm/hr -> runoff = 0 -> depth = 0 -> surcharge = 0 -> alerts = 0
    """
    rainfall = 0.0
    
    # 1. Runoff Q = 0
    runoff_q = calculate_rational_runoff_m3_s(rainfall, area_m2=25000.0, c_val=0.90)
    assert runoff_q == 0.0
    
    # 2. Surface Flow Grid water depth = 0
    surface_cells = compute_surface_flow_grid(rainfall)
    for cell in surface_cells:
        assert cell["water_depth_cm"] == 0.0
        assert cell["depth_category"] == "LOW"
        
    # 3. Drainage Network surcharge = 0
    drainage_features = compute_drainage_network_state(rainfall)
    for feat in drainage_features:
        if feat["properties"]["feature_type"] == "NODE":
            assert feat["properties"]["surcharge_state"] == "No Surcharge"
            assert feat["properties"]["surface_impact_depth_cm"] == 0.0
            
    # 4. Mass balance 0 input runoff
    mass_balance_res = compute_coupling_mass_balance(rainfall)
    mb = mass_balance_res["mass_balance"]
    assert mb["input_runoff_volume_m3"] == 0.0
    assert mb["is_conserved"] is True
    
    # 5. Alerts count = 0
    alerts = get_active_alerts(rainfall)
    assert len(alerts) == 0

if __name__ == "__main__":
    test_dry_case_simulation()
    print("[OK] Dry case test passed successfully!")
