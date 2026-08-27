import React, { useState } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { Coffee, Droplets, ShieldAlert, Megaphone, Send } from 'lucide-react';
import { Modal } from '../common/Modal';

export const QuickActionsBar: React.FC = () => {
  const { workers, selectedSiteId, bulkSendBreakAlert } = useSafety();
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  const atRiskWorkers = workers
    .filter((w) => selectedSiteId === 'all' || w.siteId === selectedSiteId)
    .filter((w) => w.status === 'danger' || w.status === 'extreme');

  const handleSendAllBreak = () => {
    if (atRiskWorkers.length === 0) return;
    bulkSendBreakAlert(atRiskWorkers.map((w) => w.id));
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastMessage('');
      setBroadcastModalOpen(false);
    }, 1500);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500/20 p-2.5 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Manager Heat Safety Command Protocol</h4>
              <p className="text-xs text-slate-400">
                {atRiskWorkers.length} personnel currently qualify for immediate OSHA cool-down rotation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleSendAllBreak}
              disabled={atRiskWorkers.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-all"
            >
              <Coffee className="h-4 w-4" />
              <span>Rotate {atRiskWorkers.length} At-Risk to Shade</span>
            </button>

            <button
              onClick={() => setBroadcastModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition-colors"
            >
              <Megaphone className="h-4 w-4 text-amber-400" />
              <span>Broadcast Notice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      <Modal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title="Broadcast Field Safety Notice"
        subtitle="Transmit a priority thermal safety prompt to all connected Sentinel devices"
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Preset Message
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                '💧 Mandatory 500ml hydration intake right now.',
                '🌡 FortyGuard reports +3°C heat index surge in next 30 mins.',
                '⛺ Proceed to nearest misting shelter for 10-min rotation.',
                '🚨 Extreme Heat Protocol active: Halt high-exertion manual lifting.',
              ].map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setBroadcastMessage(preset)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-left text-slate-300 hover:border-amber-500/50 hover:bg-slate-800 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Sentinel Alert Message
            </label>
            <textarea
              rows={3}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Enter message to broadcast to all field workers..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBroadcastModalOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={broadcastSent || !broadcastMessage.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-md transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{broadcastSent ? 'Transmitted!' : 'Transmit to Field'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
