import React from 'react';
import { Layers, CloudRain, Mountain, Droplets, Waves, Compass, GitCommit, Check } from 'lucide-react';

interface LayerControlProps {
  showRainfall: boolean;
  onToggleRainfall: (active: boolean) => void;
  showDEM: boolean;
  onToggleDEM: (active: boolean) => void;
  showRunoff: boolean;
  onToggleRunoff: (active: boolean) => void;
  showSurfaceFlow: boolean;
  onToggleSurfaceFlow: (active: boolean) => void;
  showFlood: boolean;
  onToggleFlood: (active: boolean) => void;
  className?: string;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  showRainfall,
  onToggleRainfall,
  showDEM,
  onToggleDEM,
  showRunoff,
  onToggleRunoff,
  showSurfaceFlow,
  onToggleSurfaceFlow,
  showFlood,
  onToggleFlood,
  className = '',
}) => {
  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-lg w-64 space-y-3 ${className}`}
      aria-label="Map Layer Controller"
    >
      <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
        <Layers className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          GIS Layer Controller
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {/* Base Map Toggle (Permanent Base Layer) */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white">
              <Check className="w-3 h-3" />
            </div>
            <span className="font-medium text-slate-200">Base Map (OSM Neutral)</span>
          </div>
          <span className="text-[10px] text-slate-400">ACTIVE</span>
        </div>

        {/* DEM Elevation Layer Toggle (Phase 2B-2 Active) */}
        <label
          onClick={() => onToggleDEM(!showDEM)}
          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
            showDEM
              ? 'bg-emerald-950/80 border-emerald-600/80 text-white'
              : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                showDEM ? 'bg-emerald-600 text-white' : 'border border-slate-600 bg-slate-800'
              }`}
            >
              {showDEM && <Check className="w-3 h-3" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Mountain className={`w-3.5 h-3.5 ${showDEM ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="font-medium">DEM Elevation</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
            DEMO
          </span>
        </label>

        {/* Rainfall Layer Toggle (Phase 2B-1 Active) */}
        <label
          onClick={() => onToggleRainfall(!showRainfall)}
          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
            showRainfall
              ? 'bg-blue-950/80 border-blue-600/80 text-white'
              : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                showRainfall ? 'bg-blue-600 text-white' : 'border border-slate-600 bg-slate-800'
              }`}
            >
              {showRainfall && <Check className="w-3 h-3" />}
            </div>
            <div className="flex items-center gap-1.5">
              <CloudRain className={`w-3.5 h-3.5 ${showRainfall ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="font-medium">Rainfall Layer</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
            DEMO
          </span>
        </label>

        {/* Runoff Generation Layer Toggle (Phase 3A Active) */}
        <label
          onClick={() => onToggleRunoff(!showRunoff)}
          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
            showRunoff
              ? 'bg-cyan-950/80 border-cyan-600/80 text-white'
              : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                showRunoff ? 'bg-cyan-600 text-white' : 'border border-slate-600 bg-slate-800'
              }`}
            >
              {showRunoff && <Check className="w-3 h-3" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Waves className={`w-3.5 h-3.5 ${showRunoff ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="font-medium">Runoff Generation</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60">
            PHASE 3A
          </span>
        </label>

        {/* 2D Surface Flow Layer Toggle (Phase 3B Active) */}
        <label
          onClick={() => onToggleSurfaceFlow(!showSurfaceFlow)}
          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
            showSurfaceFlow
              ? 'bg-blue-950/80 border-blue-600/80 text-white'
              : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                showSurfaceFlow ? 'bg-blue-600 text-white' : 'border border-slate-600 bg-slate-800'
              }`}
            >
              {showSurfaceFlow && <Check className="w-3 h-3" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Compass className={`w-3.5 h-3.5 ${showSurfaceFlow ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="font-medium">2D Surface Flow</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-700/60">
            PHASE 3B
          </span>
        </label>

        {/* Flood Inundation Layer Toggle (Phase 2B-3 Active) */}
        <label
          onClick={() => onToggleFlood(!showFlood)}
          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
            showFlood
              ? 'bg-cyan-950/80 border-cyan-600/80 text-white'
              : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                showFlood ? 'bg-cyan-600 text-white' : 'border border-slate-600 bg-slate-800'
              }`}
            >
              {showFlood && <Check className="w-3 h-3" />}
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className={`w-3.5 h-3.5 ${showFlood ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="font-medium">Flood Inundation</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
            DEMO
          </span>
        </label>

        {/* Future Layers (Disabled / Coming Soon) */}
        <div className="pt-1 space-y-1 opacity-55">
          <div className="flex items-center justify-between p-1.5 rounded text-slate-400 bg-slate-800/20 cursor-not-allowed">
            <div className="flex items-center gap-2">
              <GitCommit className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px]">Drainage Network</span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500">Phase 4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
