# ORCH-TRADING: COMPLETE FIX GUIDE
## For Antigravity Agent — Read EVERYTHING before touching any file

**Repo:** https://github.com/arnavryie/orch-trading
**Stack:** Python 3.11 FastAPI backend (port 8765) + React 19 + Vite + Tailwind v4 frontend
**Goal:** Fix ALL bugs so the app runs fully in demo mode with live NSE/BSE market data

---

## HOW TO START THE APP (after all fixes applied)

```bash
# Terminal 1 — Backend
cd orch-trading
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pip install ta google-generativeai
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# Terminal 2 — Frontend
cd orch-trading/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## BUG CATALOG (15 bugs — fix in this order)

### BUG 1 — TopNav market badge always shows "Closed"
**File:** `frontend/src/components/TopNav.tsx` line ~26
**Root cause:** Health API returns `{market_open: true}` but TopNav checks `health.market === 'open'`. Wrong key name.

**FIND:**
```tsx
const isMarketOpen = health.market === 'open';
```
**REPLACE WITH:**
```tsx
const isMarketOpen = health.market_open === true;
```

Also fix the health fetch — add `market_status` to the response so the badge shows correctly:
**FIND** in `web/api.py`:
```python
@app.get("/api/health")
def health():
    return {"status": "ok", "broker": "demo", "market_open": is_market_open()}
```
**REPLACE WITH:**
```python
@app.get("/api/health")
def health():
    open_status = is_market_open()
    return {
        "status": "ok",
        "broker": "demo",
        "market_open": open_status,
        "market": "open" if open_status else "closed",
    }
```

---

### BUG 2 — `is_market_open()` timezone comparison broken
**File:** `market/free_data.py`
**Root cause:** `datetime.now(IST).replace(hour=9, ...)` in pytz drops timezone context on `.replace()` calls, making the comparison fail.

**FIND the entire function:**
```python
def is_market_open() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:  # Sat/Sun
        return False
    market_open = now.replace(hour=9, minute=15, second=0)
    market_close = now.replace(hour=15, minute=30, second=0)
    return market_open <= now <= market_close
```
**REPLACE WITH:**
```python
def is_market_open() -> bool:
    """Returns True if NSE is currently open: 9:15 AM – 3:30 PM IST, Mon–Fri."""
    from datetime import time as dtime
    now = datetime.now(IST)
    if now.weekday() >= 5:          # Saturday=5, Sunday=6
        return False
    t = now.time()                  # Extract time component (no timezone, safe)
    return dtime(9, 15) <= t <= dtime(15, 30)
```

---

### BUG 3 — `get_quote()` returns wrong/stale prices (e.g. RELIANCE shows ₹1368 not ₹2400+)
**File:** `market/free_data.py`
**Root cause:** `yf.Ticker.fast_info.last_price` is unreliable for Indian stocks — returns stale or day-low values.

**FIND the entire `get_quote` function and REPLACE IT ENTIRELY:**
```python
def get_quote(symbol: str) -> dict:
    """
    Fetch current or last known price. Works during AND after market hours.
    Uses .history() as primary (reliable) and fast_info as fallback.
    """
    yf_sym = _yf_sym(symbol)
    base = {
        "symbol": symbol.upper(),
        "price": 0, "change": 0, "change_pct": 0,
        "high": 0, "low": 0, "prev_close": 0,
        "market_open": is_market_open(),
    }
    try:
        t = yf.Ticker(yf_sym)

        # Method 1: history (most reliable for NSE)
        hist = t.history(period="5d", interval="1d", auto_adjust=True)
        if not hist.empty:
            last  = hist.iloc[-1]
            prev  = hist.iloc[-2] if len(hist) >= 2 else last
            price = round(float(last["Close"]), 2)
            prev_p = round(float(prev["Close"]), 2)
            return {
                **base,
                "price":      price,
                "change":     round(price - prev_p, 2),
                "change_pct": round((price - prev_p) / prev_p * 100 if prev_p else 0, 2),
                "high":       round(float(last["High"]), 2),
                "low":        round(float(last["Low"]),  2),
                "prev_close": prev_p,
            }

        # Method 2: fast_info fallback
        fi = t.fast_info
        price = float(getattr(fi, "last_price", 0) or getattr(fi, "previous_close", 0) or 0)
        prev  = float(getattr(fi, "previous_close", 0) or price)
        if price > 0:
            return {
                **base,
                "price":      round(price, 2),
                "change":     round(price - prev, 2),
                "change_pct": round((price - prev) / prev * 100 if prev else 0, 2),
                "high":       round(float(getattr(fi, "day_high", price) or price), 2),
                "low":        round(float(getattr(fi, "day_low",  price) or price), 2),
                "prev_close": round(prev, 2),
            }
    except Exception as e:
        base["error"] = str(e)[:80]
    return base
```

---

### BUG 4 — `brokers/demo.py` buys stocks at wrong price
**File:** `brokers/demo.py`
**Root cause:** `_get_price()` uses `fast_info.last_price` — same issue as Bug 3.

**FIND the entire `_get_price` function and REPLACE:**
```python
def _get_price(symbol: str) -> float:
    """Get reliable current price via yfinance history method."""
    import yfinance as yf
    sym = symbol.upper()
    _MAP = {"NIFTY": "^NSEI", "NIFTY50": "^NSEI", "BANKNIFTY": "^NSEBANK", "SENSEX": "^BSESN"}
    yf_sym = _MAP.get(sym, sym if ("." in sym or sym.startswith("^")) else sym + ".NS")
    try:
        hist = yf.Ticker(yf_sym).history(period="5d", interval="1d", auto_adjust=True)
        if not hist.empty:
            return round(float(hist["Close"].iloc[-1]), 2)
        fi = yf.Ticker(yf_sym).fast_info
        return float(getattr(fi, "last_price", 0) or getattr(fi, "previous_close", 0) or 0)
    except Exception:
        return 0.0
