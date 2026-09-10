import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudRain,
  Layers,
  GitCommit,
  AlertOctagon,
  ShieldCheck,
  ArrowRight,
  Map,
  Clock,
  Navigation,
} from 'lucide-react';
import { SystemStatusPanel } from '../components/ui/SystemStatusPanel';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    { name: 'Rainfall Ingestion', icon: CloudRain, desc: 'IMD Doppler Radar 0–3h rainfall depth' },
    { name: 'Overland Runoff', icon: Layers, desc: '2D surface flow & topographic gradient (DEM)' },
    { name: 'Drainage Hydraulics', icon: GitCommit, desc: '1D Manning pipe capacity & surcharge state' },
    { name: 'Coupled Flood Depth', icon: AlertOctagon, desc: 'Dynamic surface ↔ pipe water exchange (cm)' },
    { name: 'Decision & Routing', icon: ShieldCheck, desc: 'Early warning alerts & flood-aware safe routing' },
  ];

  const moduleShortcuts = [
    {
      title: 'GIS Dashboard',
      desc: 'Interactive 7-layer flood monitoring with DEM elevation, surface flow vectors, and drainage graphs.',
      path: '/dashboard',
      icon: Map,
      badge: 'All Layers',
    },
    {
      title: '0–3h Nowcast & Alerts',
      desc: 'Dynamic multi-horizon simulation (T+0 to T+3), depth/risk visualization, and infrastructure alerts.',
      path: '/nowcast',
      icon: Clock,
      badge: 'Core Model',
    },
    {
      title: 'Drainage Hydraulics',
      desc: 'Underground pipe capacity, utilization analysis, and node surcharge status across Mumbai corridors.',
      path: '/drainage',
      icon: GitCommit,
      badge: '1D Network',
    },
    {
      title: 'Flood-Safe Routing',
      desc: 'Dijkstra pathfinding with dynamic flood penalties for Safest, Fastest, and Emergency rescue transit.',
      path: '/routing',
      icon: Navigation,
      badge: 'Navigation API',
    },
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
            Rainfall volume alone does not determine street waterlogging. GeoNexus couples real-time rainfall nowcasting with Digital Elevation Models (DEM), 2D overland routing, and 1D underground drainage network hydraulics for street-level flood depth prediction and flood-aware navigation.
          </p>
        </div>

        {/* CTA Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {moduleShortcuts.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.path}
                onClick={() => navigate(m.path)}
                className="text-left bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-lg p-4 transition-all group flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                      {m.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{m.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 group-hover:translate-x-1 transition-transform">
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Workflow Schematic */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-slate-900">End-to-End Simulation Pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.name}
                className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">STAGE 0{idx + 1}</span>
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

      {/* System Status & Software Readiness Panel */}
      <SystemStatusPanel weatherStatus="LIVE" />
    </div>
  );
};
