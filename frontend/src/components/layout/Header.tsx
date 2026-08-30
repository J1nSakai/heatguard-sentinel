import React, { useState, useEffect } from 'react';
import { useSafety } from '../../context/SafetyContext';
import {
  Building,
  Clock,
  Radio,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const {
    sites,
    selectedSiteId,
    setSelectedSiteId,
    tempUnit,
    setTempUnit,
    kpiSummary,
  } = useSafety();

  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#090d16]/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Site Selector & Live Time */}
      <div className="flex items-center gap-4">
        {/* Site Selector Dropdown */}
        <div className="relative flex items-center">
          <Building className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            aria-label="Filter by Job Site"
            className="appearance-none rounded-xl border border-slate-700 bg-slate-900/90 py-1.5 pl-9 pr-8 text-xs font-semibold text-slate-200 hover:border-slate-600 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="all">🌍 All Active Sites ({sites.length})</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.city}, {site.state})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Live Heat Time Clock */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-mono text-slate-300">
          <Clock className="h-3.5 w-3.5 text-rose-400" />
          <span>{time}</span>
          <span className="text-[10px] text-slate-400 font-sans">PST / LIVE</span>
        </div>

        {/* Critical Alert Warning Chip */}
        {kpiSummary.extremeWorkers > 0 && (
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-red-950/80 border border-red-600 px-2.5 py-1 text-xs font-bold text-red-300 animate-pulse">
            <Radio className="h-3 w-3 text-red-500" />
            <span>{kpiSummary.extremeWorkers} In Extreme Heat</span>
          </div>
        )}
      </div>

      {/* Right: Simulation Controls, Units & Profile */}
      <div className="flex items-center gap-2.5">


        {/* Temperature Unit Switcher */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-0.5 text-xs font-bold font-mono">
          <button
            onClick={() => setTempUnit('C')}
            className={`rounded-lg px-2 py-1 transition-colors ${
              tempUnit === 'C' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            °C
          </button>
          <button
            onClick={() => setTempUnit('F')}
            className={`rounded-lg px-2 py-1 transition-colors ${
              tempUnit === 'F' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            °F
          </button>
        </div>

        {/* Worker Portal Quick Link */}
        <Link
          to="/worker-view"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden xl:flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition-colors"
        >
          <span>Open Field Portal</span>
          <ExternalLink className="h-3 w-3" />
        </Link>

        {/* Manager User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-rose-600 font-bold text-xs text-white shadow-md">
            TJ
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-200">Teja</div>
            <div className="text-[10px] text-slate-400">Safety Lead</div>
          </div>
        </div>
      </div>
    </header>
  );
};
