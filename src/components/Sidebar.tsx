import { 
  Home, 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  Brain, 
  Shield, 
  Settings, 
  LogOut, 
  Bell, 
  Menu, 
  ChevronRight,
  Sparkles,
  LineChart,
  Layers,
  GitBranch,
  CalendarDays
} from 'lucide-react';
import { User, Notification } from '../types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  user: User | null;
  onLogout: () => void;
  notifications: Notification[];
  unreadCount: number;
  onOpenNotifications: () => void;
  currencySymbol: string;
  totalBalance: number;
}

export default function Sidebar({
  currentView,
  setCurrentView,
  user,
  onLogout,
  unreadCount,
  onOpenNotifications,
  currencySymbol,
  totalBalance
}: SidebarProps) {
  
  // Define menu items, with Admin restricted strictly to admin user credentials
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'transactions', name: 'Transactions', icon: DollarSign },
    { id: 'recurring', name: 'Recurring Payments', icon: CalendarDays },
    { id: 'investments', name: 'Investments', icon: LineChart },
    { id: 'spend-similarity', name: 'Spent Similarity', icon: Layers, highlight: false },
    { id: 'portfolio-similarity', name: 'Portfolio Correlation', icon: GitBranch, highlight: false },
    { id: 'budgets', name: 'Budgets & Goals', icon: TrendingUp },
    { id: 'analytics', name: 'Analytics', icon: PieChart },
    { id: 'ai-advisor', name: 'Smart AI Advisor', icon: Brain, highlight: true },
    { id: 'security-logs', name: 'Activity Logs', icon: Shield },
    ...(user?.role === 'admin' ? [{ id: 'admin', name: 'Admin Console', icon: Settings, highlight: false }] : [])
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800/80 shadow-xl transition-transform md:translate-x-0">
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] shadow-lg shadow-blue-500/10">
            <TrendingUp className="h-5 w-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              VaultFlow
            </h1>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400">
              Wealth Console
            </span>
          </div>
        </div>
      </div>

      {/* Account Balance Widget */}
      {user && (
        <div className="m-4 rounded-xl bg-slate-900/60 p-4 border border-slate-800 shadow-inner">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Net Worth</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-sans tracking-tight text-white">
              {currencySymbol}{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Primary Currency</span>
            <span className="font-semibold text-blue-400">{user.currency}</span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-0 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex w-full items-center justify-between py-3 px-6 text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[#2563eb]/15 text-blue-400 border-r-[3.5px] border-[#3b82f6]'
                  : 'text-[#94a3b8] hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-[18px] w-[18px] transition-colors ${
                  isActive ? 'text-[#3b82f6]' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>{item.name}</span>
                {item.highlight && (
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase shadow-sm">
                    PRO
                  </span>
                )}
              </div>
              {!isActive && (
                <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-slate-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Health Score Widget */}
      {user && (
        <div className="px-4">
          <div className="rounded-xl bg-[#1e293b] p-3.5 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Health Score</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">Stable</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">84/100</div>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-[#10b981] rounded-full" style={{ width: '84%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Profile Widget & Notification Alarm */}
      {user && (
        <div className="mt-auto border-t border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={onLogout}
              className="p-2 rounded-lg text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img 
              src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
              alt={user.name}
              className="h-10 w-10 rounded-xl bg-slate-800 object-cover border border-slate-700/60"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
