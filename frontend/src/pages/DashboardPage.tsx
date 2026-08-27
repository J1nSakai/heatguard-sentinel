import React, { useState } from 'react';
import { useSafety } from '../context/SafetyContext';
import { KpiWidget } from '../components/common/KpiWidget';
import { HighRiskWorkers } from '../components/dashboard/HighRiskWorkers';
import { AlertFeed } from '../components/dashboard/AlertFeed';
import { SiteSummaryCards } from '../components/dashboard/SiteSummaryCards';
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar';
import { HeatMapView } from '../components/map/HeatMapView';
import { WorkerTable } from '../components/workers/WorkerTable';
import { WorkerFormModal } from '../components/workers/WorkerFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Worker } from '../types';
import { formatTemp } from '../constants/riskLevels';
import {
  Users,
  AlertTriangle,
  Flame,
  Building2,
  Bell,
  Thermometer,
  LayoutGrid,
  List,
  Map as MapIcon,
  Maximize2,
} from 'lucide-react';

type DashboardViewMode = 'full' | 'mini' | 'row' | 'map';

export const DashboardPage: React.FC = () => {
  const { workers, kpiSummary, selectedSiteId, tempUnit, bulkSendBreakAlert, deleteWorker } = useSafety();

  const [viewMode, setViewMode] = useState<DashboardViewMode>('full');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const displayedWorkers = selectedSiteId === 'all' ? workers : workers.filter((w) => w.siteId === selectedSiteId);

  const handleToggleSelect = (id: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedWorkerIds(displayedWorkers.map((w) => w.id));
    } else {
      setSelectedWorkerIds([]);
    }
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setWorkerModalOpen(true);
  };

  const handleDeleteWorkerPrompt = (worker: Worker) => {
    setWorkerToDelete(worker);
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Outdoor Worker Safety Sentinel</span>
            <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-400 border border-rose-500/30">
              COMMAND CENTER
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time microclimate thermal surveillance, heat risk indicators, and rapid alert dispatch
          </p>
        </div>

        {/* View Mode Switcher Pills (Day 6 deliverable: Full, Mini, Row, Map) */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs font-semibold">
          <button
            onClick={() => setViewMode('full')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'full'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Full View</span>
          </button>

          <button
            onClick={() => setViewMode('mini')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'mini'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Mini View</span>
          </button>

          <button
            onClick={() => setViewMode('row')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'row'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Row View</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'map'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiWidget
          title="Total Personnel"
          value={kpiSummary.totalWorkers}
          subtitle="Monitored in field"
          icon={Users}
          variant="default"
        />
        <KpiWidget
          title="At Risk Personnel"
          value={kpiSummary.atRiskWorkers}
          subtitle={`${kpiSummary.extremeWorkers} in Extreme Zone`}
          icon={Flame}
          variant={kpiSummary.atRiskWorkers > 0 ? 'danger' : 'safe'}
        />
        <KpiWidget
          title="Active Job Sites"
          value={kpiSummary.activeSites}
          subtitle="FortyGuard AOI"
          icon={Building2}
          variant="info"
        />
        <KpiWidget
          title="Alerts Today"
          value={kpiSummary.alertsToday}
          subtitle={`${kpiSummary.unacknowledgedAlerts} unacknowledged`}
          icon={Bell}
          variant={kpiSummary.unacknowledgedAlerts > 0 ? 'caution' : 'default'}
        />
        <KpiWidget
          title="Peak Heat Recorded"
          value={formatTemp(kpiSummary.highestTempRecorded, tempUnit)}
          subtitle="Solar radiance peak"
          icon={Thermometer}
          variant="danger"
        />
        <KpiWidget
          title="Pending Breaks"
          value={kpiSummary.breakRequestsPending}
          subtitle="Awaiting rotation"
          icon={AlertTriangle}
          variant={kpiSummary.breakRequestsPending > 0 ? 'caution' : 'safe'}
        />
      </div>

      {/* Quick Action Bar for Safety Leads */}
      <QuickActionsBar />

      {/* VIEW MODE 1: FULL VIEW */}
      {viewMode === 'full' && (
        <div className="space-y-6">
          {/* Priority High Risk Workers */}
          <HighRiskWorkers />

          {/* Interactive Heatmap Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>FortyGuard Thermal Sentinel Map</span>
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-400 border border-rose-500/30">
                    Live GPS Telemetry
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Microclimate heat tiles, live worker pins, and cool-down shelter positions
                </p>
              </div>
            </div>
            <HeatMapView heightClass="h-[460px]" />
          </div>

          {/* Grid Layout: Site Summaries & Live Alert Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SiteSummaryCards />
            </div>
            <div className="lg:col-span-1">
              <AlertFeed maxItems={5} />
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: MINI VIEW (Compact snapshots) */}
      {viewMode === 'mini' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedWorkers.map((worker) => (
              <div
                key={worker.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={worker.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={worker.name}
                    className="h-10 w-10 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">{worker.name}</h4>
                    <p className="text-xs text-slate-400">{worker.role}</p>
                    <p className="text-[10px] text-slate-500">{worker.siteName}</p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span
                    className={`text-base font-bold ${
                      worker.status === 'extreme'
                        ? 'text-red-500'
                        : worker.status === 'danger'
                        ? 'text-rose-400'
                        : worker.status === 'caution'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {formatTemp(worker.currentTemp, tempUnit)}
                  </span>
                  <div className="mt-1">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        worker.status === 'extreme'
                          ? 'bg-red-950 text-red-300 border-red-700'
                          : worker.status === 'danger'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : worker.status === 'caution'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AlertFeed maxItems={4} />
        </div>
      )}

      {/* VIEW MODE 3: ROW VIEW (High density monitoring) */}
      {viewMode === 'row' && (
        <div className="space-y-6">
          <WorkerTable
            workers={displayedWorkers}
            selectedWorkerIds={selectedWorkerIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onEditWorker={handleEditWorker}
            onDeleteWorker={handleDeleteWorkerPrompt}
          />
        </div>
      )}

      {/* VIEW MODE 4: MAP VIEW (Full tactical heat perspective) */}
      {viewMode === 'map' && (
        <div className="space-y-6">
          <HeatMapView heightClass="h-[680px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HighRiskWorkers />
            <AlertFeed maxItems={6} />
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      <WorkerFormModal
        isOpen={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        workerToEdit={editingWorker}
      />

      {/* Delete Confirmation Modal */}
      {workerToDelete && (
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={() => deleteWorker(workerToDelete.id)}
          title="Delete Worker"
          message={`Are you sure you want to remove "${workerToDelete.name}" from Sentinel monitoring?`}
          confirmLabel="Delete Worker"
          isDestructive={true}
        />
      )}
    </div>
  );
};
