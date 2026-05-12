import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnalysisDashboard from './components/AnalysisDashboard';
import MorningBriefView from './components/MorningBriefView';
import HoldingsView from './components/HoldingsView';
import PositionsView from './components/PositionsView';
import OrdersView from './components/OrdersView';
import FundsView from './components/FundsView';
import AlertsView from './components/AlertsView';
import FIIDIIView from './components/FIIDIIView';
import ScanView from './components/ScanView';
import MemoryView from './components/MemoryView';
import PlaceholderView from './components/PlaceholderView';

const PLACEHOLDER_ICONS: Record<string, string> = {
  'Patterns': '🧩', 'GEX': '⚡', 'IV Smile': '😊',
  'Risk Report': '🛡️', 'Strategy': '🎯', 'Delta Hedge': '⚖️',
  'What-If': '🔮', 'Drift': '🛶',
};

export default function App() {
  const [activePage, setActivePage] = useState('Morning Brief');

  const renderContent = () => {
    switch (activePage) {
      case 'Morning Brief': return <MorningBriefView />;
      case 'Holdings':     return <HoldingsView />;
      case 'Positions':    return <PositionsView />;
      case 'Orders':       return <OrdersView />;
      case 'Funds':        return <FundsView />;
      case 'Alerts':       return <AlertsView />;
      case 'FII/DII Flows': return <FIIDIIView />;
      case 'Scan':         return <ScanView />;
      case 'Memory':       return <MemoryView />;
      // Analysis dashboard handles the symbol-analyze flow
      case 'Analysis':     return <AnalysisDashboard />;
      default:
        return <PlaceholderView name={activePage} icon={PLACEHOLDER_ICONS[activePage] || '💡'} />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-app text-text-primary font-sans overflow-hidden">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex-1 flex flex-col min-w-0 bg-bg-app relative">
        <Header />
        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
