import { useState, useEffect } from 'react';
import { api } from '../api/client';
import FlashPrice from './FlashPrice';

const DEFAULT_SYMBOLS = ['NIFTY', 'SENSEX', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'WIPRO', 'ICICIBANK', 'BHARTIARTL'];

interface Quote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  market_open?: boolean;
}

interface Props {
  onTrade?: (symbol: string, side: 'BUY' | 'SELL', price: number) => void;
  onChart?: (symbol: string) => void;
}

export default function WatchlistSidebar({ onTrade, onChart }: Props) {
  const [quotes, setQuotes]   = useState<Record<string, Quote>>({});
  const [search, setSearch]   = useState('');
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [hovered, setHovered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const results = await Promise.all(
      symbols.map(s => api.market.getQuote(s).then(q => [s, q]).catch(() => [s, null]))
    );
    const map: Record<string, Quote> = {};
    results.forEach(([s, q]: any) => { if (q && q.price > 0) map[s] = q; });
    setQuotes(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 5000);   // tick every 5s like Kite
    return () => clearInterval(iv);
  }, [symbols]);

  const displayed = symbols.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2 bg-[#141414] rounded px-2.5 py-1.5 transition-smooth focus-within:bg-[#1a1a1a] focus-within:ring-1 focus-within:ring-kite-blue/40">
          <span className="material-symbols-outlined text-[16px] text-[#555]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search eg: infy, nifty fut"
            className="bg-transparent outline-none text-[13px] text-white flex-1 placeholder:text-[#555]"
          />
          <span className="text-[10px] text-[#444]">{displayed.length}/50</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex justify-between px-3 py-2.5 border-b border-[#141414]">
              <div className="skeleton h-3 w-20" /><div className="skeleton h-3 w-16" />
            </div>
          ))
        ) : (
          displayed.map(sym => {
            const q = quotes[sym];
            const up = (q?.change_pct ?? 0) >= 0;
            const isHover = hovered === sym;
            return (
              <div
                key={sym}
                onMouseEnter={() => setHovered(sym)}
                onMouseLeave={() => setHovered(null)}
                className="relative row-hover border-b border-[#141414] cursor-pointer select-none"
                style={{ borderLeft: `2px solid ${up ? 'rgba(64,229,108,0.5)' : 'rgba(255,100,100,0.5)'}` }}
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex flex-col">
                    <span className={`text-[12.5px] font-medium ${up ? 'text-bullish' : 'text-bearish'}`}>{sym}</span>
                    <span className="text-[10px] text-[#555]">NSE</span>
                  </div>
                  {q && (
                    <div className="flex flex-col items-end">
                      <FlashPrice value={q.price} prefix="" className={`text-[12.5px] font-semibold ${up ? 'text-bullish' : 'text-bearish'}`} />
                      <span className={`text-[10px] ${up ? 'text-bullish' : 'text-bearish'}`}>
                        {up ? '+' : ''}{q.change?.toFixed(2)} ({up ? '+' : ''}{q.change_pct?.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover-reveal action buttons — the Kite signature */}
                {isHover && q && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 fade-in">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTrade?.(sym, 'BUY', q.price); }}
                      className="w-6 h-6 rounded bg-kite-blue text-white text-[11px] font-bold btn-press flex items-center justify-center shadow-lg"
                      title="Buy"
                    >B</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onTrade?.(sym, 'SELL', q.price); }}
                      className="w-6 h-6 rounded bg-[#ff5722] text-white text-[11px] font-bold btn-press flex items-center justify-center shadow-lg"
                      title="Sell"
                    >S</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onChart?.(sym); }}
                      className="w-6 h-6 rounded bg-[#2a2a2a] text-[#ccc] btn-press flex items-center justify-center shadow-lg"
                      title="Chart"
                    >
                      <span className="material-symbols-outlined text-[14px]">show_chart</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