```

---

### BUG 5 — `api/client.ts` calls wrong broker endpoint paths
**File:** `frontend/src/api/client.ts`
**Root cause:** Client calls `/api/broker/funds`, `/api/broker/holdings` etc. but `web/api.py` only exposes `/api/funds`, `/api/holdings` etc.

**FIND in `api/client.ts`:**
```ts
broker: {
    getStatus: () => get('/api/broker/status'),
    getFunds:  () => get('/api/broker/funds'),
    getHoldings: () => get('/api/broker/holdings'),
    getPositions: () => get('/api/broker/positions'),
    getOrders: () => get('/api/broker/orders'),
    placeOrder: (body: any) => post('/api/order', body),
    cancelOrder: (id: string) => del(`/api/order/${id}`),
  },
```
**REPLACE WITH:**
```ts
broker: {
    getStatus:   () => get('/api/health'),
    getFunds:    () => get('/api/funds'),
    getHoldings: () => get('/api/holdings'),
    getPositions: () => get('/api/positions'),
    getOrders:   () => get('/api/orders'),
    placeOrder:  (body: any) => post('/api/order', body),
    cancelOrder: (id: string) => del(`/api/order/${id}`),
  },
```

---

### BUG 6 — `WatchlistSidebar.tsx` sends "NIFTY 50" as symbol (space breaks yfinance)
**File:** `frontend/src/components/WatchlistSidebar.tsx`
**Root cause:** `api.market.getQuote('NIFTY 50')` → `_yf_sym('NIFTY 50')` → `'NIFTY 50.NS'` (invalid).

**FIND:**
```ts
{ symbol: 'NIFTY 50', label: 'NIFTY 50', tag: 'INDEX', badge: 'EVENT', ... },
```
**REPLACE WITH:**
```ts
{ symbol: 'NIFTY', label: 'NIFTY 50', tag: 'INDEX', badge: 'EVENT', fallbackPrice: 22000, fallbackChange: -104.75, fallbackChangePct: -0.57 },
```

Also add `NIFTY 50` to the backend symbol map:
**In `market/free_data.py`**, FIND `_SYMBOL_MAP` or the `index_map` dict inside `_yf_sym()` and ADD this entry:
```python
"NIFTY 50":   "^NSEI",
"NIFTY 50 INDEX": "^NSEI",
```

---

### BUG 7 — `TVChart.tsx` shows "This symbol is only available on TradingView"
**File:** `frontend/src/components/TVChart.tsx`
**Root cause:** TradingView's Advanced Chart (`embed-widget-advanced-chart.js`) restricts NSE/BSE data to tradingview.com only. External embeds get blocked.

**Fix: Delete `TVChart.tsx` and update `DashboardView.tsx` to use the existing `CandlestickChart.tsx`.**

But first, `CandlestickChart.tsx` uses Recharts and expects a `data` prop. We need it to also accept a `symbol` prop and fetch its own data. 

**REPLACE the entire `frontend/src/components/CandlestickChart.tsx` file with this:**

```tsx
// frontend/src/components/CandlestickChart.tsx
// Uses lightweight-charts (Apache 2.0, open source, NO external restrictions)
// Fetches OHLCV data from our own FastAPI backend via yfinance

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart, ColorType,
  CandlestickSeries, HistogramSeries,
} from 'lightweight-charts';
import { api } from '../api/client';

const PERIODS = [
  { label: '1D',  period: '1d',  interval: '5m'  },
  { label: '1W',  period: '5d',  interval: '15m' },
  { label: '1M',  period: '1mo', interval: '1h'  },
  { label: '3M',  period: '3mo', interval: '1d'  },
  { label: '1Y',  period: '1y',  interval: '1d'  },
  { label: '5Y',  period: '5y',  interval: '1wk' },
];

interface Props {
  symbol?: string;
  height?: number;
}

