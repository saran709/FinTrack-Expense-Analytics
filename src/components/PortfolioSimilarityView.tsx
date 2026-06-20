import React, { useState, useMemo } from 'react';
import { Investment } from '../types';
import { 
  Sparkles, 
  HelpCircle, 
  RefreshCw,
  TrendingUp, 
  PieChart, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Layers,
  ArrowUpRight,
  UserCheck,
  Compass,
  LineChart
} from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface PortfolioSimilarityProps {
  investments: Investment[];
  currencySymbol: string;
}

// Global template index allocations
interface BenchmarkTemplate {
  id: string;
  name: string;
  description: string;
  allocation: {
    stock: number;
    bond: number;
    fund: number;
    crypto: number;
    other: number;
  };
  tips: string;
}

const BENCHMARKS: BenchmarkTemplate[] = [
  {
    id: 'conservative',
    name: 'Conservative Growth & Income',
    description: 'A wealth preservation portfolio focused heavily on bonds, high-yield deposit notes, and broad market index funds.',
    allocation: {
      stock: 20,
      bond: 60,
      fund: 15,
      crypto: 0,
      other: 5
    },
    tips: 'Recommended for near-retirement or risk-averse wealth management. High fixed income stream predictability.'
  },
  {
    id: 'moderate',
    name: 'All-Weather Balanced Sector',
    description: 'A classic 60/40 style diversification structure intended to capture market gains while buffering volatile corrections.',
    allocation: {
      stock: 45,
      bond: 30,
      fund: 20,
      crypto: 2,
      other: 3
    },
    tips: 'Ideal for balanced, long-term capital compounding with mild quarterly drawdowns.'
  },
  {
    id: 'aggressive',
    name: 'Aggressive Disruptive Sector Tech',
    description: 'A growth-heavy alignment investing heavily in technology, individual equities, emerging venture markets, and moderate cryptocurrency.',
    allocation: {
      stock: 65,
      bond: 5,
      fund: 15,
      crypto: 12,
      other: 3
    },
    tips: 'Best for long-horizon accumulators who are comfortable with elevated asset class fluctuations.'
  },
  {
    id: 'crypto-web3',
    name: 'Hyper-Growth Crypto Web3 Native',
    description: 'High alpha portfolio allocated mostly to volatile decentralized blockchain protocols and high-velocity digital sovereign tokens.',
    allocation: {
      stock: 10,
      bond: 0,
      fund: 5,
      crypto: 80,
      other: 5
    },
    tips: 'Extremely volatile spec framework. Demands significant active oversight and immediate cold-vault safety.'
  }
];

