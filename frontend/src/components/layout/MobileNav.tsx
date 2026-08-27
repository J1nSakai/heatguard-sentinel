import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Bell, Smartphone, Building2 } from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';

export const MobileNav: React.FC = () => {
  const { kpiSummary } = useSafety();

  const navs = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/map', label: 'Map', icon: MapPin },
    { to: '/workers', label: 'Workers', icon: Users, count: kpiSummary.atRiskWorkers },
    { to: '/sites', label: 'Sites', icon: Building2 },
    { to: '/alerts', label: 'Alerts', icon: Bell, count: kpiSummary.unacknowledgedAlerts },
    { to: '/worker-view', label: 'Field App', icon: Smartphone },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-800 bg-[#090d16]/95 backdrop-blur-lg lg:hidden px-2">
      {navs.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center p-2 transition-colors ${
              isActive ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <div className="relative">
            <item.icon className="h-5 w-5" />
            {item.count !== undefined && item.count > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {item.count}
              </span>
            )}
          </div>
          <span className="mt-1 text-[10px]">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
