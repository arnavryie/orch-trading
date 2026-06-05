// frontend/src/components/MarketOverview.tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const INDICES  = ['NIFTY', 'SENSEX', 'BANKNIFTY'];
const STOCKS   = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'WIPRO', 'BHARTIARTL'];

type Q = { symbol: string; price: number; change: number; change_pct: number; high: number; low: number; market_open: boolean };

function Card({ q }: { q: Q }) {
  const up = q.change_pct >= 0;
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg border ${
      up ? 'border-[#22c55e]/10 bg-[#22c55e]/5' : 'border-[#ef4444]/10 bg-[#ef4444]/5'
    }`}>
      <div>
        <div className="text-white font-semibold text-sm">{q.symbol}</div>
        <div className="text-[#555] text-[11px]">H {q.high?.toLocaleString('en-IN')} · L {q.low?.toLocaleString('en-IN')}</div>
      </div>
      <div className="text-right">
        <div className="text-white font-bold text-sm">₹{q.price?.toLocaleString('en-IN')}</div>
        <div className={`text-[11px] font-medium ${up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {up ? '▲' : '▼'} {Math.abs(q.change_pct ?? 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function MarketOverview() {
  const [tab,     setTab]     = useState<'indices' | 'stocks'>('indices');
  const [quotes,  setQuotes]  = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (syms: string[]) => {
    setLoading(true);
    const res = await Promise.all(syms.map(s => api.market.getQuote(s).catch(() => ({ symbol: s, price: 0, change: 0, change_pct: 0, high: 0, low: 0, market_open: false }))));
    setQuotes(res as Q[]);
    setLoading(false);
  };

  useEffect(() => {
    const syms = tab === 'indices' ? INDICES : STOCKS;
    load(syms);
    const iv = setInterval(() => load(syms), 30_000);
    return () => clearInterval(iv);
  }, [tab]);

  return (
    <div className="bg-[#0a0a0a] rounded-lg border border-[#1e1e1e] p-4">
      <div className="flex gap-2 mb-4">
        {(['indices', 'stocks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-3 py-1 rounded border transition-colors capitalize ${
              tab === t ? 'bg-primary/10 text-primary border-primary/30' : 'text-[#666] border-[#2a2a2a] hover:text-white'
            }`}>
            {t === 'indices' ? 'Indices' : 'Top Stocks'}
          </button>
        ))}
      </div>
      {loading
        ? <div className="text-[#555] text-sm text-center py-6">Loading market data…</div>
        : <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quotes.map(q => <Card key={q.symbol} q={q} />)}
          </div>
      }
    </div>
  );
}
