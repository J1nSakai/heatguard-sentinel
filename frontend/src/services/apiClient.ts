// ──────────────────────────────────────────────────────────────────────────────
// HTTP API Client — communicates with the FastAPI backend at localhost:8000
// ──────────────────────────────────────────────────────────────────────────────

import type {
  ZonesResponse,
  CheckRequest,
  CheckResponse,
  AlertsResponse,
  ReportResponse,
  ApiError,
} from '../types/api';

/** Base URL — configurable via Vite env var, defaults to localhost:8000 */
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000';

// ── Error Helpers ───────────────────────────────────────────────────────────

function getHttpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request — please check your input.';
    case 401:
      return 'Unauthorized — authentication required.';
    case 403:
      return 'Forbidden — you do not have permission.';
    case 404:
      return 'Not found — the requested zone does not exist.';
    case 422:
      return 'Validation error — the server rejected the request data.';
    case 429:
      return 'Too many requests — please wait before trying again.';
    case 500:
      return 'Internal server error — the backend encountered an issue.';
    default:
      if (status >= 500) return `Server error (${status}) — please try again later.`;
      if (status >= 400) return `Request error (${status}).`;
      return `Unexpected response (${status}).`;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      detail = body.detail || body.message || JSON.stringify(body);
    } catch {
      // body may not be JSON
    }

    const error: ApiError = {
      status: response.status,
      message: getHttpErrorMessage(response.status),
      detail,
    };
    throw error;
  }
  return response.json() as Promise<T>;
}

// ── API Methods ─────────────────────────────────────────────────────────────

/**
 * GET /zones — Fetch all available construction-site zones.
 */
export async function fetchZones(signal?: AbortSignal): Promise<ZonesResponse> {
  const response = await fetch(`${API_BASE_URL}/zones`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  return handleResponse<ZonesResponse>(response);
}

/**
 * POST /zones/{zone_id}/check — Run a heat-safety check for a zone.
 *
 * Live checks can take 1–3 minutes. Pass an AbortSignal if you want
 * the caller to be able to cancel.
 */
export async function checkZone(
  zoneId: string,
  body: CheckRequest = {},
  signal?: AbortSignal
): Promise<CheckResponse> {
  const response = await fetch(`${API_BASE_URL}/zones/${encodeURIComponent(zoneId)}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return handleResponse<CheckResponse>(response);
}

/**
 * GET /zones/{zone_id}/report — Fetch historical pattern report.
 * Priority 3 endpoint.
 */
export async function fetchReport(
  zoneId: string,
  windowDays: number = 7,
  profileDays: number = 3,
  signal?: AbortSignal
): Promise<ReportResponse> {
  const params = new URLSearchParams({
    window_days: String(windowDays),
    profile_days: String(profileDays),
  });
  const response = await fetch(
    `${API_BASE_URL}/zones/${encodeURIComponent(zoneId)}/report?${params}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal,
    }
  );
  return handleResponse<ReportResponse>(response);
}

/**
 * POST /zones/report — Fetch historical pattern report for a custom pinned coordinate.
 */
export async function fetchPinnedReport(
  location: import('../types/api').PinnedLocationRequest,
  signal?: AbortSignal
): Promise<ReportResponse> {
  const response = await fetch(`${API_BASE_URL}/zones/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
    signal,
  });
  return handleResponse<ReportResponse>(response);
}

/**
 * GET /zones/alerts — Fetch all fired alert history (across all zones).
 * Returns the most recent `limit` entries from the server-side alerts.jsonl log,
 * newest first.
 */
export async function fetchAlerts(
  limit: number = 50,
  signal?: AbortSignal
): Promise<AlertsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(
    `${API_BASE_URL}/zones/alerts?${params}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal,
    }
  );
  return handleResponse<AlertsResponse>(response);
}

// ── Utility ─────────────────────────────────────────────────────────────────

/**
 * Type guard to check if an error is an ApiError from this client.
 */
export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'message' in err &&
    typeof (err as ApiError).status === 'number'
  );
}

/**
 * Returns a user-friendly error message from any error type.
 */
export function getErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    return err.detail ? `${err.message} ${err.detail}` : err.message;
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'Request was cancelled.';
  }
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return 'Cannot reach the backend server. Is it running at ' + API_BASE_URL + '?';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred.';
}
