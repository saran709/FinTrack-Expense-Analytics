import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Briefcase, 
  DollarSign, 
  PieChart as PieIcon,
  HelpCircle,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { Investment } from '../types';

interface InvestmentsViewProps {
  investments: Investment[];
  currencySymbol: string;
  onRefreshData: () => Promise<void>;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export default function InvestmentsView({
  investments,
  currencySymbol,
  onRefreshData,
  apiFetch
}: InvestmentsViewProps) {
  // Modal states
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Form state
  const [type, setType] = useState<'stock' | 'bond' | 'fund' | 'crypto' | 'other'>('stock');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Performance calculation variables
  const totalCost = investments.reduce((sum, inv) => sum + (inv.buyPrice * inv.quantity), 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + ((inv.currentPrice || inv.buyPrice) * inv.quantity), 0);
  const totalProfitLossList = totalCurrent - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalProfitLossList / totalCost) * 100 : 0;

  // Asset allocation aggregation for the pie chart
  const allocationMap: Record<string, number> = {};
  investments.forEach(inv => {
    const assetValuation = (inv.currentPrice || inv.buyPrice) * inv.quantity;
    allocationMap[inv.type] = (allocationMap[inv.type] || 0) + assetValuation;
  });

  const ALLOCATION_COLORS: Record<string, string> = {
    stock: '#3B82F6', // Blue
    bond: '#10B981',  // Emerald
    fund: '#8B5CF6',  // Purple
    crypto: '#F59E0B',// Amber
    other: '#64748B'  // Slate
  };

  const assetTypeLabels: Record<string, string> = {
    stock: 'Stocks',
    bond: 'Bonds',
    fund: 'Mutual Funds / ETFs',
    crypto: 'Crypto',
    other: 'Other Assets'
  };

  const allocationPieData = Object.entries(allocationMap).map(([key, value]) => ({
    name: assetTypeLabels[key] || key,
    value: Number(value.toFixed(2)),
    color: ALLOCATION_COLORS[key] || '#94A3B8'
  }));

