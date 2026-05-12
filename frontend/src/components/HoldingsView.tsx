import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function HoldingsView() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHoldings = () => {
    api.broker.getHoldings()
      .then(async (data) => {
        const withQuotes = await Promise.all(data.map(async (h: any) => {
          try {
            const q = await api.market.getQuote(h.symbol);
            return { ...h, quote: q };
          } catch {
            return h;
          }
        }));
        setHoldings(withQuotes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHoldings();
    window.addEventListener('holdings-refresh', fetchHoldings);
    return () => window.removeEventListener('holdings-refresh', fetchHoldings);
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">Portfolio Holdings</h1>
          <p className="text-text-muted text-sm">Active CNC and long-term investments</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Instrument</th>
              <th className="px-6 py-4 text-right">Qty</th>
              <th className="px-6 py-4 text-right">Avg Price</th>
              <th className="px-6 py-4 text-right">LTP & Change</th>
              <th className="px-6 py-4 text-right">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-muted animate-pulse">Fetching portfolio data...</td>
              </tr>
            ) : holdings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-muted">No holdings present.</td>
              </tr>
            ) : (
              holdings.map((h, idx) => (
                <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{h.symbol} <span className="text-text-muted text-xs font-normal">{h.exchange || 'NSE'}</span></td>
                  <td className="px-6 py-4 text-right">{h.quantity}</td>
                  <td className="px-6 py-4 text-right">₹{h.avg_price ? h.avg_price.toFixed(2) : 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-brand">₹{h.quote?.price ? h.quote.price.toFixed(2) : h.last_price?.toFixed(2)}</div>
                    {h.quote && h.quote.change !== undefined && (
                      <div className={`text-xs ${h.quote.change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {h.quote.change >= 0 ? '+' : ''}{h.quote.change.toFixed(2)} ({h.quote.change_pct.toFixed(2)}%)
                      </div>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold ${h.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {h.pnl >= 0 ? '+' : ''}{h.pnl?.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
