import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function FIIDIIView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.market.getFlows().then(setData).finally(() => setLoading(false));
  }, []);

  const flows: any[] = data?.flows || [];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">FII / DII Flows</h1>
        <p className="text-text-muted text-sm">Foreign & Domestic Institutional activity {data?.source === 'mock' ? '(demo data)' : '• NSE live'}</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted animate-pulse font-mono">Fetching flow data...</div>
      ) : (
        <>
          {/* Summary Cards */}
          {flows[0] && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'FII Net (Today)', value: flows[0].fii_net, prefix: '₹' },
                { label: 'DII Net (Today)', value: flows[0].dii_net, prefix: '₹' },
              ].map(({ label, value, prefix }) => (
                <div key={label} className={`bg-bg-card border ${value >= 0 ? 'border-bullish/30' : 'border-bearish/30'} rounded-xl p-5`}>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</p>
                  <p className={`text-2xl font-bold font-mono ${value >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {value >= 0 ? '+' : ''}{prefix}{Math.abs(value).toLocaleString('en-IN')} Cr
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">FII Buy</th>
                  <th className="px-5 py-4 text-right">FII Sell</th>
                  <th className="px-5 py-4 text-right">FII Net</th>
                  <th className="px-5 py-4 text-right">DII Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono text-sm">
                {flows.map((f, i) => (
                  <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-5 py-3 text-text-muted">{f.date}</td>
                    <td className="px-5 py-3 text-right text-bullish">{f.fii_buy?.toFixed(0)}</td>
                    <td className="px-5 py-3 text-right text-bearish">{f.fii_sell?.toFixed(0)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${f.fii_net >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {f.fii_net >= 0 ? '+' : ''}{f.fii_net?.toFixed(0)}
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${f.dii_net >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {f.dii_net >= 0 ? '+' : ''}{f.dii_net?.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
