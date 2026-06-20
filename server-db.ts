import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Transaction, Category, Budget, Goal, Notification, ActivityLog, Investment, AdminAuditLog, RecurringTransaction, RecurrenceInterval } from './src/types';

// Password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

const STORE_FILE = path.join(process.cwd(), 'data-store.json');

// Standard Categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Salary', type: 'income', color: '#10B981', icon: 'Briefcase' },
  { id: 'cat-2', name: 'Freelance', type: 'income', color: '#34D399', icon: 'Laptop' },
  { id: 'cat-3', name: 'Investments', type: 'income', color: '#6EE7B7', icon: 'TrendingUp' },
  { id: 'cat-4', name: 'Housing & Rent', type: 'expense', color: '#EF4444', icon: 'Home' },
  { id: 'cat-5', name: 'Groceries', type: 'expense', color: '#F59E0B', icon: 'ShoppingCart' },
  { id: 'cat-6', name: 'Dining Out', type: 'expense', color: '#3B82F6', icon: 'Utensils' },
  { id: 'cat-7', name: 'Transport & Auto', type: 'expense', color: '#8B5CF6', icon: 'Car' },
  { id: 'cat-8', name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'Sparkles' },
  { id: 'cat-9', name: 'Utilities & Bills', type: 'expense', color: '#06B6D4', icon: 'Zap' },
  { id: 'cat-10', name: 'Fitness & Health', type: 'expense', color: '#10B981', icon: 'Heart' },
  { id: 'cat-11', name: 'Shopping', type: 'expense', color: '#F43F5E', icon: 'ShoppingBag' }
];

interface DBState {
  users: Record<string, User & { passwordHash: string }>;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  investments: Investment[];
  adminAuditLogs?: AdminAuditLog[];
  recurringTransactions?: RecurringTransaction[];
}

