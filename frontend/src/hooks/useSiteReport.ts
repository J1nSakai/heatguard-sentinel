import { useState, useEffect } from 'react';
import { ReportResponse } from '../types/api';
import { fetchReport, getErrorMessage } from '../services/apiClient';

export function useSiteReport(selectedZoneId: string | null) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [cachedTime, setCachedTime] = useState<number | null>(null);

  const loadReport = async (forceRefresh = false) => {
    if (!selectedZoneId) return;
    setReportLoading(true);
    setReportError(null);
    
    const cacheKey = `sentinel_cache:report:${selectedZoneId}:3:3`;

    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { timestamp, data } = JSON.parse(cached);
            if (timestamp && data) {
              setReport(data);
              setCachedTime(timestamp);
              setReportLoading(false);
              return;
            }
          } catch (e) {
            localStorage.removeItem(cacheKey);
          }
        }
      }

      const freshData = await fetchReport(selectedZoneId, 3, 3);
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: freshData }));
      setReport(freshData);
      setCachedTime(Date.now());
    } catch (err) {
      setReportError(getErrorMessage(err));
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    setReport(null);
    setCachedTime(null);
    setReportError(null);
    if (selectedZoneId) {
      loadReport();
    }
  }, [selectedZoneId]);

  return { report, reportLoading, reportError, cachedTime, loadReport };
}
