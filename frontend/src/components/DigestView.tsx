// frontend/src/components/DigestView.tsx
import { useState, useEffect } from 'react';

const API = '';

interface Digest {
  date: string;
  headline: string;
  market: any;
  movers: { gainers: any[]; losers: any[] };
  portfolio_review: any[];
  cash: number;
  pnl: number;
}

export default function DigestView() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/digest`)
      .then(r => r.json())
      .then(d => { setDigest(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center text-[#888]">Compiling daily digest...</div>;
  if (!digest) return <div className="p-10 text-center text-[#ef4444]">Failed to load digest</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar page-enter" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Morning Desk Briefing</h1>
        <p className="text-[#888] text-sm mb-8">{digest.date}</p>

        {/* Headline */}
        <div className="bg-[#4184f3]/10 border border-[#4184f3]/30 rounded-xl p-5 mb-8">
          <div className="text-[#9dc0ff] font-medium text-lg leading-relaxed">
            {digest.headline}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Top Movers */}
          <div>
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Watchlist Movers
            </h2>
            <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] overflow-hidden">
              <div className="divide-y divide-[#1a1a1a]">
                {digest.movers.gainers.slice(0, 3).map((s: any) => (
                  <div key={s.symbol} className="flex justify-between p-3 text-sm">
                    <span className="text-white">{s.symbol}</span>
                    <span className="text-[#22c55e]">+{s.change_pct.toFixed(2)}%</span>
                  </div>
                ))}
                {digest.movers.losers.slice(0, 2).map((s: any) => (
                  <div key={s.symbol} className="flex justify-between p-3 text-sm">
                    <span className="text-white">{s.symbol}</span>
                    <span className="text-[#ef4444]">{s.change_pct.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Portfolio Desk Review */}
          <div>
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f5b041]" /> Portfolio Review
            </h2>
            <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] overflow-hidden">
              {digest.portfolio_review.length === 0 ? (
                <div className="p-4 text-[#666] text-sm text-center">Portfolio empty.</div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {digest.portfolio_review.map(h => (
                    <div key={h.symbol} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <div className="text-white">{h.symbol}</div>
                        <div className={`text-xs ${h.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {h.pnl_pct > 0 ? '+' : ''}{h.pnl_pct.toFixed(1)}% P&L
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#888] text-[10px] uppercase">Latest Desk View</div>
                        <div className={`font-bold ${
                          h.desk_view === 'BUY' ? 'text-[#22c55e]' : 
                          h.desk_view === 'SELL' ? 'text-[#ef4444]' : 'text-[#888]'
                        }`}>
                          {h.desk_view} {h.desk_confidence > 0 ? `(${h.desk_confidence}%)` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
