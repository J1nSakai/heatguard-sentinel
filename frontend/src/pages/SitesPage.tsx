import React from 'react';
import { SiteList } from '../components/sites/SiteList';

export const SitesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <SiteList />
    </div>
  );
};
