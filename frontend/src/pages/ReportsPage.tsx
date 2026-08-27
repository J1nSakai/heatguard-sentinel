import React from 'react';
import { OshaHeatReport } from '../components/reports/OshaHeatReport';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <OshaHeatReport />
    </div>
  );
};
