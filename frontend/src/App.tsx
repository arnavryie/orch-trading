import { useState } from 'react';
import TopNav from './components/TopNav';
import WatchlistSidebar from './components/WatchlistSidebar';
import { AIChatbox } from './components/AIChatbox';
import { TVTicker } from './components/TVTicker';
import DashboardView from './components/DashboardView';
import HoldingsView from './components/HoldingsView';
import PositionsView from './components/PositionsView';
import OrdersView from './components/OrdersView';
import FundsView from './components/FundsView';
import MorningBriefView from './components/MorningBriefView';
import AnalysisDashboard from './components/AnalysisDashboard';
import AlertsView from './components/AlertsView';
import FIIDIIView from './components/FIIDIIView';
import ScanView from './components/ScanView';
import MemoryView from './components/MemoryView';
import PatternsView from './components/PatternsView';
import GEXView from './components/GEXView';
import IVSmileView from './components/IVSmileView';
import RiskReportView from './components/RiskReportView';
import StrategyView from './components/StrategyView';
import DeltaHedgeView from './components/DeltaHedgeView';
import WhatIfView from './components/WhatIfView';
import DriftView from './components/DriftView';
import SettingsView from './components/SettingsView';
import PlaceholderView from './components/PlaceholderView';
import RecentInvocations from './components/RecentInvocations';
import CouncilView from './components/CouncilView';
import OrderPad from './components/OrderPad';
import AutoTraderView from './components/AutoTraderView';
import TrackRecordView from './components/TrackRecordView';
import DigestView from './components/DigestView';

// Primary nav tabs — shown in TopNav
const PRIMARY_TABS = ['Dashboard', 'Orders', 'Holdings', 'Positions', 'Bids', 'Funds'];

export default function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [orderPad, setOrderPad] = useState<{ open: boolean; symbol: string; side: 'BUY'|'SELL'; price: number }>({
    open: false, symbol: '', side: 'BUY', price: 0,
  });
  const [chartSymbol, setChartSymbol] = useState('NIFTY');

  const openOrderPad = (symbol: string, side: 'BUY'|'SELL', price: number) =>
    setOrderPad({ open: true, symbol, side, price });

  const renderContent = () => {
    switch (activePage) {
      // Primary nav pages (new ProTrade UI)
      case 'Dashboard':   return <DashboardView />;
      case 'Orders':      return <OrdersView />;
      case 'Holdings':    return <HoldingsView />;
      case 'Positions':   return <PositionsView />;
      case 'Funds':       return <FundsView />;
      case 'Bids':        return <PlaceholderView name="Bids" icon="🏷️" />;

      // Secondary pages (accessible via legacy sidebar or Analysis)
      case 'Auto Trader':  return <AutoTraderView />;
      case 'Track Record': return <TrackRecordView />;
      case 'Digest':       return <DigestView />;
      case 'Council':      return <CouncilView />;
      case 'Morning Brief': return <MorningBriefView />;
      case 'Analysis':     return <AnalysisDashboard onPageChange={setActivePage} />;
      case 'Alerts':       return <AlertsView />;
      case 'FII/DII Flows': return <FIIDIIView />;
      case 'Scan':         return <ScanView />;
      case 'Memory':       return <MemoryView />;
      case 'Patterns':     return <PatternsView />;
      case 'GEX':          return <GEXView />;
      case 'IV Smile':     return <IVSmileView />;
      case 'Risk Report':  return <RiskReportView />;
      case 'Strategy':     return <StrategyView />;
      case 'Delta Hedge':  return <DeltaHedgeView />;
      case 'What-If':      return <WhatIfView />;
      case 'Drift':        return <DriftView />;
      case 'Settings':     return <SettingsView />;
      case 'Invocations':  return <RecentInvocations data={null} />;
      default:             return <PlaceholderView name={activePage} icon="💡" />;
    }
  };

  const isPrimaryTab = PRIMARY_TABS.includes(activePage);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-white">
      {/* Top Navigation */}
      <TopNav activePage={activePage} onPageChange={setActivePage} />
      <TVTicker />

      {/* Body: Watchlist Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pass handlers to the watchlist */}
        <WatchlistSidebar
          onTrade={openOrderPad}
          onChart={(s) => { setChartSymbol(s); setActivePage('Dashboard'); }}
        />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* If on a secondary page, show a mini secondary sidebar */}
          {!isPrimaryTab && (
            <div className="w-[176px] flex-shrink-0 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col py-3 px-2 gap-0.5 overflow-y-auto hide-scrollbar">
              <div className="text-[9px] font-bold text-[#444] uppercase tracking-[0.12em] px-2 mb-2">AI Tools</div>
              {[
                ['Auto Trader', '⚙️'],
                ['Track Record', '🏆'],
                ['Digest', '🗞️'],
                ['Council', '🏛️'],
                ['Morning Brief', '☀️'],
                ['Analysis', '🤖'],
                ['Alerts', '🔔'],
                ['FII/DII Flows', '🌊'],
                ['Patterns', '🧩'],
                ['Scan', '🔍'],
                ['GEX', '⚡'],
                ['IV Smile', '😊'],
                ['Risk Report', '🛡️'],
                ['Strategy', '🎯'],
                ['Delta Hedge', '⚖️'],
                ['What-If', '🔮'],
                ['Drift', '🛶'],
                ['Memory', '🧠'],
                ['Invocations', '📋'],
                ['Settings', '⚙️'],
              ].map(([name, icon]) => (
                <button
                  key={name}
                  onClick={() => setActivePage(name)}
                  className={`text-left px-2 py-1.5 rounded text-[12px] flex items-center gap-2 transition-smooth btn-press ${
                    activePage === name
                      ? 'bg-[#4184f3]/10 text-[#4184f3] border-l-2 border-[#4184f3] pl-1.5'
                      : 'text-[#666] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-sm opacity-70">{icon}</span>
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Page content — add the page-enter animation via a key change */}
          <main className="flex-1 overflow-hidden flex flex-col">
            <div key={activePage} className="page-enter flex-1 overflow-hidden flex flex-col">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Floating AI Chat — always rendered, toggled by FAB */}
      <AIChatbox />

      {/* Slide-in order pad */}
      <OrderPad
        open={orderPad.open}
        symbol={orderPad.symbol}
        side={orderPad.side}
        price={orderPad.price}
        onClose={() => setOrderPad({ ...orderPad, open: false })}
        onDone={() => { /* optionally refresh holdings */ }}
      />
    </div>
  );
}
