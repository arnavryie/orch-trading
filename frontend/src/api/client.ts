const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export const api = {
  broker: {
    getStatus: () => fetch(`${API_BASE}/api/broker/status`).then(r => r.json()),
    getFunds: () => fetch(`${API_BASE}/api/broker/funds`).then(r => r.json()),
    getHoldings: () => fetch(`${API_BASE}/api/broker/holdings`).then(r => r.json()),
    getOrders: () => fetch(`${API_BASE}/api/broker/orders`).then(r => r.json()),
  },
  bot: {
    getStatus: () => fetch(`${API_BASE}/api/bot/status`).then(r => r.json()),
    start: () => fetch(`${API_BASE}/api/bot/start`, { method: 'POST' }).then(r => r.json()),
    stop: () => fetch(`${API_BASE}/api/bot/stop`, { method: 'POST' }).then(r => r.json()),
  },
  analysis: {
    getSummary: (symbol: string) => fetch(`${API_BASE}/api/analysis/summary/${symbol}`).then(r => r.json()),
  }
};

// Helper hook creator for websocket connection tracking
export function connectWebsocket(path: string, onMessage: (data: any) => void) {
  const socket = new WebSocket(`${WS_BASE}${path}`);
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error("WS Parse Fail", e);
    }
  };
  return () => socket.close();
}
