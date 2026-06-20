import React, { useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  PlusCircle, 
  Coins, 
  FileEdit, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Flame,
  X,
  Sparkles,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  CalendarRange
} from 'lucide-react';
import { Budget, Goal, Category, Transaction } from '../types';

interface BudgetsGoalsViewProps {
  budgets: Budget[];
  goals: Goal[];
  categories: Category[];
  currencySymbol: string;
  transactions: Transaction[];
  onAddBudget: (bud: any) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onAddGoal: (goal: any) => Promise<void>;
  onUpdateGoal: (id: string, updates: any) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export default function BudgetsGoalsView({
  budgets,
  goals,
  categories,
  currencySymbol,
  transactions,
  onAddBudget,
  onDeleteBudget,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal
}: BudgetsGoalsViewProps) {
  
  // Local form toggles
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Smart Savings Goals Advisor Interactive Sandbox States
  const [customMonthIncome, setCustomMonthIncome] = useState<number | null>(null);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [successMessages, setSuccessMessages] = useState<{ [id: string]: string }>({});

  const currentMonth = 6; // June
  const currentYear = 2026;

  // Total income for current month
  const currentMonthIncomes = (transactions || []).filter(t => {
    if (t.type !== 'income') return false;
    const date = new Date(t.date);
    return date.getFullYear() === currentYear && (date.getMonth() + 1) === currentMonth;
  });
  const currentMonthIncomeTotal = currentMonthIncomes.reduce((sum, t) => sum + t.amount, 0);

  // If there are no incomes this month, let's look at all-time average monthly income
  const allIncomes = (transactions || []).filter(t => t.type === 'income');
  const uniqueMonths = new Set(allIncomes.map(t => {
    const d = new Date(t.date);
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  }));
  const averageAllTimeIncome = allIncomes.length > 0 
    ? allIncomes.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, uniqueMonths.size)
    : 0;

  // Let's decide on the "Effective Monthly Income"
  const computedBaseline = currentMonthIncomeTotal > 0 
    ? currentMonthIncomeTotal 
    : (averageAllTimeIncome > 0 ? averageAllTimeIncome : 4500);

  const activeIncomeBaseline = customMonthIncome !== null ? customMonthIncome : computedBaseline;

  // Let's calculate total budgets obligations for this month (Month 6, Year 2026)
  const currentMonthBudgets = budgets.filter(b => b.month === currentMonth && b.year === currentYear);
  const totalBudgetsObligation = currentMonthBudgets.reduce((sum, b) => sum + b.amount, 0);

  // Calculate remaining monthly disposable income after budget obligations
  const disposableIncomeValue = activeIncomeBaseline - totalBudgetsObligation;

  // Helper to compute months between current date (June 2026) and a target date
  const getMonthsRemaining = (targetDateStr: string) => {
    const baseYear = 2026;
    const baseMonth = 6; // June (1-indexed)
    
    const targetDate = new Date(targetDateStr);
    if (isNaN(targetDate.getTime())) return 1;
    
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    
    const diffYears = targetYear - baseYear;
    const diffMonths = targetMonth - baseMonth;
    
    const totalMonths = diffYears * 12 + diffMonths;
    return Math.max(1, totalMonths);
  };

