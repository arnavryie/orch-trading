// frontend/src/components/MarketOverview.tsx — Kite-polished with FlashPrice + SkeletonList
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import FlashPrice from './FlashPrice';
import { SkeletonList } from './Skeleton';

const INDICES  = ['NIFTY', 'SENSEX', 'BANKNIFTY'];
const STOCKS   = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'WIPRO', 'BHARTIARTL'];

type Q = { symbol: string; price: number; change: number; change_pct: number; high: number; low: number; };

function Card({ q }: { q: Q }) {
  const up = q.change_pct >= 0;
  return (
    <div className={`card-lift row-hover flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-smooth ${
      up ? 'border-[#40e56c]/10 bg-[#40e56c]/5' : 'border-[#ff6464]/10 bg-[#ff6464]/5'
    }`}>
      <div>
        <div className="text-white font-semibold text-[12.5px]">{q.symbol}</div>
        <div className="text-[#555] text-[10px] mt-0.5">H {q.high?.toLocaleString('en-IN')} · L {q.low?.toLocaleString('en-IN')}</div>
      </div>
      <div className="text-right">
        <FlashPrice value={q.price} prefix="" className={`text-[12.5px] font-bold ${up ? 'text-[#40e56c]' : 'text-[#ff6464]'}`} />
        <div className={`text-[10px] font-medium mt-0.5 ${up ? 'text-[#40e56c]/80' : 'text-[#ff6464]/80'}`}>
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
    const res = await Promise.all(syms.map(s => api.market.getQuote(s).catch(() => ({ symbol: s, price: 0, change: 0, change_pct: 0, high: 0, low: 0 }))));
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
            className={`text-[11px] px-3 py-1 rounded border transition-smooth btn-press capitalize ${
              tab === t ? 'bg-[#4184f3]/10 text-[#4184f3] border-[#4184f3]/30' : 'text-[#666] border-[#2a2a2a] hover:text-white'
            }`}>
            {t === 'indices' ? 'Indices' : 'Top Stocks'}
          </button>
        ))}
      </div>
      {loading
        ? <SkeletonList rows={3} />
        : <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quotes.map(q => <Card key={q.symbol} q={q} />)}
          </div>
      }
    </div>
  );
}
