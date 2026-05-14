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

// Primary nav tabs — shown in TopNav
const PRIMARY_TABS = ['Dashboard', 'Orders', 'Holdings', 'Positions', 'Bids', 'Funds'];

export default function App() {
  const [activePage, setActivePage] = useState('Dashboard');

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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-black text-[#f7ddd2]">
      {/* Top Navigation */}
      <TopNav activePage={activePage} onPageChange={setActivePage} />
      <TVTicker />

      {/* Body: Watchlist Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Watchlist sidebar — shown always */}
        <WatchlistSidebar />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* If on a secondary page, show a mini secondary sidebar */}
          {!isPrimaryTab && (
            <div className="w-[180px] flex-shrink-0 bg-[#0d0d0d] border-r border-[#333333] flex flex-col py-4 px-2 gap-0.5 overflow-y-auto hide-scrollbar">
              <div className="text-[10px] font-semibold text-[#888] uppercase tracking-wider px-2 mb-2">Tools</div>
              {[
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
                  className={`text-left px-2 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors ${
                    activePage === name
                      ? 'bg-white/5 text-primary border-l-2 border-primary pl-1.5'
                      : 'text-[#e2bfb0] hover:bg-white/5 hover:text-[#f7ddd2]'
                  }`}
                >
                  <span className="text-sm opacity-70">{icon}</span>
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Floating AI Chat — always rendered, toggled by FAB */}
      <AIChatbox />
    </div>
  );
}
