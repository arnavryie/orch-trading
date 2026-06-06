// frontend/src/components/CouncilView.tsx
// THE AI TRADING DESK — Premium cinematic design
import { useState } from 'react';

const API = '';

interface Vote {
  role: string; ai: string; icon: string;
  verdict: string; confidence: number; reasoning: string;
}
interface CouncilResult {
  symbol: string; price: number; market_open: boolean;
  personality: string;
  votes: Vote[];
  consensus: { action: string; confidence: number; agreement: number; summary: string; weighted?: boolean; votes?: { buy: number; sell: number; hold: number; total: number; }; };
  suggested_size: number;
  devils_advocate: { against_action?: string; counter_case?: string; biggest_risk?: string; };
}

const verdictColor = (v: string) =>
  v === 'BUY' ? '#40e56c' : v === 'SELL' ? '#ff6464' : v === 'HOLD' ? '#f59e0b' : '#555';

const verdictGlow = (v: string) =>
  v === 'BUY' ? '0 0 20px rgba(64,229,108,0.25)' : v === 'SELL' ? '0 0 20px rgba(255,100,100,0.25)' : v === 'HOLD' ? '0 0 20px rgba(245,158,11,0.15)' : 'none';

const ROLE_BLURB: Record<string, string> = {
  Scout: 'Real-time news & social sentiment',
  Fundamental: 'Valuation, earnings & financials',
  Technical: 'Chart patterns & indicators',
  Risk: 'Position sizing — FINAL CALL',
};

const AI_COLOR: Record<string, string> = {
  'Grok': '#1DA1F2',
  'GPT-4o': '#10a37f',
  'Gemini': '#4184f3',
  'Claude': '#d4a869',
};

