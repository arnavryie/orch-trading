import { useState, useEffect } from 'react';
import { api } from '../api/client';
import FlashPrice from './FlashPrice';
import { SkeletonList } from './Skeleton';

export default function ScanView() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.market.getScan().then(d => setResults(d.results || [])).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? results : results.filter(r => r.signal === filter);

  if (loading) return <div className="p-8 max-w-5xl mx-auto"><SkeletonList rows={8} /></div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold font-mono text-white">Market Scanner</h1>
            <p className="text-[#888] text-sm">RSI, MACD & trend signals across NIFTY 50</p>
          </div>
          <div className="flex gap-2">
            {['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-smooth btn-press ${filter === f ? 'bg-kite-blue/20 text-kite-blue border border-kite-blue/40' : 'text-[#888] border border-[#333] hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#141414] border-b border-[#1e1e1e] text-xs font-semibold text-[#888] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Symbol</th>
                <th className="px-5 py-4 text-right">LTP</th>
                <th className="px-5 py-4 text-right">RSI</th>
                <th className="px-5 py-4 text-right">MACD</th>
                <th className="px-5 py-4 text-center">Trend</th>
                <th className="px-5 py-4 text-center">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e] font-mono">
              {filtered.map((r) => (
                <tr key={r.symbol} className="row-hover transition-colors">
                  <td className="px-5 py-3 font-bold text-white">{r.symbol}</td>
                  <td className="px-5 py-3 text-right"><FlashPrice value={r.ltp} /></td>
                  <td className={`px-5 py-3 text-right font-bold ${r.rsi < 35 ? 'text-[#40e56c]' : r.rsi > 65 ? 'text-[#ffb4ab]' : 'text-[#f59e0b]'}`}>{r.rsi}</td>
                  <td className={`px-5 py-3 text-right ${r.macd > r.macd_signal ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{r.macd?.toFixed(2)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-bold ${r.trend === 'UP' ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{r.trend === 'UP' ? '▲ UP' : '▼ DOWN'}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.signal === 'BULLISH' ? 'bg-[#40e56c]/20 text-[#40e56c]' : r.signal === 'BEARISH' ? 'bg-[#ffb4ab]/20 text-[#ffb4ab]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                      {r.signal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
