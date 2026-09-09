import React from 'react';
import { CoupledSimulationState } from '../../types/coupling';
import { Waves, ArrowDownUp, AlertTriangle, Cpu, CheckCircle } from 'lucide-react';

interface CoupledSummaryCardProps {
  coupledState?: CoupledSimulationState | null;
  selectedHour: 0 | 1 | 2 | 3;
}

export const CoupledSummaryCard: React.FC<CoupledSummaryCardProps> = ({
  coupledState,
  selectedHour,
}) => {
  if (!coupledState) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-xl text-slate-400 text-xs w-84">
        Coupled simulation engine offline.
      </div>
    );
  }

  const {
    status,
    mass_balance,
    max_water_depth_cm,
    mean_water_depth_cm,
    critical_cells_count,
    total_drainage_intake_m3_s,
    total_surcharge_return_m3_s,
    iterations_run,
    drainage_network,
  } = coupledState;

  const isLive = status === 'LIVE';
  const isDemo = status === 'DEMO';

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-xl p-4 shadow-2xl text-slate-200 w-88 font-sans space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-sky-300">
            1D-2D Coupled Flood Model
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] bg-sky-950/80 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-800/60">
            PHASE 3D
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isLive
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                : isDemo
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
            }`}
          >
            T+{selectedHour} {isLive ? 'DERIVED' : status}
          </span>
        </div>
      </div>

      {/* Model Output Label */}
      <div className="flex items-center justify-between text-[11px] bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
        <span className="text-slate-400">Classification:</span>
        <span className="font-semibold text-sky-300 font-mono tracking-wide">
          MODEL OUTPUT / DERIVED
        </span>
      </div>

      {/* Key Inundation Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Waves className="w-3 h-3 text-cyan-400" />
            Max Flood Depth
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
            {max_water_depth_cm.toFixed(1)}{' '}
            <span className="text-[11px] font-normal text-slate-400">cm</span>
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            Mean: {mean_water_depth_cm.toFixed(1)} cm
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            High-Risk Cells
          </div>
          <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
            {critical_cells_count}{' '}
            <span className="text-[11px] font-normal text-slate-400">/ 25 cells</span>
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            Depth &ge; 50 cm
          </div>
        </div>
      </div>

      {/* Dynamic 1D-2D Water Exchange */}
      <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/50 space-y-2">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ArrowDownUp className="w-3 h-3 text-indigo-400" />
            Dynamic Water Exchange
          </span>
          <span className="font-mono text-indigo-300 text-[10px]">
            {iterations_run} / 5 iter
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Surface &rarr; Drainage Intake:</span>
            <span className="font-semibold text-emerald-400">
              {total_drainage_intake_m3_s.toFixed(2)} m³/s
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Drainage &rarr; Surface Surcharge:</span>
            <span className={`font-semibold ${total_surcharge_return_m3_s > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {total_surcharge_return_m3_s.toFixed(2)} m³/s
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Marine Outfall Discharge:</span>
            <span className="font-semibold text-cyan-400">
              {drainage_network.total_outfall_discharge_m3_s.toFixed(2)} m³/s
            </span>
          </div>
        </div>
      </div>

      {/* Strict Mass-Balance Diagnostic */}
      <div className="bg-slate-950/60 rounded-lg p-2.5 border border-emerald-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-300">
              Dual Mass Balance
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            {mass_balance.is_conserved ? '100.00% CONSERVED' : 'DISCREPANCY'}
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-2 text-[10px] font-mono text-slate-400">
          <div>Input: {(mass_balance.input_runoff_volume_m3 / 1000).toFixed(1)}k m³</div>
          <div>Stored: {(mass_balance.surface_stored_volume_m3 / 1000).toFixed(1)}k m³</div>
          <div>Outfall: {(mass_balance.drainage_outfall_volume_m3 / 1000).toFixed(1)}k m³</div>
          <div>Domain Exit: {(mass_balance.surface_boundary_outflow_m3 / 1000).toFixed(1)}k m³</div>
        </div>
        <div className="mt-1 text-[9px] text-slate-500 font-mono flex justify-between">
          <span>Formula: Input = Stored + Outfall + Domain Exit</span>
          <span className="text-emerald-400">Error: {mass_balance.volume_balance_error_pct.toFixed(4)}%</span>
        </div>
      </div>

      {/* Attribution Disclaimer */}
      <div className="text-[9px] text-slate-500 italic leading-tight border-t border-slate-800/80 pt-2">
        * ASSUMED_PROTOTYPE: 1D-2D hydrodynamic coupling demonstration for SIH26085. Not certified municipal BMC flood forecast.
      </div>
    </div>
  );
};
