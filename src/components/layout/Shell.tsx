import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
