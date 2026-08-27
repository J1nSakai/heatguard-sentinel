import React, { useState, useEffect } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { formatTemp, RISK_LEVELS } from '../../constants/riskLevels';
import {
  Flame,
  Droplets,
  Coffee,
  AlertOctagon,
  Heart,
  Clock,
  Battery,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WorkerMobilePortalProps {
  initialWorkerId?: string;
}

export const WorkerMobilePortal: React.FC<WorkerMobilePortalProps> = ({ initialWorkerId }) => {
  const {
    workers,
    alerts,
    tempUnit,
    updateWorker,
    simulateWorkerSos,
  } = useSafety();

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    initialWorkerId || workers[0]?.id || 'w-101'
  );
  const [hydrationCountdown, setHydrationCountdown] = useState<number>(25 * 60); // 25 min default
  const [waterLoggedMsg, setWaterLoggedMsg] = useState(false);
  const [breakOrderSent, setBreakOrderSent] = useState(false);

  const currentWorker = workers.find((w) => w.id === selectedWorkerId) || workers[0];

  // Hydration countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setHydrationCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentWorker) return null;

  const riskConfig = RISK_LEVELS[currentWorker.status] || RISK_LEVELS.safe;
  const isExtreme = currentWorker.status === 'extreme';
  const isDanger = currentWorker.status === 'danger';

  // Format countdown minutes:seconds
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Actions
  const handleRequestBreak = () => {
    updateWorker(currentWorker.id, {
      breakRequested: true,
      breakRequestTime: new Date().toISOString(),
    });
    setBreakOrderSent(true);
    setTimeout(() => setBreakOrderSent(false), 3000);
  };

  const handleLogHydration = () => {
    const newHydration = Math.min(100, currentWorker.vitals.hydrationLevel + 20);
    updateWorker(currentWorker.id, {
      vitals: {
        ...currentWorker.vitals,
        hydrationLevel: newHydration,
      },
    });
    setHydrationCountdown(30 * 60); // Reset timer to 30 min
    setWaterLoggedMsg(true);
    setTimeout(() => setWaterLoggedMsg(false), 2500);
  };

  const handleImSafe = () => {
    updateWorker(currentWorker.id, {
      breakRequested: false,
      breakRequestTime: undefined,
      currentTemp: Math.max(26, currentWorker.currentTemp - 4.5),
      status: 'safe',
      vitals: {
        ...currentWorker.vitals,
        heartRate: Math.max(72, currentWorker.vitals.heartRate - 25),
        bodyTemp: 37.0,
      },
    });
  };

  const workerAlerts = alerts.filter((a) => a.workerId === currentWorker.id);

  // Hourly curve data
  const chartData = [
    { time: '08:00', temp: 31 },
    { time: '10:00', temp: 34 },
    { time: '12:00', temp: 38 },
    { time: '13:00', temp: 41 },
    { time: 'Now', temp: currentWorker.currentTemp },
  ];

  return (
    <div className="mx-auto max-w-md min-h-screen bg-[#070a10] text-slate-100 p-4 pb-20 select-none">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white font-bold">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold tracking-wider text-white">SENTINEL FIELD</span>
            <p className="text-[10px] text-slate-400">Worker Safety App</p>
          </div>
        </div>

        {/* Worker Switcher */}
        <div className="relative">
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            aria-label="Select Field Worker Profile"
            className="appearance-none rounded-xl border border-slate-700 bg-slate-900 py-1.5 pl-3 pr-7 text-xs font-bold text-slate-200 outline-none cursor-pointer"
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Emergency SOS Banner if triggered */}
      {isExtreme && (
        <div className="mt-4 rounded-2xl border-2 border-red-600 bg-red-950/80 p-4 text-center shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse">
          <Flame className="mx-auto h-8 w-8 text-red-500 mb-1" />
          <h2 className="text-lg font-extrabold text-white">EXTREME HEAT LEVEL DETECTED</h2>
          <p className="text-xs text-red-200 mt-1 font-medium">
            Immediate cessation of heavy manual labor. Proceed to misting cool shelter immediately!
          </p>
        </div>
      )}

      {/* Worker Identity Card */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <img
            src={currentWorker.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
            alt={currentWorker.name}
            className="h-12 w-12 rounded-xl object-cover border-2 border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">{currentWorker.name}</h3>
            <p className="text-xs text-slate-400">{currentWorker.role}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-rose-400" />
              <span>{currentWorker.location.zoneName}</span>
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-500 block">Sensor Node</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Battery className="h-3 w-3" />
              {currentWorker.batteryLevel}%
            </span>
          </div>
        </div>
      </div>

      {/* Primary Thermal Gauge Card */}
      <div
        className={`mt-4 rounded-3xl border-2 p-6 text-center shadow-2xl transition-all ${riskConfig.borderColor} ${riskConfig.bgColor} bg-slate-950`}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          YOUR CURRENT HEAT RISK
        </span>

        <div className="my-3">
          <span
            className={`inline-block text-3xl font-black px-4 py-1.5 rounded-2xl border ${riskConfig.badgeBg} ${riskConfig.glowClass}`}
          >
            {riskConfig.name.toUpperCase()}
          </span>
        </div>

        {/* Big Temperature Indicator */}
        <div className="my-4">
          <div className="font-mono text-5xl font-extrabold text-white tracking-tight">
            {formatTemp(currentWorker.currentTemp, tempUnit)}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Safety Limit Threshold: {formatTemp(currentWorker.customThreshold, tempUnit)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300 leading-relaxed border border-slate-800">
          💡 <span className="font-semibold">{riskConfig.recommendedAction}</span>
        </div>
      </div>

      {/* Big Tactile Action Buttons */}
      <div className="mt-4 space-y-3">
        {/* Request Break Button */}
        <button
          onClick={handleRequestBreak}
          disabled={currentWorker.breakRequested}
          className={`w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 px-6 text-base font-extrabold shadow-xl transition-all ${
            currentWorker.breakRequested
              ? 'bg-amber-950/80 border border-amber-600 text-amber-300'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 active:scale-[0.98]'
          }`}
        >
          <Coffee className="h-6 w-6" />
          <span>
            {currentWorker.breakRequested ? '✓ Break Request Transmitted' : 'REQUEST 15-MIN COOL BREAK'}
          </span>
        </button>

        {/* Log Hydration Drink Button */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleLogHydration}
            className="flex flex-col items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/80 p-3.5 text-cyan-300 shadow-lg active:scale-[0.98] transition-all"
          >
            <Droplets className="h-6 w-6 text-cyan-400 mb-1" />
            <span className="text-xs font-bold">LOG 500ML WATER</span>
            <span className="text-[10px] text-cyan-400/80 font-mono">
              {waterLoggedMsg ? '✓ Logged!' : `Hydration: ${currentWorker.vitals.hydrationLevel}%`}
            </span>
          </button>

          {/* I am Safe / In Shelter */}
          <button
            onClick={handleImSafe}
            className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/80 p-3.5 text-emerald-300 shadow-lg active:scale-[0.98] transition-all"
          >
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1" />
            <span className="text-xs font-bold">I AM SAFE IN SHADE</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">Reset Status</span>
          </button>
        </div>

        {/* Emergency SOS Button */}
        <button
          onClick={() => simulateWorkerSos(currentWorker.id)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-700 hover:bg-red-600 py-3.5 px-4 text-sm font-extrabold text-white shadow-xl shadow-red-700/30 active:scale-[0.98] transition-all"
        >
          <AlertOctagon className="h-5 w-5 animate-pulse" />
          <span>🚨 EMERGENCY MEDICAL SOS</span>
        </button>
      </div>

      {/* Smart Hydration Countdown Timer */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">Next Hydration Intake</span>
          </div>
          <span className="font-mono text-lg font-bold text-cyan-300">
            {formatTimer(hydrationCountdown)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Dynamic timer based on ambient temperature and sweat loss model.
        </p>
      </div>

      {/* Hourly Heat Exposure Curve */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h4 className="text-xs font-bold text-slate-200 mb-3">Today's Temperature Curve</h4>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} domain={[25, 48]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="#ef4444"
                strokeWidth={2}
                fill="#ef4444"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Past Alerts for this Worker */}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 mb-8">
        <h4 className="text-xs font-bold text-slate-200 mb-2">Manager Messages & Alerts</h4>
        {workerAlerts.length === 0 ? (
          <p className="text-[11px] text-slate-500 text-center py-2">No active alerts for you.</p>
        ) : (
          <div className="space-y-2">
            {workerAlerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="font-bold text-slate-200 font-sans">{a.title}</span>
                  <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
