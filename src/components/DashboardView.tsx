import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Wallet, 
  PlusCircle, 
  UploadCloud, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { Transaction, Budget, Goal, Notification, Investment } from '../types';

interface DashboardViewProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  notifications: Notification[];
  currencySymbol: string;
  onNavigateTo: (view: string) => void;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onOpenReceiptScan: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  investments?: Investment[];
}

export default function DashboardView({
  transactions,
  budgets,
  goals,
  notifications,
  currencySymbol,
  onNavigateTo,
  onOpenAddExpense,
  onOpenAddIncome,
  onOpenReceiptScan,
  onMarkRead,
  onMarkAllRead,
  investments = []
}: DashboardViewProps) {
  
  // Calculate aggregates for current month (June 2026 based on timestamp)
  const currentMonthIdx = 5; // June is index 5 (0-indexed) or month 6
  const currentYear = 2026;

  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
  });

  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = monthlyIncome - monthlyExpense;

  // Let's get cumulative net savings across all tracked months
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;
  
  // Investments totals
  const totalInvsValuation = investments.reduce((sum, i) => sum + ((i.currentPrice || i.buyPrice) * i.quantity), 0);
  const totalNetWorthCombined = totalBalance + totalInvsValuation;

  // Find exceeded budgets
  const activeExceededBudgets = budgets.filter(b => b.spent > b.amount);

  // Active goals summary
  const totalGoalsProgress = goals.length > 0
    ? Math.round((goals.reduce((sum, g) => sum + (g.currentAmount / g.targetAmount), 0) / goals.length) * 100)
    : 0;

  // Format currency numbers beautifully
  const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Upper header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0f172a]">Financial Snapshot</h2>
          <p className="text-sm text-[#64748b]">VaultFlow active enterprise monitoring is active.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={onOpenReceiptScan}
            className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-semibold text-[#2563eb] border border-blue-100 hover:bg-blue-100/60 transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Scan Receipt AI</span>
          </button>
          
          <button 
            onClick={onOpenAddExpense}
            className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Expense</span>
          </button>

          <button 
            onClick={onOpenAddIncome}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-600/10 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Net Worth Card */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Total Net Worth</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2563eb]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight text-[#0f172a]">
              {currencySymbol}{fmt(totalNetWorthCombined)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#64748b]">
            <span className="font-semibold text-[#2563eb]">Cash: {currencySymbol}{fmt(totalBalance)}</span>
            <span>Assets: {currencySymbol}{fmt(totalInvsValuation)}</span>
          </div>
        </div>

        {/* Monthly Income Card */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Monthly Income</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight text-[#0f172a]">
              {currencySymbol}{fmt(monthlyIncome)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700 flex items-center gap-0.5 text-[10px]">
              +12.4%
            </span>
            <span>from dividends & salary</span>
          </div>
        </div>

        {/* Monthly Expense Card */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Monthly Spend</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {currencySymbol}{fmt(monthlyExpense)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700 flex items-center gap-0.5 text-[10px]">
              +4.8%
            </span>
            <span>this period spendings</span>
          </div>
        </div>

        {/* Monthly Savings Card */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Net Monthly Savings</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2563eb]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-bold tracking-tight ${monthlySavings >= 0 ? 'text-[#0f172a]' : 'text-rose-600'}`}>
              {currencySymbol}{fmt(monthlySavings)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748b]">
            <span className="font-bold text-[#2563eb]">
              {monthlyIncome > 0 ? `${Math.round((monthlySavings / monthlyIncome) * 100)}%` : '0%'}
            </span>
            <span>savings rate achieved</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content - Bento Style */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Col - Recent Transactions */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-[#0f172a]">Recent Activity Ledger</h3>
              <p className="text-xs text-[#64748b]">Your latest verified account postings</p>
            </div>
            <button 
              onClick={() => onNavigateTo('transactions')}
              className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer hover:underline"
            >
              <span>View all entries</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wider text-[#64748b] border-b border-slate-100">
                  <th className="py-3 px-3">Entity Description</th>
                  <th className="py-3 px-3">Posting Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Settled Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {transactions.slice(0, 6).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-[#0f172a] leading-tight">
                        {tx.notes || tx.category}
                      </div>
                      {tx.tags && tx.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tx.tags.map(tag => (
                            <span key={tag} className="inline-block text-[9px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#64748b] text-xs font-mono">
                      {tx.date}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`py-3.5 px-3 font-mono font-bold text-right ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-[#0f172a]'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-450 text-xs">
                      No matching records logged. Start by inserting some!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col - Advisor Alerts & Budgets summaries */}
        <div className="space-y-6">
          {/* Budgets Tracker Card */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h3 className="text-md font-bold text-[#0f172a]">Budget Utilization</h3>
            <p className="text-xs text-[#64748b] mb-4">How your key categories track</p>
            
            <div className="space-y-4">
              {budgets.slice(0, 4).map((bud) => {
                const ratio = Math.min((bud.spent / bud.amount) * 100, 100);
                const isExceeded = bud.spent > bud.amount;
                return (
                  <div key={bud.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{bud.category}</span>
                      <span className={`${isExceeded ? 'text-rose-650' : 'text-slate-600'}`}>
                        {currencySymbol}{bud.spent} / {currencySymbol}{bud.amount}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded ? 'bg-rose-500' : ratio > 80 ? 'bg-amber-500' : 'bg-[#2563eb]'
                        }`} 
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <div className="py-4 text-center text-xs text-slate-450">
                  No budget thresholds mapped. Configure limits under 'Budgets'.
                </div>
              )}
            </div>
            {budgets.length > 0 && (
              <button 
                onClick={() => onNavigateTo('budgets')}
                className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Manage Budgets</span>
              </button>
            )}
          </div>

          {/* Real-time System Notifications & Alerts center */}
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-500" />
                <span>System Health Logs</span>
              </h3>
              {notifications.some(n => !n.read) && (
                <button 
                  onClick={onMarkAllRead}
                  className="text-[10px] font-bold text-teal-600 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {notifications.slice(0, 3).map((notif) => (
                <div 
                  key={notif.id} 
                  className={`relative p-3 rounded-lg border flex gap-2.5 transition-all ${
                    notif.read ? 'bg-slate-50/50 border-slate-100' : 'bg-amber-50/60 border-amber-100 shadow-sm'
                  }`}
                >
                  <div className="mt-0.5">
                    {notif.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                    ) : notif.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-teal-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{notif.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono block">
                      {new Date(notif.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  {!notif.read && (
                    <button 
                      onClick={() => onMarkRead(notif.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 text-[9px] font-semibold uppercase tracking-wider"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No warnings triggered. Everything is within optimal safety ranges.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
