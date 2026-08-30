/**
 * Utility functions for geographic coordinates.
 */

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of the first point
 * @param lon1 Longitude of the first point
 * @param lat2 Latitude of the second point
 * @param lon2 Longitude of the second point
 * @returns The distance in kilometers
 */
export function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * US bounding boxes (approximate):
 *  - Contiguous 48 states
 *  - Alaska
 *  - Hawaii
 *
 * Returns true if the coordinate falls inside any of these regions.
 * Used to validate user-typed lat/lng before pinning the map.
 */
export function isWithinUSA(lat: number, lon: number): boolean {
  // Contiguous 48 states
  const contiguous =
    lat >= 24.396308 && lat <= 49.384358 &&
    lon >= -125.001651 && lon <= -66.93457;

  // Alaska (very rough bounding box)
  const alaska =
    lat >= 51.2 && lat <= 71.5 &&
    lon >= -180.0 && lon <= -129.0;

  // Hawaii (rough bounding box)
  const hawaii =
    lat >= 18.9 && lat <= 22.25 &&
    lon >= -160.3 && lon <= -154.8;

  return contiguous || alaska || hawaii;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

/**
 * Geocodes an address or place name within the United States using OpenStreetMap Nominatim.
 * Automatically filters results to ensure coordinates are inside US borders.
 */
export async function geocodeAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    trimmed
  )}&countrycodes=us&limit=5&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error('Geocoding service unavailable');
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name,
    }))
    .filter((item: GeocodeResult) => !isNaN(item.lat) && !isNaN(item.lon) && isWithinUSA(item.lat, item.lon));
}

