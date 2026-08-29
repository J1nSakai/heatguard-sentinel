import { useState } from 'react';
import { MapPin, Flame, Loader2, RotateCcw, BellRing } from 'lucide-react';
import { PinnedMap, type Pin } from './components/PinnedMap';
import { SearchBar } from './components/SearchBar';
import { ReportCard } from './components/ReportCard';
import { SubscribeBox } from './components/SubscribeBox';
import { AlertsPanel } from './components/AlertsPanel';
import { fetchSiteReport, ApiError } from './lib/api';
import type { SiteReport } from './types';

const WORKER_TYPES = [
  { value: 'unspecified', label: 'General / unspecified' },
  { value: 'construction', label: 'Construction' },
  { value: 'warehouse_logistics', label: 'Warehouse / logistics' },
  { value: 'agriculture_landscaping', label: 'Agriculture / landscaping' },
];

type Status = 'idle' | 'loading' | 'success' | 'error';
type Tab = 'report' | 'alerts';

const defaultPin: Pin = { lat: 33.4484, lon: -112.074 };

export default function App() {
  const [tab, setTab] = useState<Tab>('report');
  const [pin, setPin] = useState<Pin | null>(defaultPin);
  const [workerType, setWorkerType] = useState<string>('unspecified');
  const [status, setStatus] = useState<Status>('idle');
  const [report, setReport] = useState<SiteReport | null>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [outOfUS, setOutOfUS] = useState(false);
  // Bumped whenever a subscription is added, so switching to the Alerts tab
  // remounts the panel and shows the new entry without a manual refresh.
  const [alertsKey, setAlertsKey] = useState(0);

  async function runReport() {
    if (!pin) return;
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchSiteReport({
        lat: pin.lat,
        lon: pin.lon,
        name: 'Pinned Site',
        worker_type: workerType,
        window_days: 7,
        profile_days: 3,
      });
      setReport(data);
      setStatus('success');
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, retryable: e.retryable });
      } else {
        setError({ message: 'Unexpected error while generating the report.', retryable: true });
      }
      setStatus('error');
      setReport(null);
    }
  }

  function resetForNewPin(p: Pin) {
    setPin(p);
    setOutOfUS(false);
    setReport(null);
    setError(null);
    setSearchError(null);
    setStatus('idle');
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100">
      <div className="mx-auto max-w-[1100px] px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600">
                <Flame className="h-5 w-5 text-white" />
              </span>
              <h1 className="text-xl font-black tracking-tight text-white">
                HeatGuard Sentinel
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Pin a worksite, get a 7-day heat-safety report — generated live from land
              cover and microclimate data.
            </p>
          </div>
          {tab === 'report' && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[10px] font-mono text-slate-400">
              <MapPin className="h-3 w-3" />
              {pin ? `${pin.lat.toFixed(4)}, ${pin.lon.toFixed(4)}` : 'no pin yet'}
            </span>
          )}
        </header>

        {/* Tabs */}
        <nav className="mt-6 flex gap-1 border-b border-slate-800" role="tablist">
          <TabButton
            active={tab === 'report'}
            onClick={() => setTab('report')}
            icon={<Flame className="h-4 w-4" />}
            label="Site report"
          />
          <TabButton
            active={tab === 'alerts'}
            onClick={() => setTab('alerts')}
            icon={<BellRing className="h-4 w-4" />}
            label="Alerts"
          />
        </nav>

        {tab === 'alerts' ? (
          <div className="mt-6 pb-10">
            <AlertsPanel key={alertsKey} />
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mt-6">
              <SearchBar
                onSelect={(r) => resetForNewPin({ lat: r.lat, lon: r.lon })}
                onError={(message) => setSearchError(message)}
              />
              {searchError && <p className="mt-1.5 text-xs text-amber-400">{searchError}</p>}
            </div>

            {/* Map */}
            <div className="mt-4 h-[340px] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
              <PinnedMap
                pin={pin}
                onSelect={resetForNewPin}
                onOutOfUS={() => setOutOfUS(true)}
              />
            </div>
            {outOfUS && (
              <p className="mt-1.5 text-xs text-amber-400">
                That location is outside the United States. This tool only supports
                pinning US work sites.
              </p>
            )}

            {/* Pin hint + controls */}
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-xs text-slate-400">
                {pin
                  ? 'Marker placed — adjust by clicking anywhere else on the map.'
                  : 'Click or tap anywhere on the map to drop a pin.'}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Worker type
                  </span>
                  <select
                    value={workerType}
                    onChange={(e) => setWorkerType(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 py-2 pl-3 pr-8 text-sm text-slate-200 focus:border-rose-500 focus:outline-none"
                  >
                    {WORKER_TYPES.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={runReport}
                  disabled={!pin || status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition enabled:hover:brightness-110 disabled:opacity-50"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Flame className="h-4 w-4" />
                      Generate heat report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional alert subscription for the pinned spot */}
            <div className="mt-4">
              <SubscribeBox
                pin={pin}
                workerType={workerType}
                onSubscribed={() => setAlertsKey((k) => k + 1)}
              />
            </div>

            {/* Body: report | loading | error */}
            <div className="mt-8 pb-10">
              {status === 'loading' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-rose-400" />
                  <p className="mt-4 text-sm font-bold text-slate-200">
                    Building your heat-safety report…
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    First analysis for a fresh location can take a couple of minutes. It
                    is cached, so repeat lookups are near-instant — please don't close
                    the tab.
                  </p>
                </div>
              )}

              {status === 'error' && error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6">
                  <p className="text-sm font-bold text-red-300">
                    Unable to generate the report
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{error.message}</p>
                  {error.retryable && (
                    <button
                      onClick={runReport}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-900/50 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-900"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retry
                    </button>
                  )}
                </div>
              )}

              {status === 'success' && report && <ReportCard report={report} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition ${
        active
          ? 'border-rose-500 text-white'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
