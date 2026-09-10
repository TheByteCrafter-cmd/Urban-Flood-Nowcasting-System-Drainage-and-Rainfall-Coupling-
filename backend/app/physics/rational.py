from typing import Dict, Any

# Standard Urban Runoff Coefficients (C) by Land Use Type
RUNOFF_COEFFICIENTS = {
    "COMMERCIAL_DENSE_URBAN": 0.90,  # Asphalt roads, concrete pavements, high building density
    "RESIDENTIAL_HIGH_DENSITY": 0.75, # Mixed residential with paved yards
    "SUBURBAN_LOW_DENSITY": 0.55,    # Low-density housing with lawns
    "PARKS_OPEN_SPACE": 0.25,        # Vegetated parks and permeable ground
    "INDUSTRIAL": 0.80               # Warehouses, large roofs, hardstanding yards
}

def calculate_rational_runoff(
    rainfall_mm_hr: float,
    area_m2: float,
    runoff_coefficient_C: float = 0.85
) -> float:
    """
    Compute peak surface runoff rate Q (m³/s) using Rational Method:
    Q = (C * I * A) / 3.6e6
    
    Parameters:
    - rainfall_mm_hr: Rainfall nowcast intensity i in mm/hr
    - area_m2: Drainage catchment surface area A in m²
    - runoff_coefficient_C: Runoff coefficient C (0.0 to 1.0)
    
    Returns Q in m³/s
    """
    if rainfall_mm_hr <= 0 or area_m2 <= 0 or runoff_coefficient_C <= 0:
        return 0.0
    
    # Q (m³/s) = (C * i (mm/hr) * A (m²)) / 3,600,000
    q_m3_s = (runoff_coefficient_C * rainfall_mm_hr * area_m2) / 3600000.0
    return round(q_m3_s, 4)

def calculate_catchment_runoff_summary(
    rainfall_mm_hr: float,
    catchment_area_m2: float,
    land_use: str = "COMMERCIAL_DENSE_URBAN"
) -> Dict[str, Any]:
    """
    Compute comprehensive runoff breakdown for a sub-catchment.
    """
    c_val = RUNOFF_COEFFICIENTS.get(land_use, 0.85)
    runoff_m3_s = calculate_rational_runoff(rainfall_mm_hr, catchment_area_m2, c_val)
    
    # 1-hour total accumulated runoff volume in m³
    volume_1h_m3 = runoff_m3_s * 3600.0
    
    return {
        "rainfall_mm_hr": rainfall_mm_hr,
        "catchment_area_m2": catchment_area_m2,
        "land_use": land_use,
        "runoff_coefficient_C": c_val,
        "peak_runoff_m3_s": runoff_m3_s,
        "total_volume_1h_m3": round(volume_1h_m3, 2)
    }
