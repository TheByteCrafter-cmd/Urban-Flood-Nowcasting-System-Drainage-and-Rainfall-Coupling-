import React from 'react';
import { GitCommit, Info } from 'lucide-react';

interface DrainageLegendProps {
  className?: string;
}

export const DrainageLegend: React.FC<DrainageLegendProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-lg text-xs w-64 select-none ${className}`}
      aria-label="Drainage Network Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <GitCommit className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-200 uppercase tracking-wide block text-[11px]">
              Drainage Network
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Hydraulic Utilization & Surcharge
            </span>
          </div>
        </div>
        <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/60">
          PHASE 3C
        </span>
      </div>

      {/* Pipe Utilization Bands */}
      <div className="space-y-1.5 mb-2.5">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
          Pipe Flow Utilization (Q / Q_cap)
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-sm bg-[#10B981] shrink-0" />
            <span className="text-slate-300">Normal (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-sm bg-[#F59E0B] shrink-0" />
            <span className="text-slate-300">Moderate (50-80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-sm bg-[#F97316] shrink-0" />
            <span className="text-slate-300">High (80-100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-sm bg-[#EF4444] shrink-0" />
            <span className="text-slate-300 font-semibold text-red-400">Over-Capacity (≥100%)</span>
          </div>
        </div>
      </div>

      {/* Node Surcharge Statuses */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
          Node Surcharge Status
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] border border-slate-900 shrink-0" />
            <span className="text-slate-300">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] border border-slate-900 shrink-0" />
            <span className="text-slate-300">Watch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] border border-slate-900 shrink-0" />
            <span className="text-slate-300 font-medium text-orange-300">Surcharge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] border border-slate-900 shrink-0" />
            <span className="text-slate-300 font-bold text-red-400">Overflow</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] border border-slate-900 shrink-0" />
            <span className="text-slate-300">Marine Outfall / Bay Outfall</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-2 mt-2 border-t border-slate-800/80 text-[9px] text-slate-400 leading-tight">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Provenance: ASSUMED_PROTOTYPE (Manning gravity flow). Not measured municipal flow.</span>
      </div>
    </div>
  );
};
