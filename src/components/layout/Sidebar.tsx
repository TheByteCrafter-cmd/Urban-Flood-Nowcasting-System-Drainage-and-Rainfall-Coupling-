import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Map,
  Clock,
  GitCommit,
  AlertTriangle,
  Navigation,
  X
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'GIS Dashboard', icon: Map },
  { path: '/nowcast', label: '0–3h Nowcast', icon: Clock },
  { path: '/drainage', label: 'Drainage Network', icon: GitCommit },
  { path: '/alerts', label: 'Alerts & Risk', icon: AlertTriangle },
  { path: '/routing', label: 'Safe Routing', icon: Navigation },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
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
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header Close */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 lg:hidden">
          <span className="font-semibold text-white">GeoNexus Navigation</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            System Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-700 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500">
          <p className="font-semibold text-slate-400">SIH 2026 — SIH26085</p>
          <p className="mt-0.5">Phase 1 Architecture Foundation</p>
        </div>
      </aside>
    </>
  );
};
