# ORCH-TRADING — ZERODHA-STYLE UI POLISH
## Make it feel exactly like Kite: smooth animations, live price flash, hover-reveal trading
## For Antigravity — paste this entire file

**Repo:** https://github.com/arnavryie/orch-trading
**Goal:** Match Zerodha Kite's *feel* — the smoothness, the live-ticking marketwatch, hover-reveal buy/sell, slide-in order pad, skeleton loaders, snappy transitions. Keep the dark theme (your brand) but adopt every Kite interaction pattern. The AI Council stays as your unique addition.

**The 6 things that make Kite feel like Kite (we build all of them):**
1. Live price **flash** — green/red flash when any price ticks
2. Watchlist **hover-reveal** — B / S / chart / delete buttons appear on hover
3. **Skeleton loaders** — shimmer placeholders, never "Loading…" text
4. **Slide-in order pad** — buy/sell panel slides from the right
5. **Smooth page transitions** — fade + slide between tabs
6. **Micro-interactions** — count-up numbers, button press states, hover lifts

---

## STEP 1 — Global design system + animation keyframes

Replace the `@layer utilities` block in `frontend/src/index.css` and ADD a new animations layer. Append this to the END of `index.css`:

```css
/* ─── ZERODHA-STYLE ANIMATIONS & POLISH ─────────────────────────────── */

@layer utilities {
  /* Smooth everything by default */
  .transition-smooth { transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); }

  /* Price flash — green/red pulse when value updates */
  .flash-up   { animation: flashGreen 0.6s ease-out; }
  .flash-down { animation: flashRed 0.6s ease-out; }

  /* Skeleton shimmer */
  .skeleton {
    background: linear-gradient(90deg, #161616 25%, #222 50%, #161616 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
    border-radius: 4px;
  }

  /* Page enter */
  .page-enter { animation: pageEnter 0.28s cubic-bezier(0.16, 1, 0.3, 1); }

  /* Slide-in panel (order pad) */
  .slide-in-right { animation: slideInRight 0.26s cubic-bezier(0.16, 1, 0.3, 1); }
  .slide-out-right { animation: slideOutRight 0.2s ease-in forwards; }

  /* Row hover lift */
  .row-hover { transition: background 0.14s ease, transform 0.14s ease; }
  .row-hover:hover { background: rgba(255,255,255,0.025); }

  /* Button press */
  .btn-press { transition: transform 0.08s ease, opacity 0.15s ease; }
  .btn-press:active { transform: scale(0.96); }

  /* Card hover lift */
  .card-lift { transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; }
  .card-lift:hover { transform: translateY(-2px); border-color: #444; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }

  /* Fade in */
  .fade-in { animation: fadeIn 0.4s ease; }
}

@keyframes flashGreen {
  0%   { background-color: rgba(64, 229, 108, 0.28); }
  100% { background-color: transparent; }
}
@keyframes flashRed {
  0%   { background-color: rgba(255, 100, 100, 0.28); }
  100% { background-color: transparent; }
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0.5; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Kite-style accent for primary/buy actions */
@theme {
  --color-kite-blue: #4184f3;
  --color-kite-blue-dark: rgba(65, 132, 243, 0.12);
}
```

---

## STEP 2 — Live price flash hook (the #1 Kite signature)

Create `frontend/src/hooks/usePriceFlash.ts`:

```ts
// frontend/src/hooks/usePriceFlash.ts
import { useEffect, useRef, useState } from 'react';

/**
 * Returns a className that flashes green/red for 0.6s whenever `value` changes.
 * Usage: const flash = usePriceFlash(price); <span className={flash}>{price}</span>
 */
export function usePriceFlash(value: number | undefined): string {
  const prev = useRef(value);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (value === undefined || prev.current === undefined) {
      prev.current = value;
      return;
    }
    if (value > prev.current) setFlash('flash-up');
    else if (value < prev.current) setFlash('flash-down');
    prev.current = value;
    const t = setTimeout(() => setFlash(''), 600);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}
```

Create `frontend/src/components/FlashPrice.tsx` (a reusable ticking price):

