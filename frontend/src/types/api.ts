// ──────────────────────────────────────────────────────────────────────────────
// Backend API Types — matches the FastAPI contract at http://localhost:8000
// ──────────────────────────────────────────────────────────────────────────────

/** Risk levels as returned by the backend */
export type BackendRiskLevel = 'lower' | 'moderate' | 'high' | 'very_high';

/** Backend action types */
export type CheckAction = 'log_only' | 'alert';

// ── GET /zones ──────────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  name: string;
  worker_type: string;
  lat: number;
  lon: number;
  address_hint: string;
}

export interface ZonesResponse {
  zones: Zone[];
}

// ── POST /zones/report ───────────────────────────────────────────────────────

export interface PinnedLocationRequest {
  lat: number;
  lon: number;
  name?: string;
  worker_type?: string;
  window_days?: number;
  profile_days?: number;
}

// ── POST /zones/{zone_id}/check ─────────────────────────────────────────────

export interface CheckRequest {
  recipient_email?: string;
  alert_threshold?: number;
  simulate?: boolean;
  simulate_temp_c?: number;
}

export interface HistoricalContext {
  exceedance: {
    mean_hours: number;
  };
  persistence: {
    mean_hours: number;
  };
}

export interface CheckResponse {
  zone_id: string;
  zone_name: string;
  timestamp: string;
  apparent_temperature_c: number;
  risk_level: BackendRiskLevel;
  risk_label: string;
  guidance: string;
  action: CheckAction;
  /** Present only when action === "alert" */
  explanation?: string;
  /** Present only for non-simulated (live) checks */
  historical_context?: HistoricalContext;
  /** Whether the notification threshold was exceeded */
  threshold_exceeded?: boolean;
  /** Whether a notification was triggered for this event */
  notification_triggered?: boolean;
}

// ── GET /zones/{zone_id}/report ─────────────────────────────────────────────

export interface ReportBlock {
  block_id: number;
  label: string;
  avg_temp_c: number;
}

export interface ReportResponse {
  zone_id: string;
  zone_name: string;
  worker_type: string;
  generated_at: string;
  risk_window: {
    start_date: string;
    end_date: string;
    window_days: number;
  };
  threshold_c: number;
  exceedance: {
    units: string;
    n_cells: number;
    min_hours: number;
    max_hours: number;
    mean_hours: number;
  };
  persistence: {
    units: string;
    n_cells: number;
    min_hours: number;
    max_hours: number;
    mean_hours: number;
  };
  pct_time_in_danger: number;
  risk_label: string;
  time_of_day: {
    profile_dates: string[];
    ranked_blocks: ReportBlock[];
    safest_block: ReportBlock | null;
  };
  why_hot?: any;
}

// ── GET /zones/{zone_id}/alerts?limit=50 ────────────────────────────────────

export interface AlertsResponse {
  zone_id: string;
  alerts: CheckResponse[];
}

// ── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}
