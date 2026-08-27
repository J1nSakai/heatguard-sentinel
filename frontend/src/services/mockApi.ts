import { Worker, Site, SafetyAlert, RiskLevel } from '../types';
import { INITIAL_WORKERS, INITIAL_SITES, INITIAL_ALERTS } from '../constants/mockData';
import { getRiskLevel } from '../constants/riskLevels';

const WORKERS_STORAGE_KEY = 'fortyguard_workers_v1';
const SITES_STORAGE_KEY = 'fortyguard_sites_v1';
const ALERTS_STORAGE_KEY = 'fortyguard_alerts_v1';

export class MockApiService {
  // --- Workers CRUD ---
  static getWorkers(): Worker[] {
    const saved = localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(INITIAL_WORKERS));
      return INITIAL_WORKERS;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_WORKERS;
    }
  }

  static saveWorkers(workers: Worker[]): void {
    localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
  }

  static getWorkerById(id: string): Worker | undefined {
    const workers = this.getWorkers();
    return workers.find((w) => w.id === id);
  }

  static addWorker(workerData: Omit<Worker, 'id' | 'status' | 'feelsLikeTemp' | 'heatIndex' | 'lastCheckIn' | 'breakRequested' | 'batteryLevel' | 'vitals'>): Worker {
    const workers = this.getWorkers();
    const newId = `w-${Date.now().toString().slice(-4)}`;
    const status = getRiskLevel(workerData.currentTemp, workerData.customThreshold);

    const newWorker: Worker = {
      ...workerData,
      id: newId,
      status,
      feelsLikeTemp: parseFloat((workerData.currentTemp + 2.5).toFixed(1)),
      heatIndex: parseFloat((workerData.currentTemp + 2.1).toFixed(1)),
      lastCheckIn: new Date().toISOString(),
      breakRequested: false,
      batteryLevel: 99,
      vitals: {
        heartRate: 78,
        bodyTemp: 37.0,
        sweatRate: 'low',
        hydrationLevel: 95,
        heatStrainIndex: 1.5,
      },
    };

    workers.unshift(newWorker);
    this.saveWorkers(workers);
    return newWorker;
  }

  static updateWorker(id: string, updates: Partial<Worker>): Worker | undefined {
    const workers = this.getWorkers();
    const index = workers.findIndex((w) => w.id === id);
    if (index === -1) return undefined;

    const current = workers[index];
    const updatedWorker: Worker = {
      ...current,
      ...updates,
    };

    if (updates.currentTemp !== undefined || updates.customThreshold !== undefined) {
      updatedWorker.status = getRiskLevel(
        updatedWorker.currentTemp,
        updatedWorker.customThreshold
      );
      updatedWorker.feelsLikeTemp = parseFloat((updatedWorker.currentTemp + 2.4).toFixed(1));
      updatedWorker.heatIndex = parseFloat((updatedWorker.currentTemp + 2.0).toFixed(1));
    }

    workers[index] = updatedWorker;
    this.saveWorkers(workers);
    return updatedWorker;
  }

  static deleteWorker(id: string): boolean {
    const workers = this.getWorkers();
    const filtered = workers.filter((w) => w.id !== id);
    if (filtered.length === workers.length) return false;
    this.saveWorkers(filtered);
    return true;
  }

  // --- Sites CRUD ---
  static getSites(): Site[] {
    const saved = localStorage.getItem(SITES_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(INITIAL_SITES));
      return INITIAL_SITES;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_SITES;
    }
  }

  static saveSites(sites: Site[]): void {
    localStorage.setItem(SITES_STORAGE_KEY, JSON.stringify(sites));
  }

  static getSiteById(id: string): Site | undefined {
    const sites = this.getSites();
    return sites.find((s) => s.id === id);
  }

  static addSite(siteData: Omit<Site, 'id' | 'workerCount' | 'atRiskCount' | 'extremeCount' | 'cautionCount' | 'safeCount'>): Site {
    const sites = this.getSites();
    const newId = `site-${Date.now().toString().slice(-4)}`;
    const newSite: Site = {
      ...siteData,
      id: newId,
      workerCount: 0,
      atRiskCount: 0,
      extremeCount: 0,
      cautionCount: 0,
      safeCount: 0,
    };
    sites.push(newSite);
    this.saveSites(sites);
    return newSite;
  }

  static updateSite(id: string, updates: Partial<Site>): Site | undefined {
    const sites = this.getSites();
    const idx = sites.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    sites[idx] = { ...sites[idx], ...updates };
    this.saveSites(sites);
    return sites[idx];
  }

  static deleteSite(id: string): boolean {
    const sites = this.getSites();
    const filtered = sites.filter((s) => s.id !== id);
    if (filtered.length === sites.length) return false;
    this.saveSites(filtered);
    return true;
  }

  // --- Alerts CRUD ---
  static getAlerts(): SafetyAlert[] {
    const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(INITIAL_ALERTS));
      return INITIAL_ALERTS;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_ALERTS;
    }
  }

  static saveAlerts(alerts: SafetyAlert[]): void {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }

  static addAlert(alert: Omit<SafetyAlert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): SafetyAlert {
    const alerts = this.getAlerts();
    const newAlert: SafetyAlert = {
      ...alert,
      id: `alt-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
    };
    alerts.unshift(newAlert);
    this.saveAlerts(alerts);
    return newAlert;
  }

  static acknowledgeAlert(id: string, acknowledgedBy: string = 'Safety Lead'): SafetyAlert | undefined {
    const alerts = this.getAlerts();
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return undefined;
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = acknowledgedBy;
    this.saveAlerts(alerts);
    return alert;
  }

  static resolveAlert(id: string): SafetyAlert | undefined {
    const alerts = this.getAlerts();
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return undefined;
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    this.saveAlerts(alerts);
    return alert;
  }

  static resetToDefaults(): void {
    localStorage.removeItem(WORKERS_STORAGE_KEY);
    localStorage.removeItem(SITES_STORAGE_KEY);
    localStorage.removeItem(ALERTS_STORAGE_KEY);
  }
}
