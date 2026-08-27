import React, { useState } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { StatusBadge } from '../common/StatusBadge';
import { Bell, Check, ShieldCheck, Flame, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AlertFeedProps {
  maxItems?: number;
  showViewAll?: boolean;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ maxItems = 6, showViewAll = true }) => {
  const { alerts, selectedSiteId, acknowledgeAlert, resolveAlert } = useSafety();
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'extreme'>('all');

  const filteredAlerts = alerts
    .filter((a) => selectedSiteId === 'all' || a.siteId === selectedSiteId)
    .filter((a) => {
      if (filter === 'unacknowledged') return !a.acknowledged;
      if (filter === 'extreme') return a.severity === 'extreme';
      return true;
    })
    .slice(0, maxItems);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Live Safety Alert Stream</h3>
            <p className="text-xs text-slate-400">Real-time incident & threshold trigger notifications</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 transition-colors ${
              filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unacknowledged')}
            className={`rounded-lg px-2.5 py-1 transition-colors ${
              filter === 'unacknowledged' ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unacknowledged
          </button>
          <button
            onClick={() => setFilter('extreme')}
            className={`rounded-lg px-2.5 py-1 transition-colors ${
              filter === 'extreme' ? 'bg-red-950/60 text-red-300 border border-red-800/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Extreme
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="mt-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400/60 mb-2" />
            No alerts matching current filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative rounded-xl border p-3.5 transition-all ${
                alert.resolved
                  ? 'border-slate-800/60 bg-slate-950/30 opacity-70'
                  : alert.severity === 'extreme'
                  ? 'border-red-600/50 bg-red-950/20'
                  : alert.severity === 'danger'
                  ? 'border-rose-500/30 bg-rose-950/15'
                  : 'border-slate-800 bg-slate-950/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {alert.severity === 'extreme' ? (
                      <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                    ) : alert.severity === 'danger' ? (
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Bell className="h-4 w-4 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{alert.title}</h4>
                      <StatusBadge status={alert.severity} size="sm" showPulse={false} />
                      {alert.resolved && (
                        <span className="rounded bg-emerald-950/80 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                      <span>⏱ {new Date(alert.timestamp).toLocaleTimeString()}</span>
                      <span>📍 {alert.siteName}</span>
                      {alert.workerName && alert.workerId && (
                        <Link
                          to={`/workers/${alert.workerId}`}
                          className="text-cyan-400 hover:underline font-sans font-semibold"
                        >
                          👤 {alert.workerName}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {!alert.acknowledged && !alert.resolved && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                      title="Acknowledge alert"
                    >
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Ack</span>
                    </button>
                  )}
                  {alert.acknowledged && !alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-600/40 transition-colors"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showViewAll && (
        <div className="mt-4 border-t border-slate-800 pt-3 text-center">
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <span>Open Full Alert Center & History Log</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
