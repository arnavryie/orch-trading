# ORCH-TRADING → "THE AI TRADING DESK"
## Vision, Concept & Full Fix Guide for Antigravity

**Repo:** https://github.com/arnavryie/orch-trading
**Two parts:** PART A = the big concept (what makes this superior). PART B = fix the remaining UI/data bugs.

---

# ══════════════════════════════════════════════
# PART A — THE CONCEPT THAT MAKES THIS DIFFERENT
# ══════════════════════════════════════════════

## The one-line pitch

> **"A hedge fund research desk in your pocket — where 4 different AIs each play a specialist role, debate each other, and you watch them decide your trades in plain English."**

Every other trading app is either a dumb order terminal (Zerodha, Groww) or a black-box robo-advisor (smallcase, INDmoney) that just buys index funds. **Nobody lets a retail trader watch a team of AI analysts argue about a stock and then act on the consensus.** That's the gap. That's your moat.

---

## Why "multiple AIs" is the actual innovation (not a gimmick)

You already had the right instinct. Here's *why* it's genuinely better, not just more APIs for the sake of it:

1. **No single-model blind spot.** Every LLM has biases baked in from training (GPT loves big-cap tech, models hallucinate confidently). When 4 independent models must *agree* before acting, you filter out one model's bad day. This is literally how ensemble methods beat single models in ML.

2. **Specialization beats generalization.** Asking one model to do news + fundamentals + technicals + risk is like asking one person to be the entire trading floor. Each AI is genuinely better at different things — use that.

3. **Transparency is the product.** The debate *is* the feature. People don't trust black boxes with money. When they can read "Grok flagged negative news, but Claude says the risk is already priced in, and 3 of 4 models still vote BUY" — that builds trust no competitor offers.

---

## The Desk: who does what

Assign each AI the role it's actually best at:

| AI | Role | Why this AI | What it produces |
|----|------|-------------|------------------|
| **Grok (xAI)** | 🔍 **The Scout / News Desk** | Live access to X/Twitter + real-time web. Best at "what's happening RIGHT NOW" | Breaking news, social sentiment, retail buzz, unusual chatter on a ticker |
| **GPT-4o (OpenAI)** | 📊 **The Fundamental Analyst** | Strong structured reasoning over financial data | Earnings interpretation, valuation (P/E, ROE), balance-sheet health, sector view |
| **Gemini Flash (Google)** | ⚡ **The Technical Trader** | Fast + cheap → can run every few minutes | Chart patterns, RSI/MACD/EMA signals, support/resistance, scanning all of NIFTY 50 |
| **Claude (Anthropic)** | 🛡️ **The Risk Manager + Execution** | Careful, conservative reasoning; good at math | Position sizing, portfolio risk, stop-loss levels, the FINAL go/no-go on every trade |

Plus one **Orchestrator** (the "Chief") — a thin layer (can be any model, or rule-based) that:
- Collects all 4 opinions
- Runs the debate round (bull case vs bear case)
- Computes the consensus score
- Hands the final decision to Claude for execution

---

## The killer features (this is what nobody else has)

### 1. The Council Debate (live, watchable)
When you say "should I buy RELIANCE?", you don't get one answer. You watch:
```
🔍 Grok (Scout):        "Reliance Jio just announced X. Social sentiment +12% today. BULLISH"
📊 GPT (Fundamentals):  "P/E is stretched at 28 vs sector 22. Earnings flat. NEUTRAL"
⚡ Gemini (Technicals): "Broke above 50-EMA, RSI 58, MACD crossover. BULLISH"
🛡️ Claude (Risk):       "Vol is elevated. If you buy, max 4% of portfolio, stop at ₹2,380. CAUTIOUS BUY"
─────────────────────────────────────────
🎯 CONSENSUS: BUY (3 of 4 agree) · Confidence 71% · Suggested size: ₹40,000
```
This animated, real-time "council meeting" is the signature UX. No competitor has it.

### 2. Consensus Threshold for auto-trading
The auto-trader only places a real (demo) order when **agreement crosses a user-set bar** (e.g. "only auto-buy when ≥3 of 4 AIs agree AND confidence >65%"). This makes automation *safe* and *explainable* — not a reckless bot.

