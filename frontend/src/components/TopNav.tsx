import { useState, useEffect } from 'react';
import { api } from '../api/client';

type Tab = 'Dashboard' | 'Orders' | 'Holdings' | 'Positions' | 'Bids' | 'Funds';

type Props = {
  activePage: string;
  onPageChange: (page: string) => void;
};

const NAV_TABS: Tab[] = ['Dashboard', 'Orders', 'Holdings', 'Positions', 'Bids', 'Funds'];

export default function TopNav({ activePage, onPageChange }: Props) {
  const [health, setHealth] = useState<any>({ status: 'unknown', market: 'unknown' });

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    const iv = setInterval(() => api.health().then(setHealth).catch(() => {}), 60000);
    return () => clearInterval(iv);
  }, []);

  const isMarketOpen = health.market_open === true;

  return (
    <nav className="flex-shrink-0 h-16 w-full bg-[#0d0d0d] border-b border-[#333333] flex items-center justify-between px-6 z-50">
      {/* Left: Logo + Nav tabs */}
      <div className="flex items-center gap-8 h-full">
        <div className="text-[18px] font-black text-primary tracking-tighter uppercase leading-none select-none">
          orch-trade
        </div>

        <div className="hidden md:flex h-full items-end gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = activePage === tab;
            return (
              <button
                key={tab}
                onClick={() => onPageChange(tab)}
                className={`h-full px-4 text-[11px] font-semibold tracking-wider uppercase transition-colors duration-200 border-b-2 flex items-center ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-[#e2bfb0] border-transparent hover:text-primary'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: market status, icons, user */}
      <div className="flex items-center gap-3">
        {/* Market status pill */}
        {health.market !== 'unknown' && (
          <div className={`hidden lg:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            isMarketOpen
              ? 'bg-[#40e56c]/10 text-[#40e56c] border-[#40e56c]/30'
              : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-[#40e56c] animate-pulse' : 'bg-[#f59e0b]'}`} />
            {isMarketOpen ? 'Open' : 'Closed'}
          </div>
        )}

        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#e2bfb0] hover:text-primary hover:bg-[#1a1a1a] transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#e2bfb0] hover:text-primary hover:bg-[#1a1a1a] transition-colors"
          aria-label="Apps"
        >
          <span className="material-symbols-outlined text-[20px]">apps</span>
        </button>

        <div className="flex items-center gap-2 border-l border-[#333333] pl-3 ml-1">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[#562000] text-[11px] font-black select-none">
            D
          </div>
          <span className="hidden md:block text-[11px] font-semibold text-[#e2bfb0] tracking-wider uppercase">
            DEMOUSER
          </span>
        </div>
      </div>
    </nav>
  );
}
