import React, { useEffect, useState } from 'react';
import { 
  Brain, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Compass, 
  Heart, 
  Flame, 
  Zap, 
  TrendingUp, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { FinancialInsight } from '../types';

interface AiInsight {
  healthScore: number;
  analysis: string;
  recommendations: Array<{ category: string; suggestion: string }>;
  unusualActivities: Array<{ date: string; merchant: string; amount: number; warning: string }>;
  predictions: Array<{ period: string; category: string; expectedAmount: number; reason: string }>;
  isAiFallback?: boolean;
  aiError?: string;
}

interface AIAdvisorViewProps {
  currencySymbol: string;
}

export default function AIAdvisorView({ currencySymbol }: AIAdvisorViewProps) {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/ai/insights', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to retrieve intelligence data');
      const data = await res.json();
      setInsight(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Unable to load financial diagnostics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-200 bg-emerald-50';
    if (score >= 50) return 'text-amber-500 border-amber-200 bg-amber-50';
    return 'text-rose-500 border-rose-250 bg-rose-50';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Upper header action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-teal-400">
            <Brain className="h-6 w-6 stroke-[1.8] animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-1.5">
              <span>Smart AI Financial Advisor</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            </h2>
            <p className="text-sm text-slate-500">Autonomous wealth recommendations powered by Gemini 3.5 Flash</p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-md shadow-slate-900/10 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Synthesizing...' : 'Re-Evaluate Wealth'}</span>
        </button>
      </div>

      {insight && insight.isAiFallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-slate-800 shadow-sm animate-fade-in flex items-start gap-3.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-900 tracking-wider uppercase">
              {insight.aiError === 'leaked' 
                ? 'Gemini API Key Disabled (Leaked credential alert)' 
                : insight.aiError === 'invalid'
                ? 'Gemini API Key Unauthorized (Authentication issue)'
                : 'Deterministic Heuristics Engine Fallback Active'}
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed font-normal">
              {insight.aiError === 'leaked' ? (
                <span>
                  The environment's <code>GEMINI_API_KEY</code> has been disabled for safety reasons due to a potential credentials leak validation trigger in the system workspace. To restore advanced AI intelligence models, generate a fresh API key and register it inside your environment workspace variables. We have successfully engaged our multi-layer fallback algorithm so you don't lose any functionality.
                </span>
              ) : insight.aiError === 'invalid' ? (
                <span>
                  The Gemini API server returned an authentication / authorization exception. We have fallback enabled. Please ensure your custom <code>GEMINI_API_KEY</code> is correctly configured in your application settings environment.
                </span>
              ) : (
                <span>
                  No active <code>GEMINI_API_KEY</code> detected in system environment. We have deployed our native heuristic classification rulesets to generate spending health insights and monthly trends forecast predictions dynamically.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-teal-100/40 animate-ping" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-teal-400">
              <Brain className="h-7 w-7 animate-spin" />
            </div>
          </div>
          <h3 className="mt-5 text-sm font-bold text-slate-950 font-sans">Compiling Financial Diagnostic Records...</h3>
          <p className="mt-2 text-xs text-slate-400 max-w-sm leading-relaxed">
            Gemini is evaluating your transaction trends, checking category threshold variances, and running anomalous high ticket detection protocols.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-6 text-center space-y-4 shadow-inner">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-950">Fiduciary Evaluation Halted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <button 
            onClick={fetchInsights}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800 font-semibold"
          >
            Retry analysis
          </button>
        </div>
      ) : insight ? (
        <div className="space-y-8 animate-fade-in">
          
          {/* Main Score bento grid panel */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Health Score Circular display */}
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financial Health Score</h3>
              
              <div className="relative my-6 flex h-40 w-40 items-center justify-center">
                {/* SVG circular track background */}
                <svg className="absolute transform -rotate-90" width="100%" height="100%" viewBox="0 0 100 100">
                  <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle 
                    className="text-teal-500 transition-all duration-1000 ease-out" 
                    strokeWidth="8" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * insight.healthScore) / 100}
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                </svg>
                <div className="text-center">
                  <span className="text-4xl font-black text-slate-950 font-mono tracking-tighter">
                    {insight.healthScore}
                  </span>
                  <span className="block text-[10px] uppercase font-black text-slate-400 mt-0.5 tracking-wider">Scale Out of 100</span>
                </div>
              </div>

              <div className={`rounded-full px-3.5 py-1 text-xs font-bold border ${getScoreColor(insight.healthScore)} uppercase tracking-wider`}>
                {insight.healthScore >= 85 ? 'Excellent Class A' : insight.healthScore >= 65 ? 'Moderate Risk Class B' : 'High Leakage Class C'}
              </div>
            </div>

            {/* AI Text Diagnostic analysis */}
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm md:col-span-2 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-50 p-1 text-teal-600">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider uppercase">Fiduciary Intelligence Assessment</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {insight.analysis}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-450">
                <span>Evaluated on active transactional ledger variables.</span>
                <span className="font-semibold text-teal-600 flex items-center gap-0.5">
                  <CheckCircle className="h-3 w-3" /> Fiduciary Qualified
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Custom AI Action items Recommendations */}
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Compass className="h-5 w-5 text-teal-600" />
                <h3 className="text-md font-bold text-slate-950">Algorithmic Recommendations</h3>
              </div>
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                {insight.recommendations.map((rec, index) => (
                  <div key={index} className="flex gap-3 items-start bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center bg-teal-100 text-teal-800 rounded-full font-bold text-[10px] shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{rec.category} Optimization</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-normal">{rec.suggestion}</p>
                    </div>
                  </div>
                ))}
                {insight.recommendations.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">No outstanding suggestions triggered. Your balance sheets show high health!</p>
                )}
              </div>
            </div>

            {/* Predictions & Unusual high bills Auditor and Scanner */}
            <div className="space-y-6">
              {/* Anomalous outlays checks */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-505 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
                  <span>Unusual high transaction Auditor</span>
                </h3>

                <div className="space-y-2">
                  {insight.unusualActivities.map((act, index) => (
                    <div key={index} className="flex items-center justify-between bg-rose-50/50 border border-rose-100 p-3 rounded-lg text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{act.merchant}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Triggered: {act.date}</div>
                        <div className="text-[10px] text-rose-700 font-medium mt-1">{act.warning}</div>
                      </div>
                      <span className="font-mono font-bold text-rose-600 text-sm">
                        {currencySymbol}{act.amount}
                      </span>
                    </div>
                  ))}
                  {insight.unusualActivities.length === 0 && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs text-emerald-800 font-medium">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Security audit passed! No unusual transactions identified.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistical predictions for next cycle */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  <span>Next month forecast trends</span>
                </h3>

                <div className="space-y-2.5 max-h-[150px] overflow-y-auto">
                  {insight.predictions.map((pred, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-xs rounded border border-slate-100 p-2.5 bg-slate-50/40">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{pred.category} Projection</span>
                          <span className="font-mono text-teal-600">{currencySymbol}{pred.expectedAmount} / mo</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">{pred.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white p-12 text-center text-slate-400">
          Click 'Re-Evaluate Wealth' to initialize Gemini Artificial Intelligence wealth advisor audits.
        </div>
      )}
    </div>
  );
}
