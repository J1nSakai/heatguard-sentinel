import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Worker, Site, SafetyAlert, KpiSummary, RiskLevel } from '../types';
import { MockApiService } from '../services/mockApi';
import { realtimeSafetyService } from '../services/websocketService';
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
}

const SafetyContext = createContext<SafetyContextType | undefined>(undefined);

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>(() => MockApiService.getWorkers());
  const [sites, setSites] = useState<Site[]>(() => MockApiService.getSites());
  const [alerts, setAlerts] = useState<SafetyAlert[]>(() => MockApiService.getAlerts());
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [connectionMode, setConnectionMode] = useState<'live_socket' | 'simulated_engine'>('simulated_engine');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Sync with MockApiService on worker/site/alert state changes
  useEffect(() => {
    MockApiService.saveWorkers(workers);
  }, [workers]);

  useEffect(() => {
    MockApiService.saveSites(sites);
  }, [sites]);

  useEffect(() => {
    MockApiService.saveAlerts(alerts);
  }, [alerts]);

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
      setWorkers((prevWorkers) =>
        prevWorkers.map((w) => {
          if (w.id !== workerId) return w;

          let newTemp = w.currentTemp;
          if (updates.currentTempDelta !== undefined) {
            newTemp = parseFloat(Math.max(24, Math.min(50, w.currentTemp + updates.currentTempDelta)).toFixed(1));
          } else if (updates.currentTemp !== undefined) {
            newTemp = updates.currentTemp;
          }

          const newStatus = getRiskLevel(newTemp, w.customThreshold);

          // Check if transitioned to a higher risk level and toast
          if (newStatus === 'extreme' && w.status !== 'extreme') {
            showToast({
              title: `🔥 CRITICAL HEAT: ${w.name}`,
              message: `${w.name} entered EXTREME risk zone (${newTemp}°C). Evacuation or shade break required!`,
              severity: 'extreme',
            });
          } else if (newStatus === 'danger' && (w.status === 'safe' || w.status === 'caution')) {
            showToast({
              title: `🔴 Danger Threshold Exceeded: ${w.name}`,
              message: `${w.name} is now at ${newTemp}°C (Limit: ${w.customThreshold}°C).`,
              severity: 'danger',
            });
          }

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
      const newW = MockApiService.addWorker(workerData);
      setWorkers((prev) => [newW, ...prev]);
      showToast({
        title: 'Worker Registered',
        message: `${newW.name} added to Sentinel monitoring system.`,
        severity: 'safe',
      });
    },
    [showToast]
  );

  const updateWorker = useCallback((id: string, updates: Partial<Worker>) => {
    const updated = MockApiService.updateWorker(id, updates);
    if (updated) {
      setWorkers((prev) => prev.map((w) => (w.id === id ? updated : w)));
    }
  }, []);

  const deleteWorker = useCallback(
    (id: string) => {
      const target = workers.find((w) => w.id === id);
      if (MockApiService.deleteWorker(id)) {
        setWorkers((prev) => prev.filter((w) => w.id !== id));
        showToast({
          title: 'Worker Removed',
          message: `${target?.name || 'Worker'} deleted from Sentinel registry.`,
          severity: 'caution',
        });
      }
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

      const alert = MockApiService.addAlert({
        workerId: worker.id,
        workerName: worker.name,
        siteId: worker.siteId,
        siteName: worker.siteName,
        severity: 'caution',
        type: 'break_requested',
        title: `Manager Dispatched Break: ${worker.name}`,
        message: `Safety manager commanded 15-min mandatory cooling rotation to nearest hydration post.`,
        temperature: worker.currentTemp,
        threshold: worker.customThreshold,
      });

      setAlerts((prev) => [alert, ...prev]);
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

      const alert = MockApiService.addAlert({
        workerId: worker.id,
        workerName: worker.name,
        siteId: worker.siteId,
        siteName: worker.siteName,
        severity: 'safe',
        type: 'hydration_needed',
        title: `Hydration Prompt: ${worker.name}`,
        message: `Supervisor dispatched hydration nudge: 500ml cold electrolyte intake recommended.`,
        temperature: worker.currentTemp,
      });

      setAlerts((prev) => [alert, ...prev]);
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
      const alert = MockApiService.addAlert({
        siteId: site?.id || 'all-sites',
        siteName: site?.name || 'All Active Sites',
        severity: 'danger',
        type: 'break_requested',
        title: `🚨 Bulk Cool-Down Rotation Broadcast`,
        message: `Mandatory heat-break protocol issued to ${workerIds.length} workers simultaneously.`,
      });

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
      const newS = MockApiService.addSite(siteData);
      setSites((prev) => [...prev, newS]);
      showToast({
        title: 'New Site Configured',
        message: `${newS.name} (${newS.city}, ${newS.state}) activated.`,
        severity: 'safe',
      });
    },
    [showToast]
  );

  const updateSite = useCallback((id: string, updates: Partial<Site>) => {
    const updated = MockApiService.updateSite(id, updates);
    if (updated) {
      setSites((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
  }, []);

  const deleteSite = useCallback(
    (id: string) => {
      const target = sites.find((s) => s.id === id);
      if (MockApiService.deleteSite(id)) {
        setSites((prev) => prev.filter((s) => s.id !== id));
        showToast({
          title: 'Site Removed',
          message: `${target?.name || 'Site'} deleted from monitoring network.`,
          severity: 'caution',
        });
      }
    },
    [sites, showToast]
  );

  // Alert Handlers
  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      const ack = MockApiService.acknowledgeAlert(alertId, 'Safety Lead');
      if (ack) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? ack : a)));
        showToast({
          title: 'Alert Acknowledged',
          message: 'Incident acknowledged and logged.',
          severity: 'safe',
        });
      }
    },
    [showToast]
  );

  const resolveAlert = useCallback(
    (alertId: string) => {
      const res = MockApiService.resolveAlert(alertId);
      if (res) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? res : a)));
        showToast({
          title: 'Alert Resolved',
          message: 'Safety incident marked as resolved.',
          severity: 'safe',
        });
      }
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
    MockApiService.resetToDefaults();
    setWorkers(MockApiService.getWorkers());
    setSites(MockApiService.getSites());
    setAlerts(MockApiService.getAlerts());
    showToast({
      title: 'System Reset',
      message: 'Restored default demo job sites, workers, and alert telemetry.',
      severity: 'safe',
    });
  }, [showToast]);

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
