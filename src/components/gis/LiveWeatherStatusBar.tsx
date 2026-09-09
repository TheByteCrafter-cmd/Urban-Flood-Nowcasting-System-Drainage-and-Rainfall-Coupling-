import React, { useState } from 'react';
import {
  Radio,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
} from 'lucide-react';
import { NormalizedWeatherObservation, WeatherDataStatus } from '../../types/weather';

interface LiveWeatherStatusBarProps {
  weather: NormalizedWeatherObservation | null;
  isLoading: boolean;
  onRefresh: (forcedStatus?: WeatherDataStatus) => void;
  className?: string;
}

export const LiveWeatherStatusBar: React.FC<LiveWeatherStatusBarProps> = ({
  weather,
  isLoading,
  onRefresh,
  className = '',
}) => {
  const [showRadarModal, setShowRadarModal] = useState<boolean>(false);
  const [selectedRadarCode, setSelectedRadarCode] = useState<'SRI' | 'PAC' | 'PPZ' | 'CAZ'>('SRI');
  const [showStatusMenu, setShowStatusMenu] = useState<boolean>(false);

  if (!weather) return null;

  const getStatusBadge = (status: WeatherDataStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            STALE
          </span>
        );
      case 'DEMO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-xs">
            <Info className="w-3 h-3 text-blue-400" />
            DEMO / FALLBACK
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/50 shadow-xs">
            <AlertCircle className="w-3 h-3 text-red-400" />
            ERROR
          </span>
        );
    }
  };

  const selectedRadar = weather.radar_products.find((p) => p.product_code === selectedRadarCode) || weather.radar_products[0];

  return (
    <>
      <div
        className={`relative z-50 bg-slate-950/90 backdrop-blur-md text-slate-100 rounded-lg border border-slate-800 shadow-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none ${className}`}
        role="region"
        aria-label="Real-Time Meteorological Ingestion Bar"
      >
        {/* Left Segment: Source, Status, and Station */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              DATA SOURCE:
            </span>
            <span className="font-bold text-white text-[11px] tracking-wide">
              {weather.source_organization ? 'IMD (Govt. of India)' : weather.source_label}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Status Badge */}
          <div className="flex items-center gap-1">
            {getStatusBadge(weather.status)}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Station / Area */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-300">
            <span className="text-slate-400 text-[10px] font-medium">STATION:</span>
            <span className="font-semibold text-slate-200">{weather.station_name}</span>
          </div>
        </div>

        {/* Middle Segment: Timestamps and Live Rainfall */}
        <div className="flex items-center flex-wrap gap-3 text-[11px]">
          {/* Source Observation Timestamp */}
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[10px]">ISSUED:</span>
            <span className="font-bold text-white text-[10px]">
              {weather.source_timestamp}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Current Rainfall Telemetry */}
          <div className="flex items-center gap-1.5 bg-blue-950/50 border border-blue-800/60 px-2 py-0.5 rounded">
            <span className="text-blue-300 text-[10px] font-bold uppercase">RAINFALL:</span>
            <span className="font-extrabold text-white text-xs">
              {weather.current_rainfall_mm_hr.toFixed(1)}
            </span>
            <span className="text-[9px] text-blue-200 font-semibold">mm/hr</span>
          </div>

          {/* Warning Condition */}
          <div className="hidden lg:flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">BULLETIN:</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded border"
              style={{
                backgroundColor: `${weather.district_warning.warning_color}25`,
                color: weather.district_warning.warning_color,
                borderColor: `${weather.district_warning.warning_color}60`,
              }}
            >
              {weather.district_warning.warning_title}
            </span>
          </div>
        </div>

        {/* Right Segment: DWR Radar button, State Mode Selector, Refresh */}
        <div className="flex items-center gap-2">
          {/* Doppler Weather Radar Preview Trigger */}
          <button
            type="button"
            onClick={() => setShowRadarModal(true)}
            aria-label="Open IMD Doppler Weather Radar viewer"
            className="flex items-center gap-1 text-[10px] font-bold bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>IMD DWR RADAR</span>
          </button>

          {/* State Mode Switcher (For test verification of LIVE, STALE, DEMO, ERROR) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              aria-label="Toggle telemetry mode selector"
              className="flex items-center gap-1 text-[10px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-1 rounded transition-colors cursor-pointer"
            >
              <span>Mode</span>
              {showStatusMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-[1200] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1.5 min-w-[170px] flex flex-col gap-1">
                <div className="text-[9px] font-bold text-slate-400 px-2 py-1 border-b border-slate-800 uppercase">
                  Telemetry Ingestion Mode
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusMenu(false);
                    onRefresh();
                  }}
                  className="text-left px-2 py-1 text-[11px] rounded hover:bg-slate-800 font-medium text-emerald-400 flex items-center justify-between cursor-pointer"
                >
                  <span>Auto (IMD Live / Fresh)</span>
                  {weather.status === 'LIVE' && <CheckCircle2 className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusMenu(false);
                    onRefresh('DEMO');
                  }}
                  className="text-left px-2 py-1 text-[11px] rounded hover:bg-slate-800 font-medium text-blue-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Force DEMO Fallback</span>
                  {weather.status === 'DEMO' && <CheckCircle2 className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusMenu(false);
                    onRefresh('ERROR');
                  }}
                  className="text-left px-2 py-1 text-[11px] rounded hover:bg-slate-800 font-medium text-red-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Simulate Outage (ERROR)</span>
                  {weather.status === 'ERROR' && <CheckCircle2 className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={isLoading}
            aria-label="Refresh live IMD weather data"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Live Weather Ingestion"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* IMD Doppler Weather Radar Modal */}
      {showRadarModal && (
        <div
          className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="IMD Doppler Weather Radar Modal"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  IMD Doppler Weather Radar (DWR) — Mumbai Station
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRadarModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                aria-label="Close radar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Tabs */}
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
              {weather.radar_products.map((prod) => (
                <button
                  key={prod.product_code}
                  type="button"
                  onClick={() => setSelectedRadarCode(prod.product_code)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    selectedRadarCode === prod.product_code
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {prod.product_code} ({prod.unit})
                </button>
              ))}
            </div>

            {/* Radar Viewer Area */}
            <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-slate-950/60">
              <div className="text-center mb-3">
                <h4 className="text-xs font-bold text-slate-200">{selectedRadar.title}</h4>
                <p className="text-[11px] text-slate-400 max-w-md mt-0.5">{selectedRadar.description}</p>
              </div>

              {/* Radar Image Frame with Fallback Handling */}
              <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-black max-w-md shadow-inner">
                <img
                  src={selectedRadar.image_url}
                  alt={`IMD Doppler Weather Radar product ${selectedRadar.product_code} for Mumbai`}
                  className="w-full h-auto object-contain max-h-[360px]"
                  onError={(e) => {
                    // Fallback to direct IMD URL if local proxy image has trouble
                    const target = e.currentTarget;
                    if (!target.src.includes('mausam.imd.gov.in')) {
                      target.src = `https://mausam.imd.gov.in/Radar/${selectedRadar.product_code.toLowerCase()}_mum.gif`;
                    }
                  }}
                />
              </div>

              {/* Radar Metadata Footer */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full text-center text-[10px]">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block font-medium">Radar Station</span>
                  <span className="text-white font-bold">Colaba / Veravali (Mumbai)</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block font-medium">Coordinates</span>
                  <span className="text-white font-bold">18.9067° N, 72.8147° E</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block font-medium">Operator</span>
                  <span className="text-emerald-400 font-bold">IMD / MoES</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Coupled into 2D overland flood routing pipeline
              </span>
              <a
                href="https://mausam.imd.gov.in/responsive/radar.php?id=Mumbai-Colaba"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-semibold"
              >
                <span>IMD Radar Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};