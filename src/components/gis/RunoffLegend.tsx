import React from 'react';
import { Waves } from 'lucide-react';

export const RunoffLegend: React.FC = () => {
  const runoffClasses = [
    { range: '0–5', color: '#A5F3FC', label: 'Minimal' },
    { range: '5–20', color: '#38BDF8', label: 'Moderate' },
    { range: '20–50', color: '#2563EB', label: 'Substantial' },
    { range: '50–100', color: '#4338CA', label: 'High' },
    { range: '100+', color: '#312E81', label: 'Extreme' },
  ];

  return (
    <div
      className="bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-lg border border-slate-700/80 shadow-md text-xs min-w-[175px] max-w-[210px] select-none"
      role="region"
      aria-label="Runoff Generation Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Waves className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-bold tracking-wide uppercase text-slate-200 text-[11px]">
            Runoff Rate
          </span>
        </div>
        <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-700/50 px-1 py-0.2 rounded">
          PHASE 3A
        </span>
      </div>

      <div className="text-[10px] text-slate-400 mb-1.5">
        Unit: m³/s (Prototype 5×5 Grid)
      </div>

      <div className="space-y-1.5">
        {runoffClasses.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-xs shrink-0 border border-slate-600/60"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300">{item.label}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};