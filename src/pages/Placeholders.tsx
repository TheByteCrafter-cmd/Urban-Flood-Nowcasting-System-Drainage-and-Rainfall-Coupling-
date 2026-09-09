import React from 'react';
import { Map, Clock, GitCommit, AlertTriangle, Navigation } from 'lucide-react';
import { DemoBadge } from '../components/ui/DemoBadge';

interface PlaceholderProps {
  title: string;
  subtitle: string;
  targetPhase: string;
  icon: React.ElementType;
}

const GenericPlaceholder: React.FC<PlaceholderProps> = ({
  title,
  subtitle,
  targetPhase,
  icon: Icon
}) => {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Mumbai Metropolitan Region Demo Scope</p>
          </div>
        </div>
        <DemoBadge />
      </div>

      {/* Placeholder Body */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 lg:p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[320px]">
        <div className="p-4 bg-slate-100 rounded-full mb-4 border border-slate-200">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 mb-2">
          {targetPhase}
        </div>
        <h2 className="text-lg font-semibold text-slate-800">{title} Module</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export const DashboardPlaceholder: React.FC = () => (
  <GenericPlaceholder
    title="GIS Dashboard"
    subtitle="Interactive flood monitoring map will be implemented in Phase 2."
    targetPhase="Planned for Phase 2"
    icon={Map}
  />
);

export const NowcastPlaceholder: React.FC = () => (
  <GenericPlaceholder
    title="0–3 Hour Nowcast"
    subtitle="Rainfall and flood progression visualization will be implemented in Phase 3."
    targetPhase="Planned for Phase 3"
    icon={Clock}
  />
);

export const DrainagePlaceholder: React.FC = () => (
  <GenericPlaceholder
    title="Drainage Network"
    subtitle="Drainage graph and hydraulic analysis will be implemented in Phase 4."
    targetPhase="Planned for Phase 4"
    icon={GitCommit}
  />
);

export const AlertsPlaceholder: React.FC = () => (
  <GenericPlaceholder
    title="Alerts & Risk"
    subtitle="Flood risk and alert management will be implemented in Phase 5."
    targetPhase="Planned for Phase 5"
    icon={AlertTriangle}
  />
);

export const RoutingPlaceholder: React.FC = () => (
  <GenericPlaceholder
    title="Safe Routing"
    subtitle="Flood-aware route planning will be implemented in Phase 6."
    targetPhase="Planned for Phase 6"
    icon={Navigation}
  />
);
