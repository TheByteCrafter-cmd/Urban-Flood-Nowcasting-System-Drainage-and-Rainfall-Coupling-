import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Home } from './pages/Home';
import {
  DashboardPlaceholder,
  NowcastPlaceholder,
  DrainagePlaceholder,
  AlertsPlaceholder,
  RoutingPlaceholder
} from './pages/Placeholders';

export const App: React.FC = () => {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        <Route path="/nowcast" element={<NowcastPlaceholder />} />
        <Route path="/drainage" element={<DrainagePlaceholder />} />
        <Route path="/alerts" element={<AlertsPlaceholder />} />
        <Route path="/routing" element={<RoutingPlaceholder />} />
      </Routes>
    </Shell>
  );
};

export default App;
