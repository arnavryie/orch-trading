import { useState, useEffect } from 'react';
import { api } from '../api/client';

const WATCHLIST_SYMBOLS = [
  { symbol: 'SENSEX', label: 'SENSEX', tag: 'INDEX', fallbackPrice: 61560.64, fallbackChange: -371.83, fallbackChangePct: -0.60 },
  { symbol: 'NIFTY', label: 'NIFTY 50', tag: 'INDEX', badge: 'EVENT', fallbackPrice: 18181.75, fallbackChange: -104.75, fallbackChangePct: -0.57 },
  { symbol: 'ASTRON', label: 'ASTRON', tag: '', fallbackPrice: 26.05, fallbackChange: -0.35, fallbackChangePct: -1.33 },
  { symbol: 'ASIANPAINT', label: 'ASIANPAINT', tag: '', fallbackPrice: 3092.45, fallbackChange: -45.65, fallbackChangePct: -1.45 },
  { symbol: 'RITES', label: 'RITES', tag: '', fallbackPrice: 396.50, fallbackChange: 8.15, fallbackChangePct: 2.10 },
  { symbol: 'BHEL', label: 'BHEL', tag: 'BSE', fallbackPrice: 82.30, fallbackChange: 0.74, fallbackChangePct: 0.91 },
  { symbol: 'RELIANCE', label: 'RELIANCE', tag: '', fallbackPrice: 2439.30, fallbackChange: -14.50, fallbackChangePct: -0.59 },
  { symbol: 'NIFTYBEES', label: 'NIFTYBEES', tag: 'BSE', fallbackPrice: 199.79, fallbackChange: -0.76, fallbackChangePct: -0.38 },
];

type WatchItem = typeof WATCHLIST_SYMBOLS[number] & { livePrice?: number; liveChange?: number; livePct?: number };

export default function WatchlistSidebar() {
  const [activeTab, setActiveTab] = useState(1);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<WatchItem[]>(WATCHLIST_SYMBOLS);

  // Try to fetch live quotes for key symbols
  useEffect(() => {
    const fetchQuotes = async () => {
      const updated = await Promise.all(
        WATCHLIST_SYMBOLS.map(async (item) => {
          try {
            const q = await api.market.getQuote(item.symbol);
            return { ...item, livePrice: q.price, liveChange: q.change, livePct: q.change_pct };
          } catch {
            return item;
          }
        })
      );
      setItems(updated);
    };
    fetchQuotes();
    const iv = setInterval(fetchQuotes, 30000);
    return () => clearInterval(iv);
  }, []);

  const filtered = items.filter(i =>
    !search || i.label.toLowerCase().includes(search.toLowerCase())
  );

  const nifty = items.find(i => i.symbol === 'NIFTY');
  const sensex = items.find(i => i.symbol === 'SENSEX');

  const getPrice = (i: WatchItem) => i.livePrice ?? i.fallbackPrice;
  const getChange = (i: WatchItem) => i.liveChange ?? i.fallbackChange;
  const getChangePct = (i: WatchItem) => i.livePct ?? i.fallbackChangePct;
  const isUp = (i: WatchItem) => getChange(i) >= 0;

  return (
    <aside className="w-[320px] flex-shrink-0 bg-[#0d0d0d] border-r border-[#333333] flex flex-col h-full z-40">
      {/* Market Status Header */}
      <div className="p-3 border-b border-[#333333] flex flex-col gap-2">
        {/* NIFTY 50 */}
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide">
          <span className="text-[#e2bfb0]">NIFTY 50</span>
          <div className="flex items-center gap-2">
            <span className={nifty && getChange(nifty) >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}>
              {nifty ? getPrice(nifty).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '18181.75'}
            </span>
            <span className="text-[#888]">
              {nifty ? `${getChange(nifty) >= 0 ? '+' : ''}${getChange(nifty).toFixed(2)} (${getChangePct(nifty).toFixed(2)}%)` : '-104.75 (-0.57%)'}
            </span>
          </div>
        </div>
        {/* SENSEX */}
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide">
          <span className="text-[#e2bfb0]">SENSEX</span>
          <div className="flex items-center gap-2">
            <span className={sensex && getChange(sensex) >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}>
              {sensex ? getPrice(sensex).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '61560.64'}
            </span>
            <span className="text-[#888]">
              {sensex ? `${getChange(sensex) >= 0 ? '+' : ''}${getChange(sensex).toFixed(2)} (${getChangePct(sensex).toFixed(2)}%)` : '-371.83 (-0.60%)'}
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#333333] bg-[#1a1a1a] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 text-[#888]">
          <span className="material-symbols-outlined text-[16px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search (infy bse, nifty fut, etc)"
            className="bg-transparent border-none outline-none text-[13px] text-[#f7ddd2] placeholder:text-[#555] w-full p-0"
          />
        </div>
        <span className="text-[11px] text-[#888] font-semibold whitespace-nowrap">{filtered.length} / 50</span>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {filtered.map((item, idx) => {
          const price = getPrice(item);
          const change = getChange(item);
          const pct = getChangePct(item);
          const up = isUp(item);
          const colorClass = up ? 'text-[#40e56c]' : 'text-[#ffb4ab]';
          const icon = up ? 'expand_less' : 'expand_more';

          return (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-3 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer group"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-semibold tracking-wide ${colorClass}`}>{item.label}</span>
                  {item.tag && (
                    <span className="text-[9px] text-[#555] uppercase">{item.tag}</span>
                  )}
                  {item.badge && (
                    <span className="text-[9px] text-primary bg-primary/10 px-1 rounded leading-none py-0.5">{item.badge}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[13px] font-mono font-medium text-[#f7ddd2]">
                  {price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className={`flex items-center gap-0.5 text-[11px] font-mono ${colorClass}`}>
                  <span className="material-symbols-outlined text-[14px]">{icon}</span>
                  <span>{Math.abs(change).toFixed(2)}</span>
                  <span>{Math.abs(pct).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Watchlist Tabs Footer */}
      <div className="flex border-t border-[#333333] bg-[#0d0d0d] h-10 shrink-0">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => setActiveTab(n)}
            className={`flex-1 border-r border-[#333333] flex items-center justify-center text-[11px] font-semibold transition-colors ${
              activeTab === n
                ? 'text-primary bg-[#1a1a1a]'
                : 'text-[#888] hover:bg-[#1a1a1a] hover:text-[#e2bfb0]'
            }`}
          >
            {n}
          </button>
        ))}
        <button className="flex-1 flex items-center justify-center text-[#888] hover:bg-[#1a1a1a] hover:text-[#e2bfb0] transition-colors">
          <span className="material-symbols-outlined text-[16px]">settings</span>
        </button>
      </div>
    </aside>
  );
}
