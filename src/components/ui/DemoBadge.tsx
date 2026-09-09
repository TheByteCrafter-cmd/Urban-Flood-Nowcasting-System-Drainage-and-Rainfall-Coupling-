import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DemoBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-sm ${
        compact ? 'py-0.5 px-2 text-[11px]' : ''
      }`}
      title="Prototype Demo Mode — No live backend connected"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span>DEMO MODE</span>
    </div>
  );
};
