import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudRain, Layers, GitCommit, AlertOctagon, ShieldCheck, ArrowRight } from 'lucide-react';
import { PhotoPlaceholder } from '../components/ui/PhotoPlaceholder';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    { name: 'Rainfall Nowcast', icon: CloudRain, desc: 'Doppler Radar 0–3h rainfall depth' },
    { name: 'Overland Runoff', icon: Layers, desc: '2D surface flow & elevation (DEM)' },
    { name: 'Drainage Hydraulics', icon: GitCommit, desc: '1D pipe capacity & surcharge state' },
    { name: 'Flood Inundation', icon: AlertOctagon, desc: 'Street-level water depth (cm)' },
    { name: 'Decision Support', icon: ShieldCheck, desc: 'Alerts & flood-aware safe routing' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-xs space-y-6">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-xs font-semibold">
            <span>SIH 2026 Problem Statement SIH26085</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            Urban Flood Nowcasting System
          </h1>
          <p className="text-sm lg:text-base text-slate-600 leading-relaxed">
            Knowing rainfall volume alone is not enough to predict street inundation. GeoNexus couples high-resolution rainfall nowcasting with Digital Elevation Models (DEM), 2D overland flow, and 1D underground drainage network hydraulics for street-level flood prediction.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            <span>Launch GIS Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* System Workflow Schematic */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-slate-900">System Coupling Workflow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.name}
                className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">0{idx + 1}</span>
                  <Icon className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">{step.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Placeholder Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Contextual Field Overview</h2>
        <PhotoPlaceholder
          title="Monsoon Urban Flooding & Drainage Infrastructure"
          subtitle="High-resolution street-level inundation monitoring across urban Metro wards"
          className="h-56"
        />
      </div>
    </div>
  );
};
