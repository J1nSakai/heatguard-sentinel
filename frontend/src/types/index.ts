export interface StatsSummary {
  units: string;
  n_cells: number;
  // null when FortyGuard had no tiles for this AOI — "unmeasured", NOT zero.
  min_hours: number | null;
  max_hours: number | null;
  mean_hours: number | null;
  no_coverage: boolean;
}

export interface RankedBlock {
  block_id: string;
  label: string;
  avg_temp_c: number | null;
}

export interface WhyHot {
  image_year: number;
  raw_segments: Record<string, number>;
  impervious_pct: number;
  vegetation_pct: number;
  other_pct: number;
  // True when most of the satellite image didn't classify, so the buckets
  // can't support a conclusion about the heat.
  unclassified_dominant: boolean;
  explanation: string;
}

export interface SiteReport {
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
  exceedance: StatsSummary;
  persistence: StatsSummary;
  // null when unmeasured — never render this as 0%.
  pct_time_in_danger: number | null;
  risk_label: string;
  no_coverage: boolean;
  aoi: {
    box_metres: number;
    widened: boolean;
  };
  time_of_day: {
    profile_dates: string[];
    ranked_blocks: RankedBlock[];
    safest_block: RankedBlock | null;
  };
  why_hot: WhyHot | null;
}

export interface PinnedLocation {
  lat: number;
  lon: number;
  name: string;
  worker_type: string;
  window_days: number;
  profile_days: number;
}

/** OSHA tier vocabulary — mirrors config/osha_thresholds.json. */
export type RiskTier = 'lower' | 'moderate' | 'high' | 'very_high';

export interface Subscription {
  id: string;
  lat: number;
  lon: number;
  name: string;
  worker_type: string;
  email: string;
  min_tier: RiskTier;
  created_at: string;
  last_checked_at: string | null;
  last_alert_at: string | null;
}

export interface SubscriptionCreate {
  lat: number;
  lon: number;
  email: string;
  name: string;
  worker_type: string;
  min_tier: RiskTier;
}

/** One entry from the agent's fired-alert log (data/logs/alerts.jsonl). */
export interface AlertEntry {
  zone_id: string;
  zone_name: string;
  timestamp: string;
  apparent_temperature_c: number;
  risk_level: RiskTier | 'unknown';
  risk_label: string;
  guidance: string;
  action: 'alert' | 'log_only';
  simulated: boolean;
  explanation?: string;
}

export interface ApiErrorDetail {
  detail: string;
}