  // Helper to get formatted date string X months into front
  const getDateXMonthsInFuture = (monthsInFuture: number) => {
    const baseYear = 2026;
    const baseMonth = 5; // June is index 5
    const baseDay = 18; // June 18
    
    const d = new Date(baseYear, baseMonth + monthsInFuture, baseDay);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${y}-${m}-${day}`;
  };

  const handleApplyAdjustment = async (goalId: string, updates: any, actionType: string) => {
    setUpdatingGoalId(goalId);
    try {
      await onUpdateGoal(goalId, updates);
      setSuccessMessages(prev => ({
        ...prev,
        [goalId]: `Success! Adjusted parameters via Advisor utilizing dynamic cashflow data.`
      }));
      setTimeout(() => {
        setSuccessMessages(prev => {
          const next = { ...prev };
          delete next[goalId];
          return next;
        });
      }, 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingGoalId(null);
    }
  };

  // Budget form states
  const [budgetCategory, setBudgetCategory] = useState(categories.find(c => c.type === 'expense')?.name || '');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetMonth, setBudgetMonth] = useState('6'); // June
  const [budgetYear, setBudgetYear] = useState('2026');

  // Goals form states
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDate, setGoalDate] = useState('2026-12-31');
  const [goalCategory, setGoalCategory] = useState('');

  // Editing goals contribution state
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCategory || !budgetAmount) return;

    await onAddBudget({
      category: budgetCategory,
      amount: parseFloat(budgetAmount),
      month: parseInt(budgetMonth),
      year: parseInt(budgetYear)
    });

    setIsBudgetModalOpen(false);
    setBudgetAmount('');
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTarget) return;

    await onAddGoal({
      title: goalTitle,
      targetAmount: parseFloat(goalTarget),
      currentAmount: parseFloat(goalCurrent) || 0,
      targetDate: goalDate,
      category: goalCategory || undefined
    });

    setIsGoalModalOpen(false);
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('0');
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalId || !contributionAmount) return;

    const goal = goals.find(g => g.id === contributeGoalId);
    if (!goal) return;

    const newAmount = goal.currentAmount + parseFloat(contributionAmount);
    await onUpdateGoal(contributeGoalId, { currentAmount: newAmount });

    setContributeGoalId(null);
    setContributionAmount('');
  };

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* SECTION 1: Monthly Budgets tracker */}
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] font-sans">Envisioned Budgets</h2>
            <p className="text-sm text-[#64748b]">Track and lock customized monthly limits by spending category</p>
          </div>
          <button 
            onClick={() => setIsBudgetModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Configure Category Limit</span>
          </button>
        </div>

        {/* Budgets Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((bud) => {
            const ratio = (bud.spent / bud.amount) * 100;
            const percentage = Math.min(ratio, 100);
            const remaining = Math.max(bud.amount - bud.spent, 0);
            const isExceeded = bud.spent > bud.amount;

            return (
              <div 
                key={bud.id} 
                className={`rounded-xl border bg-white p-5 shadow-sm space-y-4 hover:shadow transition-shadow relative ${
                  isExceeded ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-bold text-[#0f172a]">{bud.category} Budget</h3>
                    <p className="text-xs text-slate-400 font-semibold">Month: {bud.month}/{bud.year}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (confirm(`Remove custom limit for ${bud.category}?`)) onDeleteBudget(bud.id);
                    }}
                    className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors cursor-pointer font-semibold"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-3.5" id={`budget-progress-${bud.id}`}>
                  {/* Detailed consumed vs remaining percentage telemetry header */}
                  <div className="flex items-center justify-between text-[10.5px] font-bold tracking-tight text-slate-500 uppercase">
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${isExceeded ? 'bg-rose-600 animate-pulse' : 'bg-blue-600'}`} />
                      <span>Consumed ({Math.round(ratio)}%)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                      <span>Remaining ({Math.round(Math.max(100 - ratio, 0))}%)</span>
                    </span>
                  </div>

                  {/* Elegant Thick Dynamic Progress Track Bar */}
                  <div className="relative h-4.5 w-full rounded-full bg-slate-100 p-0.5 overflow-hidden border border-slate-200/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 relative flex items-center justify-end ${
                        isExceeded 
                          ? 'bg-rose-550 shadow-sm' 
                          : ratio > 90 
                            ? 'bg-rose-450'
                            : ratio > 75 
                              ? 'bg-amber-450' 
                              : 'bg-blue-650'
                      }`}
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 12 && (
                        <span className="text-[9px] font-black text-white px-2.5 leading-none select-none font-mono">
                          {Math.round(ratio)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial breakdown values label */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-150 flex flex-col">
                      <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Spent</span>
                      <span className={`text-xs font-bold font-mono ${isExceeded ? 'text-rose-600' : 'text-slate-800'}`}>
                        {currencySymbol}{bud.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-150 flex flex-col text-right">
                      <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Remaining</span>
                      <span className={`text-xs font-bold font-mono ${remaining === 0 ? 'text-rose-500 font-medium' : 'text-emerald-700'}`}>
                        {currencySymbol}{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-450 font-mono pt-0.5">
                    <span>Limit: {currencySymbol}{bud.amount}</span>
                    <span className={isExceeded ? 'text-rose-600 font-bold animate-pulse' : 'text-slate-500'}>
                      {isExceeded ? `Overspent by ${currencySymbol}${Math.abs(bud.amount - bud.spent).toFixed(2)}` : `${currencySymbol}${remaining.toFixed(2)} available`}
                    </span>
                  </div>
                </div>

                {/* Status Indicator Flags */}
                {isExceeded ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-xs text-rose-700 font-medium mt-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Threshold exceeded alarm active! Tighten dynamic limits.</span>
                  </div>
                ) : percentage > 85 ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-100 p-2.5 text-xs text-amber-700 font-medium mt-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Budget buffer threshold reached. Monitor active outgoings.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-xs text-emerald-800 font-semibold mt-3 bg-opacity-70">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Safe budget zone. Perfect compliance parameters.</span>
                  </div>
                )}
              </div>
            );
          })}
          {budgets.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              No categories configured. Setup monthly limits to alert when groceries or shopping exceeds target!
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Savings Goals progression trackers */}
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] font-sans">Accumulated Wealth Goals</h2>
            <p className="text-sm text-[#64748b]">Track and contribute to emergency buffers or high-yield savings objectives</p>
          </div>
          <button 
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Map Savings Goal</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const ratio = (g.currentAmount / g.targetAmount) * 100;
            const percentage = Math.min(ratio, 100);
            const isCompleted = g.currentAmount >= g.targetAmount;

            return (
              <div 
                key={g.id} 
                className={`rounded-xl border bg-white p-5 shadow-sm space-y-4 hover:shadow transition-shadow relative ${
                  isCompleted ? 'border-emerald-250 bg-emerald-50/5' : 'border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                      <Target className="h-4 w-4 text-[#2563eb]" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-[#0f172a]">{g.title}</h3>
                      <p className="text-xs text-slate-400 font-semibold">By: {g.targetDate}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm(`Remove savings goal for ${g.title}?`)) onDeleteGoal(g.id);
                    }}
                    className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 font-semibold">Achieved: {Math.round(percentage)}%</span>
                    <span className="text-[#0f172a] font-mono font-semibold">
                      {currencySymbol}{g.currentAmount.toLocaleString()} / {currencySymbol}{g.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 bg-[#2563eb]`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Actions inside goal: Add capital */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setContributeGoalId(g.id)}
                    className="flex-1 py-2 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Contribute Capital
                  </button>
                </div>

                {/* Status Indicator flags */}
                {isCompleted && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-xs text-emerald-800 font-semibold justify-center">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Goal achieved successfully! 🎉</span>
                  </div>
                )}
              </div>
            );
          })}
          {goals.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              No accumulated goals mapped. Standard goals keep you disciplined to lock emergency capital buffers!
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Smart Savings Goals Advisor */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-6 shadow-xs space-y-6" id="savings-advisor-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/65 pb-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[9.5px] font-black tracking-widest text-blue-700 uppercase">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Dynamic Wealth Intelligence
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#0f172a] font-sans">
              Strategic Savings Goal Advisor
            </h2>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Dynamically de-risks and optimizes your target benchmarks by pairing active category budgets with your monthly disposable buffer.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomMonthIncome(null)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold border transition-all cursor-pointer ${
                customMonthIncome === null
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Calculated Ledger ({currencySymbol}{computedBaseline.toFixed(0)})
            </button>
            <button
              onClick={() => setCustomMonthIncome(computedBaseline)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold border transition-all cursor-pointer ${
                customMonthIncome !== null
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Simulate Sandbox
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Column 1: Sandbox controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5 shadow-xs">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-450">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Cashflow Allocator Playground
            </span>

            {customMonthIncome !== null ? (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">Simulate Monthly Income</label>
                  <span className="text-xs font-black font-mono text-blue-650 bg-blue-50 px-2 py-0.5 rounded">
                    {currencySymbol}{activeIncomeBaseline.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="15000"
                  step="250"
                  value={activeIncomeBaseline}
                  onChange={(e) => setCustomMonthIncome(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-650"
                />
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  Slide or configure above to simulate wealth behavior during salary increases or unexpected windfalls.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/45 text-blue-950 rounded-lg border border-blue-100 text-xs text-left leading-relaxed">
                <strong className="block mb-0.5 text-blue-950 font-bold">Using Live Account Data</strong>
                Currently using transactional ledger values for Month 6 (June 2026). Incomes calculated: <span className="font-bold">{currencySymbol}{currentMonthIncomeTotal.toFixed(2)}</span>. Fallback to averages: <span className="font-bold">{currencySymbol}{averageAllTimeIncome.toFixed(2)}</span>.
              </div>
            )}

            {/* Core telemetry counters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Effective Monthly Income</span>
                <span className="text-slate-800 font-bold font-mono">{currencySymbol}{activeIncomeBaseline.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium font-sans">Monthly Budget Obligations</span>
                <span className="text-[#e11d48] font-bold font-mono">-{currencySymbol}{totalBudgetsObligation.toLocaleString()}</span>
              </div>
              <div className={`flex items-center justify-between text-xs font-bold p-3.5 rounded-lg ${
                disposableIncomeValue >= 0 
                  ? 'bg-emerald-50 text-emerald-850 border border-emerald-100/60 shadow-xs' 
                  : 'bg-rose-50 text-rose-850 border border-rose-100/60 shadow-xs'
              }`}>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className={`h-4 w-4 ${disposableIncomeValue >= 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
                  Remaining Disposable Surplus
                </span>
                <span className="font-mono text-sm">
                  {disposableIncomeValue >= 0 ? '+' : ''}{currencySymbol}{disposableIncomeValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {disposableIncomeValue < 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/50 rounded-lg p-3 text-[11px] text-amber-800 leading-normal">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0 animate-bounce" />
                <span>
                  <strong>Cashflow Alert:</strong> Your Category Budget obligations currently exceed simulated monthly bounds! This will severely restrict savings speed. Consider mapping smaller limits or increasing income values.
                </span>
              </div>
            )}
          </div>

          {/* Column 2: Suggested updates feed */}
          <div className="space-y-4">
            {goals.length === 0 ? (
              <div className="h-full rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <Target className="h-8 w-8 text-slate-350" />
                <p className="text-xs font-semibold">No active goals found for advice calculation.</p>
                <p className="text-[10px] text-slate-400">Map a goal target above to activate automatic advice telemetry!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {goals.map((g) => {
                  const remainingTarget = Math.max(0, g.targetAmount - g.currentAmount);
                  const isAchieved = remainingTarget === 0;
                  const monthsLeft = getMonthsRemaining(g.targetDate);
                  const recommendedMonthly = remainingTarget / monthsLeft;
                  const isDeficit = disposableIncomeValue < recommendedMonthly;

                  return (
                    <div 
                      key={`suggest-${g.id}`} 
                      className="rounded-xl border border-slate-200/80 bg-white p-4.5 shadow-xs space-y-3.5 relative"
                      id={`advice-card-${g.id}`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-800 font-extrabold text-xs tracking-tight flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-blue-650" />
                          {g.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {g.targetDate} ({monthsLeft}mo left)
                        </span>
                      </div>

                      {isAchieved ? (
                        <div className="space-y-3">
                          <div className="text-[11px] text-emerald-800 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 leading-normal font-medium">
                            🏆 Congratulations! This target is fully completed. Adjusting target up is recommended to capitalize on compound rates.
                          </div>
                          <button
                            disabled={updatingGoalId === g.id}
                            onClick={() => handleApplyAdjustment(g.id, { targetAmount: Math.round(g.targetAmount * 1.25) }, 'expand')}
                            className="w-full flex items-center justify-center gap-1.5 py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-2xs font-extrabold tracking-wide uppercase transition-colors cursor-pointer disabled:opacity-60"
                          >
                            Upgrade wealth target (+25%)
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Mathematics values breakdown */}
                          <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono text-slate-500 font-semibold">
                            <div>
                              <span>Target Left:</span>
                              <span className="block text-slate-800 font-bold">{currencySymbol}{remainingTarget.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span>Needed Monthly:</span>
                              <span className={`block font-bold ${isDeficit ? 'text-amber-600' : 'text-emerald-700'}`}>
                                {currencySymbol}{Math.round(recommendedMonthly)}/mo
                              </span>
                            </div>
                          </div>

                          {/* Advice alert banner */}
                          {isDeficit ? (
                            <div className="space-y-3">
                              <div className="text-[10.5px] text-amber-800 bg-amber-50/50 p-3 rounded-lg border border-amber-100/60 leading-normal">
                                <span className="font-extrabold block mb-0.5 text-amber-900">⚠️ Cashflow Deficit Alert</span>
                                Your monthly disposable surplus ({currencySymbol}{Math.round(disposableIncomeValue)}) is short by <span className="font-bold text-amber-950">{currencySymbol}{Math.round(recommendedMonthly - disposableIncomeValue)}/mo</span>. To meet this target, either extend the target date or reduce the overall savings goal sum safely.
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Action 1: Extend Deadline */}
                                {(() => {
                                  // Compute recommended months required
                                  const viableIncome = disposableIncomeValue > 0 ? disposableIncomeValue : 150;
                                  const newMonthsRequired = Math.ceil(remainingTarget / viableIncome);
                                  const extendedDate = getDateXMonthsInFuture(newMonthsRequired);

                                  return (
                                    <button
                                      disabled={updatingGoalId === g.id}
                                      onClick={() => handleApplyAdjustment(g.id, { targetDate: extendedDate }, 'extend')}
                                      className="flex flex-col items-center justify-center p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer disabled:opacity-60"
                                    >
                                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Option A</span>
                                      <span className="text-[10px] font-bold text-slate-700 mt-1">Extend Date</span>
                                      <span className="text-[9px] font-mono text-slate-450 text-center mt-0.5">{extendedDate} ({newMonthsRequired}mo)</span>
                                    </button>
                                  );
                                })()}

                                {/* Action 2: Lower Target */}
                                {(() => {
                                  const viableIncome = disposableIncomeValue > 0 ? disposableIncomeValue : 0;
                                  const attainable = g.currentAmount + (viableIncome * monthsLeft);

                                  return (
                                    <button
                                      disabled={updatingGoalId === g.id}
                                      onClick={() => handleApplyAdjustment(g.id, { targetAmount: Math.round(attainable) }, 'reduce')}
                                      className="flex flex-col items-center justify-center p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer disabled:opacity-60"
                                    >
                                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Option B</span>
                                      <span className="text-[10px] font-bold text-slate-700 mt-1">Feasible Target</span>
                                      <span className="text-[9px] font-mono text-slate-450 text-center mt-0.5">{currencySymbol}{Math.round(attainable).toLocaleString()}</span>
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-[10.5px] text-emerald-800 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/60 leading-normal">
                                <span className="font-extrabold block mb-0.5 text-emerald-900">✨ Goal Optimizable</span>
                                Excellent! Your surplus of {currencySymbol}{Math.round(disposableIncomeValue)} easily covers the {currencySymbol}{Math.round(recommendedMonthly)} required monthly contribution. You can accelerate this date to complete it early!
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {/* Action 1: Shorter Deadline */}
                                {(() => {
                                  const shortMonths = Math.ceil(remainingTarget / disposableIncomeValue);
                                  const acceleratedDate = getDateXMonthsInFuture(shortMonths);
                                  const isViableAcceleration = shortMonths < monthsLeft;

                                  return (
                                    <button
                                      disabled={updatingGoalId === g.id || !isViableAcceleration}
                                      onClick={() => handleApplyAdjustment(g.id, { targetDate: acceleratedDate }, 'accelerate')}
                                      className="flex flex-col items-center justify-center p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Option A</span>
                                      <span className="text-[10px] font-bold text-[#2563eb] mt-1">Accelerate</span>
                                      <span className="text-[9px] font-mono text-slate-450 text-center mt-0.5">
                                        {isViableAcceleration ? `${acceleratedDate} (${shortMonths}mo)` : 'Fully limits reached'}
                                      </span>
                                    </button>
                                  );
                                })()}

                                {/* Action 2: Stretch Target */}
                                {(() => {
                                  const maxStretch = Math.round(g.targetAmount * 1.25);
                                  return (
                                    <button
                                      disabled={updatingGoalId === g.id}
                                      onClick={() => handleApplyAdjustment(g.id, { targetAmount: maxStretch }, 'stretch')}
                                      className="flex flex-col items-center justify-center p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer disabled:opacity-60"
                                    >
                                      <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Option B</span>
                                      <span className="text-[10px] font-bold text-slate-700 mt-1">Stretch Target</span>
                                      <span className="text-[9px] font-mono text-slate-450 text-center mt-0.5">+{currencySymbol}{(maxStretch - g.targetAmount).toLocaleString()}</span>
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Success / Updating overlays within individual card */}
                      {updatingGoalId === g.id && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center rounded-xl z-10 animate-pulse">
                          <span className="text-2xs font-black tracking-widest text-slate-700 uppercase">
                            Recalibrating Goal Portfolio...
                          </span>
                        </div>
                      )}

                      {successMessages[g.id] && (
                        <div className="absolute inset-0 bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center rounded-xl p-4 text-center space-y-2 z-15 animate-fade-in">
                          <CheckCircle className="h-6 w-6 text-emerald-600 animate-bounce" />
                          <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wide leading-normal">
                            Parameters De-risked!
                          </span>
                          <p className="text-[9.5px] text-emerald-800 leading-normal font-semibold">
                            {successMessages[g.id]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL overlay: Configure Budget Limit */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-md font-bold text-slate-900 font-sans">Configure Category Budget Limit</h3>
              <button 
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBudgetSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Expense Segment</label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-teal-500"
                >
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Monthly Limit ({currencySymbol})</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 500"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Billing Month</label>
                  <select
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-white rounded-lg px-3 py-2"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i+1} value={i+1}>{new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Billing Year</label>
                  <select
                    value={budgetYear}
                    onChange={(e) => setBudgetYear(e.target.value)}
                    className="w-full text-sm border border-slate-200 bg-white rounded-lg px-3 py-2"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL overlay: Map Savings Goal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-md font-bold text-slate-900 font-sans">Map Savings Goal</h3>
              <button 
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Objective / Target Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Tesla Down Payment, House Fund"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Target Amount ({currencySymbol})</label>
                  <input 
                    type="number" 
                    required
                    placeholder="10000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Starting Buffer ({currencySymbol})</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Estimated Target Date</label>
                <input 
                  type="date" 
                  required
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white shrink-0"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 cursor-pointer"
                >
                  Deploy Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL overlay: Contribute Capital to Savings Goal */}
      {contributeGoalId !== null && (
        <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-md font-bold text-slate-900 font-sans">Inject Capital</h3>
              <button 
                onClick={() => setContributeGoalId(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleContributeSubmit} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 leading-normal">
                  Contribute funds to your savings goal: <strong className="text-slate-900">
                    {goals.find(g => g.id === contributeGoalId)?.title}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amortization Amount ({currencySymbol})</label>
                <input 
                  type="number" 
                  required
                  autofocus
                  step="any"
                  placeholder="e.g. 500"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setContributeGoalId(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 cursor-pointer"
                >
                  Certify Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
