import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Zone } from '../../types/api';

// Create a custom DivIcon for zone markers (unchanged)
const createZoneIcon = (isSelected: boolean) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-4 h-4 rounded-full border-2 shadow-lg transition-colors ${
          isSelected
            ? 'bg-indigo-500 border-white scale-125 z-10 animate-pulse'
            : 'bg-slate-700 border-slate-400'
        }"></div>
      </div>
    `,
    className: 'custom-zone-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Create a custom icon for the user's clicked location (map click → nearest zone snap)
const clickIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-lg animate-ping absolute"></div>
      <div class="w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-lg relative"></div>
    </div>
  `,
  className: 'custom-click-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Distinct crosshair icon for the manually typed coordinate pin
const pinnedIcon = L.divIcon({
  html: `
    <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center">
      <div style="width:14px;height:14px;border-radius:50%;background:#6366f1;border:2px solid #fff;box-shadow:0 0 0 3px rgba(99,102,241,0.35);position:relative;z-index:1"></div>
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(99,102,241,0.18);animation:pinPulse 1.6s ease-out infinite"></div>
    </div>
    <style>@keyframes pinPulse{0%{transform:scale(1);opacity:.7}70%{transform:scale(2);opacity:0}100%{transform:scale(2);opacity:0}}</style>
  `,
  className: 'custom-pinned-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Helper component to center map smoothly when selected zone changes
const MapCenterController: React.FC<{ lat: number; lng: number; zoom: number }> = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
};

// Helper component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void; disabled?: boolean }> = ({ onMapClick, disabled }) => {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

interface ZoneSelectionMapProps {
  zones: Zone[];
  selectedZoneId: string | null;
  clickedLocation: { lat: number; lng: number } | null;
  /** Manually typed lat/lng coordinate — rendered as an indigo pin, separate from the click-snapped marker */
  pinnedLocation: { lat: number; lng: number } | null;
  disabled?: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onZoneMarkerClick: (zoneId: string) => void;
}

export const ZoneSelectionMap: React.FC<ZoneSelectionMapProps> = ({
  zones,
  selectedZoneId,
  clickedLocation,
  pinnedLocation,
  disabled = false,
  onMapClick,
  onZoneMarkerClick,
}) => {
  // Priority: typed pin > map click > selected zone > first zone > Phoenix default
  let centerLat = 33.4484;
  let centerLng = -112.0740;

  if (pinnedLocation) {
    centerLat = pinnedLocation.lat;
    centerLng = pinnedLocation.lng;
  } else if (clickedLocation) {
    centerLat = clickedLocation.lat;
    centerLng = clickedLocation.lng;
  } else if (selectedZoneId && zones.length > 0) {
    const selectedZone = zones.find(z => z.id === selectedZoneId);
    if (selectedZone) {
      centerLat = selectedZone.lat;
      centerLng = selectedZone.lon;
    }
  } else if (zones.length > 0) {
    centerLat = zones[0].lat;
    centerLng = zones[0].lon;
  }

  return (
    <div className="relative overflow-hidden w-full h-full bg-slate-900">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <MapCenterController lat={centerLat} lng={centerLng} zoom={12} />
        <MapClickHandler onMapClick={onMapClick} />

        {/* Light Mode Basemap Tiles */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Render available zones */}
        {zones.map((zone) => {
          const isSelected = zone.id === selectedZoneId;
          return (
            <Marker
              key={zone.id}
              position={[zone.lat, zone.lon]}
              icon={createZoneIcon(isSelected)}
              eventHandlers={{
                click: () => {
                  if (!disabled) {
                    onZoneMarkerClick(zone.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="font-bold text-slate-800">{zone.name}</div>
                  <div className="text-slate-500 capitalize">{zone.worker_type.replace('_', ' ')}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render map-click snap marker */}
        {clickedLocation && (
          <Marker position={[clickedLocation.lat, clickedLocation.lng]} icon={clickIcon} />
        )}

        {/* Render manually typed coordinate pin */}
        {pinnedLocation && (
          <Marker position={[pinnedLocation.lat, pinnedLocation.lng]} icon={pinnedIcon}>
            <Popup>
              <div className="text-xs p-1">
                <div className="font-bold text-slate-800">Pinned Location</div>
                <div className="text-slate-500 font-mono">{pinnedLocation.lat.toFixed(5)}, {pinnedLocation.lng.toFixed(5)}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Locked Overlay during Active Analysis */}
      {disabled && (
        <div className="absolute inset-0 z-[500] bg-stone-950/20 backdrop-blur-[1px] cursor-not-allowed flex items-start justify-center pt-3 pointer-events-auto">
          <div className="bg-stone-900/95 text-stone-200 border border-stone-700 px-3.5 py-1.5 rounded-full shadow-2xl text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            Analysis in progress · Map interaction locked
          </div>
        </div>
      )}
    </div>
  );
};
