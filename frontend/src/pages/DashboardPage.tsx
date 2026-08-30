import React, { useState, useEffect, useRef } from "react";
import { useSafety } from "../context/SafetyContext";
import { Zone, CheckResponse } from "../types/api";
import { fetchZones, checkZone, getErrorMessage } from "../services/apiClient";
import { getDistanceFromLatLonInKm, isWithinUSA, geocodeAddress, GeocodeResult } from "../utils/geo";
import { ZoneSelectionMap } from "../components/map/ZoneSelectionMap";
import { SiteIntelligencePanel } from "../components/reports/SiteIntelligencePanel";
import { AlertsSidebar } from "../components/alerts/AlertsSidebar";
import { useSiteReport } from "../hooks/useSiteReport";
import {
  Activity,
  MapPin,
  Loader2,
  RefreshCw,
  Bell,
  Crosshair,
  Navigation,
  CheckCircle2,
  Globe,
  Search,
  X,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { selectedZoneId, setSelectedZoneId } = useSafety();

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [clickedLocation, setClickedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [alertsSidebarOpen, setAlertsSidebarOpen] = useState(false);
  const [alertsRefreshTrigger, setAlertsRefreshTrigger] = useState(0);

  // Address search state
  const [addressQuery, setAddressQuery] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const addressAbortRef = useRef<AbortController | null>(null);

  // Coordinate input state
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);

  const checkAbortRef = useRef<AbortController | null>(null);

  // Pass pinnedLocation into useSiteReport so custom coordinates trigger real backend reports
  const { report, reportLoading, reportError, cachedTime, loadReport } =
    useSiteReport(selectedZoneId, pinnedLocation);

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

  // Handle Map Interaction (Click to snap)
  const handleMapClick = (lat: number, lng: number) => {
    if (zones.length === 0) return;

    let nearestZone = zones[0];
    let minDistance = getDistanceFromLatLonInKm(
      lat,
      lng,
      nearestZone.lat,
      nearestZone.lon
    );

    for (let i = 1; i < zones.length; i++) {
      const dist = getDistanceFromLatLonInKm(
        lat,
        lng,
        zones[i].lat,
        zones[i].lon
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestZone = zones[i];
      }
    }

    setSelectedZoneId(nearestZone.id);
    setClickedLocation({ lat, lng });
    setPinnedLocation(null);
    setAddressQuery("");
    setShowAddressDropdown(false);
  };

  const handleZoneMarkerClick = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setClickedLocation(null);
    setPinnedLocation(null);
    setAddressQuery("");
    setShowAddressDropdown(false);
  };

  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setClickedLocation(null);
    setPinnedLocation(null);
    setCoordError(null);
    setAddressError(null);
    setAddressQuery("");
    setShowAddressDropdown(false);
  };

  // Address Geocoding Handler
  const handleAddressSearch = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const query = (customQuery ?? addressQuery).trim();
    if (!query) return;

    if (addressAbortRef.current) {
      addressAbortRef.current.abort();
    }
    addressAbortRef.current = new AbortController();

    setIsSearchingAddress(true);
    setAddressError(null);
    setCoordError(null);

    try {
      const results = await geocodeAddress(query, addressAbortRef.current.signal);
      if (results.length === 0) {
        setAddressError("No US address found matching that location. Please verify your query.");
        setAddressResults([]);
        setShowAddressDropdown(false);
      } else if (results.length === 1 || customQuery) {
        applyGeocodeResult(results[0]);
      } else {
        setAddressResults(results);
        setShowAddressDropdown(true);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setAddressError("Address lookup service unavailable. Please enter coordinates manually.");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const applyGeocodeResult = (result: GeocodeResult) => {
    setLatInput(result.lat.toFixed(5));
    setLngInput(result.lon.toFixed(5));
    setAddressQuery(result.displayName);
    setShowAddressDropdown(false);
    setAddressResults([]);
    setAddressError(null);
    setCoordError(null);

    const siteShortName = result.displayName.split(",")[0] || "Searched Site";

    setPinnedLocation({
      lat: result.lat,
      lng: result.lon,
      name: siteShortName,
    });
    setClickedLocation(null);

    // Automatically match to the nearest monitored zone
    if (zones.length > 0) {
      let nearestZone = zones[0];
      let minDistance = getDistanceFromLatLonInKm(
        result.lat,
        result.lon,
        nearestZone.lat,
        nearestZone.lon
      );

      for (let i = 1; i < zones.length; i++) {
        const dist = getDistanceFromLatLonInKm(
          result.lat,
          result.lon,
          zones[i].lat,
          zones[i].lon
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestZone = zones[i];
        }
      }
      setSelectedZoneId(nearestZone.id);
    }
  };

  // Coordinate pin submission with US validation
  const handleCoordSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setCoordError(null);
    setAddressError(null);
    setShowAddressDropdown(false);

    const lat = parseFloat(latInput.trim());
    const lng = parseFloat(lngInput.trim());

    if (isNaN(lat) || isNaN(lng)) {
      setCoordError(
        "Please enter valid numeric latitude and longitude coordinates."
      );
      return;
    }
    if (lat < -90 || lat > 90) {
      setCoordError("Latitude must be between -90 and 90 degrees.");
      return;
    }
    if (lng < -180 || lng > 180) {
      setCoordError("Longitude must be between -180 and 180 degrees.");
      return;
    }
    if (!isWithinUSA(lat, lng)) {
      setCoordError(
        "Coordinates must be located within the United States (Contiguous US, Alaska, or Hawaii)."
      );
      return;
    }

    setPinnedLocation({ lat, lng, name: `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})` });
    setClickedLocation(null);

    // Automatically match to the nearest monitored zone
    if (zones.length > 0) {
      let nearestZone = zones[0];
      let minDistance = getDistanceFromLatLonInKm(
        lat,
        lng,
        nearestZone.lat,
        nearestZone.lon
      );

      for (let i = 1; i < zones.length; i++) {
        const dist = getDistanceFromLatLonInKm(
          lat,
          lng,
          zones[i].lat,
          zones[i].lon
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestZone = zones[i];
        }
      }
      setSelectedZoneId(nearestZone.id);
    }
  };

  const handleCoordClear = () => {
    setLatInput("");
    setLngInput("");
    setAddressQuery("");
    setCoordError(null);
    setAddressError(null);
    setPinnedLocation(null);
    setShowAddressDropdown(false);
  };

  // Run Check (passed to Panel)
  const handleRunCheck = async (
    simulate: boolean,
    temp?: number,
    recipientEmail?: string
  , alertThreshold?: number): Promise<CheckResponse | null> => {
    if (!selectedZoneId) return null;

    if (checkAbortRef.current) {
      checkAbortRef.current.abort();
    }
    checkAbortRef.current = new AbortController();

    setCheckLoading(true);
    try {
      const body: any = simulate
        ? { simulate: true, simulate_temp_c: temp }
        : {};
      if (recipientEmail) {
        body.recipient_email = recipientEmail;
      }
      if (alertThreshold !== undefined) {
        body.alert_threshold = alertThreshold;
      }
      const result = await checkZone(
        selectedZoneId,
        body,
        checkAbortRef.current.signal
      );
      // If an alert fired, auto-refresh the sidebar log
      if (result?.action === "alert") {
        setAlertsRefreshTrigger((n) => n + 1);
      }
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      console.error(err);
      throw err; // Let SiteIntelligencePanel handle it
    } finally {
      setCheckLoading(false);
    }
  };

  const activeZone = zones.find((z) => z.id === selectedZoneId);
  const isAnalyzing = checkLoading || reportLoading;

  // Calculate distance if custom coordinates are active
  const activeDistanceKm =
    pinnedLocation && activeZone
      ? getDistanceFromLatLonInKm(
          pinnedLocation.lat,
          pinnedLocation.lng,
          activeZone.lat,
          activeZone.lon
        )
      : clickedLocation && activeZone
        ? getDistanceFromLatLonInKm(
            clickedLocation.lat,
            clickedLocation.lng,
            activeZone.lat,
            activeZone.lon
          )
        : null;

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
        <div className="flex items-center gap-3">
          <button
            id="alerts-log-toggle"
            onClick={() => setAlertsSidebarOpen(true)}
            title="View Alert Log"
            className="flex items-center gap-1.5 border border-stone-300 bg-white hover:bg-stone-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <Bell className="h-3 w-3" />
            Alert Log
          </button>
        </div>
      </div>

      {/* Alerts Sidebar */}
      <AlertsSidebar
        isOpen={alertsSidebarOpen}
        onClose={() => setAlertsSidebarOpen(false)}
        refreshTrigger={alertsRefreshTrigger}
      />

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* LEFT: MAP & LOCATION DISPATCH CONSOLE */}
        <div className="flex-1 lg:w-2/3 flex flex-col border-b lg:border-b-0 border-stone-300 overflow-hidden">
          {/* 1. INTERACTIVE MAP VIEW */}
          <div className="flex-1 min-h-[300px] lg:min-h-[380px] relative bg-stone-200 border-b border-stone-300">
            <ZoneSelectionMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              clickedLocation={clickedLocation}
              pinnedLocation={pinnedLocation}
              disabled={isAnalyzing}
              onMapClick={handleMapClick}
              onZoneMarkerClick={handleZoneMarkerClick}
            />

            {/* Map Overlay Status Badge (Top Right) */}
            <div className="absolute top-3 right-3 z-[400] pointer-events-none">
              <div className="bg-stone-900/90 backdrop-blur-md px-3 py-1.5 border border-stone-700 shadow-md text-stone-100 flex items-center gap-2 rounded">
                <Navigation className="h-3 w-3 text-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  {pinnedLocation
                    ? `Pinned: ${pinnedLocation.lat.toFixed(4)}, ${pinnedLocation.lng.toFixed(4)}`
                    : clickedLocation
                      ? `Selected: ${clickedLocation.lat.toFixed(4)}, ${clickedLocation.lng.toFixed(4)}`
                      : activeZone
                        ? `Active Zone: ${activeZone.name}`
                        : "Click map or select site below"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. DEDICATED LOCATION SELECTION & COORDINATE INPUT PANEL */}
          <div className="h-auto lg:h-[280px] p-4 sm:p-5 bg-stone-100/80 overflow-y-auto custom-scrollbar border-t border-stone-200 flex flex-col justify-between">
            <div>
              {/* Header with Distance Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-stone-700" />
                    Site Location & GPS Coordinate Dispatch
                  </h2>
                  <p className="text-[9px] font-medium text-stone-500 uppercase tracking-wider">
                    {isAnalyzing
                      ? "Analysis in progress — site selection is locked until analysis completes"
                      : "Search any US address, choose a monitored corridor, or enter exact GPS coordinates"}
                  </p>
                </div>

                {activeDistanceKm !== null && activeZone && (
                  <div className="text-[9px] font-bold text-stone-600 bg-white border border-stone-300 px-2.5 py-1 rounded shadow-sm">
                    <span className="text-stone-400 uppercase">
                      Nearest Corridor:
                    </span>{" "}
                    <span className="text-stone-800 font-black">
                      {activeZone.name}
                    </span>{" "}
                    <span className="font-mono text-emerald-600">
                      ({activeDistanceKm.toFixed(2)} km)
                    </span>
                  </div>
                )}
              </div>

              {/* ADDRESS SEARCH BAR */}
              <div className="relative mb-3">
                <form onSubmit={(e) => handleAddressSearch(e)} className="flex items-stretch gap-1.5">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      disabled={isAnalyzing}
                      value={addressQuery}
                      onChange={(e) => {
                        setAddressQuery(e.target.value);
                        setAddressError(null);
                      }}
                      placeholder={
                        isAnalyzing
                          ? "Analysis in progress (controls locked)..."
                          : "Type site address, city, or landmark (e.g. 100 W Washington St, Phoenix, AZ)..."
                      }
                      className="w-full pl-8 pr-8 py-2 text-[10px] font-medium bg-white border border-stone-300 rounded shadow-inner text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-800 focus:border-stone-800 disabled:bg-stone-200/60 disabled:cursor-not-allowed disabled:text-stone-500"
                    />
                    {addressQuery && !isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddressQuery("");
                          setShowAddressDropdown(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isAnalyzing || isSearchingAddress || !addressQuery.trim()}
                    className="bg-stone-800 hover:bg-stone-900 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-stone-50 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {isSearchingAddress ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3 w-3" />
                        <span>Search Address</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Autocomplete / Search Suggestions Dropdown */}
                {showAddressDropdown && addressResults.length > 0 && !isAnalyzing && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-300 rounded shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-stone-100">
                    {addressResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => applyGeocodeResult(res)}
                        className="w-full text-left p-2.5 hover:bg-stone-50 text-[10px] text-stone-800 flex items-start gap-2 transition-colors"
                      >
                        <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{res.displayName}</div>
                          <div className="text-[8px] font-mono text-stone-400">
                            GPS: {res.lat.toFixed(4)}, {res.lon.toFixed(4)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {addressError && (
                  <p className="text-[8px] font-bold text-rose-600 mt-1 bg-rose-50 border border-rose-200 p-1.5 rounded">
                    ⚠ {addressError}
                  </p>
                )}
              </div>

              {/* TWO COLUMNS: PRESETS & MANUAL COORDINATES */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Left Column (7 cols): Pre-Loaded Demo Zones */}
                <div className="md:col-span-7 space-y-1.5">
                  <div className="text-[9px] font-black uppercase tracking-widest text-stone-500 flex items-center justify-between">
                    <span>Monitored Enterprise Zones</span>
                    <span className="text-[8px] text-stone-400">
                      {isAnalyzing ? "Locked" : "Click to focus"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {zones.map((zone) => {
                      const isSelected =
                        zone.id === selectedZoneId && !pinnedLocation;
                      return (
                        <button
                          key={zone.id}
                          disabled={isAnalyzing}
                          onClick={() => handleSelectZone(zone.id)}
                          className={`text-left p-2 border transition-all flex flex-col justify-between rounded ${
                            isAnalyzing
                              ? "opacity-50 cursor-not-allowed border-stone-300 bg-stone-100"
                              : isSelected
                              ? "bg-white border-stone-800 shadow-sm ring-1 ring-stone-800"
                              : "bg-white/70 hover:bg-white border-stone-300 hover:border-stone-400"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                {zone.worker_type.replace("_", " ")}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="h-3 w-3 text-stone-800 shrink-0" />
                              )}
                            </div>
                            <div className="text-[9px] font-bold text-stone-800 leading-snug line-clamp-2">
                              {zone.name}
                            </div>
                          </div>
                          <div className="text-[8px] font-mono text-stone-400 mt-1.5">
                            {zone.lat.toFixed(2)}°, {zone.lon.toFixed(2)}°
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column (5 cols): Custom US GPS Coordinate Input */}
                <div className="md:col-span-5 bg-white border border-stone-300 p-2.5 rounded flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-700 flex items-center gap-1">
                        <Crosshair className="h-3 w-3 text-indigo-600" />
                        Exact Coordinates
                      </span>
                      <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" /> US Bounds
                      </span>
                    </div>

                    <form onSubmit={handleCoordSubmit} className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                            Latitude
                          </label>
                          <input
                            id="lat-input"
                            type="text"
                            disabled={isAnalyzing}
                            inputMode="decimal"
                            value={latInput}
                            onChange={(e) => {
                              setLatInput(e.target.value);
                              setCoordError(null);
                            }}
                            placeholder="e.g. 33.4484"
                            className="w-full border border-stone-300 bg-stone-50 px-2 py-1 text-[10px] font-mono text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-400 rounded disabled:bg-stone-200/50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">
                            Longitude
                          </label>
                          <input
                            id="lng-input"
                            type="text"
                            disabled={isAnalyzing}
                            inputMode="decimal"
                            value={lngInput}
                            onChange={(e) => {
                              setLngInput(e.target.value);
                              setCoordError(null);
                            }}
                            placeholder="e.g. -112.0740"
                            className="w-full border border-stone-300 bg-stone-50 px-2 py-1 text-[10px] font-mono text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-400 rounded disabled:bg-stone-200/50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          type="submit"
                          disabled={isAnalyzing}
                          className="flex-1 bg-stone-800 hover:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[8px] font-black uppercase tracking-widest py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-stone-500 flex items-center justify-center gap-1"
                        >
                          <Crosshair className="h-3 w-3" />
                          Pin GPS
                        </button>
                        {pinnedLocation && (
                          <button
                            type="button"
                            disabled={isAnalyzing}
                            onClick={handleCoordClear}
                            className="px-2.5 bg-stone-200 hover:bg-stone-300 disabled:opacity-40 disabled:cursor-not-allowed text-stone-700 text-[8px] font-black uppercase tracking-widest py-1.5 rounded transition-colors focus:outline-none"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {coordError && (
                        <p className="text-[8px] font-bold text-rose-600 leading-snug bg-rose-50 border border-rose-200 p-1 rounded">
                          ⚠ {coordError}
                        </p>
                      )}
                      {pinnedLocation && !coordError && (
                        <p className="text-[8px] font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 p-1 rounded truncate">
                          ● Pinned: {pinnedLocation.lat.toFixed(4)}, {pinnedLocation.lng.toFixed(4)}
                        </p>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: INTELLIGENCE RAIL */}
        <div className="w-full lg:w-1/3 lg:min-w-[420px] h-[50vh] lg:h-full flex flex-col bg-stone-50 z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.02)] relative">
          {zonesLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-stone-400 mb-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                Initializing Console...
              </span>
            </div>
          ) : zonesError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">
                Service Unavailable
              </div>
              <p className="text-stone-500 text-xs font-medium mb-4">
                Unable to reach Sentinel services.
              </p>
              <button
                onClick={loadZones}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-600 border border-stone-300 px-4 py-2 bg-white hover:bg-stone-100 transition-colors"
              >
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