function getInitialState(): DBState {
  const adminId = 'user-admin';
  const userId = 'user-saran';

  const initialUsers: Record<string, User & { passwordHash: string }> = {
    [userId]: {
      id: userId,
      email: 'saranramesh709@gmail.com',
      name: 'Saran Ramesh',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
      currency: 'USD',
      createdAt: '2026-03-15T00:00:00Z',
      passwordHash: hashPassword('password123')
    },
    [adminId]: {
      id: adminId,
      email: 'admin@fintrack.io',
      name: 'System Admin',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop',
      currency: 'USD',
      createdAt: '2026-01-01T00:00:00Z',
      passwordHash: hashPassword('admin123')
    }
  };

  // Generate realistic seed transactions spanning April, May, and June 2026
  const txs: Transaction[] = [];
  const addTx = (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    txs.push({
      ...t,
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: t.date + 'T12:00:00Z'
    });
  };

  const months = ['2026-04', '2026-05', '2026-06'];

  months.forEach(mo => {
    // Incomes
    addTx({ userId, type: 'income', amount: 5000, category: 'Salary', date: `${mo}-01`, tags: ['monthly', 'direct-deposit'] });
    addTx({ userId, type: 'income', amount: 850, category: 'Freelance', date: `${mo}-15`, tags: ['design-gig', 'stripe'] });
    addTx({ userId, type: 'income', amount: 300, category: 'Investments', date: `${mo}-22`, tags: ['dividend', 'portfolio'] });

    // Recurring Expenses
    addTx({ userId, type: 'expense', amount: 1600, category: 'Housing & Rent', date: `${mo}-02`, tags: ['rent', 'automatic'] });
    addTx({ userId, type: 'expense', amount: 120, category: 'Utilities & Bills', date: `${mo}-04`, tags: ['wifi', 'electric'] });
    addTx({ userId, type: 'expense', amount: 45, category: 'Utilities & Bills', date: `${mo}-10`, tags: ['mobile', 't-mobile'] });
    addTx({ userId, type: 'expense', amount: 65, category: 'Fitness & Health', date: `${mo}-05`, tags: ['gym-membership'] });

    // Floating Expenses: Groceries
    addTx({ userId, type: 'expense', amount: 154.20, category: 'Groceries', date: `${mo}-03`, tags: ['whole-foods', 'weekly'] });
    addTx({ userId, type: 'expense', amount: 98.40, category: 'Groceries', date: `${mo}-10`, tags: ['trader-joes'] });
    addTx({ userId, type: 'expense', amount: 142.10, category: 'Groceries', date: `${mo}-17`, tags: ['organic'] });
    addTx({ userId, type: 'expense', amount: 110.30, category: 'Groceries', date: `${mo}-24`, tags: ['weekly'] });

    // Floating Expenses: Dining Out
    addTx({ userId, type: 'expense', amount: 85.50, category: 'Dining Out', date: `${mo}-06`, tags: ['sushi', 'weekend'] });
    addTx({ userId, type: 'expense', amount: 42.00, category: 'Dining Out', date: `${mo}-12`, tags: ['ramen', 'coding-session'] });
    addTx({ userId, type: 'expense', amount: 124.00, category: 'Dining Out', date: `${mo}-18`, tags: ['steakhouse', 'celebration'] });
    addTx({ userId, type: 'expense', amount: 34.50, category: 'Dining Out', date: `${mo}-26`, tags: ['coffee', 'cafeteria'] });

    // Transport
    addTx({ userId, type: 'expense', amount: 45.00, category: 'Transport & Auto', date: `${mo}-08`, tags: ['gas', 'shell'] });
    addTx({ userId, type: 'expense', amount: 32.00, category: 'Transport & Auto', date: `${mo}-15`, tags: ['uber'] });
    addTx({ userId, type: 'expense', amount: 45.00, category: 'Transport & Auto', date: `${mo}-22`, tags: ['gas'] });

    // Shopping & Miscellaneous
    addTx({ userId, type: 'expense', amount: 189.99, category: 'Shopping', date: `${mo}-11`, tags: ['amazon', 'keyboard'] });
    addTx({ userId, type: 'expense', amount: 59.90, category: 'Shopping', date: `${mo}-19`, tags: ['clothes'] });

    // Entertainment
    addTx({ userId, type: 'expense', amount: 15.99, category: 'Entertainment', date: `${mo}-01`, tags: ['netflix', 'subscription'] });
    addTx({ userId, type: 'expense', amount: 84.00, category: 'Entertainment', date: `${mo}-14`, tags: ['concert'] });
  });

  // Highlight abnormal expense in June for simulated fraud / anomaly engine
  addTx({ userId, type: 'expense', amount: 850.00, category: 'Shopping', date: '2026-06-12', tags: ['unexpected', 'luxury-headphones'], notes: 'Abnormal high ticket shopping expense' });

  // Initial Budgets for Saran Ramesh
  const initialBudgets: Budget[] = [
    { id: 'b-1', userId, category: 'Groceries', amount: 600, spent: 505, month: 6, year: 2026 },
    { id: 'b-2', userId, category: 'Dining Out', amount: 300, spent: 286, month: 6, year: 2026 },
    { id: 'b-3', userId, category: 'Shopping', amount: 400, spent: 1099.89, month: 6, year: 2026 }, // Exceeded!
    { id: 'b-4', userId, category: 'Entertainment', amount: 150, spent: 99.99, month: 6, year: 2026 },
    { id: 'b-5', userId, category: 'Housing & Rent', amount: 1600, spent: 1600, month: 6, year: 2026 }
  ];

  // Goals
  const initialGoals: Goal[] = [
    { id: 'g-1', userId, title: 'Tesla Down Payment', targetAmount: 10000, currentAmount: 6850, targetDate: '2026-12-31', createdAt: '2026-01-10T12:00:00Z' },
    { id: 'g-2', userId, title: 'Emergency Fund', targetAmount: 15000, currentAmount: 12000, targetDate: '2026-10-15', createdAt: '2026-02-01T12:00:00Z' },
    { id: 'g-3', userId, title: 'Summer Eurotrip', targetAmount: 5000, currentAmount: 5000, targetDate: '2026-07-20', createdAt: '2026-03-01T12:00:00Z' } // Competed!
  ];

  // Seed Notifications
  const initialNotifications: Notification[] = [
    { id: 'n-1', userId, title: 'Budget Warning', message: 'You have exceeded your Shopping budget by $699.89!', type: 'warning', read: false, createdAt: '2026-06-12T13:00:00Z' },
    { id: 'n-2', userId, title: 'Goal Smashed! 🎉', message: 'Congratulations! You achieved your savings goal \"Summer Eurotrip\" of $5,000!', type: 'success', read: false, createdAt: '2026-06-15T09:30:00Z' },
    { id: 'n-3', userId, title: 'Monthly Bill Due Soon', message: 'Google Fiber bill payment of $70 is scheduled for next week.', type: 'info', read: true, createdAt: '2026-06-10T08:00:00Z' }
  ];

  // Seed ActivityLogs
  const initialLogs: ActivityLog[] = [
    { id: 'log-1', userId, action: 'User Login', details: 'Successful desktop login. Session initiated.', createdAt: '2026-06-17T07:14:00Z' },
    { id: 'log-2', userId, action: 'Budget Created', details: 'Configured June Shopping budget to $400.', createdAt: '2026-06-01T10:00:00Z' }
  ];

  const initialInvestments: Investment[] = [
    {
      id: 'inv-1',
      userId,
      type: 'stock',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 15,
      buyPrice: 165.50,
      currentPrice: 195.20,
      purchaseDate: '2026-03-20',
      createdAt: '2026-03-20T12:00:00Z'
    },
    {
      id: 'inv-2',
      userId,
      type: 'fund',
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      quantity: 10,
      buyPrice: 420.00,
      currentPrice: 480.50,
      purchaseDate: '2026-04-10',
      createdAt: '2026-04-10T12:00:00Z'
    },
    {
      id: 'inv-3',
      userId,
      type: 'crypto',
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.15,
      buyPrice: 62000.00,
      currentPrice: 68500.00,
      purchaseDate: '2026-05-02',
      createdAt: '2026-05-02T12:00:00Z'
    }
  ];

  const initialAdminLogs: AdminAuditLog[] = [
    {
      id: 'alog-1',
      action: 'SYSTEM_INITIALIZATION',
      actorEmail: 'system@fintrack.io',
      ipAddress: '127.0.0.1',
      details: 'Integrated modular core database schema with factory reset protocols.',
      status: 'SUCCESS',
      createdAt: '2026-06-15T08:00:00Z'
    },
    {
      id: 'alog-2',
      action: 'AUTH_POLICIES_ACTIVATED',
      actorEmail: 'security@fintrack.io',
      ipAddress: '10.0.2.24',
      details: 'Configured secure cookie limits, JWT encryption, and salt-hashed access protection keys.',
      status: 'SUCCESS',
      createdAt: '2026-06-15T08:05:00Z'
    },
    {
      id: 'alog-3',
      action: 'ROLE_GUARD_APPLIED',
      actorEmail: 'admin@fintrack.io',
      ipAddress: '192.168.1.18',
      details: 'Restricted administrative view access strictly to user records holding an active admin claim.',
      status: 'SUCCESS',
      createdAt: '2026-06-16T12:30:00Z'
    }
  ];

  const initialRecurring: RecurringTransaction[] = [
    {
      id: 'rec-1',
      userId,
      type: 'expense',
      amount: 14.99,
      category: 'Utilities & Bills',
      interval: 'monthly',
      startDate: '2026-06-01',
      nextDueDate: '2026-07-01',
      lastGeneratedDate: '2026-06-01',
      isActive: true,
      notes: 'Netflix Premium Ultra HD streaming subscription plan',
      tags: ['subscription', 'netflix', 'entertainment'],
      createdAt: '2026-06-01T12:00:00Z'
    },
    {
      id: 'rec-2',
      userId,
      type: 'expense',
      amount: 1600.00,
      category: 'Housing & Rent',
      interval: 'monthly',
      startDate: '2026-06-02',
      nextDueDate: '2026-07-02',
      lastGeneratedDate: '2026-06-02',
      isActive: true,
      notes: 'Monthly apartment rent automatic charge',
      tags: ['rent', 'housing', 'automatic'],
      createdAt: '2026-06-02T12:00:00Z'
    },
    {
      id: 'rec-3',
      userId,
      type: 'expense',
      amount: 65.00,
      category: 'Fitness & Health',
      interval: 'monthly',
      startDate: '2026-06-05',
      nextDueDate: '2026-07-05',
      lastGeneratedDate: '2026-06-05',
      isActive: true,
      notes: 'Downtown Health & Racquet Gym membership fee',
      tags: ['fitness', 'gym', 'health'],
      createdAt: '2026-06-05T12:00:00Z'
    }
  ];

  return {
    users: initialUsers,
    transactions: txs,
    categories: DEFAULT_CATEGORIES,
    budgets: initialBudgets,
    goals: initialGoals,
    notifications: initialNotifications,
    activityLogs: initialLogs,
    investments: initialInvestments,
    adminAuditLogs: initialAdminLogs,
    recurringTransactions: initialRecurring
  };
}

