import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSafety } from '../../context/SafetyContext';
import { generateThermalTiles, getThermalTileColor, getThermalOpacity } from '../../services/fortyguardService';
import { formatTemp, RISK_LEVELS } from '../../constants/riskLevels';
import { StatusBadge } from '../common/StatusBadge';
import { Worker, Site, RiskLevel } from '../../types';
import { Flame, Droplets, Coffee, MapPin, Eye, Layers, ShieldCheck, Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';

// Helper component to center map smoothly when selected site changes
const MapCenterController: React.FC<{ lat: number; lng: number; zoom: number }> = ({ lat, lng, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
};

interface HeatMapViewProps {
  heightClass?: string;
  showControls?: boolean;
}

export const HeatMapView: React.FC<HeatMapViewProps> = ({
  heightClass = 'h-[540px]',
  showControls = true,
}) => {
  const { workers, sites, selectedSiteId, setSelectedSiteId, tempUnit, sendWorkerBreakAlert, sendWorkerHydrationReminder } = useSafety();

  const [showHeatLayer, setShowHeatLayer] = useState<boolean>(true);
  const [showCoolZones, setShowCoolZones] = useState<boolean>(true);
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');

  // Active site center
  const activeSite = useMemo(() => {
    if (selectedSiteId === 'all') return sites[0] || { lat: 33.4352, lng: -112.0101, zoom: 15, currentTemp: 41.8, name: 'All Sites' };
    return sites.find((s) => s.id === selectedSiteId) || sites[0];
  }, [selectedSiteId, sites]);

  // Generate microclimate thermal tiles for active site
  const thermalTiles = useMemo(() => {
    if (!showHeatLayer) return [];
    return generateThermalTiles(activeSite.lat, activeSite.lng, activeSite.currentTemp || 38.0, 10);
  }, [activeSite, showHeatLayer]);

  // Filtered workers to plot
  const displayedWorkers = useMemo(() => {
    return workers
      .filter((w) => selectedSiteId === 'all' || w.siteId === selectedSiteId)
      .filter((w) => riskFilter === 'all' || w.status === riskFilter);
  }, [workers, selectedSiteId, riskFilter]);

  // Create custom DivIcon for workers
  const createWorkerIcon = (worker: Worker) => {
    const config = RISK_LEVELS[worker.status] || RISK_LEVELS.safe;
    const isHighRisk = worker.status === 'danger' || worker.status === 'extreme';

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer group">
        ${
          isHighRisk
            ? `<div class="absolute w-9 h-9 rounded-full ${
                worker.status === 'extreme' ? 'radar-ping-extreme bg-red-600/60' : 'radar-ping-danger bg-rose-500/50'
              }"></div>`
            : ''
        }
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2" style="background-color: #0f172a; border-color: ${
          config.color
        };">
          <span class="text-[11px] font-bold" style="color: ${config.color}">
            ${worker.name.split(' ').map((n) => n[0]).join('')}
          </span>
        </div>
        <div class="absolute -bottom-5 whitespace-nowrap rounded bg-slate-950/90 border border-slate-700 px-1 py-0.2 text-[9px] font-mono font-bold text-slate-200 shadow">
          ${worker.currentTemp.toFixed(1)}°C
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-worker-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -18],
    });
  };

  // Create custom icon for Cool Zones
  const coolZoneIcon = L.divIcon({
    html: `
      <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border-2 border-cyan-400 text-cyan-300 shadow-md">
        <span class="text-xs">⛺</span>
      </div>
    `,
    className: 'custom-coolzone-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Map Control Bar Overlay */}
      {showControls && (
        <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Site Quick Select */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-xl">
            <MapPin className="h-3.5 w-3.5 text-rose-400 ml-1.5" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer pr-2"
            >
              <option value="all">🌍 All Job Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          {/* Layer & Risk Filters */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 p-1 backdrop-blur-md shadow-xl text-xs font-semibold">
            {/* Heatmap Toggle */}
            <button
              onClick={() => setShowHeatLayer(!showHeatLayer)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors ${
                showHeatLayer
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>FortyGuard Heat</span>
            </button>

            {/* Cool Zones Toggle */}
            <button
              onClick={() => setShowCoolZones(!showCoolZones)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors ${
                showCoolZones
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Droplets className="h-3.5 w-3.5" />
              <span>Cool Zones</span>
            </button>

            {/* Risk Level Filter */}
            <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-700">
              {(['all', 'extreme', 'danger', 'caution', 'safe'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`rounded-lg px-2 py-0.5 text-[11px] capitalize transition-colors ${
                    riskFilter === lvl
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-slate-800 bg-slate-950/90 p-2.5 shadow-xl backdrop-blur-md text-[10px] font-mono text-slate-300 pointer-events-auto max-w-[200px]">
        <div className="font-bold text-slate-200 mb-1.5 flex items-center gap-1 font-sans">
          <Layers className="h-3 w-3 text-amber-400" />
          <span>FortyGuard Thermal Scale</span>
        </div>
        <div className="flex h-2 w-full rounded overflow-hidden mb-1">
          <div className="flex-1 bg-[#3b82f6]" title="<30°C Safe" />
          <div className="flex-1 bg-[#06b6d4]" title="30-34°C" />
          <div className="flex-1 bg-[#10b981]" title="34-37°C" />
          <div className="flex-1 bg-[#eab308]" title="37-39°C Caution" />
          <div className="flex-1 bg-[#f97316]" title="39-42°C Danger" />
          <div className="flex-1 bg-[#dc2626]" title=">42°C Extreme" />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>&lt;28°C</span>
          <span>36°C</span>
          <span className="text-red-400">&gt;44°C</span>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer
        center={[activeSite.lat, activeSite.lng]}
        zoom={activeSite.zoom || 15}
        className={`w-full ${heightClass} z-0`}
        zoomControl={false}
      >
        <MapCenterController
          lat={activeSite.lat}
          lng={activeSite.lng}
          zoom={activeSite.zoom || 15}
        />

        {/* Dark Mode Basemap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> | FortyGuard tOS Heat Layer'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* FortyGuard Thermal Heat Tiles Layer */}
        {showHeatLayer &&
          thermalTiles.map((tile) => {
            const color = getThermalTileColor(tile.average_temperature);
            const opacity = getThermalOpacity(tile.average_temperature);
            const positions = tile.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);

            return (
              <Polygon
                key={`heat-tile-${tile.tile_id}`}
                positions={positions}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: opacity,
                  color: color,
                  weight: 0.5,
                  opacity: 0.3,
                }}
              >
                <Popup>
                  <div className="p-3 text-xs">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                      <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                      <span>FortyGuard Microclimate Tile #{tile.tile_id}</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-rose-400 my-1">
                      {formatTemp(tile.average_temperature, tempUnit)}
                    </div>
                    <div className="text-slate-400 text-[10px] space-y-0.5 font-mono">
                      <div>Min: {formatTemp(tile.min_temperature, tempUnit)}</div>
                      <div>Max: {formatTemp(tile.max_temperature, tempUnit)}</div>
                      <div className="text-slate-300 pt-1 font-sans">
                        High radiant absorption area (asphalt / metal surface).
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* Cool-Down Stations */}
        {showCoolZones &&
          sites.flatMap((s) =>
            (s.coolZoneStations || []).map((cz) => (
              <Marker key={cz.id} position={[cz.lat, cz.lng]} icon={coolZoneIcon}>
                <Popup>
                  <div className="p-3 text-xs">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                      <span>⛺</span>
                      <span>{cz.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Capacity: {cz.occupied} / {cz.capacity} workers
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Water Supplies: {cz.waterSuppliesLitres}L remaining
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                      {cz.hasMisting ? '✓ High-Pressure Misting Active' : 'Shaded Rest Area'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))
          )}

        {/* Live Field Worker Markers */}
        {displayedWorkers.map((worker) => (
          <Marker
            key={worker.id}
            position={[worker.location.lat, worker.location.lng]}
            icon={createWorkerIcon(worker)}
          >
            <Popup>
              <div className="p-3 w-64 text-xs">
                <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2 mb-2">
                  <div>
                    <h4 className="font-bold text-slate-100">{worker.name}</h4>
                    <p className="text-[11px] text-slate-400">{worker.role}</p>
                  </div>
                  <StatusBadge status={worker.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Microclimate Temp:</span>
                    <span className="font-bold text-rose-400">
                      {formatTemp(worker.currentTemp, tempUnit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Heart Rate:</span>
                    <span className="font-bold text-slate-200">{worker.vitals.heartRate} bpm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Sun Exposure:</span>
                    <span className="font-bold text-slate-200">{worker.timeInSunMinutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Safety Threshold:</span>
                    <span className="font-bold text-amber-300">
                      {formatTemp(worker.customThreshold, tempUnit)}
                    </span>
                  </div>
                </div>

                {/* Actions inside popup */}
                <div className="mt-3 pt-2 border-t border-slate-700/80 flex items-center gap-2">
                  <button
                    onClick={() => sendWorkerBreakAlert(worker.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded bg-rose-600 hover:bg-rose-500 py-1 text-[11px] font-bold text-white transition-colors"
                  >
                    <Coffee className="h-3 w-3" />
                    <span>Order Break</span>
                  </button>
                  <Link
                    to={`/workers/${worker.id}`}
                    className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 transition-colors"
                  >
                    Profile
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
