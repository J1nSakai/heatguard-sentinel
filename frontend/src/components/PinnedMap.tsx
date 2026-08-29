import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { isInUS, US_BOUNDS } from '../lib/us';

export interface Pin {
  lat: number;
  lon: number;
}

const startPos: [number, number] = [33.4484, -112.074]; // Phoenix, AZ

// OSM basemap — free, no API key, no watermark (replaces CARTO's keyed
// anonymous tile server that was dropping "API KEY REQUIRED" tiles).
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface ClickProps {
  onSelect: (p: Pin) => void;
  onOutOfUS: () => void;
}

function ClickHandler({ onSelect, onOutOfUS }: ClickProps) {
  useMapEvents({
    click(e) {
      const { lat, lng: lon } = e.latlng;
      if (isInUS(lat, lon)) {
        onSelect({ lat, lon });
      } else {
        onOutOfUS();
      }
    },
  });
  return null;
}

// Recenter (fly) the map whenever the pin moves — both when the user
// clicks the map and when they pick a result from the search bar.
function FollowPin({ pin }: { pin: Pin | null }) {
  const map = useMap();
  useEffect(() => {
    if (pin) {
      map.flyTo([pin.lat, pin.lon], Math.max(map.getZoom(), 12));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);
  return null;
}

interface Props {
  pin: Pin | null;
  onSelect: (p: Pin) => void;
  onOutOfUS: () => void;
}

export function PinnedMap({ pin, onSelect, onOutOfUS }: Props) {
  useEffect(() => {
    // react-leaflet markers use a default icon URL that 404s under Vite;
    // give every marker a plain red pin from leaflet's own dist assets.
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = icon;
  }, []);

  return (
    <MapContainer
      center={startPos}
      zoom={7}
      className="h-full w-full"
      scrollWheelZoom
      maxBounds={US_BOUNDS}
      maxBoundsViscosity={1.0}
    >
      <TileLayer attribution={OSM_ATTR} url={OSM_URL} maxZoom={19} />
      <FollowPin pin={pin} />
      <ClickHandler onSelect={onSelect} onOutOfUS={onOutOfUS} />
      {pin && <Marker position={[pin.lat, pin.lon]} />}
    </MapContainer>
  );
}
