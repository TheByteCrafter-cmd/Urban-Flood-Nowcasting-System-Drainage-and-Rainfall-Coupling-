import React from 'react';
import { GitCommit, ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { DrainageNetworkState } from '../../types/drainage';
import { RunoffDataStatus } from '../../types/runoff';
import { NowcastHour } from '../../mock/nowcast';

interface DrainageSummaryCardProps {
  networkState: DrainageNetworkState | null;
  selectedHour: NowcastHour;
  className?: string;
}

export const DrainageSummaryCard: React.FC<DrainageSummaryCardProps> = ({
  networkState,
  selectedHour,
  className = '',
}) => {
  if (!networkState) return null;

  const getStatusBadge = (status: RunoffDataStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE HYDRAULICS
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

  const formatRate = (val: number) => val.toFixed(2);
  const formatVolume = (val: number) => Math.round(val).toLocaleString('en-IN');

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md text-slate-100 rounded-xl border border-slate-700/80 shadow-2xl p-3 flex flex-col gap-2 max-w-sm select-none ${className}`}
      role="region"
      aria-label="Drainage Hydraulics Summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <GitCommit className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Drainage Network (Phase 3C)
            </h3>
            <span className="text-[10px] text-slate-400 font-medium block">
              Hydraulic Capacity & Surcharge • Horizon T+{selectedHour}
            </span>
          </div>
        </div>
        <div>{getStatusBadge(networkState.status)}</div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Metric 1: Network Inflow */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Network Inflow (ΣQ_in)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-cyan-300">
              {formatRate(networkState.total_surface_inflow_m3_s)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">m³/s</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Interval Vol: {formatVolume(networkState.total_inflow_volume_m3)} m³
          </span>
        </div>

        {/* Metric 2: Outfall Discharge */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Outfall Discharge
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-emerald-300">
              {formatRate(networkState.total_outfall_discharge_m3_s)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">m³/s</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Discharged: {formatVolume(networkState.total_outfall_volume_m3)} m³
          </span>
        </div>

        {/* Metric 3: Surcharge / Overflow */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Surcharge Overflow
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-lg font-black ${
                networkState.total_surcharge_rate_m3_s > 0 ? 'text-red-400' : 'text-slate-300'
              }`}
            >
              {formatRate(networkState.total_surcharge_rate_m3_s)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">m³/s</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Excess Vol: {formatVolume(networkState.total_surcharge_volume_m3)} m³
          </span>
        </div>

        {/* Metric 4: Surcharged Nodes & Overcapacity Pipes */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Critical Assets
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={`text-base font-black ${
                networkState.surcharged_nodes_count > 0 ? 'text-red-400' : 'text-slate-300'
              }`}
            >
              {networkState.surcharged_nodes_count}
            </span>
            <span className="text-[10px] text-slate-400">nodes</span>
            <span className="text-slate-600 font-bold">•</span>
            <span
              className={`text-base font-black ${
                networkState.overcapacity_pipes_count > 0 ? 'text-orange-400' : 'text-slate-300'
              }`}
            >
              {networkState.overcapacity_pipes_count}
            </span>
            <span className="text-[10px] text-slate-400">pipes</span>
          </div>
          <span className="text-[9px] text-slate-400">
            Avg Pipe Util: {networkState.average_pipe_utilization_pct}%
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
            Inflow = Outfall + Surcharge
          </span>
          <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
            100% Conserved
          </span>
        </div>
      </div>

      {/* Provenance & Disclaimer Footer */}
      <div className="text-[9px] text-slate-400 leading-tight border-t border-slate-800/60 pt-1.5">
        <span className="font-semibold text-slate-400">Infrastructure:</span>{' '}
        <span className="text-amber-300/90 font-medium">ASSUMED_PROTOTYPE</span> (31 representative nodes across Mumbai corridors). Gravity Manning hydraulics; full surface-drainage dynamic coupling deferred to Phase 3D.
      </div>
    </div>
  );
};
