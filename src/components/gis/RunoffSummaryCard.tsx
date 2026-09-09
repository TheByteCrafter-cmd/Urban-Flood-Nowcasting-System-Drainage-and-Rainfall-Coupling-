import React from 'react';
import { Waves, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { RunoffGrid, RunoffDataStatus } from '../../types/runoff';
import { NowcastHour } from '../../mock/nowcast';

interface RunoffSummaryCardProps {
  runoffGrid: RunoffGrid | null;
  selectedHour: NowcastHour;
  className?: string;
}

export const RunoffSummaryCard: React.FC<RunoffSummaryCardProps> = ({
  runoffGrid,
  selectedHour,
  className = '',
}) => {
  if (!runoffGrid) return null;

  const getStatusBadge = (status: RunoffDataStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE RUNOFF
          </span>
        );
      case 'DERIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/50">
            <Info className="w-3 h-3 text-blue-400" />
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

  // Format volume in m³ with comma separation
  const formatVolume = (val: number) => {
    return Math.round(val).toLocaleString('en-IN');
  };

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl border border-slate-700/80 shadow-2xl p-3 flex flex-col gap-2 max-w-sm select-none ${className}`}
      role="region"
      aria-label="Runoff Generation Engine Summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Waves className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Runoff Engine (Phase 3A)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium block">
              Prototype Hydrological Grid (5×5)
            </span>
          </div>
        </div>
        <div>{getStatusBadge(runoffGrid.status)}</div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Metric 1: Peak Runoff Rate */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Peak Runoff Rate (q_gen)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-cyan-300">
              {runoffGrid.peak_runoff_rate_m3_s.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">m³/s</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Dimensionally exact: (C·I·A)/3.6e6
          </span>
        </div>

        {/* Metric 2: Interval Runoff Volume */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Interval Runoff Volume
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-blue-300">
              {formatVolume(runoffGrid.total_runoff_volume_m3)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">m³</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Horizon: T+{selectedHour} (1-hr interval)
          </span>
        </div>
      </div>

      {/* Water Balance Invariant Row */}
      <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Water Balance:</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-300 text-[10px]">
            Gross Rain: <strong className="text-white">{formatVolume(runoffGrid.total_gross_rainfall_volume_m3)} m³</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-300 font-bold text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
            {(runoffGrid.water_balance_ratio * 100).toFixed(1)}% Runoff
          </span>
        </div>
      </div>

      {/* Provenance & Disclaimer Footer */}
      <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800/80 leading-tight flex flex-col gap-0.5">
        <p>
          <span className="font-bold text-slate-300">Parameters:</span>{' '}
          <span className="text-amber-400/90 font-semibold">ASSUMED_PROTOTYPE</span> (CPHEEO Urban Drainage Guideline Coefficients).
        </p>
        <p className="text-slate-400 italic">
          Input to future 2D overland routing & drainage coupling. Not street flood depth.
        </p>
      </div>
    </div>
  );
};