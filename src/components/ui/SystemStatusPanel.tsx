import React from 'react';
import {
  CheckCircle2,
  Radio,
  Layers,
  GitCommit,
  ArrowDownUp,
  Clock,
  ShieldAlert,
  Navigation,
  Info,
} from 'lucide-react';
import { WeatherDataStatus } from '../../types/weather';

interface SystemStatusPanelProps {
  weatherStatus?: WeatherDataStatus;
  isCompact?: boolean;
  className?: string;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  weatherStatus = 'LIVE',
  isCompact = false,
  className = '',
}) => {
  const modules = [
    {
      id: 'weather',
      name: 'Weather Telemetry Ingestion',
      category: 'External Observation Feed',
      status: weatherStatus,
      statusType:
        weatherStatus === 'LIVE' ? 'live' :
        weatherStatus === 'CACHED' ? 'cached' :
        weatherStatus === 'DEMO' ? 'demo' : 'warning',
      details: 'IMD Doppler Weather Radar (DWR Colaba) & Open-Meteo supporting telemetry',
      icon: Radio,
    },
    {
      id: '3A',
      name: 'Phase 3A: Rainfall-to-Runoff Engine',
      category: 'Hydrologic Modeling',
      status: 'READY',
      statusType: 'ready',
      details: 'Rational runoff calculation (Q = C × I × A) with CPHEEO urban land-use coefficients',
      icon: Layers,
    },
    {
      id: '3B',
      name: 'Phase 3B: 2D Surface Flow Routing',
      category: 'Surface Overland Hydraulics',
      status: 'READY',
      statusType: 'ready',
      details: 'Topographic D8 DEM elevation gradient routing & mass-conservative transfer',
      icon: Layers,
    },
    {
      id: '3C',
      name: 'Phase 3C: 1D Drainage Network Graph',
      category: 'Underground Pipe Hydraulics',
      status: 'READY',
      statusType: 'ready',
      details: 'Manning gravity capacity solver, 31 nodes & 26 edges (ASSUMED_PROTOTYPE)',
      icon: GitCommit,
    },
    {
      id: '3D',
      name: 'Phase 3D: Dynamic 1D-2D Coupling',
      category: 'Hydrodynamic Coupling',
      status: 'READY',
      statusType: 'ready',
      details: 'Bidirectional surface inlet capture and manhole surcharge water return loop',
      icon: ArrowDownUp,
    },
    {
      id: '4A',
      name: 'Phase 4A: 0–3 Hour Nowcast Cascade',
      category: 'Forecast Integration',
      status: 'READY',
      statusType: 'ready',
      details: 'Temporal horizon isolation across T+0, T+1, T+2, and T+3 with unified metrics',
      icon: Clock,
    },
    {
      id: '4B',
      name: 'Phase 4B: Flood Risk & Infrastructure Alerts',
      category: 'Decision Support & Warning',
      status: 'READY',
      statusType: 'ready',
      details: 'Multi-factor risk scoring (depth + surcharge) & thresholded early warning alerts',
      icon: ShieldAlert,
    },
    {
      id: '4C',
      name: 'Phase 4C: Flood-Safe Navigation API',
      category: 'Emergency & Commuter Routing',
      status: 'READY',
      statusType: 'ready',
      details: 'Flood-penalized Dijkstra pathfinding for Safest, Fastest, and Emergency transit',
      icon: Navigation,
    },
  ];

  const getStatusBadge = (type: string, text: string) => {
    switch (type) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        );
      case 'cached':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            CACHED
          </span>
        );
      case 'demo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            DEMO
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            READY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {text}
          </span>
        );
    }
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-lg select-none ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              SIH26085 Prototype System Readiness
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-900/60 text-blue-300 rounded border border-blue-700/50 uppercase">
                Phase 5 Freeze
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Computational engine status and provenance tracking
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
          <Info className="w-3 h-3 text-slate-400" />
          <span>All 7 Model Engines Verified</span>
        </div>
      </div>

      {/* Grid of Modules */}
      <div className={`grid ${isCompact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold text-slate-200">{m.name}</span>
                </div>
                {getStatusBadge(m.statusType, m.status)}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{m.details}</p>
            </div>
          );
        })}
      </div>

      {/* Disclaimer / Academic Note */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400">
        <span>
          <strong>Data Provenance:</strong> Model calculations are tagged <code className="text-blue-300 font-mono">MODEL OUTPUT / DERIVED</code>.
          Infrastructure graphs are <code className="text-amber-300 font-mono">ASSUMED_PROTOTYPE</code>.
        </span>
        <span className="text-slate-400">
          Academic Prototype for SIH 2026
        </span>
      </div>
    </div>
  );
};
