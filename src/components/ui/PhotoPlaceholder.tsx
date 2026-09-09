import React from 'react';
import { Image } from 'lucide-react';

interface PhotoPlaceholderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export const PhotoPlaceholder: React.FC<PhotoPlaceholderProps> = ({
  title,
  subtitle,
  className = 'h-48'
}) => {
  return (
    <div
      className={`w-full border-2 border-dashed border-slate-300 rounded-lg bg-slate-100/70 flex flex-col items-center justify-center p-4 text-center ${className}`}
    >
      <div className="p-3 bg-slate-200/80 rounded-full mb-2">
        <Image className="w-6 h-6 text-slate-500" />
      </div>
      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
        [PHOTO PLACEHOLDER]
      </p>
      <p className="text-sm font-medium text-slate-800 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
};
