import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  Bell,
  FileSpreadsheet,
  Smartphone,
  Flame,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';

export const Sidebar: React.FC = () => {
  const { kpiSummary, isLiveConnected, connectionMode } = useSafety();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { to: '/map', label: 'Command Map', icon: MapPin, badge: null },
    {
      to: '/workers',
      label: 'Worker Registry',
      icon: Users,
      badge: kpiSummary.atRiskWorkers > 0 ? `${kpiSummary.atRiskWorkers} at risk` : null,
      badgeVariant: 'danger',
    },
    { to: '/sites', label: 'Job Sites', icon: Building2, badge: `${kpiSummary.activeSites}` },
    {
      to: '/alerts',
      label: 'Alert Stream',
      icon: Bell,
      badge: kpiSummary.unacknowledgedAlerts > 0 ? `${kpiSummary.unacknowledgedAlerts}` : null,
      badgeVariant: 'extreme',
    },
    { to: '/reports', label: 'OSHA & Analytics', icon: FileSpreadsheet, badge: null },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800 bg-[#090d16] text-slate-300 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 p-0.5 shadow-lg shadow-rose-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
            <Flame className="h-5 w-5 text-rose-500 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-mono text-sm font-bold tracking-wider text-white">SENTINEL</h1>
            <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-400 border border-rose-500/30">
              PRO
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-400">FortyGuard Heat Command</p>
        </div>
      </div>

      {/* Connection & Sentinel Mode Indicator */}
      <div className="mx-4 my-3 rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-xs font-medium text-slate-300">
              {connectionMode === 'live_socket' ? 'Live WebSocket' : 'Sentinel Engine'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">20Hz</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-2">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Command Center
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold shadow-inner border border-slate-700/60'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.badgeVariant === 'extreme'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : item.badgeVariant === 'danger'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Field Applications
        </div>

        <NavLink
          to="/worker-view"
          className={({ isActive }) =>
            `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 border ${
              isActive
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                : 'border-cyan-500/20 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-950/40'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Smartphone className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>Field Worker App</span>
          </div>
          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
            MOBILE
          </span>
        </NavLink>
      </nav>

      {/* Safety System Footer Badge */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">FortyGuard Sentinel</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Automated OSHA 1910.141 heat strain prevention active.
          </p>
        </div>
      </div>
    </aside>
  );
};
