import { useState, useEffect } from 'react';
import { api } from '../api/client';

type Props = {
  activePage: string;
  onPageChange: (page: string) => void;
};

const Sidebar = ({ activePage, onPageChange }: Props) => {
  const [atStatus, setAtStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = () => api.autoTrader.status().then(setAtStatus).catch(() => {});
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const quickLinks = [
    { name: 'Morning Brief', icon: '☀️' },
    { name: 'Analysis', icon: '🤖' },
    { name: 'Holdings', icon: '📊' },
    { name: 'Positions', icon: '📈' },
    { name: 'Orders', icon: '📋' },
    { name: 'Funds', icon: '💰' },
    { name: 'Alerts', icon: '🔔' },
    { name: 'FII/DII Flows', icon: '🌊' },
    { name: 'Patterns', icon: '🧩' },
    { name: 'Scan', icon: '🔍' },
    { name: 'GEX', icon: '⚡' },
    { name: 'IV Smile', icon: '😊' },
    { name: 'Risk Report', icon: '🛡️' },
    { name: 'Strategy', icon: '🎯' },
    { name: 'Delta Hedge', icon: '⚖️' },
    { name: 'What-If', icon: '🔮' },
    { name: 'Drift', icon: '🛶' },
    { name: 'Memory', icon: '🧠' },
    { name: 'Settings', icon: '⚙️' },
  ];

  const isRunning = atStatus?.running;

  return (
    <div className="w-[260px] flex-shrink-0 bg-bg-sidebar border-r border-border-subtle flex flex-col h-full text-sm">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 custom-scrollbar">
        {/* Broker Section */}
        <div className="mb-8">
          <h3 className="text-text-muted text-xs font-semibold tracking-wider mb-4 uppercase flex justify-between items-center">
            <span>Broker</span>
            {atStatus && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${isRunning ? 'bg-bullish/20 text-bullish' : 'bg-white/10 text-text-muted'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-bullish animate-pulse' : 'bg-text-muted'}`}></div>
                AUTO
              </span>
            )}
          </h3>
          <button className="w-full text-left px-2 py-1.5 flex items-center space-x-3 text-text-primary hover:bg-white/5 rounded-md transition-colors group">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-bullish"></div>
            </div>
            <span className="font-medium">Demo Trading</span>
          </button>
        </div>

        {/* Quick Links Section */}
        <div>
          <h3 className="text-text-muted text-xs font-semibold tracking-wider mb-4 uppercase">Quick</h3>
          <div className="space-y-0.5">
            {quickLinks.map((link) => {
              const isActive = activePage === link.name;
              return (
                <button
                  key={link.name}
                  onClick={() => onPageChange(link.name)}
                  className={`w-full text-left px-2 py-1.5 flex items-center space-x-3 rounded-md transition-all group duration-200 ${
                    isActive 
                    ? 'bg-white/[0.05] text-white border-l-2 border-brand pl-1.5' 
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  <span className={`opacity-70 text-base group-hover:scale-110 transition-transform ${isActive ? 'opacity-100' : ''}`}>{link.icon}</span>
                  <span className={isActive ? 'font-semibold text-brand' : ''}>{link.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 w-[260px] p-4 bg-bg-sidebar/90 backdrop-blur-sm border-t border-border-subtle">
        <div className="text-text-muted text-xs opacity-50 hover:opacity-100 transition-opacity">
          India Trade v0.2
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

