import React from 'react';
import { RISK_COLORS } from '../../types/risk';

export const RISK_COLOR_RAMP = [
  { level: 'CRITICAL', label: 'Critical', color: RISK_COLORS.CRITICAL, desc: '>=100 cm or overflow' },
  { level: 'VERY_HIGH', label: 'Very High', color: RISK_COLORS.VERY_HIGH, desc: '50–100 cm or high surcharge' },
  { level: 'HIGH', label: 'High', color: RISK_COLORS.HIGH, desc: '20–50 cm or pipe overcapacity' },
  { level: 'MODERATE', label: 'Moderate', color: RISK_COLORS.MODERATE, desc: '5–20 cm or shallow surcharge' },
  { level: 'LOW', label: 'Low', color: RISK_COLORS.LOW, desc: '<5 cm normal drainage' },
];

interface RiskLegendProps {
  className?: string;
  badgeText?: string;
}

export const RiskLegend: React.FC<RiskLegendProps> = ({
  className = '',
  badgeText = 'MODEL OUTPUT / DERIVED',
}) => {
  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-lg w-64 space-y-2 shrink-0 ${className}`}
      aria-label="Flood Risk Assessment Legend"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Flood Risk Level
          </h3>
          <p className="text-[10px] text-slate-400">Depth + Drainage Surcharge</p>
        </div>
        <span className="text-[8px] font-extrabold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60 uppercase tracking-tight">
          {badgeText}
        </span>
      </div>

      <div className="space-y-1">
        {RISK_COLOR_RAMP.map((item) => (
          <div key={item.level} className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded border border-slate-700 shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-slate-300">{item.label}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
