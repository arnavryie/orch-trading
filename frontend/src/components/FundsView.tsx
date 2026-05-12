import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function FundsView() {
  const [funds, setFunds] = useState<any>(null);

  useEffect(() => {
    api.broker.getFunds().then(setFunds);
  }, []);

  if (!funds) return <div className="p-8 text-center font-mono animate-pulse text-text-muted">Synchronizing capital state...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">Capital Metrics</h1>
        <p className="text-text-muted text-sm">Margin liquidity and account balances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-border-subtle p-6 rounded-xl shadow-lg flex flex-col space-y-2">
          <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Margin</span>
          <span className="text-3xl font-bold font-mono text-white">₹{funds.total?.toLocaleString()}</span>
        </div>
        <div className="bg-bg-card border border-bullish/20 p-6 rounded-xl shadow-lg flex flex-col space-y-2">
          <span className="text-xs text-bullish font-semibold uppercase tracking-wider">Available Cash</span>
          <span className="text-3xl font-bold font-mono text-white">₹{funds.available?.toLocaleString()}</span>
        </div>
        <div className="bg-bg-card border border-border-subtle p-6 rounded-xl shadow-lg flex flex-col space-y-2">
          <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Used Margin</span>
          <span className="text-3xl font-bold font-mono text-text-muted">₹{funds.used?.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-border-subtle rounded-lg p-4 font-mono text-xs text-text-muted">
        Note: Leverage calculations verified at broker terminal level. Currency set to INR.
      </div>
    </div>
  );
}
