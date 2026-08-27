import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'caution' | 'safe' | 'info';
  onClick?: () => void;
}

export const KpiWidget: React.FC<KpiWidgetProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: {
      bg: 'bg-slate-900/80 hover:border-slate-600',
      border: 'border-slate-800/80',
      iconBg: 'bg-slate-800 text-slate-300',
      valueColor: 'text-slate-100',
      glow: '',
    },
    danger: {
      bg: 'bg-red-950/30 hover:border-rose-500/50',
      border: 'border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400',
      valueColor: 'text-rose-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    },
    caution: {
      bg: 'bg-amber-950/30 hover:border-amber-500/50',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400',
      valueColor: 'text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
    safe: {
      bg: 'bg-emerald-950/30 hover:border-emerald-500/50',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      valueColor: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
    info: {
      bg: 'bg-cyan-950/30 hover:border-cyan-500/50',
      border: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      valueColor: 'text-cyan-300',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border p-4 transition-all duration-200 backdrop-blur-md ${style.bg} ${style.border} ${style.glow} ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className={`mt-1.5 font-mono text-2xl font-bold tracking-tight ${style.valueColor}`}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${style.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
