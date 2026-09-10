from datetime import datetime
from typing import Dict, Any, List

def get_nowcast_horizons(rainfall_mm_hr: float = 48.5) -> Dict[str, Any]:
    """
    Generates 0 to 3 hour predictive nowcast horizons (T+0, T+1, T+2, T+3).
    """
    factors = [
        ("T+0", 0, 0.6, 85.0, 8, 3),
        ("T+1", 1, 1.0, 120.0, 14, 5),
        ("T+2", 2, 0.85, 95.0, 10, 4),
        ("T+3", 3, 0.5, 45.0, 3, 1)
    ]
    
    horizons = []
    for label, offset, factor, base_depth, manholes, hotspots in factors:
        eff_rain = round(rainfall_mm_hr * factor, 1)
        depth = round(base_depth * (rainfall_mm_hr / 48.5), 1) if rainfall_mm_hr > 0 else 0.0
        m_count = int(manholes * (rainfall_mm_hr / 48.5)) if rainfall_mm_hr > 0 else 0
        h_count = int(hotspots * (rainfall_mm_hr / 48.5)) if rainfall_mm_hr > 0 else 0
        
        horizons.append({
            "horizon_label": label,
            "hour_offset": offset,
            "rainfall_mm_hr": eff_rain,
            "max_water_depth_cm": depth,
            "surcharged_manholes_count": m_count,
            "critical_hotspots_count": h_count
        })
        
    return {
        "status": "success",
        "city_id": "mumbai",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "horizons": horizons
    }
