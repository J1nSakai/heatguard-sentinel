import type {
  AlertEntry,
  PinnedLocation,
  SiteReport,
  Subscription,
  SubscriptionCreate,
} from '../types';
import { isInUS } from './us';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  retryable: boolean;

  constructor(status: number, message: string, retryable: boolean) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

export interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
}

// OSM's free geocoder (Nominatim) — same provider family as the basemap,
// no API key. Public service; keep queries modest (one per submit).
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocode(query: string): Promise<GeoResult[]> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '8');
  url.searchParams.set('addressdetails', '1');

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new ApiError(0, 'Could not reach the search service. Check your connection.', true);
  }

  if (!res.ok) {
    throw new ApiError(res.status, `Search service error (${res.status}).`, res.status === 503);
  }

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { country_code?: string };
  }>;

  return results
    .filter((r) => {
      // Keep only US results. Prefer the geocoder's country code when
      // present, and always double-check the coordinates fall in the US box.
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);
      const code = r.address?.country_code?.toLowerCase();
      if (code && code !== 'us') return false;
      return isInUS(lat, lon);
    })
    .map((r) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      display_name: r.display_name,
    }));
}

/** Shared error handling for our own API. 503 is transient -> retryable. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(
      0,
      'Could not reach the HeatGuard Sentinel API. Is the backend running?',
      true,
    );
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        // FastAPI 422 returns an array of validation errors.
        const first = body.detail[0] as { msg?: string } | undefined;
        if (first?.msg) detail = first.msg;
      }
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, detail, res.status === 503);
  }

  return (await res.json()) as T;
}

export async function fetchSiteReport(pin: PinnedLocation): Promise<SiteReport> {
  return request<SiteReport>('/zones/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pin),
  });
}

export async function fetchAlerts(limit = 50): Promise<{ alerts: AlertEntry[]; count: number }> {
  return request<{ alerts: AlertEntry[]; count: number }>(`/alerts?limit=${limit}`);
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const body = await request<{ subscriptions: Subscription[] }>('/alerts/subscriptions');
  return body.subscriptions;
}

export async function createSubscription(sub: SubscriptionCreate): Promise<Subscription> {
  return request<Subscription>('/alerts/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
}

export async function deleteSubscription(id: string): Promise<void> {
  await request<{ deleted: string }>(`/alerts/subscriptions/${id}`, { method: 'DELETE' });
}

/** Evaluate one subscription now. `simulate` skips the live API call. */
export async function checkSubscription(
  id: string,
  simulate = false,
): Promise<AlertEntry> {
  return request<AlertEntry>(
    `/alerts/subscriptions/${id}/check?simulate=${simulate}`,
    { method: 'POST' },
  );
}
