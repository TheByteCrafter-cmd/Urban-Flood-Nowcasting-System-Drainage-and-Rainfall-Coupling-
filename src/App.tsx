import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { DrainageDashboard } from './pages/DrainageDashboard';
import {
  NowcastPlaceholder,
  AlertsPlaceholder,
  RoutingPlaceholder
} from './pages/Placeholders';

export const App: React.FC = () => {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/nowcast" element={<NowcastPlaceholder />} />
        <Route path="/drainage" element={<DrainageDashboard />} />
        <Route path="/alerts" element={<AlertsPlaceholder />} />
        <Route path="/routing" element={<RoutingPlaceholder />} />
      </Routes>
    </Shell>
  );
};

export default App;
