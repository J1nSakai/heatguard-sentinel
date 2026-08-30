/**
 * AlertsSidebar.tsx
 *
 * Slide-in sidebar that fetches GET /zones/alerts and renders the server-side
 * alert log (data/logs/alerts.jsonl) in real-time. Auto-refreshes after each
 * new check via the `refreshTrigger` prop.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchAlerts, getErrorMessage } from '../../services/apiClient';
import { CheckResponse } from '../../types/api';
import {
  X,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Info,
  Bell,
  Loader2,
} from 'lucide-react';

interface AlertsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Increment this to trigger an auto-refresh (e.g. after a new check fires) */
  refreshTrigger?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function riskBorderColor(level: string): string {
  switch (level) {
    case 'very_high': return 'border-l-red-500';
    case 'high':      return 'border-l-orange-500';
    case 'moderate':  return 'border-l-amber-500';
    default:          return 'border-l-stone-600';
  }
}

function riskLabelColor(level: string): string {
  switch (level) {
    case 'very_high': return 'text-red-400 bg-red-950/50 border-red-600/40';
    case 'high':      return 'text-orange-400 bg-orange-950/40 border-orange-600/30';
    case 'moderate':  return 'text-amber-400 bg-amber-950/40 border-amber-600/30';
    default:          return 'text-stone-400 bg-stone-800/40 border-stone-600/30';
  }
}

function riskIcon(level: string) {
  switch (level) {
    case 'very_high':
      return <Flame className="h-4 w-4 text-red-400 animate-pulse shrink-0" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />;
    case 'moderate':
      return <Info className="h-4 w-4 text-amber-400 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-stone-400 shrink-0" />;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AlertsSidebar: React.FC<AlertsSidebarProps> = ({
  isOpen,
  onClose,
  refreshTrigger = 0,
}) => {
  const [alerts, setAlerts] = useState<CheckResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlerts(50, abortRef.current.signal);
      setAlerts(data.alerts);
      setLastFetched(Date.now());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when sidebar opens
  useEffect(() => {
    if (isOpen) load();
    return () => { abortRef.current?.abort(); };
  }, [isOpen, load]);

  // Auto-refresh whenever a new check completes
  useEffect(() => {
    if (isOpen && refreshTrigger > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Alert Log Sidebar"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #0d1117 0%, #111827 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          animation: 'slideInFromRight 0.22s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-stone-100">
              Alert Log
            </span>
            {alerts.length > 0 && (
              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="text-[9px] font-mono text-stone-600 hidden sm:block">
                {Math.round((Date.now() - lastFetched) / 1000)}s ago
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              title="Refresh alerts"
              className="p-1.5 rounded text-stone-500 hover:text-stone-100 hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded text-stone-500 hover:text-stone-100 hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub-header */}
        <div
          className="px-5 py-2 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}
        >
          <p className="text-[10px] text-stone-600 font-medium">
            Fired alerts from{' '}
            <span className="font-mono text-stone-500">data/logs/alerts.jsonl</span>
            {' '}· newest first
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-stone-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Loading alerts...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <AlertTriangle className="h-8 w-8 text-rose-500/60" />
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">
                Could not load alerts
              </p>
              <p className="text-[10px] text-stone-500 leading-relaxed">{error}</p>
              <button
                onClick={load}
                className="mt-2 text-[10px] font-bold uppercase tracking-widest border border-stone-700 px-4 py-2 text-stone-300 hover:bg-white/5 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-600/30" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                No alerts fired yet
              </p>
              <p className="text-[10px] text-stone-600 leading-relaxed">
                Alerts appear here when a site check finds risk above the lower threshold.
                Run a simulated check to generate one.
              </p>
            </div>
          ) : (
            <ul style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              {alerts.map((alert, idx) => (
                <li
                  key={`${alert.zone_id}-${alert.timestamp}-${idx}`}
                  className={`p-4 border-l-2 ${riskBorderColor(alert.risk_level)}`}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {/* Zone name + timestamp */}
                  <div className="flex items-start gap-2.5 mb-2.5">
                    {riskIcon(alert.risk_level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-black uppercase tracking-wider text-stone-100 truncate">
                          {alert.zone_name || alert.zone_id}
                        </span>
                        {(alert as any).simulated && (
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-stone-800 text-stone-500 border border-stone-700/50 px-1.5 py-0.5 rounded shrink-0">
                            Simulated
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-stone-600 mt-0.5">
                        {formatTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Risk badge + temp + action */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${riskLabelColor(alert.risk_level)}`}>
                      {alert.risk_label}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {alert.apparent_temperature_c?.toFixed(1)}°C
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ml-auto ${alert.action === 'alert' ? 'text-rose-400' : 'text-stone-600'}`}>
                      {alert.action === 'alert' ? '⚡ Email sent' : '📋 Log only'}
                    </span>
                  </div>

                  {/* Guidance */}
                  {alert.guidance && (
                    <div
                      className="mb-2 pt-2 pb-0"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-600 mb-0.5">Guidance</p>
                      <p className="text-[10px] text-stone-300 leading-relaxed">{alert.guidance}</p>
                    </div>
                  )}

                  {/* LLM explanation */}
                  {alert.explanation && (
                    <p className="text-[10px] text-stone-500 italic leading-relaxed font-serif mt-1">
                      "{alert.explanation}"
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div
            className="px-5 py-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
          >
            <p className="text-[9px] font-mono text-stone-700 text-center">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} · server-persisted log
            </p>
          </div>
        )}
      </aside>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </>
  );
};
