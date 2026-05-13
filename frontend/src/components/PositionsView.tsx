import { useState, useEffect } from 'react';
import { api } from '../api/client';

const DEMO_POSITIONS = [
  { product: 'NRML', instrument: 'USDINR 23JUN FUT', exchange: 'CDS', qty: -1, avg: 82.0375, ltp: 82.5275, pnl: -490, chg: 0.60 },
  { product: 'NRML', instrument: 'USDINR 23MAY FUT', exchange: 'CDS', qty: 1, avg: 82.1625, ltp: 82.4225, pnl: 260, chg: 0.32 },
  { product: 'NRML', instrument: 'GOLDPETAL 23MAY FUT', exchange: 'MCX', qty: 1, avg: 6134, ltp: 6059, pnl: -75, chg: -1.22 },
  { product: 'NRML', instrument: '11th w 23MAY 18700 CE', exchange: 'NFO', qty: -50, avg: 1.65, ltp: 1.65, pnl: -50, chg: 0 },
  { product: 'CNC', instrument: 'IDFCFIRSTB', exchange: 'NSE', qty: 1, avg: 64.70, ltp: 66.95, pnl: 2.25, chg: 3.48 },
];

export default function PositionsView() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.broker.getPositions()
      .then(data => setPositions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const rows = (!loading && positions.length > 0)
    ? positions.map(p => ({
        product: p.product || 'NRML',
        instrument: p.symbol,
        exchange: p.exchange || 'NSE',
        qty: p.quantity,
        avg: p.avg_price,
        ltp: p.last_price,
        pnl: p.pnl || 0,
        chg: p.pnl && p.avg_price && p.quantity ? ((p.last_price - p.avg_price) / p.avg_price) * 100 : 0,
      }))
    : DEMO_POSITIONS;

  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);

  const ProductBadge = ({ product }: { product: string }) => (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${
      product === 'CNC' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-[#2a1b38] text-[#a855f7] border-[#a855f7]/30'
    }`}>{product}</span>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#1a1a1a] custom-scrollbar">
      <div className="p-6 space-y-6">
        {/* Warning */}
        <div className="bg-[#261812]/80 border border-primary/30 rounded p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary mt-0.5 ms-fill text-[20px]">warning</span>
          <p className="text-[13px] text-[#f7ddd2]">This is a demo platform with dummy data. <a className="text-primary hover:underline font-bold" href="#">Signup now</a> to access the live platform.</p>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-[24px] font-semibold text-[#f7ddd2]">Positions ({rows.length})</h1>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#888] text-[18px]">search</span>
              <input className="bg-black border border-[#333333] text-[#f7ddd2] rounded py-1.5 pl-9 pr-3 text-[13px] focus:border-primary/60 outline-none w-44 placeholder:text-[#555]" placeholder="Search" type="text" />
            </div>
            <button className="text-primary hover:text-primary/80 text-[13px] flex items-center gap-1 transition-colors"><span className="material-symbols-outlined text-[16px]">show_chart</span> Analyze</button>
            <button className="text-[#40e56c] hover:text-[#40e56c]/80 text-[13px] flex items-center gap-1 transition-colors"><span className="material-symbols-outlined text-[16px]">download</span> Download</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-black border border-[#333333] rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#333333] text-[11px] font-semibold text-[#e2bfb0] bg-[#1a1a1a]">
                  <th className="p-3 font-medium w-10">
                    <input type="checkbox" className="rounded bg-black border-[#333] text-primary focus:ring-primary focus:ring-offset-black" />
                  </th>
                  {['Product', 'Instrument', 'Qty.', 'Avg.', 'LTP', 'P&L', 'Chg.'].map((h, i) => (
                    <th key={h} className={`p-3 font-medium ${i > 1 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-[#888] animate-pulse">Fetching positions...</td></tr>
                ) : rows.map((p, i) => (
                  <tr key={i} className={`border-b border-[#333333] hover:bg-[#252525] transition-colors ${i % 2 === 1 ? 'bg-[#0d0d0d]' : ''}`}>
                    <td className="p-3"><input type="checkbox" className="rounded bg-black border-[#333] text-primary focus:ring-primary focus:ring-offset-black" /></td>
                    <td className="p-3"><ProductBadge product={p.product} /></td>
                    <td className="p-3 text-[#f7ddd2]">{p.instrument} <span className="text-[10px] text-[#e2bfb0] ml-1">{p.exchange}</span></td>
                    <td className={`p-3 text-right font-semibold ${p.qty < 0 ? 'text-[#ffb4ab]' : 'text-[#3b82f6]'}`}>{p.qty}</td>
                    <td className="p-3 text-right text-[#e2bfb0]">{p.avg?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td className="p-3 text-right text-[#e2bfb0]">{p.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td className={`p-3 text-right font-semibold ${p.pnl >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}</td>
                    <td className={`p-3 text-right ${p.chg >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>{p.chg >= 0 ? '+' : ''}{p.chg.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#1a1a1a] font-mono text-[13px]">
                  <td className="p-4 text-right text-[#e2bfb0] font-semibold" colSpan={6}>Total</td>
                  <td className={`p-4 text-right font-bold text-[17px] ${totalPnl >= 0 ? 'text-[#40e56c]' : 'text-[#ffb4ab]'}`}>
                    {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-8 mb-8">
          <h2 className="text-[20px] font-semibold text-[#f7ddd2] mb-5 flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
            Breakdown
            <span className="material-symbols-outlined text-[#e2bfb0] text-[20px]">expand_more</span>
          </h2>
          <div className="space-y-3 max-w-2xl">
            {rows.filter(r => r.pnl < 0).slice(0, 5).map((r, i) => {
              const pct = Math.min(Math.abs(r.pnl) / Math.max(...rows.map(x => Math.abs(x.pnl)), 1) * 100, 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-2/3 h-3 bg-[#1a1a1a] rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: i % 2 === 0 ? '#ef4444' : '#f97316' }} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#e2bfb0] w-1/3">{r.instrument} ({r.product})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
