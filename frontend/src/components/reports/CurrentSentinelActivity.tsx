import { Activity } from 'lucide-react';
import React from 'react';
import { CheckResponse } from '../../types/api';

interface CurrentSentinelActivityProps {
  events: (CheckResponse & { isSimulated?: boolean })[];
}

export const CurrentSentinelActivity: React.FC<CurrentSentinelActivityProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="mt-8 border-t border-stone-200 pt-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">
          Current Sentinel Activity
        </h4>
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <Activity className="h-6 w-6 text-stone-300 mx-auto mb-2" />
          <p className="text-xs text-stone-500 font-medium">No live events in current session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">
        Current Sentinel Activity
      </h4>
      
      <div className="space-y-3">
        {events.map((event, idx) => {
          const isAlert = event.action === 'alert';
          
          return (
            <div 
              key={`${event.zone_id}-${event.timestamp}-${idx}`}
              className={`flex items-center gap-3 border-l-2 py-2 px-3 ${isAlert ? 'border-rose-500 bg-rose-50' : 'border-stone-300 bg-white border-y border-r border-stone-200'}`}
            >
              <div className="w-12 text-[9px] font-mono text-stone-400">
                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-800">
                <div className="w-24 truncate">{event.zone_id.replace('zone-', 'Zone ').replace(/-/g, ' ')}</div>
                <div className={`w-20 ${isAlert ? 'text-rose-600' : 'text-stone-600'}`}>{event.risk_label}</div>
                <div className={`flex-1 ${isAlert ? 'text-rose-600' : 'text-stone-500'}`}>
                  {isAlert ? 'ALERT' : 'MONITOR'}
                </div>
              </div>
              <div className="w-10 text-right">
                {event.isSimulated ? (
                  <span className="text-[8px] font-black uppercase tracking-widest text-stone-500 bg-stone-200 px-1 py-0.5">SIM</span>
                ) : (
                  <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-600">LIVE</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
