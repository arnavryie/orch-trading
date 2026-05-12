import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function MorningBriefView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.market.getMorningBrief().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted animate-pulse font-mono">Compiling morning brief...</div>;
  if (!data) return <div className="p-8 text-center text-bearish">Failed to load morning brief</div>;

  const nifty = data.nifty?.nifty || {};
  const isUp = nifty.change_pct >= 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Morning Brief</h1>
        <p className="text-text-muted text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* AI Brief */}
      {data.ai_brief && (
        <div className="bg-brand/10 border border-brand/30 rounded-xl p-5">
          <p className="text-sm text-text-primary leading-relaxed font-mono">{data.ai_brief}</p>
        </div>
      )}

      {/* NIFTY Hero Card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-bg-card border border-border-subtle rounded-xl p-6 space-y-1">
          <p className="text-xs text-text-muted uppercase tracking-widest">NIFTY 50</p>
          <p className="text-4xl font-bold font-mono text-white">{nifty.price?.toLocaleString('en-IN')}</p>
          <p className={`text-lg font-semibold font-mono ${isUp ? 'text-bullish' : 'text-bearish'}`}>
            {isUp ? '+' : ''}{nifty.change?.toFixed(2)} ({isUp ? '+' : ''}{nifty.change_pct?.toFixed(2)}%)
          </p>
          {!data.nifty?.market_open && <p className="text-xs text-neutral mt-1">⏸ Market Closed — Last known price</p>}
        </div>
        <div className="bg-bg-card border border-border-subtle rounded-xl p-6 flex flex-col justify-center space-y-2">
          <p className="text-xs text-text-muted uppercase tracking-widest">India VIX</p>
          <p className={`text-3xl font-bold font-mono ${data.nifty?.vix > 20 ? 'text-bearish' : 'text-bullish'}`}>
            {data.nifty?.vix?.toFixed(1)}
          </p>
          <p className="text-xs text-text-muted">{data.nifty?.vix > 20 ? '⚠ Elevated fear' : '✓ Calm market'}</p>
        </div>
      </div>

      {/* Gainers / Losers */}
      <div className="grid grid-cols-2 gap-4">
        {[{ title: 'Top Gainers', items: data.top_gainers, color: 'text-bullish', border: 'border-bullish/30' },
          { title: 'Top Losers', items: data.top_losers, color: 'text-bearish', border: 'border-bearish/30' }].map(({ title, items, color, border }) => (
          <div key={title} className={`bg-bg-card border ${border} rounded-xl overflow-hidden`}>
            <div className="px-4 py-3 border-b border-border-subtle">
              <p className={`text-xs font-bold uppercase tracking-widest ${color}`}>{title}</p>
            </div>
            <div className="divide-y divide-border-subtle">
              {(items || []).map((item: any) => (
                <div key={item.symbol} className="flex justify-between px-4 py-2 text-sm font-mono">
                  <span className="text-white font-bold">{item.symbol}</span>
                  <span className={color}>{item.change_pct >= 0 ? '+' : ''}{item.change_pct?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sectors */}
      {data.sectors?.length > 0 && (
        <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Sector Performance</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {data.sectors.map((s: any) => (
              <div key={s.sector} className="flex justify-between items-center px-4 py-2 text-sm">
                <span className="text-text-primary font-medium">{s.sector}</span>
                <span className={`font-mono font-semibold ${s.change_pct >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
