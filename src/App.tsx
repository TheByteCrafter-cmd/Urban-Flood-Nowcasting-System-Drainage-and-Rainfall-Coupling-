import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { DrainageDashboard } from './pages/DrainageDashboard';
import { NowcastDashboard } from './pages/NowcastDashboard';
import { RoutingDashboard } from './pages/RoutingDashboard';

export const App: React.FC = () => {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/nowcast" element={<NowcastDashboard />} />
        <Route path="/drainage" element={<DrainageDashboard />} />
        <Route path="/alerts" element={<Navigate to="/nowcast" replace />} />
        <Route path="/routing" element={<RoutingDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
};

export default App;
