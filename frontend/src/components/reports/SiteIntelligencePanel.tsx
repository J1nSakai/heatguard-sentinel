import { AlertCircle, Loader2, MapPin, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CheckResponse, ReportResponse, Zone } from '../../types/api';
import { CurrentSentinelActivity } from './CurrentSentinelActivity';
import { SentinelDecisionCard } from './SentinelDecisionCard';

interface SiteIntelligencePanelProps {
  selectedZone: Zone;
  clickedLocation: { lat: number; lng: number } | null;
  onRunCheck: (simulate: boolean, temp?: number, recipientEmail?: string, alertThreshold?: number) => Promise<CheckResponse | null>;
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
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [alertThreshold, setAlertThreshold] = useState<string>('');

  useEffect(() => {
    setLatestCheck(null);
    setLatestCheckIsSimulated(false);
    setCheckError(null);
  }, [selectedZone.id]);

  const handleAction = async (simulate: boolean) => {
    if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setCheckError("Please enter a valid email address.");
      return;
    }
    
    let thresholdVal: number | undefined = undefined;
    if (alertThreshold) {
      thresholdVal = parseFloat(alertThreshold);
      if (isNaN(thresholdVal) || thresholdVal < 20.0 || thresholdVal > 60.0) {
        setCheckError("Please enter a valid threshold between 20.0°C and 60.0°C.");
        return;
      }
    }
    
    setCheckError(null);
    try {
      if (!simulate) {
        loadReport(false);
      }
      const result = await onRunCheck(simulate, simulateTemp, recipientEmail || undefined, thresholdVal);
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

        <div className="mb-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Alert Notifications</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1">Alert Email</label>
              <input
                type="email"
            disabled={checkLoading || reportLoading}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="manager@example.com"
                className="w-full border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-colors disabled:bg-stone-200/50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="w-1/3 min-w-[100px]">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1">Threshold °C</label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="35.0"
                step="0.1"
                className="w-full border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-3">
          <button
            onClick={() => handleAction(false)}
            disabled={checkLoading || reportLoading}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-stone-800 bg-stone-800 text-stone-50 hover:bg-stone-900 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-xs font-black transition-all uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 focus:ring-offset-stone-50 shadow-sm"
          >
            {checkLoading || reportLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-stone-300" />
                <span>Analyzing Heat Risk... {elapsedSeconds > 0 && `(${elapsedSeconds}s)`}</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Analyze Heat Risk</span>
              </>
            )}
          </button>

          <div className="flex items-stretch border border-stone-300 bg-stone-100 p-1 relative mt-1 xl:mt-0">
            <div className="absolute -top-2.5 left-2 bg-stone-100 px-1 text-[8px] font-black uppercase tracking-widest text-stone-500">
              Demo Simulation
            </div>
            <div className="flex flex-col justify-center px-3 border-r border-stone-200">
              <label className="text-[8px] font-bold uppercase tracking-widest text-stone-400">Temp °C</label>
              <input
                type="number"
                disabled={checkLoading || reportLoading}
                value={simulateTemp}
                onChange={(e) => setSimulateTemp(parseFloat(e.target.value) || 42)}
                min={20}
                max={60}
                step={0.5}
                className="w-10 bg-transparent text-xs font-mono font-bold text-stone-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={() => handleAction(true)}
              disabled={checkLoading || reportLoading}
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
            
