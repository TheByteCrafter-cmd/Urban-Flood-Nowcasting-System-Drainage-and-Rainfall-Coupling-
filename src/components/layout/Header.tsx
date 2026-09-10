import React, { useState } from 'react';
import { Menu, MapPin, Activity, X } from 'lucide-react';
import { DemoBadge } from '../ui/DemoBadge';
import { SystemStatusPanel } from '../ui/SystemStatusPanel';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);

  return (
    <>
      <header className="h-16 bg-slate-900 text-white border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        {/* Left: Brand Identity & Mobile Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg tracking-tight text-white">GeoNexus</span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 border-l border-slate-700 pl-2">
              Urban Flood Nowcasting System
            </span>
          </div>
        </div>

        {/* Center: City Selector Indicator */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60 text-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-slate-400">Study Basin:</span>
          <span className="font-semibold text-slate-200">Mumbai Metropolitan Region (DEM 5×5)</span>
        </div>

        {/* Right: Demo Badge & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStatusModal(true)}
            className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            title="Click to view SIH26085 Engine Readiness & Architecture"
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">SYSTEM READY</span>
          </button>
          <DemoBadge />
        </div>
      </header>

      {/* System Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setShowStatusModal(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full border border-slate-700 shadow-md transition-colors"
              aria-label="Close Status Panel"
            >
              <X className="w-4 h-4" />
            </button>
            <SystemStatusPanel />
          </div>
        </div>
      )}
    </>
  );
};
