import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function WhatIfView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changePct, setChangePct] = useState(5.0);

  const loadScenario = (pct: number) => {
    setLoading(true);
    api.risk.getWhatIf('NIFTY', pct).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScenario(changePct);
  }, []);

  const handleScenarioChange = (pct: number) => {
    setChangePct(pct);
    loadScenario(pct);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">What-If Analysis</h1>
        <p className="text-text-muted text-sm">Simulate portfolio performance under different market scenarios</p>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-4">NIFTY Move Scenario</label>
        <div className="flex flex-wrap gap-3 mb-6">
          {[-10, -5, -2, 2, 5, 10].map(pct => (
            <button
              key={pct}
              onClick={() => handleScenarioChange(pct)}
              className={`px-4 py-2 rounded-lg font-mono font-bold text-sm transition-all ${
                changePct === pct 
                  ? (pct > 0 ? 'bg-bullish text-bg-app shadow-lg shadow-bullish/20' : 'bg-bearish text-white shadow-lg shadow-bearish/20')
                  : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white border border-border-subtle'
              }`}
            >
              {pct > 0 ? '+' : ''}{pct}%
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-muted animate-pulse font-mono">Running simulation...</div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="border border-border-subtle rounded-xl p-5 bg-white/[0.01]">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Current Value</p>
              <p className="text-2xl font-bold font-mono text-white">₹{data.current_portfolio_value?.toLocaleString('en-IN')}</p>
            </div>
            
            <div className={`border rounded-xl p-5 ${data.simulated_pnl >= 0 ? 'bg-bullish/5 border-bullish/30' : 'bg-bearish/5 border-bearish/30'}`}>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Simulated PnL</p>
              <p className={`text-2xl font-bold font-mono ${data.simulated_pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {data.simulated_pnl >= 0 ? '+' : ''}₹{data.simulated_pnl?.toLocaleString('en-IN')}
              </p>
              <p className={`text-xs font-bold mt-1 ${data.impact_pct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {data.impact_pct >= 0 ? '+' : ''}{data.impact_pct}% impact
              </p>
            </div>
            
            <div className="border border-brand/30 rounded-xl p-5 bg-brand/5">
              <p className="text-xs text-brand uppercase tracking-wider mb-2 font-bold">Projected Value</p>
              <p className="text-2xl font-bold font-mono text-white">₹{data.simulated_total?.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
