CHENNAI_CITY_INFO = {
    "city_id": "chennai",
    "city_name": "Chennai Metropolitan Area",
    "state": "Tamil Nadu",
    "center": [80.2707, 13.0827],  # [lng, lat]
    "zoom": 12
}

CHENNAI_NOWCAST_SUMMARY = {
    "city_id": "chennai",
    "last_updated": "2026-09-10T09:00:00Z",
    "nowcast_window_hours": 3,
    "current_rainfall_mm_hr": 22.0,
    "max_predicted_water_depth_cm": 35.0,
    "critical_intersections_count": 2,
    "surcharged_manholes_count": 5,
    "model_status": "ACTIVE_RUNNING"
}

CHENNAI_ALERTS = [
    {
        "alert_id": "ALT-CMA-2026-0101",
        "severity": "MODERATE",
        "location": "Velachery Main Road & Lake Overflow",
        "predicted_depth_cm": 35.0,
        "time_window": "10:00 - 12:00 IST",
        "recommended_action": "Avoid low-lying Velachery residential subways.",
        "issued_at": "2026-09-10T08:30:00Z"
    }
]
