const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const WS_BASE = API_BASE ? API_BASE.replace(/^http/, 'ws') : `ws://localhost:8765`;

const get = (path: string) => fetch(`${API_BASE}${path}`).then(r => r.json());
const post = (path: string, body?: any) => fetch(`${API_BASE}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
}).then(r => r.json());
const del = (path: string) => fetch(`${API_BASE}${path}`, { method: 'DELETE' }).then(r => r.json());

export const api = {
  broker: {
    getStatus:   () => get('/api/health'),
    getFunds:    () => get('/api/funds'),
    getHoldings: () => get('/api/holdings'),
    getPositions: () => get('/api/positions'),
    getOrders:   () => get('/api/orders'),
    placeOrder:  (body: any) => post('/api/order', body),
    cancelOrder: (id: string) => del(`/api/order/${id}`),
  },
  bot: {
    getStatus: () => get('/api/bot/status'),
    start: () => post('/api/bot/start'),
    stop:  () => post('/api/bot/stop'),
  },
  market: {
    getQuote: (symbol: string) => get(`/api/quote/${symbol}`),
    getChart: (symbol: string, period = '3mo', interval = '1d') =>
      get(`/api/chart/${symbol}?period=${period}&interval=${interval}`),
    getScan: () => get('/api/scan'),
    getFlows: () => get('/api/flows'),
    getGEX: (symbol = 'NIFTY') => get(`/api/gex/${symbol}`),
    getIVSmile: (symbol = 'NIFTY') => get(`/api/iv-smile/${symbol}`),
    getPatterns: () => get('/api/patterns'),
    getMorningBrief: () => get('/api/morning-brief'),
  },
  analysis: {
    getSummary: (symbol: string) => get(`/api/analysis/summary/${symbol}`),
    analyze: (symbol: string) => post('/api/analyze', { symbol }),
  },
  risk: {
    getReport: () => get('/api/risk-report'),
    getStrategy: () => get('/api/strategy'),
    getDeltaHedge: () => get('/api/delta-hedge'),
    getWhatIf: (symbol: string, change_pct: number) =>
      get(`/api/what-if?symbol=${symbol}&change_pct=${change_pct}`),
    getDrift: () => get('/api/drift'),
  },
  alerts: {
    getAll: () => get('/api/alerts'),
    add: (body: any) => post('/api/alerts', body),
    remove: (id: string) => del(`/api/alerts/${id}`),
  },
  memory: {
    getAll: () => get('/api/memory'),
  },
  settings: {
    get: () => get('/api/settings'),
    save: (body: any) => post('/api/settings', body),
  },
  demo: {
    reset: () => post('/api/demo/reset'),
  },
  autoTrader: {
    start: () => post('/api/auto-trader/start'),
    stop:  () => post('/api/auto-trader/stop'),
    status: () => get('/api/auto-trader/status'),
  },
  health: () => get('/api/health'),
  chat: (message: string, context?: Record<string, unknown>) => post('/api/chat', { message, context: context ?? {} }),
};

export function connectWebsocket(path: string, onMessage: (data: any) => void) {
  const socket = new WebSocket(`${WS_BASE}${path}`);
  socket.onmessage = (event) => {
    try { onMessage(JSON.parse(event.data)); } catch {}
  };
  return () => socket.close();
}
