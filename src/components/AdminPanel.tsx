import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Database, 
  DollarSign, 
  Layers, 
  Activity, 
  AlertOctagon, 
  Trash2,
  CheckCircle,
  RefreshCw,
  Cpu,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import AdminAuditLogsView from './AdminAuditLogsView';

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalBudgets: number;
  totalGoals: number;
  monthlySubscriptionRevenue: number;
  usersList: Array<{ 
    id: string; 
    email: string; 
    name: string; 
    currency: string; 
    createdAt: string; 
    role?: 'admin' | 'user' 
  }>;
}

export default function AdminPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setErr(null);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Forbidden. Admin authorization required.');
      const data = await res.json();
      setMetrics(data);
    } catch (e: any) {
      console.error(e);
      setErr(e.message || 'Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('Warning: This action will restore database structures back to original seed datasets, wiping all added custom elements! Proceed?')) {
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg('Success! Factory seed transactions and configurations deployed.');
        setTimeout(() => setMsg(null), 3000);
        fetchMetrics();
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}" and all their budgets, goals, transactions records?`)) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg(`Deleted ${name} successfully.`);
        setTimeout(() => setMsg(null), 3000);
        fetchMetrics();
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete user.');
      }
    } catch (e: any) {
      console.error(e);
      setErr(e.message || 'Error executing request.');
      setTimeout(() => setErr(null), 4000);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'user', userName: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role.');
      }

      setMsg(`Saved! Changed security role of "${userName}" to ${newRole.toUpperCase()}.`);
      setTimeout(() => setMsg(null), 3500);
      fetchMetrics();
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      console.error(e);
      setErr(e.message || 'Error occurred while updating user permissions.');
      setTimeout(() => setErr(null), 5500);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (err && !metrics) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-8 text-center space-y-4 shadow-sm animate-fade-in max-w-xl mx-auto">
        <AlertOctagon className="h-10 w-10 text-rose-500 mx-auto" strokeWidth={1.5} />
        <h3 className="text-md font-bold text-slate-900">Privileged View Forbidden</h3>
        <p className="text-xs text-slate-500">
          This system administrative control grid requires elevated authorization. Log in as saranramesh709@gmail.com, or the main Admin account to configure telemetry overrides.
        </p>
        <div className="text-[10px] bg-slate-100 p-2.5 rounded border leading-relaxed text-slate-500">
          <strong>Tip</strong>: Go to Logout and click "Access as Saran Ramesh" or "Access as System Admin" to instantly bypass registration for preview evaluations.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Administrative Command Centre</h2>
          <p className="text-sm text-slate-500">Override database thresholds, monitor subscription revenues, and manage user permissions role-based access</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleResetDb}
            className="flex items-center gap-1.5 rounded-lg border border-rose-250 bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 text-xs font-bold transition-all cursor-pointer"
          >
            <Database className="h-4 w-4" />
            <span>Reseed / Factory Reset DB</span>
          </button>
          <button 
            onClick={fetchMetrics}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 animate-spin-delayed" />
            <span>Poll Telemetry</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 font-bold shadow-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-800 font-bold shadow-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {metrics && (
        <div className="space-y-8">
          {/* Metrics KPIs list */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Registered counters */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider">Indexed Accounts</span>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold mt-3 text-slate-900">{metrics.totalUsers}</p>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Live DB Users table records count</span>
            </div>

            {/* DAU */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-555 uppercase tracking-wider">Daily Actives DAU</span>
                <Cpu className="h-4 w-4 text-teal-600 animate-pulse" />
              </div>
              <p className="text-2xl font-bold mt-3 text-slate-900">{metrics.activeUsers}</p>
              <span className="text-[10px] text-teal-700 font-semibold mt-1 block">~80% engagement density metrics</span>
            </div>

            {/* Transactions count */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider">Invoiced Ledgers</span>
                <Layers className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold mt-3 text-slate-900">{metrics.totalTransactions}</p>
              <span className="text-[10px] text-slate-450 font-semibold mt-1 block">Combined expenses/incomes in database</span>
            </div>

            {/* Revenue MRR */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border-emerald-150/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-550 uppercase tracking-wider">Estimated MRR</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold mt-3 text-slate-900">${metrics.monthlySubscriptionRevenue}</p>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">Computed off $14.99 SaaS licensing model</span>
            </div>
          </div>

          {/* Permissions & Accounts Management Section */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Permissions & Access Control (RBAC)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  View and assign dynamic role credentials to user profiles. Roles dictate administrative control limits enforced securely by backend system guards.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Real-time DB Guards Active</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-wider text-slate-450 text-[10px]">
                    <th className="py-3 px-4 rounded-l-md">Account ID</th>
                    <th className="py-3 px-4">Profile Name</th>
                    <th className="py-3 px-4">Electronic Mail</th>
                    <th className="py-3 px-4">Locale</th>
                    <th className="py-3 px-4 text-center">Security Role</th>
                    <th className="py-3 px-4">Creation Timestamp</th>
                    <th className="py-3 px-4 text-center rounded-r-md">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 font-medium text-slate-700">
                  {metrics.usersList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Account ID */}
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{usr.id}</td>
                      
                      {/* Name */}
                      <td className="py-3 px-4 text-slate-950 font-bold max-w-[150px] truncate">
                        <div className="flex items-center gap-1.5">
                          {usr.role === 'admin' ? (
                            <ShieldCheck className="h-4 w-4 text-indigo-600" title="Administrator Role" />
                          ) : (
                            <Shield className="h-4 w-4 text-slate-400" title="Standard User Role" />
                          )}
                          <span>{usr.name}</span>
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px] select-all">{usr.email}</td>
                      
                      {/* Currency */}
                      <td className="py-3 px-4 text-slate-500 font-bold">{usr.currency || 'USD'}</td>
                      
                      {/* Role selection toggle */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-block relative">
                          <select
                            value={usr.role || 'user'}
                            disabled={usr.id === 'user-admin'}
                            onChange={(e) => handleUpdateUserRole(usr.id, e.target.value as 'admin' | 'user', usr.name)}
                            className="bg-white border text-[11px] border-slate-200 hover:border-slate-350 cursor-pointer rounded px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed select-none"
                          >
                            <option value="user">User Role</option>
                            <option value="admin">Admin Role</option>
                          </select>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {usr.createdAt ? new Date(usr.createdAt).toLocaleString('en-US') : 'N/A'}
                      </td>
                      
                      {/* Delete Account */}
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={usr.id === 'user-admin'}
                          onClick={() => handleDeleteUser(usr.id, usr.name)}
                          className="px-2 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100/40 rounded hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer"
                        >
                          Wipe Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-lg flex gap-3 text-xs text-slate-550 leading-relaxed">
              <ShieldAlert className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 block mb-0.5">Critical Self-Lockout Safety Rule Enabled:</strong>
                Active administrators cannot demote their own permission level to 'User' or initiate self-deletion commands. This precaution guarantees uninterrupted dashboard control availability. All privilege modifications are permanently written to the secure, tamper-proof system audit logs stream visible below.
              </div>
            </div>
          </div>

          {/* Integration of sensitive Administrative Audit logs trail */}
          <AdminAuditLogsView refreshTrigger={refreshTrigger} />
        </div>
      )}
    </div>
  );
}
