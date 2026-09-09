import React from 'react';
import { Clock } from 'lucide-react';
import { NowcastHour, MOCK_NOWCAST_TIMESTEPS } from '../../mock/nowcast';

interface NowcastTimeControlProps {
  selectedHour: NowcastHour;
  onSelectHour: (hour: NowcastHour) => void;
  className?: string;
  dynamicSummary?: {
    max_depth_cm: number;
    risk_level: string;
    affected_zones_count: number;
    rainfall_mm_hr?: number;
    is_live?: boolean;
    provenance?: string;
  };
}

export const NowcastTimeControl: React.FC<NowcastTimeControlProps> = ({
  selectedHour,
  onSelectHour,
  className = '',
  dynamicSummary,
}) => {
  const currentStep = MOCK_NOWCAST_TIMESTEPS[selectedHour];
  const maxDepthCm = dynamicSummary ? dynamicSummary.max_depth_cm : currentStep.summary.max_depth_cm;
  const riskLevel = dynamicSummary ? dynamicSummary.risk_level : currentStep.summary.risk_level;
  const affectedZones = dynamicSummary ? dynamicSummary.affected_zones_count : currentStep.summary.affected_zones_count;
  const isLive = dynamicSummary?.is_live ?? false;
  const steps: NowcastHour[] = [0, 1, 2, 3];

  const getAccessibleLabel = (hour: NowcastHour) => {
    switch (hour) {
      case 0:
        return 'Nowcast T plus 0 hours';
      case 1:
        return 'Nowcast T plus 1 hour';
      case 2:
        return 'Nowcast T plus 2 hours';
      case 3:
        return 'Nowcast T plus 3 hours';
    }
  };

  const getTimeSubLabel = (hour: NowcastHour) => {
    switch (hour) {
      case 0:
        return 'Current';
      case 1:
        return '1 Hour';
      case 2:
        return '2 Hours';
      case 3:
        return '3 Hours';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-red-500/25 text-red-300 border-red-500/50';
      case 'Very High':
        return 'bg-orange-500/25 text-orange-300 border-orange-500/50';
      case 'High':
        return 'bg-amber-500/25 text-amber-300 border-amber-500/50';
      case 'Moderate':
        return 'bg-blue-500/25 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-500/25 text-slate-300 border-slate-500/50';
    }
  };

  return (
    <div
      className={`bg-slate-900/95 backdrop-blur-md text-white rounded-xl border border-slate-700/80 shadow-2xl px-3.5 py-2.5 flex flex-col gap-2 max-w-sm select-none ${className}`}
      role="region"
      aria-label="Nowcast Time Control"
    >
      {/* Header bar: Title and Badges */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-bold tracking-wider uppercase text-slate-100 text-[11px]">
            NOWCAST WINDOW
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
              isLive
                ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50'
                : 'text-amber-300 bg-amber-950/70 border-amber-500/50'
            }`}
          >
            {isLive ? 'LIVE DERIVED' : 'DEMO FORECAST'}
          </span>
          <span className="text-[9px] font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            {dynamicSummary?.provenance ? dynamicSummary.provenance : isLive ? 'MODEL OUTPUT' : 'DEMO DATA'}
          </span>
        </div>
      </div>

      {/* Segmented Time Step Buttons: T+0, T+1, T+2, T+3 */}
      <div
        className="grid grid-cols-4 gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800"
        role="group"
        aria-label="Select Nowcast Forecast Horizon"
      >
        {steps.map((hour) => {
          const step = MOCK_NOWCAST_TIMESTEPS[hour];
          const isSelected = selectedHour === hour;
          return (
            <button
              key={hour}
              type="button"
              onClick={() => onSelectHour(hour)}
              aria-pressed={isSelected}
              aria-label={getAccessibleLabel(hour)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-extrabold shadow-md ring-2 ring-blue-400 border border-blue-300'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium border border-transparent'
              }`}
            >
              <span className="text-xs tracking-wide">{step.label}</span>
              <span
                className={`text-[9px] leading-tight ${
                  isSelected ? 'text-blue-100 font-bold' : 'text-slate-400'
                }`}
              >
                {getTimeSubLabel(hour)}
              </span>
              {/* Visual Active Indicator Dot */}
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 mt-0.5 shadow-xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* Compact Summary: Horizon Details, Max Depth, Risk Level */}
      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-800/90">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-200 font-semibold text-[11px]">
            {currentStep.label} ({getTimeSubLabel(selectedHour)})
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-300 font-bold text-[11px]">
            Max {typeof maxDepthCm === 'number' ? maxDepthCm.toFixed(1) : maxDepthCm} cm
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRiskBadgeColor(
              riskLevel
            )}`}
          >
            {riskLevel} Risk
          </span>
          <span className="text-slate-400 text-[10px]">
            ({affectedZones} Zones)
          </span>
        </div>
      </div>
    </div>
  );
};