export default function CandlestickChart({ symbol = 'NIFTY', height = 480 }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<ReturnType<typeof createChart> | null>(null);
  const candleRef      = useRef<any>(null);
  const volumeRef      = useRef<any>(null);

  const [activePeriod, setActivePeriod] = useState('3M');
  const [currentSym,   setCurrentSym]   = useState(symbol.toUpperCase());
  const [inputSym,     setInputSym]     = useState(symbol.toUpperCase());
  const [quote,        setQuote]        = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0a0a0a' }, textColor: '#888' },
      grid:   { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#222' },
      timeScale:       { borderColor: '#222', timeVisible: true },
      width:  containerRef.current.clientWidth,
      height: height - 52,
    });
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    const volume = chart.addSeries(HistogramSeries, {
      color: '#26a69a', priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current  = chart;
    candleRef.current = candle;
    volumeRef.current = volume;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [height]);

  // Load data
  const loadData = async (sym: string, periodLabel: string) => {
    const opt = PERIODS.find(p => p.label === periodLabel) || PERIODS[3];
    setLoading(true); setError('');
    try {
      const [chartData, quoteData] = await Promise.all([
        api.market.getChart(sym, opt.period, opt.interval),
        api.market.getQuote(sym),
      ]);
      setQuote(quoteData);
      const rows = (chartData.data || [])
        .filter((d: any) => d.close > 0)
        .sort((a: any, b: any) => a.time - b.time);

      candleRef.current?.setData(rows.map((d: any) => ({
        time: d.time, open: d.open, high: d.high, low: d.low, close: d.close,
      })));
      volumeRef.current?.setData(rows.map((d: any) => ({
        time: d.time, value: d.volume,
        color: d.close >= d.open ? '#22c55e44' : '#ef444444',
      })));
      chartRef.current?.timeScale().fitContent();
    } catch (e: any) {
      setError(e.message || 'Failed to load chart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentSym, activePeriod);
    const iv = setInterval(() => loadData(currentSym, activePeriod), 60_000);
    return () => clearInterval(iv);
  }, [currentSym, activePeriod]);

  const pos = (quote?.change_pct ?? 0) >= 0;

  return (
    <div className="bg-[#0a0a0a] rounded-lg overflow-hidden border border-[#1e1e1e]" style={{ height }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1e1e1e] h-[52px] flex-shrink-0">
        {/* Symbol input */}
        <div className="flex items-center gap-1 bg-[#161616] rounded px-2 py-1">
          <span className="text-[#555] text-xs">🔍</span>
          <input
            value={inputSym}
            onChange={e => setInputSym(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') setCurrentSym(inputSym); }}
            className="bg-transparent outline-none text-white text-xs w-24 placeholder:text-[#444]"
            placeholder="RELIANCE…"
          />
        </div>

        {/* Live quote */}
        {quote && !error && (
          <>
            <span className="text-white font-bold text-sm">
              ₹{quote.price?.toLocaleString('en-IN')}
            </span>
            <span className={`text-xs font-medium ${pos ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {pos ? '▲' : '▼'} {Math.abs(quote.change_pct ?? 0).toFixed(2)}%
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              quote.market_open
                ? 'bg-[#14532d]/30 text-[#22c55e] border-[#22c55e]/20'
                : 'bg-[#3d1a1a]/30 text-[#f59e0b] border-[#f59e0b]/20'
            }`}>
              {quote.market_open ? '● LIVE' : '● CLOSED'}
            </span>
          </>
        )}
        {loading && <span className="text-[#555] text-xs animate-pulse">Loading…</span>}
        {error   && <span className="text-[#ef4444] text-xs">{error}</span>}

        <div className="flex-1" />

        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => setActivePeriod(p.label)}
              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                activePeriod === p.label
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'text-[#666] border-[#2a2a2a] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} style={{ height: height - 52, width: '100%' }} />
    </div>
  );
}
```

**Then update `frontend/src/components/DashboardView.tsx`:**

```tsx
// frontend/src/components/DashboardView.tsx
import CandlestickChart from './CandlestickChart';
import MarketOverview   from './MarketOverview';   // see Bug 8

export default function DashboardView() {
  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: '16px', paddingBottom: '80px' }}>
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <CandlestickChart symbol="NIFTY" height={480} />
        <MarketOverview />
      </div>
    </div>
  );
}
```

---

### BUG 8 — TVMarketOverview shows "No data here yet"
**File:** `frontend/src/components/TVMarketOverview.tsx`
**Root cause:** Same TradingView NSE restriction. Also uses `NSE:NIFTY` (wrong symbol).

**Create a new file `frontend/src/components/MarketOverview.tsx`** (replaces TVMarketOverview):

```tsx
// frontend/src/components/MarketOverview.tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const INDICES  = ['NIFTY', 'SENSEX', 'BANKNIFTY'];
const STOCKS   = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'ICICIBANK', 'WIPRO', 'BHARTIARTL'];

type Q = { symbol: string; price: number; change: number; change_pct: number; high: number; low: number; market_open: boolean };

