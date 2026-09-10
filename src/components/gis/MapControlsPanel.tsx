import React, { useState } from 'react';
import {
  Layers,
  Mountain,
  CloudRain,
  Waves,
  Compass,
  Droplets,
  GitCommit,
  Cpu,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { NowcastHour } from '../../mock/nowcast';

interface MapControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Layers
  showBaseMap: boolean;
  onToggleBaseMap: (v: boolean) => void;
  showDEM: boolean;
  onToggleDEM: (v: boolean) => void;
  showRainfall: boolean;
  onToggleRainfall: (v: boolean) => void;
  showRunoff: boolean;
  onToggleRunoff: (v: boolean) => void;
  showSurfaceFlow: boolean;
  onToggleSurfaceFlow: (v: boolean) => void;
  showDrainage: boolean;
  onToggleDrainage: (v: boolean) => void;
  showCoupled: boolean;
  onToggleCoupled: (v: boolean) => void;
  showFlood: boolean;
  onToggleFlood: (v: boolean) => void;
  showRisk: boolean;
  onToggleRisk: (v: boolean) => void;
  // Model Status & Provenance
  selectedHour: NowcastHour;
  scenarioMode: 'LIVE' | 'DEMO_SURGE' | 'DRY';
  weatherStatus?: string;
  className?: string;
}

