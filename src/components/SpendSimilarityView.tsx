import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  Layers,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  TrendingDown,
  Trash2,
  CheckCircle,
  DollarSign,
  Maximize2,
  Calendar,
  Split
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface SpendSimilarityViewProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function SpendSimilarityView({ transactions, currencySymbol }: SpendSimilarityViewProps) {
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(70);
  const [activeTab, setActiveTab] = useState<'duplicates' | 'monthly'>('duplicates');
  const [dismissedMatches, setDismissedMatches] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState<string | null>(null);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);

  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. Calculate transaction similarity clusters
  const similarityClusters = useMemo(() => {
    if (transactions.length < 2) return [];

    const clusters: Array<{
      id: string;
      txA: Transaction;
      txB: Transaction;
      score: number;
      reasons: string[];
      possibleAction: string;
    }> = [];

    // Simple O(N^2) search is fast for regular datasets (~50-300 transactions)
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const txA = transactions[i];
        const txB = transactions[j];

        // Skip comparing if different types (income vs expense)
        if (txA.type !== txB.type) continue;

        let score = 0;
        const reasons: string[] = [];

        // Factor 1: Amount Proximity (up to 45 pts)
        const diffPercent = Math.abs(txA.amount - txB.amount) / Math.max(txA.amount, txB.amount, 1);
        if (txA.amount === txB.amount) {
          score += 45;
          reasons.push('Identical exact transaction monetary amount');
        } else if (diffPercent < 0.05) {
          score += 35;
          reasons.push('Extremely similar amount (within 5% margin)');
        } else if (diffPercent < 0.15) {
          score += 20;
          reasons.push('Slightly related amount (within 15% range)');
        }

        // Factor 2: Category Match (15 pts)
        if (txA.category.toLowerCase() === txB.category.toLowerCase()) {
          score += 15;
          reasons.push(`Matching transaction category [${txA.category}]`);
        }

        // Factor 3: Date distance or recurrence (up to 20 pts)
        const dateA = new Date(txA.date);
        const dateB = new Date(txB.date);
        const diffMs = Math.abs(dateA.getTime() - dateB.getTime());
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          score += 20;
          reasons.push('Same day purchase timestamp');
        } else if (diffDays <= 3) {
          score += 15;
          reasons.push('Incredibly close date intervals (under 3 days)');
        } else if (diffDays >= 27 && diffDays <= 33) {
          score += 20;
          reasons.push('Recurring monthly period intervals (~30 day streak offset)');
        }

        // Factor 4: Note token similarity index (20 pts)
        const notesA = (txA.notes || '').toLowerCase().trim();
        const notesB = (txB.notes || '').toLowerCase().trim();
        if (notesA && notesB) {
          if (notesA === notesB) {
            score += 20;
            reasons.push('Identical notes / merchant naming descriptors');
          } else {
            // Check for shared tokens
            const tokensA = notesA.split(/\s+/).filter(t => t.length > 2);
            const tokensB = notesB.split(/\s+/).filter(t => t.length > 2);
            const commonTokens = tokensA.filter(tok => tokensB.includes(tok));
            if (commonTokens.length > 0) {
              score += 15;
              reasons.push(`Overlapping merchant descriptive keywords like: "${commonTokens[0]}"`);
            }
          }
        }

        if (score >= similarityThreshold) {
          // Determine possible action recommendation
          let possibleAction = 'No action required';
          if (diffDays === 0 && txA.amount === txB.amount) {
            possibleAction = 'Flag as potential double-billing / duplicate request anomaly';
          } else if (diffDays >= 27 && diffDays <= 33) {
            possibleAction = 'Consolidate into a designated Monthly Subscription schedule';
          } else {
            possibleAction = 'Double-check category categorization alignment';
          }

          clusters.push({
            id: `${txA.id}-${txB.id}`,
            txA,
            txB,
            score,
            reasons,
            possibleAction
          });
        }
      }
    }

    return clusters.sort((a, b) => b.score - a.score);
  }, [transactions, similarityThreshold]);

  // Tab 2: Compare Month-over-Month Similarity Layout
  const monthlyCategoryComparison = useMemo(() => {
    // Group transactions by month and category
    const categoriesSet = Array.from(new Set(transactions.map(t => t.category)));
    const monthsGroup: Record<string, Record<string, number>> = {};

    transactions.forEach(t => {
      // Parse YYYY-MM
      const m = t.date.substring(0, 7); // e.g. "2026-06"
      if (!monthsGroup[m]) monthsGroup[m] = {};
      monthsGroup[m][t.category] = (monthsGroup[m][t.category] || 0) + (t.type === 'expense' ? t.amount : 0);
    });

    const monthsAvailable = Object.keys(monthsGroup).sort().reverse();
    if (monthsAvailable.length < 2) return { data: [], monthA: '', monthB: '', overlapPercent: 100 };

    const monthA = monthsAvailable[0]; // latest month
    const monthB = monthsAvailable[1]; // previous month

    let sumMinimums = 0;
    let sumMonthA = 0;
    let sumMonthB = 0;

    const barData = categoriesSet.map(cat => {
      const valA = monthsGroup[monthA][cat] || 0;
      const valB = monthsGroup[monthB][cat] || 0;

      sumMinimums += Math.min(valA, valB);
      sumMonthA += valA;
      sumMonthB += valB;

      return {
        category: cat,
        [monthA]: valA,
        [monthB]: valB,
      };
    });

    // Czekanowski / Cosine likeness percentage index
    const totalMass = (sumMonthA + sumMonthB) / 2;
    const overlapPercent = totalMass > 0 ? Math.round((sumMinimums / totalMass) * 100) : 100;

    return {
      data: barData,
      monthA,
      monthB,
      overlapPercent
    };
  }, [transactions]);

  const handleResolve = (clusterId: string, actionType: string) => {
    setIsResolving(clusterId);
    setTimeout(() => {
      setDismissedMatches(prev => [...prev, clusterId]);
      setResolvedStatus(`Resolved match group by applying: "${actionType}"`);
      setIsResolving(null);
      setTimeout(() => setResolvedStatus(null), 3000);
    }, 1200);
  };

  const filteredClusters = similarityClusters.filter(c => !dismissedMatches.includes(c.id));

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Visual Banner Header */}
      <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 blur-sm">
          <Split className="h-64 w-64 text-white" />
        </div>
        
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="bg-sky-500/10 text-sky-350 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest border border-sky-500/20">
            Coherence Analyzer
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">Spent Similarity Matrix</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Identify duplicate financial friction, matching billing periods, or compare month-over-month category distribution footprints. This algorithmic panel helps you check for repetitive spending cohorts automatically.
          </p>
        </div>
      </div>

      {resolvedStatus && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-5 w-full border border-emerald-100 p-4 text-xs text-emerald-800 font-bold shadow-xs">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{resolvedStatus}</span>
        </div>
      )}

      {/* Switch Control Center Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Metric Overview Card */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-500" />
              Dynamic Match Engine Controls
            </span>
            <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded text-[10px] font-bold">
              {filteredClusters.length} matching entities
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-600">Proximity Sensitivity Level</span>
                <span className="font-bold text-blue-600">{similarityThreshold}% Match Rating</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono font-medium">
                <span>50% (Loose Comparison)</span>
                <span>75% (Recommended)</span>
                <span>95% (Exact Duplicates Only)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature quick stats */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Likeness</span>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {monthlyCategoryComparison.overlapPercent}%
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Spending similarity between <span className="font-bold text-indigo-600">{monthlyCategoryComparison.monthA || 'Current'}</span> and <span className="font-bold text-slate-600">{monthlyCategoryComparison.monthB || 'Last'}</span> month.
            </p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
              style={{ width: `${monthlyCategoryComparison.overlapPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="border-b border-slate-150">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'duplicates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Duplicate & Recurring Alert Ledger ({filteredClusters.length})
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'monthly'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Month-over-Month Similarity Benchmark
          </button>
        </div>
      </div>

      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {filteredClusters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center max-w-xl mx-auto space-y-2.5">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-950">No Overlapping Anomalies Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                With a {similarityThreshold}% match constraint config, your expenditure histories show outstanding categorization diversity with zero near-duplicate friction alerts.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredClusters.map((cluster) => (
                <div 
                  key={cluster.id} 
                  className="rounded-xl border border-slate-150 bg-white p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        cluster.score >= 85 
                          ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {cluster.score}% Correlation Score
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Matched Log
                      </span>
                    </div>

                    {/* Both compared transactions side by side or stacked */}
                    <div className="space-y-2 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-900 truncate">
                            {cluster.txA.notes || 'Unnamed Purchase'}
                          </p>
                          <span className="text-[10px] text-indigo-600 font-semibold">{cluster.txA.category}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">{cluster.txA.date}</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono shrink-0">
                          {currencySymbol}{fmt(cluster.txA.amount)}
                        </span>
                      </div>

                      <div className="border-t border-slate-200/60 my-1 border-dashed" />

                      <div className="flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-900 truncate">
                            {cluster.txB.notes || 'Unnamed Purchase'}
                          </p>
                          <span className="text-[10px] text-indigo-600 font-semibold">{cluster.txB.category}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">{cluster.txB.date}</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono shrink-0">
                          {currencySymbol}{fmt(cluster.txB.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Similarity Logic Indicators</p>
                      <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc">
                        {cluster.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-blue-50/40 rounded border border-blue-100 hover:border-blue-200 p-2.5">
                      <p className="text-[10px] font-bold text-blue-900 flex items-center gap-1 uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5 text-blue-600 stroke-[2.5]" />
                        Optimized Recommendation
                      </p>
                      <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed font-semibold">
                        {cluster.possibleAction}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setDismissedMatches(prev => [...prev, cluster.id])}
                      className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Ignore Alert
                    </button>
                    <button
                      disabled={isResolving === cluster.id}
                      onClick={() => handleResolve(cluster.id, cluster.possibleAction)}
                      className="inline-flex items-center gap-1 rounded bg-[#2563eb] hover:bg-blue-700 text-white px-3 py-1.5 text-[10px] font-bold tracking-wide transition-all cursor-pointer"
                    >
                      {isResolving === cluster.id ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Simulating...</span>
                        </>
                      ) : (
                        <span>Simulate Resolution</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {monthlyCategoryComparison.data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center max-w-xl mx-auto space-y-2.5">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Insufficient Data History Available</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                We require at least two distinct calendar months of recorded ledger activity to calculate dynamic comparison similarity matrices. Keep adding transactions!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Month-over-Month Spent Overlap</h3>
                  <p className="text-xs text-slate-400">Comparing category costs between {monthlyCategoryComparison.monthA} (Draft latest) and {monthlyCategoryComparison.monthB} (Prior month)</p>
                </div>

                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyCategoryComparison.data}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }}
                        formatter={(val) => [`${currencySymbol}${fmt(Number(val))}`]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey={monthlyCategoryComparison.monthA} fill="#3b82f6" radius={[4, 4, 0, 0]} name={`${monthlyCategoryComparison.monthA || 'Current'}`} />
                      <Bar dataKey={monthlyCategoryComparison.monthB} fill="#94a3b8" radius={[4, 4, 0, 0]} name={`${monthlyCategoryComparison.monthB || 'Last Month'}`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded uppercase font-mono">Similitude Explanation</span>
                  <h4 className="text-xs font-bold text-slate-800">What does a {monthlyCategoryComparison.overlapPercent}% rating mean?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    The Spent Similarity factor tracks your structural structural lifestyle spending ratios. 
                    A higher value suggests high recurring predictability in fixed utilities, housing, and food expenditures. 
                    A low value suggests major high-variance variable expenses (vacations, shopping, or sudden medical expenditures) that shifted your asset distribution profile.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
                  <span className="text-[10px] bg-slate-100 text-slate-705 font-bold px-1.5 py-0.5 rounded uppercase font-mono">Dynamic Budget recommendation</span>
                  <h4 className="text-xs font-bold text-slate-800">MoM Variance Optimization Advice</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {monthlyCategoryComparison.overlapPercent >= 75 ? (
                      <span>Excellent! Your routine costs match within tight structural bounds. We recommend deploying recurring monthly micro-investments to siphon unspent surpluses automatically.</span>
                    ) : (
                      <span>High variance noticed. Your spending habits fluctuated significantly this month. Leverage the Budgets page to establish hard caps on non-essential, sliding expense brackets.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
