import React, { useState, useEffect, useMemo } from 'react';
import { AdminAuditLog } from '../types';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  SlidersHorizontal, 
  Terminal,
  Activity,
  HardDrive,
  Eye,
  Trash2
} from 'lucide-react';

interface Props {
  refreshTrigger?: number; // to sync with AdminPanel refreshes (if user resets DB or wipes user)
}

export default function AdminAuditLogsView({ refreshTrigger = 0 }: Props) {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING' | 'FAILED'>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Simulation input
  const [simAction, setSimAction] = useState('CONFIG_OVERRIDE');
  const [simDetails, setSimDetails] = useState('Rotated system encryption keys and cleared expired auth bearer tokens.');
  const [simStatus, setSimStatus] = useState<'SUCCESS' | 'WARNING' | 'FAILED'>('SUCCESS');
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unassigned privileges to read records.');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not load administrative audit registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [refreshTrigger]);

  // Unique actions in current logs for filter list
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    logs.forEach(l => {
      if (l.action) actions.add(l.action);
    });
    return Array.from(actions);
  }, [logs]);

  // Filter & Search application
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action?.toLowerCase().includes(search.toLowerCase()) ||
        log.actorEmail?.toLowerCase().includes(search.toLowerCase()) ||
        log.details?.toLowerCase().includes(search.toLowerCase()) ||
        log.ipAddress?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

      return matchesSearch && matchesStatus && matchesAction;
    });
  }, [logs, search, statusFilter, actionFilter]);

  // Stats computation
  const stats = useMemo(() => {
    let success = 0;
    let warning = 0;
    let failed = 0;
    logs.forEach(l => {
      if (l.status === 'SUCCESS') success++;
      else if (l.status === 'WARNING') warning++;
      else if (l.status === 'FAILED') failed++;
    });
    return { success, warning, failed, total: logs.length };
  }, [logs]);

  // Download simulation
  const handleDownloadCsv = () => {
    const headers = ['ID', 'Action', 'Actor Email', 'IP Address', 'Target User', 'Status', 'Details', 'Timestamp'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.action,
      log.actorEmail,
      log.ipAddress,
      log.targetUser || 'N/A',
      log.status,
      `"${log.details.replace(/"/g, '""')}"`,
      log.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fintrack-administrative-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSimSuccessMsg("CSV report generated and downloaded.");
    setTimeout(() => setSimSuccessMsg(null), 3500);
  };

  // Run audit simulation locally post api trigger
  const handleSimulateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAction || !simDetails) return;

    const token = localStorage.getItem('token');
    try {
      // We will introduce a direct API path to log simulated events if we want, or do custom post
      // Let's create an intuitive simulation action on the backend or just append locally if they sandboxed.
      // But we can actually write a mock POST to log things.
      // To keep things super elegant and robust, let's send a post request to the backend or simulate directly
      // Since our backend handles addAdminAuditLog, let's look if we should support a POST `/api/admin/audit-logs/simulate`
      // Wait, let's just make a POST to /api/admin/reset-db, let's see, we can add a POST /api/admin/audit-logs/custom log endpoint!
      // This is extremely simple and works fully dynamically. Let's send a POST and refresh!
      const response = await fetch('/api/admin/audit-logs/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: simAction,
          details: simDetails,
          status: simStatus
        })
      });

      if (response.ok) {
        setSimSuccessMsg(`Successfully logged event: ${simAction}`);
        setTimeout(() => setSimSuccessMsg(null), 4000);
        fetchAuditLogs();
      } else {
        throw new Error("Failed to post custom test log.");
      }
    } catch {
      // Fallback: append locally as safety simulator fallback if endpoint doesn't accept
      const demoLog: AdminAuditLog = {
        id: `alog-sim-${Math.random().toString(36).substr(2, 5)}`,
        action: simAction,
        actorEmail: 'admin@fintrack.io',
        ipAddress: '10.0.1.137',
        details: simDetails,
        status: simStatus,
        createdAt: new Date().toISOString()
      };
      setLogs(prev => [demoLog, ...prev]);
      setSimSuccessMsg(`[Local Override Mode] Simulated: ${simAction}`);
      setTimeout(() => setSimSuccessMsg(null), 4000);
    }
  };

  const getStatusIcon = (status: 'SUCCESS' | 'WARNING' | 'FAILED') => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-rose-500" />;
    }
  };

  const getStatusColorClass = (status: 'SUCCESS' | 'WARNING' | 'FAILED') => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-150';
      case 'FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  return (
    <div className="space-y-6" id="admin-audit-logs">
      {/* Overview Stat Widgets */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Audit Count</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.total}</span>
          </div>
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
            <Terminal className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Successful Operations</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.success}</span>
          </div>
          <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Modifications & Warnings</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.warning}</span>
          </div>
          <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Failed Attempts</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.failed}</span>
          </div>
          <div className="bg-rose-50 p-2 rounded-lg text-rose-600">
            <XCircle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Main Board */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {/* Board Controller Header */}
        <div className="p-5 border-b border-slate-55/60 bg-slate-50/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-600 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Privileged Central Audit Logs</h3>
                <p className="text-[10px] text-slate-400">Strict chronological trail of administrative triggers and configurations</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleDownloadCsv}
                disabled={filteredLogs.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-650 cursor-pointer disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={fetchAuditLogs}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 p-1.5 text-slate-500 cursor-pointer disabled:animate-spin"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid gap-3 sm:grid-cols-4 pt-1.5">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search action keyword, actor, IP address, details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-4 py-2 bg-white focus:border-indigo-500 focus:outline-none placeholder-slate-400 text-slate-800"
              />
            </div>

            {/* Severity Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none text-slate-700 font-semibold"
              >
                <option value="ALL">Severity: All Levels</option>
                <option value="SUCCESS">Success Only</option>
                <option value="WARNING">Modifications (Warning)</option>
                <option value="FAILED">Failures Only</option>
              </select>
            </div>

            {/* Action categories Filter */}
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none text-slate-700 font-semibold"
              >
                <option value="ALL">Action Category: All</option>
                {uniqueActions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading audit log stream...</div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-rose-500">{error}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No admin log entries matching current filters.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Action Token</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">IP Node</th>
                  <th className="py-3 px-4">Action Summary Details</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-medium text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColorClass(log.status)}`}>
                        {getStatusIcon(log.status)}
                        <span>{log.status}</span>
                      </span>
                    </td>
                    
                    {/* Action Token */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50/30 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>

                    {/* Operator */}
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-mono">{log.actorEmail}</span>
                    </td>

                    {/* IP Node */}
                    <td className="py-3 px-4">
                      <span className="text-slate-400 font-mono select-all text-[11px]">{log.ipAddress}</span>
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 max-w-[320px]">
                      <p className="text-slate-650 leading-relaxed truncate hover:text-clip hover:whitespace-normal font-normal text-[11px]" title={log.details}>
                        {log.details}
                      </p>
                      {log.targetUser && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded mt-1 inline-block">
                          Target: {log.targetUser}
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Interactive Logs Simulator Sandbox */}
      <div className="rounded-xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4.5 w-4.5 text-indigo-700" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Administrative Sandboxing Sandbox</h4>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          Inject manual security system signals or administrative actions to test routing updates, table density formatting, and downstream audit alarm handlers within the sandbox environment.
        </p>

        {simSuccessMsg && (
          <div className="p-2.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold animate-pulse">
            {simSuccessMsg}
          </div>
        )}

        <form onSubmit={handleSimulateLog} className="grid gap-3 sm:grid-cols-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Code</label>
            <select
              value={simAction}
              onChange={(e) => setSimAction(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
            >
              <option value="CONFIG_OVERRIDE">CONFIG_OVERRIDE</option>
              <option value="ACCESS_DELEGATION">ACCESS_DELEGATION</option>
              <option value="SECURITY_REBOOT">SECURITY_REBOOT</option>
              <option value="THRESHOLD_BREACH">THRESHOLD_BREACH</option>
              <option value="CRITICAL_FIREWALL_UPDATE">FIREWALL_ALERT</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Description Details</label>
            <input
              type="text"
              value={simDetails}
              onChange={(e) => setSimDetails(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 text-slate-800"
              placeholder="Detailed description of what the security operator did..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Severity Status</label>
            <div className="flex items-center gap-2">
              <select
                value={simStatus}
                onChange={(e) => setSimStatus(e.target.value as any)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
              >
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARNING">WARNING</option>
                <option value="FAILED">FAILED</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 cursor-pointer transition-colors shrink-0"
              >
                <Play className="h-3 w-3" />
                <span>Simulate</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
