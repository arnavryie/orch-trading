import { useState, useEffect } from 'react';
import { api } from '../api/client';

type Props = {
  activePage: string;
  onPageChange: (page: string) => void;
};

const NAV_TABS = ['Dashboard', 'Orders', 'Holdings', 'Positions', 'Bids', 'Funds'];

export default function TopNav({ activePage, onPageChange }: Props) {
  const [health, setHealth] = useState<any>({ market_open: false });

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    const iv = setInterval(() => api.health().then(setHealth).catch(() => {}), 60_000);
    return () => clearInterval(iv);
  }, []);

  const isMarketOpen = health.market_open === true;

  return (
    <nav className="flex-shrink-0 h-12 w-full bg-[#0a0a0a] border-b border-[#1e1e1e] flex items-center justify-between px-5 z-50 shadow-[0_1px_0_0_#1e1e1e]">
      {/* Logo + Tabs */}
      <div className="flex items-center gap-6 h-full flex-shrink-0">
        <div className="text-[15px] font-black text-[#4184f3] tracking-tighter uppercase select-none flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">auto_graph</span>
          orch
        </div>

        {/* Nav tabs */}
        <div className="hidden md:flex h-full items-end gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = activePage === tab;
            return (
              <button
                key={tab}
                id={`nav-${tab.toLowerCase()}`}
                onClick={() => onPageChange(tab)}
                className={`h-full px-3.5 text-[12px] transition-smooth border-b-2 flex items-center btn-press ${
                  isActive
                    ? 'text-[#4184f3] border-[#4184f3] font-semibold'
                    : 'text-[#999] border-transparent hover:text-white hover:border-[#333]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 h-full">
        {/* Market status */}
        <div className={`hidden lg:flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wider px-2 py-0.5 rounded border ${
          isMarketOpen
            ? 'bg-[#40e56c]/10 text-[#40e56c] border-[#40e56c]/25'
            : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/25'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isMarketOpen ? 'bg-[#40e56c] animate-pulse' : 'bg-[#f59e0b]'}`} />
          {isMarketOpen ? 'Market Open' : 'Market Closed'}
        </div>

        {/* Bell → Alerts */}
        <button
          id="nav-bell"
          onClick={() => onPageChange('Alerts')}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#666] hover:text-white hover:bg-white/5 transition-smooth btn-press hover:scale-110"
          title="Alerts"
        >
          <span className="material-symbols-outlined text-[19px]">notifications</span>
        </button>

        {/* Hub → Council */}
        <button
          id="nav-council"
          onClick={() => onPageChange('Council')}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#666] hover:text-[#4184f3] hover:bg-[#4184f3]/10 transition-smooth btn-press hover:scale-110"
          title="AI Council"
        >
          <span className="material-symbols-outlined text-[19px]">hub</span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 border-l border-[#1e1e1e] pl-3 ml-1">
          <div className="w-6 h-6 rounded-full bg-[#4184f3]/20 text-[#4184f3] border border-[#4184f3]/30 flex items-center justify-center text-[10px] font-bold select-none">
            D
          </div>
          <span className="hidden md:block text-[11px] text-[#666]">Demo</span>
        </div>
      </div>
    </nav>
  );
}
