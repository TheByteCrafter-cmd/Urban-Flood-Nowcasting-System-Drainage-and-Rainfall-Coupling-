import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { DrainageDashboard } from './pages/DrainageDashboard';
import { NowcastDashboard } from './pages/NowcastDashboard';
import { RoutingDashboard } from './pages/RoutingDashboard';
import {
  AlertsPlaceholder
} from './pages/Placeholders';

export const App: React.FC = () => {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/nowcast" element={<NowcastDashboard />} />
        <Route path="/drainage" element={<DrainageDashboard />} />
        <Route path="/alerts" element={<AlertsPlaceholder />} />
        <Route path="/routing" element={<RoutingDashboard />} />
      </Routes>
    </Shell>
  );
};

export default App;
