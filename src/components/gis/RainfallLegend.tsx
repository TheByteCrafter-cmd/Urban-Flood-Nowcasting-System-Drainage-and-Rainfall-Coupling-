import React from 'react';

export const RAINFALL_COLOR_RAMP = [
  { range: '0–5', label: 'Very Low', color: '#DBEAFE', textClass: 'text-slate-800' },
  { range: '5–20', label: 'Low', color: '#93C5FD', textClass: 'text-slate-800' },
  { range: '20–50', label: 'Moderate', color: '#60A5FA', textClass: 'text-white' },
  { range: '50–100', label: 'High', color: '#F59E0B', textClass: 'text-white' },
  { range: '100+', label: 'Extreme', color: '#DC2626', textClass: 'text-white' },
];

interface RainfallLegendProps {
  className?: string;
}

export const RainfallLegend: React.FC<RainfallLegendProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-lg w-56 space-y-2 ${className}`}
      aria-label="Rainfall Intensity Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Rainfall Intensity
          </h3>
          <p className="text-[10px] text-slate-400">Unit: mm/hr (Doppler Radar)</p>
        </div>
        <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
          DEMO
        </span>
      </div>

      <div className="space-y-1">
        {RAINFALL_COLOR_RAMP.map((item) => (
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
