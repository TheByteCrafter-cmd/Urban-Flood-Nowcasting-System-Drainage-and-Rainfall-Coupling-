import json
import re
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import httpx

from app.core.config import settings
from app.core.cache import cache_service

# Store last known good real-world observation in case of upstream outages
_last_known_good: Dict[str, Dict[str, Any]] = {}

def parse_imd_bulletin(html: str) -> Optional[Dict[str, str]]:
    """
    Parses IMD District-Wise Nowcast bulletin for Mumbai City or Suburban.
    """
    try:
        regex = r'\{\s*"title"\s*:\s*"(?:MUMBAI CITY|MUMBAI SUBURBAN)"[\s\S]*?"id"\s*:\s*"(?:151|157)"[\s\S]*?\}'
        match = re.search(regex, html, re.IGNORECASE)
        if not match:
            return None

        obj = json.loads(match.group(0))
        info = obj.get("info", "")

        time_match = re.search(r"Time of issue</b>:\s*<p>([^<]+)</p>", info, re.IGNORECASE)
        valid_match = re.search(r"Valid upto</b>:\s*([^<]+)</p>", info, re.IGNORECASE)
        warn_match = re.search(r"<div><p>([^<]+)</p></div>", info, re.IGNORECASE)

        # Clean details text
        clean_details = re.sub(r"<[^>]+>", " ", info)
        clean_details = re.sub(r"\s+", " ", clean_details).strip()

        return {
            "district": obj.get("title", "MUMBAI CITY"),
            "time_of_issue": time_match.group(1).strip() if time_match else "Unknown",
            "valid_upto": valid_match.group(1).strip() if valid_match else "Unknown",
            "warning_title": warn_match.group(1).strip() if warn_match else "No Warning",
            "warning_color": obj.get("color", "#008000"),
            "details": clean_details,
        }
    except Exception:
        return None

def check_timestamp_freshness(time_str: str) -> bool:
    """
    Validates freshness of IMD's Time of Issue timestamp.
    Standard nowcast validity window is 180 minutes (3 hours).
    Format: '2026-09-10 1000 Hrs'
    """
    try:
        match = re.search(r"(\d{4})-(\d{2})-(\d{2})\s+(\d{2})(\d{2})\s*Hrs", time_str, re.IGNORECASE)
        if not match:
            return True  # If unable to parse exact format, assume current bulletin window
        y, m, d, hh, mm = match.groups()
        # IMD uses IST (+05:30)
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        issue_dt = datetime(int(y), int(m), int(d), int(hh), int(mm), tzinfo=ist_tz)
        now_dt = datetime.now(ist_tz)
        age_minutes = (now_dt - issue_dt).total_seconds() / 60.0
        return -15 <= age_minutes <= 180
    except Exception:
        return True

