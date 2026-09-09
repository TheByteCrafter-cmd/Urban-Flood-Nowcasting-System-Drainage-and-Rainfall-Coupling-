import React from 'react';
import { MapContainer } from '../components/gis/MapContainer';

export const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[550px] space-y-3">
      {/* Primary GIS Map Container - Priority layout occupying maximum content height */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          cityName="Mumbai Metropolitan Region"
          center={[72.8777, 19.0760]}
          zoom={11.5}
          className="h-full w-full"
        />
      </div>
    </div>
  );
};