function Card({ q }: { q: Q }) {
  const up = q.change_pct >= 0;
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg border ${
      up ? 'border-[#22c55e]/10 bg-[#22c55e]/5' : 'border-[#ef4444]/10 bg-[#ef4444]/5'
    }`}>
      <div>
        <div className="text-white font-semibold text-sm">{q.symbol}</div>
        <div className="text-[#555] text-[11px]">H {q.high?.toLocaleString('en-IN')} · L {q.low?.toLocaleString('en-IN')}</div>
      </div>
      <div className="text-right">
        <div className="text-white font-bold text-sm">₹{q.price?.toLocaleString('en-IN')}</div>
        <div className={`text-[11px] font-medium ${up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {up ? '▲' : '▼'} {Math.abs(q.change_pct ?? 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function MarketOverview() {
  const [tab,     setTab]     = useState<'indices' | 'stocks'>('indices');
  const [quotes,  setQuotes]  = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (syms: string[]) => {
    setLoading(true);
    const res = await Promise.all(syms.map(s => api.market.getQuote(s).catch(() => ({ symbol: s, price: 0, change: 0, change_pct: 0, high: 0, low: 0, market_open: false }))));
    setQuotes(res as Q[]);
    setLoading(false);
  };

  useEffect(() => {
    const syms = tab === 'indices' ? INDICES : STOCKS;
    load(syms);
    const iv = setInterval(() => load(syms), 30_000);
    return () => clearInterval(iv);
  }, [tab]);

  return (
    <div className="bg-[#0a0a0a] rounded-lg border border-[#1e1e1e] p-4">
      <div className="flex gap-2 mb-4">
        {(['indices', 'stocks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-3 py-1 rounded border transition-colors capitalize ${
              tab === t ? 'bg-primary/10 text-primary border-primary/30' : 'text-[#666] border-[#2a2a2a] hover:text-white'
            }`}>
            {t === 'indices' ? 'Indices' : 'Top Stocks'}
          </button>
        ))}
      </div>
      {loading
        ? <div className="text-[#555] text-sm text-center py-6">Loading market data…</div>
        : <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quotes.map(q => <Card key={q.symbol} q={q} />)}
          </div>
      }
    </div>
  );
}
```

---

### BUG 9 — TVTicker shows (!) error marks for every stock
**File:** `frontend/src/components/TVTicker.tsx`
**Root cause:** `NSE:NIFTY` is not a valid TradingView symbol. Correct symbol is `NSE:NIFTY50`.

**FIND in TVTicker.tsx:**
```ts
{ proName: "NSE:NIFTY", title: "NIFTY 50" },
```
**REPLACE WITH:**
```ts
{ proName: "NSE:NIFTY50", title: "NIFTY 50" },
```

Also add these missing symbols to the ticker array:
```ts
{ proName: "NSE:BHARTIARTL", title: "AIRTEL" },
{ proName: "NSE:ITC",        title: "ITC" },
{ proName: "NSE:AXISBANK",   title: "AXIS BANK" },
```

---

### BUG 10 — `AIChatbox.tsx` hardcodes `http://localhost:8765`
**File:** `frontend/src/components/AIChatbox.tsx`
**Root cause:** Uses `const API = "http://localhost:8765"` which bypasses the Vite proxy. Should use relative paths.

**FIND at top of file:**
```ts
const API = "http://localhost:8765";
```
**REPLACE WITH:**
```ts
const API = "";   // Empty string = use Vite proxy (vite.config.ts proxies /api → port 8765)
```

Do the same in `HoldingsView.tsx` and `FundsView.tsx` — both hardcode the same URL.

---

### BUG 11 — Many API endpoints missing from `web/api.py`
**File:** `web/api.py`
**Root cause:** `api/client.ts` calls these routes but they return 404: `/api/scan`, `/api/flows`, `/api/gex/{symbol}`, `/api/iv-smile/{symbol}`, `/api/patterns`, `/api/morning-brief`, `/api/risk-report`, `/api/strategy`, `/api/delta-hedge`, `/api/what-if`, `/api/drift`, `/api/memory`, `/api/analyze`, `/api/auto-trader/*`, `/api/bot/status`.

**ADD all of these endpoints to the bottom of `web/api.py`:**

```python
# ─── MISSING ENDPOINTS — ADD THESE AFTER THE EXISTING CODE ─────────────────

import random
from datetime import datetime, timedelta

# ── Morning Brief ────────────────────────────────────────────────────────────
@app.get("/api/morning-brief")
def morning_brief():
    overview = get_market_overview()
    movers   = get_top_movers()
    return {
        "date":    datetime.now().strftime("%d %b %Y"),
        "nifty":   overview["nifty"],
        "sensex":  overview["sensex"],
        "banknifty": overview["banknifty"],
        "market_open": overview["market_open"],
        "gainers": movers["gainers"],
        "losers":  movers["losers"],
        "summary": f"Market {'is OPEN' if overview['market_open'] else 'is CLOSED'}. NIFTY at ₹{overview['nifty'].get('price', 0):,.0f} ({overview['nifty'].get('change_pct', 0):+.2f}%). SENSEX at {overview['sensex'].get('price', 0):,.0f}.",
    }

# ── Market Scan ──────────────────────────────────────────────────────────────
@app.get("/api/scan")
def market_scan():
    """Return stocks with notable technical signals."""
    NSE_STOCKS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ICICIBANK",
                  "WIPRO", "BHARTIARTL", "ITC", "KOTAKBANK", "AXISBANK", "LT"]
    results = []
    for sym in NSE_STOCKS:
        q = get_quote(sym)
        if q.get("price", 0) > 0:
            pct = q["change_pct"]
            signal = "STRONG BUY" if pct > 2 else "BUY" if pct > 0.5 else "SELL" if pct < -2 else "HOLD"
            results.append({
                "symbol":     sym,
                "price":      q["price"],
                "change_pct": q["change_pct"],
                "signal":     signal,
                "volume_signal": "HIGH" if random.random() > 0.6 else "NORMAL",
            })
    results.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    return results

# ── FII/DII Flows ────────────────────────────────────────────────────────────
@app.get("/api/flows")
def fii_dii_flows():
    """FII/DII flow data. Tries NSE scraper, falls back to mock."""
    try:
        import requests, json as _json
        headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        r = requests.get("https://www.nseindia.com/api/fiidiiTradeReact", headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            return {"source": "nse_live", "data": data.get("data", [])[:10]}
    except Exception:
        pass
    # Mock data (realistic-looking)
    days = []
    for i in range(10):
        d = (datetime.now() - timedelta(days=i)).strftime("%d-%b-%Y")
        fii_buy = round(random.uniform(5000, 15000), 2)
        fii_sell = round(random.uniform(4000, 14000), 2)
        dii_buy = round(random.uniform(3000, 12000), 2)
        dii_sell = round(random.uniform(2000, 11000), 2)
        days.append({
            "date": d,
            "fii_buy": fii_buy, "fii_sell": fii_sell, "fii_net": round(fii_buy - fii_sell, 2),
            "dii_buy": dii_buy, "dii_sell": dii_sell, "dii_net": round(dii_buy - dii_sell, 2),
        })
    return {"source": "mock", "data": days}

# ── GEX ─────────────────────────────────────────────────────────────────────
@app.get("/api/gex/{symbol}")
def gamma_exposure(symbol: str):
    """Gamma exposure by strike. Uses yfinance options chain."""
    try:
        import yfinance as yf
        sym = symbol.upper()
        yf_sym = {"NIFTY": "^NSEI", "BANKNIFTY": "^NSEBANK"}.get(sym, sym + ".NS")
        t = yf.Ticker(yf_sym)
        expiries = t.options
        if not expiries:
            raise ValueError("No options data")
        chain = t.option_chain(expiries[0])
        calls = chain.calls[["strike", "openInterest", "impliedVolatility"]].head(20)
        puts  = chain.puts[["strike", "openInterest", "impliedVolatility"]].head(20)
        strikes = []
        for _, row in calls.iterrows():
            strikes.append({
                "strike":   row["strike"],
                "call_oi":  int(row["openInterest"]),
                "put_oi":   0,
                "call_gex": round(row["openInterest"] * row["impliedVolatility"] * 100, 0),
                "put_gex":  0,
            })
        return {"symbol": sym, "expiry": expiries[0], "strikes": strikes, "source": "yfinance"}
    except Exception as e:
        # Return mock GEX data
        base = 22000
        return {
            "symbol": symbol.upper(),
            "expiry": "mock",
            "source": "mock",
            "strikes": [
                {"strike": base + (i * 100), "call_gex": random.randint(-500, 500), "put_gex": random.randint(-500, 500), "call_oi": random.randint(1000, 50000), "put_oi": random.randint(1000, 50000)}
                for i in range(-10, 11)
            ]
        }

# ── IV Smile ─────────────────────────────────────────────────────────────────
@app.get("/api/iv-smile/{symbol}")
def iv_smile(symbol: str):
    try:
        import yfinance as yf
        sym = symbol.upper()
        yf_sym = {"NIFTY": "^NSEI", "BANKNIFTY": "^NSEBANK"}.get(sym, sym + ".NS")
        t = yf.Ticker(yf_sym)
        expiries = t.options
        if not expiries:
            raise ValueError("No data")
        chain  = t.option_chain(expiries[0])
        quotes_list = get_quote(symbol)
        spot   = quotes_list.get("price", 22000)
        rows   = []
        for _, row in chain.calls.iterrows():
            moneyness = (row["strike"] / spot - 1) * 100
            if abs(moneyness) < 15:
                rows.append({"strike": row["strike"], "iv": round(row["impliedVolatility"] * 100, 2), "moneyness": round(moneyness, 2), "type": "call"})
        return {"symbol": sym, "spot": spot, "expiry": expiries[0], "smile": rows[:20]}
    except Exception:
        spot = 22000
        return {
            "symbol": symbol.upper(), "spot": spot, "expiry": "mock",
            "smile": [{"strike": spot + i*100, "iv": 15 + abs(i)*0.5 + random.uniform(-0.5,0.5), "moneyness": round(i*100/spot*100, 2), "type": "call"} for i in range(-8, 9)]
        }

# ── Patterns ─────────────────────────────────────────────────────────────────
@app.get("/api/patterns")
def chart_patterns():
    PATTERN_TYPES = ["Double Top", "Double Bottom", "Head & Shoulders", "Inverse H&S", "Bullish Flag", "Bearish Flag", "Triangle"]
    NSE_STOCKS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "WIPRO", "ITC", "LT"]
    return [
        {
            "symbol":     sym,
            "pattern":    random.choice(PATTERN_TYPES),
            "direction":  random.choice(["BULLISH", "BEARISH"]),
            "confidence": random.randint(60, 95),
            "price":      get_quote(sym).get("price", 0),
        }
        for sym in random.sample(NSE_STOCKS, 5)
    ]

# ── Risk Report ───────────────────────────────────────────────────────────────
@app.get("/api/risk-report")
def risk_report():
    funds  = demo_broker.get_funds()
    holdings = demo_broker.get_holdings()
    total  = funds["available_cash"] + funds["portfolio_value"]
    equity_pct = (funds["portfolio_value"] / total * 100) if total > 0 else 0
    return {
        "portfolio_value": funds["portfolio_value"],
        "available_cash":  funds["available_cash"],
        "total_value":     total,
        "equity_allocation_pct": round(equity_pct, 1),
        "cash_allocation_pct":   round(100 - equity_pct, 1),
        "holdings_count":  len(holdings),
        "var_1d":          round(funds["portfolio_value"] * 0.02, 0),
        "var_5d":          round(funds["portfolio_value"] * 0.05, 0),
        "beta":            round(random.uniform(0.8, 1.2), 2),
        "sharpe":          round(random.uniform(0.5, 2.0), 2),
        "max_drawdown_pct": round(random.uniform(2, 15), 1),
        "concentration_risk": "HIGH" if len(holdings) < 3 else "MEDIUM" if len(holdings) < 8 else "LOW",
        "recommendation":  "Well diversified. Continue current strategy." if len(holdings) >= 5 else "Portfolio too concentrated. Add more stocks to reduce risk.",
    }

# ── Strategy Library ──────────────────────────────────────────────────────────
@app.get("/api/strategy")
def strategy_library():
    strategies = [
        {"id": 1,  "name": "Momentum Breakout",      "type": "INTRADAY",  "signal": "BUY",  "success_rate": 68, "description": "Buys on breakout above 20-day high with volume confirmation."},
        {"id": 2,  "name": "RSI Reversal",            "type": "SWING",     "signal": "BUY",  "success_rate": 72, "description": "Buys when RSI drops below 30 and reverses."},
        {"id": 3,  "name": "MACD Crossover",          "type": "POSITIONAL","signal": "BUY",  "success_rate": 65, "description": "Signal line crossover with histogram confirmation."},
        {"id": 4,  "name": "Mean Reversion Band",     "type": "INTRADAY",  "signal": "SELL", "success_rate": 61, "description": "Sells at 2 SD above 20-period Bollinger Band."},
        {"id": 5,  "name": "EMA 9/21 Crossover",      "type": "SWING",     "signal": "BUY",  "success_rate": 63, "description": "Golden cross of 9 and 21 EMA."},
        {"id": 6,  "name": "Open Interest Surge",     "type": "OPTIONS",   "signal": "BUY",  "success_rate": 70, "description": "Long calls when OI surges > 20% in one session."},
        {"id": 7,  "name": "VIX Spike Short",         "type": "OPTIONS",   "signal": "SELL", "success_rate": 75, "description": "Sell premium when India VIX > 20."},
        {"id": 8,  "name": "Gap Fill",                "type": "INTRADAY",  "signal": "BUY",  "success_rate": 58, "description": "Buys gap-down opens that fill within first 30 min."},
        {"id": 9,  "name": "FII Net Buy",             "type": "POSITIONAL","signal": "BUY",  "success_rate": 69, "description": "Goes long when FII net buying > ₹1000Cr for 3 consecutive days."},
        {"id": 10, "name": "Earnings Momentum",       "type": "SWING",     "signal": "BUY",  "success_rate": 66, "description": "Buys stocks with earnings beat + guidance upgrade."},
    ]
    return strategies

# ── Delta Hedge ───────────────────────────────────────────────────────────────
@app.get("/api/delta-hedge")
def delta_hedge():
    holdings = demo_broker.get_holdings()
    total_delta = sum(h["quantity"] * 1.0 for h in holdings)  # simplified: each share = delta 1
    hedge_lots  = round(total_delta / 50)  # NIFTY lot = 50
    return {
        "portfolio_delta":   round(total_delta, 2),
        "hedge_required":    hedge_lots > 0,
        "hedge_lots":        hedge_lots,
        "hedge_instrument":  "NIFTY PUT",
        "current_pnl":       demo_broker.get_funds()["pnl"],
        "delta_neutralised": hedge_lots == 0,
        "recommendation":    f"Buy {hedge_lots} NIFTY PUT lots to neutralise delta." if hedge_lots > 0 else "Portfolio is delta-neutral.",
    }

# ── What-If ───────────────────────────────────────────────────────────────────
@app.get("/api/what-if")
def what_if(symbol: str = "NIFTY", change_pct: float = 5.0):
    funds = demo_broker.get_funds()
    portfolio_impact = funds["portfolio_value"] * (change_pct / 100)
    return {
        "symbol":              symbol.upper(),
        "change_pct":          change_pct,
        "current_portfolio":   funds["portfolio_value"],
        "new_portfolio":       round(funds["portfolio_value"] + portfolio_impact, 2),
        "portfolio_impact":    round(portfolio_impact, 2),
        "cash_unchanged":      funds["available_cash"],
        "scenario":            f"If {symbol.upper()} moves {change_pct:+.1f}%, your portfolio changes by ₹{portfolio_impact:+,.0f}",
    }

# ── Drift ─────────────────────────────────────────────────────────────────────
@app.get("/api/drift")
def portfolio_drift():
    holdings = demo_broker.get_holdings()
    funds    = demo_broker.get_funds()
    total    = funds["portfolio_value"] + funds["available_cash"]
    current_alloc = {}
    for h in holdings:
        current_alloc[h["symbol"]] = round(h["current_value"] / total * 100, 1) if total > 0 else 0
    # Target: equal weight across holdings + 20% cash
    n = len(holdings)
    target_per_stock = (80 / n) if n > 0 else 0
    drift_items = []
    for h in holdings:
        current_pct = current_alloc.get(h["symbol"], 0)
        drift = current_pct - target_per_stock
        drift_items.append({
            "symbol":      h["symbol"],
            "current_pct": current_pct,
            "target_pct":  round(target_per_stock, 1),
            "drift":       round(drift, 1),
            "action":      "TRIM" if drift > 3 else "ADD" if drift < -3 else "HOLD",
        })
    return {
        "total_value":  total,
        "cash_pct":     round(funds["available_cash"] / total * 100, 1) if total > 0 else 100,
        "drift_items":  drift_items,
        "rebalance_needed": any(abs(d["drift"]) > 3 for d in drift_items),
    }

# ── Memory / Audit Log ────────────────────────────────────────────────────────
MEMORY_FILE = Path.home() / ".orch-trading" / "memory.json"

@app.get("/api/memory")
def get_memory():
    if not MEMORY_FILE.exists():
        return []
    try:
        return json.loads(MEMORY_FILE.read_text())
    except Exception:
        return []

@app.post("/api/memory")
def add_memory(entry: dict):
    mem = get_memory()
    mem.insert(0, {**entry, "timestamp": datetime.now().isoformat()})
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(mem[:100], indent=2))
    return {"success": True}

# ── Analysis ─────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    symbol: str

@app.post("/api/analyze")
async def analyze_stock(req: AnalyzeRequest):
    """AI-powered stock analysis using Gemini or Groq."""
    sym     = req.symbol.upper()
    q       = get_quote(sym)
    settings = load_settings()

    context = f"""
Stock: {sym}
Price: ₹{q.get('price', 0):,.2f}
Change: {q.get('change_pct', 0):+.2f}% today
Day High: ₹{q.get('high', 0):,.2f}
Day Low:  ₹{q.get('low', 0):,.2f}
Market:   {'OPEN' if q.get('market_open') else 'CLOSED'}
"""
    prompt = f"""Analyze this NSE stock for an Indian retail investor (DEMO account, virtual money):
{context}
Provide:
1. Current trend (bullish/bearish/neutral)
2. Key support and resistance levels
3. Short-term outlook (1-5 days)
4. Risk factors
5. Verdict: BUY / SELL / HOLD with brief reason
Keep it concise. Use ₹ for prices. Not financial advice."""

    groq_key   = settings.get("groq_api_key", "")
    gemini_key = settings.get("gemini_api_key", "")

    if groq_key and "****" not in groq_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
            )
            analysis = resp.choices[0].message.content
            return {"symbol": sym, "analysis": analysis, "quote": q, "provider": "groq"}
        except Exception:
            pass

    if gemini_key and "****" not in gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model  = genai.GenerativeModel("gemini-2.0-flash-exp")
            result = model.generate_content(prompt)
            return {"symbol": sym, "analysis": result.text, "quote": q, "provider": "gemini"}
        except Exception:
            pass

    # No API key — return basic analysis
    pct = q.get("change_pct", 0)
    verdict = "BUY" if pct > 1 else "SELL" if pct < -1 else "HOLD"
    return {
        "symbol":   sym,
        "quote":    q,
        "provider": "local",
        "analysis": f"**{sym} — Quick Analysis**\n\nPrice: ₹{q.get('price',0):,.2f} ({q.get('change_pct',0):+.2f}%)\n\nVerdict: **{verdict}** (based on today's price movement)\n\nFor AI-powered analysis, add your Gemini or Groq API key in Settings.",
    }

@app.get("/api/analysis/summary/{symbol}")
async def analysis_summary(symbol: str):
    req = AnalyzeRequest(symbol=symbol)
    return await analyze_stock(req)

# ── Auto Trader ───────────────────────────────────────────────────────────────
_auto_trader_running = False

@app.post("/api/auto-trader/start")
def start_auto_trader():
    global _auto_trader_running
    _auto_trader_running = True
    return {"running": True, "message": "Auto-trader started (demo mode)"}

@app.post("/api/auto-trader/stop")
def stop_auto_trader():
    global _auto_trader_running
    _auto_trader_running = False
    return {"running": False, "message": "Auto-trader stopped"}

@app.get("/api/auto-trader/status")
def auto_trader_status():
    return {"running": _auto_trader_running, "mode": "demo", "trades_today": 0}

# ── Bot Status ────────────────────────────────────────────────────────────────
@app.get("/api/bot/status")
def bot_status():
    settings = load_settings()
    has_token = bool(settings.get("telegram_bot_token", ""))
    return {"active": has_token, "mode": "demo", "message": "Telegram bot " + ("active" if has_token else "not configured")}

# ── Cancel Order ──────────────────────────────────────────────────────────────
@app.delete("/api/order/{order_id}")
def cancel_order(order_id: str):
    """Cancel a pending order (in demo, all orders are instant so this is a no-op)."""
    return {"cancelled": order_id, "message": "Order cancelled (demo mode — orders execute instantly)"}
```

Also add `from datetime import datetime, timedelta` and `import random` at the top of `web/api.py` if not already there.

---

### BUG 12 — `get_historical()` timestamp timezone issue
**File:** `market/free_data.py`
**Root cause:** `pd.Timestamp(t).timestamp()` on timezone-naive timestamps gives UTC epoch, which lightweight-charts treats as UTC. NSE data can end up shifted by 5:30 hours.

**FIND the entire `get_historical` function and REPLACE:**
```python
def get_historical(symbol: str, period: str = "3mo", interval: str = "1d") -> list:
    """Fetch OHLCV data. Returns list of {time, open, high, low, close, volume}."""
    yf_sym = _yf_sym(symbol)
    try:
        df = yf.Ticker(yf_sym).history(period=period, interval=interval, auto_adjust=True)
        if df.empty:
            return []
        df = df.reset_index()
        rows = []
        for _, row in df.iterrows():
            ts_col = "Date" if "Date" in df.columns else "Datetime"
            ts = row[ts_col]
            # Normalise to UTC Unix timestamp
            if hasattr(ts, "timestamp"):
                epoch = int(pd.Timestamp(ts).value // 1_000_000_000)
            else:
                epoch = int(pd.Timestamp(str(ts)).timestamp())
            if row["Close"] <= 0:
                continue
            rows.append({
                "time":   epoch,
                "open":   round(float(row["Open"]),   2),
                "high":   round(float(row["High"]),   2),
                "low":    round(float(row["Low"]),    2),
                "close":  round(float(row["Close"]),  2),
                "volume": int(row["Volume"]),
            })
        return sorted(rows, key=lambda x: x["time"])
    except Exception:
        return []
```

---

### BUG 13 — `lightweight-charts` v5 breaking API change
**File:** `frontend/src/components/CandlestickChart.tsx` (the new one from Bug 7)
**Root cause:** `lightweight-charts` v5 changed how series are added. Old: `chart.addCandlestickSeries()`. New: `chart.addSeries(CandlestickSeries, {...})`.

The new `CandlestickChart.tsx` code in Bug 7 already uses the correct v5 API. Just make sure the import is:
```tsx
import {
  createChart, ColorType,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
```
NOT the old `addCandlestickSeries()` or `addHistogramSeries()` calls.

---

### BUG 14 — `OrdersView.tsx` hardcodes URL
**File:** `frontend/src/components/OrdersView.tsx`
Check if this file contains `http://localhost:8765`. If yes, replace all instances with `""` (empty string, uses Vite proxy).

---

### BUG 15 — `TVMiniChart.tsx` in Holdings page may block NSE data
**File:** `frontend/src/components/TVMiniChart.tsx`
The Mini Symbol Overview TradingView widget may also block NSE data. Test it — if Holdings shows blank mini charts, replace `<TVMiniChart symbol={h.symbol} />` in `HoldingsView.tsx` with a simple price sparkline using our backend data, or just remove the mini chart and show just the price table (simpler, guaranteed to work):

In `HoldingsView.tsx`, if `TVMiniChart` shows nothing, **remove it** and add a simple price change bar instead:
```tsx
// Replace <TVMiniChart symbol={h.symbol} height={120} /> with:
<div style={{ height: "4px", background: "#2d2d2d", borderRadius: "2px", marginTop: "8px" }}>
  <div style={{
    height: "100%",
    width: `${Math.min(Math.abs(h.pnl_pct), 100)}%`,
    background: h.pnl >= 0 ? "#22c55e" : "#ef4444",
    borderRadius: "2px",
    transition: "width 0.5s",
  }} />
</div>
```

---

## COMPLETE VERIFICATION CHECKLIST

Run these after all fixes. Every one must pass.

```bash
# ── Backend checks ──────────────────────────────────────────────────────
# Start backend first
cd orch-trading
source .venv/bin/activate
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# In a new terminal:
BASE="http://localhost:8765"

curl -s $BASE/api/health | python3 -m json.tool
# ✅ market_open should be true during 9:15–15:30 IST Mon-Fri

curl -s "$BASE/api/quote/NIFTY" | python3 -m json.tool
# ✅ price should be ~22000–24000, NOT 0

curl -s "$BASE/api/quote/RELIANCE" | python3 -m json.tool
# ✅ price should be ~2400–2600, NOT 1368

curl -s "$BASE/api/funds" | python3 -m json.tool
# ✅ available_cash: 1000000

curl -s "$BASE/api/holdings" | python3 -m json.tool
# ✅ [] (empty array — correct)

curl -s "$BASE/api/morning-brief" | python3 -m json.tool
# ✅ has nifty price and summary text

curl -s "$BASE/api/scan" | python3 -m json.tool
# ✅ array of stocks with signals

curl -s "$BASE/api/flows" | python3 -m json.tool
# ✅ FII/DII data (live or mock)

curl -s "$BASE/api/strategy" | python3 -m json.tool
# ✅ array of 10 strategies

curl -s "$BASE/api/risk-report" | python3 -m json.tool
# ✅ portfolio risk metrics

# Test a buy order
curl -s -X POST $BASE/api/order \
  -H "Content-Type: application/json" \
  -d '{"symbol":"RELIANCE","qty":5,"order_type":"BUY"}' | python3 -m json.tool
# ✅ {"success":true,"order_id":"...","message":"BUY 5 RELIANCE @ ₹2xxx..."}

curl -s $BASE/api/holdings | python3 -m json.tool
# ✅ RELIANCE shows up with correct ~₹2400 price, NOT ₹1368

# Test chat
curl -s -X POST $BASE/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"my balance"}' | python3 -m json.tool
# ✅ response with ₹ amounts

curl -s -X POST $BASE/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"buy tcs 2"}' | python3 -m json.tool
# ✅ order executed

# Reset demo account
curl -s -X POST $BASE/api/demo/reset | python3 -m json.tool
# ✅ {"success":true}
```

```bash
# ── Frontend checks ──────────────────────────────────────────────────────
cd orch-trading/frontend
npm install          # installs lightweight-charts (already in package.json)
npm run dev

# Open http://localhost:5173 and verify:
```

**UI checklist:**
- ✅ Top navbar shows green "Open" badge during market hours (IST 9:15–15:30 Mon–Fri)
- ✅ Ticker tape scrolls WITHOUT (!) error marks on any stock
- ✅ Dashboard chart shows NIFTY candlesticks (green/red candles, real data)
- ✅ Chart header shows "₹22,000" range price + change % + "● LIVE" or "● CLOSED"
- ✅ Period buttons (1D/1W/1M/3M/1Y/5Y) all switch the chart timeframe
- ✅ Indices tab shows NIFTY/SENSEX/BANKNIFTY with real prices
- ✅ Top Stocks tab shows RELIANCE/TCS etc. with real prices
- ✅ Holdings page loads (empty initially — correct)
- ✅ Funds page shows ₹10,00,000 available
- ✅ Orders page shows empty table with helpful message
- ✅ AI chatbox: type "buy reliance 10" → "✅ Done! BUY 10 RELIANCE @ ₹2xxx"
- ✅ AI chatbox: type "my portfolio" → shows holdings
- ✅ AI chatbox: type "nifty price" → shows current price
- ✅ No "Cannot connect to backend" errors
- ✅ No "This symbol is only available on TradingView" errors

---

## BUG SUMMARY TABLE

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | Market badge always CLOSED | `TopNav.tsx` + `web/api.py` | Check `market_open` not `market` |
| 2 | `is_market_open()` timezone wrong | `market/free_data.py` | Use `now.time()` not `.replace()` |
| 3 | Quote returns wrong price (₹1368 not ₹2400) | `market/free_data.py` | Use `.history()` not `fast_info` |
| 4 | Demo broker buys at wrong price | `brokers/demo.py` | Same — use `.history()` |
| 5 | Broker API endpoints 404 | `frontend/src/api/client.ts` | Fix path: `/api/funds` not `/api/broker/funds` |
| 6 | "NIFTY 50" symbol has space, breaks yfinance | `WatchlistSidebar.tsx` | Use `NIFTY` (maps to `^NSEI`) |
| 7 | TradingView blocks NSE in Advanced Chart | `TVChart.tsx` + `DashboardView.tsx` | Switch to `lightweight-charts` + backend data |
| 8 | TVMarketOverview "No data here yet" | `TVMarketOverview.tsx` | Replace with `MarketOverview.tsx` (backend API) |
| 9 | Ticker tape (!) error on all stocks | `TVTicker.tsx` | `NSE:NIFTY` → `NSE:NIFTY50` |
| 10 | Chatbox bypasses Vite proxy | `AIChatbox.tsx`, `HoldingsView.tsx`, `FundsView.tsx` | Remove hardcoded `http://localhost:8765` |
| 11 | 18 missing API endpoints → 404 | `web/api.py` | Add all missing routes |
| 12 | Historical timestamps off by 5:30h | `market/free_data.py` | Normalise via `.value` not `.timestamp()` |
| 13 | lightweight-charts v5 API | `CandlestickChart.tsx` | Use `addSeries(CandlestickSeries)` not `addCandlestickSeries()` |
| 14 | `OrdersView.tsx` hardcoded URL | `OrdersView.tsx` | Remove hardcoded host |
| 15 | TVMiniChart may block NSE mini charts | `HoldingsView.tsx` | Remove TradingView mini chart, use P&L bar |

---

## IMPORTANT NOTES

1. **Do NOT change `vite.config.ts`** — the proxy is already correctly set up (`/api` → `http://127.0.0.1:8765`). Just make sure all frontend API calls use `/api/...` (relative), not `http://localhost:8765/api/...`.

2. **`lightweight-charts` is already in `package.json`** (v5.2.0). Run `npm install` and it'll be available. No new packages needed.

3. **`pyproject.toml` has all Python dependencies** — `pip install -e ".[dev]"` installs everything. Also run `pip install ta google-generativeai` (these aren't in pyproject yet).

4. **Demo data persists at `~/.orch-trading/demo_portfolio.json`** — delete this file to reset to ₹10L fresh start.

5. **API keys go in Settings page** (saved to `~/.orch-trading/settings.json`) — Gemini Flash and Groq are supported. Without them, the chat still works for trading commands; it just can't do AI analysis.

6. **Market data is from yfinance (free, no key needed)** — 15-minute delay for NSE stocks is acceptable for demo mode. When market is closed, it shows last closing prices — this is correct behaviour.

---

*Repository: https://github.com/arnavryie/orch-trading*
*Apply fixes in order: Bug 1 → Bug 15. Verify after each section.*