import React, { useState, useEffect } from 'react';
import { Zone, ReportResponse, CheckResponse } from '../../types/api';
import { fetchReport, getErrorMessage } from '../../services/apiClient';
import { SentinelDecisionCard } from './SentinelDecisionCard';
import { CurrentSentinelActivity } from './CurrentSentinelActivity';
import { MapPin, Search, Zap, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface SiteIntelligencePanelProps {
  selectedZone: Zone;
  clickedLocation: { lat: number; lng: number } | null;
  onRunCheck: (simulate: boolean, temp?: number) => Promise<CheckResponse | null>;
  checkLoading: boolean;
  elapsedSeconds: number;
  report: ReportResponse | null;
  reportLoading: boolean;
  reportError: string | null;
  cachedTime: number | null;
  loadReport: (forceRefresh?: boolean) => void;
}

export const SiteIntelligencePanel: React.FC<SiteIntelligencePanelProps> = ({
  selectedZone,
  clickedLocation,
  onRunCheck,
  checkLoading,
  elapsedSeconds,
  report,
  reportLoading,
  reportError,
  cachedTime,
  loadReport,
}) => {
  const [simulateTemp, setSimulateTemp] = useState<number>(42.0);
  const [latestCheck, setLatestCheck] = useState<CheckResponse | null>(null);
  const [latestCheckIsSimulated, setLatestCheckIsSimulated] = useState<boolean>(false);
  const [sessionEvents, setSessionEvents] = useState<(CheckResponse & { isSimulated?: boolean })[]>([]);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    setLatestCheck(null);
    setLatestCheckIsSimulated(false);
    setCheckError(null);
  }, [selectedZone.id]);

  const handleAction = async (simulate: boolean) => {
    setCheckError(null);
    try {
      const result = await onRunCheck(simulate, simulateTemp);
      if (result) {
        setLatestCheck(result);
        setLatestCheckIsSimulated(simulate);
        setSessionEvents(prev => [{ ...result, isSimulated: simulate }, ...prev]);
      }
    } catch (err) {
      setCheckError("Sentinel analysis could not be completed.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-50 overflow-y-auto custom-scrollbar border-l border-stone-300">

      {/* 1. SITE LOCATION */}
      <div className="p-6 border-b border-stone-300">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Monitored Site Found</h2>
        <div className="text-2xl font-black text-stone-800 tracking-tight leading-none mb-1">
          {selectedZone.name}
        </div>
        <div className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Worker Type: {selectedZone.worker_type.replace('_', ' ')}
        </div>
        {clickedLocation && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-500 w-max">
            <MapPin className="h-3.5 w-3.5 text-stone-400" />
            {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* 2. CURRENT HEAT STATUS & ACTION */}
      <div className="p-6 border-b border-stone-300 bg-stone-100/50">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Current Heat Status</h2>

        {latestCheck ? (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">Apparent Temp</div>
              <div className="text-xl font-mono text-stone-800">{latestCheck.apparent_temperature_c.toFixed(1)}°C</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-stone-400 mb-1">Risk Level</div>
              <div className="text-sm font-bold uppercase tracking-wider text-stone-800">{latestCheck.risk_label}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-stone-500 italic mb-4">
            System awaiting manual check...
          </div>
        )}

        <div className="flex flex-col xl:flex-row gap-3">
          <button
            onClick={() => handleAction(false)}
            disabled={checkLoading}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-stone-800 bg-stone-800 text-stone-50 hover:bg-stone-900 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-xs font-black transition-all uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:ring-offset-stone-50"
          >
            <Search className="h-4 w-4" />
            <span>Analyze Heat Risk</span>
          </button>

          <div className="flex items-stretch border border-stone-300 bg-stone-100 p-1 relative mt-1 xl:mt-0">
            <div className="absolute -top-2.5 left-2 bg-stone-100 px-1 text-[8px] font-black uppercase tracking-widest text-stone-500">
              Demo Simulation
            </div>
            <div className="flex flex-col justify-center px-3 border-r border-stone-200">
              <label className="text-[8px] font-bold uppercase tracking-widest text-stone-400">Temp °C</label>
              <input
                type="number"
                value={simulateTemp}
                onChange={(e) => setSimulateTemp(parseFloat(e.target.value) || 42)}
                min={20}
                max={60}
                step={0.5}
                className="w-10 bg-transparent text-xs font-mono font-bold text-stone-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              onClick={() => handleAction(true)}
              disabled={checkLoading}
              className="flex items-center justify-center bg-stone-300 hover:bg-stone-400 active:bg-stone-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 text-[9px] font-black uppercase tracking-widest text-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              Simulate
            </button>
          </div>
        </div>

        {checkError && (
          <div className="mt-3 text-rose-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-2">
            <AlertCircle className="h-3 w-3" />
            {checkError}
          </div>
        )}
      </div>

      <div className="p-6 flex-1 space-y-6">
        {/* 3. SENTINEL DECISION */}
        {(checkLoading || latestCheck) && (
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Sentinel Decision</h2>
            <SentinelDecisionCard
              checkResult={latestCheck}
              isLoading={checkLoading}
              elapsedSeconds={elapsedSeconds}
              isSimulated={latestCheckIsSimulated}
              zoneName={selectedZone.name}
            />
          </div>
        )}

        {/* 4. HISTORICAL SITE INTELLIGENCE */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Historical Site Intelligence
            </h2>

            {cachedTime && !reportLoading && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                <span className="text-stone-800">● CACHED</span>
                <span>· Updated {Math.round((Date.now() - cachedTime) / 60000)}m ago</span>
                <button onClick={() => loadReport(true)} className="ml-2 bg-stone-200 hover:bg-stone-300 text-stone-600 px-2 py-0.5 rounded-sm transition-colors">
                  Refresh
                </button>
              </div>
            )}
          </div>

          {reportLoading && !report ? (
            <div className="flex flex-col items-center justify-center py-10 border border-stone-200 bg-stone-100/50">
              <div className="h-6 w-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1">Analyzing Site History</p>
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">Building the 3-day thermal profile...</p>
            </div>
          ) : reportError ? (
            <div className="flex flex-col items-center justify-center py-6 border border-rose-200 bg-rose-50">
              <AlertCircle className="h-5 w-5 text-rose-500 mb-2" />
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest px-4 text-center">
                Historical site intelligence is temporarily unavailable.
              </p>
            </div>
          ) : report ? (
            <div className="border border-stone-300 p-4 bg-white">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-800 mb-4 pb-2 border-b border-stone-200">
                3-Day Site Pattern
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Risk Profile</div>
                  <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-0.5">Exceedance: <span className="font-mono text-stone-800">{report.exceedance.mean_hours}</span> hrs</div>
                  <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Persistence: <span className="font-mono text-stone-800">{report.persistence.mean_hours}</span> hrs</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Overall Danger</div>
                  <div className="text-xl font-mono font-black text-rose-600 leading-none">{report.pct_time_in_danger}%</div>
                </div>
              </div>

              {report.time_of_day?.safest_block && (
                <div className="mb-4 border-t border-stone-200 pt-4">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">Recommended Operation Window</div>
                  <div className="text-sm font-black text-emerald-600 tracking-wider">
                    {report.time_of_day.safest_block.label} (Safest Block)
                  </div>
                </div>
              )}

              {report.why_hot && (typeof report.why_hot === 'string' || report.why_hot.explanation) && (
                <div className="border-t border-stone-200 pt-4">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">Site Pattern</div>
                  <p className="text-[11px] text-stone-700 leading-relaxed font-serif italic">
                    "{typeof report.why_hot === 'string' ? report.why_hot : report.why_hot.explanation}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-stone-300 p-4 text-[10px] uppercase tracking-widest text-stone-400 text-center">
              Placeholder: Historical Pattern
            </div>
          )}
        </div>

        {/* 5. FIELD BRIEF */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Field Brief</h2>
          {latestCheck?.explanation ? (
            <div className="border border-stone-300 p-3 bg-stone-100/50">
              <p className="text-[11px] text-stone-700 leading-relaxed font-serif italic">
                "{latestCheck.explanation}"
              </p>
            </div>
          ) : (
            <div className="border border-stone-300 p-3 bg-stone-100/50">
              <p className="text-[11px] text-stone-500 leading-relaxed font-serif italic">
                Sentinel determined that current conditions do not require an active intervention. Standard monitoring protocols apply.
              </p>
            </div>
          )}
        </div>

        {/* 6. CURRENT SENTINEL ACTIVITY */}
        <CurrentSentinelActivity events={sessionEvents} />

      </div>
    </div>
  );
};
