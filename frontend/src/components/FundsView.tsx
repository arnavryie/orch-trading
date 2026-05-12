import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function FundsView() {
  const [funds, setFunds] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchFunds = () => {
    setLoading(true);
    api.broker.getFunds()
      .then(data => setFunds(data))
      .catch(err => {
        console.error("Failed to load funds:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFunds();
    window.addEventListener('funds-refresh', fetchFunds);
    return () => window.removeEventListener('funds-refresh', fetchFunds);
  }, []);

  if (loading) return <div className="p-8 text-center font-mono animate-pulse text-text-muted">Synchronizing capital state...</div>;
  if (error || !funds) return <div className="p-8 text-center font-mono text-bearish">Failed to retrieve capital state. Please check backend connection.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">Capital Metrics</h1>
        <p className="text-text-muted text-sm">Margin liquidity and account balances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-border-subtle p-6 rounded-xl shadow-lg flex flex-col space-y-2">
          <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Total Margin</span>
          <span className="text-3xl font-bold font-mono text-white">₹{funds.total_balance?.toLocaleString()}</span>
        </div>
        <div className="bg-bg-card border border-bullish/20 p-6 rounded-xl shadow-lg flex flex-col space-y-2">
          <span className="text-xs text-bullish font-semibold uppercase tracking-wider">Available Cash</span>
          <span className="text-3xl font-bold font-mono text-white">₹{funds.available_cash?.toLocaleString()}</span>
        </div>
        <div className="bg-bg-card border border-border-subtle p-6 rounded-xl shadow-lg flex flex-col space-y-2">
          <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Used Margin</span>
          <span className="text-3xl font-bold font-mono text-text-muted">₹{funds.used_margin?.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-border-subtle rounded-lg p-4 font-mono text-xs text-text-muted">
        Note: Leverage calculations verified at broker terminal level. Currency set to INR.
      </div>
    </div>
  );
}
