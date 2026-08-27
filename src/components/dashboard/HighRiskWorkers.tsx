import React from 'react';
import { useSafety } from '../../context/SafetyContext';
import { StatusBadge } from '../common/StatusBadge';
import { formatTemp } from '../../constants/riskLevels';
import { Flame, AlertTriangle, Coffee, Droplets, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HighRiskWorkers: React.FC = () => {
  const { workers, selectedSiteId, tempUnit, sendWorkerBreakAlert, sendWorkerHydrationReminder } = useSafety();

  const atRiskWorkers = workers
    .filter((w) => selectedSiteId === 'all' || w.siteId === selectedSiteId)
    .filter((w) => w.status === 'danger' || w.status === 'extreme')
    .sort((a, b) => (b.status === 'extreme' ? 1 : 0) - (a.status === 'extreme' ? 1 : 0) || b.currentTemp - a.currentTemp);

  return (
    <div className="rounded-2xl border border-rose-900/40 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-rose-500/20 p-2 text-rose-400">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              High Risk & Extreme Zone Workers
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                {atRiskWorkers.length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">Immediate cooling rotation or hydration response required</p>
          </div>
        </div>

        <Link
          to="/workers"
          className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {atRiskWorkers.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-200">No Workers Currently in Danger or Extreme Risk</p>
          <p className="text-xs text-slate-400 mt-1">All monitored field personnel are within safe operating thermal limits.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {atRiskWorkers.map((worker) => {
            const isExtreme = worker.status === 'extreme';
            return (
              <div
                key={worker.id}
                className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
                  isExtreme
                    ? 'border-red-600/70 bg-red-950/20 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                    : 'border-rose-500/30 bg-slate-950/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={worker.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={worker.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <Link
                        to={`/workers/${worker.id}`}
                        className="text-sm font-bold text-slate-100 hover:text-rose-400 transition-colors"
                      >
                        {worker.name}
                      </Link>
                      <p className="text-xs text-slate-400">{worker.role}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        📍 {worker.location.zoneName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-rose-400">
                      {formatTemp(worker.currentTemp, tempUnit)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Limit: {formatTemp(worker.customThreshold, tempUnit)}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={worker.status} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Vitals & Heat Telemetry Bar */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-900/80 p-2 text-center text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Heart Rate</span>
                    <span className="font-bold text-slate-200">{worker.vitals.heartRate} bpm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Hydration</span>
                    <span
                      className={`font-bold ${
                        worker.vitals.hydrationLevel < 40
                          ? 'text-red-400'
                          : worker.vitals.hydrationLevel < 60
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {worker.vitals.hydrationLevel}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Sun Exposure</span>
                    <span className="font-bold text-slate-200">{worker.timeInSunMinutes} min</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => sendWorkerBreakAlert(worker.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 py-1.5 px-3 text-xs font-bold text-white shadow-md transition-colors"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    <span>Send Break Order</span>
                  </button>
                  <button
                    onClick={() => sendWorkerHydrationReminder(worker.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 py-1.5 px-3 text-xs font-semibold text-slate-200 transition-colors"
                    title="Send hydration reminder"
                  >
                    <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Water</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