export default function PortfolioSimilarityView({ investments, currencySymbol }: PortfolioSimilarityProps) {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('moderate');
  const [whatsIfSymOpen, setWhatsIfSymOpen] = useState(false);
  
  // Custom What-If simulation inputs
  const [simStock, setSimStock] = useState<number>(0);
  const [simBond, setSimBond] = useState<number>(0);
  const [simFund, setSimFund] = useState<number>(0);
  const [simCrypto, setSimCrypto] = useState<number>(0);
  const [simOther, setSimOther] = useState<number>(0);

  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. Calculate active user portfolio allocation
  const userPortfolioAnalysis = useMemo(() => {
    // If user has zero investments, simulate a logical starting portfolio to let them test immediately!
    const activeInvs = investments && investments.length > 0 ? investments : [
      { id: 'inv-1', type: 'stock', symbol: 'AAPL', name: 'Apple Inc.', quantity: 12, buyPrice: 170, currentPrice: 195 },
      { id: 'inv-2', type: 'stock', symbol: 'MSFT', name: 'Microsoft Corp', quantity: 8, buyPrice: 380, currentPrice: 420 },
      { id: 'inv-3', type: 'fund', symbol: 'VOO', name: 'Vanguard S&P 500 ETF', quantity: 15, buyPrice: 410, currentPrice: 480 },
      { id: 'inv-4', type: 'crypto', symbol: 'ETH', name: 'Ethereum Coin', quantity: 2.5, buyPrice: 2200, currentPrice: 3500 },
      { id: 'inv-5', type: 'bond', symbol: 'BOND', name: 'Standard US Treasuries', quantity: 10, buyPrice: 98, currentPrice: 100 }
    ] as Investment[];

    const composition = {
      stock: 0,
      bond: 0,
      fund: 0,
      crypto: 0,
      other: 0
    };

    let totalValuation = 0;

    activeInvs.forEach(inv => {
      const price = inv.currentPrice || inv.buyPrice || 0;
      const val = price * (inv.quantity || 0);
      const category = (inv.type || 'other').toLowerCase() as keyof typeof composition;
      if (category in composition) {
        composition[category] += val;
      } else {
        composition.other += val;
      }
      totalValuation += val;
    });

    return {
      composition,
      totalValuation,
      isDummy: investments.length === 0
    };
  }, [investments]);

  // Combined totals (Actual + Simulated "What-if" mock additions)
  const combinedAnalysis = useMemo(() => {
    const orig = userPortfolioAnalysis.composition;
    const simTotalVal = userPortfolioAnalysis.totalValuation + simStock + simBond + simFund + simCrypto + simOther;

    const actualComp = {
      stock: userPortfolioAnalysis.totalValuation > 0 ? Math.round((orig.stock / userPortfolioAnalysis.totalValuation) * 100) : 0,
      bond: userPortfolioAnalysis.totalValuation > 0 ? Math.round((orig.bond / userPortfolioAnalysis.totalValuation) * 100) : 0,
      fund: userPortfolioAnalysis.totalValuation > 0 ? Math.round((orig.fund / userPortfolioAnalysis.totalValuation) * 100) : 0,
      crypto: userPortfolioAnalysis.totalValuation > 0 ? Math.round((orig.crypto / userPortfolioAnalysis.totalValuation) * 100) : 0,
      other: userPortfolioAnalysis.totalValuation > 0 ? Math.round((orig.other / userPortfolioAnalysis.totalValuation) * 100) : 0,
    };

    const compVals = {
      stock: orig.stock + simStock,
      bond: orig.bond + simBond,
      fund: orig.fund + simFund,
      crypto: orig.crypto + simCrypto,
      other: orig.other + simOther
    };

    const compPercentages = {
      stock: simTotalVal > 0 ? Math.round((compVals.stock / simTotalVal) * 100) : 0,
      bond: simTotalVal > 0 ? Math.round((compVals.bond / simTotalVal) * 100) : 0,
      fund: simTotalVal > 0 ? Math.round((compVals.fund / simTotalVal) * 100) : 0,
      crypto: simTotalVal > 0 ? Math.round((compVals.crypto / simTotalVal) * 100) : 0,
      other: simTotalVal > 0 ? Math.round((compVals.other / simTotalVal) * 100) : 0
    };

    return {
      amounts: compVals,
      percentages: compPercentages,
      actualPercentages: actualComp,
      totalValuation: simTotalVal
    };
  }, [userPortfolioAnalysis, simStock, simBond, simFund, simCrypto, simOther]);

  // Selected benchmark details
  const activeBenchmark = useMemo(() => {
    return BENCHMARKS.find(b => b.id === selectedBenchmarkId) || BENCHMARKS[1];
  }, [selectedBenchmarkId]);

  // 2. Compute correlation similarity (Cosine distance similarity or simple absolute matching)
  const correlationIndex = useMemo(() => {
    const user = combinedAnalysis.percentages;
    const bmark = activeBenchmark.allocation;

    // Vector lists
    const A = [user.stock, user.bond, user.fund, user.crypto, user.other];
    const B = [bmark.stock, bmark.bond, bmark.fund, bmark.crypto, bmark.other];

    // Mathematical Dot Product
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < A.length; i++) {
      dotProduct += A[i] * B[i];
      normA += A[i] * A[i];
      normB += B[i] * B[i];
    }

    if (normA === 0 || normB === 0) return 0;
    
    // Similarity = dotProduct / (sqrt(normA) * sqrt(normB))
    const cosineSim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.round(cosineSim * 100);
  }, [combinedAnalysis, activeBenchmark]);

  // Recharts compiled comparison layout datasets
  const allocationComparisonData = useMemo(() => {
    const user = combinedAnalysis.percentages;
    const target = activeBenchmark.allocation;

    return [
      { subject: 'Individual Equities (Stock)', user: user.stock, target: target.stock, fullMark: 100 },
      { subject: 'Debt Securities (Bond)', user: user.bond, target: target.bond, fullMark: 100 },
      { subject: 'ETFs & Mutuals (Fund)', user: user.fund, target: target.fund, fullMark: 100 },
      { subject: 'Sovereign Digital (Crypto)', user: user.crypto, target: target.crypto, fullMark: 100 },
      { subject: 'Miscellaneous (Other)', user: user.other, target: target.other, fullMark: 100 },
    ];
  }, [combinedAnalysis, activeBenchmark]);

  const handleResetSimulation = () => {
    setSimStock(0);
    setSimBond(0);
    setSimFund(0);
    setSimCrypto(0);
    setSimOther(0);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Immersive Header Banner */}
      <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-6 opacity-10 blur-sm">
          <Sparkles className="h-64 w-64 text-white" />
        </div>
        
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="bg-indigo-500/10 text-indigo-300 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest border border-indigo-500/20">
            Portfolio Diversification Correlation Matrix
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">Portfolio Correlation Profiler</h2>
          <p className="text-xs text-slate-350 leading-relaxed font-normal">
            Analyze similarities between your current asset configuration and recognized benchmark index distributions. Use the dynamic "What-If" simulation workspace to mock hypothetical trades and optimize similarity matching scores.
          </p>
        </div>
      </div>

      {userPortfolioAnalysis.isDummy && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-950 flex items-start gap-3 shadow-inner">
          <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">No custom investments registry records detected.</p>
            <p className="text-slate-650 leading-relaxed font-normal">
              To give you a seamless sandbox experience right out of the box, we have preloaded a demo active portfolio index with diversified stock, bond, crypto, and fund allocations. Go to the primary <strong>Investments</strong> tab to register your personal assets!
            </p>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Selector & Details */}
        <div className="lg:col-span-1 space-y-5">
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-indigo-600" />
              Benchmark Allocations Templates
            </h3>
            
            <p className="text-xs text-slate-500">Pick a primary index framework to compute matching similarity parameters against:</p>
            
            <div className="space-y-2.5">
              {BENCHMARKS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBenchmarkId(b.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all duration-200 ${
                    selectedBenchmarkId === b.id
                      ? 'border-[#2563eb] bg-blue-50/30'
                      : 'border-slate-150 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{b.name}</span>
                    {selectedBenchmarkId === b.id && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1 lines-clamp-2 leading-relaxed font-semibold">
                    {b.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Tips Box */}
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">Optimization Guidance</h4>
            </div>
            <p className="text-xs text-indigo-950/80 leading-relaxed font-semibold">
              {activeBenchmark.tips}
            </p>
          </div>
        </div>

        {/* Right Column: Visualization & What-If Sandbox */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-150 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Similarity Match Percent</span>
                <p className="text-xs text-slate-400">Relative allocation overlap ratio</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold tracking-tight ${
                  correlationIndex >= 85 ? 'text-emerald-600' : correlationIndex >= 60 ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {correlationIndex}%
                </span>
                <span className="text-xs text-slate-500 font-bold">Similar</span>
              </div>
            </div>

            {/* Allocation overlap radar chart */}
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={allocationComparisonData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Radar 
                      name="Your Portfolio" 
                      dataKey="user" 
                      stroke="#4f46e5" 
                      fill="#4f46e5" 
                      fillOpacity={0.25} 
                    />
                    <Radar 
                      name="Benchmark" 
                      dataKey="target" 
                      stroke="#94a3b8" 
                      fill="#94a3b8" 
                      fillOpacity={0.1} 
                    />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar List Comparative breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">Specific Category Overlaps</h4>
                {allocationComparisonData.map((row) => (
                  <div key={row.subject} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 truncate max-w-[150px]">{row.subject.split('(')[0]}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
                        <span className="text-indigo-600">You: {row.user}%</span>
                        <span className="text-slate-400">vs</span>
                        <span className="text-slate-500">Target: {row.target}%</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-indigo-600" 
                        style={{ width: `${row.user}%` }}
                      />
                      <div 
                        className="absolute top-0 right-0 h-full w-0.5 bg-red-400"
                        style={{ left: `${row.target}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What-If Sandbox Workspace Section */}
          <div className="rounded-xl border border-slate-150 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 animate-pulse">
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-4.5 w-4.5 text-blue-600" />
                  What-If Virtual Sandbox Workspace
                </h3>
                <p className="text-xs text-slate-400">Inject hypothetical asset investments to see how they impact your index similarity</p>
              </div>
              <button
                onClick={() => setWhatsIfSymOpen(!whatsIfSymOpen)}
                className="rounded-lg bg-slate-100 font-bold px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                {whatsIfSymOpen ? 'Close Sandbox' : 'Expand Sandbox'}
              </button>
            </div>

            {whatsIfSymOpen && (
              <div className="pt-3 border-t border-slate-100 space-y-4 animate-slide-in">
                <div className="grid gap-3 sm:grid-cols-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Add Stocks ({currencySymbol})</label>
                    <input
                      type="number"
                      step="100"
                      value={simStock}
                      onChange={(e) => setSimStock(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Add Bonds ({currencySymbol})</label>
                    <input
                      type="number"
                      step="100"
                      value={simBond}
                      onChange={(e) => setSimBond(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Add Funds ({currencySymbol})</label>
                    <input
                      type="number"
                      step="100"
                      value={simFund}
                      onChange={(e) => setSimFund(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Add Crypto ({currencySymbol})</label>
                    <input
                      type="number"
                      step="100"
                      value={simCrypto}
                      onChange={(e) => setSimCrypto(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Other Assets ({currencySymbol})</label>
                    <input
                      type="number"
                      step="100"
                      value={simOther}
                      onChange={(e) => setSimOther(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-550">
                    Total Sandbox Valuation: <strong className="text-slate-900 font-bold">{currencySymbol}{fmt(combinedAnalysis.totalValuation)}</strong>
                  </span>
                  <button
                    onClick={handleResetSimulation}
                    className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset Simulation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