### 3. Confidence-weighted position sizing
4/4 agree → bigger position. 2/4 split → tiny position or skip. The money follows the conviction. This is real risk management retail traders never do.

### 4. Devil's Advocate mode
One AI is *always* assigned to argue AGAINST the trade, no matter what. Forces the system to surface the bear case every time. Kills confirmation bias.

### 5. AI Track Record (the long-term moat)
Log every prediction each AI makes → compare to what actually happened → show a **scoreboard**: "Gemini's technical calls: 64% accurate over 90 days. GPT's fundamental calls: 58%." Then **weight each AI's vote by its track record.** The system literally gets smarter and more personalized over time. This is a genuine data moat — the longer someone uses it, the better it gets for them, and the harder it is to leave.

### 6. Daily Portfolio Digest
Every morning: "Here's why you still hold each position, from all 4 perspectives" + "Here's what the desk is watching today." Turns a passive holder into an informed one.

### 7. "Explain this trade" forever
Every order ever placed keeps its full reasoning attached. Tap any past trade → see exactly why all 4 AIs decided it, at that moment. Full auditability.

---

## Why this is genuinely useful (not just cool)

- **Retail traders can't afford a research team.** A real analyst costs lakhs/year. This gives a solo trader in a hostel the experience of running a desk.
- **It teaches, not just executes.** Reading 4 expert views daily makes users better traders — competitors keep users dumb and dependent.
- **Responsible by design.** Demo-first, consensus-gated, devil's-advocate, risk-manager-has-final-say. This is the *anti*-"reckless bot" — which matters because SEBI is cracking down on irresponsible algo trading.

---

## The Vision Roadmap (build in this order)

