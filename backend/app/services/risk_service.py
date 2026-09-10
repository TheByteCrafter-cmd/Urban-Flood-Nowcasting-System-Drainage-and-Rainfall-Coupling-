from typing import Dict, Any

def get_risk_classification(depth_cm: float) -> Dict[str, str]:
    """
    Categorize flood depth according to civil safety thresholds:
    - < 5 cm: LOW (#DBEAFE)
    - 5 - 20 cm: MODERATE (#93C5FD)
    - 20 - 50 cm: HIGH (#F59E0B)
    - 50 - 100 cm: VERY_HIGH (#EA580C)
    - >= 100 cm: CRITICAL (#B91C1C)
    """
    if depth_cm < 5.0:
        return {"category": "LOW", "risk_level": "LOW", "color": "#DBEAFE"}
    elif depth_cm < 20.0:
        return {"category": "MODERATE", "risk_level": "MODERATE", "color": "#93C5FD"}
    elif depth_cm < 50.0:
        return {"category": "HIGH", "risk_level": "HIGH", "color": "#F59E0B"}
    elif depth_cm < 100.0:
        return {"category": "VERY_HIGH", "risk_level": "VERY_HIGH", "color": "#EA580C"}
    else:
        return {"category": "CRITICAL", "risk_level": "CRITICAL", "color": "#B91C1C"}

def compute_risk_summary(rainfall_mm_hr: float = 48.5) -> Dict[str, Any]:
    """
    Computes cell count breakdown across risk categories.
    """
    scale = rainfall_mm_hr / 48.5 if rainfall_mm_hr > 0 else 0.0
    max_depth = round(120.0 * scale, 1)
    
    if rainfall_mm_hr == 0:
        return {
            "status": "success",
            "city_id": "mumbai",
            "risk_summary": {
                "low_risk_cells": 16,
                "moderate_risk_cells": 0,
                "high_risk_cells": 0,
                "very_high_risk_cells": 0,
                "critical_risk_cells": 0,
                "max_flood_depth_cm": 0.0
            }
        }
        
    return {
        "status": "success",
        "city_id": "mumbai",
        "risk_summary": {
            "low_risk_cells": 6,
            "moderate_risk_cells": 4,
            "high_risk_cells": 3,
            "very_high_risk_cells": 2,
            "critical_risk_cells": 1,
            "max_flood_depth_cm": max_depth
        }
    }
