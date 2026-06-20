import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import RecurringView from './components/RecurringView';
import BudgetsGoalsView from './components/BudgetsGoalsView';
import AnalyticsView from './components/AnalyticsView';
import AIAdvisorView from './components/AIAdvisorView';
import SecurityLogsView from './components/SecurityLogsView';
import AdminPanel from './components/AdminPanel';
import AuthView from './components/AuthView';
import InvestmentsView from './components/InvestmentsView';
import SpendSimilarityView from './components/SpendSimilarityView';
import PortfolioSimilarityView from './components/PortfolioSimilarityView';
import { User, Transaction, Category, Budget, Goal, Notification, Investment } from './types';
import { Volume2, VolumeX, Menu, X, Bell, AlertTriangle, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core finance states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

  // Overlay states triggers inside Dashboard & Ledger
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'info' | 'success';
    createdAt: number;
  }[]>([]);
  const [seenBudgetAlertKeys, setSeenBudgetAlertKeys] = useState<string[]>([]);

  // Core currency formats
  const currencySymbol = '$';

  // API Call helper
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const activeToken = token || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}),
      ...options.headers
    };

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (res.status === 401) {
      handleLogout();
      throw new Error('Verification expired. Please log back in.');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP Error ${res.status}`);
    }

    return res.json();
  };

  // Logouts
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCurrentView('dashboard');
    setIsSidebarOpen(false);
  };

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
  };

  // Core fetch loops
  const loadData = async () => {
    if (!token) return;
    try {
      const [txsData, catsData, budsData, goalsData, notifsData, invsData] = await Promise.all([
        apiFetch('/api/transactions'),
        apiFetch('/api/categories'),
        apiFetch('/api/budgets'),
        apiFetch('/api/goals'),
        apiFetch('/api/notifications'),
        apiFetch('/api/investments')
      ]);

      setTransactions(txsData);
      setCategories(catsData);
      setBudgets(budsData);
      setGoals(goalsData);
      setNotifications(notifsData);
      setInvestments(invsData);
    } catch (e) {
      console.error('Failed to sync financial parameters:', e);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Route guard: only allow users with the 'admin' role to access the Admin Console
  useEffect(() => {
    if (currentView === 'admin') {
      if (!user || user.role !== 'admin') {
        setCurrentView('dashboard');
      }
    }
  }, [currentView, user]);

  // Automated Toast Alerts for Approaching / Exceeded Budgets
  useEffect(() => {
    if (!budgets || budgets.length === 0) return;

    const newAlerts: {
      id: string;
      title: string;
      message: string;
      type: 'warning' | 'danger' | 'info' | 'success';
      createdAt: number;
    }[] = [];
    const keysToVerify: string[] = [];

    budgets.forEach(b => {
      const ratio = b.spent / b.amount;
      if (ratio >= 0.9) {
        const threshold = ratio >= 1.0 ? 'exceeded' : 'approaching_90';
        const alertKey = `${b.id}-${threshold}-${b.spent}`;
        keysToVerify.push(alertKey);
      }
    });

    if (keysToVerify.length === 0) return;

    setSeenBudgetAlertKeys(prev => {
      const updatedKeys = [...prev];
      let hasNew = false;

      budgets.forEach(b => {
        const ratio = b.spent / b.amount;
        if (ratio >= 0.9) {
          const threshold = ratio >= 1.0 ? 'exceeded' : 'approaching_90';
          const alertKey = `${b.id}-${threshold}-${b.spent}`;
          
          if (!updatedKeys.includes(alertKey)) {
            updatedKeys.push(alertKey);
            hasNew = true;

            const isExceeded = ratio >= 1.0;
            const title = isExceeded ? 'Budget Category Exceeded! 🚨' : 'Budget Warning: Approaching 90%';
            const percent = Math.round(ratio * 100);
            const message = isExceeded
              ? `Alert! You have exceeded your monthly ${b.category} budget limit of ${currencySymbol}${b.amount} (Spent: ${currencySymbol}${b.spent}).`
              : `Caution: You are approaching 90% of your ${b.category} budget of ${currencySymbol}${b.amount} (Spent: ${currencySymbol}${b.spent}, which is ${percent}%).`;

            newAlerts.push({
              id: `toast-${b.id}-${threshold}-${Date.now()}`,
              title,
              message,
              type: isExceeded ? 'danger' : 'warning',
              createdAt: Date.now()
            });
          }
        }
      });

      if (hasNew && newAlerts.length > 0) {
        setToasts(currentToasts => {
          // Avoid pushing duplicate active toast messages
          const filteredNew = newAlerts.filter(na => !currentToasts.some(ct => ct.message === na.message));
          return [...currentToasts, ...filteredNew];
        });
      }

      return updatedKeys;
    });
  }, [budgets, currencySymbol]);

  // Auto-dismiss toasts older than 10 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setToasts(prev => {
        const filtered = prev.filter(t => now - t.createdAt < 10000);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [toasts]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Transaction CRUD triggers
  const handleAddTransaction = async (txPayload: any) => {
    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(txPayload)
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to insert record.');
    }
  };

  const handleUpdateTransaction = async (id: string, updates: any) => {
    try {
      await apiFetch(`/api/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to update record.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await apiFetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to remove record.');
    }
  };

  // Budgets additions
  const handleAddBudget = async (budgetPayload: any) => {
    try {
      await apiFetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify(budgetPayload)
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to set category limit.');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await apiFetch(`/api/budgets/${id}`, {
        method: 'DELETE'
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to delete budget limit.');
    }
  };

  // Goals additions
  const handleAddGoal = async (goalPayload: any) => {
    try {
      await apiFetch('/api/goals', {
        method: 'POST',
        body: JSON.stringify(goalPayload)
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to deploy savings goal.');
    }
  };

  const handleUpdateGoal = async (id: string, updates: any) => {
    try {
      await apiFetch(`/api/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to update savings goal.');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await apiFetch(`/api/goals/${id}`, {
        method: 'DELETE'
      });
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to delete savings goal.');
    }
  };

  // Notifications read/clears
  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Report download trigger via browser attachment routing
  const handleDownloadCSV = () => {
    const activeToken = token;
    if (!activeToken) return;
    // Redirect browser directly to attachment payload
    window.open(`/api/reports/export?authorization=Bearer ${activeToken}`, '_blank');
  };

  if (!token || !user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // Calculate aggregates dynamically for responsive visual indicators
  const totalIncomeValue = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenseValue = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalanceCalculated = totalIncomeValue - totalExpenseValue;
  const totalInvestmentsValue = investments.reduce((sum, i) => sum + ((i.currentPrice || i.buyPrice) * i.quantity), 0);
  const totalNetWorthWithInvestments = totalBalanceCalculated + totalInvestmentsValue;
  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800">
      
      {/* Mobile Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-lg p-1.5 hover:bg-slate-50 text-slate-700"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-bold text-[#0f172a] tracking-tight text-sm font-sans flex items-center gap-1.5">
          VaultFlow
        </span>
        <div className="relative">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="p-1.5 text-slate-500 hover:text-slate-950 flex items-center justify-center"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex">
        
        {/* Navigation Sidebar Wrapper: Fixed Desktop Width */}
        <div className={`fixed inset-0 z-40 transition-transform md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:block md:w-72 shrink-0`}>
          {/* Backdrop on mobile blur */}
          {isSidebarOpen && (
            <div 
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden" 
            />
          )}
          <Sidebar 
            currentView={currentView}
            setCurrentView={(view) => {
              setCurrentView(view);
              setIsSidebarOpen(false);
            }}
            user={user}
            totalBalance={totalNetWorthWithInvestments}
            unreadCount={unreadNotifsCount}
            onOpenNotifications={() => {
              setCurrentView('dashboard');
              setIsSidebarOpen(false);
            }}
            onLogout={handleLogout}
            currencySymbol={currencySymbol}
            notifications={notifications}
          />
        </div>

        {/* Dynamic Center Workstage stage */}
        <main className="flex-1 px-4 py-8 sm:px-8 space-y-6 overflow-hidden min-w-0 md:max-w-6xl mx-auto md:ml-4 lg:ml-8">
          
          {currentView === 'dashboard' && (
            <DashboardView 
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              notifications={notifications}
              currencySymbol={currencySymbol}
              onNavigateTo={setCurrentView}
              onOpenAddExpense={() => setIsAddingExpense(true)}
              onOpenAddIncome={() => setIsAddingExpense(true)}
              onOpenReceiptScan={() => setIsAddingExpense(true)}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              investments={investments}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView 
              transactions={transactions}
              categories={categories}
              currencySymbol={currencySymbol}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onDownloadCSV={handleDownloadCSV}
              apiFetch={apiFetch}
              onRefreshFinanceData={loadData}
            />
          )}

          {currentView === 'recurring' && (
            <RecurringView 
              apiFetch={apiFetch}
              categories={categories}
              currencySymbol={currencySymbol}
              onRefreshFinanceData={loadData}
            />
          )}

          {currentView === 'investments' && (
            <InvestmentsView 
              investments={investments}
              currencySymbol={currencySymbol}
              onRefreshData={loadData}
              apiFetch={apiFetch}
            />
          )}

          {currentView === 'budgets' && (
            <BudgetsGoalsView 
              budgets={budgets}
              goals={goals}
              categories={categories}
              currencySymbol={currencySymbol}
              transactions={transactions}
              onAddBudget={handleAddBudget}
              onDeleteBudget={handleDeleteBudget}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView 
              transactions={transactions}
              categories={categories}
              budgets={budgets}
              currencySymbol={currencySymbol}
            />
          )}

          {currentView === 'ai-advisor' && (
            <AIAdvisorView 
              currencySymbol={currencySymbol}
            />
          )}

          {currentView === 'security-logs' && (
            <SecurityLogsView />
          )}

          {currentView === 'spend-similarity' && (
            <SpendSimilarityView 
              transactions={transactions}
              currencySymbol={currencySymbol}
            />
          )}

          {currentView === 'portfolio-similarity' && (
            <PortfolioSimilarityView 
              investments={investments}
              currencySymbol={currencySymbol}
            />
          )}

          {currentView === 'admin' && user?.role === 'admin' && (
            <AdminPanel />
          )}

        </main>
      </div>

      {/* Shared Overlay form when Add actions are called from the Dashboard snapshot directly */}
      {isAddingExpense && (
        <div className="fixed inset-y-0 right-0 z-50 bg-transparent flex justify-end">
          {/* Quick backdrop */}
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setIsAddingExpense(false)} />
          <div className="relative w-full max-w-xl bg-white h-screen shadow-2xl p-6 overflow-y-auto animate-fade-in z-50">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-md font-bold text-slate-900 font-sans">Initialize Balance Flow</h3>
              <button 
                onClick={() => setIsAddingExpense(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Embed transactional scanner widget here */}
            <TransactionsView 
              transactions={transactions}
              categories={categories}
              currencySymbol={currencySymbol}
              onAddTransaction={async (tx) => {
                await handleAddTransaction(tx);
                setIsAddingExpense(false);
              }}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onDownloadCSV={handleDownloadCSV}
              apiFetch={apiFetch}
              onRefreshFinanceData={loadData}
            />
          </div>
        </div>
      )}

      {/* Toast Notification Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none md:top-6 md:right-6">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isDanger = toast.type === 'danger';
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-shadow duration-300 hover:shadow-xl ${
                  isDanger
                    ? 'border-rose-200 bg-white/95 text-rose-950 shadow-rose-100/40'
                    : 'border-amber-200 bg-white/95 text-amber-950 shadow-amber-100/40 animate-pulse-subtle'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDanger ? (
                    <AlertOctagon className="h-5 w-5 text-rose-600 animate-bounce" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-extrabold tracking-tight font-sans text-slate-900">
                    {toast.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-lg p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
