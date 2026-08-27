import React, { useState, useMemo } from 'react';
import { useSafety } from '../context/SafetyContext';
import { WorkerFilterBar } from '../components/workers/WorkerFilterBar';
import { WorkerTable } from '../components/workers/WorkerTable';
import { WorkerFormModal } from '../components/workers/WorkerFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Worker, RiskLevel } from '../types';

export const WorkersPage: React.FC = () => {
  const { workers, selectedSiteId, bulkSendBreakAlert, deleteWorker } = useSafety();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RiskLevel>('all');
  const [breakOnly, setBreakOnly] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const filteredWorkers = useMemo(() => {
    return workers
      .filter((w) => selectedSiteId === 'all' || w.siteId === selectedSiteId)
      .filter((w) => statusFilter === 'all' || w.status === statusFilter)
      .filter((w) => !breakOnly || w.breakRequested)
      .filter((w) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.role.toLowerCase().includes(q) ||
          w.siteName.toLowerCase().includes(q) ||
          w.location.zoneName.toLowerCase().includes(q)
        );
      });
  }, [workers, selectedSiteId, statusFilter, breakOnly, searchTerm]);

  const handleToggleSelect = (id: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedWorkerIds(filteredWorkers.map((w) => w.id));
    } else {
      setSelectedWorkerIds([]);
    }
  };

  const handleAddWorker = () => {
    setEditingWorker(null);
    setModalOpen(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setModalOpen(true);
  };

  const handleDeletePrompt = (worker: Worker) => {
    setWorkerToDelete(worker);
    setDeleteConfirmOpen(true);
  };

  const handleBulkBreak = () => {
    if (selectedWorkerIds.length > 0) {
      bulkSendBreakAlert(selectedWorkerIds);
      setSelectedWorkerIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Worker Safety Registry & Telemetry</h1>
        <p className="text-xs text-slate-400 mt-1">
          Full CRUD worker management, custom thermal thresholds, and real-time biometric vitals
        </p>
      </div>

      {/* Filter Bar */}
      <WorkerFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        breakOnly={breakOnly}
        setBreakOnly={setBreakOnly}
        onAddWorker={handleAddWorker}
        selectedCount={selectedWorkerIds.length}
        onBulkBreak={handleBulkBreak}
      />

      {/* Table */}
      <WorkerTable
        workers={filteredWorkers}
        selectedWorkerIds={selectedWorkerIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onEditWorker={handleEditWorker}
        onDeleteWorker={handleDeletePrompt}
      />

      {/* Add / Edit Form Modal */}
      <WorkerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        workerToEdit={editingWorker}
      />

      {/* Delete Confirmation */}
      {workerToDelete && (
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={() => deleteWorker(workerToDelete.id)}
          title="Delete Worker"
          message={`Are you sure you want to remove ${workerToDelete.name} from the Sentinel database?`}
          confirmLabel="Delete Worker"
          isDestructive={true}
        />
      )}
    </div>
  );
};
