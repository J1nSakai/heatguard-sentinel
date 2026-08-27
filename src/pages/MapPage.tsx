import React from 'react';
import { HeatMapView } from '../components/map/HeatMapView';
import { HighRiskWorkers } from '../components/dashboard/HighRiskWorkers';
import { AlertFeed } from '../components/dashboard/AlertFeed';

export const MapPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>FortyGuard Tactical Heatmap Command</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          High-resolution microclimate polygon tiles, worker GPS markers, and cooling shelter overlay
        </p>
      </div>

      <HeatMapView heightClass="h-[620px]" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HighRiskWorkers />
        <AlertFeed maxItems={5} />
      </div>
    </div>
  );
};
