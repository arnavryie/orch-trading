import { useState, useEffect } from 'react';
import { api } from '../api/client';

function DataRow({ label, value, color = '' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border-subtle/50 last:border-0">
      <span className="text-text-muted text-xs uppercase tracking-wider">{label}</span>
      <span className={`font-mono font-semibold text-sm ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function ScanView() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.market.getScan().then(d => setResults(d.results || [])).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? results : results.filter(r => r.signal === filter);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white">Market Scanner</h1>
          <p className="text-text-muted text-sm">RSI, MACD & trend signals across NIFTY 50</p>
        </div>
        <div className="flex gap-2">
          {['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${filter === f ? 'bg-brand/20 text-brand border border-brand/40' : 'text-text-muted border border-border-subtle hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse font-mono">Running scanner on NIFTY 50...</div>
      ) : (
        <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Symbol</th>
                <th className="px-5 py-4 text-right">LTP</th>
                <th className="px-5 py-4 text-right">RSI</th>
                <th className="px-5 py-4 text-right">MACD</th>
                <th className="px-5 py-4 text-center">Trend</th>
                <th className="px-5 py-4 text-center">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono">
              {filtered.map((r) => (
                <tr key={r.symbol} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-5 py-3 font-bold text-white">{r.symbol}</td>
                  <td className="px-5 py-3 text-right">₹{r.ltp?.toLocaleString('en-IN')}</td>
                  <td className={`px-5 py-3 text-right font-bold ${r.rsi < 35 ? 'text-bullish' : r.rsi > 65 ? 'text-bearish' : 'text-neutral'}`}>{r.rsi}</td>
                  <td className={`px-5 py-3 text-right ${r.macd > r.macd_signal ? 'text-bullish' : 'text-bearish'}`}>{r.macd?.toFixed(2)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-bold ${r.trend === 'UP' ? 'text-bullish' : 'text-bearish'}`}>{r.trend === 'UP' ? '▲ UP' : '▼ DOWN'}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.signal === 'BULLISH' ? 'bg-bullish/20 text-bullish' : r.signal === 'BEARISH' ? 'bg-bearish/20 text-bearish' : 'bg-neutral/20 text-neutral'}`}>
                      {r.signal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
