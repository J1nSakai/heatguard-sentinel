import { AlertTriangle, Info } from 'lucide-react';
import type { SiteReport } from '../types';

interface Props {
  report: SiteReport;
}

function fmtTemp(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}°C`;
}

function fmtHours(n: number | null): string {
  return n === null ? 'No data' : `${n.toFixed(1)}h`;
}

function FormatDate({ iso }: { iso: string }) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function ReportCard({ report }: Props) {
  const blocks = report.time_of_day.ranked_blocks;
  const safest = report.time_of_day.safest_block;
  const pct = report.pct_time_in_danger;
  const unmeasured = report.no_coverage || pct === null;

  // Grey/neutral for unmeasured — must never look like a reassuring result.
  const banner = unmeasured
    ? 'from-slate-700 to-slate-600'
    : pct >= 30
      ? 'from-red-600 to-orange-500'
      : pct >= 12
        ? 'from-amber-500 to-orange-500'
        : 'from-emerald-500 to-teal-500';

  return (
    <section className="space-y-4">
      {/* Header banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${banner} p-5 text-white shadow-2xl`}>
        <div className="flex items-center gap-2 text-lg font-black tracking-tight">
          {unmeasured && <AlertTriangle className="h-5 w-5" />}
          {report.risk_label}
        </div>
        <div className="text-sm opacity-90">
          {unmeasured
            ? `No heat measurements are available for this spot, so its risk is unknown — this is not a safe rating.`
            : `${pct.toFixed(1)}% of the window above the ${report.threshold_c}°C danger threshold`}
        </div>
        <div className="mt-2 text-xs opacity-80 font-mono">
          {report.risk_window.start_date} → {report.risk_window.end_date} ·{' '}
          {report.risk_window.window_days} days · generated{' '}
          <FormatDate iso={report.generated_at} />
        </div>
      </div>

      {/* Unmeasured guidance */}
      {unmeasured && (
        <div className="flex gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="text-sm text-amber-200">
            <p className="font-bold">Treat this site as unassessed</p>
            <p className="mt-1 text-amber-200/80">
              Satellite heat coverage is patchy. We searched up to a{' '}
              {report.aoi.box_metres}m area around your pin and still found no
              data. Try pinning a spot a few blocks away — nearby locations
              often do have coverage.
            </p>
          </div>
        </div>
      )}

      {/* Widened-AOI note */}
      {!unmeasured && report.aoi.widened && (
        <div className="flex gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 py-2.5 text-xs text-slate-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
          <span>
            Your exact pin had no heat tiles, so these figures describe a{' '}
            <strong className="text-slate-100">{report.aoi.box_metres}m area</strong>{' '}
            around it rather than the precise point.
          </span>
        </div>
      )}

      {/* Headline metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Metric
          label="Total time above threshold"
          value={fmtHours(report.exceedance.mean_hours)}
          sub={
            report.exceedance.mean_hours === null
              ? 'Not measured at this location'
              : `across the ${report.risk_window.window_days}-day window`
          }
          hint="Exceedance"
          muted={report.exceedance.mean_hours === null}
        />
        <Metric
          label="Longest unbroken stretch"
          value={fmtHours(report.persistence.mean_hours)}
          sub={
            report.persistence.mean_hours === null
              ? 'Not measured at this location'
              : 'continuous hours above threshold'
          }
          hint="Persistence"
          muted={report.persistence.mean_hours === null}
        />
        <Metric
          label="Safest time to work"
          value={safest ? safest.label : 'No data'}
          sub={
            safest
              ? `${fmtTemp(safest.avg_temp_c)} average`
              : 'No hourly readings available for this spot'
          }
          hint="Recommended window"
          highlight={!!safest}
          muted={!safest}
        />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Coolest → hottest blocks
          </div>
          {blocks.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No time-of-day breakdown available for this location.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {blocks.map((b) => (
                <li
                  key={b.block_id}
                  className={`flex items-center justify-between text-xs ${
                    b.block_id === safest?.block_id
                      ? 'text-emerald-300 font-semibold'
                      : 'text-slate-300'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className="font-mono">{fmtTemp(b.avg_temp_c)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Why hot */}
      {report.why_hot && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Why it runs hot</h3>
            <span className="text-[10px] text-slate-500 font-mono">
              land cover · {report.why_hot.image_year}
            </span>
          </div>
          {report.why_hot.explanation && (
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {report.why_hot.explanation}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bar
              label="Impervious surface"
              value={report.why_hot.impervious_pct}
              color="bg-rose-500"
            />
            <Bar
              label="Vegetation"
              value={report.why_hot.vegetation_pct}
              color="bg-emerald-500"
            />
          </div>
          {report.why_hot.unclassified_dominant && (
            <p className="mt-3 text-xs text-slate-500">
              {report.why_hot.other_pct.toFixed(1)}% of the image was
              unclassified, so these shares cover only part of the area.
            </p>
          )}
        </div>
      )}

      {/* Zone identity */}
      <p className="text-[11px] text-slate-500 font-mono">
        zone: {report.zone_id} · worker type: {report.worker_type} · aoi:{' '}
        {report.aoi.box_metres}m
      </p>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  hint,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  sub: string;
  hint: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? 'border-emerald-500/40 bg-emerald-950/30'
          : 'border-slate-800 bg-slate-900/70'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            highlight ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {hint}
        </span>
      </div>
      <div
        className={`mt-2 text-2xl font-black tracking-tight ${
          muted ? 'text-slate-500' : highlight ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(1)}%</span>
      </div>
      <div className="bar-track mt-1.5">
        <div className={`bar-fill ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
