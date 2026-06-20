import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, Terminal, Calendar, Activity } from 'lucide-react';
import { ActivityLog } from '../types';

export default function SecurityLogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/activity-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Active Surveillance Logs</h2>
          <p className="text-sm text-slate-500">Examine real-time security events, access control lists, and database adjustments</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Terminal style visual table */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-teal-600 bg-teal-50 border border-teal-100 p-2.5 rounded-lg max-w-max">
          <Terminal className="h-4 w-4" />
          <span>Surveillance Monitor Active: Compliance Level 1 Decrypted</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-300 p-4">
          <div className="space-y-2 max-h-[450px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-2 hover:bg-slate-900/50 p-2.5 rounded transition-all">
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold shrink-0">[OK]</span>
                  <div>
                    <strong className="text-white text-xs">{log.action}</strong>
                    <p className="text-slate-400 mt-0.5">{log.details}</p>
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 text-slate-500 text-[10px] flex items-center gap-1 shrink-0 font-medium font-sans">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-20 text-center text-slate-500">
                // No surveillance events indexed. Secure telemetry fully compliant.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