```tsx
// frontend/src/components/FlashPrice.tsx
import { usePriceFlash } from '../hooks/usePriceFlash';

interface Props {
  value: number;
  prefix?: string;
  className?: string;
  decimals?: number;
}

export default function FlashPrice({ value, prefix = '₹', className = '', decimals = 2 }: Props) {
  const flash = usePriceFlash(value);
  return (
    <span className={`${flash} ${className} rounded px-1 -mx-1 tabular-nums`} style={{ transition: 'background-color 0.6s ease' }}>
      {prefix}{value?.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}
```

---

## STEP 3 — Skeleton loaders (replace ALL "Loading…" text)

Create `frontend/src/components/Skeleton.tsx`:

```tsx
// frontend/src/components/Skeleton.tsx
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-[#161616]">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-2 w-16" />
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-2 w-12" />
      </div>
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return <div className="skeleton w-full rounded-lg" style={{ height }} />;
}

export function SkeletonChart({ height = 400 }: { height?: number }) {
  return (
    <div className="skeleton w-full rounded-lg flex items-end gap-1 p-4" style={{ height }}>
      {/* fake candles */}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return <div>{Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}</div>;
}
```

**Then replace every `Loading…` text in the views.** For example in `HoldingsView.tsx`:
```tsx
// FIND:
if (loading) return <div style={{padding:"24px", color:"#aaa"}}>Loading holdings...</div>;
// REPLACE WITH:
import { SkeletonList } from './Skeleton';
// ...
if (loading) return <div className="p-6"><SkeletonList rows={5} /></div>;
```
Do the same in `FundsView.tsx`, `OrdersView.tsx`, `ScanView.tsx`, `PositionsView.tsx`, and any view with a "Loading…" string. Use `SkeletonChart` for `CandlestickChart`'s loading state and `SkeletonList` for tables.

---

## STEP 4 — Zerodha-style Marketwatch sidebar (hover-reveal B/S)

This is THE signature Kite component. Replace `frontend/src/components/WatchlistSidebar.tsx` entirely:

```tsx
// frontend/src/components/WatchlistSidebar.tsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import FlashPrice from './FlashPrice';

const DEFAULT_SYMBOLS = ['NIFTY', 'SENSEX', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'WIPRO', 'ICICIBANK', 'BHARTIARTL'];

interface Quote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  market_open?: boolean;
}

interface Props {
  onTrade?: (symbol: string, side: 'BUY' | 'SELL', price: number) => void;
  onChart?: (symbol: string) => void;
}

export default function WatchlistSidebar({ onTrade, onChart }: Props) {
  const [quotes, setQuotes]   = useState<Record<string, Quote>>({});
  const [search, setSearch]   = useState('');
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [hovered, setHovered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const results = await Promise.all(
      symbols.map(s => api.market.getQuote(s).then(q => [s, q]).catch(() => [s, null]))
    );
    const map: Record<string, Quote> = {};
    results.forEach(([s, q]: any) => { if (q && q.price > 0) map[s] = q; });
    setQuotes(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 5000);   // tick every 5s like Kite
    return () => clearInterval(iv);
  }, [symbols]);

  const displayed = symbols.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2 bg-[#141414] rounded px-2.5 py-1.5 transition-smooth focus-within:bg-[#1a1a1a] focus-within:ring-1 focus-within:ring-kite-blue/40">
          <span className="material-symbols-outlined text-[16px] text-[#555]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search eg: infy, nifty fut"
            className="bg-transparent outline-none text-[13px] text-white flex-1 placeholder:text-[#555]"
          />
          <span className="text-[10px] text-[#444]">{displayed.length}/50</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex justify-between px-3 py-2.5 border-b border-[#141414]">
              <div className="skeleton h-3 w-20" /><div className="skeleton h-3 w-16" />
            </div>
          ))
        ) : (
          displayed.map(sym => {
            const q = quotes[sym];
            const up = (q?.change_pct ?? 0) >= 0;
            const isHover = hovered === sym;
            return (
              <div
                key={sym}
                onMouseEnter={() => setHovered(sym)}
                onMouseLeave={() => setHovered(null)}
                className="relative row-hover border-b border-[#141414] cursor-pointer select-none"
                style={{ borderLeft: `2px solid ${up ? 'rgba(64,229,108,0.5)' : 'rgba(255,100,100,0.5)'}` }}
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex flex-col">
                    <span className={`text-[12.5px] font-medium ${up ? 'text-bullish' : 'text-bearish'}`}>{sym}</span>
                    <span className="text-[10px] text-[#555]">NSE</span>
                  </div>
                  {q && (
                    <div className="flex flex-col items-end">
                      <FlashPrice value={q.price} prefix="" className={`text-[12.5px] font-semibold ${up ? 'text-bullish' : 'text-bearish'}`} />
                      <span className={`text-[10px] ${up ? 'text-bullish' : 'text-bearish'}`}>
                        {up ? '+' : ''}{q.change?.toFixed(2)} ({up ? '+' : ''}{q.change_pct?.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover-reveal action buttons — the Kite signature */}
                {isHover && q && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 fade-in">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTrade?.(sym, 'BUY', q.price); }}
                      className="w-6 h-6 rounded bg-kite-blue text-white text-[11px] font-bold btn-press flex items-center justify-center shadow-lg"
                      title="Buy"
                    >B</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onTrade?.(sym, 'SELL', q.price); }}
                      className="w-6 h-6 rounded bg-[#ff5722] text-white text-[11px] font-bold btn-press flex items-center justify-center shadow-lg"
                      title="Sell"
                    >S</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onChart?.(sym); }}
                      className="w-6 h-6 rounded bg-[#2a2a2a] text-[#ccc] btn-press flex items-center justify-center shadow-lg"
                      title="Chart"
                    >
                      <span className="material-symbols-outlined text-[14px]">show_chart</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## STEP 5 — Slide-in Order Pad (Kite's buy/sell panel)

Create `frontend/src/components/OrderPad.tsx`:

```tsx
// frontend/src/components/OrderPad.tsx
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import FlashPrice from './FlashPrice';

