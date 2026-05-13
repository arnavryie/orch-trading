import type { ReactNode } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api, connectWebsocket } from '../api/client';
import { useChat } from '../hooks/useChat';

interface CardProps {
  title: string;
  state: string;
  percentage: string;
  children: ReactNode;
  colorClass: string;
  borderColorClass: string;
}

const Card = ({ title, state, percentage, children, colorClass, borderColorClass }: CardProps) => (
  <div className={`rounded-md border ${borderColorClass} p-4 flex flex-col space-y-3 bg-card backdrop-blur-xs transition-all hover:bg-white/[0.02]`}>
    <div className="flex justify-between items-center text-xs font-medium">
      <div className={`flex space-x-2 ${colorClass}`}>
        <span>{title}</span>
        <span className="opacity-80">{state} {percentage}%</span>
      </div>
      <div className="w-1 h-1 rounded-full bg-border-medium"></div>
    </div>
    <div className="text-xs text-text-muted space-y-1.5 leading-relaxed font-mono">
      {children}
    </div>
  </div>
);

const AnalysisDashboard = ({ onPageChange }: { onPageChange?: (page: string) => void }) => {
  const [botRunning, setBotRunning] = useState(false);
  const [liveTick, setLiveTick] = useState({ symbol: '...', price: 0, change: 0, change_pct: 0 });
  const [sysLog, setSysLog] = useState('Initializing pipelines...');
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [activeSymbol, setActiveSymbol] = useState('NIFTY');
  const [inputValue, setInputValue] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { messages, loading: chatLoading, sendMessage } = useChat(onPageChange);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadSymbol = useCallback((sym: string) => {
    const clean = sym.toUpperCase().trim();
    setActiveSymbol(clean);
    setLoading(true);
    setSnapshot(null);
    setQuote(null);
    Promise.all([
      api.analysis.getSummary(clean).then(setSnapshot).catch(() => {}),
      api.market.getQuote(clean).then(setQuote).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Lifecycles hooks
  useEffect(() => {
    api.bot.getStatus().then(data => setBotRunning(data.loop_running));
    
    // Initial load
    loadSymbol('NIFTY');

    // Listen for symbol-change events from ARIA chat
    const onSymbolChange = (e: Event) => {
      const sym = (e as CustomEvent<string>).detail;
      if (sym) loadSymbol(sym);
    };
    window.addEventListener('symbol-change', onSymbolChange);

    // Connect telemetry websocket
    const cleanupTicker = connectWebsocket('/ws/market-data', (data) => {
      if (data.type === 'TICK') {
        setLiveTick({ symbol: data.symbol, price: data.price, change: data.change ?? 0, change_pct: data.change_pct ?? 0 });
      }
    });

    const cleanupLogs = connectWebsocket('/ws/agent-logs', (data) => {
      setSysLog(data.msg);
    });

    return () => {
      cleanupTicker();
      cleanupLogs();
      window.removeEventListener('symbol-change', onSymbolChange);
    };
  }, [loadSymbol]);

  const toggleBot = async () => {
    if (botRunning) {
      await api.bot.stop();
      setBotRunning(false);
    } else {
      await api.bot.start();
      setBotRunning(true);
    }
  };

  // Scroll chat log to bottom when messages update
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || chatLoading) return;
    const msg = inputValue.trim();
    setInputValue('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto py-8 px-6 space-y-8">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-mono font-semibold transition-all animate-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-bullish text-bg-app shadow-bullish/30'
            : 'bg-bearish text-white shadow-bearish/30'
        }`}>
          {toast.text}
        </div>
      )}
      
      {/* Top action bar */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-text-muted font-mono bg-bg-sidebar/50 px-3 py-1 rounded-md border border-border-subtle flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${liveTick.price > 0 ? 'bg-bullish animate-pulse' : 'bg-border-medium'}`} />
          {liveTick.symbol} ₹{liveTick.price.toFixed(2)}
          {liveTick.change_pct !== 0 && (
            <span className={liveTick.change_pct >= 0 ? 'text-bullish' : 'text-bearish'}>
              {liveTick.change_pct >= 0 ? '+' : ''}{liveTick.change_pct.toFixed(2)}%
            </span>
          )}
        </div>
        <form onSubmit={e => { e.preventDefault(); const v = (e.currentTarget.querySelector('input') as HTMLInputElement).value.trim(); if (v) loadSymbol(v); }} className="flex items-center gap-1 bg-bg-sidebar border border-border-medium rounded-md px-3 py-1.5 text-sm font-mono shadow-sm hover:border-brand/40 transition-colors">
          <span className="text-text-muted text-xs">analyze</span>
          <input
            defaultValue={activeSymbol}
            key={activeSymbol}
            onBlur={e => { const v = e.target.value.trim(); if (v && v !== activeSymbol) loadSymbol(v); }}
            className="bg-transparent text-white font-semibold outline-none w-24 uppercase"
            placeholder="SYMBOL"
          />
        </form>
      </div>

      {/* Main Analysis Container */}
      <div className="flex-1 flex flex-col min-h-0 border border-border-subtle rounded-xl bg-bg-app shadow-2xl overflow-hidden">
        
        {/* Container Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-start bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="space-y-1">
            <div className="text-xs text-text-muted tracking-widest font-semibold uppercase flex space-x-2 items-center">
              <div className={`w-1.5 h-1.5 rounded-full ${botRunning ? 'bg-bullish animate-ping' : 'bg-bearish'}`} />
              <span>Analysis</span>
              <span>·</span>
              <span>{botRunning ? 'Active Engine' : 'Idle'}</span>
            </div>
            <div className="flex items-baseline space-x-3">
              <h1 className="text-3xl font-bold tracking-tight text-white font-mono">{activeSymbol}</h1>
              <span className="text-lg text-text-muted font-medium">NSE</span>
              {quote && (
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-xl font-bold font-mono text-white">₹{quote.price?.toFixed(2)}</span>
                  <span className={`text-sm font-semibold ${quote.change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {quote.change >= 0 ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({quote.change_pct?.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleBot}
              className={`flex items-center space-x-2 text-xs font-medium border px-4 py-2 rounded-md transition-all duration-200 ${
                botRunning 
                ? 'text-bearish border-bearish/30 bg-bearish-dark hover:bg-bearish/20' 
                : 'text-bullish border-bullish/30 bg-bullish-dark hover:bg-bullish/20'
              }`}>
              <span>{botRunning ? '✕' : '▶'}</span>
              <span>{botRunning ? 'Stop Engine' : 'Start Engine'}</span>
            </button>
            <div className="p-2 bg-bg-sidebar rounded-md border border-border-medium text-text-muted hover:text-white transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>
            </div>
          </div>
        </div>

        {/* Phase Container */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            
            <div className="flex items-center justify-between text-xs font-semibold tracking-wider">
              <span className="text-text-muted">PHASE 1 — ANALYST TEAM</span>
              <span className="text-brand/60 font-mono transition-all">{sysLog}</span>
            </div>

            {/* Grid of Cards */}
            {loading ? (
              <div className="h-48 flex items-center justify-center text-text-muted font-mono animate-pulse">Calculating real-time compute metrics...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <Card 
                  title="Technical" 
                  state={snapshot?.verdict || "N/A"} 
                  percentage={String(snapshot?.score || 0)} 
                  colorClass={snapshot?.verdict === 'BULLISH' ? "text-bullish" : snapshot?.verdict === 'BEARISH' ? "text-bearish" : "text-neutral"} 
                  borderColorClass={snapshot?.verdict === 'BULLISH' ? "border-bullish/30" : snapshot?.verdict === 'BEARISH' ? "border-bearish/30" : "border-neutral/30"}>
                  <p>· RSI: {snapshot?.rsi || 'N/A'}</p>
                  <p>· MACD Hist: {snapshot?.macd_hist || 'N/A'}</p>
                  <p>· LTP: ₹{snapshot?.ltp}</p>
                  <p>· Support: {snapshot?.support}</p>
                  <p>· Resistance: {snapshot?.resistance}</p>
                </Card>

                <Card title="Fundamental" state="NEUTRAL" percentage="43" colorClass="text-neutral" borderColorClass="border-neutral/30">
                  <p>· PE: 56.3</p>
                  <p>· ROE: 77.5%</p>
                  <p>· ROCE: 15.5%</p>
                  <p>· Profit Growth: -77.6%</p>
                  <p>· Promoter Holding: 41.6%</p>
                  <p>· Overall: WEAK</p>
                </Card>

              <Card title="Options" state="BULLISH" percentage="70" colorClass="text-bullish" borderColorClass="border-bullish/30">
                <p>· PCR: 0.65 (bullish — heavy call writing)</p>
                <p>· Max Pain: 4600.0</p>
                <p>· IV Rank: 100.0 (elevated — good for selling premium)</p>
              </Card>
              
              <div className="rounded-md border border-border-subtle p-4 flex items-center justify-center bg-card/50 hover:border-border-medium transition-colors">
                <span className="text-xs text-text-muted font-medium">News / Macro Scanner</span>
              </div>

              <Card title="Sentiment" state="BULLISH" percentage="85" colorClass="text-bullish" borderColorClass="border-bullish/30">
                <p>· Flow signal: NEUTRAL_TO_BULLISH (conf: 65%)</p>
                <p>· FII-DII divergence: FII_SELL_DII_BUY</p>
                <p>· Breadth: Strong (15.7 A/D)</p>
                <p>· PCR: 0.65 (bullish sentiment)</p>
              </Card>

              <Card title="Sector" state="NEUTRAL" percentage="30" colorClass="text-neutral" borderColorClass="border-neutral/30">
                <p>· Strongest sector: REALTY (+6.9%)</p>
                <p>· Weakest sector: IT (+0.3%)</p>
                <p className="text-bearish/80">· Sector mapping not available for INDIGO</p>
              </Card>

              <Card title="Risk" state="NEUTRAL" percentage="70" colorClass="text-neutral" borderColorClass="border-neutral/30">
                <p>· VIX: 19.6 — Elevated. Use hedged strategies</p>
                <p>· Max risk per trade: 2% of 1,000,000 = 20,000</p>
                <p className="text-neutral">· RECOMMENDATION: Use defined-risk strategies only</p>
              </Card>

            </div>
            )}

            {/* Bottom Phase Indicators */}
            <div className="flex space-x-12 pt-8 border-t border-border-subtle/50 text-xs text-text-muted font-medium">
              <div className="flex items-center space-x-2 opacity-50">
                <div className="w-3 h-3 rounded-full border border-text-muted"></div>
                <span>Phase 2 — Debate</span>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <div className="w-3 h-3 rounded-full border border-text-muted"></div>
                <span>Phase 3 — Synthesis</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Chat Terminal Log */}
      {messages.length > 0 && (
        <div className="bg-bg-app border border-border-subtle rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-white/[0.02] border-b border-border-subtle flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-xs font-mono text-text-muted font-semibold uppercase tracking-wider">ARIA Terminal</span>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 text-xs font-mono ${
                msg.role === 'user' ? 'text-brand/80' : 'text-text-primary'
              }`}>
                <span className="text-text-muted shrink-0">{msg.timestamp}</span>
                <span className="shrink-0 opacity-50">{msg.role === 'user' ? '>' : '◆'}</span>
                <span className="leading-relaxed">{msg.text}</span>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3 text-xs font-mono text-text-muted">
                <span className="animate-pulse">◆ Processing command...</span>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Bottom Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center space-x-2 text-brand">
            <div className={`w-1.5 h-1.5 bg-brand rotate-45 ${chatLoading ? 'animate-spin' : botRunning ? 'animate-pulse' : ''}`}></div>
            <span>{chatLoading ? 'ARIA processing...' : botRunning ? 'Autopilot engaged. Listening to follow-ups...' : 'ARIA ready. Awaiting command.'}</span>
          </div>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand">
            <span className="font-mono">{'>'}</span>
          </div>
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={chatLoading}
            className="w-full bg-bg-app border border-border-medium rounded-lg py-4 pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-mono shadow-lg shadow-black/20 disabled:opacity-60"
            placeholder={chatLoading ? 'ARIA processing...' : 'Buy 10 Reliance · Analyze NIFTY · Show my funds · Go to Risk Report...'}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button 
              aria-label="Execute command"
              onClick={handleSend}
              disabled={chatLoading || !inputValue.trim()}
              className="text-text-muted hover:text-brand transition-colors bg-bg-sidebar p-1 rounded disabled:opacity-40"
            >
              {chatLoading ? (
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="flex flex-wrap gap-2 text-[10px] text-text-muted/60 font-mono">
          {["buy 10 RELIANCE", "analyze NIFTY", "check funds", "set alert INFY 1500", "go to risk report", "scan"].map((cmd, i) => (
            <span 
              key={i} 
              onClick={() => setInputValue(cmd)}
              className="cursor-pointer hover:text-brand transition-colors"
            >
              {cmd} {i < 5 ? '·' : ''}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AnalysisDashboard;
