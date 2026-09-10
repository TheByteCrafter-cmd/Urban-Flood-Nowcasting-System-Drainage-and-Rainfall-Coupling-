from typing import List, Dict, Any

def get_active_alerts(rainfall_mm_hr: float = 48.5) -> List[Dict[str, Any]]:
    """
    Retrieves active flood advisories. Returns empty list if rainfall is 0.
    """
    if rainfall_mm_hr <= 0:
        return []
        
    return [
        {
            "alert_id": "ALT-MMR-2026-0891",
            "severity": "CRITICAL",
            "location": "Hindmata Junction & Ambedkar Road Underpass",
            "predicted_depth_cm": round(120.0 * (rainfall_mm_hr / 48.5), 1),
            "time_window": "09:00 - 11:30 IST",
            "recommended_action": "Subway closed to vehicular traffic. Divert via Eastern Freeway elevated corridor.",
            "issued_at": "2026-09-10T08:45:00Z"
        },
        {
            "alert_id": "ALT-MMR-2026-0892",
            "severity": "CRITICAL",
            "location": "Kurla West LBS Marg & Mithi River Outfall",
            "predicted_depth_cm": round(105.0 * (rainfall_mm_hr / 48.5), 1),
            "time_window": "09:15 - 12:00 IST",
            "recommended_action": "High tide backflow warning. Dewatering pumps #3 & #4 deployed.",
            "issued_at": "2026-09-10T08:50:00Z"
        },
        {
            "alert_id": "ALT-MMR-2026-0893",
            "severity": "HIGH",
            "location": "Andheri Subway Underpass",
            "predicted_depth_cm": round(92.0 * (rainfall_mm_hr / 48.5), 1),
            "time_window": "09:30 - 11:00 IST",
            "recommended_action": "Light vehicles prohibited. Emergency vehicles use WEH flyover.",
            "issued_at": "2026-09-10T08:55:00Z"
        }
    ]
