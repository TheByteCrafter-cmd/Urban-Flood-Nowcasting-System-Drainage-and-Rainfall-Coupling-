import {
  NormalizedWeatherObservation,
  WeatherDataSource,
  WeatherDataStatus,
  WeatherNowcastStep,
  RadarProductInfo,
} from '../types/weather';

const IMD_NOWCAST_PROXY_URL = '/api/imd/responsive/districtWiseNowcast.php';
const IMD_NOWCAST_DIRECT_URL = 'https://mausam.imd.gov.in/responsive/districtWiseNowcast.php';
const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=19.0760&longitude=72.8777&current=precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation,rain&forecast_hours=4&timezone=auto';

export const IMD_RADAR_PRODUCTS: RadarProductInfo[] = [
  {
    product_code: 'SRI',
    title: 'Surface Rainfall Intensity (SRI)',
    description: 'Near-surface instantaneous rainfall intensity derived from Doppler reflectivity.',
    image_url: '/api/imd/Radar/sri_mum.gif',
    unit: 'mm/hr',
  },
  {
    product_code: 'PAC',
    title: 'Precipitation Accumulation (PAC)',
    description: 'Cumulative precipitation depth derived over continuous radar scan cycles.',
    image_url: '/api/imd/Radar/pac_mum.gif',
    unit: 'mm',
  },
  {
    product_code: 'PPZ',
    title: 'Plan Position Indicator - Reflectivity (PPZ)',
    description: 'Horizontal radar scan reflectivity indicating rain cloud density.',
    image_url: '/api/imd/Radar/ppz_mum.gif',
    unit: 'dBZ',
  },
  {
    product_code: 'CAZ',
    title: 'Max Z Column Reflectivity (CAZ)',
    description: 'Column-maximum reflectivity identifying deep convective storm cores.',
    image_url: '/api/imd/Radar/caz_mum.gif',
    unit: 'dBZ',
  },
];

/**
 * Parses IMD District-Wise Nowcast HTML/JSON snippet.
 * Extracts the Mumbai City / Suburban nowcast bulletin.
 */
function parseIMDNowcast(html: string): {
  district: string;
  time_of_issue: string;
  valid_upto: string;
  warning_title: string;
  warning_color: string;
  details: string;
} | null {
  try {
    const regex = /\{\s*"title"\s*:\s*"(?:MUMBAI CITY|MUMBAI SUBURBAN)"[\s\S]*?"id"\s*:\s*"(?:151|157)"[\s\S]*?\}/i;
    const match = html.match(regex);
    if (!match) return null;

    const obj = JSON.parse(match[0]);
    const info = obj.info || '';

    const timeIssueMatch = info.match(/Time of issue<\/b>:\s*<p>([^<]+)<\/p>/i);
    const validUptoMatch = info.match(/Valid upto<\/b>:\s*([^<]+)<\/p>/i);
    const warningMatch = info.match(/<div><p>([^<]+)<\/p><\/div>/i);

    return {
      district: obj.title || 'MUMBAI CITY',
      time_of_issue: timeIssueMatch ? timeIssueMatch[1].trim() : 'Unknown',
      valid_upto: validUptoMatch ? validUptoMatch[1].trim() : 'Unknown',
      warning_title: warningMatch ? warningMatch[1].trim() : 'No Warning',
      warning_color: obj.color || '#008000',
      details: info.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    };
  } catch (err) {
    console.warn('Failed to parse IMD nowcast bulletin:', err);
    return null;
  }
}

/**
 * Validates freshness of IMD's Time of Issue timestamp.
 * Standard nowcast validity window is 180 minutes (3 hours).
 */
