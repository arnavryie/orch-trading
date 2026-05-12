import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function PositionsView() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.broker.getPositions().then(data => setPositions(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Intraday Positions</h1>
        <p className="text-text-muted text-sm">MIS positions with live M2M P&L</p>
      </div>
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4 text-right">Qty</th>
              <th className="px-6 py-4 text-right">Buy Avg</th>
              <th className="px-6 py-4 text-right">LTP</th>
              <th className="px-6 py-4 text-right">M2M P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-text-muted animate-pulse">Fetching positions...</td></tr>
            ) : positions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-text-muted">No intraday positions today.</div>
                  <div className="text-xs text-text-muted/50 mt-1">Demo mode uses CNC (delivery) orders only.</div>
                </td>
              </tr>
            ) : positions.map((p, i) => (
              <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                <td className="px-6 py-4 font-bold text-white">{p.symbol}</td>
                <td className="px-6 py-4 text-right">{p.quantity}</td>
                <td className="px-6 py-4 text-right">₹{p.avg_price?.toFixed(2)}</td>
                <td className="px-6 py-4 text-right text-brand">₹{p.last_price?.toFixed(2)}</td>
                <td className={`px-6 py-4 text-right font-semibold ${p.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {p.pnl >= 0 ? '+' : ''}₹{p.pnl?.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
