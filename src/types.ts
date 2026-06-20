export interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  avatarUrl?: string;
  currency: string;
  createdAt: string;
  role?: 'admin' | 'user';
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // ISO date string YYYY-MM-DD
  tags: string[];
  notes?: string;
  receiptUrl?: string; // local file upload simulation or custom URL
  receiptName?: string;
  createdAt: string;
  aiSuggestedCategory?: string;
  aiConfidence?: number;
  aiConfirmed?: boolean;
  aiSuggestionReason?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string; // Name of Lucide icon
  isCustom?: boolean;
  userId?: string; // associated if custom
}

export interface Budget {
  id: string;
  userId: string;
  category: string; // 'all' or specific category name
  amount: number; // Limit
  spent: number; // calculated transiently or stored
  month: number; // 1-12
  year: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO date YYYY-MM-DD
  category?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface FinancialInsight {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
  score?: number;
}

export interface Investment {
  id: string;
  userId: string;
  type: 'stock' | 'bond' | 'fund' | 'crypto' | 'other';
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  purchaseDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  actorEmail: string;
  targetUser?: string;
  ipAddress: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  createdAt: string;
}

export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  interval: RecurrenceInterval;
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  lastGeneratedDate?: string; // YYYY-MM-DD
  isActive: boolean;
  notes?: string;
  tags: string[];
  createdAt: string;
}


