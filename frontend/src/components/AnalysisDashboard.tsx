import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  state: string;
  percentage: string;
  children: ReactNode;
  colorClass: string;
  borderColorClass: string;
}

const Card = ({ title, state, percentage, children, colorClass, borderColorClass }: CardProps) => (
  <div className={`rounded-md border ${borderColorClass} p-4 flex flex-col space-y-3 bg-card backdrop-blur-xs`}>
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

const AnalysisDashboard = () => {
  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto py-8 px-6 space-y-8">
      
      {/* Top action bar */}
      <div className="flex justify-end">
        <div className="bg-bg-sidebar border border-border-medium rounded-md px-4 py-2 flex items-center space-x-2 text-sm text-text-primary font-mono shadow-sm">
          <span>analyze</span>
          <span className="font-semibold">INDIGO</span>
        </div>
      </div>

      {/* Main Analysis Container */}
      <div className="flex-1 flex flex-col min-h-0 border border-border-subtle rounded-xl bg-bg-app shadow-2xl overflow-hidden">
        
        {/* Container Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-xs text-text-muted tracking-widest font-semibold uppercase flex space-x-2">
              <span>Analysis</span>
              <span>·</span>
              <span>Initialising...</span>
            </div>
            <div className="flex items-baseline space-x-3">
              <h1 className="text-3xl font-bold tracking-tight text-white font-mono">INDIGO</h1>
              <span className="text-lg text-text-muted font-medium">NSE</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-xs font-medium text-bearish border border-bearish/30 bg-bearish-dark px-3 py-1.5 rounded-md hover:bg-bearish/20 transition-colors">
              <span>✕</span>
              <span>Stop</span>
            </button>
            <div className="p-2 bg-bg-sidebar rounded-md border border-border-medium text-text-muted hover:text-white transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>
            </div>
          </div>
        </div>

        {/* Phase Container */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            
            <div className="flex items-center space-x-3 text-xs text-text-muted font-semibold tracking-wider">
              <span>PHASE 1 — ANALYST TEAM</span>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Card title="Technical" state="NEUTRAL" percentage="17" colorClass="text-neutral" borderColorClass="border-neutral/30">
                <p>· RSI: 58.7 (neutral)</p>
                <p>· MACD: bearish crossover</p>
                <p>· EMA20 below EMA50 (short-term trend down)</p>
                <p>· Support: 4202.73</p>
                <p>· Resistance: 4312.13</p>
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
              
              <div className="rounded-md border border-border-subtle p-4 flex items-center justify-center bg-card/50">
                <span className="text-xs text-text-muted font-medium">News / Macro</span>
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

      {/* Bottom Input */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-xs text-brand font-medium">
          <div className="w-1.5 h-1.5 bg-brand rotate-45"></div>
          <span>Analysis running — add context to inject into the follow-up</span>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand">
            <span className="font-mono">{'>'}</span>
          </div>
          <input 
            type="text" 
            className="w-full bg-bg-app border border-border-medium rounded-lg py-4 pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-mono"
            placeholder="Analysis in progress — type to add context..."
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <button className="text-text-muted hover:text-brand transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="flex flex-wrap gap-2 text-[10px] text-text-muted/60 font-mono">
          <span>analyze INFY</span>
          <span>·</span>
          <span>oi NIFTY</span>
          <span>·</span>
          <span>greeks</span>
          <span>·</span>
          <span>scan</span>
          <span>·</span>
          <span>funds</span>
          <span>·</span>
          <span>orders</span>
          <span>·</span>
          <span>alerts</span>
          <span>·</span>
          <span>patterns</span>
          <span>·</span>
          <span>da RELIANCE</span>
          <span>·</span>
          <span>iv-smile NIFTY</span>
          <span>·</span>
          <span>gex NIFTY</span>
          <span>·</span>
          <span>delta-hedge</span>
          <span>·</span>
          <span>risk-report</span>
          <span>·</span>
          <span>walkforward NIFTY rsi</span>
          <span>·</span>
          <span>whatif nifty -5</span>
          <span>·</span>
          <span>strategy NIFTY bullish</span>
          <span>·</span>
          <span>drift</span>
          <span>·</span>
          <span>memory</span>
          <span>·</span>
          <span>audit &lt;id&gt;</span>
          <span>·</span>
          <span>telegram</span>
          <span>·</span>
          <span>provider</span>
          <span>·</span>
          <span>pairs RELIANCE TCS</span>
        </div>
      </div>

    </div>
  );
};

export default AnalysisDashboard;