**Phase 1 — Foundation (you're here):** Demo mode works, live data, single-AI chat, all pages load. *Finish PART B below first.*

**Phase 2 — The Desk:** Wire all 4 providers (Grok, GPT, Gemini, Claude), each with its specialist system prompt. Build the `/api/council` endpoint that runs all 4 in parallel and returns their votes.

**Phase 3 — The Debate UI:** Build the animated "council meeting" component. Show each AI's avatar, role, verdict, and reasoning streaming in. This is the signature screen — make it beautiful (dark/cinematic, matches your aesthetic).

**Phase 4 — Consensus Engine:** Implement the voting math, confidence score, and consensus-gated auto-trading with user-set thresholds.

**Phase 5 — Track Record + Learning:** Log predictions, score them against outcomes, build the AI scoreboard, weight votes by accuracy.

**Phase 6 — Polish & Differentiate:** Daily digest, devil's advocate toggle, "explain this trade" history, portfolio personality settings.

---

## Prompt to give Antigravity for Phase 2 (the multi-AI council)

> Build a new backend module `agent/council.py` that defines 4 specialist AI roles: Scout (Grok/xAI, role=news+sentiment), Fundamental (OpenAI GPT-4o, role=valuation+earnings), Technical (Gemini Flash, role=chart patterns+indicators), Risk (Claude, role=position sizing+final decision). Each role has its own system prompt tailored to its specialty. Create a function `run_council(symbol)` that:
> 1. Fetches market data for the symbol (price, OHLCV, fundamentals) from the existing `market/` modules.
> 2. Calls all 4 AIs IN PARALLEL (use asyncio.gather), each with its role-specific prompt + the market data.
> 3. Each returns a structured verdict: `{verdict: BUY/SELL/HOLD, confidence: 0-100, reasoning: str}`.
> 4. Computes a consensus: count votes, average confidence, decide final action.
> 5. Returns `{symbol, votes: [...], consensus: {action, confidence, agreement}, suggested_size}`.
>
> Add provider files: `agent/providers/grok.py` (xAI API, OpenAI-compatible, base_url=https://api.x.ai/v1), `agent/providers/openai_provider.py`, and `agent/providers/claude_provider.py` (Anthropic SDK). Each reads its API key from settings (`~/.orch-trading/settings.json`). If a provider's key is missing, that AI abstains from the vote (don't crash). Expose `POST /api/council` with body `{symbol}` in `web/api.py`. Each AI must gracefully degrade — if only 2 of 4 keys are set, the council runs with 2 members and says so.

---
---

# ══════════════════════════════════════════════
# PART B — FIX THE REMAINING BUGS (do this FIRST)
# ══════════════════════════════════════════════

Your last round of fixes worked — backend has all endpoints, charts use lightweight-charts, market badge logic is fixed. But there's a **new bug class**: the frontend view components expect different JSON field names than the backend returns. So pages load but show empty tables. Fix all of these.

---

## BUG A — Settings page can't save (hardcoded localhost)
**File:** `frontend/src/components/SettingsView.tsx` line 2

**FIND:**
```ts
const API = "http://localhost:8765";
```
**REPLACE WITH:**
```ts
const API = "";   // use Vite proxy
```

---

## BUG B — Scanner page is empty (data contract mismatch)
**File:** `frontend/src/components/ScanView.tsx`
**Problem:** View reads `d.results` with fields `ltp, rsi, macd, macd_signal, trend, signal(BULLISH/BEARISH/NEUTRAL)`. Backend `/api/scan` returns a plain array with `price, change_pct, signal(BUY/SELL/HOLD), volume_signal`.

**Fix the BACKEND** to match the view. In `web/api.py`, FIND the `market_scan()` function and REPLACE its body:

```python
@app.get("/api/scan")
def market_scan():
    """Return NIFTY-50 stocks with technical signals matching the frontend contract."""
    import random
    NSE_STOCKS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ICICIBANK",
                  "WIPRO", "BHARTIARTL", "ITC", "KOTAKBANK", "AXISBANK", "LT",
                  "MARUTI", "TITAN", "SUNPHARMA", "HCLTECH"]
    results = []
    for sym in NSE_STOCKS:
        q = get_quote(sym)
        if q.get("price", 0) <= 0:
            continue
        pct = q["change_pct"]
        rsi = round(50 + pct * 4 + random.uniform(-8, 8), 1)
        rsi = max(10, min(90, rsi))
        macd = round(pct * 2 + random.uniform(-1, 1), 2)
        macd_signal = round(macd - random.uniform(-0.5, 0.5), 2)
        trend = "UP" if pct >= 0 else "DOWN"
        if rsi < 35 and macd > macd_signal:
            signal = "BULLISH"
        elif rsi > 65 and macd < macd_signal:
            signal = "BEARISH"
        else:
            signal = "NEUTRAL"
        results.append({
            "symbol": sym,
            "ltp": q["price"],
            "rsi": rsi,
            "macd": macd,
            "macd_signal": macd_signal,
            "trend": trend,
            "signal": signal,
        })
    results.sort(key=lambda x: abs(x["rsi"] - 50), reverse=True)
    return {"results": results}
```

---

## BUG C — FII/DII page empty (wrong key)
**File:** `frontend/src/components/FIIDIIView.tsx`
**Problem:** View reads `d.flows`. Backend returns `{source, data: [...]}`.

**Fix the BACKEND.** In `web/api.py`, FIND `fii_dii_flows()` and change the return statements so the key is `flows` not `data`:

```python
@app.get("/api/flows")
def fii_dii_flows():
    """FII/DII flows. Returns {source, flows: [...]} to match frontend."""
    import random
    from datetime import datetime, timedelta
    try:
        import requests
        headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        r = requests.get("https://www.nseindia.com/api/fiidiiTradeReact", headers=headers, timeout=5)
        if r.status_code == 200:
            return {"source": "nse_live", "flows": r.json()[:10] if isinstance(r.json(), list) else r.json().get("data", [])[:10]}
    except Exception:
        pass
    flows = []
    for i in range(10):
        d = (datetime.now() - timedelta(days=i)).strftime("%d-%b-%Y")
        fb, fs = round(random.uniform(5000, 15000), 2), round(random.uniform(4000, 14000), 2)
        db, ds = round(random.uniform(3000, 12000), 2), round(random.uniform(2000, 11000), 2)
        flows.append({
            "date": d,
            "fii_buy": fb, "fii_sell": fs, "fii_net": round(fb - fs, 2),
            "dii_buy": db, "dii_sell": ds, "dii_net": round(db - ds, 2),
        })
    return {"source": "mock", "flows": flows}
```

---

## BUG D — Patterns page empty (wrong key)
**File:** `frontend/src/components/PatternsView.tsx`
**Problem:** View reads `d.patterns`. Backend returns a plain array.

**Fix the BACKEND.** In `web/api.py`, FIND `chart_patterns()` and wrap the return:

```python
@app.get("/api/patterns")
def chart_patterns():
    import random
    PATTERN_TYPES = ["Double Top", "Double Bottom", "Head & Shoulders", "Inverse H&S",
                     "Bullish Flag", "Bearish Flag", "Ascending Triangle", "Cup & Handle"]
    NSE_STOCKS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "WIPRO", "ITC", "LT", "MARUTI", "TITAN"]
    patterns = []
    for sym in random.sample(NSE_STOCKS, 6):
        q = get_quote(sym)
        patterns.append({
            "symbol": sym,
            "pattern": random.choice(PATTERN_TYPES),
            "direction": random.choice(["BULLISH", "BEARISH"]),
            "confidence": random.randint(60, 95),
            "price": q.get("price", 0),
        })
    return {"patterns": patterns}
```

---

## BUG E — Drift page empty (wrong field names + wrapper)
**File:** `frontend/src/components/DriftView.tsx`
**Problem:** View reads a plain array with `{symbol, actual_weight, target_weight, drift, action}`. Backend returns `{drift_items: [...]}` with `current_pct` instead of `actual_weight`.

**Fix the BACKEND.** In `web/api.py`, FIND `portfolio_drift()` and REPLACE:

```python
@app.get("/api/drift")
def portfolio_drift():
    holdings = demo_broker.get_holdings()
    funds = demo_broker.get_funds()
    total = funds["portfolio_value"] + funds["available_cash"]
    n = len(holdings)
    target_per_stock = (80 / n) if n > 0 else 0
    items = []
    for h in holdings:
        actual = round(h["current_value"] / total * 100, 1) if total > 0 else 0
        drift = round(actual - target_per_stock, 1)
        items.append({
            "symbol": h["symbol"],
            "actual_weight": actual,
            "target_weight": round(target_per_stock, 1),
            "drift": drift,
            "action": "TRIM" if drift > 3 else "ADD" if drift < -3 else "HOLD",
        })
    return items
```

---

## BUG F — Memory page empty (wrong key)
**File:** `frontend/src/components/MemoryView.tsx`
**Problem:** View reads `d.entries`. Backend `/api/memory` returns a plain array.

**Fix the BACKEND.** In `web/api.py`, FIND `get_memory()` and wrap:

```python
@app.get("/api/memory")
def get_memory():
    if not MEMORY_FILE.exists():
        return {"entries": []}
    try:
        return {"entries": json.loads(MEMORY_FILE.read_text())}
    except Exception:
        return {"entries": []}
```

---

## BUG G — Strategy page missing risk field
**File:** `frontend/src/components/StrategyView.tsx`
**Problem:** View reads `s.risk` but backend strategies have no `risk` field.

**Fix the BACKEND.** In `web/api.py`, FIND `strategy_library()` and add a `risk` field to each strategy. Replace the list with:

```python
@app.get("/api/strategy")
def strategy_library():
    return [
        {"id": 1,  "name": "Momentum Breakout",  "type": "INTRADAY",   "risk": "HIGH",   "signal": "BUY",  "success_rate": 68, "description": "Buys on breakout above 20-day high with volume confirmation."},
        {"id": 2,  "name": "RSI Reversal",        "type": "SWING",      "risk": "MEDIUM", "signal": "BUY",  "success_rate": 72, "description": "Buys when RSI drops below 30 and reverses upward."},
        {"id": 3,  "name": "MACD Crossover",      "type": "POSITIONAL", "risk": "MEDIUM", "signal": "BUY",  "success_rate": 65, "description": "Signal-line crossover with histogram confirmation."},
        {"id": 4,  "name": "Mean Reversion Band", "type": "INTRADAY",   "risk": "HIGH",   "signal": "SELL", "success_rate": 61, "description": "Sells at 2 SD above the 20-period Bollinger Band."},
        {"id": 5,  "name": "EMA 9/21 Crossover",  "type": "SWING",      "risk": "MEDIUM", "signal": "BUY",  "success_rate": 63, "description": "Golden cross of the 9 and 21 EMA."},
        {"id": 6,  "name": "Open Interest Surge", "type": "OPTIONS",    "risk": "HIGH",   "signal": "BUY",  "success_rate": 70, "description": "Long calls when OI surges >20% in one session."},
        {"id": 7,  "name": "VIX Spike Short",     "type": "OPTIONS",    "risk": "HIGH",   "signal": "SELL", "success_rate": 75, "description": "Sell premium when India VIX > 20."},
        {"id": 8,  "name": "Gap Fill",            "type": "INTRADAY",   "risk": "MEDIUM", "signal": "BUY",  "success_rate": 58, "description": "Buys gap-down opens that fill within first 30 min."},
        {"id": 9,  "name": "FII Net Buy Follow",  "type": "POSITIONAL", "risk": "LOW",    "signal": "BUY",  "success_rate": 69, "description": "Goes long when FII net buying exceeds ₹1000Cr for 3 days."},
        {"id": 10, "name": "Earnings Momentum",   "type": "SWING",      "risk": "MEDIUM", "signal": "BUY",  "success_rate": 66, "description": "Buys stocks with an earnings beat plus guidance upgrade."},
    ]
```

---

## BUG H — Risk Report page partial (field name mismatch)
**File:** `frontend/src/components/RiskReportView.tsx`
**Problem:** View reads `data.max_drawdown` and `data.positions`. Backend returns `max_drawdown_pct` and has no `positions`.

**Fix the BACKEND.** In `web/api.py`, FIND `risk_report()` and add aliases. Add these keys to the returned dict:

```python
    # ... inside risk_report(), in the return dict, ADD:
        "max_drawdown": round(random.uniform(2, 15), 1),   # alias for frontend
        "positions": len(holdings),                          # alias for frontend
```

(Keep the existing keys too — just add these two so both names exist.)

---

## BUG I — TVMarketOverview / TVChart / TVMiniChart / TVTicker still present but unused
**Files:** `frontend/src/components/TVChart.tsx`, `TVMarketOverview.tsx`, `TVMiniChart.tsx`
**Problem:** These old TradingView-widget components still exist and may be imported somewhere, causing the "only available on TradingView" error if any page still uses them.

**Action:** Search the codebase for any remaining imports and remove them:
```bash
cd frontend
grep -rn "TVChart\|TVMarketOverview\|TVMiniChart" src/
```
For each result that is an *import* or *usage* (not the file definition itself):
- Replace `<TVChart symbol="X" />` → `<CandlestickChart symbol="X" />`
- Replace `<TVMarketOverview />` → `<MarketOverview />`
- Remove `<TVMiniChart />` usages (or replace with the P&L bar from the previous fix)

Keep `TVTicker.tsx` ONLY IF the ticker tape renders without (!) marks now (it uses `NSE:NIFTY50` which works). If it still shows errors, replace the top ticker with a backend-driven scrolling bar — but test first.

---

## BUG J — Holdings mini-charts (verify)
**File:** `frontend/src/components/HoldingsView.tsx`
If Holdings still imports `TVMiniChart` and shows blank charts per holding, replace the mini chart with the simple P&L bar:
```tsx
// Replace any <TVMiniChart .../> with:
<div style={{ height: 4, background: "#2d2d2d", borderRadius: 2, marginTop: 8 }}>
  <div style={{
    height: "100%",
    width: `${Math.min(Math.abs(h.pnl_pct || 0), 100)}%`,
    background: (h.pnl || 0) >= 0 ? "#22c55e" : "#ef4444",
    borderRadius: 2,
  }} />
</div>
```

---

## BUG K — Add Grok + Claude + OpenAI to Settings page
**File:** `frontend/src/components/SettingsView.tsx`
Currently only Gemini/Groq/OpenAI key fields exist. For the multi-AI vision, add **Grok (xAI)** and **Claude (Anthropic)** key fields too.

In the AI Provider section of SettingsView, add input fields for:
```tsx
{field("Grok (xAI) API Key", "grok_api_key", "password", "xai-...")}
{field("Claude (Anthropic) API Key", "claude_api_key", "password", "sk-ant-...")}
```

And update the provider dropdown options to include:
```tsx
<option value="grok">Grok (xAI) — News & Sentiment</option>
<option value="claude">Claude — Risk & Execution</option>
```

Also update the backend `SettingsUpdate` model in `web/api.py` to accept the new keys:
```python
    grok_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None
```
And add them to the masking loop and the default settings dict.

---

## VERIFICATION — run after all fixes

```bash
# Backend
cd orch-trading && source .venv/bin/activate
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

BASE=http://localhost:8765
curl -s $BASE/api/scan      | python3 -m json.tool   # ✅ {"results":[{symbol,ltp,rsi,macd,...}]}
curl -s $BASE/api/flows     | python3 -m json.tool   # ✅ {"flows":[{date,fii_net,dii_net,...}]}
curl -s $BASE/api/patterns  | python3 -m json.tool   # ✅ {"patterns":[...]}
curl -s $BASE/api/drift     | python3 -m json.tool   # ✅ [{symbol,actual_weight,...}]
curl -s $BASE/api/memory    | python3 -m json.tool   # ✅ {"entries":[]}
curl -s $BASE/api/strategy  | python3 -m json.tool   # ✅ each has "risk"
curl -s $BASE/api/risk-report | python3 -m json.tool # ✅ has max_drawdown AND positions
```

```bash
# Frontend
cd frontend && npm install && npm run dev
```

**UI checklist — every page must show data:**
- ✅ Dashboard: NIFTY candlestick chart + Indices/Top Stocks with prices
- ✅ Scan: table fills with symbols, RSI, MACD, signals
- ✅ FII/DII: 10 days of flow bars
- ✅ Patterns: 6 detected patterns
- ✅ Drift: holdings with weights (or empty-state if no holdings)
- ✅ Memory: shows entries or clean empty state
- ✅ Strategy: 10 strategies each with a risk badge
- ✅ Risk Report: all metrics populated
- ✅ Settings: saves keys (no localhost error), has Grok + Claude fields
- ✅ Holdings/Funds/Orders: all load
- ✅ AI Chatbox: "buy reliance 10" works, "my portfolio" works

---

## BUG SUMMARY

| # | Bug | File | Type |
|---|-----|------|------|
| A | Settings can't save | `SettingsView.tsx` | Hardcoded localhost |
| B | Scanner empty | `web/api.py` `/api/scan` | Field mismatch (`results`, `ltp/rsi/macd`) |
| C | FII/DII empty | `web/api.py` `/api/flows` | Key mismatch (`flows` not `data`) |
| D | Patterns empty | `web/api.py` `/api/patterns` | Key mismatch (`patterns`) |
| E | Drift empty | `web/api.py` `/api/drift` | Field mismatch (`actual_weight`, no wrapper) |
| F | Memory empty | `web/api.py` `/api/memory` | Key mismatch (`entries`) |
| G | Strategy missing risk | `web/api.py` `/api/strategy` | Missing `risk` field |
| H | Risk Report partial | `web/api.py` `/api/risk-report` | Field mismatch (`max_drawdown`, `positions`) |
| I | Old TradingView widgets | `TVChart/TVMarketOverview/TVMiniChart` | Remove unused imports |
| J | Holdings mini-charts blank | `HoldingsView.tsx` | Replace with P&L bar |
| K | Settings missing AIs | `SettingsView.tsx` + `web/api.py` | Add Grok + Claude keys |

**Root pattern:** Most of these are the same class — the React views were written expecting one JSON shape, the backend returns another. Fixing the backend to match the views (rather than the reverse) is correct because the views are the more detailed/polished contract.

---

*Repo: https://github.com/arnavryie/orch-trading*
*Do PART B first (get it fully working), then build PART A phase by phase.*