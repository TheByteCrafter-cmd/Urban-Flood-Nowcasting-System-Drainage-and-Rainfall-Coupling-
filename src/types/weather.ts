export type WeatherDataSource = 'IMD_NOWCAST' | 'IMD_DWR' | 'OPEN_METEO_BACKUP' | 'DEMO_FALLBACK';
export type WeatherDataStatus = 'LIVE' | 'STALE' | 'DEMO' | 'ERROR';

export interface WeatherNowcastStep {
  hour_offset: 0 | 1 | 2 | 3;
  label: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  timestamp: string;
  rainfall_intensity_mm_hr: number;
  accumulated_rainfall_mm: number;
  warning_level: 'No Warning' | 'Watch' | 'Alert' | 'Warning';
}

export interface RadarProductInfo {
  product_code: 'SRI' | 'PAC' | 'PPZ' | 'CAZ';
  title: string;
  description: string;
  image_url: string;
  unit: string;
  last_modified?: string;
}

export interface NormalizedWeatherObservation {
  source: WeatherDataSource;
  source_label: string; // e.g. "IMD Mausam & Doppler Radar"
  source_organization: string; // "India Meteorological Department"
  status: WeatherDataStatus;
  status_reason: string;
  
  // Strict timestamp separation
  source_timestamp: string; // When IMD published/issued the observation
  fetch_timestamp: string;  // When client fetched the data
  is_fresh: boolean;        // True only if source_timestamp is within freshness window

  station_name: string;
  station_code: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  
  current_rainfall_mm_hr: number;
  rainfall_condition: string;
  district_warning: {
    district: string;
    warning_title: string;
    warning_color: string;
    time_of_issue: string;
    valid_upto: string;
    details: string;
  };

  nowcast_window_hours: number;
  nowcast_steps: WeatherNowcastStep[];
  
  radar_products: RadarProductInfo[];
  primary_radar_image?: string;
  
  is_fallback: boolean;
  error_details?: string;
}