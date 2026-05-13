import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function HoldingsView() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchHoldings = () => {
    api.broker.getHoldings()
      .then(async (data) => {
        const withQ = await Promise.all(data.map(async (h: any) => {
          try { const q = await api.market.getQuote(h.symbol); return { ...h, quote: q }; }
          catch { return h; }
        }));
        setHoldings(withQ);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHoldings();
    window.addEventListener('holdings-refresh', fetchHoldings);
    return () => window.removeEventListener('holdings-refresh', fetchHoldings);
  }, []);

  const filtered = holdings.filter(h =>
    !search || h.symbol?.toLowerCase().includes(search.toLowerCase())
  );

  const totalInv = holdings.reduce((s, h) => s + ((h.avg_price || 0) * (h.quantity || 0)), 0);
  const totalVal = holdings.reduce((s, h) => s + ((h.last_price || h.quote?.price || 0) * (h.quantity || 0)), 0);
  const dayPnl = holdings.reduce((s, h) => s + ((h.quote?.change || 0) * (h.quantity || 0)), 0);
  const totalPnl = holdings.reduce((s, h) => s + (h.pnl || 0), 0);
  const dayPct = totalVal > 0 ? (dayPnl / totalVal) * 100 : 0.23;
  const totalPct = totalInv > 0 ? (totalPnl / totalInv) * 100 : 19.13;

  const fmtCcy = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar">
      <div className="mx-6 mt-4 bg-[#3a2800]/20 border border-[#b8860b]/50 rounded text-[#e6b800] p-3 text-[13px] flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">warning</span>
        <p>This is a demo platform with dummy data. <a className="text-primary hover:underline" href="#">Signup now</a> to access the live platform.</p>
      </div>

      <div className="px-6 pt-4 pb-6 space-y-6">
        <div className="flex justify-between items-end border-b border-[#333333] pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-[24px] font-semibold text-[#f7ddd2]">Holdings ({holdings.length || 17})</h1>
            <select className="appearance-none bg-[#1a1a1a] border border-[#333333] text-[#f7ddd2] text-[13px] py-1.5 pl-3 pr-7 rounded outline-none focus:border-primary/60">
              <option>All stocks</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[#888] text-[16px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search"
                className="bg-[#1a1a1a] border border-[#333333] text-[#f7ddd2] text-[13px] py-1.5 pl-8 pr-3 rounded outline-none focus:border-primary/60 w-44 placeholder:text-[#555]"
              />
            </div>
            <button className="flex items-center gap-1 text-primary hover:text-primary/80 text-[13px] transition-colors">
              <span className="material-symbols-outlined text-[16px]">pie_chart</span> Analytics
            </button>
            <button className="flex items-center gap-1 text-primary hover:text-primary/80 text-[13px] transition-colors">
              <span className="material-symbols-outlined text-[16px]">download</span> Download
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 bg-[#1a1a1a] border border-[#333333] rounded p-5">
          {[
            { label: 'Total investment', value: totalInv > 0 ? fmtCcy(totalInv) : '13,228.55', color: '#f7ddd2' as const },
            { label: 'Current value', value: totalVal > 0 ? fmtCcy(totalVal) : '15,758.71', color: '#f7ddd2' as const },
            { label: "Day's P&L", value: `${dayPnl !== 0 ? (dayPnl >= 0 ? '+' : '') + fmtCcy(dayPnl) : '35.70'}`, pct: `(+${dayPct.toFixed(2)}%)`, color: '#40e56c' as const },
            { label: 'Total P&L', value: `${totalPnl !== 0 ? (totalPnl >= 0 ? '+' : '') + fmtCcy(totalPnl) : '2,530.16'}`, pct: `(+${totalPct.toFixed(2)}%)`, color: '#40e56c' as const },
          ].map(({ label, value, pct, color }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#e2bfb0] uppercase tracking-wider">{label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold leading-none" style={{ color }}>{value}</span>
                {pct && <span className="text-[11px] font-semibold" style={{ color }}>{pct}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] border border-[#333333] rounded overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#333333] bg-[#0d0d0d]">
                {['Instrument', 'Qty.', 'Avg. cost', 'LTP', 'Cur. val', 'P&L', 'Net chg.', 'Day chg.'].map((h, i) => (
                  <th key={h} className={`py-3 px-4 text-[11px] font-semibold text-[#e2bfb0] uppercase ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#888] animate-pulse">Fetching portfolio data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#888]">No holdings found.</td></tr>
              ) : filtered.map((h, idx) => {
                const ltp = h.quote?.price || h.last_price || 0;
                const curVal = ltp * h.quantity;
                const pnl = h.pnl || 0;
                const netChg = h.avg_price > 0 ? ((ltp - h.avg_price) / h.avg_price) * 100 : 0;
                const dayChg = h.quote?.change_pct || 0;
                return (
                  <tr key={idx} className={`border-b border-[#333333]/50 hover:bg-[#252525] transition-colors cursor-default ${idx % 2 === 1 ? 'bg-[#0d0d0d]/50' : ''}`}>
                    <td className="py-2.5 px-4 text-[#f7ddd2] font-semibold">{h.symbol}</td>
                    <td className="py-2.5 px-4 text-right text-[#f7ddd2]">{h.quantity}</td>
                    <td className="py-2.5 px-4 text-right text-[#f7ddd2]">{h.avg_price?.toFixed(2) || '—'}</td>
                    <td className="py-2.5 px-4 text-right text-[#f7ddd2]">{ltp > 0 ? ltp.toFixed(2) : '—'}</td>
                    <td className="py-2.5 px-4 text-right text-[#f7ddd2]">{curVal > 0 ? curVal.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}</td>
                    <td className={`py-2.5 px-4 text-right font-semibold ${pnl >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</td>
                    <td className={`py-2.5 px-4 text-right ${netChg >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{netChg >= 0 ? '+' : ''}{netChg.toFixed(2)}%</td>
                    <td className={`py-2.5 px-4 text-right ${dayChg >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{dayChg >= 0 ? '+' : ''}{dayChg.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
