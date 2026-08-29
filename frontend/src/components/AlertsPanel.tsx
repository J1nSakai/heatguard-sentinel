import { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  Loader2,
  RotateCcw,
  Trash2,
  Siren,
  Inbox,
  FlaskConical,
} from 'lucide-react';
import {
  ApiError,
  checkSubscription,
  deleteSubscription,
  fetchAlerts,
  fetchSubscriptions,
} from '../lib/api';
import type { AlertEntry, RiskTier, Subscription } from '../types';

const TIER_LABEL: Record<string, string> = {
  lower: 'Caution',
  moderate: 'Extreme Caution',
  high: 'Danger',
  very_high: 'Extreme Danger',
  unknown: 'Unknown',
};

function tierTone(tier: RiskTier | 'unknown'): string {
  switch (tier) {
    case 'very_high':
      return 'border-red-500/50 bg-red-950/40 text-red-300';
    case 'high':
      return 'border-orange-500/50 bg-orange-950/40 text-orange-300';
    case 'moderate':
      return 'border-amber-500/50 bg-amber-950/40 text-amber-300';
    case 'lower':
      return 'border-sky-500/40 bg-sky-950/30 text-sky-300';
    default:
      return 'border-slate-700 bg-slate-900 text-slate-300';
  }
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // No setState before the first await, so this is safe to call straight from
  // an effect: React isn't updated synchronously during the render pass.
  const fetchData = useCallback(async () => {
    try {
      const [alertRes, subRes] = await Promise.all([fetchAlerts(50), fetchSubscriptions()]);
      setAlerts(alertRes.alerts);
      setSubs(subRes);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount. The lint rule fires on any effect that can reach a
    // setState, but nothing here runs synchronously during render — every
    // state update happens after the awaited fetch resolves.
    // oxlint-disable-next-line set-state-in-effect
    void fetchData();
  }, [fetchData]);

  function refresh() {
    setLoading(true);
    void fetchData();
  }

  async function onDelete(id: string) {
    setBusyId(id);
    try {
      await deleteSubscription(id);
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove the subscription.');
    } finally {
      setBusyId(null);
    }
  }

  async function onTest(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await checkSubscription(id, true); // simulate=true: no live API call
      await fetchData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not run the check.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-400" />
        <p className="mt-3 text-sm text-slate-300">Loading alerts…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Subscriptions */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <BellRing className="h-4 w-4 text-amber-400" />
            Alert subscriptions
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
              {subs.length}
            </span>
          </h2>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {subs.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">
            No subscriptions yet. Pin a location on the Report tab and use{' '}
            <span className="text-slate-200">"Get email alerts for this spot"</span> to
            add one.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-slate-100">
                      {s.name}
                    </span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tierTone(s.min_tier)}`}
                    >
                      {TIER_LABEL[s.min_tier] ?? s.min_tier}+
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{s.email}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    {s.lat.toFixed(4)}, {s.lon.toFixed(4)} ·{' '}
                    {s.last_alert_at
                      ? `last alert ${when(s.last_alert_at)}`
                      : s.last_checked_at
                        ? `checked ${when(s.last_checked_at)}, no alert yet`
                        : 'not checked yet'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void onTest(s.id)}
                    disabled={busyId === s.id}
                    title="Run a simulated check now (no live API call)"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition enabled:hover:bg-slate-800 disabled:opacity-50"
                  >
                    {busyId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FlaskConical className="h-3.5 w-3.5 text-sky-400" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => void onDelete(s.id)}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800/60 bg-rose-950/40 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition enabled:hover:bg-rose-900/50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fired alerts */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <Siren className="h-4 w-4 text-rose-400" />
          Alert history
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            {alerts.length}
          </span>
        </h2>

        {alerts.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-300">No alerts yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Alerts appear here once the monitoring agent finds conditions at or
              above a subscription's tier.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {alerts.map((a, i) => (
              <li
                key={`${a.timestamp}-${i}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierTone(a.risk_level)}`}
                  >
                    {a.risk_label}
                  </span>
                  <span className="text-sm font-bold text-slate-100">{a.zone_name}</span>
                  <span className="font-mono text-xs text-slate-400">
                    {a.apparent_temperature_c}°C
                  </span>
                  {a.simulated && (
                    <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      simulated
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[11px] text-slate-500">
                    {when(a.timestamp)}
                  </span>
                </div>
                {a.explanation && (
                  <p className="mt-2 text-sm text-slate-300">{a.explanation}</p>
                )}
                {a.guidance && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Guidance:</span>{' '}
                    {a.guidance}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
