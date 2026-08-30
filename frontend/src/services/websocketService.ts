import { io, Socket } from 'socket.io-client';
import { Worker, SafetyAlert, RiskLevel } from '../types';
import { getRiskLevel } from '../constants/riskLevels';

export type StatusUpdateCallback = (workerId: string, updates: Partial<Worker>) => void;
export type NewAlertCallback = (alert: SafetyAlert) => void;
export type ConnectionStatusCallback = (connected: boolean, mode: 'live_socket' | 'simulated_engine') => void;

class RealtimeSafetyService {
  private socket: Socket | null = null;
  private simulationInterval: number | null = null;
  private statusListeners: Set<StatusUpdateCallback> = new Set();
  private alertListeners: Set<NewAlertCallback> = new Set();
  private connectionListeners: Set<ConnectionStatusCallback> = new Set();
  private isSimulating: boolean = false;
  private mode: 'live_socket' | 'simulated_engine' = 'simulated_engine';
  private isConnected: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Attempt socket connection to backend
    try {
      this.socket = io('http://localhost:3001', {
        autoConnect: false,
        reconnection: false,
        reconnectionAttempts: 0,
        timeout: 3000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.mode = 'live_socket';
        this.notifyConnection();
        this.stopSimulation();
      });

      this.socket.on('workerStatusUpdate', (data: { workerId: string; updates: Partial<Worker> }) => {
        this.notifyStatusUpdate(data.workerId, data.updates);
      });

      this.socket.on('newAlert', (alert: SafetyAlert) => {
        this.notifyNewAlert(alert);
      });

      this.socket.on('connect_error', () => {
        // Fallback to internal Safety Sentinel Simulation
        this.isConnected = true;
        this.mode = 'simulated_engine';
        this.notifyConnection();
        this.startSimulation();
      });

      this.socket.on('disconnect', () => {
        this.mode = 'simulated_engine';
        this.notifyConnection();
        this.startSimulation();
      });
    } catch {
      this.mode = 'simulated_engine';
      this.startSimulation();
    }
  }

  public subscribeStatus(callback: StatusUpdateCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  public subscribeAlert(callback: NewAlertCallback): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  public subscribeConnection(callback: ConnectionStatusCallback): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected, this.mode);
    return () => this.connectionListeners.delete(callback);
  }

  private notifyStatusUpdate(workerId: string, updates: Partial<Worker>) {
    this.statusListeners.forEach((cb) => cb(workerId, updates));
  }

  private notifyNewAlert(alert: SafetyAlert) {
    this.alertListeners.forEach((cb) => cb(alert));
  }

  private notifyConnection() {
    this.connectionListeners.forEach((cb) => cb(this.isConnected, this.mode));
  }

  // --- Real-time Simulation Engine ---
  public startSimulation() {
    if (this.isSimulating) return;
    this.isSimulating = true;

    this.simulationInterval = window.setInterval(() => {
      // Pick random telemetry jitter
      const workerIds = ['w-101', 'w-102', 'w-103', 'w-104', 'w-105', 'w-201', 'w-202', 'w-203', 'w-301', 'w-302'];
      const randomWorkerId = workerIds[Math.floor(Math.random() * workerIds.length)];

      const tempDelta = (Math.random() - 0.48) * 0.4;
      const hrDelta = Math.floor((Math.random() - 0.45) * 4);

      this.notifyStatusUpdate(randomWorkerId, {
        currentTempDelta: tempDelta,
        hrDelta: hrDelta,
      } as any);
    }, 4000);
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
  }

  // --- Manual Sentinel Scenarios for Demos ---
  public triggerHeatSpike(siteId: string, siteName: string, affectedWorkers: Worker[]) {
    const spikeAmount = 3.5;
    affectedWorkers.forEach((w) => {
      if (w.siteId === siteId) {
        const newTemp = parseFloat((w.currentTemp + spikeAmount).toFixed(1));
        const newStatus = getRiskLevel(newTemp, w.customThreshold);
        this.notifyStatusUpdate(w.id, {
          currentTemp: newTemp,
          feelsLikeTemp: parseFloat((newTemp + 3.0).toFixed(1)),
          heatIndex: parseFloat((newTemp + 2.4).toFixed(1)),
          status: newStatus,
          vitals: {
            ...w.vitals,
            heartRate: Math.min(170, w.vitals.heartRate + 15),
            bodyTemp: parseFloat((w.vitals.bodyTemp + 0.5).toFixed(1)),
            heatStrainIndex: Math.min(10, parseFloat((w.vitals.heatStrainIndex + 1.8).toFixed(1))),
          },
        });
      }
    });

    const spikeAlert: SafetyAlert = {
      id: `spike-${Date.now()}`,
      siteId,
      siteName,
      timestamp: new Date().toISOString(),
      severity: 'extreme',
      type: 'heat_spike',
      title: '🚨 FortyGuard Rapid Thermal Inversion',
      message: `Extreme heat island surge detected at ${siteName}! Surface thermal radiance increased by +${spikeAmount}°C.`,
      temperature: 46.2,
      acknowledged: false,
      resolved: false,
    };
    this.notifyNewAlert(spikeAlert);
  }

  public triggerWorkerSos(worker: Worker) {
    const sosAlert: SafetyAlert = {
      id: `sos-${Date.now()}`,
      workerId: worker.id,
      workerName: worker.name,
      siteId: worker.siteId,
      siteName: worker.siteName,
      timestamp: new Date().toISOString(),
      severity: 'extreme',
      type: 'emergency_sos',
      title: `🚨 EMERGENCY SOS: ${worker.name}`,
      message: `Worker ${worker.name} activated Emergency SOS at ${worker.location.zoneName} (${worker.currentTemp}°C). Immediate medical & cool response required!`,
      temperature: worker.currentTemp,
      threshold: worker.customThreshold,
      acknowledged: false,
      resolved: false,
    };

    this.notifyStatusUpdate(worker.id, {
      breakRequested: true,
      breakRequestTime: new Date().toISOString(),
      status: 'extreme',
    });

    this.notifyNewAlert(sosAlert);
  }

  public triggerBreakRequest(worker: Worker) {
    const breakAlert: SafetyAlert = {
      id: `brk-${Date.now()}`,
      workerId: worker.id,
      workerName: worker.name,
      siteId: worker.siteId,
      siteName: worker.siteName,
      timestamp: new Date().toISOString(),
      severity: worker.status === 'extreme' ? 'extreme' : 'danger',
      type: 'break_requested',
      title: `⏸ Break Requested: ${worker.name}`,
      message: `${worker.name} requested a 15-minute cooling shelter rotation (Current temp: ${worker.currentTemp}°C).`,
      temperature: worker.currentTemp,
      threshold: worker.customThreshold,
      acknowledged: false,
      resolved: false,
    };

    this.notifyStatusUpdate(worker.id, {
      breakRequested: true,
      breakRequestTime: new Date().toISOString(),
    });

    this.notifyNewAlert(breakAlert);
  }
}

export const realtimeSafetyService = new RealtimeSafetyService();
