from typing import List, Dict, Any
from app.data.seed_data import MUMBAI_CATCHMENTS

def calculate_rational_runoff_m3_s(rainfall_mm_hr: float, area_m2: float, c_val: float = 0.85) -> float:
    """
    Rational Method: Q = (C * I * A) / 3.6e6
    where Q is in m³/s, I in mm/hr, A in m²
    """
    if rainfall_mm_hr <= 0 or area_m2 <= 0 or c_val <= 0:
        return 0.0
    return round((c_val * rainfall_mm_hr * area_m2) / 3600000.0, 4)

def get_catchment_runoff_summary(rainfall_mm_hr: float = 48.5) -> List[Dict[str, Any]]:
    """
    Calculates surface runoff rate for each catchment zone.
    """
    results = []
    for c in MUMBAI_CATCHMENTS:
        q_m3_s = calculate_rational_runoff_m3_s(rainfall_mm_hr, c["area_m2"], c["runoff_coefficient_c"])
        vol_1h = round(q_m3_s * 3600.0, 2)
        results.append({
            "catchment_id": c["catchment_id"],
            "zone_name": c["zone_name"],
            "area_m2": c["area_m2"],
            "land_use": c["land_use"],
            "runoff_coefficient_c": c["runoff_coefficient_c"],
            "rainfall_mm_hr": rainfall_mm_hr,
            "peak_runoff_m3_s": q_m3_s,
            "total_volume_1h_m3": vol_1h
        })
    return results
