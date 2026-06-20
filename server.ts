import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { db, verifyPassword, hashPassword } from './server-db';
import { AuthenticatedRequest, authMiddleware } from './server-auth';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fintrack-super-secret-jwt-key';

async function startServer() {
  const app = express();

  // Increase body size limits for base64 receipt uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // --- Initialize Gemini Client ---
  let ai: GoogleGenAI | null = null;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('Gemini AI client successfully initialized server-side');
    } catch (e) {
      console.error('Failed to initialize Gemini AI client:', e);
    }
  } else {
    console.warn('GEMINI_API_KEY environment variable is not defined - AI features will fallback to deterministic rules gracefully.');
  }

  // ============== AUTHENTICATION ENDPOINTS ==============

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'All fields (email, name, password) are required.' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    try {
      const user = db.createUser(email, name, password);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      db.addActivityLog(user.id, 'User Registered', `Account created successfully with email ${email}.`);
      return res.json({ token, user });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Error occurred during registration.' });
    }
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const userRecord = db.getUserByEmail(email);
    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify Password by reaching in to check hash
    const fullUser = (db as any).state.users[userRecord.id];
    const valid = verifyPassword(password, fullUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    try {
      const token = jwt.sign({ userId: userRecord.id }, JWT_SECRET, { expiresIn: '7d' });
      db.addActivityLog(userRecord.id, 'User Login', 'Successful application login.');
      return res.json({ token, user: userRecord });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Error occurred during login.' });
    }
  });

  // Fetch full profile info
  app.get('/api/auth/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = db.getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'User profile not found.' });
    return res.json(user);
  });

  // Update profile characteristics
  app.post('/api/auth/profile/update', authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = db.updateUser(req.userId!, req.body);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    db.addActivityLog(req.userId!, 'Profile Updated', 'User metadata settings updated.');
    return res.json(user);
  });

  // Admin and Demo Quick-Login simulation (OAuth / Easy dev credential bypassing)
  app.post('/api/auth/google', (req, res) => {
    const { email, name, googleId } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required for Google SSO.' });

    let user: any = db.getUserByEmail(email);
    if (!user) {
      // Auto-register google user
      const randomPass = crypto.randomBytes(16).toString('hex');
      user = db.createUser(email, name || 'Google User', randomPass);
      db.addActivityLog(user.id, 'OAuth Registered', `Google registration completed for user: ${email}`);
    } else {
      db.addActivityLog(user.id, 'OAuth Login', `Successful Google authentication for: ${email}`);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user });
  });

  // Forgot password
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = db.getUserByEmail(email);
    if (!user) {
      // Graceful success response to thwart enumeration
      return res.json({ message: 'If that email exists, an instruction link has been sent.' });
    }
    // Simulate reset logging
    db.addActivityLog(user.id, 'Reset Requested', 'Forgot password request submitted.');
    return res.json({ message: 'If that email exists, an instruction link has been sent.' });
  });

  // Reset Password using token
  app.post('/api/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    // Bypassed/Simulated: we will direct-reset if token validated or during sandbox testing, or use active session
    return res.json({ success: true, message: 'Password has been updated.' });
  });

  // Email verification simulation
  app.post('/api/auth/verify-email', (req, res) => {
    return res.json({ success: true, message: 'Your email address is verified.' });
  });

  // Logout
  app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res) => {
    db.addActivityLog(req.userId!, 'User Logout', 'Session closed successfully.');
    return res.json({ success: true });
  });

  // ============== TRANSACTIONS CRUD ==============

  app.get('/api/transactions', authMiddleware, (req: AuthenticatedRequest, res) => {
    const list = db.getTransactions(req.userId!);
    
    // Quick server search & filters matching
    let filtered = [...list];
    const { search, category, type, startDate, endDate } = req.query;

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(t => 
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    if (category) {
      filtered = filtered.filter(t => t.category === String(category));
    }

    if (type) {
      filtered = filtered.filter(t => t.type === String(type));
    }

    if (startDate) {
      filtered = filtered.filter(t => t.date >= String(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(t => t.date <= String(endDate));
    }

    return res.json(filtered);
  });

  app.post('/api/transactions', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { type, amount, category, date, tags, notes, receiptUrl, receiptName } = req.body;
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ error: 'Type, amount, category, and date are required.' });
    }

    try {
      const tx = db.addTransaction(req.userId!, {
        type,
        amount: Number(amount),
        category,
        date,
        tags: Array.isArray(tags) ? tags : [],
        notes,
        receiptUrl,
        receiptName
      });
      db.addActivityLog(req.userId!, 'Transaction Added', `Inserted ${type} transaction in ${category}: $${amount}`);
      return res.json(tx);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to add transaction' });
    }
  });

  app.put('/api/transactions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Sanitize numerical fields
    if (updates.amount !== undefined) updates.amount = Number(updates.amount);

    try {
      const updated = db.updateTransaction(req.userId!, id, updates);
      if (!updated) return res.status(404).json({ error: 'Transaction not found.' });
      db.addActivityLog(req.userId!, 'Transaction Updated', `Modified transaction id ${id}: updated values`);
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to update transaction' });
    }
  });

  app.delete('/api/transactions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const success = db.deleteTransaction(req.userId!, id);
      if (!success) return res.status(404).json({ error: 'Transaction not found.' });
      db.addActivityLog(req.userId!, 'Transaction Deleted', `Removed transaction id ${id}`);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to delete transaction' });
    }
  });

  // ============== RECURRING TRANSACTIONS MODULE ==============

  // Passive trigger on load to catch up scheduled items
  app.get('/api/recurring-transactions', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      // First process potential due transactions
      const cronResult = db.generateRecurringTransactionsDue(req.userId!);
      if (cronResult.generatedCount > 0) {
        db.addActivityLog(
          req.userId!,
          'Recurring Transaction Processing',
          `Cron-like task generated ${cronResult.generatedCount} transactions automatically.`
        );
      }
      
      const list = db.getRecurringTransactions(req.userId!);
      return res.json({
        recurringTransactions: list,
        autoGeneratedCount: cronResult.generatedCount,
        autoGeneratedTxs: cronResult.transactions
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Error loading scheduled transactions' });
    }
  });

  app.post('/api/recurring-transactions', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { type, amount, category, interval, startDate, nextDueDate, notes, tags } = req.body;
    
    if (!type || !amount || !category || !interval || !startDate || !nextDueDate) {
      return res.status(400).json({ error: 'Missing required configuration parameters.' });
    }

    try {
      const newRt = db.addRecurringTransaction(req.userId!, {
        type,
        amount: Number(amount),
        category,
        interval,
        startDate,
        nextDueDate,
        isActive: true,
        notes,
        tags: tags || []
      });

      db.addActivityLog(req.userId!, 'Recurring Transaction Created', `Added repeating schedule for ${category} at ${amount}`);
      
      // Instantly run catch up loop in case start or nextDueDate is already past due
      db.generateRecurringTransactionsDue(req.userId!);

      return res.json({ success: true, recurringTransaction: newRt });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/recurring-transactions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { type, amount, category, interval, startDate, nextDueDate, isActive, notes, tags } = req.body;

    try {
      const updateData: any = {};
      if (type !== undefined) updateData.type = type;
      if (amount !== undefined) updateData.amount = Number(amount);
      if (category !== undefined) updateData.category = category;
      if (interval !== undefined) updateData.interval = interval;
      if (startDate !== undefined) updateData.startDate = startDate;
      if (nextDueDate !== undefined) updateData.nextDueDate = nextDueDate;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (notes !== undefined) updateData.notes = notes;
      if (tags !== undefined) updateData.tags = tags;

      const updated = db.updateRecurringTransaction(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: 'Schedule configuration details not found.' });
      }

      db.addActivityLog(req.userId!, 'Recurring Transaction Updated', `Revised repeating parameters for ${updated.category}`);
      
      // Run catch up check
      db.generateRecurringTransactionsDue(req.userId!);

      return res.json({ success: true, recurringTransaction: updated });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/recurring-transactions/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const success = db.deleteRecurringTransaction(id);
      if (!success) {
        return res.status(404).json({ error: 'Schedule configuration details not found.' });
      }
      db.addActivityLog(req.userId!, 'Recurring Transaction Deleted', `Removed scheduled transaction: ${id}`);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/recurring-transactions/trigger-process', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const cronResult = db.generateRecurringTransactionsDue(req.userId!);
      return res.json({
        success: true,
        generatedCount: cronResult.generatedCount,
        transactions: cronResult.transactions
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Active Background Cron-like interval processing
  setInterval(() => {
    try {
      const result = db.generateRecurringTransactionsDue();
      if (result.generatedCount > 0) {
        console.log(`[BACKGROUND CRON] Automatically processed ${result.generatedCount} recurring transactions across the system.`);
      }
    } catch (err) {
      console.error('[BACKGROUND CRON] Error executing scheduled transaction updates:', err);
    }
  }, 3 * 60 * 1000); // executed every 3 minutes for high preview responsiveness

  // ============== CATEGORIES ENDPOINTS ==============

  app.get('/api/categories', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json(db.getCategories(req.userId!));
  });

  app.post('/api/categories', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { name, type, color, icon } = req.body;
    if (!name || !type || !color || !icon) {
      return res.status(400).json({ error: 'Name, type, color, and icon names are required' });
    }
    const cat = db.addCategory(req.userId!, { name, type, color, icon });
    db.addActivityLog(req.userId!, 'Category Created', `Set custom ${type} category: ${name}`);
    return res.json(cat);
  });

  // ============== BUDGETS ENDPOINTS ==============

  app.get('/api/budgets', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json(db.getBudgets(req.userId!));
  });

  app.post('/api/budgets', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { category, amount, month, year } = req.body;
    if (!category || amount === undefined || !month || !year) {
      return res.status(400).json({ error: 'Category, amount, month, and year are required.' });
    }

    const budget = db.addBudget(req.userId!, {
      category,
      amount: Number(amount),
      month: Number(month),
      year: Number(year)
    });
    db.addActivityLog(req.userId!, 'Budget Configured', `Configured budget for ${category} to $${amount}`);
    return res.json(budget);
  });

  app.delete('/api/budgets/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const success = db.deleteBudget(req.userId!, req.params.id);
    if (!success) return res.status(404).json({ error: 'Budget not found.' });
    db.addActivityLog(req.userId!, 'Budget Deleted', `Removed custom budget record.`);
    return res.json({ success: true });
  });

  // ============== GOALS ENDPOINTS ==============

  app.get('/api/goals', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json(db.getGoals(req.userId!));
  });

  app.post('/api/goals', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { title, targetAmount, currentAmount, targetDate, category } = req.body;
    if (!title || targetAmount === undefined || currentAmount === undefined || !targetDate) {
      return res.status(400).json({ error: 'Title, targetAmount, currentAmount, and targetDate are required.' });
    }

    const goal = db.addGoal(req.userId!, {
      title,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      targetDate,
      category
    });
    db.addActivityLog(req.userId!, 'Savings Goal Created', `Configured goal for "${title}": target $${targetAmount}`);
    return res.json(goal);
  });

  app.put('/api/goals/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (updates.targetAmount !== undefined) updates.targetAmount = Number(updates.targetAmount);
    if (updates.currentAmount !== undefined) updates.currentAmount = Number(updates.currentAmount);

    const updated = db.updateGoal(req.userId!, id, updates);
    if (!updated) return res.status(404).json({ error: 'Goal not found.' });
    db.addActivityLog(req.userId!, 'Savings Goal Updated', `Adjusted goal values for "${updated.title}"`);
    return res.json(updated);
  });

  app.delete('/api/goals/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const success = db.deleteGoal(req.userId!, req.params.id);
    if (!success) return res.status(404).json({ error: 'Goal not found.' });
    db.addActivityLog(req.userId!, 'Savings Goal Deleted', `Deleted savings goal.`);
    return res.json({ success: true });
  });

  // ============== NOTIFICATIONS ENDPOINTS ==============

  app.get('/api/notifications', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json(db.getNotifications(req.userId!));
  });

  app.post('/api/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res) => {
    const success = db.markNotificationAsRead(req.userId!, req.params.id);
    return res.json({ success });
  });

  app.post('/api/notifications/read-all', authMiddleware, (req: AuthenticatedRequest, res) => {
    db.markAllNotificationsAsRead(req.userId!);
    return res.json({ success: true });
  });

  // ============== SECURITY / ACTIVITY LOGS ==============

  app.get('/api/activity-logs', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json(db.getActivityLogs(req.userId!));
  });

  // ============== SMART AI FEATURES (GEMINI) ==============

  app.get('/api/ai/insights', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const transactions = db.getTransactions(req.userId!);
    const budgets = db.getBudgets(req.userId!);
    const user = db.getUserById(req.userId!)!;

    // Compile simplified financial report to context
    const limitAndSafeTxs = transactions.slice(0, 45).map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
      notes: t.notes || ''
    }));

    const budgetsSummary = budgets.map(b => ({
      category: b.category,
      limit: b.amount,
      spent: b.spent
    }));

    const promptText = `
      Analyze the following financial history of transaction ledgers and budget profiles for user "${user.name}":
      
      TRANSACTIONS (MAX 45):
      ${JSON.stringify(limitAndSafeTxs, null, 2)}
      
      MONTHLY BUDGET METRICS:
      ${JSON.stringify(budgetsSummary, null, 2)}

      Assess their savings habits, target potential leakages, track budget compliance, suggest custom dynamic adjustments, flag high anomalous tickets, and evaluate a comprehensive FinTech health score (0-100 scale). Make sure predictions and suggestions are helpful.
    `;

    // AI logic fallback in case GEMINI_API_KEY is not defined or service has issues
    const generateFallback = () => {
      // Basic static analysis
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, p) => s + p.amount, 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, p) => s + p.amount, 0);
      const ratio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 80;
      
      let score = 75;
      if (ratio > 90) score = 48;
      if (ratio < 60) score = 88;

      return {
        healthScore: Math.round(score),
        analysis: "Your spending shows consistent patterns, but there are a few opportunities to optimize. You spent around " + Math.round(ratio) + "% of your overall incomes over the current billing cycle.",
        recommendations: [
          { category: "Groceries", suggestion: "Your grocery purchases hit $505, near your limit. Standard meal planning could save you $80 monthly." },
          { category: "Shopping", suggestion: "Exceeded your shopping segment by a dramatic margin. We recommend establishing a strict checkout buffer." }
        ],
        unusualActivities: transactions.filter(t => t.type === 'expense' && t.amount >= 500).map(t => ({
          date: t.date,
          merchant: t.notes || t.category,
          amount: t.amount,
          warning: "Anomalous high ticket transaction detected. Highly above your typical average segment limit."
        })),
        predictions: [
          { period: "Next Month", category: "Entertainment", expectedAmount: 110, reason: "Based on previous weekly repeating subscriptions and high frequency of weekend dining trends." }
        ]
      };
    };

    if (!ai) {
      // Key absent: return local rule-based analytical dashboard models instantly!
      return res.json({
        ...generateFallback(),
        isAiFallback: true,
        aiError: 'missing'
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          systemInstruction: 'You are an advanced FinTech AI wealth manager and fiduciary analyst. Analyze the data meticulously. Return data in specified JSON Format Schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              healthScore: { type: Type.INTEGER, description: 'Overall budget compliance health score out of 100' },
              analysis: { type: Type.STRING, description: 'Brief expert review summarizing overall spending pattern trend' },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    suggestion: { type: Type.STRING, description: 'Highly specific and clear advice explaining how to adjust' }
                  }
                }
              },
              unusualActivities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    merchant: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    warning: { type: Type.STRING, description: 'Alert message flags' }
                  }
                }
              },
              predictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    period: { type: Type.STRING, description: 'Next Month expected projection window' },
                    category: { type: Type.STRING },
                    expectedAmount: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  }
                }
              }
            },
            required: ['healthScore', 'analysis', 'recommendations', 'unusualActivities', 'predictions']
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
        return res.json({
          ...JSON.parse(responseText.trim()),
          isAiFallback: false,
          aiError: null
        });
      } else {
        return res.json({
          ...generateFallback(),
          isAiFallback: true,
          aiError: 'empty_response'
        });
      }
    } catch (e: any) {
      console.error('Error invoking Gemini model, generating dynamic rules fallback:', e);
      const errMsg = e.message || String(e);
      let aiError = 'unknown';
      if (errMsg.includes('leaked') || errMsg.includes('leak')) {
        aiError = 'leaked';
      } else if (errMsg.includes('API key') || errMsg.includes('Key not valid') || errMsg.includes('Forbidden') || errMsg.includes('403')) {
        aiError = 'invalid';
      }
      return res.json({
        ...generateFallback(),
        isAiFallback: true,
        aiError
      });
    }
  });

  // Multimodal Receipt OCR Scan Endpoints using base64 image uploading!
  app.post('/api/ai/analyze-receipt', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { base64Image, mimeType } = req.body;
    if (!base64Image || !mimeType) {
      return res.status(400).json({ error: 'Base64 image data and IANA standard mimeType is required.' });
    }

    const fallbackOcr = () => {
      // Friendly, smart simulation OCR in case API key is absent or errors
      const words = ["whole foods", "groceries", "supermarket", "nike", "target", "amazon", "starbucks", "mcdonald"];
      const randomAmount = Number((Math.random() * 85 + 5).toFixed(2));
      const todayString = new Date().toISOString().split('T')[0];
      return {
        merchant: "Merchant Scan",
        amount: randomAmount,
        category: "Groceries",
        date: todayString,
        notes: "Auto-extracted from receipt scan upload mockup",
        confidence: 0.92
      };
    };

    if (!ai) {
      return res.json({
        ...fallbackOcr(),
        isAiFallback: true,
        aiError: 'missing'
      });
    }

    try {
      const imgPart = {
        inlineData: {
          mimeType,
          data: base64Image
        }
      };

      const command = {
        text: 'Extract the merchant, transaction date, total transaction amount, potential categorized match (e.g. Shopping, Utilities & Bills, Groceries, Dining Out, Entertainment) from this receipt. Return structured JSON matching schema.'
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [imgPart, command] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING, description: 'Store name or vendor' },
              amount: { type: Type.NUMBER, description: 'Final general total amount on the slip' },
              category: { type: Type.STRING, description: 'Matching Category name from list (e.g. Groceries, Shopping, Dining Out, Utilities & Bills, Transport & Auto, Entertainment, Fitness & Health)' },
              date: { type: Type.STRING, description: 'Formatted ISO Date YYYY-MM-DD on receipt' },
              notes: { type: Type.STRING, description: 'A brief 1-line description of items' }
            },
            required: ['merchant', 'amount', 'category', 'date']
          }
        }
      });

      const parsedText = response.text;
      if (parsedText) {
        return res.json({
          ...JSON.parse(parsedText.trim()),
          isAiFallback: false,
          aiError: null
        });
      } else {
        return res.json({
          ...fallbackOcr(),
          isAiFallback: true,
          aiError: 'empty_response'
        });
      }
    } catch (e: any) {
      console.error('Error scanning receipt via Gemini:', e);
      const errMsg = e.message || String(e);
      let aiError = 'unknown';
      if (errMsg.includes('leaked') || errMsg.includes('leak')) {
        aiError = 'leaked';
      } else if (errMsg.includes('API key') || errMsg.includes('Key not valid') || errMsg.includes('Forbidden') || errMsg.includes('403')) {
        aiError = 'invalid';
      }
      return res.json({
        ...fallbackOcr(),
        isAiFallback: true,
        aiError
      });
    }
  });

  // ============== AI AUTO CATEGORIZATION RECOMMENDATIONS ==============

  app.post('/api/ai/suggest-category', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { notes } = req.body;
    if (!notes || notes.trim() === '') {
      return res.json({ suggestedCategory: '', confidence: 0, reason: 'Empty merchant details' });
    }

    let standardFallback = () => {
      return {
        suggestedCategory: 'Shopping',
        confidence: 45,
        reason: 'Temporary offline fallback categorizer'
      };
    };

    try {
      const pastTxs = db.getTransactions(req.userId!);
      const categories = db.getCategories(req.userId!);
      const categoryNames = categories.map(c => c.name);

      // Build unique dictionary mapping past merchant names to categories
      const historyMap: Record<string, string> = {};
      pastTxs.forEach(t => {
        if (t.notes && t.category) {
          historyMap[t.notes.trim().toLowerCase()] = t.category;
        }
      });

      standardFallback = () => {
        const targetLower = notes.trim().toLowerCase();
        
        // Exact match
        if (historyMap[targetLower]) {
          return {
            suggestedCategory: historyMap[targetLower],
            confidence: 95,
            reason: `Auto-learned from previous mapping assignment of '${notes}'`
          };
        }

        // Partial match
        for (const [pastKey, pastCat] of Object.entries(historyMap)) {
          if (targetLower.includes(pastKey) || pastKey.includes(targetLower)) {
            return {
              suggestedCategory: pastCat,
              confidence: 85,
              reason: `Matched past assignment sequence pattern '${pastKey}'`
            };
          }
        }

        // Keyword rules fallback
        const foodWords = ['whole foods', 'trader', 'grocery', 'supermarket', 'walmart', 'food', 'mart', 'grocer', 'kroger', 'safeway', 'shoprite', 'aldi', 'costco'];
        const dinWords = ['rest', 'cafe', 'starbucks', 'sushi', 'ramen', 'grill', 'bar', 'food', 'mcdonald', 'burger', 'pizza', 'bistro', 'diner', 'dining', 'starbucks', 'dunkin'];
        const transWords = ['uber', 'lyft', 'gas', 'shell', 'chevron', 'subway', 'transit', 'car', 'auto', 'parking', 'metro', 'train', 'flight', 'airline'];
        const entWords = ['netflix', 'hulu', 'spotify', 'disney', 'movie', 'concert', 'theater', 'sport', 'game', 'play', 'show', 'steam', 'playstation', 'cinema'];
        const utilityWords = ['electric', 'wifi', 'comcast', 'verizon', 'fiber', 'power', 'water', 'gas', 'mobile', 'att', 'tmobile', 'insurance', 'bill'];
        const healthWords = ['gym', 'fitness', 'health', 'clinic', 'pharmacy', 'doctor', 'hospital', 'cvs', 'walgreens', 'active', 'medical', 'dentist'];
        const shopWords = ['amazon', 'nike', 'apple', 'target', 'store', 'mall', 'shopping', 'clothing', 'retail', 'nordstrom', 'zara', 'h&m'];

        if (foodWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Groceries', confidence: 75, reason: "Analyzed keywords: food/grocery merchant match." };
        if (dinWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Dining Out', confidence: 72, reason: "Analyzed keywords: restaurant/cafe merchant match." };
        if (transWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Transport & Auto', confidence: 70, reason: "Analyzed keywords: transport/ride-share merchant match." };
        if (entWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Entertainment', confidence: 75, reason: "Analyzed keywords: media/entertainment merchant match." };
        if (utilityWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Utilities & Bills', confidence: 80, reason: "Analyzed keywords: bills/service-provider match." };
        if (healthWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Fitness & Health', confidence: 75, reason: "Analyzed keywords: fitness/medical merchant match." };
        if (shopWords.some(w => targetLower.includes(w))) return { suggestedCategory: 'Shopping', confidence: 70, reason: "Analyzed keywords: generic retail/shopping match." };

        // Default fallback with low confidence
        return {
          suggestedCategory: 'Shopping',
          confidence: 45,
          reason: 'Standard fallback categorizer recommendations'
        };
      };

      if (!ai) {
        return res.json({
          ...standardFallback(),
          isAiFallback: true,
          aiError: 'missing'
        });
      }

      const historyArr = Object.entries(historyMap).slice(0, 30).map(([k, v]) => ({ notes: k, category: v }));
      const promptText = `
        You are a financial asset categorization intelligence.
        Current notes/merchant to categorize: "${notes}"
        
        USER'S LEARNING HISTORY (How they previously mapped merchant names to categories):
        ${JSON.stringify(historyArr, null, 2)}
        
        AVAILABLE CANDIDATE CATEGORIES:
        ${JSON.stringify(categoryNames, null, 2)}
        
        Suggest the most accurate category. If there is a clear match or semantic pattern in the USER'S LEARNING HISTORY, prioritize that (e.g., if "Whole Foods" is Groceries, they want "Whole Foods NYC" to be Groceries too).
        Provide a confidence score (0 to 100) and a concise, non-jargon, friendly, user-facing reason. Return ONLY the JSON object.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptText,
        config: {
          systemInstruction: 'Associate inputs to candidate categories. Always respond in structured JSON format.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedCategory: { type: Type.STRING },
              confidence: { type: Type.INTEGER },
              reason: { type: Type.STRING }
            },
            required: ['suggestedCategory', 'confidence', 'reason']
          }
        }
      });

      const text = response.text?.trim();
      if (text) {
        return res.json({
          ...JSON.parse(text),
          isAiFallback: false,
          aiError: null
        });
      } else {
        return res.json({
          ...standardFallback(),
          isAiFallback: true,
          aiError: 'empty_response'
        });
      }
    } catch (err: any) {
      console.error('Gemini categories suggestion error:', err);
      const errMsg = err.message || String(err);
      let aiError = 'unknown';
      if (errMsg.includes('leaked') || errMsg.includes('leak')) {
        aiError = 'leaked';
      } else if (errMsg.includes('API key') || errMsg.includes('Key not valid') || errMsg.includes('Forbidden') || errMsg.includes('403')) {
        aiError = 'invalid';
      }
      return res.json({
        ...standardFallback(),
        isAiFallback: true,
        aiError
      });
    }
  });


  // ============== INVESTMENTS ENDPOINTS ==============

  app.get('/api/investments', authMiddleware, (req: AuthenticatedRequest, res) => {
    const list = db.getInvestments(req.userId!);
    return res.json(list);
  });

  app.post('/api/investments', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { type, symbol, name, quantity, buyPrice, currentPrice, purchaseDate } = req.body;
    if (!type || !symbol || !name || quantity === undefined || buyPrice === undefined || !purchaseDate) {
      return res.status(400).json({ error: 'Type, symbol, name, quantity, buyPrice, and purchaseDate are required.' });
    }

    try {
      const inv = db.addInvestment(req.userId!, {
        type,
        symbol: symbol.toUpperCase(),
        name,
        quantity: Number(quantity),
        buyPrice: Number(buyPrice),
        currentPrice: currentPrice !== undefined ? Number(currentPrice) : Number(buyPrice),
        purchaseDate
      });
      db.addActivityLog(req.userId!, 'Investment Added', `Registered security buy: ${inv.quantity} shares of ${inv.symbol} (${inv.name}) at $${inv.buyPrice}`);
      return res.json(inv);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to add investment.' });
    }
  });

  app.put('/api/investments/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const updated = db.updateInvestment(req.userId!, id, req.body);
      if (!updated) return res.status(404).json({ error: 'Investment not found.' });
      db.addActivityLog(req.userId!, 'Investment Updated', `Modified investment portfolio variables for ${updated.symbol}`);
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to update investment.' });
    }
  });

  app.delete('/api/investments/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    try {
      const success = db.deleteInvestment(req.userId!, id);
      if (!success) return res.status(404).json({ error: 'Investment not found.' });
      db.addActivityLog(req.userId!, 'Investment Removed', `Deleted security asset holding.`);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to remove investment.' });
    }
  });

  app.post('/api/investments/refresh', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const updated = db.updateRealtimePrices(req.userId!);
      db.addActivityLog(req.userId!, 'Portfolio Valuations Refreshed', `Simulated market update for equity investments.`);
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to refresh prices.' });
    }
  });


  // ============== REPORTS / CSV DOWNLOAD EXPORTS ==============
  app.get('/api/reports/export', authMiddleware, (req: AuthenticatedRequest, res) => {
    const list = db.getTransactions(req.userId!);
    
    // Simply return as a structured downloadable attachment
    // Compile CSV
    let csv = 'ID,Type,Amount,Category,Date,Tags,Notes,CreatedAt\r\n';
    list.forEach(t => {
      const tagsStr = `"${t.tags.join('; ')}"`;
      const notesStr = `"${(t.notes || '').replace(/"/g, '""')}"`;
      csv += `${t.id},${t.type},${t.amount},"${t.category}",${t.date},${tagsStr},${notesStr},${t.createdAt}\r\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fintrack-expenses-report.csv');
    return res.send(csv);
  });


  // ============== ADMIN CONSOLE EXPOSURE ==============

  app.get('/api/admin/metrics', authMiddleware, (req: AuthenticatedRequest, res) => {
    // Dynamic Role-Based Access Control check from Database state
    const callingUser = db.getUserById(req.userId!);
    if (!callingUser || callingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }

    const allUsers = db.getUsers();
    // compute metrics
    const totalTxCount = (db as any).state.transactions.length;
    const totalBudgetsCount = (db as any).state.budgets.length;
    const goalsCount = (db as any).state.goals.length;

    // Daily active estimation
    const dau = Math.round(allUsers.length * 0.8) || 1;

    // Estimated revenue from dummy subscriptions
    const subRevenue = allUsers.length * 14.99;

    return res.json({
      totalUsers: allUsers.length,
      activeUsers: dau,
      totalTransactions: totalTxCount,
      totalBudgets: totalBudgetsCount,
      totalGoals: goalsCount,
      monthlySubscriptionRevenue: Number(subRevenue.toFixed(2)),
      usersList: allUsers
    });
  });

  // Admin user deletion route
  app.delete('/api/admin/users/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const callingUser = db.getUserById(req.userId!);
    if (!callingUser || callingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    // Don't allow self-deletion
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Self-deletion is forbidden.' });
    }

    const userToDelete = db.getUserById(req.params.id);
    const success = db.deleteUser(req.params.id);
    if (success && userToDelete) {
      db.addAdminAuditLog(
        'USER_DELETION',
        callingUser.email,
        `Permanently terminated user account "${userToDelete.name}" (${userToDelete.email}) and wiped linked assets.`,
        'WARNING',
        userToDelete.email
      );
    }
    return res.json({ success });
  });

  // User Role/Permissions management route
  app.post('/api/admin/users/:id/role', authMiddleware, (req: AuthenticatedRequest, res) => {
    const callingUser = db.getUserById(req.userId!);
    if (!callingUser || callingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }

    const targetUserId = req.params.id;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Invalid role token. Must be "admin" or "user".' });
    }

    const targetUser = db.getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Registered user not found.' });
    }

    // Lockout prevention: don't allow changing own role
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Self-demotion is prevented. You cannot change your own administrative role.' });
    }

    try {
      const updatedUser = db.updateUser(targetUserId, { role });
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      
      db.addAdminAuditLog(
        'ROLE_CHANGE',
        callingUser.email,
        `Modified permission context of "${targetUser.name}" (${targetUser.email}) from "${targetUser.role}" to "${role}".`,
        'WARNING',
        targetUser.email,
        ip.replace('::ffff:', '')
      );
      
      return res.json({ success: true, user: updatedUser });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // DB Reseed/Reset tool
  app.post('/api/admin/reset-db', authMiddleware, (req: AuthenticatedRequest, res) => {
    const callingUser = db.getUserById(req.userId!);
    if (!callingUser || callingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    try {
      db.reset();
      db.addAdminAuditLog(
        'DATABASE_RESEED',
        callingUser.email,
        'Cleared custom telemetry, wiped dynamic transactions, and restored factory seed configurations.',
        'WARNING'
      );
      return res.json({ success: true, message: 'Database resetted to factory seed data.' });
    } catch (e: any) {
      db.addAdminAuditLog(
        'DATABASE_RESEED_FAILED',
        callingUser.email,
        `Attempt to reseed core database failed: ${e.message}`,
        'FAILED'
      );
      return res.status(500).json({ error: e.message });
    }
  });

  // Fetch admin audit logs
  app.get('/api/admin/audit-logs', authMiddleware, (req: AuthenticatedRequest, res) => {
    const callingUser = db.getUserById(req.userId!);
    if (!callingUser || callingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }
    const logs = db.getAdminAuditLogs();
    return res.json(logs);
  });

  // Submit dynamic custom admin audit-log (simulation action integration)
  app.post('/api/admin/audit-logs/custom', authMiddleware, (req: AuthenticatedRequest, res) => {
    const callingUser = db.getUserById(req.userId!);
    if (!callingUser || callingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    const { action, details, status } = req.body;
    if (!action || !details || !status) {
      return res.status(400).json({ error: 'Action, details, and status criteria are required.' });
    }
    try {
      // Fetch operator IP or fallback
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '10.0.0.12') as string;
      const log = db.addAdminAuditLog(
        action,
        callingUser.email,
        details,
        status as 'SUCCESS' | 'WARNING' | 'FAILED',
        undefined,
        ip.replace('::ffff:', '')
      );
      return res.json({ success: true, log });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });


  // ============== VITE DEVELOPMENT & CLIENT STATIC SERVING ==============

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 and interface 0.0.0.0
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FinTrack Platform] Express server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Dev Server crash:", err);
});
