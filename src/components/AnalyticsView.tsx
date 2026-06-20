import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { Transaction, Category, Budget } from '../types';
import { PieChart as PieIcon, LineChart as LineIcon, BarChart2, ShieldAlert, CheckCircle, TrendingUp } from 'lucide-react';

interface AnalyticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  currencySymbol: string;
}

export default function AnalyticsView({
  transactions,
  categories,
  budgets,
  currencySymbol
}: AnalyticsViewProps) {
  
  // Tab states for charts
  const [activeTab, setActiveTab] = useState<'kpi' | 'categories' | 'compliance'>('kpi');

  // --- 1. Income vs Expense Trend Aggregations ---
  const monthsList = ['2026-04', '2026-05', '2026-06'];
  const monthNames = ['April', 'May', 'June'];

  const trendData = monthsList.map((mo, idx) => {
    const moTxs = transactions.filter(t => t.date.startsWith(mo));
    const income = moTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = moTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;

    return {
      name: monthNames[idx],
      Income: Number(income.toFixed(2)),
      Expense: Number(expense.toFixed(2)),
      Savings: Number(savings.toFixed(2))
    };
  });

  // --- 2. Category Spending Breakdown aggregates (For June 2026) ---
  const currentMoKey = '2026-06';
  const currentMoTxs = transactions.filter(t => t.date.startsWith(currentMoKey) && t.type === 'expense');

  const catBreakdownMap: Record<string, { name: string; value: number; color: string }> = {};

  currentMoTxs.forEach(tx => {
    if (!catBreakdownMap[tx.category]) {
      const matchCat = categories.find(c => c.name === tx.category);
      catBreakdownMap[tx.category] = {
        name: tx.category,
        value: 0,
        color: matchCat ? matchCat.color : '#64748B'
      };
    }
    catBreakdownMap[tx.category].value += tx.amount;
  });

  const pieData = Object.values(catBreakdownMap).map(c => ({
    ...c,
    value: Number(c.value.toFixed(2))
  })).sort((a,b) => b.value - a.value);

  // --- 3. Cumulative Savings Growth Aggregation ---
  let cumSavings = 0;
  const savingsCumulativeTrend = monthsList.map((mo, idx) => {
    const moTxs = transactions.filter(t => t.date.startsWith(mo));
    const income = moTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = moTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    cumSavings += (income - expense);
    return {
      month: monthNames[idx],
      "Savings Growth": Number(cumSavings.toFixed(2))
    };
  });

  // --- 4. Budget Compliance Aggregates ---
  const activeBudgets = budgets.map(b => {
    const ratio = b.spent > 0 && b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
    return {
      category: b.category,
      limit: b.amount,
      spent: b.spent,
      usage: ratio
    };
  }).sort((a,b) => b.usage - a.usage);

  const colorsPalette = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#14B8A6'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] font-sans">Business Intelligence Hub</h2>
          <p className="text-sm text-[#64748b]">Deconstruct asset cashflow parameters and budget variances</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'kpi' ? 'bg-[#0f172a] text-white shadow' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Balance Trends</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'categories' ? 'bg-[#0f172a] text-white shadow' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <PieIcon className="h-4 w-4" />
            <span>Category Breakdown</span>
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'compliance' ? 'bg-[#0f172a] text-white shadow' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <LineIcon className="h-4 w-4" />
            <span>Variance & Variance</span>
          </button>
        </div>
      </div>

      {activeTab === 'kpi' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Income vs Expenses Bar */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-md font-bold text-[#0f172a]">Cashflow Synthesis</h3>
              <p className="text-xs text-[#64748b] font-semibold">Comparative overview tracking inflow against outflow monthly</p>
            </div>
            <div className="h-80 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ left: -10, top: 10, right: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" strokeWidth={0.5} />
                  <YAxis stroke="#64748B" strokeWidth={0.5} />
                  <Tooltip 
                    formatter={(val) => [`${currencySymbol}${val}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #ECEFF1', fontFamily: 'inherit' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Expense Area chart */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-md font-bold text-[#0f172a]">Outgoings Extrapolations</h3>
              <p className="text-xs text-[#64748b] font-semibold">Trajectory curves revealing seasonal velocity behaviors</p>
            </div>
            <div className="h-80 w-full font-mono text-xs animate-fade-in">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -10, top: 10, right: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" strokeWidth={0.5} />
                  <YAxis stroke="#64748B" strokeWidth={0.5} />
                  <Tooltip 
                    formatter={(val) => [`${currencySymbol}${val}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #ECEFF1' }}
                  />
                  <Area type="monotone" dataKey="Expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Pie Slice breakdown */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm md:col-span-2 space-y-4">
            <div>
              <h3 className="text-md font-bold text-[#0f172a]">Compartmentalized Allocations</h3>
              <p className="text-xs text-[#64748b] font-semibold">Spend breakdown of your overall outgoings for June 2026</p>
            </div>
            {pieData.length > 0 ? (
              <div className="grid md:grid-cols-2 items-center">
                <div className="h-72 w-full font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || colorsPalette[index % colorsPalette.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `${currencySymbol}${val}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends list */}
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-2">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[#0f172a] truncate max-w-[130px] font-semibold">{item.name}</span>
                      </div>
                      <span className="text-[#0f172a] font-mono font-bold">
                        {currencySymbol}{item.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">
                No outbound transactions logged. Complete entries to chart allocations.
              </div>
            )}
          </div>
 
          {/* Savings progression trend lines */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-md font-bold text-[#0f172a]">Compounded Savings Growth</h3>
              <p className="text-xs text-[#64748b] font-semibold">Compound curves detailing net worth additions over months</p>
            </div>
            <div className="h-72 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={savingsCumulativeTrend} margin={{ left: -10, top: 10, right: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748B" strokeWidth={0.5} />
                  <YAxis stroke="#64748B" strokeWidth={0.5} />
                  <Tooltip formatter={(val) => `${currencySymbol}${val}`} />
                  <Line type="monotone" dataKey="Savings Growth" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 1 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#0f172a]">Threshold Compliance Auditing</h3>
            <p className="text-xs text-[#64748b] font-semibold">Variance percentages evaluating actual spend velocities against mapped thresholds</p>
          </div>
 
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Variance Allocation Details</h4>
              <div className="space-y-4">
                {activeBudgets.map((bud, index) => (
                  <div key={bud.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#0f172a]">{bud.category} Limit Utilization</span>
                      <span className={bud.usage > 100 ? 'text-rose-650 font-bold' : 'text-[#64748b]'}>
                        {bud.usage}% Utilized
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          bud.usage > 100 ? 'bg-rose-500 animate-pulse' : bud.usage > 80 ? 'bg-amber-400' : 'bg-[#2563eb]'
                        }`} 
                        style={{ width: `${Math.min(bud.usage, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {activeBudgets.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-150 rounded-lg">
                    No active limits logged. Configure budget targets under Budgets tab first!
                  </div>
                )}
              </div>
            </div>

            {/* Tactical insights card */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Variance Diagnostic Review</span>
                </h4>
                <p className="text-xs text-slate-700 leading-normal">
                  Our algorithm tracks category spending speed metrics. For the current June 2026 reporting cycle, you have a solid performance:
                </p>
                <ul className="text-xs text-slate-700 space-y-2">
                  {activeBudgets.some(b => b.usage > 100) ? (
                    <li className="flex items-start gap-2 text-rose-700 font-semibold bg-rose-50 border border-rose-155 p-2 rounded">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Warning: One or more categories have overshot target limit bounds. Tighten floating outlays immediately.</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2 text-emerald-800 font-semibold bg-emerald-50 border border-emerald-100/60 p-2 rounded bg-opacity-70">
                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Perfect compliance! All active expense segments remain within safe budget configurations. Keep up the high financial discipline parameters.</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="text-[10px] text-slate-450 border-t border-slate-200/60 pt-3 mt-4">
                Automated auditing evaluations execute natively inside the FinTrack Analytics framework.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
