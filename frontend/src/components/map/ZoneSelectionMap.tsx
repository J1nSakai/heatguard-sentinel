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

// Create a custom icon for the user's clicked location
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

// Helper component to center map smoothly when selected zone changes
const MapCenterController: React.FC<{ lat: number; lng: number; zoom: number }> = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
};

// Helper component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface ZoneSelectionMapProps {
  zones: Zone[];
  selectedZoneId: string | null;
  clickedLocation: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onZoneMarkerClick: (zoneId: string) => void;
}

export const ZoneSelectionMap: React.FC<ZoneSelectionMapProps> = ({
  zones,
  selectedZoneId,
  clickedLocation,
  onMapClick,
  onZoneMarkerClick,
}) => {
  // Determine center. Default to Phoenix if no zones or selection.
  let centerLat = 33.4484;
  let centerLng = -112.0740;
  
  if (clickedLocation) {
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
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-inner h-[280px]">
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
                click: () => onZoneMarkerClick(zone.id),
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

        {/* Render clicked location marker if it exists */}
        {clickedLocation && (
          <Marker position={[clickedLocation.lat, clickedLocation.lng]} icon={clickIcon} />
        )}
      </MapContainer>
      
      {/* Map Overlay Instructions */}
      <div className="absolute top-3 left-3 z-[400] pointer-events-none">
        <div className="rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md shadow-xl text-xs font-semibold text-slate-300">
          📍 Click anywhere to find the nearest zone
        </div>
      </div>
    </div>
  );
};