export default function CouncilView() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [error, setError] = useState('');

  const convene = async () => {
    setLoading(true); setError(''); setResult(null); setRevealed(0);
    try {
      const res = await fetch(`${API}/api/council`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });
      if (!res.ok) throw new Error('Council failed');
      const data: CouncilResult = await res.json();
      setResult(data);
      data.votes.forEach((_, i) => setTimeout(() => setRevealed(i + 1), 500 * (i + 1)));
      setTimeout(() => setRevealed(data.votes.length + 1), 500 * (data.votes.length + 1));
    } catch (e: any) {
      setError(e.message || 'Failed to convene council');
    } finally {
      setLoading(false);
    }
  };

  const placeTrade = async () => {
    if (!result || result.suggested_size <= 0) return;
    const qty = Math.max(1, Math.floor(result.suggested_size / result.price));
    await fetch(`${API}/api/council/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: result.symbol,
        qty,
        side: result.consensus.action,
        votes: result.votes,
        consensus: result.consensus,
        devils_advocate: result.devils_advocate,
        personality: result.personality
      }),
    });
    alert(`Demo order placed: ${result.consensus.action} ${qty} ${result.symbol}`);
  };

  const allRevealed = result && revealed > result.votes.length;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: '24px 28px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏛️</span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-black text-white tracking-tight">The AI Trading Desk</h1>
                {result?.personality && (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#fff]/10 text-[#fff]/60 border border-[#fff]/20">
                    {result.personality} MODE
                  </span>
                )}
              </div>
              <p className="text-[#555] text-[12px]">Four specialist AIs debate the trade. You watch every vote.</p>
            </div>
          </div>
        </div>

        {/* Symbol input */}
        <div className="flex gap-3 mb-8">
          <div className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl px-4 py-3 flex-1 border border-[#1e1e1e] focus-within:border-[#4184f3]/40 transition-smooth">
            <span className="material-symbols-outlined text-[#555] text-[18px]">search</span>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') convene(); }}
              placeholder="RELIANCE, TCS, INFY…"
              className="bg-transparent outline-none text-white flex-1 text-[14px] placeholder:text-[#444]"
            />
          </div>
          <button
            id="council-convene"
            onClick={convene}
            disabled={loading}
            className="px-7 py-3 rounded-xl bg-[#4184f3] text-white font-bold text-[13px] btn-press disabled:opacity-50 transition-smooth hover:bg-[#4184f3]/90"
          >
            {loading ? '⏳ Convening…' : 'Convene Council'}
          </button>
        </div>

        {error && <div className="text-[#ff6464] text-sm mb-4 p-3 bg-[#ff6464]/10 rounded-lg border border-[#ff6464]/20">{error}</div>}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3 mb-8">
            {[0,1,2,3].map(i => (
              <div key={i} className="skeleton h-24 rounded-xl" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}

        {/* The 4 council seats */}
        {result && (
          <div className="space-y-3 mb-8">
            {result.votes.map((v, i) => {
              const show = revealed > i;
              const color = verdictColor(v.verdict);
              const glow = show ? verdictGlow(v.verdict) : 'none';
              const aiColor = AI_COLOR[v.ai] || '#4184f3';
              return (
                <div
                  key={v.role}
                  style={{
                    opacity: show ? 1 : 0.1,
                    transform: show ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                    background: '#0c0c0c',
                    borderLeft: `3px solid ${show ? color : '#1e1e1e'}`,
                    boxShadow: glow,
                  }}
                  className="rounded-xl p-5 border border-[#1a1a1a]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[26px]">{v.icon}</span>
                      <div>
                        <div className="text-white font-bold text-[13px] flex items-center gap-2">
                          {v.role}
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${aiColor}20`, color: aiColor }}>
                            {v.ai}
                          </span>
                        </div>
                        <div className="text-[#555] text-[11px]">{ROLE_BLURB[v.role] || ''}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}
                        className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider"
                      >
                        {v.verdict}
                      </span>
                      {v.verdict !== 'ABSTAIN' && (
                        <div className="text-[#555] text-[10px] mt-1.5">
                          <div className="flex items-center gap-1 justify-end">
                            <div className="w-12 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                              <div style={{ width: `${v.confidence}%`, background: color }} className="h-full rounded-full transition-all duration-700" />
                            </div>
                            <span>{v.confidence}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {show && (
                    <p className="text-[#aaa] text-[12.5px] mt-3 leading-relaxed border-t border-[#141414] pt-3">
                      {v.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Consensus verdict */}
        {result && allRevealed && (
          <div
            style={{
              background: `linear-gradient(135deg, ${verdictColor(result.consensus.action)}08, #050505)`,
              border: `1px solid ${verdictColor(result.consensus.action)}30`,
              boxShadow: verdictGlow(result.consensus.action),
              animation: 'pageEnter 0.6s ease',
            }}
            className="rounded-2xl p-7"
          >
            <div className="text-[#555] text-[10px] uppercase tracking-[0.15em] mb-3 font-semibold">Council Verdict</div>
            <div className="flex items-baseline gap-5 mb-6">
              <span style={{ color: verdictColor(result.consensus.action) }} className="text-[48px] font-black leading-none">
                {result.consensus.action}
              </span>
              <span className="text-[#666] text-[13px]">{result.consensus.summary}</span>
            </div>

            {/* Agreement + confidence */}
            {result.consensus.votes && (
              <div className="grid grid-cols-2 gap-5 mb-6">
                {[
                  { label: 'Agreement', value: result.consensus.agreement },
                  { label: 'Avg Confidence', value: result.consensus.confidence },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-[#666]">{label}</span>
                      <span className="text-white font-bold">{value}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${value}%`, background: verdictColor(result.consensus.action), transition: 'width 1s ease' }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vote breakdown */}
            {result.consensus.votes && (
              <div className="flex gap-3 mb-5">
                {[
                  { label: 'BUY', val: result.consensus.votes.buy, col: '#40e56c' },
                  { label: 'SELL', val: result.consensus.votes.sell, col: '#ff6464' },
                  { label: 'HOLD', val: result.consensus.votes.hold, col: '#f59e0b' },
                ].map(({ label, val, col }) => (
                  <div key={label} className="flex-1 bg-[#0a0a0a] rounded-lg p-3 border border-[#1a1a1a] text-center">
                    <div className="text-[22px] font-black" style={{ color: col }}>{val}</div>
                    <div className="text-[10px] text-[#555]">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Devil's Advocate */}
            {result.devils_advocate?.counter_case && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-5 mb-6 fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👿</span>
                  <h3 className="text-[#ffb4ab] font-bold text-sm">Devil's Advocate (Against {result.devils_advocate.against_action})</h3>
                </div>
                <p className="text-[#ffb4ab] text-sm leading-relaxed mb-3">
                  {result.devils_advocate.counter_case}
                </p>
                <div className="text-[11px] text-[#ef4444]/80 font-bold uppercase tracking-wider">
                  Biggest Risk: <span className="text-[#ffb4ab]">{result.devils_advocate.biggest_risk}</span>
                </div>
              </div>
            )}

            {/* Trade action */}
            {(result.consensus.action === 'BUY' || result.consensus.action === 'SELL') && result.suggested_size > 0 && (
              <div className="flex items-center justify-between bg-[#0a0a0a] rounded-xl p-4 border border-[#1e1e1e]">
                <div>
                  <div className="text-[#555] text-[11px] mb-0.5">Confidence-weighted position</div>
                  <div className="text-white font-bold text-[16px]">
                    ₹{result.suggested_size.toLocaleString('en-IN')}
                    <span className="text-[#555] font-normal text-[11px] ml-2">
                      ≈ {Math.floor(result.suggested_size / result.price)} shares @ ₹{result.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={placeTrade}
                  className={`px-6 py-2.5 rounded-xl text-black font-bold text-[13px] btn-press transition-smooth ${result.consensus.action === 'SELL' ? 'bg-[#ff6464] hover:bg-[#ff6464]/90' : 'bg-[#40e56c] hover:bg-[#40e56c]/90'}`}
                >
                  Place Demo {result.consensus.action}
                </button>
              </div>
            )}

            <div className="text-[#444] text-[10px] mt-4 text-center">
              Demo mode · virtual money only · not financial advice
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-20 space-y-3">
            <div className="text-[64px] opacity-30">🏛️</div>
            <div className="text-[#555] text-[14px]">Enter a symbol and convene the council.</div>
            <div className="text-[#3a3a3a] text-[11px]">Add Grok, GPT, Gemini & Claude keys in Settings to fill all 4 seats.</div>
          </div>
        )}
      </div>
    </div>
  );
}
