import React, { useState, useMemo } from 'react';
import { useSafety } from '../../context/SafetyContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Bell,
  Check,
  ShieldCheck,
  Flame,
  AlertCircle,
  Search,
  Download,
  Filter,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { RiskLevel } from '../../types';

export const AlertCenter: React.FC = () => {
  const { alerts, selectedSiteId, acknowledgeAlert, resolveAlert } = useSafety();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | RiskLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unacknowledged' | 'resolved'>('all');

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => selectedSiteId === 'all' || a.siteId === selectedSiteId)
      .filter((a) => severityFilter === 'all' || a.severity === severityFilter)
      .filter((a) => {
        if (statusFilter === 'unacknowledged') return !a.acknowledged && !a.resolved;
        if (statusFilter === 'resolved') return a.resolved;
        return true;
      })
      .filter((a) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          (a.workerName && a.workerName.toLowerCase().includes(q)) ||
          a.siteName.toLowerCase().includes(q)
        );
      });
  }, [alerts, selectedSiteId, severityFilter, statusFilter, searchTerm]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Severity', 'Type', 'Title', 'Message', 'Worker', 'Site', 'Acknowledged', 'Resolved'];
    const rows = filteredAlerts.map((a) => [
      a.id,
      a.timestamp,
      a.severity,
      a.type,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.message.replace(/"/g, '""')}"`,
      a.workerName || 'N/A',
      a.siteName,
      a.acknowledged ? 'Yes' : 'No',
      a.resolved ? 'Yes' : 'No',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sentinel-alerts-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Safety Sentinel Alert Center</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete incident telemetry, threshold exceedances, and manager acknowledgement audits
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 shadow-md transition-colors"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export Alert Log (.CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search alert by keyword, worker, or site..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            aria-label="Filter by Severity"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="extreme">🔥 Extreme Heat Only</option>
            <option value="danger">🔴 Danger Only</option>
            <option value="caution">🟡 Caution Only</option>
            <option value="safe">🟢 Safe Nudges</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by Status"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="unacknowledged">🚨 Unacknowledged Only</option>
            <option value="resolved">✓ Resolved Only</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="font-bold text-white">{filteredAlerts.length}</span> alerts
        </div>
      </div>

      {/* Alert List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-md">
        <div className="divide-y divide-slate-800/70">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400/60 mb-2" />
              No alerts found matching search criteria.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  alert.resolved
                    ? 'bg-slate-950/20 opacity-75'
                    : alert.severity === 'extreme'
                    ? 'bg-red-950/20 hover:bg-red-950/30'
                    : alert.severity === 'danger'
                    ? 'bg-rose-950/15 hover:bg-rose-950/25'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                {/* Left info */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="mt-1 shrink-0">
                    {alert.severity === 'extreme' ? (
                      <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                    ) : alert.severity === 'danger' ? (
                      <AlertCircle className="h-5 w-5 text-rose-400" />
                    ) : (
                      <Bell className="h-5 w-5 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100">{alert.title}</h4>
                      <StatusBadge status={alert.severity} size="sm" showPulse={false} />
                      {alert.resolved ? (
                        <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          RESOLVED
                        </span>
                      ) : alert.acknowledged ? (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                          ACKNOWLEDGED
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{alert.message}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>⏱ {new Date(alert.timestamp).toLocaleString()}</span>
                      <span>📍 {alert.siteName}</span>
                      {alert.workerName && alert.workerId && (
                        <Link
                          to={`/workers/${alert.workerId}`}
                          className="text-cyan-400 hover:underline font-sans font-semibold"
                        >
                          👤 {alert.workerName}
                        </Link>
                      )}
                      {alert.acknowledgedBy && (
                        <span className="text-slate-500">
                          (Ack by: {alert.acknowledgedBy})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                  {!alert.acknowledged && !alert.resolved && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 border border-slate-700 shadow-sm transition-colors"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 px-3.5 py-2 text-xs font-bold text-emerald-300 border border-emerald-600/40 shadow-sm transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
