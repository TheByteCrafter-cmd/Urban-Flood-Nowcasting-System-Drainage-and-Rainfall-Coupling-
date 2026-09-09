import React from 'react';

export const FLOOD_COLOR_RAMP = [
  { range: '0–5 cm', label: 'Low', color: '#DBEAFE' },
  { range: '5–20 cm', label: 'Moderate', color: '#93C5FD' },
  { range: '20–50 cm', label: 'High', color: '#F59E0B' },
  { range: '50–100 cm', label: 'Very High', color: '#EA580C' },
  { range: '100+ cm', label: 'Critical', color: '#B91C1C' },
];

interface FloodLegendProps {
  className?: string;
}

export const FloodLegend: React.FC<FloodLegendProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-lg w-56 space-y-2 shrink-0 ${className}`}
      aria-label="Flood Inundation Depth Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Flood Depth
          </h3>
          <p className="text-[10px] text-slate-400">Unit: cm (Inundation Output)</p>
        </div>
        <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
          DEMO
        </span>
      </div>

      <div className="space-y-1">
        {FLOOD_COLOR_RAMP.map((item) => (
          <div key={item.range} className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded border border-slate-700 shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-slate-300">{item.label}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