interface Props {
  open: boolean;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  onClose: () => void;
  onDone?: () => void;
}

export default function OrderPad({ open, symbol, side, price, onClose, onDone }: Props) {
  const [qty, setQty]       = useState(1);
  const [livePrice, setLive] = useState(price);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => { setLive(price); setQty(1); setResult(null); }, [symbol, price, open]);

  // Live-update the price while pad is open
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => {
      api.market.getQuote(symbol).then(q => { if (q?.price > 0) setLive(q.price); }).catch(() => {});
    }, 3000);
    return () => clearInterval(iv);
  }, [open, symbol]);

  if (!open) return null;

  const total = qty * livePrice;
  const isBuy = side === 'BUY';

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.broker.placeOrder({ symbol, qty, order_type: side });
      setResult(res.message || `${side} ${qty} ${symbol} placed`);
      onDone?.();
      setTimeout(onClose, 1200);
    } catch {
      setResult('Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 z-[1100] fade-in" />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[400px] bg-[#0d0d0d] border-l border-[#1e1e1e] z-[1101] slide-in-right flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 ${isBuy ? 'bg-kite-blue/10' : 'bg-[#ff5722]/10'} border-b border-[#1e1e1e]`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-kite-blue text-white' : 'bg-[#ff5722] text-white'}`}>{side}</span>
                <span className="text-white font-bold text-base">{symbol}</span>
              </div>
              <div className="text-[#888] text-xs mt-1">NSE · Demo Order</div>
            </div>
            <FlashPrice value={livePrice} className="text-white font-bold" />
          </div>
        </div>

        {/* Form */}
        <div className="p-5 flex-1">
          <label className="text-[#888] text-xs uppercase tracking-wider">Quantity</label>
          <div className="flex items-center gap-2 mt-2 mb-5">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded bg-[#1a1a1a] text-white btn-press">−</button>
            <input
              type="number" value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center outline-none focus:border-kite-blue transition-smooth"
            />
            <button onClick={() => setQty(qty + 1)} className="w-9 h-9 rounded bg-[#1a1a1a] text-white btn-press">+</button>
          </div>

          {/* Quick qty chips */}
          <div className="flex gap-2 mb-6">
            {[5, 10, 25, 50].map(n => (
              <button key={n} onClick={() => setQty(n)}
                className="flex-1 py-1.5 rounded bg-[#161616] text-[#aaa] text-xs btn-press hover:bg-[#1f1f1f] transition-smooth">
                {n}
              </button>
            ))}
          </div>

          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1e1e1e]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#888]">Approx. value</span>
              <FlashPrice value={total} className="text-white font-semibold" />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#666]">{qty} × ₹{livePrice.toLocaleString('en-IN')}</span>
              <span className="text-[#666]">Demo funds</span>
            </div>
          </div>

          {result && (
            <div className="mt-4 text-center text-sm text-bullish fade-in">{result}</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button onClick={onClose} className="px-5 py-3 rounded-lg bg-[#1a1a1a] text-[#aaa] text-sm btn-press flex-1">Cancel</button>
          <button
            onClick={submit}
            disabled={submitting}
            className={`px-5 py-3 rounded-lg text-white font-bold text-sm btn-press flex-[2] ${isBuy ? 'bg-kite-blue' : 'bg-[#ff5722]'} disabled:opacity-50`}
          >
            {submitting ? 'Placing…' : `${side} ${qty} ${symbol}`}
          </button>
        </div>
      </div>
    </>
  );
}
```

---

## STEP 6 — Wire OrderPad + page transitions into App.tsx

Update `frontend/src/App.tsx`:

```tsx
// Add imports at top:
import { useState } from 'react';
import OrderPad from './components/OrderPad';

// Inside App() component, add order pad state:
export default function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [orderPad, setOrderPad] = useState<{ open: boolean; symbol: string; side: 'BUY'|'SELL'; price: number }>({
    open: false, symbol: '', side: 'BUY', price: 0,
  });
  const [chartSymbol, setChartSymbol] = useState('NIFTY');

  const openOrderPad = (symbol: string, side: 'BUY'|'SELL', price: number) =>
    setOrderPad({ open: true, symbol, side, price });

  // ... existing renderContent() ...

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-black text-[#f7ddd2]">
      <TopNav activePage={activePage} onPageChange={setActivePage} />
      <TVTicker />

      <div className="flex flex-1 overflow-hidden">
        {/* Pass handlers to the watchlist */}
        <WatchlistSidebar
          onTrade={openOrderPad}
          onChart={(s) => { setChartSymbol(s); setActivePage('Dashboard'); }}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* secondary sidebar unchanged ... */}

          {/* Page content — add the page-enter animation via a key change */}
          <main className="flex-1 overflow-hidden flex flex-col">
            <div key={activePage} className="page-enter flex-1 overflow-hidden flex flex-col">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

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
```

The `key={activePage}` on the page wrapper makes React remount on tab change → triggers the `page-enter` fade+slide animation every time you switch pages. This is the Kite-smooth tab feel.

---

## STEP 7 — Polish the Holdings/Positions/Orders tables (Kite style)

Kite tables have: subtle row hover, right-aligned numbers, colored P&L, no heavy borders. Update `HoldingsView.tsx` table rows to use these classes. Wherever you render a holding row, wrap it with `row-hover` and use `FlashPrice` for live prices:

```tsx
import FlashPrice from './FlashPrice';
// For each holding card/row:
<div className="row-hover card-lift bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
  <div className="flex justify-between items-start">
    <div>
      <div className="text-white font-semibold text-sm">{h.symbol}</div>
      <div className="text-[#555] text-[11px]">NSE · {h.quantity} qty · avg ₹{h.avg_price}</div>
    </div>
    <div className="text-right">
      <FlashPrice value={h.current_price} className="text-white font-semibold text-sm" />
      <div className={`text-[11px] mt-0.5 ${h.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
        {h.pnl >= 0 ? '+' : ''}₹{Math.abs(h.pnl).toFixed(0)} ({h.pnl >= 0 ? '+' : ''}{h.pnl_pct?.toFixed(2)}%)
      </div>
    </div>
  </div>
  {/* P&L bar */}
  <div className="h-1 bg-[#1a1a1a] rounded-full mt-3 overflow-hidden">
    <div className="h-full rounded-full transition-all duration-500"
      style={{ width: `${Math.min(Math.abs(h.pnl_pct || 0) * 5, 100)}%`, background: h.pnl >= 0 ? '#40e56c' : '#ff6464' }} />
  </div>
</div>
```

Apply the same `row-hover` + `FlashPrice` treatment to `PositionsView.tsx` and `OrdersView.tsx` rows.

---

## STEP 8 — TopNav polish (sticky, subtle shadow, smooth active indicator)

In `frontend/src/components/TopNav.tsx`, give the active tab a smooth sliding underline feel. The tabs already use `border-b-2`; add `transition-smooth` to each tab button's className so the underline animates:

```tsx
// On each nav tab button, ensure className includes:
className={`... transition-smooth ${isActive ? 'text-primary border-primary' : 'text-[#e2bfb0] border-transparent hover:text-primary'}`}
```

Add a subtle shadow under the navbar when content scrolls. Add to the `<nav>` className:
```tsx
className="... shadow-[0_1px_0_0_#1e1e1e]"
```

Also wire the bell + apps icons (currently dead). Give them hover scale and a simple action:
```tsx
// Wrap each icon button:
<button className="... btn-press hover:scale-110 transition-smooth" onClick={() => onPageChange('Alerts')}>
  <span className="material-symbols-outlined text-[20px]">notifications</span>
</button>
<button className="... btn-press hover:scale-110 transition-smooth" onClick={() => onPageChange('Council')}>
  <span className="material-symbols-outlined text-[20px]">apps</span>
</button>
```

---

## STEP 9 — Number count-up animation (optional but very Kite)

Create `frontend/src/components/CountUp.tsx` for animating big numbers (portfolio value, funds):

```tsx
// frontend/src/components/CountUp.tsx
import { useEffect, useRef, useState } from 'react';

export default function CountUp({ value, prefix = '₹', decimals = 0, duration = 600 }: { value: number; prefix?: string; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const startVal = useRef(value);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startVal.current = display;
    startTime.current = null;
    let raf: number;
    const animate = (t: number) => {
      if (startTime.current === null) startTime.current = t;
      const progress = Math.min((t - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(startVal.current + (value - startVal.current) * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="tabular-nums">{prefix}{display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
```

Use it in `FundsView.tsx` for the equity/portfolio numbers:
```tsx
import CountUp from './CountUp';
// Replace ₹{funds.available_cash...} with:
<CountUp value={funds.available_cash} />
```

---

## STEP 10 — Verify the polish

```bash
cd frontend && npm run dev
```

**Smoothness checklist:**
- ✅ Watchlist prices **flash green/red** when they tick (wait ~5s for an update)
- ✅ Hover any watchlist row → **B / S / chart buttons appear** smoothly
- ✅ Click B or S → **order pad slides in** from the right
- ✅ Order pad price **ticks live** while open
- ✅ Switching tabs → content **fades + slides up** (page-enter)
- ✅ Loading any page → **shimmer skeletons**, never "Loading…" text
- ✅ Hover holding cards → **lift + shadow**
- ✅ Buttons **press down** slightly on click
- ✅ Funds page numbers **count up** on load
- ✅ Bell → Alerts, Apps icon → Council
- ✅ The AI Council screen still works with its stagger animation

---

## DESIGN NOTES (what makes it feel like Kite)

1. **Timing is everything.** Kite uses ~150–200ms transitions with `cubic-bezier(0.4,0,0.2,1)`. Snappy, not slow. All the classes above use this.
2. **Price flash = trust.** The green/red flash on every tick is *the* thing that makes a trading UI feel alive and real-time. It's the highest-impact change here.
3. **Hover-reveal = clean + powerful.** Kite keeps the watchlist clean but every row is one hover away from trading. That's the magic.
4. **Skeletons > spinners.** Shimmer placeholders feel faster than spinners even at the same load time.
5. **Your edge stays.** Everything above is Kite-grade polish — but the AI Council, the chatbox, and the multi-AI concept are yours. You now have Kite's smoothness *plus* something Kite will never have.

---

*Repo: https://github.com/arnavryie/orch-trading*
*Apply Steps 1→10 in order. Step 1 (CSS) and Step 2 (price flash) give the biggest instant "wow".*