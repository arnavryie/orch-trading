import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function PatternsView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.market.getPatterns().then(d => setData(d.patterns || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Technical Patterns</h1>
        <p className="text-text-muted text-sm">Automated chart pattern recognition (NIFTY 50)</p>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4">Pattern</th>
              <th className="px-6 py-4 text-right">LTP</th>
              <th className="px-6 py-4 text-center">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-text-muted animate-pulse">Scanning charts...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-text-muted">No clear patterns identified today.</td></tr>
            ) : data.map((p, i) => (
              <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                <td className="px-6 py-4 font-bold text-white">{p.symbol}</td>
                <td className="px-6 py-4 text-brand">{p.pattern}</td>
                <td className="px-6 py-4 text-right">₹{p.ltp?.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.signal === 'BULLISH' ? 'bg-bullish/20 text-bullish' : p.signal === 'BEARISH' ? 'bg-bearish/20 text-bearish' : 'bg-neutral/20 text-neutral'}`}>
                    {p.signal}
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
