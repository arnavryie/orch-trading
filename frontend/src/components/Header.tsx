import { useState, useEffect } from 'react';
import { api } from '../api/client';

const Header = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    api.broker.getStatus().then(data => setConnected(data.connected)).catch(() => {});
  }, []);

  return (
    <div className="h-14 flex-shrink-0 border-b border-border-subtle bg-bg-app flex items-center justify-between px-6">
      <div className="flex-1"></div>
      
      {/* Center Logo */}
      <div className="flex items-center space-x-2 flex-1 justify-center">
        <div className="w-2.5 h-2.5 bg-brand rotate-45"></div>
        <span className="font-semibold text-text-primary tracking-wide text-sm">India Trade</span>
      </div>

      {/* Right Status */}
      <div className="flex-1 flex justify-end items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs text-text-muted">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-bullish' : 'bg-bearish'}`}></div>
          <span>API</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-text-muted">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-bullish' : 'bg-neutral'}`}></div>
          <span>{connected ? 'connected' : 'disconnected'}</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
