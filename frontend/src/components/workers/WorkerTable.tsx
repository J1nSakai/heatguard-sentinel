import React, { useState, useMemo } from 'react';
import { Worker, RiskLevel } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatTemp } from '../../constants/riskLevels';
import { useSafety } from '../../context/SafetyContext';
import {
  ArrowUpDown,
  Coffee,
  Edit2,
  Trash2,
  ExternalLink,
  Heart,
  Droplets,
  Clock,
  Battery,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorkerTableProps {
  workers: Worker[];
  selectedWorkerIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (worker: Worker) => void;
}

type SortField = 'name' | 'siteName' | 'currentTemp' | 'customThreshold' | 'status' | 'heartRate' | 'timeInSunMinutes';

export const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  selectedWorkerIds,
  onToggleSelect,
  onSelectAll,
  onEditWorker,
  onDeleteWorker,
}) => {
  const { tempUnit, sendWorkerBreakAlert, sendWorkerHydrationReminder } = useSafety();
  const [sortField, setSortField] = useState<SortField>('currentTemp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for temps
    }
  };

  const sortedWorkers = useMemo(() => {
    const riskOrder: Record<RiskLevel, number> = {
      extreme: 4,
      danger: 3,
      caution: 2,
      safe: 1,
    };

    return [...workers].sort((a, b) => {
      let aVal: any = a[sortField as keyof Worker];
      let bVal: any = b[sortField as keyof Worker];

      if (sortField === 'heartRate') {
        aVal = a.vitals.heartRate;
        bVal = b.vitals.heartRate;
      } else if (sortField === 'status') {
        aVal = riskOrder[a.status];
        bVal = riskOrder[b.status];
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [workers, sortField, sortAsc]);

  const allSelected = workers.length > 0 && selectedWorkerIds.length === workers.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* Header */}
          <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </th>
              <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5 hover:text-white">
                  <span>Worker</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('siteName')}>
                <div className="flex items-center gap-1.5 hover:text-white">
                  <span>Job Site & Zone</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('currentTemp')}>
                <div className="flex items-center gap-1.5 hover:text-white">
                  <span>Microclimate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1.5 hover:text-white">
                  <span>Safety Status</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('heartRate')}>
                <div className="flex items-center gap-1.5 hover:text-white">
                  <span>Vitals</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('timeInSunMinutes')}>
                <div className="flex items-center gap-1.5 hover:text-white">
                  <span>Sun Time</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-800/60">
            {sortedWorkers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No workers found matching criteria.
                </td>
              </tr>
            ) : (
              sortedWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.includes(worker.id);
                const isExtreme = worker.status === 'extreme';

                return (
                  <tr
                    key={worker.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-rose-950/20'
                        : isExtreme
                        ? 'bg-red-950/10 hover:bg-red-950/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(worker.id)}
                        className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>

                    {/* Name & Role */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={worker.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={worker.name}
                          className="h-9 w-9 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <Link
                            to={`/workers/${worker.id}`}
                            className="font-bold text-slate-100 hover:text-rose-400 transition-colors flex items-center gap-1"
                          >
                            <span>{worker.name}</span>
                            <ExternalLink className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100" />
                          </Link>
                          <span className="text-[11px] text-slate-400">{worker.role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Site & Zone */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{worker.siteName}</div>
                      <div className="text-[11px] text-slate-400">📍 {worker.location.zoneName}</div>
                    </td>

                    {/* Current Temp vs Threshold */}
                    <td className="p-4 font-mono">
                      <div className="font-bold text-sm text-rose-400">
                        {formatTemp(worker.currentTemp, tempUnit)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Limit: {formatTemp(worker.customThreshold, tempUnit)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <StatusBadge status={worker.status} size="sm" />
                      {worker.breakRequested && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-400">
                          <Coffee className="h-3 w-3 animate-bounce" />
                          <span>Break Requested</span>
                        </div>
                      )}
                    </td>

                    {/* Vitals */}
                    <td className="p-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Heart className="h-3 w-3 text-rose-400" />
                        <span>{worker.vitals.heartRate} bpm</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Droplets className="h-3 w-3 text-cyan-400" />
                        <span>{worker.vitals.hydrationLevel}% hyd</span>
                      </div>
                    </td>

                    {/* Sun Exposure */}
                    <td className="p-4 font-mono text-[11px] text-slate-300">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span>{worker.timeInSunMinutes} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Battery className="h-3 w-3 text-emerald-400" />
                        <span>{worker.batteryLevel}% sensor</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => sendWorkerBreakAlert(worker.id)}
                          className="rounded-lg bg-rose-950/60 hover:bg-rose-900/80 p-1.5 text-rose-300 border border-rose-800/50 transition-colors"
                          title="Send mandatory break order"
                        >
                          <Coffee className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditWorker(worker)}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-300 transition-colors"
                          title="Edit worker threshold/profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteWorker(worker)}
                          className="rounded-lg bg-slate-800 hover:bg-rose-900/50 p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete worker"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
