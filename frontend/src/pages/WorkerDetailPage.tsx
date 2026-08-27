import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSafety } from '../context/SafetyContext';
import { WorkerDetailView } from '../components/workers/WorkerDetailView';
import { WorkerFormModal } from '../components/workers/WorkerFormModal';
import { ArrowLeft } from 'lucide-react';

export const WorkerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { workers } = useSafety();
  const navigate = useNavigate();

  const [editModalOpen, setEditModalOpen] = useState(false);

  const worker = workers.find((w) => w.id === id);

  if (!worker) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Worker Profile Not Found</h2>
        <p className="text-xs text-slate-400">The requested worker id does not exist in Sentinel registry.</p>
        <button
          onClick={() => navigate('/workers')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Worker Registry</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <WorkerDetailView worker={worker} onEdit={() => setEditModalOpen(true)} />
      <WorkerFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        workerToEdit={worker}
      />
    </div>
  );
};
