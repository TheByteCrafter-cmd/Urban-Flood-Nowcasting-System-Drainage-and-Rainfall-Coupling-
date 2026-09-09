import React from 'react';
import { Compass, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { SurfaceFlowGrid } from '../../types/surfaceFlow';
import { RunoffDataStatus } from '../../types/runoff';
import { NowcastHour } from '../../mock/nowcast';

interface SurfaceFlowSummaryCardProps {
  flowGrid: SurfaceFlowGrid | null;
  selectedHour: NowcastHour;
  className?: string;
}

export const SurfaceFlowSummaryCard: React.FC<SurfaceFlowSummaryCardProps> = ({
  flowGrid,
  selectedHour,
  className = '',
}) => {
  if (!flowGrid) return null;

  const getStatusBadge = (status: RunoffDataStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE FLOW
          </span>
        );
      case 'DERIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/50">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            DERIVED NOWCAST
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/50">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            STALE INPUT
          </span>
        );
      case 'DEMO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50">
            <Info className="w-3 h-3 text-indigo-400" />
            DEMO BASELINE
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/50">
            ERROR
          </span>
        );
    }
  };

  const formatVolume = (val: number) => {
    return Math.round(val).toLocaleString('en-IN');
  };

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl border border-slate-700/80 shadow-2xl p-3 flex flex-col gap-2 max-w-sm select-none ${className}`}
      role="region"
      aria-label="2D Surface Flow Engine Summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              2D Surface Flow (Phase 3B)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium block">
              DEM D8 Routing (5×5) • Horizon T+{selectedHour}
            </span>
          </div>
        </div>
        <div>{getStatusBadge(flowGrid.status)}</div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Metric 1: Max Surface Depth */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Max Water Depth
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-blue-300">
              {flowGrid.max_water_depth_cm.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">cm</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Mean depth: {flowGrid.mean_water_depth_cm.toFixed(1)} cm
          </span>
        </div>

        {/* Metric 2: Stored Surface Volume */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Surface Stored Water
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-cyan-300">
              {formatVolume(flowGrid.total_retained_surface_volume_m3)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">m³</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Outflow to sea: {formatVolume(flowGrid.total_boundary_outflow_volume_m3)} m³
          </span>
        </div>
      </div>

      {/* Water Balance Invariant Row */}
      <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Mass Balance:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-300 text-[10px]">
            Input Runoff: <strong className="text-white">{formatVolume(flowGrid.total_input_runoff_volume_m3)} m³</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-300 font-bold text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
            {flowGrid.water_balance_conserved ? '100% Conserved' : 'Unbalanced'}
          </span>
        </div>
      </div>

      {/* Provenance & Disclaimer Footer */}
      <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800/80 leading-tight flex flex-col gap-0.5">
        <p>
          <span className="font-bold text-slate-300">Terrain:</span>{' '}
          <span className="text-amber-400/90 font-semibold">ASSUMED_PROTOTYPE DEM</span> (5×5 elevation pattern).
        </p>
        <p className="text-slate-400 italic">
          Prototype 2D surface-flow simulation. Not calibrated municipal flood prediction.
        </p>
      </div>
    </div>
  );
};
