import React from 'react';
import { RiskLevel } from '../../types';
import { RISK_LEVELS } from '../../constants/riskLevels';

interface StatusBadgeProps {
  status: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
  showIcon = true,
  className = '',
}) => {
  const config = RISK_LEVELS[status] || RISK_LEVELS.safe;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold tracking-wide',
    lg: 'px-3.5 py-1.5 text-sm font-bold tracking-wider',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${config.badgeBg} ${sizeClasses[size]} ${className}`}
    >
      {showPulse && (
        <span className="relative flex items-center justify-center">
          {(status === 'danger' || status === 'extreme') && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'extreme' ? 'bg-red-500 animate-ping' : 'bg-rose-500 animate-pulse'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full ${dotSizes[size]}`}
            style={{ backgroundColor: config.color }}
          />
        </span>
      )}
      <span>{config.name.toUpperCase()}</span>
    </span>
  );
};
