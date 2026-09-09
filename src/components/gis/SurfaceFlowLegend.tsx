import React from 'react';
import { Compass } from 'lucide-react';

export const SurfaceFlowLegend: React.FC = () => {
  const depthClasses = [
    { range: '0–5 cm', color: '#DBEAFE', label: 'Low' },
    { range: '5–20 cm', color: '#93C5FD', label: 'Moderate' },
    { range: '20–50 cm', color: '#3B82F6', label: 'High' },
    { range: '50–100 cm', color: '#1D4ED8', label: 'Very High' },
    { range: '100+ cm', color: '#172554', label: 'Critical' },
  ];

  return (
    <div
      className="bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-lg border border-slate-700/80 shadow-md text-xs min-w-[175px] max-w-[210px] select-none"
      role="region"
      aria-label="2D Surface Flow Depth Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-bold tracking-wide uppercase text-slate-200 text-[11px]">
            Surface Depth
          </span>
        </div>
        <span className="text-[9px] font-bold text-blue-400 bg-blue-950/70 border border-blue-700/50 px-1 py-0.2 rounded">
          PHASE 3B
        </span>
      </div>

      <div className="text-[10px] text-slate-400 mb-1.5">
        Unit: cm (Calculated 2D Flow)
      </div>

      <div className="space-y-1.5">
        {depthClasses.map((item, index) => (
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
