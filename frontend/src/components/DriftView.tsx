import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function DriftView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.risk.getDrift().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Analyzing portfolio drift...</div>;
  if (!data) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white">Portfolio Drift</h1>
          <p className="text-text-muted text-sm">Target vs. Actual weight allocation</p>
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-lg px-4 py-2 text-sm font-mono">
          <span className="text-text-muted">Cash Buffer: </span>
          <span className="text-white font-bold">{data.cash_pct}%</span>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4 text-right">Target Weight</th>
              <th className="px-6 py-4 text-right">Actual Weight</th>
              <th className="px-6 py-4 text-right">Drift</th>
              <th className="px-6 py-4 text-center">Suggested Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {data.drift?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted">No holdings to analyze.</td></tr>
            ) : data.drift?.map((d: any, i: number) => (
              <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                <td className="px-6 py-4 font-bold text-white">{d.symbol}</td>
                <td className="px-6 py-4 text-right text-text-muted">{d.target_weight}%</td>
                <td className="px-6 py-4 text-right font-bold text-white">{d.actual_weight}%</td>
                <td className={`px-6 py-4 text-right font-bold ${Math.abs(d.drift) > 5 ? 'text-bearish' : 'text-neutral'}`}>
                  {d.drift > 0 ? '+' : ''}{d.drift}%
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    d.action === 'BUY' || d.action === 'INCREASE' ? 'bg-bullish/20 text-bullish' : 
                    d.action === 'SELL' || d.action === 'REDUCE' ? 'bg-bearish/20 text-bearish' : 
                    'bg-neutral/20 text-neutral'
                  }`}>
                    {d.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
