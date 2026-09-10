import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer } from '../components/gis/MapContainer';
import { LiveWeatherStatusBar } from '../components/gis/LiveWeatherStatusBar';
import { fetchLiveWeatherData, getDemoFallbackWeather } from '../services/weatherService';
import { generateRunoffForecast } from '../services/runoffService';
import { generateSurfaceFlowForecast } from '../services/surfaceFlowService';
import { generateCoupledForecast } from '../services/couplingService';
import { NormalizedWeatherObservation, WeatherDataStatus } from '../types/weather';

export const Dashboard: React.FC = () => {
  const [weather, setWeather] = useState<NormalizedWeatherObservation>(getDemoFallbackWeather());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scenarioMode, setScenarioMode] = useState<'LIVE' | 'DEMO_SURGE' | 'DRY'>('LIVE');

  const loadWeatherData = async (forcedStatus?: WeatherDataStatus) => {
    setIsLoading(true);
    try {
      if (scenarioMode === 'DEMO_SURGE') {
        const surge = getDemoFallbackWeather('Monsoon Storm Scenario (65 mm/hr)');
        surge.status = 'DEMO';
        surge.current_rainfall_mm_hr = 65;
        surge.nowcast_steps = [
          { hour_offset: 0, label: 'T+0', timestamp: 'T+0', rainfall_intensity_mm_hr: 50, accumulated_rainfall_mm: 50, warning_level: 'Watch' },
          { hour_offset: 1, label: 'T+1', timestamp: 'T+1', rainfall_intensity_mm_hr: 65, accumulated_rainfall_mm: 115, warning_level: 'Warning' },
          { hour_offset: 2, label: 'T+2', timestamp: 'T+2', rainfall_intensity_mm_hr: 75, accumulated_rainfall_mm: 190, warning_level: 'Warning' },
          { hour_offset: 3, label: 'T+3', timestamp: 'T+3', rainfall_intensity_mm_hr: 80, accumulated_rainfall_mm: 270, warning_level: 'Warning' },
        ];
        setWeather(surge);
      } else if (scenarioMode === 'DRY') {
        const dry = getDemoFallbackWeather('Dry Baseline (0 mm/hr)');
        dry.status = 'DEMO';
        dry.current_rainfall_mm_hr = 0;
        dry.nowcast_steps = dry.nowcast_steps.map((s) => ({
          ...s,
          rainfall_intensity_mm_hr: 0,
          accumulated_rainfall_mm: 0,
        }));
        setWeather(dry);
      } else {
        const data = await fetchLiveWeatherData({ forceStatus: forcedStatus });
        setWeather(data);
      }
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
  }, [scenarioMode]);

  const runoffForecast = useMemo(() => {
    return generateRunoffForecast(weather);
  }, [weather]);

  const surfaceFlowForecast = useMemo(() => {
    return generateSurfaceFlowForecast(runoffForecast);
  }, [runoffForecast]);

  const coupledForecast = useMemo(() => {
    return generateCoupledForecast(runoffForecast);
  }, [runoffForecast]);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[550px] space-y-2">
      {/* Top Controls Bar: Weather Status + Scenario Mode Toggle */}
      <div className="relative z-[1100] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex-1">
          <LiveWeatherStatusBar
            weather={weather}
            isLoading={isLoading}
            onRefresh={loadWeatherData}
          />
        </div>

        {/* Quick Scenario Selector for Judges */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-lg text-xs shadow-lg shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setScenarioMode('LIVE')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              scenarioMode === 'LIVE' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Weather
          </button>
          <button
            onClick={() => setScenarioMode('DEMO_SURGE')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              scenarioMode === 'DEMO_SURGE' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monsoon Demo (65 mm/hr)
          </button>
          <button
            onClick={() => setScenarioMode('DRY')}
            className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              scenarioMode === 'DRY' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dry (0 mm/hr)
          </button>
        </div>
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
          surfaceFlowForecast={surfaceFlowForecast}
          coupledForecast={coupledForecast}
        />
      </div>
    </div>
  );
};