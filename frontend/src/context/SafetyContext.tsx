import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Worker, Site, SafetyAlert, KpiSummary, RiskLevel } from '../types';
import type { Zone, CheckResponse, CheckRequest } from '../types/api';

import { realtimeSafetyService } from '../services/websocketService';
import { fetchZones, checkZone, getErrorMessage } from '../services/apiClient';
import { useToast } from './ToastContext';
import { getRiskLevel } from '../constants/riskLevels';

interface SafetyContextType {
  workers: Worker[];
  sites: Site[];
  alerts: SafetyAlert[];
  selectedSiteId: string;
  setSelectedSiteId: (id: string) => void;
  tempUnit: 'C' | 'F';
  setTempUnit: (unit: 'C' | 'F') => void;
  kpiSummary: KpiSummary;
  connectionMode: 'live_socket' | 'simulated_engine';
  isLiveConnected: boolean;
  
  // Worker Actions
  addWorker: (workerData: Omit<Worker, 'id' | 'status' | 'feelsLikeTemp' | 'heatIndex' | 'lastCheckIn' | 'breakRequested' | 'batteryLevel' | 'vitals'>) => void;
  updateWorker: (id: string, updates: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  sendWorkerBreakAlert: (workerId: string) => void;
  sendWorkerHydrationReminder: (workerId: string) => void;
  bulkSendBreakAlert: (workerIds: string[]) => void;
  
  // Site Actions
  addSite: (siteData: Omit<Site, 'id' | 'workerCount' | 'atRiskCount' | 'extremeCount' | 'cautionCount' | 'safeCount'>) => void;
  updateSite: (id: string, updates: Partial<Site>) => void;
  deleteSite: (id: string) => void;
  
  // Alert Actions
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  
  // Simulation Triggers
  simulateHeatSpike: (siteId?: string) => void;
  simulateWorkerSos: (workerId?: string) => void;
  resetAllData: () => void;

  // ── Backend API State ──────────────────────────────────────────────────
  zones: Zone[];
  zonesLoading: boolean;
  zonesError: string | null;
  selectedZoneId: string | null;
  setSelectedZoneId: (id: string | null) => void;
  checkResult: CheckResponse | null;
  checkLoading: boolean;
  checkError: string | null;
  checkStartTime: number | null;
  isCheckSimulated: boolean;
  loadZones: () => Promise<void>;
  performCheck: (zoneId: string, options?: CheckRequest) => Promise<void>;
  performSimulation: (zoneId: string, tempC?: number) => Promise<void>;
  cancelCheck: () => void;
  clearCheckResult: () => void;
}

const SafetyContext = createContext<SafetyContextType | undefined>(undefined);

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [connectionMode, setConnectionMode] = useState<'live_socket' | 'simulated_engine'>('simulated_engine');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // ── Backend API State ──────────────────────────────────────────────────
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState<boolean>(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);
  const [checkLoading, setCheckLoading] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkStartTime, setCheckStartTime] = useState<number | null>(null);
  const [isCheckSimulated, setIsCheckSimulated] = useState<boolean>(false);
  const checkAbortRef = useRef<AbortController | null>(null);

  // Track latest workers state to avoid stale closures in subscriptions without putting side-effects in state updaters
  const workersRef = useRef(workers);
  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);




  // Subscribe to real-time service updates
  useEffect(() => {
    const unsubConn = realtimeSafetyService.subscribeConnection((connected, mode) => {
      setIsLiveConnected(connected);
      setConnectionMode(mode);
    });

    const unsubAlert = realtimeSafetyService.subscribeAlert((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
      showToast({
        title: newAlert.title,
        message: newAlert.message,
        severity: newAlert.severity,
        alert: newAlert,
      });
    });

    const unsubStatus = realtimeSafetyService.subscribeStatus((workerId, updates: any) => {
      const currentWorkers = workersRef.current;
      const worker = currentWorkers.find((w) => w.id === workerId);
      if (!worker) return;

      let newTemp = worker.currentTemp;
      if (updates.currentTempDelta !== undefined) {
        newTemp = parseFloat(Math.max(24, Math.min(50, worker.currentTemp + updates.currentTempDelta)).toFixed(1));
      } else if (updates.currentTemp !== undefined) {
        newTemp = updates.currentTemp;
      }

      const newStatus = getRiskLevel(newTemp, worker.customThreshold);

      // Trigger toasts BEFORE state update to avoid calling them inside the pure updater function
      if (newStatus === 'extreme' && worker.status !== 'extreme') {
        showToast({
          title: `🔥 CRITICAL HEAT: ${worker.name}`,
          message: `${worker.name} entered EXTREME risk zone (${newTemp}°C). Evacuation or shade break required!`,
          severity: 'extreme',
        });
      } else if (newStatus === 'danger' && (worker.status === 'safe' || worker.status === 'caution')) {
        showToast({
          title: `🔴 Danger Threshold Exceeded: ${worker.name}`,
          message: `${worker.name} is now at ${newTemp}°C (Limit: ${worker.customThreshold}°C).`,
          severity: 'danger',
        });
      }

      setWorkers((prevWorkers) =>
        prevWorkers.map((w) => {
          if (w.id !== workerId) return w;

          let updatedVitals = { ...w.vitals };
          if (updates.hrDelta !== undefined) {
            updatedVitals.heartRate = Math.max(60, Math.min(180, w.vitals.heartRate + updates.hrDelta));
          }
          if (updates.vitals) {
            updatedVitals = { ...updatedVitals, ...updates.vitals };
          }

          return {
            ...w,
            ...updates,
            currentTemp: newTemp,
            feelsLikeTemp: parseFloat((newTemp + 2.6).toFixed(1)),
            heatIndex: parseFloat((newTemp + 2.2).toFixed(1)),
            status: newStatus,
            vitals: updatedVitals,
            lastCheckIn: new Date().toISOString(),
          };
        })
      );
    });

    return () => {
      unsubConn();
      unsubAlert();
      unsubStatus();
    };
  }, [showToast]);

  // Compute updated site worker counts
  useEffect(() => {
    setSites((prevSites) =>
      prevSites.map((site) => {
        const siteWorkers = workers.filter((w) => w.siteId === site.id);
        const atRisk = siteWorkers.filter((w) => w.status === 'danger' || w.status === 'extreme').length;
        const extreme = siteWorkers.filter((w) => w.status === 'extreme').length;
        const caution = siteWorkers.filter((w) => w.status === 'caution').length;
        const safe = siteWorkers.filter((w) => w.status === 'safe').length;

        return {
          ...site,
          workerCount: siteWorkers.length,
          atRiskCount: atRisk,
          extremeCount: extreme,
          cautionCount: caution,
          safeCount: safe,
        };
      })
    );
  }, [workers]);

  // Dynamic KPI calculations
  const kpiSummary = useMemo<KpiSummary>(() => {
    const filteredWorkers = selectedSiteId === 'all' ? workers : workers.filter((w) => w.siteId === selectedSiteId);
    const filteredAlerts = selectedSiteId === 'all' ? alerts : alerts.filter((a) => a.siteId === selectedSiteId);
    const filteredSites = selectedSiteId === 'all' ? sites : sites.filter((s) => s.id === selectedSiteId);

    const atRiskWorkers = filteredWorkers.filter((w) => w.status === 'danger' || w.status === 'extreme').length;
    const extremeWorkers = filteredWorkers.filter((w) => w.status === 'extreme').length;
    const safeWorkers = filteredWorkers.filter((w) => w.status === 'safe').length;
    const cautionWorkers = filteredWorkers.filter((w) => w.status === 'caution').length;
    const unacknowledged = filteredAlerts.filter((a) => !a.acknowledged).length;
    const breakRequests = filteredWorkers.filter((w) => w.breakRequested).length;

    const temps = filteredWorkers.map((w) => w.currentTemp);
    const highestTempRecorded = temps.length > 0 ? Math.max(...temps) : 0;
    const avgSiteTemp = filteredSites.length > 0 ? filteredSites.reduce((acc, s) => acc + s.currentTemp, 0) / filteredSites.length : 0;

    return {
      totalWorkers: filteredWorkers.length,
      atRiskWorkers,
      extremeWorkers,
      safeWorkers,
      cautionWorkers,
      activeSites: filteredSites.length,
      alertsToday: filteredAlerts.length,
      unacknowledgedAlerts: unacknowledged,
      breakRequestsPending: breakRequests,
      avgSiteTemp: parseFloat(avgSiteTemp.toFixed(1)),
      highestTempRecorded: parseFloat(highestTempRecorded.toFixed(1)),
    };
  }, [workers, alerts, sites, selectedSiteId]);

  // Worker Handlers
  const addWorker = useCallback(
    (workerData: Omit<Worker, 'id' | 'status' | 'feelsLikeTemp' | 'heatIndex' | 'lastCheckIn' | 'breakRequested' | 'batteryLevel' | 'vitals'>) => {
      setWorkers((prev) => {
        const newW = { 
          ...workerData, 
          id: `w-temp-${Date.now()}`, 
          status: 'safe' as const, 
          feelsLikeTemp: workerData.currentTemp, 
          heatIndex: workerData.currentTemp, 
          lastCheckIn: new Date().toISOString(),
          vitals: { heartRate: 75, bodyTemp: 37.0, hydrationLevel: 100, heatStrainIndex: 1.0 },
          breakRequested: false,
          batteryLevel: 100
        };
        return [...prev, newW];
      });
      showToast({
        title: 'Worker Registered',
        message: `Worker added to Sentinel monitoring system.`,
        severity: 'safe',
      });
    },
    [showToast]
  );

  const updateWorker = useCallback((id: string, updates: Partial<Worker>) => {
    setWorkers((prev) => {
      return prev.map(w => w.id === id ? { ...w, ...updates } : w);
    });
  }, []);

  const deleteWorker = useCallback(
    (id: string) => {
      const target = workers.find((w) => w.id === id);
      setWorkers((prev) => {
        return prev.filter((w) => w.id !== id);
      });
      showToast({
        title: 'Worker Removed',
        message: `${target?.name || 'Worker'} deleted from Sentinel registry.`,
        severity: 'caution',
      });
    },
    [workers, showToast]
  );

  const sendWorkerBreakAlert = useCallback(
    (workerId: string) => {
      const worker = workers.find((w) => w.id === workerId);
      if (!worker) return;

      updateWorker(workerId, {
        breakRequested: true,
        breakRequestTime: new Date().toISOString(),
      });

      setAlerts((prev) => {
        const alert = {
          id: `alert-temp-${Date.now()}`,
          workerId: worker.id,
          workerName: worker.name,
          siteId: worker.siteId,
          siteName: worker.siteName,
          severity: 'caution' as const,
          type: 'break_requested' as const,
          title: `Manager Dispatched Break: ${worker.name}`,
          message: `Safety manager commanded 15-min mandatory cooling rotation to nearest hydration post.`,
          temperature: worker.currentTemp,
          threshold: worker.customThreshold,
          acknowledged: false,
          resolved: false,
          timestamp: new Date().toISOString()
        };
        return [alert, ...prev];
      });

      showToast({
        title: 'Break Order Dispatched',
        message: `Break alert transmitted directly to ${worker.name}'s Sentinel device.`,
        severity: 'caution',
      });
    },
    [workers, updateWorker, showToast]
  );

  const sendWorkerHydrationReminder = useCallback(
    (workerId: string) => {
      const worker = workers.find((w) => w.id === workerId);
      if (!worker) return;

      setAlerts((prev) => {
        const alert = {
          id: `alert-temp-${Date.now()}`,
          workerId: worker.id,
          workerName: worker.name,
          siteId: worker.siteId,
          siteName: worker.siteName,
          severity: 'safe' as const,
          type: 'hydration_needed' as const,
          title: `Hydration Prompt: ${worker.name}`,
          message: `Supervisor dispatched hydration nudge: 500ml cold electrolyte intake recommended.`,
          temperature: worker.currentTemp,
          acknowledged: false,
          resolved: false,
          timestamp: new Date().toISOString()
        };
        return [alert, ...prev];
      });

      showToast({
        title: 'Hydration Prompt Sent',
        message: `Hydration reminder delivered to ${worker.name}.`,
        severity: 'safe',
      });
    },
    [workers, showToast]
  );

  const bulkSendBreakAlert = useCallback(
    (workerIds: string[]) => {
      workerIds.forEach((id) => {
        const worker = workers.find((w) => w.id === id);
        if (worker) {
          updateWorker(id, {
            breakRequested: true,
            breakRequestTime: new Date().toISOString(),
          });
        }
      });

      const site = sites.find((s) => s.id === (selectedSiteId !== 'all' ? selectedSiteId : sites[0]?.id));
      const alert = {
        id: `alert-temp-${Date.now()}`,
        siteId: site?.id || 'all-sites',
        siteName: site?.name || 'All Active Sites',
        severity: 'danger' as const,
        type: 'break_requested' as const,
        title: `🚨 Bulk Cool-Down Rotation Broadcast`,
        message: `Mandatory heat-break protocol issued to ${workerIds.length} workers simultaneously.`,
        acknowledged: false,
        resolved: false,
        timestamp: new Date().toISOString()
      };

      setAlerts((prev) => [alert, ...prev]);
      showToast({
        title: 'Bulk Break Protocol Active',
        message: `Break orders dispatched to ${workerIds.length} field workers.`,
        severity: 'danger',
      });
    },
    [workers, sites, selectedSiteId, updateWorker, showToast]
  );

  // Site Handlers
  const addSite = useCallback(
    (siteData: Omit<Site, 'id' | 'workerCount' | 'atRiskCount' | 'extremeCount' | 'cautionCount' | 'safeCount'>) => {
      setSites((prev) => {
        const newS = { ...siteData, id: `s-temp-${Date.now()}`, workerCount: 0, atRiskCount: 0, extremeCount: 0, cautionCount: 0, safeCount: 0, currentTemp: 25 };
        return [...prev, newS];
      });
      showToast({
        title: 'New Site Configured',
        message: `Site activated.`,
        severity: 'safe',
      });
    },
    [showToast]
  );

  const updateSite = useCallback((id: string, updates: Partial<Site>) => {
    setSites((prev) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSite = useCallback(
    (id: string) => {
      const target = sites.find((s) => s.id === id);
      setSites((prev) => prev.filter((s) => s.id !== id));
      showToast({
        title: 'Site Removed',
        message: `${target?.name || 'Site'} deleted from monitoring network.`,
        severity: 'caution',
      });
    },
    [sites, showToast]
  );

  // Alert Handlers
  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      setAlerts((prev) => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
      showToast({
        title: 'Alert Acknowledged',
        message: 'Incident acknowledged and logged.',
        severity: 'safe',
      });
    },
    [showToast]
  );

  const resolveAlert = useCallback(
    (alertId: string) => {
      setAlerts((prev) => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      showToast({
        title: 'Alert Resolved',
        message: 'Safety incident marked as resolved.',
        severity: 'safe',
      });
    },
    [showToast]
  );

  // Demo Simulation Triggers
  const simulateHeatSpike = useCallback(
    (siteId?: string) => {
      const targetSiteId = siteId || (selectedSiteId !== 'all' ? selectedSiteId : sites[0]?.id || 'site-phx-01');
      const targetSite = sites.find((s) => s.id === targetSiteId) || sites[0];
      realtimeSafetyService.triggerHeatSpike(targetSite.id, targetSite.name, workers);
    },
    [selectedSiteId, sites, workers]
  );

  const simulateWorkerSos = useCallback(
    (workerId?: string) => {
      const targetWorker = workerId ? workers.find((w) => w.id === workerId) : workers.find((w) => w.status === 'extreme' || w.status === 'danger') || workers[0];
      if (targetWorker) {
        realtimeSafetyService.triggerWorkerSos(targetWorker);
      }
    },
    [workers]
  );

  const resetAllData = useCallback(() => {
    setWorkers([]);
    setSites([]);
    setAlerts([]);
    showToast({
      title: 'System Reset',
      message: 'Restored default demo job sites, workers, and alert telemetry.',
      severity: 'safe',
    });
  }, [showToast]);

  // ── Backend API Actions ──────────────────────────────────────────────────

  const loadZones = useCallback(async () => {
    setZonesLoading(true);
    setZonesError(null);
    try {
      const data = await fetchZones();
      setZones(data.zones);
      // Auto-select first zone if none selected
      if (data.zones.length > 0 && !selectedZoneId) {
        setSelectedZoneId(data.zones[0].id);
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setZonesError(msg);
      showToast({
        title: 'Failed to Load Zones',
        message: msg,
        severity: 'danger',
      });
    } finally {
      setZonesLoading(false);
    }
  }, [selectedZoneId, showToast]);

  // Load zones on mount
  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelCheck = useCallback(() => {
    if (checkAbortRef.current) {
      checkAbortRef.current.abort();
      checkAbortRef.current = null;
    }
    setCheckLoading(false);
    setCheckStartTime(null);
  }, []);

  const performCheck = useCallback(
    async (zoneId: string, options: CheckRequest = {}) => {
      // Cancel any in-flight check
      cancelCheck();

      const controller = new AbortController();
      checkAbortRef.current = controller;

      setCheckLoading(true);
      setCheckError(null);
      setCheckResult(null);
      setCheckStartTime(Date.now());
      setIsCheckSimulated(options.simulate === true);

      try {
        const result = await checkZone(zoneId, options, controller.signal);
        setCheckResult(result);

        // Show toast for alert-level results
        if (result.action === 'alert') {
          showToast({
            title: `⚠️ Heat Alert: ${result.zone_name}`,
            message: result.explanation || result.guidance,
            severity: 'danger',
          });
        } else {
          showToast({
            title: `✅ Check Complete: ${result.zone_name}`,
            message: `${result.risk_label} — ${result.apparent_temperature_c.toFixed(1)}°C apparent temperature`,
            severity: 'safe',
          });
        }
      } catch (err: unknown) {
        // Don't treat AbortError as a real error
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const msg = getErrorMessage(err);
        setCheckError(msg);
        showToast({
          title: 'Check Failed',
          message: msg,
          severity: 'danger',
        });
      } finally {
        setCheckLoading(false);
        setCheckStartTime(null);
        checkAbortRef.current = null;
      }
    },
    [cancelCheck, showToast]
  );

  const performSimulation = useCallback(
    async (zoneId: string, tempC: number = 42.0) => {
      return performCheck(zoneId, {
        simulate: true,
        simulate_temp_c: tempC,
      });
    },
    [performCheck]
  );

  const clearCheckResult = useCallback(() => {
    setCheckResult(null);
    setCheckError(null);
    setIsCheckSimulated(false);
  }, []);

  return (
    <SafetyContext.Provider
      value={{
        workers,
        sites,
        alerts,
        selectedSiteId,
        setSelectedSiteId,
        tempUnit,
        setTempUnit,
        kpiSummary,
        connectionMode,
        isLiveConnected,
        addWorker,
        updateWorker,
        deleteWorker,
        sendWorkerBreakAlert,
        sendWorkerHydrationReminder,
        bulkSendBreakAlert,
        addSite,
        updateSite,
        deleteSite,
        acknowledgeAlert,
        resolveAlert,
        simulateHeatSpike,
        simulateWorkerSos,
        resetAllData,
        // Backend API state
        zones,
        zonesLoading,
        zonesError,
        selectedZoneId,
        setSelectedZoneId,
        checkResult,
        checkLoading,
        checkError,
        checkStartTime,
        isCheckSimulated,
        loadZones,
        performCheck,
        performSimulation,
        cancelCheck,
        clearCheckResult,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};

export const useSafety = (): SafetyContextType => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};
