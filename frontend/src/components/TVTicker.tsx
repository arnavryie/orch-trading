// frontend/src/components/TVTicker.tsx — Native backend-driven scrolling ticker
import React, { useEffect, useState } from 'react';

const SYMBOLS = ['NIFTY', 'SENSEX', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'WIPRO', 'BHARTIARTL', 'ITC', 'AXISBANK'];
const API = '';

interface Q { symbol: string; price: number; change: number; change_pct: number; }

export const TVTicker: React.FC = () => {
  const [quotes, setQuotes] = useState<Q[]>([]);

  useEffect(() => {
    const fetch_all = async () => {
      const results = await Promise.all(
        SYMBOLS.map(s => fetch(`${API}/api/quote/${s}`).then(r => r.json()).catch(() => null))
      );
      setQuotes(results.filter(Boolean).map((q: any, i) => ({ symbol: SYMBOLS[i], price: q.price, change: q.change, change_pct: q.change_pct })));
    };
    fetch_all();
    const iv = setInterval(fetch_all, 30_000);
    return () => clearInterval(iv);
  }, []);

  if (quotes.length === 0) {
    return (
      <div className="h-8 bg-[#050505] border-b border-[#111] flex items-center px-4">
        <div className="skeleton h-2 w-full" />
      </div>
    );
  }

  // Double the items so the loop is seamless
  const items = [...quotes, ...quotes];

  return (
    <div className="h-8 bg-[#050505] border-b border-[#111] overflow-hidden flex items-center" style={{ position: 'relative' }}>
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{
          animation: 'tickerScroll 60s linear infinite',
          willChange: 'transform',
        }}
      >
        {items.map((q, i) => {
          const up = (q.change_pct ?? 0) >= 0;
          return (
            <span key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#aaa] font-semibold tracking-wide">{q.symbol}</span>
              <span className={`font-bold tabular-nums ${up ? 'text-[#40e56c]' : 'text-[#ff6464]'}`}>
                {q.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] ${up ? 'text-[#40e56c]/80' : 'text-[#ff6464]/80'}`}>
                {up ? '+' : ''}{q.change_pct?.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
};
