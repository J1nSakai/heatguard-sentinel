import { RiskLevel } from '../types';
import type { BackendRiskLevel } from '../types/api';

export const RISK_LEVELS: Record<
  RiskLevel,
  {
    name: string;
    label: string;
    color: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    badgeBg: string;
    glowClass: string;
    pulseClass: string;
    description: string;
    maxTempC: number;
    recommendedAction: string;
  }
> = {
  safe: {
    name: 'Safe',
    label: '🟢 Safe',
    color: '#22c55e',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
    glowClass: 'shadow-[0_0_12px_rgba(34,197,94,0.35)]',
    pulseClass: 'animate-none',
    description: 'Normal microclimate thermal conditions. Standard work-rest cycle.',
    maxTempC: 32,
    recommendedAction: 'Standard hydration (0.5L/hr), routine supervisor check every 2 hours.',
  },
  caution: {
    name: 'Caution',
    label: '🟡 Caution',
    color: '#eab308',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    badgeBg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
    glowClass: 'shadow-[0_0_12px_rgba(234,179,8,0.35)]',
    pulseClass: 'animate-pulse',
    description: 'Elevated ambient heat index. Fatigue and heat cramps possible.',
    maxTempC: 38,
    recommendedAction: 'Mandatory 10 min break per hour in shade, increased hydration (0.75L/hr).',
  },
  danger: {
    name: 'Danger',
    label: '🔴 Danger',
    color: '#ef4444',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    badgeBg: 'bg-rose-950/70 border-rose-500/40 text-rose-300',
    glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.45)]',
    pulseClass: 'animate-pulse ring-2 ring-rose-500/50',
    description: 'Dangerous heat stress zone. High risk of heat exhaustion.',
    maxTempC: 43,
    recommendedAction: 'Immediate 20 min break in cooled shelter, cold hydration, vital check.',
  },
  extreme: {
    name: 'Extreme',
    label: '🔥 Extreme',
    color: '#dc2626',
    textColor: 'text-red-500',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-600',
    badgeBg: 'bg-red-950 border-red-600 text-red-200',
    glowClass: 'shadow-[0_0_20px_rgba(220,38,38,0.7)]',
    pulseClass: 'animate-ping ring-4 ring-red-600',
    description: 'CRITICAL HEAT THREAT. Imminent heat stroke danger.',
    maxTempC: 99,
    recommendedAction: 'HALT ALL OUTDOOR WORK. Evacuate to air-conditioned area immediately.',
  },
};

export const getRiskLevel = (temperatureC: number, customThreshold: number = 38): RiskLevel => {
  if (temperatureC >= customThreshold + 5 || temperatureC >= 43) {
    return 'extreme';
  }
  if (temperatureC >= customThreshold || temperatureC >= 38) {
    return 'danger';
  }
  if (temperatureC >= customThreshold - 4 || temperatureC >= 33) {
    return 'caution';
  }
  return 'safe';
};

export const formatTemp = (celsius: number, unit: 'C' | 'F' = 'C'): string => {
  if (unit === 'F') {
    const f = (celsius * 9) / 5 + 32;
    return `${f.toFixed(1)}°F`;
  }
  return `${celsius.toFixed(1)}°C`;
};

export const getBackendRiskLevel = (temperatureC: number, thresholdC: number = 38): BackendRiskLevel => {
  if (temperatureC >= thresholdC + 5 || temperatureC >= 43) {
    return 'very_high';
  }
  if (temperatureC >= thresholdC || temperatureC >= 38) {
    return 'high';
  }
  if (temperatureC >= thresholdC - 4 || temperatureC >= 33) {
    return 'moderate';
  }
  return 'lower';
};

// ── Backend Risk Level Mapping ──────────────────────────────────────────────
// Maps the backend's risk_level vocabulary to display configuration.
// Contract: lower → green, moderate → amber, high → orange, very_high → red

export interface BackendRiskConfig {
  name: string;
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  glowClass: string;
  pulseClass: string;
}

export const BACKEND_RISK_LEVELS: Record<BackendRiskLevel, BackendRiskConfig> = {
  lower: {
    name: 'Lower',
    label: '🟢 Lower Risk',
    color: '#22c55e',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
    glowClass: 'shadow-[0_0_12px_rgba(34,197,94,0.35)]',
    pulseClass: 'animate-none',
  },
  moderate: {
    name: 'Moderate',
    label: '🟡 Moderate',
    color: '#eab308',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    badgeBg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
    glowClass: 'shadow-[0_0_12px_rgba(234,179,8,0.35)]',
    pulseClass: 'animate-pulse',
  },
  high: {
    name: 'High',
    label: '🟠 High',
    color: '#f97316',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    badgeBg: 'bg-orange-950/70 border-orange-500/40 text-orange-300',
    glowClass: 'shadow-[0_0_15px_rgba(249,115,22,0.45)]',
    pulseClass: 'animate-pulse ring-2 ring-orange-500/50',
  },
  very_high: {
    name: 'Very High',
    label: '🔴 Very High',
    color: '#ef4444',
    textColor: 'text-red-500',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-600',
    badgeBg: 'bg-red-950 border-red-600 text-red-200',
    glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.7)]',
    pulseClass: 'animate-pulse ring-4 ring-red-600',
  },
};

/**
 * Get the display configuration for a backend risk level.
 * Falls back to 'moderate' if the level is unknown.
 */
export const getBackendRiskConfig = (riskLevel: string): BackendRiskConfig => {
  return BACKEND_RISK_LEVELS[riskLevel as BackendRiskLevel] || BACKEND_RISK_LEVELS.moderate;
};

