import React, { useState, useEffect, useRef } from 'react';
import { useSafety } from '../context/SafetyContext';
import { Zone, CheckResponse } from '../types/api';
import { fetchZones, checkZone, getErrorMessage } from '../services/apiClient';
import { getDistanceFromLatLonInKm } from '../utils/geo';
import { ZoneSelectionMap } from '../components/map/ZoneSelectionMap';
import { SiteIntelligencePanel } from '../components/reports/SiteIntelligencePanel';
import { SiteThermalHistory } from '../components/reports/SiteThermalHistory';
import { useSiteReport } from '../hooks/useSiteReport';
import { Activity, MapPin, Loader2, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { selectedZoneId, setSelectedZoneId } = useSafety();
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);
  
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  
  const checkAbortRef = useRef<AbortController | null>(null);
  
  const { report, reportLoading, reportError, cachedTime, loadReport } = useSiteReport(selectedZoneId);

  // Load zones on mount
  const loadZones = async () => {
    setZonesLoading(true);
    setZonesError(null);
    try {
      const data = await fetchZones();
      setZones(data.zones);
      // If no zone selected, default to first
      if (!selectedZoneId && data.zones.length > 0) {
        setSelectedZoneId(data.zones[0].id);
      }
    } catch (err) {
      setZonesError(getErrorMessage(err));
    } finally {
      setZonesLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer for long-running checks
  useEffect(() => {
    let interval: number;
    if (checkLoading) {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [checkLoading]);

  // Handle Map Interaction
  const handleMapClick = (lat: number, lng: number) => {
    if (zones.length === 0) return;

    let nearestZone = zones[0];
    let minDistance = getDistanceFromLatLonInKm(lat, lng, nearestZone.lat, nearestZone.lon);

    for (let i = 1; i < zones.length; i++) {
      const dist = getDistanceFromLatLonInKm(lat, lng, zones[i].lat, zones[i].lon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestZone = zones[i];
      }
    }

    setSelectedZoneId(nearestZone.id);
    setClickedLocation({ lat, lng });
  };

  const handleZoneMarkerClick = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setClickedLocation(null);
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedZoneId(e.target.value || null);
    setClickedLocation(null);
  };

  // Run Check (passed to Panel)
  const handleRunCheck = async (simulate: boolean, temp?: number, recipientEmail?: string, alertThreshold?: number): Promise<CheckResponse | null> => {
    if (!selectedZoneId) return null;

    if (checkAbortRef.current) {
      checkAbortRef.current.abort();
    }
    checkAbortRef.current = new AbortController();

    setCheckLoading(true);
    try {
      const body: any = simulate ? { simulate: true, simulate_temp_c: temp } : {};
      if (recipientEmail) {
        body.recipient_email = recipientEmail;
      }
      if (alertThreshold !== undefined) {
        body.alert_threshold = alertThreshold;
      }
      const result = await checkZone(selectedZoneId, body, checkAbortRef.current.signal);
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      console.error(err);
      throw err; // Let SiteIntelligencePanel handle it
    } finally {
      setCheckLoading(false);
    }
  };

  const activeZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <div className="flex flex-col h-screen w-full bg-stone-50 overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="h-12 border-b border-stone-300 bg-stone-50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-stone-800" />
          <h1 className="text-[11px] font-black text-stone-800 uppercase tracking-widest leading-none">
            Thermal Intelligence Console
          </h1>
        </div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
          Site Status
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* LEFT: MAP & HISTORY */}
        <div className="flex-1 lg:w-2/3 flex flex-col border-b lg:border-b-0 border-stone-300">
          
          <div className="h-[50vh] lg:h-auto relative bg-stone-200 border-b border-stone-300">
            <ZoneSelectionMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              clickedLocation={clickedLocation}
              onMapClick={handleMapClick}
              onZoneMarkerClick={handleZoneMarkerClick}
            />

            {/* Map Overlay UX */}
            <div className="absolute top-4 left-4 z-[400] hidden sm:block">
              <div className="bg-white/90 backdrop-blur-md p-4 border border-stone-300 shadow-sm max-w-[260px] mb-2 pointer-events-auto">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-800 mb-1">
                  Pin A Work Location
                </h2>
                <p className="text-[11px] font-medium text-stone-600 leading-snug mb-3">
                  Click anywhere on the map to identify the nearest monitored construction zone.
                </p>
                
                <div className="border-t border-stone-200 pt-3">
                  <label className="block text-[9px] font-black text-stone-800 uppercase tracking-widest mb-1.5">
                    Zone Override
                  </label>
                  <div className="relative border border-stone-300 bg-white hover:border-stone-400 transition-colors">
                    <select
                      value={selectedZoneId || ''}
                      onChange={handleDropdownChange}
                      className="w-full appearance-none bg-transparent py-1.5 pl-2 pr-8 text-[10px] font-bold text-stone-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-500"
                    >
                      {zones.length === 0 && <option value="">No zones available</option>}
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-3 w-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              {clickedLocation && activeZone && (
                <div className="bg-white/90 backdrop-blur-md p-3 border border-stone-300 shadow-sm max-w-[260px] pointer-events-auto">
                  <div className="mb-2">
                    <div className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-0.5">Selected Location</div>
                    <div className="text-[10px] font-mono font-bold text-stone-700">{clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-0.5">Matched Zone</div>
                    <div className="text-[10px] font-bold text-stone-800 leading-snug">{activeZone.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SITE THERMAL HISTORY STRIP */}
          <div className="h-auto lg:h-[220px] shrink-0">
            <SiteThermalHistory 
              report={report}
              reportLoading={reportLoading}
              reportError={reportError}
              cachedTime={cachedTime}
              loadReport={loadReport}
              zoneSelected={!!selectedZoneId}
            />
          </div>
        </div>

      {/* RIGHT: INTELLIGENCE RAIL */}
      <div className="w-full lg:w-1/3 lg:min-w-[420px] h-[50vh] lg:h-full flex flex-col bg-stone-50 z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.02)] relative">
        {zonesLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-stone-400 mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Initializing Console...</span>
          </div>
        ) : zonesError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Service Unavailable</div>
            <p className="text-stone-500 text-xs font-medium mb-4">Unable to reach Sentinel services.</p>
            <button onClick={loadZones} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-600 border border-stone-300 px-4 py-2 bg-white hover:bg-stone-100 transition-colors">
              <RefreshCw className="h-3 w-3" /> Retry Connection
            </button>
          </div>
        ) : activeZone ? (
          <SiteIntelligencePanel
            selectedZone={activeZone}
            clickedLocation={clickedLocation}
            onRunCheck={handleRunCheck}
            checkLoading={checkLoading}
            elapsedSeconds={elapsedSeconds}
            report={report}
            reportLoading={reportLoading}
            reportError={reportError}
            cachedTime={cachedTime}
            loadReport={loadReport}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm font-medium text-stone-500">
            Please select a zone.
          </div>
        )}
      </div>

      </div>
    </div>
  );
};
