import React from 'react';
import { CheckResponse } from '../../types/api';
import { formatTemp, getBackendRiskConfig } from '../../constants/riskLevels';
import { ShieldAlert, ShieldCheck, Thermometer, Info } from 'lucide-react';

interface SentinelDecisionCardProps {
  checkResult: CheckResponse | null;
  isLoading: boolean;
  elapsedSeconds: number;
  isSimulated?: boolean;
  zoneName?: string;
}

export const SentinelDecisionCard: React.FC<SentinelDecisionCardProps> = ({
  checkResult,
  isLoading,
  elapsedSeconds,
  isSimulated = false,
  zoneName = '',
}) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border-2 border-stone-200 bg-white p-5 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-stone-100/50 animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center justify-center py-6">
          <div className="h-10 w-10 rounded-full border-4 border-stone-200 border-t-indigo-600 animate-spin mb-4"></div>
          <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-1">Sentinel Analysis In Progress</h3>
          <p className="text-xs text-stone-500 font-medium text-center px-4">
            {elapsedSeconds < 2 ? `Analyzing current heat conditions for ${zoneName || 'zone'}...` :
             elapsedSeconds < 4 ? 'Checking current thermal exposure...' :
             elapsedSeconds < 6 ? 'Comparing against worker-risk thresholds...' :
             elapsedSeconds < 8 ? 'Evaluating site pattern...' :
             'Preparing safety decision...'}
          </p>
          <div className="mt-4 font-mono text-xs text-stone-400">{elapsedSeconds}s elapsed</div>
        </div>
      </div>
    );
  }

  if (!checkResult) return null;

  const isAlert = checkResult.action === 'alert';
  const riskConfig = getBackendRiskConfig(checkResult.risk_level);
  
  const actionStory = isAlert 
    ? 'Sentinel detected sustained heat risk and triggered an intervention.'
    : 'Sentinel is monitoring this condition.';
  
  // Use a custom light-theme friendly color map instead of the dark mode colors from getBackendRiskConfig if needed
  let headerBg = 'bg-stone-100 border-stone-200';
  let headerText = 'text-stone-800';
  if (checkResult.risk_level === 'very_high') { headerBg = 'bg-rose-100 border-rose-200'; headerText = 'text-rose-800'; }
  else if (checkResult.risk_level === 'high') { headerBg = 'bg-orange-100 border-orange-200'; headerText = 'text-orange-800'; }
  else if (checkResult.risk_level === 'moderate') { headerBg = 'bg-amber-100 border-amber-200'; headerText = 'text-amber-800'; }
  else if (checkResult.risk_level === 'lower') { headerBg = 'bg-emerald-100 border-emerald-200'; headerText = 'text-emerald-800'; }

  return (
    <div className={`rounded-xl border-2 shadow-md overflow-hidden bg-white ${isAlert ? 'border-rose-400' : 'border-stone-200'}`}>
      
      {/* Top Banner */}
      <div className={`px-5 py-3 border-b flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2">
          {isAlert ? <ShieldAlert className={`h-5 w-5 ${headerText}`} /> : <ShieldCheck className={`h-5 w-5 ${headerText}`} />}
          <span className={`text-xs font-black uppercase tracking-widest ${headerText}`}>Sentinel Decision</span>
        </div>
        <div className="text-[10px] font-mono text-stone-500">
          {new Date(checkResult.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="p-4">
        {/* Core Metrics */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 border-l-4 border-stone-300 pl-3">
            <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">Current Risk</div>
            <div className={`text-2xl font-black uppercase ${headerText}`}>
              {checkResult.risk_label}
            </div>
          </div>
          
          <div className="flex-1 border-l-4 border-stone-300 pl-3">
            <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">Sentinel Action</div>
            <div className={`text-lg font-black uppercase ${isAlert ? 'text-rose-600' : 'text-emerald-600'} leading-none mb-1`}>
              {isAlert ? 'ALERT / INTERVENTION REQUIRED' : 'MONITORING / LOGGED'}
            </div>
            <div className="text-[10px] font-medium text-stone-500">{actionStory}</div>
          </div>
        </div>

        {/* DECISION CONTEXT (Historical) */}
        {checkResult.historical_context ? (
          <div className="mb-4 bg-stone-50 border border-stone-200 p-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">Decision Context</h4>
            <div className="text-[11px] font-bold text-stone-700 uppercase tracking-widest mb-3">
              Current condition <span className="mx-1 text-stone-400">+</span> Historical site pattern
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-stone-400">Typical Exceedance</div>
                <div className="font-mono text-stone-700">{checkResult.historical_context.exceedance.mean_hours}h</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-stone-400">Typical Persistence</div>
                <div className="font-mono text-stone-700">{checkResult.historical_context.persistence.mean_hours}h</div>
              </div>
            </div>
          </div>
        ) : isSimulated ? (
          <div className="mb-4 bg-stone-50 border border-stone-200 p-3 flex items-center justify-between">
             <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-stone-200 px-2 py-0.5">SIMULATED</div>
             <div className="text-[10px] text-stone-400 font-medium">Historical context unavailable for simulated analysis.</div>
          </div>
        ) : null}

        {/* Guidance Box */}
        <div className="mb-4">
          <div className="flex gap-3">
            <Info className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">Operational Guidance</div>
              <p className="text-sm font-medium text-stone-800 leading-snug">
                {checkResult.guidance}
              </p>
            </div>
          </div>
        </div>

        {/* LLM Field Brief */}
        <div className="mt-4 border-t border-stone-200 pt-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Field Brief</div>
          {checkResult.explanation ? (
            <div className="text-xs text-stone-700 italic leading-relaxed border-l-2 border-stone-300 pl-3">
              "{checkResult.explanation}"
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic leading-relaxed border-l-2 border-stone-300 pl-3">
              "Sentinel determined that current conditions do not require an active intervention. Standard monitoring protocols apply."
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
