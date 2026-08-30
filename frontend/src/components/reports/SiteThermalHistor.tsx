
import React from 'react';
import { ReportResponse } from '../../types/api';
import { AlertCircle } from 'lucide-react';

interface SiteThermalHistoryProps {
    report: ReportResponse | null;
    reportLoading: boolean;
    reportError: string | null;
    cachedTime: number | null;
    loadReport: (forceRefresh?: boolean) => void;
    zoneSelected: boolean;
}

export const SiteThermalHistory: React.FC<SiteThermalHistoryProps> = ({
    report,
    reportLoading,
    reportError,
    cachedTime,
    loadReport,
    zoneSelected
}) => {
    if (!zoneSelected) {
        return (
            <div className="p-6 h-full flex flex-col justify-center bg-stone-100/50">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Site Thermal History</h2>
                <div className="text-xs text-stone-500 font-medium">Select a work location to load historical site intelligence.</div>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col h-full bg-stone-50">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-800">
                        Site Thermal History
                    </h2>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
                        3-Day Site Pattern · Historical Intelligence
                    </div>
                </div>
                {cachedTime && !reportLoading && report && (
                    <div className="flex items-center gap-1 text-[8px] font-bold text-stone-400 uppercase tracking-widest">
                        <span className="text-stone-800">● CACHED</span>
                        <span>· Updated {Math.round((Date.now() - cachedTime) / 60000)}m ago</span>
                    </div>
                )}
                {!cachedTime && !reportLoading && report && (
                    <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-600 uppercase tracking-widest">
                        <span>● LIVE REPORT</span>
                    </div>
                )}
            </div>

            {reportLoading && !report ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-stone-200 bg-stone-100/50 p-6">
                    <div className="h-5 w-5 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-3"></div>
                    <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest text-center">Loading 3-day pattern...</p>
                </div>
            ) : reportError ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-rose-200 bg-rose-50 p-6">
                    <AlertCircle className="h-5 w-5 text-rose-500 mb-2" />
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest text-center mb-3">
                        Historical site intelligence unavailable.
                    </p>
                    <button onClick={() => loadReport(true)} className="text-[9px] font-bold uppercase tracking-widest bg-white border border-stone-300 px-3 py-1 hover:bg-stone-100 transition-colors text-stone-700">
                        Refresh
                    </button>
                </div>
            ) : report ? (
                <div className="flex-1 flex flex-col border border-stone-300 bg-white p-5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-4">
                        Daily Thermal Pattern
                    </div>

                    <div className="flex gap-1.5 mb-5">
                        {report.time_of_day.ranked_blocks.sort((a, b) => parseInt(a.label) - parseInt(b.label)).map(block => {
                            // Derive color intensity based on threshold delta since block-level string mapping doesn't exist
                            let color = 'bg-emerald-400';
                            if (block.avg_temp_c >= report.threshold_c + 2) color = 'bg-rose-500';
                            else if (block.avg_temp_c >= report.threshold_c) color = 'bg-orange-400';
                            else if (block.avg_temp_c >= report.threshold_c - 2) color = 'bg-amber-400';

                            return (
                                <div key={block.block_id} className="flex-1 flex flex-col">
                                    <div className={`h-8 w-full ${color} rounded-sm mb-1.5`}></div>
                                    <div className="text-[8px] font-mono font-bold text-stone-500 text-center">{block.label.replace('–', '-')}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-auto border-t border-stone-200 pt-3">
                        <div>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Peak Heat Window</div>
                            <div className="text-[10px] font-black text-stone-800">{report.time_of_day.ranked_blocks.sort((a, b) => b.avg_temp_c - a.avg_temp_c)[0]?.label || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Time in Danger</div>
                            <div className="text-[10px] font-black text-stone-800">{report.pct_time_in_danger}%</div>
                        </div>
                        <div>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Safest Window</div>
                            <div className="text-[10px] font-black text-emerald-600">{report.time_of_day.safest_block?.label || 'None'}</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};