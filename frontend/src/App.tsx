import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnalysisDashboard from './components/AnalysisDashboard';
import HoldingsView from './components/HoldingsView';
import OrdersView from './components/OrdersView';
import FundsView from './components/FundsView';
import PlaceholderView from './components/PlaceholderView';

export default function App() {
  const [activePage, setActivePage] = useState('Morning Brief');

  const renderContent = () => {
    switch (activePage) {
      case 'Morning Brief':
      case 'Scan':
        return <AnalysisDashboard />;
      case 'Holdings':
        return <HoldingsView />;
      case 'Orders':
        return <OrdersView />;
      case 'Funds':
        return <FundsView />;
      default:
        // For remaining placeholder ones like Alerts, Positions etc.
        const iconMap: Record<string, string> = {
          'Positions': '📈', 'Alerts': '🔔', 'FII/DII Flows': '🌊', 
          'Patterns': '🧩', 'GEX': '⚡', 'IV Smile': '😊', 
          'Risk Report': '🛡️', 'Strategy': '🎯', 'Delta Hedge': '⚖️', 
          'What-If': '🔮', 'Drift': '🛶', 'Memory': '🧠'
        };
        return <PlaceholderView name={activePage} icon={iconMap[activePage] || '💡'} />;
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