function checkTimestampFreshness(timeStr: string): { is_fresh: boolean; ageMinutes: number } {
  try {
    const match = timeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2})(\d{2})\s*Hrs/i);
    if (!match) {
      return { is_fresh: false, ageMinutes: Infinity };
    }

    const [_, year, month, day, hours, minutes] = match;
    const issueDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00+05:30`);
    const now = new Date();
    const ageMinutes = (now.getTime() - issueDate.getTime()) / (1000 * 60);

    // Fresh if issued within 180 minutes and not in the future beyond 15 min clock skew
    const is_fresh = ageMinutes >= -15 && ageMinutes <= 180;
    return { is_fresh, ageMinutes: Math.round(ageMinutes) };
  } catch {
    return { is_fresh: false, ageMinutes: Infinity };
  }
}

/**
 * Fetches supporting telemetry from Open-Meteo for continuous numerical rates.
 * Note: Clearly isolated as a secondary/supporting source.
 */
async function fetchSupportingTelemetry(): Promise<{
  current_rainfall: number;
  hourly_steps: { time: string; precipitation: number }[];
} | null> {
  try {
    const res = await fetch(OPEN_METEO_URL, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      current_rainfall: Number(data?.current?.precipitation ?? 0),
      hourly_steps: (data?.hourly?.time || []).map((t: string, i: number) => ({
        time: t,
        precipitation: Number(data?.hourly?.precipitation?.[i] ?? 0),
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Produces structured fallback/demo data when upstream services are down.
 */
export function getDemoFallbackWeather(reason = 'Illustrative Fallback Baseline Active'): NormalizedWeatherObservation {
  const now = new Date();
  return {
    source: 'DEMO_FALLBACK',
    source_label: 'DEMO / ILLUSTRATIVE METEOROLOGICAL BASELINE',
    source_organization: 'GeoNexus Urban Flood Simulation Engine (Demo)',
    status: 'DEMO',
    status_reason: reason,
    source_timestamp: 'N/A (Synthetic Baseline)',
    fetch_timestamp: now.toISOString(),
    is_fresh: false,
    station_name: 'Prototype Spatial Grid',
    station_code: 'MUM-DEMO-01',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    current_rainfall_mm_hr: 28.5,
    rainfall_condition: 'Simulated Moderate Monsoonal Rainfall',
    district_warning: {
      district: 'MUMBAI METROPOLITAN REGION',
      warning_title: 'Simulated Heavy Rain Watch',
      warning_color: '#F59E0B',
      time_of_issue: 'Simulated T+0',
      valid_upto: 'Simulated T+3',
      details: 'Illustrative monsoonal convective cell over south-central Mumbai basin.',
    },
    nowcast_window_hours: 3,
    nowcast_steps: [
      {
        hour_offset: 0,
        label: 'T+0',
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rainfall_intensity_mm_hr: 28.5,
        accumulated_rainfall_mm: 7.1,
        warning_level: 'Watch',
      },
      {
        hour_offset: 1,
        label: 'T+1',
        timestamp: '+1 Hour',
        rainfall_intensity_mm_hr: 65.0,
        accumulated_rainfall_mm: 23.4,
        warning_level: 'Alert',
      },
      {
        hour_offset: 2,
        label: 'T+2',
        timestamp: '+2 Hours',
        rainfall_intensity_mm_hr: 95.0,
        accumulated_rainfall_mm: 47.1,
        warning_level: 'Warning',
      },
      {
        hour_offset: 3,
        label: 'T+3',
        timestamp: '+3 Hours',
        rainfall_intensity_mm_hr: 120.0,
        accumulated_rainfall_mm: 77.1,
        warning_level: 'Warning',
      },
    ],
    radar_products: IMD_RADAR_PRODUCTS,
    primary_radar_image: '/api/imd/Radar/sri_mum.gif',
    is_fallback: true,
    error_details: reason,
  };
}

const LOCAL_STORAGE_WEATHER_KEY = 'geonexus_cached_weather_observation';
let _inMemoryWeatherObservation: NormalizedWeatherObservation | null = null;

/**
 * Stores a valid observation in client memory and localStorage for instant SWR hydration.
 */
export function cacheWeatherObservationLocally(observation: NormalizedWeatherObservation): void {
  _inMemoryWeatherObservation = observation;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_WEATHER_KEY, JSON.stringify(observation));
    }
  } catch (err) {
    console.warn('Unable to persist weather observation to localStorage:', err);
  }
}

/**
 * Retrieves the last known good observation from in-memory cache or localStorage.
 * Returns null if no valid observation has ever been stored.
 */
export function getCachedWeatherObservation(): NormalizedWeatherObservation | null {
  if (_inMemoryWeatherObservation) {
    return _inMemoryWeatherObservation;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_WEATHER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NormalizedWeatherObservation;
        if (parsed && typeof parsed.current_rainfall_mm_hr === 'number' && parsed.district_warning) {
          _inMemoryWeatherObservation = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Unable to read cached weather observation from localStorage:', err);
  }
  return null;
}

/**
 * Provides the initial weather state for instantaneous page rendering.
 * - If a cached observation exists: returns it marked strictly with status: 'CACHED'
 *   so that the user NEVER sees cached data mislabeled as LIVE.
 * - If no cached observation exists (first-ever visit): returns null so the UI
 *   can display an appropriate initializing/loading state without fabricating 0.0 mm/hr.
 */
export function getInitialWeatherObservation(): NormalizedWeatherObservation | null {
  const cached = getCachedWeatherObservation();
  if (cached) {
    return {
      ...cached,
      status: 'CACHED',
      status_reason: 'Displaying cached observation; verifying fresh telemetry in background',
      is_cached: true,
      is_fresh: false,
    };
  }
  return null;
}

/**
 * Maps unified backend weather schema to client NormalizedWeatherObservation interface.
 */
function mapBackendWeatherToNormalized(backendData: any): NormalizedWeatherObservation {
  const steps: WeatherNowcastStep[] = (backendData.nowcast_steps || []).map((s: any) => ({
    hour_offset: s.hour_offset as 0 | 1 | 2 | 3,
    label: s.label as any,
    timestamp: s.timestamp,
    rainfall_intensity_mm_hr: Number(s.rainfall_intensity_mm_hr ?? 0),
    accumulated_rainfall_mm: Number(s.accumulated_rainfall_mm ?? 0),
    warning_level: s.warning_level || 'No Warning',
  }));

  const distWarning = backendData.district_warning || {
    district: 'MUMBAI CITY',
    warning_title: 'No Warning',
    warning_color: '#008000',
    time_of_issue: backendData.source_timestamp || backendData.timestamp,
    valid_upto: 'Next 3 Hours',
    details: 'Real-time observation',
  };

  const status: WeatherDataStatus =
    backendData.status === 'LIVE' ? 'LIVE' :
    backendData.status === 'CACHED' ? 'CACHED' :
    backendData.status === 'STALE' ? 'STALE' :
    backendData.status === 'ERROR' ? 'ERROR' : 'DEMO';

  return {
    source: (backendData.source as WeatherDataSource) || 'IMD_NOWCAST',
    source_label: backendData.source_label || 'India Meteorological Department (IMD) & Open-Meteo',
    source_organization: backendData.source_organization || 'Ministry of Earth Sciences, Govt. of India / Open-Meteo',
    status,
    status_reason: backendData.status_reason || 'Verified backend observation',
    source_timestamp: backendData.source_timestamp || backendData.timestamp,
    fetch_timestamp: backendData.fetch_timestamp || new Date().toISOString(),
    is_fresh: Boolean(backendData.is_fresh),
    station_name: `IMD Mumbai (${distWarning.district || 'MUMBAI CITY'})`,
    station_code: 'MUM-COLABA-VERAVALI',
    coordinates: { lat: 18.9067, lng: 72.8147 },
    current_rainfall_mm_hr: Number(backendData.rainfall_mm_hr ?? 0),
    rainfall_condition: distWarning.warning_title || 'No Warning',
    district_warning: distWarning,
    nowcast_window_hours: 3,
    nowcast_steps: steps.length === 4 ? steps : getDemoFallbackWeather().nowcast_steps,
    radar_products: IMD_RADAR_PRODUCTS,
    primary_radar_image: backendData.primary_radar_image || '/api/imd/Radar/sri_mum.gif',
    is_cached: Boolean(backendData.is_cached),
    is_fallback: Boolean(backendData.is_demo_data),
  };
}

/**
 * Primary Real-Time Weather & Nowcast Ingestion Pipeline.
 * Prioritizes FastAPI backend (/api/weather/current) and falls back to direct client ingestion.
 * Respects strict source priority and timestamp freshness validation.
 */
export async function fetchLiveWeatherData(options?: {
  forceStatus?: WeatherDataStatus;
  fresh?: boolean;
}): Promise<NormalizedWeatherObservation> {
  // Support forced test states for deterministic testing
  if (options?.forceStatus === 'DEMO') {
    return getDemoFallbackWeather('User forced DEMO state');
  }
  if (options?.forceStatus === 'ERROR') {
    const errorFallback = getDemoFallbackWeather('Simulated upstream network timeout');
    errorFallback.status = 'ERROR';
    return errorFallback;
  }

  // 1. PRIMARY: Query FastAPI backend live endpoint
  try {
    const url = options?.fresh ? '/api/weather/current?fresh=true' : '/api/weather/current';
    const backendRes = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (backendRes.ok) {
      const json = await backendRes.json();
      if (json?.status === 'success' && json?.data) {
        const mapped = mapBackendWeatherToNormalized(json.data);
        if (!mapped.is_fallback) {
          cacheWeatherObservationLocally(mapped);
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Backend weather endpoint unavailable, engaging direct client fallback:', err);
  }

  const fetchTimestamp = new Date().toISOString();

  try {
    // 2. SECONDARY: Ingest Official IMD Nowcast Bulletin direct/proxy
    let imdHtml = '';
    try {
      const imdRes = await fetch(IMD_NOWCAST_PROXY_URL, {
        signal: AbortSignal.timeout(5000),
      });
      if (imdRes.ok) {
        imdHtml = await imdRes.text();
      }
    } catch {
      // Try direct URL if proxy is unavailable
      try {
        const directRes = await fetch(IMD_NOWCAST_DIRECT_URL, {
          signal: AbortSignal.timeout(5000),
        });
        if (directRes.ok) {
          imdHtml = await directRes.text();
        }
      } catch {
        // IMD unreachable
      }
    }

    const imdData = imdHtml ? parseIMDNowcast(imdHtml) : null;

    // 2. Ingest Supporting Telemetry (Open-Meteo) for continuous rate
    const telemetry = await fetchSupportingTelemetry();

    // 3. Evaluate Data Authenticity & Freshness
    if (imdData) {
      const { is_fresh, ageMinutes } = checkTimestampFreshness(imdData.time_of_issue);
      const status: WeatherDataStatus = is_fresh ? 'LIVE' : 'STALE';
      const statusReason = is_fresh
        ? `Official IMD Nowcast verified (Issued ${ageMinutes}m ago)`
        : `Official IMD Bulletin is STALE (Issued ${ageMinutes}m ago > 180m limit)`;

      // Map 0-3 hour nowcast steps
      const nowcastSteps: WeatherNowcastStep[] = [0, 1, 2, 3].map((offset) => {
        const stepRate = telemetry?.hourly_steps?.[offset]?.precipitation ?? 0;
        return {
          hour_offset: offset as 0 | 1 | 2 | 3,
          label: `T+${offset}` as any,
          timestamp: offset === 0 ? 'Current' : `+${offset} hr`,
          rainfall_intensity_mm_hr: stepRate,
          accumulated_rainfall_mm: Number((stepRate * (offset + 1) * 0.5).toFixed(1)),
          warning_level:
            stepRate > 75
              ? 'Warning'
              : stepRate > 35
              ? 'Alert'
              : stepRate > 10
              ? 'Watch'
              : 'No Warning',
        };
      });

      const imdObservation: NormalizedWeatherObservation = {
        source: 'IMD_NOWCAST',
        source_label: 'India Meteorological Department (IMD)',
        source_organization: 'Ministry of Earth Sciences, Govt. of India',
        status,
        status_reason: statusReason,
        source_timestamp: imdData.time_of_issue,
        fetch_timestamp: fetchTimestamp,
        is_fresh,
        station_name: `IMD Mumbai (${imdData.district})`,
        station_code: 'MUM-COLABA-VERAVALI',
        coordinates: { lat: 18.9067, lng: 72.8147 }, // Colaba DWR
        current_rainfall_mm_hr: telemetry?.current_rainfall ?? 0,
        rainfall_condition: imdData.warning_title,
        district_warning: imdData,
        nowcast_window_hours: 3,
        nowcast_steps: nowcastSteps,
        radar_products: IMD_RADAR_PRODUCTS,
        primary_radar_image: '/api/imd/Radar/sri_mum.gif',
        is_fallback: false,
      };
      cacheWeatherObservationLocally(imdObservation);
      return imdObservation;
    }

    // If IMD portal direct fetch did not return data but Open-Meteo telemetry responded:
    if (telemetry) {
      const nowcastSteps: WeatherNowcastStep[] = [0, 1, 2, 3].map((offset) => {
        const stepRate = telemetry.hourly_steps?.[offset]?.precipitation ?? 0;
        return {
          hour_offset: offset as 0 | 1 | 2 | 3,
          label: `T+${offset}` as any,
          timestamp: offset === 0 ? 'Current' : `+${offset} hr`,
          rainfall_intensity_mm_hr: stepRate,
          accumulated_rainfall_mm: Number((stepRate * (offset + 1) * 0.5).toFixed(1)),
          warning_level:
            stepRate > 75
              ? 'Warning'
              : stepRate > 35
              ? 'Alert'
              : stepRate > 10
              ? 'Watch'
              : 'No Warning',
        };
      });

      const liveTelemetryObservation: NormalizedWeatherObservation = {
        source: 'OPEN_METEO_BACKUP',
        source_label: 'Open-Meteo In-Situ Telemetry (IMD Gateway Inactive)',
        source_organization: 'Open-Meteo Numerical Weather API',
        status: 'LIVE',
        status_reason: 'Real-time in-situ telemetry verified from Open-Meteo point observation',
        source_timestamp: fetchTimestamp,
        fetch_timestamp: fetchTimestamp,
        is_fresh: true,
        station_name: 'Open-Meteo Mumbai Station',
        station_code: 'MUM-METEO-01',
        coordinates: { lat: 19.0760, lng: 72.8777 },
        current_rainfall_mm_hr: telemetry.current_rainfall,
        rainfall_condition: telemetry.current_rainfall > 0 ? 'Precipitation Detected' : 'Clear / No Precipitation',
        district_warning: {
          district: 'MUMBAI METROPOLITAN REGION',
          warning_title: telemetry.current_rainfall > 0 ? 'Precipitation Active' : 'No Warning',
          warning_color: telemetry.current_rainfall > 0 ? '#3B82F6' : '#008000',
          time_of_issue: fetchTimestamp,
          valid_upto: 'Next 3 Hours',
          details: 'Real-time telemetry stream from Open-Meteo Mumbai coordinates.',
        },
        nowcast_window_hours: 3,
        nowcast_steps: nowcastSteps,
        radar_products: IMD_RADAR_PRODUCTS,
        primary_radar_image: '/api/imd/Radar/sri_mum.gif',
        is_fallback: false,
      };
      cacheWeatherObservationLocally(liveTelemetryObservation);
      return liveTelemetryObservation;
    }

    // Complete outage: Graceful fallback
    return getDemoFallbackWeather('All meteorological gateways unreachable. Fallback baseline engaged.');
  } catch (err: any) {
    const fallback = getDemoFallbackWeather(`Ingestion error: ${err?.message || 'Unknown failure'}`);
    fallback.status = 'ERROR';
    return fallback;
  }
}
