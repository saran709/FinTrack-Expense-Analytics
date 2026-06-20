import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Download, 
  X, 
  Plus, 
  FileText, 
  UploadCloud, 
  Image,
  RefreshCw,
  Check,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { Transaction, Category } from '../types';
import ReceiptQRScanner from './ReceiptQRScanner';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  onAddTransaction: (tx: any) => Promise<void>;
  onUpdateTransaction: (id: string, updates: any) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onDownloadCSV: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  onRefreshFinanceData: () => void;
}

export default function TransactionsView({
  transactions,
  categories,
  currencySymbol,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onDownloadCSV,
  apiFetch,
  onRefreshFinanceData
}: TransactionsViewProps) {
  
  // Searching & filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'' | 'income' | 'expense'>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals / forms state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Add Transaction form states
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('');

  // AI Categorizer results states
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedCategory: string; confidence: number; reason: string; isAiFallback?: boolean; aiError?: string } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const triggerAiCategorization = async (notesVal: string) => {
    if (!notesVal || notesVal.trim().length < 3) return;
    setIsSuggesting(true);
    setAiSuggestion(null);
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken || ''}`
        },
        body: JSON.stringify({ notes: notesVal })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.suggestedCategory) {
          setAiSuggestion(data);
        }
      }
    } catch (e) {
      console.error('AI Suggest category algorithm failed:', e);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Receipt Scan AI States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form sanitization helper
  const resetForm = () => {
    setFormAmount('');
    setFormCategory(categories.find(c => c.type === 'expense')?.name || '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormTags('');
    setScannedImage(null);
    setScanMessage(null);
    setAiSuggestion(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormType('expense');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormCategory(tx.category);
    setFormDate(tx.date);
    setFormNotes(tx.notes || '');
    setFormTags(tx.tags.join(', '));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formCategory || !formDate) return;

    const tagsArray = formTags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const txPayload = {
      type: formType,
      amount: parseFloat(formAmount),
      category: formCategory,
      date: formDate,
      notes: formNotes,
      tags: tagsArray,
      receiptUrl: scannedImage || undefined,
      receiptName: scannedImage ? 'receipt-upload.png' : undefined,
      aiSuggestedCategory: aiSuggestion?.suggestedCategory || undefined,
      aiConfidence: aiSuggestion?.confidence || undefined,
      aiSuggestionReason: aiSuggestion?.reason || undefined,
      aiConfirmed: aiSuggestion ? (aiSuggestion.suggestedCategory === formCategory) : undefined
    };

    if (editingTx) {
      await onUpdateTransaction(editingTx.id, txPayload);
      setEditingTx(null);
    } else {
      await onAddTransaction(txPayload);
      setIsAddModalOpen(false);
    }
    resetForm();
  };

  // Receipt Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Receipt scanning supports image files only.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      setScannedImage(base64data);
      triggerReceiptOcr(base64data, file.type);
    };
  };

  const triggerReceiptOcr = async (base64url: string, mime: string) => {
    setIsAiLoading(true);
    setScanMessage('Scanning digital receipt structure via Gemini AI OCR...');

    const token = localStorage.getItem('token');
    // Extract base65 payload
    const base64Data = base64url.split(',')[1];

    try {
      const res = await fetch('/api/ai/analyze-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ base64Image: base64Data, mimeType: mime })
      });

      if (!res.ok) throw new Error('OCR response error');
      const data = await res.json();
      
      // Inject AI parameters straight into the Add form values!
      if (data.amount) setFormAmount(data.amount.toString());
      if (data.category) {
        // match category or default option
        const matched = categories.find(c => c.name.toLowerCase() === data.category.toLowerCase());
        if (matched) {
          setFormCategory(matched.name);
        } else {
          setFormCategory(categories[0]?.name || '');
        }
      }
      if (data.date) setFormDate(data.date);
      if (data.merchant) setFormNotes(`Purveyed at: ${data.merchant}. Extracted automatically by Gemini.`);
      if (data.notes) setFormNotes(n => n + `. Info: ${data.notes}`);
      setFormTags('receipt, scanned, ai-ocr');

      setScanMessage('Success! Recipient merchant values matching category mapped perfectly.');
    } catch (e) {
      console.error(e);
      setScanMessage('An error occurred indexing receipt. Please enter manually.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Filtering Logic
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = searchTerm === '' || 
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesType = selectedType === '' || t.type === selectedType;
    const matchesCategory = selectedCategory === '' || t.category === selectedCategory;
    const matchesStart = startDate === '' || t.date >= startDate;
    const matchesEnd = endDate === '' || t.date <= endDate;

    return matchesSearch && matchesType && matchesCategory && matchesStart && matchesEnd;
  });

  // Calculate pages
  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage) || 1;
  const paginatedTxs = filteredTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatAmount = (tx: Transaction) => {
    const pfx = tx.type === 'income' ? '+' : '-';
    return `${pfx}${currencySymbol}${tx.amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Upper Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] font-sans">Ledgers & Balances</h2>
          <p className="text-sm text-[#64748b]">Edit, scan, search, and download your accounting sheets</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowQRScanner(!showQRScanner)}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold hover:shadow-xs transition-all cursor-pointer ${
              showQRScanner 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <QrCode className="h-4 w-4 text-blue-650" />
            <span>{showQRScanner ? 'Hide QR Scanner' : 'Scan QR Receipt'}</span>
          </button>
          <button 
            onClick={onDownloadCSV}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0f172a] transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8] hover:shadow-lg hover:shadow-blue-600/10 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Line Item</span>
          </button>
        </div>
      </div>

      {showQRScanner && (
        <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <ReceiptQRScanner 
            categories={categories}
            currencySymbol={currencySymbol}
            apiFetch={apiFetch}
            onTransactionLogged={onRefreshFinanceData}
            onClose={() => setShowQRScanner(false)}
          />
        </div>
      )}

      {/* Structured Search And Filter Widgets */}
      <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Text search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input 
              type="text" 
              placeholder="Search merchants, tags..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Type filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value as any); setCurrentPage(1); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="">All Flow Types</option>
              <option value="income">Incomes (+)</option>
              <option value="expense">Expenses (-)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">From</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 bg-white">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">To</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {(searchTerm || selectedType || selectedCategory || startDate || endDate) && (
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-lg p-3">
            <span className="text-slate-600 font-medium whitespace-nowrap">
              Active ledger filters matched <strong className="text-slate-900">{filteredTxs.length}</strong> records.
            </span>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
                setSelectedCategory('');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Central Ledger Records Table */}
      <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-[#64748b]">
                <th className="py-3 px-5">Merchant / Notes</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5 text-center">Receipt</th>
                <th className="py-3 px-5 text-center">Record Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {paginatedTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-[#0f172a] leading-tight">
                      {tx.notes || 'Unspecified Vendor'}
                    </div>
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tx.tags.map(tag => (
                          <span key={tag} className="inline-block text-[10px] font-sans font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      tx.type === 'income' ? 'bg-emerald-100/70 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-slate-700">{tx.category}</span>
                    {tx.aiSuggestedCategory && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-700 border border-blue-100 uppercase tracking-wider">
                          AI
                        </span>
                        <span className={`text-[9.5px] font-semibold ${
                          tx.aiConfirmed ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {tx.aiConfirmed ? '✓ Confirmed' : '✎ Overridden'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-5 font-mono text-xs text-slate-500">
                    {tx.date}
                  </td>
                  <td className={`py-3.5 px-5 text-right font-mono font-bold text-md ${
                    tx.type === 'income' ? 'text-emerald-600' : 'text-[#0f172a]'
                  }`}>
                    {formatAmount(tx)}
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    {tx.receiptUrl ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563eb] bg-blue-50 border border-blue-100 rounded px-2 py-0.5">
                        <FileText className="h-3 w-3" />
                        <span>Receipt</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleOpenEdit(tx)}
                        className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 transition-colors flex items-center justify-center"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Delete this ledger transaction entry permanently?')) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="p-1 px-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTxs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No transaction events match active filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50/70 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({filteredTxs.length} items matched)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs select-none disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-xs select-none disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Overlay Dialog: Add/Edit Transaction WITH AI Receipt scanning drop boxes */}
      {(isAddModalOpen || editingTx !== null) && (
        <div className="fixed inset-0 bg-slate-900/65 z-50 flex items-center justify-center backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Title */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150">
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {editingTx ? 'Modify Ledger Record' : 'Log New Transaction'}
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingTx(null); }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Receipt Drag Zone ONLY for newly added Expenses */}
              {!editingTx && formType === 'expense' && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200 hover:border-slate-350'
                  }`}
                >
                  <input 
                    type="file" 
                    id="receipt-file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileInput}
                  />
                  
                  {isAiLoading ? (
                    <div className="space-y-3">
                      <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-teal-700">{scanMessage}</p>
                    </div>
                  ) : scannedImage ? (
                    <div className="flex items-center justify-between gap-4 bg-teal-50/50 p-3 rounded-lg border border-teal-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center text-teal-700 overflow-hidden border">
                          <img src={scannedImage} alt="receipt" className="h-full w-full object-cover" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-teal-800">Digital receipt processed</p>
                          <p className="text-[10px] text-teal-600 mt-0.5">{scanMessage}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { setScannedImage(null); setScanMessage(null); }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Reset Slip
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="receipt-file" className="cursor-pointer space-y-2 block">
                      <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Drag & Drop digital receipts here, or <span className="text-teal-600 hover:underline">browse</span></p>
                      <p className="text-[10px] text-slate-400">Gemini AI parses vendor, category matches, total amount and updates forms automatically.</p>
                    </label>
                  )}
                </div>
              )}

              {/* Standard Form inputs */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Type Selection */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setFormType('expense'); setFormCategory(categories.find(c => c.type==='expense')?.name || ''); }}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                      formType === 'expense' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Outflowing Expense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormType('income'); setFormCategory(categories.find(c => c.type==='income')?.name || ''); }}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                      formType === 'income' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Inflowing Income (+)
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Transaction Total ({currencySymbol})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Associated Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-teal-500"
                    >
                      {categories.filter(c => c.type === formType).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>

                    {/* AI Suggestion box */}
                    {isSuggesting && (
                      <p className="text-[11px] text-blue-500 font-semibold mt-1.5 animate-pulse flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing description with AI classifier...
                      </p>
                    )}

                    {aiSuggestion && (
                      <div className="mt-2.5 text-xs bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 space-y-1 animate-slide-in">
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">
                            AI Suggestion
                          </span>
                          <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                            aiSuggestion.confidence >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {aiSuggestion.confidence}% Confidence
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-xs">
                          {aiSuggestion.suggestedCategory}
                        </p>
                        <p className="text-[10px] text-slate-500 mb-1">{aiSuggestion.reason}</p>
                        
                        {aiSuggestion.isAiFallback && (
                          <div className="flex items-center gap-1 text-[9.5px] font-semibold text-amber-850 bg-amber-55/40 rounded border border-amber-100 p-1 mt-1 mb-1.5">
                            <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />
                            <span>Using offline heuristic classifier (Gemini API suspended)</span>
                          </div>
                        )}
                        {formCategory !== aiSuggestion.suggestedCategory && (
                          <button
                            type="button"
                            onClick={() => setFormCategory(aiSuggestion.suggestedCategory)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>Apply suggested category</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Accounting Date</label>
                    <input 
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tags (separated by commas)</label>
                    <input 
                      type="text"
                      placeholder="starbucks, food, subscription"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Notes/Merchant Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Merchant / Description Notes</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide store name, specific purchases..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    onBlur={() => triggerAiCategorization(formNotes)}
                    className="w-full text-sm border border-slate-250 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-teal-500 resize-none"
                  />
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">Tips: AI analyzes merchant name on blur.</span>
                    <button
                      type="button"
                      disabled={isSuggesting || formNotes.trim().length < 3}
                      onClick={() => triggerAiCategorization(formNotes)}
                      className="text-[11px] text-[#2563eb] hover:underline hover:text-blue-700 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSuggesting ? 'animate-spin' : ''}`} />
                      <span>{isSuggesting ? 'Analyzing...' : 'Suggest with AI'}</span>
                    </button>
                  </div>
                </div>

                {/* Modal actions footer */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsAddModalOpen(false); setEditingTx(null); }}
                    className="px-4 py-2 border border-slate-250 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 hover:shadow-lg transition-all cursor-pointer"
                  >
                    {editingTx ? 'Update Entry' : 'Post Balance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
