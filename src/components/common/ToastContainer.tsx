import React from 'react';
import { useToast } from '../../context/ToastContext';
import { RISK_LEVELS } from '../../constants/riskLevels';
import { AlertTriangle, Flame, ShieldAlert, X, Volume2, VolumeX, CheckCircle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, soundEnabled, setSoundEnabled } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-md w-full flex-col gap-2.5 pointer-events-none px-4 sm:px-0">
      <div className="flex justify-end pointer-events-auto mb-1">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-white shadow-lg backdrop-blur-md transition-colors"
          title={soundEnabled ? 'Mute Sentinel Audio Alarms' : 'Unmute Sentinel Audio Alarms'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Alarm Sound: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="h-3.5 w-3.5 text-slate-500" />
              <span>Alarm Sound: MUTED</span>
            </>
          )}
        </button>
      </div>

      {toasts.map((toast) => {
        const config = RISK_LEVELS[toast.severity] || RISK_LEVELS.safe;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 ${config.bgColor} ${config.borderColor} ${config.glowClass} bg-slate-950/95`}
          >
            {/* Top risk accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: config.color }}
            />

            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {toast.severity === 'extreme' ? (
                  <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                ) : toast.severity === 'danger' ? (
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                ) : toast.severity === 'caution' ? (
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-100 truncate">{toast.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{toast.timestamp}</span>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
