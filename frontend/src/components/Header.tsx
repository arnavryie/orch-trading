import { useState, useEffect } from 'react';
import { api } from '../api/client';

const Header = () => {
  const [health, setHealth] = useState<any>({ status: 'unknown', market: 'unknown' });

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  const isMarketOpen = health.market === 'open';

  return (
    <div className="h-14 flex-shrink-0 border-b border-border-subtle bg-bg-app flex items-center justify-between px-6">
      <div className="flex-1 flex items-center">
        {health.market !== 'unknown' && (
          <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1.5 ${isMarketOpen ? 'bg-bullish/10 text-bullish border border-bullish/20' : 'bg-neutral/10 text-neutral border border-neutral/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-bullish animate-pulse' : 'bg-neutral'}`}></div>
            {isMarketOpen ? 'Market Open' : 'Market Closed'}
          </div>
        )}
      </div>
      
      {/* Center Logo */}
      <div className="flex items-center space-x-2 flex-1 justify-center">
        <div className="w-2.5 h-2.5 bg-brand rotate-45 shadow-[0_0_8px_rgba(88,166,255,0.5)]"></div>
        <span className="font-semibold text-text-primary tracking-wide text-sm font-mono">Vibe Trading</span>
      </div>

      {/* Right Status */}
      <div className="flex-1 flex justify-end items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs text-text-muted font-mono">
          <div className={`w-1.5 h-1.5 rounded-full ${health.status === 'ok' ? 'bg-bullish' : 'bg-bearish'}`}></div>
          <span>API: {health.broker || 'Demo'}</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
