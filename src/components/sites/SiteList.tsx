import React, { useState } from 'react';
import { Site } from '../../types';
import { useSafety } from '../../context/SafetyContext';
import { formatTemp } from '../../constants/riskLevels';
import {
  Building2,
  MapPin,
  Thermometer,
  Droplets,
  Sun,
  Edit2,
  Trash2,
  Plus,
  Compass,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SiteFormModal } from './SiteFormModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const SiteList: React.FC = () => {
  const { sites, deleteSite, setSelectedSiteId, tempUnit } = useSafety();
  const navigate = useNavigate();

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setSiteModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingSite(null);
    setSiteModalOpen(true);
  };

  const handleDeletePrompt = (site: Site) => {
    setSiteToDelete(site);
    setDeleteConfirmOpen(true);
  };

  const handleInspectMap = (site: Site) => {
    setSelectedSiteId(site.id);
    navigate('/map');
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Job Site Thermal Network</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active outdoor projects under FortyGuard Sentinel microclimate monitoring
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Job Site AOI</span>
        </button>
      </div>

      {/* Grid of sites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sites.map((site) => (
          <div
            key={site.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-slate-700"
          >
            <div>
              {/* Site Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 leading-snug">{site.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    <span>
                      {site.city}, {site.state}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      ({site.lat.toFixed(3)}, {site.lng.toFixed(3)})
                    </span>
                  </p>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className="text-lg font-bold text-rose-400">
                    {formatTemp(site.currentTemp, tempUnit)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Peak: {formatTemp(site.peakTempToday, tempUnit)}
                  </span>
                </div>
              </div>

              {/* Sensor Telemetry Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-950/70 p-3 text-center text-xs font-mono">
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Heat Index</span>
                  <span className="font-bold text-amber-400">{formatTemp(site.heatIndex, tempUnit)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Humidity</span>
                  <span className="font-bold text-cyan-400">{site.humidity}%</span>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Solar Rad.</span>
                  <span className="font-bold text-orange-400">{site.solarRadiation} W/m²</span>
                </div>
              </div>

              {/* Worker Risk Breakdown */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Worker Safety Deployment</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">{site.workerCount} Personnel</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                  <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-1.5 text-red-300">
                    <span className="font-bold text-xs block">{site.extremeCount}</span>
                    <span>Extreme</span>
                  </div>
                  <div className="rounded-lg bg-rose-950/40 border border-rose-800/40 p-1.5 text-rose-300">
                    <span className="font-bold text-xs block">
                      {site.atRiskCount - (site.extremeCount || 0)}
                    </span>
                    <span>Danger</span>
                  </div>
                  <div className="rounded-lg bg-amber-950/40 border border-amber-800/40 p-1.5 text-amber-300">
                    <span className="font-bold text-xs block">{site.cautionCount}</span>
                    <span>Caution</span>
                  </div>
                  <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-1.5 text-emerald-300">
                    <span className="font-bold text-xs block">{site.safeCount}</span>
                    <span>Safe</span>
                  </div>
                </div>
              </div>

              {/* Zones in this site */}
              <div className="mt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Microclimate Zones ({site.zones?.length || 0})
                </span>
                <div className="space-y-1.5">
                  {(site.zones || []).map((z) => (
                    <div
                      key={z.id}
                      className="flex items-center justify-between rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs"
                    >
                      <span className="text-slate-300 truncate">{z.name}</span>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-rose-400 font-bold">
                          {formatTemp(z.currentTemp, tempUnit)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {z.workerCount} workers
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleInspectMap(site)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 px-3 text-xs font-bold text-slate-200 transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-rose-400" />
                <span>Command Map</span>
              </button>

              <button
                onClick={() => handleEdit(site)}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 transition-colors"
                title="Edit Site Configuration"
              >
                <Edit2 className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleDeletePrompt(site)}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-rose-900/50 p-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete Site"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Site Modal */}
      <SiteFormModal
        isOpen={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        siteToEdit={editingSite}
      />

      {/* Delete Confirmation */}
      {siteToDelete && (
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={() => deleteSite(siteToDelete.id)}
          title="Delete Job Site"
          message={`Are you sure you want to remove "${siteToDelete.name}"? This will deregister the FortyGuard thermal boundary for this project.`}
          confirmLabel="Delete Site"
          isDestructive={true}
        />
      )}
    </div>
  );
};
