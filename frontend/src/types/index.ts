export type RiskLevel = 'safe' | 'caution' | 'danger' | 'extreme';

export interface WorkerLocation {
  lat: number;
  lng: number;
  siteId: string;
  zoneName: string;
}

export interface WorkerVitals {
  heartRate: number; // bpm
  bodyTemp: number; // °C
  sweatRate?: 'low' | 'moderate' | 'high';
  hydrationLevel: number; // 0 - 100%
  heatStrainIndex: number; // 0 - 10
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  siteId: string;
  siteName: string;
  avatarUrl?: string;
  phone?: string;
  ppeType: string;
  currentTemp: number; // Ambient microclimate temp in °C
  feelsLikeTemp: number;
  heatIndex: number;
  customThreshold: number; // Max allowable temp before alert, default e.g. 38°C
  status: RiskLevel;
  location: WorkerLocation;
  vitals: WorkerVitals;
  timeInSunMinutes: number; // Minutes exposed today
  lastCheckIn: string; // ISO string
  breakRequested: boolean;
  breakRequestTime?: string;
  batteryLevel: number; // Sentinel sensor battery %
}

export interface SiteZone {
  id: string;
  name: string;
  type: 'open_field' | 'heavy_machinery' | 'roof_deck' | 'trench' | 'shade_station';
  currentTemp: number;
  riskLevel: RiskLevel;
  workerCount: number;
}

export interface Site {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  currentTemp: number; // City/ambient avg °C
  peakTempToday: number;
  humidity: number; // %
  solarRadiation: number; // W/m²
  heatIndex: number; // FortyGuard computed heat index
  workerCount: number;
  atRiskCount: number;
  extremeCount: number;
  cautionCount: number;
  safeCount: number;
  coolZoneStations: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    capacity: number;
    occupied: number;
    hasMisting: boolean;
    waterSuppliesLitres: number;
  }[];
  zones: SiteZone[];
}

export interface SafetyAlert {
  id: string;
  workerId?: string;
  workerName?: string;
  siteId: string;
  siteName: string;
  timestamp: string; // ISO string
  severity: RiskLevel;
  type: 'threshold_exceeded' | 'emergency_sos' | 'break_requested' | 'heat_spike' | 'hydration_needed' | 'high_exposure';
  title: string;
  message: string;
  temperature?: number;
  threshold?: number;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface FortyGuardHeatTile {
  tile_id: number;
  average_temperature: number;
  min_temperature: number;
  max_temperature: number;
  coordinates: number[][][]; // Polygon coords [ [ [lng, lat], ... ] ]
}

export interface FortyGuardHeatmapData {
  aoi_name: string;
  generated_at: string;
  mean_temp: number;
  min_temp: number;
  max_temp: number;
  tiles: FortyGuardHeatTile[];
}

export interface KpiSummary {
  totalWorkers: number;
  atRiskWorkers: number; // danger + extreme
  extremeWorkers: number;
  safeWorkers: number;
  cautionWorkers: number;
  activeSites: number;
  alertsToday: number;
  unacknowledgedAlerts: number;
  breakRequestsPending: number;
  avgSiteTemp: number;
  highestTempRecorded: number;
}
