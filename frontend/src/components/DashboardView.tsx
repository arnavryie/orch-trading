// frontend/src/components/DashboardView.tsx
// Kite-style dashboard: portfolio summary bar + indices + chart + movers
import { useEffect, useState } from 'react';
import CandlestickChart from './CandlestickChart';
import FlashPrice from './FlashPrice';
import CountUp from './CountUp';
import { SkeletonCard } from './Skeleton';

const API = '';

interface Funds { available_cash: number; portfolio_value: number; pnl: number; pnl_pct: number; }
interface Quote { symbol: string; price: number; change: number; change_pct: number; high: number; low: number; }

const INDICES = ['NIFTY', 'SENSEX', 'BANKNIFTY'];
const MOVERS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'WIPRO', 'BHARTIARTL'];

export default function DashboardView() {
  const [funds, setFunds] = useState<Funds | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [activeChart, setActiveChart] = useState('NIFTY');
  const [loadingFunds, setLoadingFunds] = useState(true);

  const fetchAll = async () => {
    // Funds
    try {
      const f = await fetch(`${API}/api/funds`).then(r => r.json());
      setFunds(f);
      setLoadingFunds(false);
    } catch { setLoadingFunds(false); }

    // Indices + movers
    const all = [...INDICES, ...MOVERS];
    const results = await Promise.all(
      all.map(s => fetch(`${API}/api/quote/${s}`).then(r => r.json()).catch(() => null))
    );
    const map: Record<string, Quote> = {};
    results.forEach((q, i) => { if (q && q.price > 0) map[all[i]] = { ...q, symbol: all[i] }; });
    setQuotes(map);
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 15_000);
    return () => clearInterval(iv);
  }, []);

  const IndexTile = ({ sym }: { sym: string }) => {
    const q = quotes[sym];
    if (!q) return <div className="skeleton h-16 rounded-lg" />;
    const up = q.change_pct >= 0;
    return (
      <button
        onClick={() => setActiveChart(sym)}
        className={`flex flex-col gap-0.5 px-4 py-3 rounded-lg border transition-smooth btn-press text-left ${
          activeChart === sym
            ? 'bg-[#4184f3]/10 border-[#4184f3]/40 text-white'
            : 'bg-[#0f0f0f] border-[#1e1e1e] hover:border-[#333] hover:bg-[#141414]'
        }`}
      >
        <div className="text-[11px] text-[#666]">{sym}</div>
        <FlashPrice value={q.price} prefix="" className={`text-[14px] font-bold ${up ? 'text-[#40e56c]' : 'text-[#ff6464]'}`} decimals={2} />
        <div className={`text-[10px] ${up ? 'text-[#40e56c]/80' : 'text-[#ff6464]/80'}`}>
          {up ? '+' : ''}{q.change_pct?.toFixed(2)}%
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar">
      {/* Portfolio P&L banner — top strip like Kite's holdings bar */}
      <div className="bg-[#0a0a0a] border-b border-[#1e1e1e] px-5 py-2.5 flex items-center gap-8 flex-wrap">
        {loadingFunds ? (
          <div className="skeleton h-4 w-64" />
        ) : funds ? (
          <>
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">Portfolio Value</div>
              <div className="text-white font-bold text-[15px]"><CountUp value={funds.portfolio_value} /></div>
            </div>
            <div className="w-px h-8 bg-[#1e1e1e]" />
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">Available Cash</div>
              <div className="text-white font-semibold text-[14px]"><CountUp value={funds.available_cash} /></div>
            </div>
            <div className="w-px h-8 bg-[#1e1e1e]" />
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">Today's P&L</div>
              <div className={`font-bold text-[15px] ${(funds.pnl ?? 0) >= 0 ? 'text-[#40e56c]' : 'text-[#ff6464]'}`}>
                <CountUp value={Math.abs(funds.pnl)} prefix={(funds.pnl ?? 0) >= 0 ? '+₹' : '-₹'} />
                <span className="text-[11px] font-normal ml-1.5 opacity-70">({funds.pnl_pct?.toFixed(2)}%)</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-[#555] text-xs">Demo account — add holdings via the Watchlist</div>
        )}
      </div>

      <div className="px-4 py-4 max-w-screen-xl mx-auto space-y-4" style={{ paddingBottom: '80px' }}>
        {/* Index tiles */}
        <div className="grid grid-cols-3 gap-3">
          {INDICES.map(sym => <IndexTile key={sym} sym={sym} />)}
        </div>

        {/* Chart */}
        <div className="rounded-lg overflow-hidden border border-[#1e1e1e] bg-[#0a0a0a]">
          <CandlestickChart symbol={activeChart} height={440} />
        </div>

        {/* Top movers */}
        <div className="bg-[#0a0a0a] rounded-lg border border-[#1e1e1e] p-4">
          <div className="text-[11px] text-[#555] uppercase tracking-wider mb-3 font-semibold">Top Stocks</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {MOVERS.map(sym => {
              const q = quotes[sym];
              if (!q) return <div key={sym} className="skeleton h-12 rounded-lg" />;
              const up = q.change_pct >= 0;
              return (
                <div key={sym} className="row-hover rounded-lg p-2.5 bg-[#0f0f0f] border border-[#1a1a1a] flex justify-between items-center cursor-pointer"
                  onClick={() => setActiveChart(sym)}
                >
                  <div>
                    <div className="text-white text-[12px] font-semibold">{sym}</div>
                    <div className={`text-[10px] ${up ? 'text-[#40e56c]' : 'text-[#ff6464]'}`}>{up ? '+' : ''}{q.change_pct?.toFixed(2)}%</div>
                  </div>
                  <FlashPrice value={q.price} prefix="" className={`text-[12px] font-bold ${up ? 'text-[#40e56c]' : 'text-[#ff6464]'}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