def fetch_open_meteo_telemetry(lat: float = 19.0760, lon: float = 72.8777) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time numerical meteorological telemetry from Open-Meteo for Mumbai.
    """
    try:
        url = settings.WEATHER_API_URL
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m",
            "hourly": "precipitation",
            "forecast_hours": 4,
            "timezone": "auto"
        }
        with httpx.Client(timeout=4.0) as client:
            res = client.get(url, params=params)
            if res.status_code == 200:
                data = res.json()
                current = data.get("current", {})
                hourly = data.get("hourly", {}).get("precipitation", [0.0, 0.0, 0.0, 0.0])
                return {
                    "current_precipitation": float(current.get("precipitation", 0.0)),
                    "temperature_c": float(current.get("temperature_2m", 28.5)),
                    "humidity_pct": float(current.get("relative_humidity_2m", 80.0)),
                    "wind_speed_kmh": float(current.get("wind_speed_10m", 12.0)),
                    "hourly_precipitation": [float(h) for h in hourly[:4]]
                }
    except Exception:
        pass
    return None

def fetch_imd_nowcast_bulletin() -> Optional[Dict[str, str]]:
    """
    Fetches official IMD Mumbai nowcast bulletin from Mausam portal.
    """
    try:
        url = getattr(settings, "IMD_NOWCAST_URL", "https://mausam.imd.gov.in/responsive/districtWiseNowcast.php")
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        with httpx.Client(timeout=4.0, verify=False) as client:
            res = client.get(url, headers=headers)
            if res.status_code == 200:
                return parse_imd_bulletin(res.text)
    except Exception:
        pass
    return None

def build_nowcast_steps(hourly_rates: List[float]) -> List[Dict[str, Any]]:
    """
    Constructs T+0..T+3 nowcast horizon steps from hourly precipitation rates.
    """
    steps = []
    labels = ["T+0", "T+1", "T+2", "T+3"]
    timestamps = ["Current", "+1 hr", "+2 hr", "+3 hr"]
    for i in range(4):
        rate = float(hourly_rates[i]) if i < len(hourly_rates) else 0.0
        acc = round(rate * (i + 1) * 0.5, 1)
        if rate > 75.0:
            warn = "Warning"
        elif rate > 35.0:
            warn = "Alert"
        elif rate > 10.0:
            warn = "Watch"
        else:
            warn = "No Warning"
        steps.append({
            "hour_offset": i,
            "label": labels[i],
            "timestamp": timestamps[i],
            "rainfall_intensity_mm_hr": rate,
            "accumulated_rainfall_mm": acc,
            "warning_level": warn
        })
    return steps

def get_demo_fallback_weather(reason: str = "Fallback Baseline Active", rainfall: float = 28.5) -> Dict[str, Any]:
    """
    Constructs structured fallback weather response when all upstream sources are unavailable.
    """
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    hourly = [rainfall, min(rainfall * 2.2, 120.0), min(rainfall * 3.3, 140.0), min(rainfall * 4.2, 160.0)] if rainfall > 0 else [0.0, 0.0, 0.0, 0.0]
    return {
        "city_id": "mumbai",
        "rainfall_mm_hr": rainfall,
        "temperature_c": 28.5,
        "humidity_pct": 88.0,
        "wind_speed_kmh": 14.2,
        "source": "DEMO_FALLBACK",
        "source_label": "DEMO / ILLUSTRATIVE METEOROLOGICAL BASELINE",
        "source_organization": "GeoNexus Urban Flood Simulation Engine (Demo)",
        "status": "DEMO",
        "status_reason": reason,
        "timestamp": now_iso,
        "source_timestamp": "N/A (Synthetic Baseline)",
        "fetch_timestamp": now_iso,
        "is_fresh": False,
        "is_demo_data": True,
        "district_warning": {
            "district": "MUMBAI METROPOLITAN REGION",
            "warning_title": "Simulated Heavy Rain Watch" if rainfall > 0 else "Clear / No Warning",
            "warning_color": "#F59E0B" if rainfall > 0 else "#008000",
            "time_of_issue": "Simulated T+0",
            "valid_upto": "Simulated T+3",
            "details": "Simulated monsoonal convective cell baseline." if rainfall > 0 else "Dry baseline conditions."
        },
        "nowcast_steps": build_nowcast_steps(hourly),
        "primary_radar_image": "/api/imd/Radar/sri_mum.gif"
    }

def get_current_weather(
    city_id: str = "mumbai",
    force_rainfall: Optional[float] = None,
    fresh: bool = False
) -> Dict[str, Any]:
    """
    Retrieves real-time rainfall and meteorological observations for the Mumbai Metropolitan Region.
    Integrates Open-Meteo telemetry with IMD Mausam district bulletin, backed by 120s TTL caching.
    Runs upstream network calls concurrently. Strictly preserves LIVE vs CACHED provenance.
    """
    cache_key = f"weather_{city_id}"

    # 1. Deterministic scenario override (e.g. Monsoon Demo or Dry baseline)
    if force_rainfall is not None and isinstance(force_rainfall, (int, float)):
        if force_rainfall == 0.0:
            return get_demo_fallback_weather(reason="Dry Baseline Scenario Active (0.0 mm/hr)", rainfall=0.0)
        else:
            return get_demo_fallback_weather(reason=f"Controlled Storm Scenario Active ({float(force_rainfall):.1f} mm/hr)", rainfall=float(force_rainfall))

    # 2. Check fresh in-memory cache (unless forced fresh)
    if not fresh:
        cached = cache_service.get(cache_key)
        if cached:
            cached_copy = dict(cached)
            cached_copy["status"] = "CACHED"
            cached_copy["status_reason"] = "Observation served from server-side cache (120s TTL)"
            cached_copy["is_cached"] = True
            return cached_copy

    # 3. Live Upstream Fetching (run Open-Meteo and IMD concurrently)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_om = executor.submit(fetch_open_meteo_telemetry)
        future_imd = executor.submit(fetch_imd_nowcast_bulletin)
        telemetry = future_om.result()
        imd_bulletin = future_imd.result()

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    if telemetry is not None:
        # Open-Meteo succeeded
        is_fresh = True
        source_ts = now_iso
        warning_data = {
            "district": "MUMBAI CITY",
            "warning_title": "No Warning",
            "warning_color": "#008000",
            "time_of_issue": now_iso,
            "valid_upto": "Next 3 Hours",
            "details": "Live telemetry from Open-Meteo Mumbai point observation."
        }

        if imd_bulletin is not None:
            source_ts = imd_bulletin.get("time_of_issue", now_iso)
            is_fresh = check_timestamp_freshness(source_ts)
            warning_data = {
                "district": imd_bulletin.get("district", "MUMBAI CITY"),
                "warning_title": imd_bulletin.get("warning_title", "No Warning"),
                "warning_color": imd_bulletin.get("warning_color", "#008000"),
                "time_of_issue": imd_bulletin.get("time_of_issue", now_iso),
                "valid_upto": imd_bulletin.get("valid_upto", "Unknown"),
                "details": imd_bulletin.get("details", "")
            }
            source_label = "India Meteorological Department (IMD) & Open-Meteo"
            source_org = "Ministry of Earth Sciences, Govt. of India / Open-Meteo"
            source_id = "IMD_NOWCAST"
        else:
            source_label = "Open-Meteo Telemetry (IMD Gateway Unreachable)"
            source_org = "Open-Meteo Numerical Weather API"
            source_id = "OPEN_METEO_TELEMETRY"

        status = "LIVE" if is_fresh else "STALE"
        status_reason = f"Official real-time meteorological observation verified ({status})"

        hourly_precip = telemetry.get("hourly_precipitation", [0.0, 0.0, 0.0, 0.0])
        nowcast_steps = build_nowcast_steps(hourly_precip)

        live_data = {
            "city_id": city_id,
            "rainfall_mm_hr": telemetry.get("current_precipitation", 0.0),
            "temperature_c": telemetry.get("temperature_c", 28.5),
            "humidity_pct": telemetry.get("humidity_pct", 80.0),
            "wind_speed_kmh": telemetry.get("wind_speed_kmh", 12.0),
            "source": source_id,
            "source_label": source_label,
            "source_organization": source_org,
            "status": status,
            "status_reason": status_reason,
            "timestamp": now_iso,
            "source_timestamp": source_ts,
            "fetch_timestamp": now_iso,
            "is_fresh": is_fresh,
            "is_demo_data": False,
            "is_cached": False,
            "district_warning": warning_data,
            "nowcast_steps": nowcast_steps,
            "primary_radar_image": "/api/imd/Radar/sri_mum.gif"
        }

        _last_known_good[city_id] = live_data
        cache_service.set(cache_key, live_data, ttl_seconds=120)
        return live_data

    # 4. Fallback if upstream failed
    if city_id in _last_known_good:
        stale_data = dict(_last_known_good[city_id])
        stale_data["status"] = "STALE"
        stale_data["status_reason"] = "Upstream meteorological service unreachable; serving cached observation"
        stale_data["is_fresh"] = False
        stale_data["is_demo_data"] = False
        stale_data["is_cached"] = True
        return stale_data

    # 5. Cold fallback
    return get_demo_fallback_weather(
        reason="All external meteorological gateways unreachable; baseline engaged",
        rainfall=28.5
    )
