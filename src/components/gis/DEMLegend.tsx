import React from 'react';

export const DEM_COLOR_RAMP = [
  { range: '0–10 m', label: 'Low / Coastal', color: '#2E8B57' },
  { range: '10–25 m', label: 'Moderate', color: '#6B8E23' },
  { range: '25–50 m', label: 'Elevated', color: '#B8860B' },
  { range: '50–75 m', label: 'High', color: '#8B5A2B' },
  { range: '75+ m', label: 'Very High', color: '#6B3F1D' },
];

interface DEMLegendProps {
  className?: string;
}

export const DEMLegend: React.FC<DEMLegendProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-lg w-56 space-y-2 ${className}`}
      aria-label="DEM Elevation Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            DEM / Elevation
          </h3>
          <p className="text-[10px] text-slate-400">Unit: m (Terrain Context)</p>
        </div>
        <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
          DEMO
        </span>
      </div>

      <div className="space-y-1">
        {DEM_COLOR_RAMP.map((item) => (
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
