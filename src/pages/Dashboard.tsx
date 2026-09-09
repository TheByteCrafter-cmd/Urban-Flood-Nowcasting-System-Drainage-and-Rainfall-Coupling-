import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer } from '../components/gis/MapContainer';
import { LiveWeatherStatusBar } from '../components/gis/LiveWeatherStatusBar';
import { fetchLiveWeatherData, getDemoFallbackWeather } from '../services/weatherService';
import { generateRunoffForecast } from '../services/runoffService';
import { NormalizedWeatherObservation, WeatherDataStatus } from '../types/weather';

export const Dashboard: React.FC = () => {
  const [weather, setWeather] = useState<NormalizedWeatherObservation>(getDemoFallbackWeather());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadWeatherData = async (forcedStatus?: WeatherDataStatus) => {
    setIsLoading(true);
    try {
      const data = await fetchLiveWeatherData({ forceStatus: forcedStatus });
      setWeather(data);
    } catch (err: any) {
      const fallback = getDemoFallbackWeather(err?.message || 'Ingestion failure');
      fallback.status = 'ERROR';
      setWeather(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherData();
  }, []);

  const runoffForecast = useMemo(() => {
    return generateRunoffForecast(weather);
  }, [weather]);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[550px] space-y-2">
      {/* Real-Time Official Meteorological Ingestion Bar (IMD / DWR) */}
      <div className="relative z-[1100]">
        <LiveWeatherStatusBar
          weather={weather}
          isLoading={isLoading}
          onRefresh={loadWeatherData}
        />
      </div>

      {/* Primary GIS Map Container - Priority layout occupying maximum content height */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          cityName="Mumbai Metropolitan Region"
          center={[72.8777, 19.0760]}
          zoom={11.5}
          className="h-full w-full"
          weather={weather}
          runoffForecast={runoffForecast}
        />
      </div>
    </div>
  );
};