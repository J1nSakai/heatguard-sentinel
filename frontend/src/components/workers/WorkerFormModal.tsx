import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Worker } from '../../types';
import { useSafety } from '../../context/SafetyContext';
import { Thermometer, Shield, User, MapPin, Phone } from 'lucide-react';

interface WorkerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerToEdit?: Worker | null;
}

export const WorkerFormModal: React.FC<WorkerFormModalProps> = ({
  isOpen,
  onClose,
  workerToEdit,
}) => {
  const { sites, addWorker, updateWorker } = useSafety();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [siteId, setSiteId] = useState('');
  const [zoneName, setZoneName] = useState('General Work Area');
  const [customThreshold, setCustomThreshold] = useState<number>(38.0);
  const [phone, setPhone] = useState('');
  const [ppeType, setPpeType] = useState('Class 2 High-Vis + Cooling Neck Shade');
  const [currentTemp, setCurrentTemp] = useState<number>(35.0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (workerToEdit) {
      setName(workerToEdit.name);
      setRole(workerToEdit.role);
      setSiteId(workerToEdit.siteId);
      setZoneName(workerToEdit.location.zoneName || 'General Work Area');
      setCustomThreshold(workerToEdit.customThreshold);
      setPhone(workerToEdit.phone || '');
      setPpeType(workerToEdit.ppeType);
      setCurrentTemp(workerToEdit.currentTemp);
    } else {
      setName('');
      setRole('');
      setSiteId(sites[0]?.id || '');
      setZoneName('General Work Area');
      setCustomThreshold(38.0);
      setPhone('');
      setPpeType('Class 2 High-Vis + Cooling Neck Shade');
      setCurrentTemp(35.0);
    }
    setErrors({});
  }, [workerToEdit, sites, isOpen]);

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = 'Worker full name is required';
    if (!role.trim()) err.role = 'Role / Job title is required';
    if (!siteId) err.siteId = 'Please select an assigned job site';
    if (customThreshold < 30 || customThreshold > 46) {
      err.customThreshold = 'Custom threshold must be between 30°C and 46°C';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedSite = sites.find((s) => s.id === siteId) || sites[0];

    if (workerToEdit) {
      updateWorker(workerToEdit.id, {
        name,
        role,
        siteId,
        siteName: selectedSite.name,
        customThreshold,
        phone,
        ppeType,
        location: {
          ...workerToEdit.location,
          siteId,
          zoneName,
        },
      });
    } else {
      addWorker({
        name,
        role,
        siteId,
        siteName: selectedSite.name,
        currentTemp,
        customThreshold,
        phone,
        ppeType,
        timeInSunMinutes: 0,
        location: {
          lat: selectedSite.lat + (Math.random() - 0.5) * 0.003,
          lng: selectedSite.lng + (Math.random() - 0.5) * 0.003,
          siteId,
          zoneName,
        },
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000000)}?w=150&auto=format&fit=crop&q=80`,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={workerToEdit ? `Edit Profile: ${workerToEdit.name}` : 'Register New Field Worker'}
      subtitle="Configure real-time thermal telemetry thresholds and safety gear specs"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jackson Reed"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
            {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Role / Specialty <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Lead Rebar Technician"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
            {errors.role && <p className="text-[10px] text-rose-400 mt-1">{errors.role}</p>}
          </div>
        </div>

        {/* Site & Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Assigned Job Site <span className="text-rose-500">*</span>
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none cursor-pointer"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Work Zone / Sector
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. Solar Array Grid B"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Custom Thermal Threshold */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-rose-400" />
              <span>Personal Safety Heat Threshold</span>
            </label>
            <span className="font-mono text-sm font-bold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded">
              {customThreshold.toFixed(1)}°C / {((customThreshold * 9) / 5 + 32).toFixed(1)}°F
            </span>
          </div>
          <input
            type="range"
            min="32"
            max="44"
            step="0.5"
            value={customThreshold}
            onChange={(e) => setCustomThreshold(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Sentinel triggers automatic high-risk alarms when ambient FortyGuard microclimate exceeds this value for 15+ minutes.
          </p>
        </div>

        {/* PPE Configuration & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Assigned Safety PPE
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={ppeType}
                onChange={(e) => setPpeType(e.target.value)}
                placeholder="e.g. UV Neck Gaiter + Class 3 Vest"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contact / Radio Channel
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-colors"
          >
            {workerToEdit ? 'Save Changes' : 'Register Worker'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
