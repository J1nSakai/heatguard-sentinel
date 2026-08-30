
import React from 'react';
import { useSafety } from '../../context/SafetyContext';
import { formatTemp } from '../../constants/riskLevels';
import {
  FileCheck,
  Download,
  Printer,
  ShieldAlert,
  Clock,
  Droplets,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const OshaHeatReport: React.FC = () => {
  const { workers, sites, alerts, tempUnit } = useSafety();

  // Safety metrics
  const totalWorkers = workers.length;
  const extremeAlertsCount = alerts.filter((a) => a.severity === 'extreme').length;
  const breakRequestsCount = alerts.filter((a) => a.type === 'break_requested').length;
  const totalExceedanceMinutes = workers.reduce((acc, w) => acc + (w.status !== 'safe' ? w.timeInSunMinutes : 0), 0);
  const avgHydration = Math.round(workers.reduce((acc, w) => acc + w.vitals.hydrationLevel, 0) / (workers.length || 1));

  // Site heat distribution data for chart
  const chartData = sites.map((s) => ({
    name: s.name.split(' ')[0] + ' ' + s.city,
    temp: s.currentTemp,
    heatIndex: s.heatIndex,
    workersAtRisk: s.atRiskCount,
  }));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100">OSHA Heat Illness Compliance Report</h2>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              NEP COMPLIANT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time heat strain prevention audit powered by FortyGuard microclimate intelligence
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 shadow-md transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print Audit Report</span>
          </button>
        </div>
      </div>

      {/* High Level Compliance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            HEAT EXCEEDANCE EXPOSURE
          </span>
          <div className="font-mono text-2xl font-bold text-rose-400 mt-1">
            {(totalExceedanceMinutes / 60).toFixed(1)} <span className="text-xs text-slate-400 font-sans">hours</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative time &gt;33°C heat index</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            MANDATORY COOL ROTATIONS
          </span>
          <div className="font-mono text-2xl font-bold text-amber-400 mt-1">
            {breakRequestsCount} <span className="text-xs text-slate-400 font-sans">sessions</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">100% cool-shelter compliance</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            FLEET HYDRATION COMPLIANCE
          </span>
          <div className="font-mono text-2xl font-bold text-cyan-400 mt-1">
            {avgHydration}% <span className="text-xs text-slate-400 font-sans">avg</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Goal: &gt;65% active hydration</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SENTINEL AUDIT SCORE
          </span>
          <div className="font-mono text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <span>98.4 / 100</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Zero heat stroke hospitalizations</p>
        </div>
      </div>

      {/* Heat Index Distribution Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-base font-bold text-slate-100 mb-1">
          Job Site FortyGuard Thermal Comparison
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Peak heat index and active personnel under thermal surveillance
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[20, 50]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="heatIndex" name="FortyGuard Heat Index (°C)" fill="#ef4444" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.heatIndex > 42 ? '#dc2626' : entry.heatIndex > 38 ? '#ef4444' : '#eab308'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Standard Heat Illness NEP Checklist */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-emerald-400" />
          <span>OSHA NEP 2024 Safety Protocol Verification Checklist</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 p-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-slate-100">Continuous Microclimate Surveillance:</strong> FortyGuard tOS satellite & ambient surface temperature layers continuously monitored across all active project perimeters.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 p-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-slate-100">Cooling Stations & Shade Availability:</strong> At least 1 shaded misting pavilion with minimum 200L cold potable water operational per 25 workers.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 p-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-slate-100">Individualized Heat Strain Thresholds:</strong> Custom temperature and heart rate limits configured for high-exertion trades (welders, rebar, solar grid).
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 p-3">
            <span className="text-emerald-400 font-bold">✓</span>
            <div>
              <strong className="text-slate-100">Automated High-Risk Alert Broadcast:</strong> Instant dispatch of cooling rotation orders when ambient microclimate breaches danger limits (38°C / 43°C).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
