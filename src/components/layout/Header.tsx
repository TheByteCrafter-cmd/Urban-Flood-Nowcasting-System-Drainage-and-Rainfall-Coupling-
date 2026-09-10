import React, { useState, useEffect } from 'react';
import { Menu, MapPin, Activity, X, Radio, Clock } from 'lucide-react';
import { SystemStatusPanel } from '../ui/SystemStatusPanel';

import { WeatherDataStatus } from '../../types/weather';
import { getInitialWeatherObservation } from '../../services/weatherService';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  dataSource?: string;
  weatherStatus?: WeatherDataStatus | 'INITIALIZING';
  lastUpdated?: string;
  isDemoMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  dataSource = 'IMD & Open-Meteo',
  weatherStatus,
  lastUpdated = '07:00 IST',
  isDemoMode = false,
}) => {
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<WeatherDataStatus | 'INITIALIZING'>(() => {
    if (weatherStatus) return weatherStatus;
    const initial = getInitialWeatherObservation();
    return initial ? initial.status : 'LIVE';
  });
  const [currentSource, setCurrentSource] = useState<string>(dataSource);
  const [currentUpdated, setCurrentUpdated] = useState<string>(lastUpdated);
  const [currentDemoMode, setCurrentDemoMode] = useState<boolean>(isDemoMode);

  // Synchronize when props change
  useEffect(() => {
    if (weatherStatus) setCurrentStatus(weatherStatus);
  }, [weatherStatus]);

  useEffect(() => {
    setCurrentSource(dataSource);
  }, [dataSource]);

  useEffect(() => {
    setCurrentUpdated(lastUpdated);
  }, [lastUpdated]);

  useEffect(() => {
    setCurrentDemoMode(isDemoMode);
  }, [isDemoMode]);

  // Listen for custom event from sidebar to open status modal
  useEffect(() => {
    const handleOpenStatus = () => setShowStatusModal(true);
    window.addEventListener('open-system-status', handleOpenStatus);
    return () => window.removeEventListener('open-system-status', handleOpenStatus);
  }, []);

  // Listen for custom event from pages to keep top header truthful
  useEffect(() => {
    const handleWeatherUpdate = (e: any) => {
      if (e?.detail) {
        if (e.detail.status) setCurrentStatus(e.detail.status);
        if (e.detail.source) setCurrentSource(e.detail.source);
        if (e.detail.lastUpdated) setCurrentUpdated(e.detail.lastUpdated);
        if (typeof e.detail.isDemoMode === 'boolean') setCurrentDemoMode(e.detail.isDemoMode);
      }
    };
    window.addEventListener('weather-status-update', handleWeatherUpdate as EventListener);
    return () => window.removeEventListener('weather-status-update', handleWeatherUpdate as EventListener);
  }, []);

  return (
    <>
      <header className="h-14 bg-slate-900 text-white border-b border-slate-800 px-3 lg:px-5 flex items-center justify-between sticky top-0 z-30 shadow-md select-none">
        {/* Left: Brand Identity & Mobile Menu */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-baseline gap-2">
            <span className="font-black text-lg tracking-tight text-white">GeoNexus</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 border-l border-slate-700 pl-2">
              Urban Flood Nowcasting System
            </span>
          </div>
        </div>

        {/* Center: Study Basin Identifier */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-md border border-slate-800 text-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-slate-400 text-[11px]">Study Basin:</span>
          <span className="font-bold text-slate-200 text-[11px]">Mumbai Metropolitan Region (DEM 5×5)</span>
        </div>

        {/* Right: Data Source, Provenance, Last Updated & System Ready */}
        <div className="flex items-center gap-2.5">
          {/* Data Source */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Source:</span>
            <span className="font-bold text-white text-[11px]">{currentSource}</span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden lg:block" />

          {/* Status Badge */}
          {currentStatus === 'LIVE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : currentStatus === 'CACHED' ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-xs"
              title="Observation served from high-speed cache"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              CACHED
            </span>
          ) : currentStatus === 'STALE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-xs">
              STALE
            </span>
          ) : currentStatus === 'ERROR' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-950/80 text-red-300 border border-red-700/60 shadow-xs">
              ERROR
            </span>
          ) : currentStatus === 'INITIALIZING' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-950/80 text-blue-300 border border-blue-700/60 animate-pulse shadow-xs">
              SYNCING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-950/80 text-blue-300 border border-blue-700/60 shadow-xs">
              DEMO
            </span>
          )}

          {/* Timestamp */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{currentUpdated}</span>
          </div>

          {/* Demo Mode Indicator */}
          {currentDemoMode && (
            <span className="hidden sm:inline-block text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded">
              DEMO SCENARIO
            </span>
          )}

          {/* System Ready Action */}
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            title="Click to view SIH26085 Engine Readiness & Architecture"
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold text-[11px]">SYSTEM READY</span>
          </button>
        </div>
      </header>

      {/* System Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setShowStatusModal(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full border border-slate-700 shadow-md transition-colors cursor-pointer"
              aria-label="Close Status Panel"
            >
              <X className="w-4 h-4" />
            </button>
            <SystemStatusPanel />
          </div>
        </div>
      )}
    </>
  );
};