  // Dynamic Valuation ticker
  const handleMarketRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiFetch('/api/investments/refresh', { method: 'POST' });
      await onRefreshData();
    } catch (e: any) {
      console.error(e);
      alert('Valuations fetch failed. Check connection.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add Investment submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!symbol || !name || !quantity || !buyPrice) {
      setFormError('All asterisk parameters are mandatory.');
      return;
    }

    const payload = {
      type,
      symbol: symbol.toUpperCase(),
      name,
      quantity: Number(quantity),
      buyPrice: Number(buyPrice),
      currentPrice: currentPrice ? Number(currentPrice) : Number(buyPrice),
      purchaseDate
    };

    if (isNaN(payload.quantity) || payload.quantity <= 0) {
      setFormError('Quantity must be a positive number.');
      return;
    }

    if (isNaN(payload.buyPrice) || payload.buyPrice <= 0) {
      setFormError('Buy price must be a positive number.');
      return;
    }

    try {
      await apiFetch('/api/investments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setFormSuccess('Investment added successfully!');
      // Clear inputs
      setSymbol('');
      setName('');
      setQuantity('');
      setBuyPrice('');
      setCurrentPrice('');
      
      await onRefreshData();
      setTimeout(() => {
        setIsAddingMode(false);
        setFormSuccess('');
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    }
  };

  // Delete Investment trigger
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this security holding?')) return;
    try {
      await apiFetch(`/api/investments/${id}`, { method: 'DELETE' });
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Could not complete deletion.');
    }
  };

  // Performance data for bar chart
  const performanceChartData = investments.map(inv => {
    const cost = inv.buyPrice * inv.quantity;
    const value = (inv.currentPrice || inv.buyPrice) * inv.quantity;
    return {
      symbol: inv.symbol,
      Cost: Number(cost.toFixed(2)),
      Value: Number(value.toFixed(2)),
      Return: Number((value - cost).toFixed(2))
    };
  });

  return (
    <div id="investments-container" className="space-y-8 animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Investment Portfolio</h2>
          <p className="text-sm text-slate-500">Track and manage asset holdings with simulated real-time valuation feeds.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarketRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing Market...' : 'Sync Live Prices'}</span>
          </button>
          
          <button
            onClick={() => setIsAddingMode(!isAddingMode)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* KPI Performance Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Cost Capital */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <Briefcase className="h-4 w-4 text-slate-400" />
            Total Contributed Capital
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
              {currencySymbol}{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Total original cost of physical seed assets purchased.</p>
        </div>

        {/* Current Value */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            <DollarSign className="h-4 w-4 text-slate-400" />
            Current Valuation
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
              {currencySymbol}{totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Aggregated worth calculated against live market rates.</p>
        </div>

        {/* Overall Earnings */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
              <Activity className="h-4 w-4 text-slate-400" />
              Total Gain / Loss (P&L)
            </div>
            {totalProfitLossList !== 0 && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold leading-5 ${
                totalProfitLossList >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {totalProfitLossList >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold tracking-tight font-sans ${
              totalProfitLossList >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {totalProfitLossList >= 0 ? '+' : ''}
              {currencySymbol}{totalProfitLossList.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Overall unreleased return margin aggregated on holdings.</p>
        </div>
      </div>

      {/* Add Investment Modal/Collapse Panel */}
      {isAddingMode && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 animate-slide-in">
          <h3 className="text-lg font-bold text-slate-900 font-sans mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            Register Asset Purchase
          </h3>
          <form onSubmit={handleAddSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Asset Category *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stock">Stock</option>
                  <option value="bond">Bond</option>
                  <option value="fund">ETF / Mutual Fund</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="other">Other Asset</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ticker / Symbol *</label>
                <input
                  type="text"
                  placeholder="e.g. AAPL, BTC, VOO"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Asset Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apple Inc, Bitcoin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Quantity/Units *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 15, 0.25"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Buy Price per Unit * ({currencySymbol})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 150.00"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Current Price Unit ({currencySymbol})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Leave empty to use Buy Price"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Acquisition date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formError && <p className="text-sm font-semibold text-rose-600">{formError}</p>}
            {formSuccess && <p className="text-sm font-semibold text-emerald-600">{formSuccess}</p>}

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMode(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all cursor-pointer"
              >
                Submit Asset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Analytics Charts & allocation breakdown */}
      {investments.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Allocation Breakdown Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-blue-500" />
              Asset Allocation Breakdown
            </h4>
            <div className="h-56 relative flex items-center justify-center">
              {allocationPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {allocationPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [`${currencySymbol}${val.toLocaleString('en-US')}`, 'Valuation']}
                      contentStyle={{ background: '#0F172A', color: 'white', border: 'none', borderRadius: '8px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-400">Insufficient allocation parameters.</p>
              )}
            </div>
            {/* Allocation Grid Labels */}
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {allocationPieData.map((entry, index) => {
                const percent = totalCurrent > 0 ? (entry.value / totalCurrent) * 100 : 0;
                return (
                  <div key={index} className="flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: entry.color }} />
                      <span className="font-semibold">{entry.name}</span>
                    </div>
                    <span className="font-mono text-slate-500">{percent.toFixed(1)}% ({currencySymbol}{entry.value.toLocaleString()})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Comparison Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-blue-500" />
              Asset Cost vs Current value
            </h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="symbol" fontStyle="Inter" fontSize={11} stroke="#94A3B8" tickLine={false} />
                  <YAxis fontStyle="Inter" fontSize={11} stroke="#94A3B8" tickLine={false} />
                  <Tooltip 
                    formatter={(val: number) => [`${currencySymbol}${val.toLocaleString()}`]}
                    contentStyle={{ background: '#0F172A', color: 'white', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Cost" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                Investment Return Metrics:
              </span>
              <span>Values in raw unit cost aggregates. See unreleased P&L ledger below.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white/50">
          <Layers className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">No Asset Portfolio Entries Added</h3>
          <p className="mt-1 text-xs text-slate-500 animate-pulse">Configure Stocks, Bonds, Cryptocurrency, and ETFs to build total net worth indicators.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsAddingMode(true)}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all cursor-pointer"
            >
              <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
              Add First Investment
            </button>
          </div>
        </div>
      )}

      {/* Holdings Ledger Table */}
      {investments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              Holdings Performance ledger (Unreleased gains)
            </h4>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {investments.length} Securities Held
            </span>
          </div>

          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/50">
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Security</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Asset Type</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Units Owned</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Cost / Share</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Market Price</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total valuation</th>
                  <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Unreleased Return</th>
                  <th scope="col" className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {investments.map((inv) => {
                  const itemCost = inv.buyPrice * inv.quantity;
                  const itemValuation = (inv.currentPrice || inv.buyPrice) * inv.quantity;
                  const itemProfit = itemValuation - itemCost;
                  const itemProfitPercent = inv.buyPrice > 0 ? (itemProfit / itemCost) * 100 : 0;
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name / symbol */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold font-mono tracking-tight text-xs border border-blue-100">
                            {inv.symbol.substring(0, 3)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-950 flex items-center gap-1.5">
                              {inv.symbol}
                              <span className="text-[9px] font-mono text-slate-400 font-normal">({inv.purchaseDate})</span>
                            </div>
                            <div className="text-[10px] text-slate-400">{inv.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500 capitalize">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium" style={{
                          backgroundColor: `${ALLOCATION_COLORS[inv.type]}10`,
                          color: ALLOCATION_COLORS[inv.type]
                        }}>
                          {assetTypeLabels[inv.type] || inv.type}
                        </span>
                      </td>

                      {/* Units */}
                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-600 font-mono">
                        {inv.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>

                      {/* Buy price */}
                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-600 font-mono">
                        {currencySymbol}{inv.buyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Current price */}
                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-700 font-mono font-semibold">
                        <div className="inline-flex items-center gap-1">
                          {currencySymbol}{(inv.currentPrice || inv.buyPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {inv.currentPrice && inv.currentPrice !== inv.buyPrice && (
                            <span className={inv.currentPrice >= inv.buyPrice ? "text-emerald-500 text-[9px]" : "text-rose-500 text-[9px]"}>
                              {inv.currentPrice >= inv.buyPrice ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total valuation */}
                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-950 font-bold font-mono">
                        {currencySymbol}{itemValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Returns */}
                      <td className={`whitespace-nowrap px-5 py-4 text-right text-xs font-mono font-semibold`}>
                        <div className={`inline-flex flex-col items-end ${
                          itemProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          <span>{itemProfit >= 0 ? '+' : ''}{currencySymbol}{itemProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-slate-400">({itemProfit >= 0 ? '+' : ''}{itemProfitPercent.toFixed(2)}%)</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-5 py-4 text-center text-xs">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Delete holding"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
