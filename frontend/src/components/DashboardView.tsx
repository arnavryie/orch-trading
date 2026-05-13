import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function DashboardView() {
  const [funds, setFunds] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    api.broker.getFunds().then(setFunds).catch(() => {});
    api.broker.getHoldings().then(d => setHoldings(Array.isArray(d) ? d : [])).catch(() => {});
    api.broker.getPositions().then(d => setPositions(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const equity = funds?.equity || funds;
  const available = equity?.available_margin ?? equity?.available_cash ?? 100000;
  const used = equity?.used_margin ?? 0;
  const opening = equity?.opening_balance ?? available;

  const totalVal = holdings.reduce((s, h) => s + ((h.last_price || 0) * (h.quantity || 0)), 0);
  const totalInv = holdings.reduce((s, h) => s + ((h.avg_price || 0) * (h.quantity || 0)), 0);
  const totalPnl = holdings.reduce((s, h) => s + (h.pnl || 0), 0);
  const pnlPct = totalInv > 0 ? (totalPnl / totalInv) * 100 : 16.9;

  const fmt = (v: number) => {
    if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(2)}k`;
    return v.toFixed(0);
  };

  const barColors = ['#1a56db', '#0ea5e9', '#8b5cf6', '#3b82f6', '#0d9488', '#eab308', '#65a30d', '#4b5563'];

  const fallbackPositions = [
    { label: 'USDINR 23JUN FUT (NRML)', w: '80%', color: '#dc2626' },
    { label: '11th 23MAY 18700 CE (NRML)', w: '40%', color: '#ea580c' },
    { label: 'USDINR 23MAY FUT (NRML)', w: '50%', color: '#dc2626' },
    { label: '11th 23MAY 18750 CE (NRML)', w: '20%', color: '#ea580c' },
    { label: '11th 23MAY 17300 PE (MIS)', w: '30%', color: '#dc2626' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-black custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Demo Warning */}
        <div className="bg-[#3d2d26]/40 border border-[#a98a7c]/30 rounded p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 ms-fill">warning</span>
          <p className="text-[14px] text-[#f7ddd2]">
            This is a demo platform with dummy data.{' '}
            <a href="#" className="text-primary font-semibold hover:underline">Signup now</a>{' '}
            to access the live platform.
          </p>
        </div>

        <h1 className="text-[32px] font-bold tracking-tight text-[#f7ddd2]">Hi, Demo</h1>
        <div className="w-full h-px bg-[#333333]" />

        {/* Margin Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { icon: 'pie_chart', label: 'Equity', amount: fmt(available), used, opening: fmt(opening) },
            { icon: 'water_drop', label: 'Commodity', amount: '50k', used: 0, opening: '50k' },
          ].map((card) => (
            <div key={card.label} className="flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-[#333333] pb-4">
                <span className="material-symbols-outlined text-[20px] text-[#e2bfb0]">{card.icon}</span>
                <span className="text-[24px] font-semibold text-[#f7ddd2]">{card.label}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[40px] leading-none font-light text-[#f7ddd2] mb-1">{card.amount}</div>
                  <div className="text-[11px] text-[#e2bfb0] uppercase tracking-wide font-semibold">Margin available</div>
                </div>
                <div className="space-y-3 text-[14px]">
                  <div className="flex justify-between gap-8">
                    <span className="text-[#e2bfb0]">Margins used</span>
                    <span className="font-mono text-[#f7ddd2]">{card.used}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-[#e2bfb0]">Opening balance</span>
                    <span className="font-mono text-[#f7ddd2]">{card.opening}</span>
                  </div>
                  <a href="#" className="text-primary text-[14px] flex items-center gap-1 hover:underline pt-1">
                    <span className="material-symbols-outlined text-[16px] ms-fill">info</span>
                    View statement
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full h-px bg-[#333333]" />

        {/* Holdings + Promo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#e2bfb0]">business_center</span>
              <span className="text-[16px] text-[#f7ddd2]">Holdings ({holdings.length || 17})</span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] text-[#40e56c] font-light">{totalPnl !== 0 ? fmt(Math.abs(totalPnl)) : '2.24k'}</span>
                  <span className="text-[#40e56c] text-[14px]">+{pnlPct.toFixed(2)}%</span>
                </div>
                <div className="text-[11px] text-[#e2bfb0] uppercase tracking-wide font-semibold mt-1">P&amp;L</div>
              </div>
              <div className="space-y-2 border-l border-[#333333] pl-8 text-[14px]">
                <div className="flex justify-between gap-8">
                  <span className="text-[#e2bfb0]">Current value</span>
                  <span className="font-mono text-[#f7ddd2]">{totalVal > 0 ? fmt(totalVal) : '15.46k'}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-[#e2bfb0]">Investment</span>
                  <span className="font-mono text-[#f7ddd2]">{totalInv > 0 ? fmt(totalInv) : '13.23k'}</span>
                </div>
              </div>
            </div>
            <div className="w-full h-12 flex rounded-sm overflow-hidden">
              {barColors.map((c, idx) => (
              <div key={idx} className="h-full" style={{ backgroundColor: c, flex: idx < 7 ? `0 0 ${[20,25,17,17,10,5,5][idx]}%` : '1 1 0' }} />
            ))}
            </div>
            <div className="flex justify-between items-center text-[13px] text-[#e2bfb0]">
              <div className="font-mono text-[#f7ddd2] text-[16px]">₹{totalVal > 0 ? totalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '15,463.77'}</div>
              <div className="flex gap-4 items-center">
                {[['#3b82f6','Current value'], ['transparent','Investment value'], ['transparent','P&L']].map(([bg, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full border border-[#555]" style={{ backgroundColor: bg }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Promo */}
          <div className="bg-[#f8f9fa] rounded p-6 flex flex-col items-center justify-center text-center cursor-pointer group border border-transparent hover:border-[#e5e7eb] transition-all">
            <h3 className="text-[#1a1a1a] text-[20px] font-semibold leading-tight">Invite your friends<br/>and earn Rewards</h3>
            <div className="w-28 h-28 relative mt-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-orange-100 rounded-full blur-xl opacity-50" />
              <span className="material-symbols-outlined text-[64px] text-[#3b82f6] rotate-12 relative">featured_seasonal_and_gifts</span>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-[#333333]" />

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
          {/* Market Overview */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#e2bfb0]">timeline</span>
              <span className="text-[16px] text-[#f7ddd2]">Market overview</span>
            </div>
            <div className="h-48 relative border-b border-l border-[#333333]">
              <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[10px] text-[#555] py-2">
                <span>18.2k</span><span>18.1k</span><span>18.0k</span>
              </div>
              <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,80 L20,95 L40,60 L60,70 L80,50 L100,55 L120,40 L140,20 L160,25 L180,10 L200,30 L220,35 L240,40 L260,25 L280,45 L300,50 L320,60 L340,40 L360,70 L380,40 L400,30 L400,100 L0,100Z" fill="url(#lg1)" stroke="none" />
                <path d="M0,80 L20,95 L40,60 L60,70 L80,50 L100,55 L120,40 L140,20 L160,25 L180,10 L200,30 L220,35 L240,40 L260,25 L280,45 L300,50 L320,60 L340,40 L360,70 L380,40 L400,30" fill="none" stroke="#3b82f6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="absolute top-2 left-4 flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#3b82f6]" /><span className="text-[10px] text-[#555]">NIFTY 50</span>
              </div>
            </div>
          </div>

          {/* Positions Chart */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#e2bfb0]">bar_chart</span>
              <span className="text-[16px] text-[#f7ddd2]">Positions ({positions.length || 8})</span>
            </div>
            <div className="flex flex-col justify-center h-48 gap-3 border-l border-[#333333] pl-4">
              {(positions.length > 0
                ? positions.slice(0, 5).map((p, _idx) => ({
                    label: p.symbol,
                    w: `${Math.min(Math.abs((p.pnl || 0) / 5), 100)}%`,
                    color: (p.pnl || 0) < 0 ? '#dc2626' : '#16a34a',
                  }))
                : fallbackPositions
              ).map((item, rowIdx) => (
                <div key={rowIdx} className="flex items-center justify-between w-full gap-4">
                  <div className="flex-1 h-3 bg-[#1a1a1a] rounded-sm overflow-hidden flex justify-end">
                    <div className="h-full rounded-sm" style={{ width: item.w, backgroundColor: item.color }} />
                  </div>
                  <div className="w-48 text-[11px] text-[#888] truncate text-right">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
