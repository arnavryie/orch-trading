import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function DeltaHedgeView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.risk.getDeltaHedge().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Calculating Portfolio Delta...</div>;
  if (!data) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Delta Hedging</h1>
        <p className="text-text-muted text-sm">Portfolio Beta/Delta neutrality against NIFTY</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border-subtle rounded-xl p-6 flex flex-col justify-center">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Net Portfolio Delta</p>
          <p className={`text-4xl font-bold font-mono ${data.net_delta > 0 ? 'text-bullish' : data.net_delta < 0 ? 'text-bearish' : 'text-neutral'}`}>
            {data.net_delta > 0 ? '+' : ''}{data.net_delta}
          </p>
        </div>
        
        <div className="bg-bg-card border border-brand/50 rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-brand pointer-events-none">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <p className="text-xs text-brand uppercase tracking-wider mb-2 font-bold">Hedge Suggestion</p>
          <p className="text-xl font-bold text-white leading-relaxed">{data.hedge_suggestion}</p>
          <p className="text-xs text-text-muted mt-2">Based on NIFTY Spot @ ₹{data.nifty_ltp?.toLocaleString('en-IN')} and 50 qty lot size</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl mt-6">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Component Delta</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Symbol</th>
              <th className="px-5 py-3 text-right">Quantity</th>
              <th className="px-5 py-3 text-right">Beta/Delta Exposure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {data.positions?.map((p: any) => (
              <tr key={p.symbol} className="hover:bg-white/[0.01]">
                <td className="px-5 py-3 font-bold text-white">{p.symbol}</td>
                <td className="px-5 py-3 text-right text-text-muted">{p.qty}</td>
                <td className={`px-5 py-3 text-right font-bold ${p.delta > 0 ? 'text-bullish' : p.delta < 0 ? 'text-bearish' : 'text-neutral'}`}>
                  {p.delta > 0 ? '+' : ''}{p.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