export class DBStore {
  private state: DBState;

  constructor() {
    this.state = getInitialState();
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const data = fs.readFileSync(STORE_FILE, 'utf-8');
        this.state = JSON.parse(data);
        if (!this.state.adminAuditLogs) {
          this.state.adminAuditLogs = [];
        }
        if (!this.state.recurringTransactions) {
          this.state.recurringTransactions = [];
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Error loading DB state, falling back to seeds:', e);
    }
  }

  public save(): void {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving DB state:', e);
    }
  }

  public reset(): void {
    this.state = getInitialState();
    this.save();
  }

  // --- Users Operations ---
  private withRole(user: any) {
    if (!user) return null;
    const role = user.role || ((user.id === 'user-admin' || user.email?.toLowerCase() === 'admin@fintrack.io') ? 'admin' : 'user');
    return {
      ...user,
      role
    };
  }

  public getUsers() {
    return Object.values(this.state.users).map(({ passwordHash, ...rest }) => this.withRole(rest));
  }

  public getUserById(id: string) {
    if (!this.state.users[id]) return null;
    const { passwordHash, ...rest } = this.state.users[id];
    return this.withRole(rest);
  }

  public getUserByEmail(email: string) {
    const user = Object.values(this.state.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return this.withRole(rest);
  }

  public createUser(email: string, name: string, passwordPlain: string): User {
    const id = `user-${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id,
      email,
      name,
      isVerified: true,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(passwordPlain)
    };
    this.state.users[id] = user;
    this.save();
    return this.getUserById(id)!;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    if (!this.state.users[id]) return null;
    this.state.users[id] = {
      ...this.state.users[id],
      ...updates
    };
    this.save();
    return this.getUserById(id);
  }

  public deleteUser(id: string): boolean {
    if (!this.state.users[id]) return false;
    delete this.state.users[id];
    // Remove related transactions/budgets/goals
    this.state.transactions = this.state.transactions.filter(t => t.userId !== id);
    this.state.budgets = this.state.budgets.filter(b => b.userId !== id);
    this.state.goals = this.state.goals.filter(g => g.userId !== id);
    this.state.notifications = this.state.notifications.filter(n => n.userId !== id);
    this.state.activityLogs = this.state.activityLogs.filter(l => l.userId !== id);
    this.state.investments = (this.state.investments || []).filter(i => i.userId !== id);
    this.save();
    return true;
  }

  // --- Transactions Operations ---
  public getTransactions(userId: string): Transaction[] {
    return this.state.transactions.filter(t => t.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
  }

  public addTransaction(userId: string, tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Transaction {
    const id = `tx-${Math.random().toString(36).substr(2, 9)}`;
    const newTx: Transaction = {
      ...tx,
      id,
      userId,
      createdAt: new Date().toISOString()
    };
    this.state.transactions.push(newTx);
    this.recalculateBudgetSpent(userId, tx.category, tx.date);
    this.save();
    return newTx;
  }

  public updateTransaction(userId: string, id: string, updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>): Transaction | null {
    const index = this.state.transactions.findIndex(t => t.id === id && t.userId === userId);
    if (index === -1) return null;
    const oldTx = this.state.transactions[index];
    const newTx = { ...oldTx, ...updates };
    this.state.transactions[index] = newTx;

    this.recalculateBudgetSpent(userId, oldTx.category, oldTx.date);
    if (updates.category && updates.category !== oldTx.category) {
      this.recalculateBudgetSpent(userId, updates.category, updates.date || oldTx.date);
    }
    this.save();
    return newTx;
  }

  public deleteTransaction(userId: string, id: string): boolean {
    const index = this.state.transactions.findIndex(t => t.id === id && t.userId === userId);
    if (index === -1) return false;
    const tx = this.state.transactions[index];
    this.state.transactions.splice(index, 1);
    this.recalculateBudgetSpent(userId, tx.category, tx.date);
    this.save();
    return true;
  }

  // Helper: auto recalculate budget spent on transaction insertion/updates
  private recalculateBudgetSpent(userId: string, category: string, dateStr: string): void {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const budget = this.state.budgets.find(b => b.userId === userId && b.category === category && b.month === month && b.year === year);
    if (budget) {
      const spent = this.state.transactions
        .filter(t => t.userId === userId && t.category === category && t.type === 'expense' && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === year)
        .reduce((sum, t) => sum + t.amount, 0);
      budget.spent = Number(spent.toFixed(2));

      // Trigger automatic warning notification if exceeded
      if (budget.spent > budget.amount) {
        const alreadyWarned = this.state.notifications.some(n => n.userId === userId && n.title === 'Budget Warning' && n.message.includes(category) && new Date(n.createdAt).getMonth() === date.getMonth());
        if (!alreadyWarned) {
          this.addNotification(userId, 'Budget Warning', `You have exceeded your ${category} budget of $${budget.amount} (Spent: $${budget.spent})!`, 'warning');
        }
      } else if (budget.spent >= 0.9 * budget.amount) {
        const alreadyApproaching = this.state.notifications.some(n => n.userId === userId && (n.title === 'Budget Approaching Limit' || n.title === 'Budget Warning') && n.message.includes(category) && new Date(n.createdAt).getMonth() === date.getMonth());
        if (!alreadyApproaching) {
          this.addNotification(userId, 'Budget Approaching Limit', `Heads up! You have reached ${Math.round((budget.spent / budget.amount) * 100)}% of your monthly ${category} budget ($${budget.spent} of $${budget.amount}).`, 'warning');
        }
      }
    }
  }

  // --- Categories Operations ---
  public getCategories(userId: string): Category[] {
    return this.state.categories.filter(c => !c.userId || c.userId === userId);
  }

  public addCategory(userId: string, category: Omit<Category, 'id' | 'userId'>): Category {
    const id = `cat-${Math.random().toString(36).substr(2, 9)}`;
    const newCat: Category = {
      ...category,
      id,
      userId,
      isCustom: true
    };
    this.state.categories.push(newCat);
    this.save();
    return newCat;
  }

  // --- Budgets Operations ---
  public getBudgets(userId: string): Budget[] {
    // Fill dynamic spending
    return this.state.budgets.filter(b => b.userId === userId).map(b => {
      const spent = this.state.transactions
        .filter(t => t.userId === userId && t.category === b.category && t.type === 'expense' && new Date(t.date).getMonth() + 1 === b.month && new Date(t.date).getFullYear() === b.year)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...b,
        spent: Number(spent.toFixed(2))
      };
    });
  }

  public addBudget(userId: string, budget: Omit<Budget, 'id' | 'userId' | 'spent'>): Budget {
    const id = `b-${Math.random().toString(36).substr(2, 9)}`;
    // recalculate pre-spent
    const spent = this.state.transactions
      .filter(t => t.userId === userId && t.category === budget.category && t.type === 'expense' && new Date(t.date).getMonth() + 1 === budget.month && new Date(t.date).getFullYear() === budget.year)
      .reduce((sum, t) => sum + t.amount, 0);

    const newBudget: Budget = {
      ...budget,
      id,
      userId,
      spent: Number(spent.toFixed(2))
    };
    // If overwrite exists
    const existingIndex = this.state.budgets.findIndex(b => b.userId === userId && b.category === budget.category && b.month === budget.month && b.year === budget.year);
    if (existingIndex !== -1) {
      this.state.budgets[existingIndex] = newBudget;
    } else {
      this.state.budgets.push(newBudget);
    }
    this.save();
    return newBudget;
  }

  public deleteBudget(userId: string, id: string): boolean {
    const index = this.state.budgets.findIndex(b => b.id === id && b.userId === userId);
    if (index === -1) return false;
    this.state.budgets.splice(index, 1);
    this.save();
    return true;
  }

  // --- Goals Operations ---
  public getGoals(userId: string): Goal[] {
    return this.state.goals.filter(g => g.userId === userId);
  }

  public addGoal(userId: string, goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>): Goal {
    const id = `g-${Math.random().toString(36).substr(2, 9)}`;
    const newGoal: Goal = {
      ...goal,
      id,
      userId,
      createdAt: new Date().toISOString()
    };
    this.state.goals.push(newGoal);
    this.save();
    return newGoal;
  }

  public updateGoal(userId: string, id: string, updates: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt'>>): Goal | null {
    const index = this.state.goals.findIndex(g => g.id === id && g.userId === userId);
    if (index === -1) return null;
    const oldGoal = this.state.goals[index];
    const newGoal = { ...oldGoal, ...updates };
    this.state.goals[index] = newGoal;

    // Trigger success notification if newly achieved
    if (newGoal.currentAmount >= newGoal.targetAmount && oldGoal.currentAmount < oldGoal.targetAmount) {
      this.addNotification(userId, 'Goal Achieved! 🏆', `Fantastic! You reached your savings goal: "${newGoal.title}" ($${newGoal.targetAmount})!`, 'success');
    }
    this.save();
    return newGoal;
  }

  public deleteGoal(userId: string, id: string): boolean {
    const index = this.state.goals.findIndex(g => g.id === id && g.userId === userId);
    if (index === -1) return false;
    this.state.goals.splice(index, 1);
    this.save();
    return true;
  }

  // --- Notifications Operations ---
  public getNotifications(userId: string): Notification[] {
    return this.state.notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public addNotification(userId: string, title: string, message: string, type: 'info' | 'warning' | 'success'): Notification {
    const id = `n-${Math.random().toString(36).substr(2, 9)}`;
    const notif: Notification = {
      id,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.state.notifications.push(notif);
    this.save();
    return notif;
  }

  public markNotificationAsRead(userId: string, id: string): boolean {
    const notif = this.state.notifications.find(n => n.id === id && n.userId === userId);
    if (!notif) return false;
    notif.read = true;
    this.save();
    return true;
  }

  public markAllNotificationsAsRead(userId: string): void {
    this.state.notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.save();
  }

  // --- ActivityLogs Operations ---
  public getActivityLogs(userId: string): ActivityLog[] {
    return this.state.activityLogs.filter(l => l.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public addActivityLog(userId: string, action: string, details: string): ActivityLog {
    const id = `log-${Math.random().toString(36).substr(2, 9)}`;
    const newLog: ActivityLog = {
      id,
      userId,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    this.state.activityLogs.push(newLog);
    // Keep logs size reasonable (e.g., max 100 per user)
    const logs = this.state.activityLogs.filter(l => l.userId === userId);
    if (logs.length > 100) {
      const toRemove = l => l.userId === userId;
      // remove old logging references
      const indicesToRemove = this.state.activityLogs
        .map((l, i) => l.userId === userId ? i : -1)
        .filter(idx => idx !== -1)
        .slice(0, logs.length - 100);
      
      this.state.activityLogs = this.state.activityLogs.filter((_, idx) => !indicesToRemove.includes(idx));
    }
    this.save();
    return newLog;
  }

  // --- Investments Operations ---
  public getInvestments(userId: string): Investment[] {
    if (!this.state.investments) this.state.investments = [];
    return this.state.investments.filter(i => i.userId === userId);
  }

  public addInvestment(userId: string, inv: Omit<Investment, 'id' | 'userId' | 'createdAt'>): Investment {
    if (!this.state.investments) this.state.investments = [];
    const id = `inv-${Math.random().toString(36).substr(2, 9)}`;
    const newInv: Investment = {
      ...inv,
      id,
      userId,
      createdAt: new Date().toISOString()
    };
    this.state.investments.push(newInv);
    this.save();
    return newInv;
  }

  public updateInvestment(
    userId: string,
    id: string,
    updates: Partial<Omit<Investment, 'id' | 'userId' | 'createdAt'>>
  ): Investment | null {
    if (!this.state.investments) this.state.investments = [];
    const index = this.state.investments.findIndex(i => i.id === id && i.userId === userId);
    if (index === -1) return null;

    const oldInv = this.state.investments[index];
    const newInv = {
      ...oldInv,
      ...updates
    };

    // Sanitize values
    if (newInv.quantity !== undefined) newInv.quantity = Number(newInv.quantity);
    if (newInv.buyPrice !== undefined) newInv.buyPrice = Number(newInv.buyPrice);
    if (newInv.currentPrice !== undefined) newInv.currentPrice = Number(newInv.currentPrice);

    this.state.investments[index] = newInv;
    this.save();
    return newInv;
  }

  public deleteInvestment(userId: string, id: string): boolean {
    if (!this.state.investments) this.state.investments = [];
    const index = this.state.investments.findIndex(i => i.id === id && i.userId === userId);
    if (index === -1) return false;

    this.state.investments.splice(index, 1);
    this.save();
    return true;
  }

  public updateRealtimePrices(userId: string): Investment[] {
    if (!this.state.investments) this.state.investments = [];
    const userInvs = this.state.investments.filter(i => i.userId === userId);
    
    userInvs.forEach(inv => {
      // Fluctuate price by -1.5% to +2.5%
      const pctChange = (Math.random() * 4) - 1.5; // -1.5 to 2.5
      const changeMultiplier = 1 + (pctChange / 100);
      const originalPrice = inv.currentPrice || inv.buyPrice;
      const newPrice = Number((originalPrice * changeMultiplier).toFixed(2));
      inv.currentPrice = newPrice;
    });

    this.save();
    return userInvs;
  }

  // --- Admin Audit Logs Operations ---
  public getAdminAuditLogs(): AdminAuditLog[] {
    if (!this.state.adminAuditLogs) {
      this.state.adminAuditLogs = [];
    }
    return [...this.state.adminAuditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public addAdminAuditLog(
    action: string,
    actorEmail: string,
    details: string,
    status: 'SUCCESS' | 'WARNING' | 'FAILED',
    targetUser?: string,
    ipAddress = '127.0.0.1'
  ): AdminAuditLog {
    if (!this.state.adminAuditLogs) {
      this.state.adminAuditLogs = [];
    }
    const id = `alog-${Math.random().toString(36).substr(2, 9)}`;
    const newLog: AdminAuditLog = {
      id,
      action,
      actorEmail,
      targetUser,
      ipAddress,
      details,
      status,
      createdAt: new Date().toISOString()
    };
    this.state.adminAuditLogs.push(newLog);
    // Keep logs size reasonable (e.g. max 150 entries)
    if (this.state.adminAuditLogs.length > 150) {
      this.state.adminAuditLogs = this.state.adminAuditLogs.slice(this.state.adminAuditLogs.length - 150);
    }
    this.save();
    return newLog;
  }

  // --- Recurring Transactions Operations ---
  public getRecurringTransactions(userId: string): RecurringTransaction[] {
    if (!this.state.recurringTransactions) {
      this.state.recurringTransactions = [];
    }
    return this.state.recurringTransactions.filter(rt => rt.userId === userId);
  }

  public addRecurringTransaction(userId: string, data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'userId'>): RecurringTransaction {
    if (!this.state.recurringTransactions) {
      this.state.recurringTransactions = [];
    }
    const id = `rec-${Math.random().toString(36).substr(2, 9)}`;
    const newRt: RecurringTransaction = {
      ...data,
      id,
      userId,
      createdAt: new Date().toISOString()
    };
    this.state.recurringTransactions.push(newRt);
    this.save();
    return newRt;
  }

  public updateRecurringTransaction(id: string, data: Partial<RecurringTransaction>): RecurringTransaction | null {
    if (!this.state.recurringTransactions) {
      this.state.recurringTransactions = [];
    }
    const rtIndex = this.state.recurringTransactions.findIndex(rt => rt.id === id);
    if (rtIndex === -1) return null;
    
    this.state.recurringTransactions[rtIndex] = {
      ...this.state.recurringTransactions[rtIndex],
      ...data
    };
    this.save();
    return this.state.recurringTransactions[rtIndex];
  }

  public deleteRecurringTransaction(id: string): boolean {
    if (!this.state.recurringTransactions) {
      this.state.recurringTransactions = [];
    }
    const prevLength = this.state.recurringTransactions.length;
    this.state.recurringTransactions = this.state.recurringTransactions.filter(rt => rt.id !== id);
    if (this.state.recurringTransactions.length !== prevLength) {
      this.save();
      return true;
    }
    return false;
  }

  public generateRecurringTransactionsDue(userId?: string): { generatedCount: number, transactions: Transaction[] } {
    if (!this.state.recurringTransactions) {
      this.state.recurringTransactions = [];
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    const generatedTxs: Transaction[] = [];
    let generatedCount = 0;
    
    // Filter recurring transactions
    const candidates = this.state.recurringTransactions.filter(rt => {
      if (!rt.isActive) return false;
      if (userId && rt.userId !== userId) return false;
      return rt.nextDueDate <= todayStr;
    });
    
    candidates.forEach(rt => {
      let currentDueDate = rt.nextDueDate;
      let iterations = 0;
      const MAX_ITERATIONS = 100;
      
      while (currentDueDate <= todayStr && iterations < MAX_ITERATIONS) {
        iterations++;
        const newTxId = `tx-${Math.random().toString(36).substr(2, 9)}`;
        const newTx: Transaction = {
          id: newTxId,
          userId: rt.userId,
          type: rt.type,
          amount: rt.amount,
          category: rt.category,
          date: currentDueDate,
          tags: [...(rt.tags || []), 'recurring-generated'],
          notes: rt.notes ? `[Recurring] ${rt.notes}` : `Automatically generated recurring payment for ${rt.category}`,
          createdAt: new Date().toISOString()
        };
        
        this.state.transactions.push(newTx);
        generatedTxs.push(newTx);
        generatedCount++;
        
        rt.lastGeneratedDate = currentDueDate;
        currentDueDate = this.calculateNextDate(currentDueDate, rt.interval);
      }
      
      rt.nextDueDate = currentDueDate;
    });
    
    if (generatedCount > 0) {
      this.save();
    }
    
    return {
      generatedCount,
      transactions: generatedTxs
    };
  }

  private calculateNextDate(dateStr: string, interval: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    switch (interval) {
      case 'daily':
        d.setUTCDate(d.getUTCDate() + 1);
        break;
      case 'weekly':
        d.setUTCDate(d.getUTCDate() + 7);
        break;
      case 'monthly':
        d.setUTCMonth(d.getUTCMonth() + 1);
        break;
      case 'yearly':
        d.setUTCFullYear(d.getUTCFullYear() + 1);
        break;
    }
    return d.toISOString().split('T')[0];
  }
}

// Global store singleton
export const db = new DBStore();
