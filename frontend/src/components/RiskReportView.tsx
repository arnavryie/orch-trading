import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function RiskReportView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.risk.getReport().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Generating risk report...</div>;
  if (!data) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Risk Report</h1>
        <p className="text-text-muted text-sm">Portfolio Value at Risk (VaR) and exposure metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: `₹${data.total_value?.toLocaleString('en-IN')}`, color: 'text-white' },
          { label: '95% VaR', value: `₹${data.var_95?.toLocaleString('en-IN')}`, color: 'text-bearish' },
          { label: 'Max Drawdown', value: `${data.max_drawdown}%`, color: 'text-bearish' },
          { label: 'Concentration Risk', value: data.concentration_risk, color: data.concentration_risk === 'HIGH' ? 'text-bearish' : 'text-bullish' },
        ].map(m => (
          <div key={m.label} className="bg-bg-card border border-border-subtle rounded-xl p-4">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{m.label}</p>
            <p className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden mt-6 shadow-xl">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Position Weights</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Symbol</th>
              <th className="px-5 py-3 text-right">Weight</th>
              <th className="px-5 py-3 text-right">PnL Contribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {data.positions?.map((p: any) => (
              <tr key={p.symbol} className="hover:bg-white/[0.01]">
                <td className="px-5 py-3 font-bold text-white">{p.symbol}</td>
                <td className={`px-5 py-3 text-right ${p.weight > 20 ? 'text-brand font-bold' : 'text-text-muted'}`}>{p.weight}%</td>
                <td className={`px-5 py-3 text-right ${p.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>{p.pnl >= 0 ? '+' : ''}₹{p.pnl?.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
