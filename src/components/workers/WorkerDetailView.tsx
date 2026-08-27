import React, { useMemo } from 'react';
import { Worker, SafetyAlert } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatTemp } from '../../constants/riskLevels';
import { useSafety } from '../../context/SafetyContext';
import {
  Heart,
  Droplets,
  Thermometer,
  Flame,
  Clock,
  Battery,
  Shield,
  Phone,
  MapPin,
  Coffee,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Link } from 'react-router-dom';

interface WorkerDetailViewProps {
  worker: Worker;
  onEdit: () => void;
}

export const WorkerDetailView: React.FC<WorkerDetailViewProps> = ({ worker, onEdit }) => {
  const { alerts, tempUnit, sendWorkerBreakAlert, sendWorkerHydrationReminder, simulateWorkerSos } = useSafety();

  // Worker specific alerts
  const workerAlerts = alerts.filter((a) => a.workerId === worker.id);

  // Generate 24-hour historical exposure telemetry for chart
  const telemetryHistory = useMemo(() => {
    const data = [];
    const baseHour = 7; // shift starts 7 AM
    const currentHour = 14; // current 2 PM

    for (let h = baseHour; h <= currentHour; h++) {
      const timeStr = `${h.toString().padStart(2, '0')}:00`;
      // Progressive daytime heating curve
      const heatFactor = Math.sin(((h - 7) / 10) * Math.PI);
      const temp = parseFloat((30 + heatFactor * (worker.currentTemp - 30) + (Math.random() - 0.5) * 1.2).toFixed(1));
      const hr = Math.round(75 + heatFactor * 55 + (Math.random() - 0.5) * 8);

      data.push({
        time: timeStr,
        temperature: temp,
        heartRate: hr,
        threshold: worker.customThreshold,
      });
    }
    return data;
  }, [worker.currentTemp, worker.customThreshold]);

  return (
    <div className="space-y-6">
      {/* Top Header / Back Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/workers"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Worker Registry</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => sendWorkerBreakAlert(worker.id)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-all"
          >
            <Coffee className="h-4 w-4" />
            <span>Order Cooling Break</span>
          </button>
          <button
            onClick={() => sendWorkerHydrationReminder(worker.id)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition-colors"
          >
            <Droplets className="h-4 w-4 text-cyan-400" />
            <span>Hydration Prompt</span>
          </button>
          <button
            onClick={() => simulateWorkerSos(worker.id)}
            className="flex items-center gap-1.5 rounded-xl border border-red-700 bg-red-950/60 hover:bg-red-900/80 px-3.5 py-2 text-xs font-bold text-red-300 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Simulate SOS</span>
          </button>
          <button
            onClick={onEdit}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors"
          >
            Edit Settings
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={worker.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={worker.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-slate-700 shadow-xl"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{worker.name}</h2>
                <StatusBadge status={worker.status} size="lg" />
                {worker.breakRequested && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-300 animate-pulse">
                    ☕ Break Requested ({worker.breakRequestTime ? new Date(worker.breakRequestTime).toLocaleTimeString() : 'Pending'})
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1 font-medium">{worker.role}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  {worker.siteName} &bull; {worker.location.zoneName}
                </span>
                {worker.phone && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-cyan-400" />
                    {worker.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Big Telemetry Badge */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-mono">
            <div className="text-right">
              <span className="text-[10px] uppercase font-sans text-slate-400 block font-bold">
                Ambient Microclimate
              </span>
              <span className="text-3xl font-bold text-rose-400">
                {formatTemp(worker.currentTemp, tempUnit)}
              </span>
              <span className="block text-[10px] text-slate-400">
                Limit: {formatTemp(worker.customThreshold, tempUnit)}
              </span>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-sans text-slate-400 block font-bold">
                Feels Like Index
              </span>
              <span className="text-3xl font-bold text-amber-400">
                {formatTemp(worker.feelsLikeTemp, tempUnit)}
              </span>
              <span className="block text-[10px] text-emerald-400 font-sans">
                {worker.status === 'safe' ? 'Normal Limits' : 'Elevated Heat'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Biometric & Thermal Gauges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>HEART RATE</span>
            <Heart className="h-4 w-4 text-rose-400 animate-pulse" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {worker.vitals.heartRate} <span className="text-xs font-sans text-slate-400 font-normal">bpm</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (worker.vitals.heartRate / 180) * 100)}%` }}
              className={`h-full ${
                worker.vitals.heartRate > 135
                  ? 'bg-rose-500'
                  : worker.vitals.heartRate > 110
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
          </div>
        </div>

        {/* Estimated Core Body Temp */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>CORE BODY TEMP</span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {formatTemp(worker.vitals.bodyTemp, tempUnit)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {worker.vitals.bodyTemp > 38.5 ? '⚠️ Hyperthermia warning' : 'Normal physiological core'}
          </div>
        </div>

        {/* Hydration Level */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>HYDRATION EST.</span>
            <Droplets className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-cyan-300">
            {worker.vitals.hydrationLevel}%
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${worker.vitals.hydrationLevel}%` }}
              className="h-full bg-cyan-500"
            />
          </div>
        </div>

        {/* Sun Exposure Duration */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>SUN EXPOSURE</span>
            <Clock className="h-4 w-4 text-orange-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100">
            {worker.timeInSunMinutes} <span className="text-xs font-sans text-slate-400 font-normal">min</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Battery: {worker.batteryLevel}% (Sentinel Node)
          </div>
        </div>
      </div>

      {/* 24-Hour Exposure Timeline Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Shift Heat Exposure & Thermal Index Curve</span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-400 border border-rose-500/30">
                Live FortyGuard Telemetry
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly microclimate ambient vs. worker safety threshold limit
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[25, 50]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={worker.customThreshold}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Limit ${worker.customThreshold}°C`,
                  fill: '#f59e0b',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                name="Microclimate Temp (°C)"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#tempGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident & Alert Log for this Worker */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
        <h3 className="text-base font-bold text-slate-100 mb-3">
          Worker Safety Log & Incident History
        </h3>
        {workerAlerts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No incident alerts logged for {worker.name} today.
          </p>
        ) : (
          <div className="space-y-2.5">
            {workerAlerts.map((alt) => (
              <div
                key={alt.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{alt.title}</div>
                  <p className="text-slate-400 mt-0.5">{alt.message}</p>
                </div>
                <div className="text-right font-mono shrink-0">
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(alt.timestamp).toLocaleTimeString()}
                  </span>
                  <StatusBadge status={alt.severity} size="sm" showPulse={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
