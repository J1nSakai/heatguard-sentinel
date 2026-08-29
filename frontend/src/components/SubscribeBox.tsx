import { useState } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { createSubscription, ApiError } from '../lib/api';
import type { RiskTier, Subscription } from '../types';
import type { Pin } from './PinnedMap';

const TIERS: { value: RiskTier; label: string }[] = [
  { value: 'moderate', label: 'Extreme Caution and above (32°C+)' },
  { value: 'high', label: 'Danger and above (39°C+)' },
  { value: 'very_high', label: 'Extreme Danger only (46°C+)' },
  { value: 'lower', label: 'Any caution-level heat (27°C+)' },
];

interface Props {
  pin: Pin | null;
  workerType: string;
  onSubscribed: (sub: Subscription) => void;
}

export function SubscribeBox({ pin, workerType, onSubscribed }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [siteName, setSiteName] = useState('');
  const [minTier, setMinTier] = useState<RiskTier>('moderate');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    setError(null);
    try {
      const sub = await createSubscription({
        lat: pin.lat,
        lon: pin.lon,
        email: email.trim(),
        name: siteName.trim() || 'Pinned Site',
        worker_type: workerType,
        min_tier: minTier,
      });
      onSubscribed(sub);
      setDone(true);
      setEmail('');
      setSiteName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the subscription.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
        }}
        disabled={!pin}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition enabled:hover:border-slate-600 disabled:opacity-50"
      >
        <BellRing className="h-4 w-4 text-amber-400" />
        Get email alerts for this spot
        <span className="text-xs font-normal text-slate-500">(optional)</span>
      </button>
    );
  }

  if (done) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4">
        <div className="flex items-start gap-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="text-sm text-emerald-200">
            <p className="font-bold">Alert subscription saved</p>
            <p className="mt-1 text-emerald-200/80">
              You'll be emailed when this location's live risk reaches your chosen
              tier. Manage it from the Alerts tab.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-300 transition hover:bg-emerald-900/40"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <BellRing className="h-4 w-4 text-amber-400" />
          Email me alerts for this spot
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Optional. The monitoring agent checks this coordinate's live conditions
        and emails you when the OSHA risk tier is reached.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Email address
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="site.manager@company.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Site label <span className="font-normal normal-case">(optional)</span>
          </span>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="North lot excavation"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Alert me at
        </span>
        <select
          value={minTier}
          onChange={(e) => setMinTier(e.target.value as RiskTier)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-rose-500 focus:outline-none"
        >
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy || !pin}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition enabled:hover:brightness-110 disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <BellRing className="h-4 w-4" />
            Subscribe to alerts
          </>
        )}
      </button>
    </form>
  );
}
