import type { LatLngBoundsExpression } from 'leaflet';

// Contiguous US bounding box (approximate). Slight padding around the
// continental border so coastal work sites aren't accidentally rejected.
// Format: [[southWest lat, lng], [northEast lat, lng]].
export const US_BOUNDS: LatLngBoundsExpression = [
  [18.0, -125.0],
  [49.5, -66.5],
];

export function isInUS(lat: number, lon: number): boolean {
  return (
    lat >= 18.0 &&
    lat <= 49.5 &&
    lon >= -125.0 &&
    lon <= -66.5
  );
}
