import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Map,
  Clock,
  GitCommit,
  Navigation,
  X,
  ShieldCheck,
  Activity,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const primaryNavItems = [
  { path: '/dashboard', label: 'GIS Dashboard', icon: Map },
  { path: '/nowcast', label: '0–3h Nowcast & Alerts', icon: Clock },
  { path: '/drainage', label: 'Drainage Network', icon: GitCommit },
  { path: '/routing', label: 'Flood-Safe Routing', icon: Navigation },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const handleOpenSystemStatus = () => {
    onCloseMobile();
    window.dispatchEvent(new CustomEvent('open-system-status'));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-60 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header Close */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800 lg:hidden">
          <span className="font-bold text-white text-sm">GeoNexus Navigation</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Navigation list */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            System Modules
          </div>
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Lower section */}
          <div className="pt-6">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System & Resources
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleOpenSystemStatus}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
              >
                <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>System Status</span>
              </button>

              <NavLink
                to="/"
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-900/60 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span>About / Documentation</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-xs">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-0.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SIH 2026 — SIH26085</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-300">GeoNexus Team</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Verified Prototype Pipeline</p>
        </div>
      </aside>
    </>
  );
};
