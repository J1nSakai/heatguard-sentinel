import React from 'react';
import { useSafety } from '../../context/SafetyContext';
import { formatTemp } from '../../constants/riskLevels';
import { Building2, Thermometer, Droplets, Sun, MapPin, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SiteSummaryCards: React.FC = () => {
  const { sites, selectedSiteId, setSelectedSiteId, tempUnit } = useSafety();

  const displayedSites = selectedSiteId === 'all' ? sites : sites.filter((s) => s.id === selectedSiteId);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Job Site Thermal Microclimates</h3>
            <p className="text-xs text-slate-400">FortyGuard multi-parcel thermal risk & zone distributions</p>
          </div>
        </div>

        <Link
          to="/sites"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <span>Manage Sites</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayedSites.map((site) => {
          const totalWorkers = site.workerCount || 1;
          const extremePct = ((site.extremeCount || 0) / totalWorkers) * 100;
          const dangerPct = ((site.atRiskCount - (site.extremeCount || 0)) / totalWorkers) * 100;
          const cautionPct = ((site.cautionCount || 0) / totalWorkers) * 100;
          const safePct = ((site.safeCount || 0) / totalWorkers) * 100;

          return (
            <div
              key={site.id}
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 truncate max-w-[200px]">{site.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    {site.city}, {site.state}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-base font-bold text-rose-400">
                    {formatTemp(site.currentTemp, tempUnit)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Peak: {formatTemp(site.peakTempToday, tempUnit)}
                  </span>
                </div>
              </div>

              {/* Environmental Parameters */}
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-900/80 p-2 text-center text-xs font-mono">
                <div className="flex items-center justify-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-bold text-slate-200">{formatTemp(site.heatIndex, tempUnit)}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="font-bold text-slate-200">{site.humidity}%</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Sun className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-bold text-slate-200">{site.solarRadiation}W</span>
                </div>
              </div>

              {/* Worker Risk Distribution Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Worker Safety Status</span>
                  <span className="font-bold font-mono text-slate-200">{site.workerCount} Active</span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div style={{ width: `${extremePct}%` }} className="bg-red-600" title="Extreme" />
                  <div style={{ width: `${dangerPct}%` }} className="bg-rose-500" title="Danger" />
                  <div style={{ width: `${cautionPct}%` }} className="bg-amber-400" title="Caution" />
                  <div style={{ width: `${safePct}%` }} className="bg-emerald-500" title="Safe" />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span className="text-red-400">{site.extremeCount} Ext</span>
                  <span className="text-rose-400">{site.atRiskCount - (site.extremeCount || 0)} Dgr</span>
                  <span className="text-amber-400">{site.cautionCount} Ctn</span>
                  <span className="text-emerald-400">{site.safeCount} Safe</span>
                </div>
              </div>

              {/* Cooling & Quick Filter */}
              <div className="mt-3.5 pt-3 border-t border-slate-850 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  ⛺ {site.coolZoneStations?.length || 0} Cooling Stations Active
                </span>
                <button
                  onClick={() => setSelectedSiteId(selectedSiteId === site.id ? 'all' : site.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedSiteId === site.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {selectedSiteId === site.id ? 'Viewing' : 'Filter View'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
