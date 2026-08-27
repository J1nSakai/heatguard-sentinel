import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Site } from '../../types';
import { useSafety } from '../../context/SafetyContext';
import { Building2, MapPin, Thermometer, Sun, Droplets } from 'lucide-react';

interface SiteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteToEdit?: Site | null;
}

export const SiteFormModal: React.FC<SiteFormModalProps> = ({ isOpen, onClose, siteToEdit }) => {
  const { addSite, updateSite } = useSafety();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [lat, setLat] = useState<number>(33.4352);
  const [lng, setLng] = useState<number>(-112.0101);
  const [currentTemp, setCurrentTemp] = useState<number>(38.5);
  const [humidity, setHumidity] = useState<number>(35);
  const [solarRadiation, setSolarRadiation] = useState<number>(850);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (siteToEdit) {
      setName(siteToEdit.name);
      setCity(siteToEdit.city);
      setState(siteToEdit.state);
      setLat(siteToEdit.lat);
      setLng(siteToEdit.lng);
      setCurrentTemp(siteToEdit.currentTemp);
      setHumidity(siteToEdit.humidity);
      setSolarRadiation(siteToEdit.solarRadiation);
    } else {
      setName('');
      setCity('Phoenix');
      setState('AZ');
      setLat(33.4352);
      setLng(-112.0101);
      setCurrentTemp(38.5);
      setHumidity(25);
      setSolarRadiation(850);
    }
    setErrors({});
  }, [siteToEdit, isOpen]);

  const validate = () => {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = 'Site name is required';
    if (!city.trim()) err.city = 'City is required';
    if (!state.trim()) err.state = 'State is required';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (siteToEdit) {
      updateSite(siteToEdit.id, {
        name,
        city,
        state,
        lat,
        lng,
        currentTemp,
        humidity,
        solarRadiation,
        heatIndex: parseFloat((currentTemp + (humidity > 40 ? 3.2 : 1.5)).toFixed(1)),
      });
    } else {
      addSite({
        name,
        city,
        state,
        lat,
        lng,
        zoom: 15,
        currentTemp,
        peakTempToday: parseFloat((currentTemp + 3.0).toFixed(1)),
        humidity,
        solarRadiation,
        heatIndex: parseFloat((currentTemp + 2.0).toFixed(1)),
        coolZoneStations: [
          {
            id: `cz-${Date.now()}`,
            name: `${name} Primary Cooling Shelter`,
            lat: lat + 0.001,
            lng: lng + 0.001,
            capacity: 20,
            occupied: 3,
            hasMisting: true,
            waterSuppliesLitres: 250,
          },
        ],
        zones: [
          { id: `z-${Date.now()}-1`, name: 'Main Construction Sector', type: 'open_field', currentTemp, riskLevel: 'caution', workerCount: 0 },
          { id: `z-${Date.now()}-2`, name: 'Shade Staging Area', type: 'shade_station', currentTemp: currentTemp - 8, riskLevel: 'safe', workerCount: 0 },
        ],
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={siteToEdit ? `Edit Site: ${siteToEdit.name}` : 'Configure New Job Site AOI'}
      subtitle="Define FortyGuard microclimate boundary coordinates and environmental sensors"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Job Site Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phoenix Metro Rail & Sky Harbor Expansion"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
          {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
        </div>

        {/* City & State */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              City <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Phoenix"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
            />
            {errors.city && <p className="text-[10px] text-rose-400 mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              State <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. AZ"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-slate-100 focus:border-rose-500 focus:outline-none"
            />
            {errors.state && <p className="text-[10px] text-rose-400 mt-1">{errors.state}</p>}
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Latitude (Center)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs font-mono text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Longitude (Center)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs font-mono text-slate-100 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Microclimate Environmental Baseline */}
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Ambient Temp (°C)
            </label>
            <input
              type="number"
              step="0.5"
              value={currentTemp}
              onChange={(e) => setCurrentTemp(parseFloat(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2 text-xs font-mono text-rose-400 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Humidity (%)
            </label>
            <input
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2 text-xs font-mono text-cyan-300 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Solar Rad (W/m²)
            </label>
            <input
              type="number"
              value={solarRadiation}
              onChange={(e) => setSolarRadiation(parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 px-2 text-xs font-mono text-amber-300 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-colors"
          >
            {siteToEdit ? 'Save Changes' : 'Activate Job Site'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