            {/* UI ALERT BANNER */}
            {latestCheck && latestCheck.action === 'alert' && !latestCheckIsSimulated && latestCheck.notification_triggered === true && (
              <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-4 rounded shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-rose-600">Sentinel Alert</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex"><span className="w-24 font-bold text-stone-700">Risk Level:</span><span className="font-bold text-rose-700 uppercase">{latestCheck.risk_label}</span></div>
                  <div className="flex"><span className="w-24 font-bold text-stone-700">Action:</span><span className="font-bold text-rose-600 uppercase">ALERT</span></div>
                  <div className="flex"><span className="w-24 font-bold text-stone-700">Zone:</span><span className="text-stone-800">{selectedZone.name}</span></div>
                  <div className="flex mt-2 pt-2 border-t border-rose-200"><span className="w-24 font-bold text-stone-700">Guidance:</span><span className="text-stone-800 flex-1">{latestCheck.guidance}</span></div>
                  {latestCheck.explanation && (
                    <div className="flex mt-1"><span className="w-24 font-bold text-stone-700">Explanation:</span><span className="text-stone-700 italic flex-1">{latestCheck.explanation}</span></div>
                  )}
                </div>
              </div>
            )}
            
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-800">
                Historical Site Intelligence
              </h2>
              <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400">
                3-Day Thermal Pattern & Danger Exceedance
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cachedTime && !reportLoading && report && (
                <div className="flex items-center gap-1 text-[8px] font-bold text-stone-500 uppercase tracking-widest bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                  <span className="text-stone-800">● CACHED</span>
                  <span>· {Math.round((Date.now() - cachedTime) / 60000)}m ago</span>
                </div>
              )}
              {!cachedTime && !reportLoading && report && (
                <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <span>● LIVE REPORT</span>
                </div>
              )}
              <button
                onClick={() => loadReport(true)}
                disabled={reportLoading}
                title="Refresh historical analysis"
                className="text-[8px] font-bold uppercase tracking-widest bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 px-2 py-1 transition-colors disabled:opacity-50"
              >
                {reportLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {reportLoading && !report ? (
            <div className="flex flex-col items-center justify-center py-10 border border-stone-200 bg-stone-100/50">
              <div className="h-6 w-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-3"></div>
              <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1">Analyzing Site History</p>
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">Building 3-day thermal profile from FortyGuard API...</p>
            </div>
          ) : reportError ? (
            <div className="flex flex-col items-center justify-center py-6 border border-rose-200 bg-rose-50 p-4">
              <AlertCircle className="h-5 w-5 text-rose-500 mb-2" />
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest px-4 text-center mb-3">
                Historical site intelligence is temporarily unavailable.
              </p>
              <button
                onClick={() => loadReport(true)}
                className="text-[9px] font-bold uppercase tracking-widest bg-white border border-stone-300 px-3 py-1 hover:bg-stone-100 text-stone-700 transition-colors"
              >
                Retry Report
              </button>
            </div>
          ) : report ? (
            <div className="border border-stone-300 p-4 bg-white space-y-4">
              
              {/* Daily Thermal Pattern Hourly Blocks */}
              {report.time_of_day?.ranked_blocks && report.time_of_day.ranked_blocks.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                    <span>Daily Thermal Heat Distribution</span>
                    <span className="font-mono text-stone-500">Threshold: {report.threshold_c}°C</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[...report.time_of_day.ranked_blocks]
                      .sort((a, b) => parseInt(a.label) - parseInt(b.label))
                      .map((block) => {
                        let barColor = 'bg-emerald-400';
                        let textColor = 'text-emerald-700';
                        if (block.avg_temp_c >= report.threshold_c + 2) {
                          barColor = 'bg-rose-500';
                          textColor = 'text-rose-700';
                        } else if (block.avg_temp_c >= report.threshold_c) {
                          barColor = 'bg-orange-400';
                          textColor = 'text-orange-700';
                        } else if (block.avg_temp_c >= report.threshold_c - 2) {
                          barColor = 'bg-amber-400';
                          textColor = 'text-amber-700';
                        }

                        return (
                          <div key={block.block_id} className="flex-1 flex flex-col items-center">
                            <div className={`h-8 w-full ${barColor} rounded-sm mb-1.5 transition-transform hover:scale-105 shadow-sm`} />
                            <div className="text-[8px] font-mono font-bold text-stone-600 text-center leading-none mb-0.5">
                              {block.label.replace('–', '-')}
                            </div>
                            <div className={`text-[8px] font-mono font-black ${textColor}`}>
                              {block.avg_temp_c.toFixed(1)}°
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 4-Stat Risk Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-stone-200">
                <div className="bg-stone-50 p-2.5 border border-stone-200">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Danger Exposure</div>
                  <div className="text-lg font-mono font-black text-rose-600 leading-none">{report.pct_time_in_danger}%</div>
                </div>
                <div className="bg-stone-50 p-2.5 border border-stone-200">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Mean Exceedance</div>
                  <div className="text-sm font-mono font-bold text-stone-800 leading-none mt-1">{report.exceedance.mean_hours} <span className="text-[9px] text-stone-500 font-sans">hrs</span></div>
                </div>
                <div className="bg-stone-50 p-2.5 border border-stone-200">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Mean Persistence</div>
                  <div className="text-sm font-mono font-bold text-stone-800 leading-none mt-1">{report.persistence.mean_hours} <span className="text-[9px] text-stone-500 font-sans">hrs</span></div>
                </div>
                <div className="bg-stone-50 p-2.5 border border-stone-200">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Heat Threshold</div>
                  <div className="text-sm font-mono font-bold text-stone-800 leading-none mt-1">{report.threshold_c}°C</div>
                </div>
              </div>

              {/* Operational Shift Window Recommendation */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-sm">
                  <div className="text-[8px] font-black uppercase tracking-widest text-emerald-700 mb-1">
                    ✓ Recommended Shift Window
                  </div>
                  <div className="text-xs font-black text-emerald-800 tracking-wider">
                    {report.time_of_day?.safest_block ? `${report.time_of_day.safest_block.label} (Safest)` : 'Morning Shift (06:00–10:00)'}
                  </div>
                </div>
                <div className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-sm">
                  <div className="text-[8px] font-black uppercase tracking-widest text-rose-700 mb-1">
                    ⚠ Peak Heat Hazard Window
                  </div>
                  <div className="text-xs font-black text-rose-800 tracking-wider">
                    {[...report.time_of_day.ranked_blocks].sort((a, b) => b.avg_temp_c - a.avg_temp_c)[0]?.label || 'Midday (14:00–18:00)'}
                  </div>
                </div>
              </div>

              {/* FortyGuard Urban Heat Island & Pattern Context */}
              {report.why_hot && (typeof report.why_hot === 'string' || report.why_hot.explanation) && (
                <div className="border-t border-stone-200 pt-3">
                  <div className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-1">
                    FortyGuard Site Pattern Analysis
                  </div>
                  <p className="text-[11px] text-stone-700 leading-relaxed font-serif italic bg-stone-50 p-2.5 border border-stone-200">
                    "{typeof report.why_hot === 'string' ? report.why_hot : report.why_hot.explanation}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-stone-300 p-6 text-center bg-stone-50/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">
                Site Selected · Awaiting Analysis
              </p>
              <p className="text-[10px] text-stone-400">
                Click <span className="font-bold text-stone-700">"Analyze Heat Risk"</span> above to generate the live thermal pattern and exceedance report.
              </p>
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