export const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
  isOpen,
  onClose,
  showBaseMap,
  onToggleBaseMap,
  showDEM,
  onToggleDEM,
  showRainfall,
  onToggleRainfall,
  showRunoff,
  onToggleRunoff,
  showSurfaceFlow,
  onToggleSurfaceFlow,
  showDrainage,
  onToggleDrainage,
  showCoupled,
  onToggleCoupled,
  showFlood,
  onToggleFlood,
  showRisk,
  onToggleRisk,
  selectedHour,
  scenarioMode,
  weatherStatus = 'LIVE',
  className = '',
}) => {
  const [legendTab, setLegendTab] = useState<'depth' | 'risk' | 'drainage'>('depth');

  if (!isOpen) return null;

  return (
    <div
      className={`w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md text-slate-200 border-l border-slate-800 flex flex-col h-full overflow-y-auto shadow-2xl shrink-0 z-30 select-none ${className}`}
      role="region"
      aria-label="GIS Map Controls Panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Map Controls</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          title="Collapse Map Controls"
          aria-label="Collapse panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-4 flex-1 text-xs">
        {/* ============================================================== */}
        {/* SECTION A: LAYERS                                              */}
        {/* ============================================================== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              A. Active Layers
            </span>
            <span className="text-[10px] text-slate-500 font-mono">9 Available</span>
          </div>

          <div className="space-y-1">
            {/* 1. Base Map */}
            <label
              onClick={() => onToggleBaseMap(!showBaseMap)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showBaseMap
                  ? 'bg-slate-800/80 border-slate-700 text-slate-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showBaseMap ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showBaseMap && <Check className="w-2.5 h-2.5" />}
                </div>
                <span className="font-medium text-[11px]">Base Map (OSM Neutral)</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">BASE</span>
            </label>

            {/* 2. DEM Elevation */}
            <label
              onClick={() => onToggleDEM(!showDEM)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showDEM
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showDEM ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showDEM && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Mountain className={`w-3.5 h-3.5 ${showDEM ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">DEM Elevation</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/50">
                PROTOTYPE
              </span>
            </label>

            {/* 3. Rainfall Layer */}
            <label
              onClick={() => onToggleRainfall(!showRainfall)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showRainfall
                  ? 'bg-blue-950/40 border-blue-700/60 text-blue-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showRainfall ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showRainfall && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <CloudRain className={`w-3.5 h-3.5 ${showRainfall ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">Rainfall Intensity</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-blue-400/90 bg-blue-950/60 px-1 py-0.2 rounded border border-blue-800/50">
                RADAR
              </span>
            </label>

            {/* 4. Runoff Generation */}
            <label
              onClick={() => onToggleRunoff(!showRunoff)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showRunoff
                  ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showRunoff ? 'bg-cyan-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showRunoff && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Waves className={`w-3.5 h-3.5 ${showRunoff ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">Runoff Generation</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-cyan-400/90 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/50">
                PHASE 3A
              </span>
            </label>

            {/* 5. 2D Surface Flow */}
            <label
              onClick={() => onToggleSurfaceFlow(!showSurfaceFlow)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showSurfaceFlow
                  ? 'bg-blue-950/40 border-blue-700/60 text-blue-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showSurfaceFlow ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showSurfaceFlow && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Compass className={`w-3.5 h-3.5 ${showSurfaceFlow ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">2D Surface Flow</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-blue-400/90 bg-blue-950/60 px-1 py-0.2 rounded border border-blue-800/50">
                PHASE 3B
              </span>
            </label>

            {/* 6. Drainage Network */}
            <label
              onClick={() => onToggleDrainage(!showDrainage)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showDrainage
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showDrainage ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showDrainage && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <GitCommit className={`w-3.5 h-3.5 ${showDrainage ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">Drainage Network</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-emerald-400/90 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/50">
                PHASE 3C
              </span>
            </label>

            {/* 7. Coupled 1D-2D */}
            <label
              onClick={() => onToggleCoupled(!showCoupled)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showCoupled
                  ? 'bg-sky-950/40 border-sky-700/60 text-sky-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showCoupled ? 'bg-sky-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showCoupled && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Cpu className={`w-3.5 h-3.5 ${showCoupled ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">Coupled 1D–2D Depth</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-sky-400/90 bg-sky-950/60 px-1 py-0.2 rounded border border-sky-800/50">
                PHASE 3D
              </span>
            </label>

            {/* 8. Flood Inundation */}
            <label
              onClick={() => onToggleFlood(!showFlood)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showFlood
                  ? 'bg-blue-950/40 border-blue-700/60 text-blue-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showFlood ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showFlood && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className={`w-3.5 h-3.5 ${showFlood ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">Flood Inundation</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                DEMO
              </span>
            </label>

            {/* 9. Risk Assessment */}
            <label
              onClick={() => onToggleRisk(!showRisk)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                showRisk
                  ? 'bg-amber-950/40 border-amber-700/60 text-amber-100'
                  : 'bg-slate-900/40 border-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                    showRisk ? 'bg-amber-600 text-white' : 'border border-slate-700 bg-slate-950'
                  }`}
                >
                  {showRisk && <Check className="w-2.5 h-2.5" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className={`w-3.5 h-3.5 ${showRisk ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-medium text-[11px]">Risk Assessment</span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/50">
                PHASE 4B
              </span>
            </label>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION B: TABBED LEGEND (Only one visible at a time!)        */}
        {/* ============================================================== */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              B. Map Legend
            </span>
            <span className="text-[9px] text-slate-500">Selected Only</span>
          </div>

          {/* Compact 3-Tab Selector */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setLegendTab('depth')}
              className={`py-1 rounded font-bold transition-colors cursor-pointer ${
                legendTab === 'depth' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Flood Depth
            </button>
            <button
              type="button"
              onClick={() => setLegendTab('risk')}
              className={`py-1 rounded font-bold transition-colors cursor-pointer ${
                legendTab === 'risk' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Risk Level
            </button>
            <button
              type="button"
              onClick={() => setLegendTab('drainage')}
              className={`py-1 rounded font-bold transition-colors cursor-pointer ${
                legendTab === 'drainage' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Drainage
            </button>
          </div>

          {/* Legend Content */}
          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80">
            {legendTab === 'depth' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                  <span>Depth Category</span>
                  <span>Range (cm)</span>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Low', range: '0–5 cm', color: '#DBEAFE' },
                    { label: 'Moderate', range: '5–20 cm', color: '#93C5FD' },
                    { label: 'High', range: '20–50 cm', color: '#3B82F6' },
                    { label: 'Very High', range: '50–100 cm', color: '#1D4ED8' },
                    { label: 'Critical', range: '>100 cm', color: '#172554' },
                  ].map((item) => (
                    <div key={item.range} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs shrink-0 border border-slate-700" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-medium">{item.label}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{item.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {legendTab === 'risk' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                  <span>Risk Classification</span>
                  <span>Multi-factor</span>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Low', desc: '<5 cm normal flow', color: '#10B981' },
                    { label: 'Moderate', desc: '5–20 cm depth', color: '#3B82F6' },
                    { label: 'High', desc: '20–50 cm or bottleneck', color: '#F59E0B' },
                    { label: 'Very High', desc: '50–100 cm or surcharge', color: '#EA580C' },
                    { label: 'Critical', desc: '≥100 cm or overflow', color: '#EF4444' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-medium">{item.label}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {legendTab === 'drainage' && (
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Pipe Utilization</span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1.5 rounded-xs bg-[#10B981]" />
                      <span className="text-slate-300">&lt;50% Normal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1.5 rounded-xs bg-[#F59E0B]" />
                      <span className="text-slate-300">50–80% Mod</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1.5 rounded-xs bg-[#F97316]" />
                      <span className="text-slate-300">80–100% High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1.5 rounded-xs bg-[#EF4444]" />
                      <span className="text-red-400 font-bold">&gt;100% Over</span>
                    </div>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Node Hydraulic State</span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                      <span className="text-slate-300">Normal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                      <span className="text-slate-300">Watch</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                      <span className="text-orange-400">Surcharge</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                      <span className="text-red-400 font-bold">Overflow</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION C: MODEL STATUS & PROVENANCE                           */}
        {/* ============================================================== */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            C. Model Status
          </span>

          <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Horizon:</span>
              <strong className="text-blue-400 font-mono">T+{selectedHour} ({selectedHour === 0 ? 'Now' : `+${selectedHour}h`})</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Coupling Solver:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                READY (0.00% err)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Data Provenance:</span>
              <span className="font-semibold text-slate-200">
                {scenarioMode === 'LIVE' ? 'MODEL OUTPUT / DERIVED' : 'DEMO SCENARIO'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Weather Status:</span>
              <span className="font-mono text-slate-300 text-[10px]">{weatherStatus}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Basin Calibration:</span>
              <span className="text-slate-300 font-mono text-[10px]">Mumbai MMR (5×5 D8)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
