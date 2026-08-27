import React from 'react';
import { useSafety } from '../../context/SafetyContext';
import { Search, Filter, Plus, Coffee, ShieldAlert } from 'lucide-react';
import { RiskLevel } from '../../types';

interface WorkerFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'all' | RiskLevel;
  setStatusFilter: (status: 'all' | RiskLevel) => void;
  breakOnly: boolean;
  setBreakOnly: (breakOnly: boolean) => void;
  onAddWorker: () => void;
  selectedCount: number;
  onBulkBreak: () => void;
}

export const WorkerFilterBar: React.FC<WorkerFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  breakOnly,
  setBreakOnly,
  onAddWorker,
  selectedCount,
  onBulkBreak,
}) => {
  const { sites, selectedSiteId, setSelectedSiteId } = useSafety();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md">
      {/* Left: Search & Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search worker by name or role..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />
        </div>

        {/* Site Filter */}
        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          aria-label="Filter by Job Site"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 focus:border-rose-500 focus:outline-none cursor-pointer"
        >
          <option value="all">🌍 All Job Sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Risk Level Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          aria-label="Filter by Risk Status"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 focus:border-rose-500 focus:outline-none cursor-pointer"
        >
          <option value="all">All Risk Levels</option>
          <option value="extreme">🔥 Extreme Only</option>
          <option value="danger">🔴 Danger Only</option>
          <option value="caution">🟡 Caution Only</option>
          <option value="safe">🟢 Safe Only</option>
        </select>

        {/* Break Requested Toggle */}
        <button
          onClick={() => setBreakOnly(!breakOnly)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
            breakOnly
              ? 'border-amber-500/60 bg-amber-950/60 text-amber-300'
              : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coffee className="h-3.5 w-3.5" />
          <span>Pending Breaks</span>
        </button>
      </div>

      {/* Right: Bulk Action & Add Worker */}
      <div className="flex items-center gap-2.5">
        {selectedCount > 0 && (
          <button
            onClick={onBulkBreak}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-all animate-pulse"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Send Break to {selectedCount} Selected</span>
          </button>
        )}

        <button
          onClick={onAddWorker}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Register Worker</span>
        </button>
      </div>
    </div>
  );
};
