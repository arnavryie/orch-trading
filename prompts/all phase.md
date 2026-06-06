# ORCH-TRADING — PHASES 4 + 5 + 6 (COMBINED)
## The complete build guide: Consensus Engine → Track Record → Polish
## For Antigravity — paste this entire file, build in order

**Repo:** https://github.com/arnavryie/orch-trading
**Prerequisite:** Phases 1–3 are done — demo trading, live data, all pages work, and the AI Council (`agent/council.py` + the Council UI) is functional.

This single document contains the final three phases that turn the app from "works" into a complete, differentiated, defensible product:

- **PHASE 4 — The Consensus Engine:** auto-trading that only fires when the AI council agrees above your thresholds. Safe, explainable automation.
- **PHASE 5 — The AI Track Record:** score every prediction against what prices actually did → per-AI accuracy scoreboard → accurate AIs get more vote weight. The data moat.
- **PHASE 6 — Polish & Differentiate:** Devil's Advocate, Risk Personality, Explain-This-Trade, and the Daily Desk Digest.

### Build order (important)
1. Do **Phase 4** completely, verify with its curl checks.
2. Do **Phase 5** completely (it depends on Phase 4's decision logging), verify.
3. Do **Phase 6** completely (it depends on the council from Phase 2 + logging from Phase 4/5), verify.

Each phase below has its own steps, code, and verification checklist. Don't skip the verification between phases.

---
---


# ═══════════════════════════════════════════════════════════════
# ░░░ PHASE 4 OF 6 ░░░
# ═══════════════════════════════════════════════════════════════

## Auto-trading gated by AI council agreement
## For Antigravity — paste this entire file

**Repo:** https://github.com/arnavryie/orch-trading
**Prerequisite:** Phases 2 & 3 done — `agent/council.py` and the Council UI work.
**This builds:** an auto-trader that runs the **council** on your watchlist on a loop, and only places a (demo) trade when **agreement AND confidence both clear your thresholds**. Every decision is logged — which becomes the data for Phase 5's AI track record.

**The core idea:** automation that is *safe and explainable*. Not a reckless bot — the council must agree above a bar you set before any money moves. The Risk Manager (Claude) already has the final word inside each council run.

---

## ⚠️ FIRST — the existing auto_trader.py is broken

`engine/auto_trader.py` calls `get_demo_broker()`, `funds.available_cash`, and `OrderRequest` — none of which exist in your current demo broker (which uses module functions returning dicts). It also uses single-Gemini, not the council. **We replace it entirely.** The stub endpoints in `web/api.py` (`_auto_trader_running` global) also get replaced with real ones.

---

## STEP 1 — Replace `engine/auto_trader.py` entirely

```python
"""
engine/auto_trader.py
─────────────────────
CONSENSUS-GATED AUTO-TRADER.
Runs the AI council on each watchlist symbol on a loop. Only executes a demo
trade when the council's agreement AND confidence both clear user thresholds.
Every decision (executed or skipped) is logged for the AI track record.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from collections import deque

log = logging.getLogger(__name__)

DIR = Path.home() / ".orch-trading"
SETTINGS_FILE = DIR / "settings.json"
MEMORY_FILE = DIR / "memory.json"


def _load_settings() -> dict:
    DIR.mkdir(parents=True, exist_ok=True)
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text())
        except Exception:
            pass
    return {}


def _append_memory(entry: dict):
    """Log a council decision to memory.json (feeds Phase 5 track record)."""
    mem = []
    if MEMORY_FILE.exists():
        try:
            mem = json.loads(MEMORY_FILE.read_text())
        except Exception:
            mem = []
    entry["timestamp"] = datetime.now().isoformat()
    mem.insert(0, entry)
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(mem[:300], indent=2))


class AutoTrader:
    """Background engine that trades on council consensus."""

    def __init__(self):
        self._running = False
        self._task: asyncio.Task | None = None
        self._status = "stopped"
        self._cycle = 0
        self._trades_today = 0
        self._daily_pnl = 0.0
        self._last_run: str | None = None
        # In-memory rolling activity log for the live UI feed
        self._activity: deque = deque(maxlen=50)

    # ── Status ──────────────────────────────────────────────────────────
    def get_status(self) -> dict:
        s = _load_settings()
        return {
            "running": self._running,
            "status": self._status,
            "cycle": self._cycle,
            "trades_today": self._trades_today,
            "daily_pnl": round(self._daily_pnl, 2),
            "last_run": self._last_run,
            "settings": {
                "auto_execute": s.get("auto_execute", False),
                "min_agreement": s.get("min_agreement", 75),
                "min_confidence": s.get("min_confidence", 65),
                "scan_interval_min": s.get("scan_interval_min", 5),
                "max_position_size": s.get("max_position_size", 50000),
                "daily_loss_limit": s.get("daily_loss_limit", 10000),
            },
            "activity": list(self._activity),
        }

    def _log_activity(self, item: dict):
        item["time"] = datetime.now().strftime("%H:%M:%S")
        self._activity.appendleft(item)

    # ── Lifecycle ───────────────────────────────────────────────────────
    def start(self):
        if self._running:
            return
        self._running = True
        self._status = "running"
        self._task = asyncio.create_task(self._loop())
        self._log_activity({"kind": "system", "msg": "Auto-trader started"})
        log.info("[auto_trader] started")

    def stop(self):
        self._running = False
        self._status = "stopped"
        if self._task and not self._task.done():
            self._task.cancel()
        self._log_activity({"kind": "system", "msg": "Auto-trader stopped"})
        log.info("[auto_trader] stopped")

    async def _loop(self):
        while self._running:
            try:
                s = _load_settings()
                interval = max(1, int(s.get("scan_interval_min", 5))) * 60
                from market.free_data import is_market_open
                if is_market_open():
                    await self.run_cycle()
                else:
                    self._status = "market_closed"
                    self._log_activity({"kind": "system", "msg": "Market closed — waiting"})
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.error("[auto_trader] loop error: %s", e)
                self._status = "error"
                await asyncio.sleep(60)

    # ── One scan cycle ──────────────────────────────────────────────────
    async def run_cycle(self):
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from agent.council import run_council
        from brokers import demo as broker

        s = _load_settings()
        self._cycle += 1
        self._last_run = datetime.now().isoformat()
        self._status = "scanning"

        auto_execute   = s.get("auto_execute", False)
        min_agreement  = int(s.get("min_agreement", 75))
        min_confidence = int(s.get("min_confidence", 65))
        max_pos        = float(s.get("max_position_size", 50000))
        daily_limit    = float(s.get("daily_loss_limit", 10000))
        watchlist      = s.get("watchlist", ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN"])

        # Daily loss circuit breaker
        if self._daily_pnl <= -daily_limit:
            self._status = "halted_loss_limit"
            self._log_activity({"kind": "halt", "msg": f"Daily loss limit ₹{daily_limit:,.0f} hit — trading paused"})
            return

        funds = broker.get_funds()
        holdings = {h["symbol"]: h for h in broker.get_holdings()}

        for sym in watchlist[:8]:
            if not self._running:
                break
            try:
                result = await run_council(sym)
            except Exception as e:
                log.error("[auto_trader] council failed for %s: %s", sym, e)
                continue

            c = result.get("consensus", {})
            action = c.get("action", "NO DATA")
            agreement = c.get("agreement", 0)
            confidence = c.get("confidence", 0)
            price = result.get("price", 0)

            gate_passed = agreement >= min_agreement and confidence >= min_confidence

            decision = {
                "kind": "decision",
                "symbol": sym,
                "action": action,
                "agreement": agreement,
                "confidence": confidence,
                "price": price,
                "gate_passed": gate_passed,
                "executed": False,
                "votes": result.get("votes", []),
            }

            # ── BUY ──
            if action == "BUY" and gate_passed:
                size = result.get("suggested_size", 0) or min(max_pos, 25000)
                size = min(size, max_pos, funds["available_cash"])
                qty = int(size / price) if price > 0 else 0
                if qty > 0:
                    if auto_execute:
                        r = broker.place_order(sym, qty, "BUY", price)
                        decision["executed"] = r.get("success", False)
                        decision["msg"] = r.get("message") or r.get("error", "")
                        if r.get("success"):
                            self._trades_today += 1
                            self._daily_pnl -= qty * price
                            funds = broker.get_funds()  # refresh cash
                        self._log_activity({"kind": "trade", "msg": f"BUY {qty} {sym} @ ₹{price:,.0f} — council {agreement}% agree", "executed": decision["executed"]})
                    else:
                        decision["msg"] = f"Would BUY {qty} {sym} (monitor-only mode)"
                        self._log_activity({"kind": "signal", "msg": f"BUY signal: {sym} {agreement}% agree, {confidence}% conf (not executed — monitor mode)"})
                else:
                    decision["msg"] = "Insufficient funds for min qty"

            # ── SELL (only if we hold it) ──
            elif action == "SELL" and gate_passed and sym in holdings:
                qty = holdings[sym]["quantity"]
                if auto_execute and qty > 0:
                    r = broker.place_order(sym, qty, "SELL", price)
                    decision["executed"] = r.get("success", False)
                    decision["msg"] = r.get("message") or r.get("error", "")
                    if r.get("success"):
                        self._trades_today += 1
                        self._daily_pnl += qty * price
                    self._log_activity({"kind": "trade", "msg": f"SELL {qty} {sym} @ ₹{price:,.0f} — council {agreement}% agree", "executed": decision["executed"]})
                else:
                    decision["msg"] = f"Would SELL {qty} {sym} (monitor-only mode)"
                    self._log_activity({"kind": "signal", "msg": f"SELL signal: {sym} (not executed — monitor mode)"})

            # ── No action ──
            else:
                reason = "gate not passed" if not gate_passed else f"action={action}"
                decision["msg"] = f"No trade ({reason})"

            # Log every council decision for the track record (Phase 5)
            _append_memory({
                "type": "council_decision",
                "symbol": sym,
                "action": action,
                "agreement": agreement,
                "confidence": confidence,
                "price": price,
                "executed": decision["executed"],
                "auto_execute_mode": auto_execute,
                "consensus_summary": c.get("summary", ""),
                "votes": [{"ai": v.get("ai"), "verdict": v.get("verdict"), "confidence": v.get("confidence")} for v in result.get("votes", [])],
            })

        self._status = "running" if self._running else "stopped"


# ── Singleton ─────────────────────────────────────────────────
_auto_trader: AutoTrader | None = None

def get_auto_trader() -> AutoTrader:
    global _auto_trader
    if _auto_trader is None:
        _auto_trader = AutoTrader()
    return _auto_trader
```

---

## STEP 2 — Replace the stub endpoints in `web/api.py`

FIND the existing stub block (the three `/api/auto-trader/*` functions using `_auto_trader_running`) and REPLACE all three with:

```python
# ─── AUTO-TRADER (Consensus Engine) ───────────────────────────────────────────
@app.post("/api/auto-trader/start")
def start_auto_trader():
    from engine.auto_trader import get_auto_trader
    at = get_auto_trader()
    at.start()
    return at.get_status()

@app.post("/api/auto-trader/stop")
def stop_auto_trader():
    from engine.auto_trader import get_auto_trader
    at = get_auto_trader()
    at.stop()
    return at.get_status()

@app.get("/api/auto-trader/status")
def auto_trader_status():
    from engine.auto_trader import get_auto_trader
    return get_auto_trader().get_status()

@app.post("/api/auto-trader/run-once")
async def auto_trader_run_once():
    """Manually trigger one council scan cycle right now (for testing)."""
    from engine.auto_trader import get_auto_trader
    at = get_auto_trader()
    await at.run_cycle()
    return at.get_status()
```

Add `/api/auto-trader/run-once` to `frontend/src/api/client.ts` under `autoTrader`:
```ts
  autoTrader: {
    start:  () => post('/api/auto-trader/start'),
    stop:   () => post('/api/auto-trader/stop'),
    status: () => get('/api/auto-trader/status'),
    runOnce: () => post('/api/auto-trader/run-once'),
  },
```

---

## STEP 3 — Add the new threshold settings

In `web/api.py`, in `load_settings()` default dict, ADD:
```python
            "auto_execute": False,
            "min_agreement": 75,
            "min_confidence": 65,
            "scan_interval_min": 5,
```

In the `SettingsUpdate` model, ADD:
```python
    auto_execute: Optional[bool] = None
    min_agreement: Optional[int] = None
    min_confidence: Optional[int] = None
    scan_interval_min: Optional[int] = None
```

---

## STEP 4 — Build the Auto-Trader control panel UI

Create `frontend/src/components/AutoTraderView.tsx`:

```tsx
// frontend/src/components/AutoTraderView.tsx
// THE CONSENSUS ENGINE control panel — start/stop council-driven auto-trading.
import { useState, useEffect, useRef } from 'react';

const API = '';

interface Activity { time: string; kind: string; msg: string; executed?: boolean; }
interface Status {
  running: boolean;
  status: string;
  cycle: number;
  trades_today: number;
  daily_pnl: number;
  last_run: string | null;
  settings: {
    auto_execute: boolean;
    min_agreement: number;
    min_confidence: number;
    scan_interval_min: number;
    max_position_size: number;
    daily_loss_limit: number;
  };
  activity: Activity[];
}

const kindColor = (k: string) =>
  k === 'trade' ? '#22c55e' : k === 'signal' ? '#4184f3' : k === 'halt' ? '#ef4444' : '#888';

export default function AutoTraderView() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await fetch(`${API}/api/auto-trader/status`).then(r => r.json());
      setStatus(s);
      if (s.settings) setSettings((prev: any) => ({ ...s.settings, ...prev }));
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const saveSettings = async (patch: any) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await fetch(`${API}/api/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  };

  const toggle = async () => {
    setBusy(true);
    const endpoint = status?.running ? 'stop' : 'start';
    await fetch(`${API}/api/auto-trader/${endpoint}`, { method: 'POST' });
    await fetchStatus();
    setBusy(false);
  };

  const runOnce = async () => {
    setBusy(true);
    await fetch(`${API}/api/auto-trader/run-once`, { method: 'POST' });
    await fetchStatus();
    setBusy(false);
  };

  const running = status?.running;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar page-enter" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header + master switch */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Consensus Engine</h1>
            <p className="text-[#888] text-sm mt-1">Auto-trades only when the AI council agrees above your thresholds.</p>
          </div>
          <button
            onClick={toggle}
            disabled={busy}
            className={`btn-press px-6 py-3 rounded-xl font-bold text-sm transition-smooth ${
              running ? 'bg-[#ef4444] text-white' : 'bg-[#22c55e] text-black'
            } disabled:opacity-50`}
          >
            {busy ? '…' : running ? '■ Stop Engine' : '▶ Start Engine'}
          </button>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Status', value: status?.status ?? '—', color: running ? '#22c55e' : '#888' },
            { label: 'Scans run', value: status?.cycle ?? 0, color: '#fff' },
            { label: 'Trades today', value: status?.trades_today ?? 0, color: '#4184f3' },
            { label: "Today's P&L", value: `₹${(status?.daily_pnl ?? 0).toLocaleString('en-IN')}`, color: (status?.daily_pnl ?? 0) >= 0 ? '#22c55e' : '#ef4444' },
          ].map(card => (
            <div key={card.label} className="card-lift bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
              <div className="text-[#666] text-[11px] uppercase tracking-wider">{card.label}</div>
              <div className="text-lg font-bold mt-1" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Safety banner */}
        <div className={`rounded-lg p-3 mb-6 text-[13px] border ${
          settings.auto_execute
            ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ffb4ab]'
            : 'bg-[#4184f3]/10 border-[#4184f3]/30 text-[#9dc0ff]'
        }`}>
          {settings.auto_execute
            ? '⚡ LIVE EXECUTION: the engine will place demo orders automatically when the council agrees.'
            : '👁 MONITOR-ONLY: the engine logs signals but does NOT place orders. Flip the switch below to enable execution.'}
        </div>

        {/* Threshold controls */}
        <div className="bg-[#0f0f0f] rounded-xl p-5 border border-[#1a1a1a] mb-6">
          <h3 className="text-white font-bold text-sm mb-4">Trading Rules</h3>

          {/* Auto-execute toggle */}
          <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a]">
            <div>
              <div className="text-white text-sm">Auto-execute trades</div>
              <div className="text-[#666] text-[11px]">Off = signals only. On = places demo orders.</div>
            </div>
            <button
              onClick={() => saveSettings({ auto_execute: !settings.auto_execute })}
              className={`w-12 h-6 rounded-full transition-smooth relative ${settings.auto_execute ? 'bg-[#22c55e]' : 'bg-[#333]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${settings.auto_execute ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Min agreement slider */}
          <SliderRow
            label="Min council agreement"
            hint="Only act when this % of AIs agree"
            value={settings.min_agreement ?? 75}
            min={50} max={100} step={5} suffix="%"
            onChange={(v) => saveSettings({ min_agreement: v })}
          />

          {/* Min confidence slider */}
          <SliderRow
            label="Min confidence"
            hint="Only act above this confidence level"
            value={settings.min_confidence ?? 65}
            min={40} max={95} step={5} suffix="%"
            onChange={(v) => saveSettings({ min_confidence: v })}
          />

          {/* Scan interval */}
          <SliderRow
            label="Scan interval"
            hint="How often to run the council on your watchlist"
            value={settings.scan_interval_min ?? 5}
            min={1} max={30} step={1} suffix=" min"
            onChange={(v) => saveSettings({ scan_interval_min: v })}
          />
        </div>

        {/* Run once (testing) */}
        <button
          onClick={runOnce}
          disabled={busy}
          className="btn-press w-full py-3 rounded-lg bg-[#1a1a1a] text-[#ccc] text-sm mb-6 hover:bg-[#222] transition-smooth disabled:opacity-50"
        >
          {busy ? 'Running council scan…' : '↻ Run one scan now (test)'}
        </button>

        {/* Live activity feed */}
        <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Live Activity</h3>
            {running && <span className="flex items-center gap-1.5 text-[11px] text-[#22c55e]"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />running</span>}
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            {(!status?.activity || status.activity.length === 0) ? (
              <div className="text-center py-10 text-[#555] text-sm">
                No activity yet. Start the engine or run a scan.
              </div>
            ) : (
              status.activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#141414] fade-in">
                  <span className="text-[#444] text-[11px] tabular-nums w-16">{a.time}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: kindColor(a.kind) }} />
                  <span className="text-[#ccc] text-[13px] flex-1">{a.msg}</span>
                  {a.executed !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.executed ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#666]/15 text-[#888]'}`}>
                      {a.executed ? 'EXECUTED' : 'LOGGED'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-[#555] text-[11px] mt-4 text-center">
          Demo mode · virtual money · the Risk Manager (Claude) has the final word inside every council run · not financial advice
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, hint, value, min, max, step, suffix, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-3 border-b border-[#1a1a1a] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-white text-sm">{label}</div>
          <div className="text-[#666] text-[11px]">{hint}</div>
        </div>
        <span className="text-primary font-bold text-sm tabular-nums">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#4184f3] cursor-pointer"
      />
    </div>
  );
}
```

---

## STEP 5 — Add to navigation

In `frontend/src/App.tsx`:

1. Import:
```tsx
import AutoTraderView from './components/AutoTraderView';
```
2. Add a case in `renderContent()`:
```tsx
      case 'Auto-Trader': return <AutoTraderView />;
```
3. Add to the secondary sidebar tools array, right after Council:
```tsx
                ['Auto-Trader', '🤖'],
```

(Consider making both `Council` and `Auto-Trader` primary tabs in `TopNav` — they're your flagship features.)

---

## STEP 6 — Verify

```bash
# Backend
cd orch-trading && source .venv/bin/activate
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# Status (should be stopped initially)
curl -s http://localhost:8765/api/auto-trader/status | python3 -m json.tool

# Run one scan manually (needs at least 1 AI key in Settings + market context)
curl -s -X POST http://localhost:8765/api/auto-trader/run-once | python3 -m json.tool
# ✅ activity array shows council decisions per watchlist symbol

# Start the background engine
curl -s -X POST http://localhost:8765/api/auto-trader/start | python3 -m json.tool
# ✅ running: true

# Stop
curl -s -X POST http://localhost:8765/api/auto-trader/stop | python3 -m json.tool
```

**UI checklist:**
- ✅ Auto-Trader page shows Start/Stop master switch
- ✅ Status cards: status, scans run, trades today, daily P&L
- ✅ Monitor-only vs Live-execution banner changes with the toggle
- ✅ Three sliders (agreement %, confidence %, scan interval) save instantly
- ✅ "Run one scan now" triggers a council scan and fills the activity feed
- ✅ Activity feed shows decisions with colored dots + EXECUTED/LOGGED badges
- ✅ With auto-execute ON and a BUY that clears the gate → Holdings updates
- ✅ With auto-execute OFF → signals appear but no orders placed

---

## HOW IT ALL CONNECTS

```
Watchlist symbol
   ↓
run_council(symbol)            ← Phase 2: Scout + Fundamental + Technical + Risk vote
   ↓
consensus { action, agreement, confidence }
   ↓
GATE: agreement ≥ your %  AND  confidence ≥ your %  ?
   ├─ NO  → log "no trade", show in activity feed
   └─ YES → auto_execute ON?
              ├─ NO  → log signal (monitor-only)
              └─ YES → place demo order, update P&L
   ↓
_append_memory(council_decision)   ← becomes Phase 5 track-record data
```

**Safety layers (this is the anti-reckless-bot design):**
1. Risk Manager (Claude) has the final word *inside* every council run.
2. The consensus gate — nothing trades unless agreement AND confidence both clear your bars.
3. Monitor-only default — `auto_execute` is OFF until you explicitly turn it on.
4. Daily loss circuit breaker — halts automatically if losses hit your limit.
5. Position size cap — every order capped at `max_position_size`.
6. Demo money only — no real funds at risk.

---

## WHAT'S NEXT (Phase 5 preview)

Every council decision is now logged to `memory.json` with the verdict, agreement, and which AIs voted what. Phase 5 turns that history into the **AI Track Record**:
- Compare each logged prediction to what the price actually did N days later
- Build a scoreboard: "Gemini's technical calls: 64% accurate. GPT's fundamentals: 58%."
- Weight each AI's council vote by its historical accuracy → the system gets smarter the longer it runs.

That's the data moat. But get Phase 4 solid and watch the activity feed light up first.

---

*Repo: https://github.com/arnavryie/orch-trading*
*Build order: Step 1 (engine) → Step 2-3 (endpoints + settings) → verify with curl → Step 4-5 (UI) → verify full flow.*


# ═══════════════════════════════════════════════════════════════
# ░░░ PHASE 5 OF 6 ░░░
# ═══════════════════════════════════════════════════════════════

## Score every prediction, build the scoreboard, weight votes by accuracy
## For Antigravity — paste this entire file

**Repo:** https://github.com/arnavryie/orch-trading
**Prerequisite:** Phase 4 done — council decisions are being logged to `memory.json`.
**This builds the data moat:** score each logged council prediction against what the price *actually did* a few days later → build a per-AI accuracy scoreboard → feed those accuracies back so the more accurate an AI has been, the more its vote counts. The longer the app runs, the smarter and more personalized it gets. Nobody can copy your accumulated track record.

**The loop that makes it a moat:**
```
Council predicts → logged → time passes → price moves → we score the call
   → AI accuracy updates → accurate AIs get more vote weight → better consensus
```

---

## STEP 1 — Make EVERY council run get logged (not just the auto-trader)

Right now only the auto-trader logs decisions. The manual Council view (Phase 3) doesn't — so the track record only fills when automation runs. Fix that: log every council run from the endpoint.

In `web/api.py`, FIND the `/api/council` endpoint and REPLACE it with:

```python
@app.post("/api/council")
async def council(req: CouncilRequest):
    """Run the multi-AI council and log the decision for the track record."""
    from agent.council import run_council
    try:
        result = await run_council(req.symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Log this prediction so it can be scored later (Phase 5 track record)
    try:
        from engine.auto_trader import _append_memory
        c = result.get("consensus", {})
        _append_memory({
            "type": "council_decision",
            "symbol": result.get("symbol"),
            "action": c.get("action"),
            "agreement": c.get("agreement", 0),
            "confidence": c.get("confidence", 0),
            "price": result.get("price", 0),
            "executed": False,
            "source": "manual",
            "consensus_summary": c.get("summary", ""),
            "votes": [
                {"ai": v.get("ai"), "verdict": v.get("verdict"), "confidence": v.get("confidence")}
                for v in result.get("votes", [])
            ],
        })
    except Exception:
        pass

    return result
```

Now every council run — manual or automated — becomes scoreable data.

---

## STEP 2 — Build the scoring engine

Create `engine/track_record.py`:

```python
"""
engine/track_record.py
──────────────────────
Scores past council predictions against what prices actually did, builds a
per-AI accuracy scoreboard, and derives vote weights so accurate AIs count more.

Scoring rule (evaluated HORIZON_DAYS trading days after each prediction):
  BUY  is correct if the stock rose  more than THRESHOLD_PCT
  SELL is correct if the stock fell  more than THRESHOLD_PCT
  HOLD is correct if it stayed within ±THRESHOLD_PCT
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

DIR = Path.home() / ".orch-trading"
MEMORY_FILE = DIR / "memory.json"

HORIZON_DAYS = 5      # trading-day horizon to judge a prediction
THRESHOLD_PCT = 1.5   # move needed for BUY/SELL to count as correct
MIN_SAMPLES = 5       # scored calls needed before an AI's weight leaves neutral


def _load_memory() -> list:
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text())
        except Exception:
            return []
    return []


def _judge(verdict: str, ret_pct: float):
    """Return True/False if scoreable, None if not (ABSTAIN/NO DATA)."""
    if verdict == "BUY":
        return ret_pct > THRESHOLD_PCT
    if verdict == "SELL":
        return ret_pct < -THRESHOLD_PCT
    if verdict == "HOLD":
        return abs(ret_pct) <= THRESHOLD_PCT
    return None


def _base(d: dict) -> dict:
    return {
        "symbol": d.get("symbol"),
        "action": d.get("action"),
        "price": d.get("price"),
        "timestamp": d.get("timestamp"),
        "agreement": d.get("agreement"),
        "confidence": d.get("confidence"),
    }


def score_predictions() -> list:
    """Evaluate every logged council prediction. Returns list newest-first."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from market.free_data import get_historical

    mem = _load_memory()
    decisions = [m for m in mem if m.get("type") == "council_decision" and (m.get("price") or 0) > 0]

    # Group by symbol so we fetch history once per symbol
    by_symbol: dict[str, list] = {}
    for d in decisions:
        by_symbol.setdefault(d["symbol"], []).append(d)

    scored = []
    for sym, decs in by_symbol.items():
        hist = get_historical(sym, period="6mo", interval="1d")  # ascending {time, close}
        if not hist:
            for d in decs:
                scored.append({**_base(d), "status": "no_data"})
            continue

        bars = sorted(
            [(datetime.fromtimestamp(b["time"], tz=timezone.utc).date(), b["close"]) for b in hist],
            key=lambda x: x[0],
        )

        for d in decs:
            try:
                ddate = datetime.fromisoformat(d["timestamp"]).date()
            except Exception:
                scored.append({**_base(d), "status": "no_data"})
                continue

            # First bar on/after the decision date
            idx = next((i for i, (bd, _) in enumerate(bars) if bd >= ddate), None)
            if idx is None or idx + HORIZON_DAYS >= len(bars):
                scored.append({**_base(d), "status": "pending"})
                continue

            future_close = bars[idx + HORIZON_DAYS][1]
            decision_price = d["price"]
            ret = (future_close - decision_price) / decision_price * 100 if decision_price else 0

            ai_results = []
            for v in d.get("votes", []):
                verdict = v.get("verdict")
                correct = _judge(verdict, ret)
                if correct is None:
                    continue
                ai_results.append({"ai": v.get("ai"), "verdict": verdict, "correct": correct})

            scored.append({
                **_base(d),
                "status": "evaluated",
                "return_pct": round(ret, 2),
                "future_close": round(future_close, 2),
                "consensus_correct": _judge(d.get("action"), ret),
                "ai_results": ai_results,
            })

    scored.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return scored


def get_ai_scoreboard() -> dict:
    """Aggregate per-AI accuracy + overall consensus accuracy."""
    scored = score_predictions()
    agg: dict[str, dict] = {}
    for s in scored:
        if s["status"] != "evaluated":
            continue
        for r in s.get("ai_results", []):
            ai = r["ai"]
            if not ai:
                continue
            a = agg.setdefault(ai, {"ai": ai, "correct": 0, "total": 0})
            a["total"] += 1
            if r["correct"]:
                a["correct"] += 1

    board = []
    for ai, a in agg.items():
        acc = round(a["correct"] / a["total"] * 100) if a["total"] else 0
        board.append({"ai": ai, "accuracy": acc, "correct": a["correct"], "total": a["total"]})
    board.sort(key=lambda x: (x["accuracy"], x["total"]), reverse=True)

    evaluated = [s for s in scored if s["status"] == "evaluated"]
    cons_correct = sum(1 for s in evaluated if s.get("consensus_correct"))
    consensus = {
        "accuracy": round(cons_correct / len(evaluated) * 100) if evaluated else 0,
        "correct": cons_correct,
        "total": len(evaluated),
    }
    pending = sum(1 for s in scored if s["status"] == "pending")

    return {"board": board, "consensus": consensus, "evaluated": len(evaluated), "pending": pending}


def get_ai_weights() -> dict:
    """Vote weights per AI (0.2–1.0). Neutral 0.5 until MIN_SAMPLES scored calls."""
    try:
        board = get_ai_scoreboard()["board"]
    except Exception:
        return {}
    weights = {}
    for e in board:
        if e["total"] >= MIN_SAMPLES:
            weights[e["ai"]] = max(0.2, e["accuracy"] / 100)  # floor so no AI is fully muted
        else:
            weights[e["ai"]] = 0.5
    return weights
```

---

## STEP 3 — Upgrade the council to use accuracy weights

In `agent/council.py`, FIND the consensus computation block (the `if total == 0: ... else: ...` near the end of `run_council`) and REPLACE the `else` branch with this weighted version:

```python
    if total == 0:
        consensus = {"action": "NO DATA", "confidence": 0, "agreement": 0,
                     "summary": "No AIs configured. Add API keys in Settings."}
        suggested_size = 0
    else:
        # Phase 5: weight each AI's vote by its historical accuracy × its confidence
        try:
            from engine.track_record import get_ai_weights
            weights = get_ai_weights()
        except Exception:
            weights = {}

        tally = {"BUY": 0.0, "SELL": 0.0, "HOLD": 0.0}
        for v in active:
            w = weights.get(v["ai"], 0.5)
            tally[v["verdict"]] += w * (v["confidence"] / 100)

        action = max(tally, key=tally.get) if any(tally.values()) else "HOLD"
        agree_count = sum(1 for v in active if v["verdict"] == action)
        agreement = round(agree_count / total * 100)
        avg_conf = round(sum(v["confidence"] for v in active if v["verdict"] == action) / max(agree_count, 1))

        consensus = {
            "action": action,
            "confidence": avg_conf,
            "agreement": agreement,
            "votes": {"buy": buy, "sell": sell, "hold": hold, "total": total},
            "weighted": bool(weights),
            "summary": f"{agree_count} of {total} agree on {action} · {avg_conf}% confidence" +
                       (" · accuracy-weighted" if weights else ""),
        }

        if action == "BUY":
            size_factor = (agreement / 100) * (avg_conf / 100)
            suggested_size = round(50000 * size_factor / 1000) * 1000
        else:
            suggested_size = 0
```

Now the consensus is a weighted vote: an AI that has proven accurate AND is confident moves the needle most. Early on (before `MIN_SAMPLES`), everyone is neutral 0.5, so it behaves like a confidence-weighted vote — then it self-tunes as data accumulates.

---

## STEP 4 — Add the track-record endpoints

In `web/api.py`, add:

```python
# ─── AI TRACK RECORD ──────────────────────────────────────────────────────────
@app.get("/api/track-record/scoreboard")
def track_record_scoreboard():
    from engine.track_record import get_ai_scoreboard
    return get_ai_scoreboard()

@app.get("/api/track-record/predictions")
def track_record_predictions():
    from engine.track_record import score_predictions
    return {"predictions": score_predictions()[:60]}
```

Add to `frontend/src/api/client.ts`:
```ts
  trackRecord: {
    scoreboard:  () => get('/api/track-record/scoreboard'),
    predictions: () => get('/api/track-record/predictions'),
  },
```

---

## STEP 5 — Build the Scoreboard UI

Create `frontend/src/components/TrackRecordView.tsx`:

```tsx
// frontend/src/components/TrackRecordView.tsx
// THE AI TRACK RECORD — which AI has actually been right, and by how much.
import { useState, useEffect } from 'react';

const API = '';

const AI_META: Record<string, { icon: string; role: string }> = {
  'Grok':    { icon: '🔍', role: 'Scout · News & Sentiment' },
  'GPT-4o':  { icon: '📊', role: 'Fundamental · Valuation' },
  'Gemini':  { icon: '⚡', role: 'Technical · Charts' },
  'Claude':  { icon: '🛡️', role: 'Risk · Final Call' },
};

interface BoardEntry { ai: string; accuracy: number; correct: number; total: number; }
interface Scoreboard {
  board: BoardEntry[];
  consensus: { accuracy: number; correct: number; total: number };
  evaluated: number;
  pending: number;
}
interface Prediction {
  symbol: string; action: string; price: number; timestamp: string;
  status: string; return_pct?: number; consensus_correct?: boolean;
}

const accColor = (a: number) => a >= 60 ? '#22c55e' : a >= 45 ? '#f59e0b' : '#ef4444';

export default function TrackRecordView() {
  const [board, setBoard]   = useState<Scoreboard | null>(null);
  const [preds, setPreds]   = useState<Prediction[]>([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/track-record/scoreboard`).then(r => r.json()),
      fetch(`${API}/api/track-record/predictions`).then(r => r.json()),
    ]).then(([b, p]) => {
      setBoard(b); setPreds(p.predictions || []);
    }).finally(() => setLoad(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar page-enter" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight">AI Track Record</h1>
          <p className="text-[#888] text-sm mt-1">
            Which AI has actually been right. Predictions are scored {5} trading days later.
            Accurate AIs automatically get more weight in the council vote.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-lg" />)}
          </div>
        ) : (
          <>
            {/* Consensus headline */}
            {board && (
              <div className="card-lift bg-[#0f0f0f] rounded-xl p-5 border border-[#1a1a1a] mb-6 flex items-center justify-between">
                <div>
                  <div className="text-[#666] text-[11px] uppercase tracking-wider">Council consensus accuracy</div>
                  <div className="text-3xl font-black mt-1" style={{ color: accColor(board.consensus.accuracy) }}>
                    {board.consensus.accuracy}%
                  </div>
                  <div className="text-[#777] text-xs mt-1">
                    {board.consensus.correct}/{board.consensus.total} calls correct · {board.pending} pending
                  </div>
                </div>
                <div className="text-5xl opacity-20">🏛️</div>
              </div>
            )}

            {/* Per-AI scoreboard */}
            <div className="space-y-3 mb-8">
              {board && board.board.length > 0 ? board.board.map((e, rank) => {
                const meta = AI_META[e.ai] || { icon: '🤖', role: e.ai };
                return (
                  <div key={e.ai} className="card-lift bg-[#0f0f0f] rounded-xl p-4 border border-[#1a1a1a]">
                    <div className="flex items-center gap-4">
                      <div className="text-[#444] font-black text-lg w-6">#{rank + 1}</div>
                      <div className="text-2xl">{meta.icon}</div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-sm">{e.ai}</div>
                        <div className="text-[#666] text-[11px]">{meta.role}</div>
                      </div>
                      <div className="text-right w-40">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-black text-lg" style={{ color: accColor(e.accuracy) }}>{e.accuracy}%</span>
                          <span className="text-[#666] text-[11px]">{e.correct}/{e.total}</span>
                        </div>
                        {/* accuracy bar */}
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full mt-2 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${e.accuracy}%`, background: accColor(e.accuracy) }} />
                        </div>
                        {e.total < 5 && <div className="text-[#555] text-[10px] mt-1">building sample…</div>}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12 text-[#555]">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-sm">No scored predictions yet.</div>
                  <div className="text-[11px] mt-2">
                    Run the council (or auto-trader) and wait ~5 trading days for predictions to be scored.
                  </div>
                </div>
              )}
            </div>

            {/* Recent predictions */}
            {preds.length > 0 && (
              <div className="bg-[#0f0f0f] rounded-xl border border-[#1a1a1a] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] text-white font-bold text-sm">Recent Predictions</div>
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                  {preds.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[#141414] row-hover">
                      <span className="text-white font-semibold text-sm w-24">{p.symbol}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        p.action === 'BUY' ? 'bg-[#22c55e]/15 text-[#22c55e]' :
                        p.action === 'SELL' ? 'bg-[#ef4444]/15 text-[#ef4444]' :
                        'bg-[#f59e0b]/15 text-[#f59e0b]'
                      }`}>{p.action}</span>
                      <span className="text-[#666] text-[11px] flex-1">
                        {new Date(p.timestamp).toLocaleDateString('en-IN')}
                      </span>
                      {p.status === 'evaluated' ? (
                        <>
                          <span className={`text-xs ${(p.return_pct ?? 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {(p.return_pct ?? 0) >= 0 ? '+' : ''}{p.return_pct}%
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            p.consensus_correct ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                          }`}>
                            {p.consensus_correct ? '✓ HIT' : '✗ MISS'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#666]/15 text-[#888]">
                          {p.status === 'pending' ? '⏳ PENDING' : '—'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[#555] text-[11px] mt-4 text-center">
              Scored {5} trading days after each call · BUY/SELL correct if the move exceeded ±1.5% · demo data
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## STEP 6 — Add to navigation

In `frontend/src/App.tsx`:

1. Import:
```tsx
import TrackRecordView from './components/TrackRecordView';
```
2. Add a case in `renderContent()`:
```tsx
      case 'Track Record': return <TrackRecordView />;
```
3. Add to the secondary sidebar tools array, after Auto-Trader:
```tsx
                ['Track Record', '🏆'],
```

---

## STEP 7 — Verify

```bash
# Backend
cd orch-trading && source .venv/bin/activate
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# Generate some predictions first (run the council a few times):
curl -s -X POST http://localhost:8765/api/council -H "Content-Type: application/json" -d '{"symbol":"RELIANCE"}' >/dev/null
curl -s -X POST http://localhost:8765/api/council -H "Content-Type: application/json" -d '{"symbol":"TCS"}' >/dev/null
curl -s -X POST http://localhost:8765/api/council -H "Content-Type: application/json" -d '{"symbol":"INFY"}' >/dev/null

# Scoreboard (predictions will be "pending" until ~5 trading days pass):
curl -s http://localhost:8765/api/track-record/scoreboard | python3 -m json.tool
curl -s http://localhost:8765/api/track-record/predictions | python3 -m json.tool
```

**Important about timing:** fresh predictions show as **PENDING** because they can only be scored once 5 trading days of price history exist *after* the prediction date. To see the scoreboard populate immediately for testing, you can either:
- (a) Wait — it fills naturally as the app runs over days, OR
- (b) **Temporarily** set `HORIZON_DAYS = 0` in `engine/track_record.py` to score against the same-day/next-available close (gives instant numbers for a demo), then set it back to `5` for real use.

**UI checklist:**
- ✅ Track Record page shows consensus accuracy headline
- ✅ Per-AI scoreboard ranks AIs by accuracy with animated bars
- ✅ AIs with <5 scored calls show "building sample…"
- ✅ Recent Predictions list shows HIT/MISS/PENDING badges + actual return %
- ✅ Empty state is clean when no data yet
- ✅ Council consensus is now accuracy-weighted (check `consensus.weighted: true` in `/api/council` response once an AI has ≥5 scored calls)

---

## THE COMPLETE PICTURE — what you've built across all phases

```
Phase 1: Demo trading + live data + all pages work
Phase 2: 4 specialist AIs (Scout/Fundamental/Technical/Risk) vote in parallel
Phase 3: Watch them debate live (the signature Council screen)
Phase 4: Auto-trade only on consensus above your thresholds (safe automation)
Phase 5: Score every call → AI scoreboard → accurate AIs get more vote weight
         └─► THE FLYWHEEL: more usage → more scored calls → smarter weighting
                                                            → better consensus
```

**Why this is now genuinely defensible:**
- The **track record is yours alone** — it's built from your app's prediction history. A competitor starting today has zero history.
- The **weighting self-tunes per deployment** — your council literally gets better the more it runs.
- It's the **anti-black-box**: users see exactly which AI has earned trust and watch the system learn.

This completes the core 5-phase vision. Phase 6 (polish: daily digest, devil's advocate toggle, "explain this trade" history) is all additive sugar on top of a complete, differentiated product.

---

*Repo: https://github.com/arnavryie/orch-trading*
*Build order: Step 1 (log council runs) → Step 2 (scoring engine) → Step 3 (weighted consensus) → Step 4 (endpoints) → verify → Step 5-6 (UI) → verify.*


# ═══════════════════════════════════════════════════════════════
# ░░░ PHASE 6 OF 6 ░░░
# ═══════════════════════════════════════════════════════════════

## Devil's Advocate · Risk Personality · Explain This Trade · Daily Desk Digest
## For Antigravity — paste this entire file

**Repo:** https://github.com/arnavryie/orch-trading
**Prerequisite:** Phases 2–5 done (council, auto-trader, track record all working).
**This adds the finishing layer** — four features that make the product feel complete and uniquely yours:

1. **🔴 Devil's Advocate** — an AI that always argues AGAINST the consensus, so you never see only one side.
2. **🎚️ Risk Personality** — Conservative / Balanced / Aggressive, which retunes the whole desk's prompts, sizing, and thresholds.
3. **🔍 Explain This Trade** — every order keeps the council reasoning that produced it; tap any trade to see why all 4 AIs decided it.
4. **📰 Daily Desk Digest** — a morning briefing: your portfolio through all 4 lenses + what the desk is watching.

---

## FEATURE 1 — RISK PERSONALITY (do this first; the others build on it)

A single setting that retunes the entire desk to match the user's appetite.

### Step 1.1 — Add the setting

In `web/api.py`, `load_settings()` default dict ADD:
```python
            "risk_personality": "balanced",   # conservative | balanced | aggressive
            "devils_advocate": True,
```
In `SettingsUpdate` model ADD:
```python
    risk_personality: Optional[str] = None
    devils_advocate: Optional[bool] = None
```

### Step 1.2 — Make the council read personality and adapt

In `agent/council.py`, add this helper near the top (after `_has_key`):

```python
# Personality profiles — retune the desk's behaviour
_PERSONALITY = {
    "conservative": {
        "clause": "Be CONSERVATIVE. Only recommend BUY/SELL on strong, clear signals. When in doubt, prefer HOLD. Prioritise capital protection over opportunity.",
        "size_mult": 0.5,
    },
    "balanced": {
        "clause": "Be BALANCED. Weigh opportunity against risk evenly. Recommend action on reasonable conviction.",
        "size_mult": 1.0,
    },
    "aggressive": {
        "clause": "Be AGGRESSIVE. Act on emerging opportunities even with moderate conviction. Favour decisive BUY/SELL over HOLD when there is a credible edge.",
        "size_mult": 1.6,
    },
}

def _personality() -> dict:
    keys = _load_keys()  # also loads the full settings file via SETTINGS_FILE
    try:
        import json as _json
        s = _json.loads(SETTINGS_FILE.read_text()) if SETTINGS_FILE.exists() else {}
    except Exception:
        s = {}
    name = s.get("risk_personality", "balanced")
    return {"name": name, **_PERSONALITY.get(name, _PERSONALITY["balanced"])}
```

Then in `run_council`, right after you build `context`, append the personality clause so every analyst inherits it:

```python
    persona = _personality()
    context = context + f"\n\nDESK STANCE: {persona['clause']}"
```

And in the consensus block, apply the size multiplier where `suggested_size` is computed:
```python
        if action == "BUY":
            size_factor = (agreement / 100) * (avg_conf / 100) * persona["size_mult"]
            suggested_size = round(50000 * size_factor / 1000) * 1000
        else:
            suggested_size = 0
```

Also add `persona["name"]` to the returned dict so the UI can show it:
```python
    return {
        "symbol": symbol,
        "price": market.get("price", 0),
        "market_open": market.get("market_open", False),
        "personality": persona["name"],
        "votes": all_votes,
        "consensus": consensus,
        "suggested_size": suggested_size,
        # devils_advocate added in Feature 2 below
    }
```

---

## FEATURE 2 — DEVIL'S ADVOCATE

After the council reaches a verdict, one AI is forced to argue the opposite — so the user always sees the counter-case. It does NOT change the vote; it's a built-in sanity check.

### Step 2.1 — Add the contrarian to `agent/council.py`

Add this function:

```python
_DEVIL_SYS = """You are THE DEVIL'S ADVOCATE on a trading desk.
The council has reached a verdict. Your ONLY job is to argue the STRONGEST possible
case AGAINST that verdict — the risks, the bear/bull counter-case, what could go wrong.
Be specific and sharp. This is a deliberate check against groupthink.
Output ONLY this JSON:
{"counter_case":"2-3 punchy sentences arguing against the verdict","biggest_risk":"the single biggest risk in one line"}"""

async def _devils_advocate(symbol: str, context: str, action: str) -> dict:
    """Run the contrarian. Uses whichever provider key is available."""
    keys = _load_keys()
    prompt = f"{context}\n\nThe council's verdict is: {action}. Argue against it."

    provider = None
    try:
        if _has_key(keys["claude"]):
            from agent.providers.claude_provider import get_claude
            provider = get_claude(keys["claude"])
        elif _has_key(keys["openai"]):
            from agent.providers.openai_provider import get_openai
            provider = get_openai(keys["openai"])
        elif _has_key(keys["gemini"]):
            from agent.providers.gemini import GeminiProvider
            provider = GeminiProvider(api_key=keys["gemini"])
        elif _has_key(keys["grok"]):
            from agent.providers.grok import get_grok
            provider = get_grok(keys["grok"])
    except Exception:
        provider = None

    if provider is None:
        return {}

    try:
        text = await provider.complete(prompt, system=_DEVIL_SYS)
        start, end = text.find("{"), text.rfind("}") + 1
        if start != -1 and end > start:
            import json as _json
            obj = _json.loads(text[start:end])
            return {
                "against_action": action,
                "counter_case": str(obj.get("counter_case", "")).strip()[:400],
                "biggest_risk": str(obj.get("biggest_risk", "")).strip()[:200],
            }
    except Exception:
        pass
    return {}
```

### Step 2.2 — Call it inside `run_council`

After the consensus is computed (and before the final `return`), add:

```python
    # Devil's Advocate — always show the counter-case (if enabled)
    devil = {}
    try:
        import json as _json
        s = _json.loads(SETTINGS_FILE.read_text()) if SETTINGS_FILE.exists() else {}
        if s.get("devils_advocate", True) and total > 0 and consensus.get("action") in ("BUY", "SELL"):
            devil = await _devils_advocate(symbol, context, consensus["action"])
    except Exception:
        devil = {}
```

And add `devil` to the return dict:
```python
        "devils_advocate": devil,
```

### Step 2.3 — Show it in the Council UI

In `frontend/src/components/CouncilView.tsx`, add the `devils_advocate` field to the `CouncilResult` interface:
```tsx
  devils_advocate?: { against_action: string; counter_case: string; biggest_risk: string };
  personality?: string;
```

Then, right AFTER the consensus verdict block (inside `{result && allRevealed && (...)}`), add a Devil's Advocate card:

```tsx
{result.devils_advocate?.counter_case && (
  <div className="mt-4 rounded-xl p-5 border border-[#ef4444]/30 bg-[#ef4444]/[0.04] fade-in">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🔴</span>
      <span className="text-[#ff6b6b] font-bold text-sm">Devil's Advocate</span>
      <span className="text-[#666] text-[11px]">— the case against {result.devils_advocate.against_action}</span>
    </div>
    <p className="text-[#ddd] text-[13px] leading-relaxed">{result.devils_advocate.counter_case}</p>
    {result.devils_advocate.biggest_risk && (
      <div className="mt-3 flex items-start gap-2">
        <span className="text-[#ff6b6b] text-[11px] font-bold uppercase tracking-wider mt-0.5">Biggest risk</span>
        <span className="text-[#ffb4ab] text-[12px]">{result.devils_advocate.biggest_risk}</span>
      </div>
    )}
  </div>
)}
```

Also show the active personality near the header:
```tsx
{result?.personality && (
  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a2a2a] text-[#aaa] capitalize ml-2">
    {result.personality} stance
  </span>
)}
```

---

## FEATURE 3 — EXPLAIN THIS TRADE

Every council-driven order stores the reasoning that produced it. Tap any trade in Orders → see exactly why all 4 AIs decided it. This is the transparency payoff that ties the whole product together.

### Step 3.1 — Log explanations when the council places a trade

In `engine/auto_trader.py`, inside `run_cycle`, after a successful BUY or SELL `place_order` call, log a trade explanation keyed by the order_id. Find where `r = broker.place_order(...)` succeeds and add right after:

```python
                        if r.get("success"):
                            _append_memory({
                                "type": "trade_explanation",
                                "order_id": r.get("order_id"),
                                "symbol": sym,
                                "side": "BUY",   # or "SELL" in the sell branch
                                "qty": qty,
                                "price": price,
                                "consensus": result.get("consensus", {}),
                                "personality": result.get("personality", "balanced"),
                                "votes": result.get("votes", []),
                                "devils_advocate": result.get("devils_advocate", {}),
                            })
```
(Add the same block in the SELL branch with `"side": "SELL"`.)

### Step 3.2 — Add a "trade from council" endpoint (for the Council UI button)

So manual trades from the Council screen also get explanations. In `web/api.py` add:

```python
class CouncilTradeRequest(BaseModel):
    symbol: str
    qty: int
    side: str          # BUY or SELL
    votes: list = []
    consensus: dict = {}
    devils_advocate: dict = {}
    personality: str = "balanced"

@app.post("/api/council/trade")
def council_trade(req: CouncilTradeRequest):
    """Place a demo order from a council verdict and store its explanation."""
    result = demo_broker.place_order(req.symbol, req.qty, req.side)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Order failed"))
    try:
        from engine.auto_trader import _append_memory
        _append_memory({
            "type": "trade_explanation",
            "order_id": result.get("order_id"),
            "symbol": req.symbol.upper(),
            "side": req.side.upper(),
            "qty": req.qty,
            "consensus": req.consensus,
            "personality": req.personality,
            "votes": req.votes,
            "devils_advocate": req.devils_advocate,
        })
    except Exception:
        pass
    return result

@app.get("/api/explain/{order_id}")
def explain_trade(order_id: str):
    """Return the council reasoning behind a given order, if it exists."""
    from engine.auto_trader import MEMORY_FILE
    import json as _json
    if not MEMORY_FILE.exists():
        raise HTTPException(status_code=404, detail="No explanation found")
    try:
        mem = _json.loads(MEMORY_FILE.read_text())
    except Exception:
        mem = []
    for m in mem:
        if m.get("type") == "trade_explanation" and m.get("order_id") == order_id:
            return m
    raise HTTPException(status_code=404, detail="No council analysis for this order (likely a manual trade)")
```

> Note: `web/api.py` must expose `MEMORY_FILE` — it's defined in `engine/auto_trader.py`. The import above pulls it from there.

Add to `frontend/src/api/client.ts`:
```ts
  council: {
    convene: (symbol: string) => post('/api/council', { symbol }),
    trade:   (body: any) => post('/api/council/trade', body),
    explain: (orderId: string) => get(`/api/explain/${orderId}`),
  },
```

### Step 3.3 — Make the Council "Place Demo Trade" button use the new endpoint

In `CouncilView.tsx`, update the `placeTrade` function to send the reasoning:

```tsx
  const placeTrade = async () => {
    if (!result || result.suggested_size <= 0) return;
    const qty = Math.max(1, Math.floor(result.suggested_size / result.price));
    await fetch(`${API}/api/council/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: result.symbol, qty, side: 'BUY',
        votes: result.votes,
        consensus: result.consensus,
        devils_advocate: result.devils_advocate || {},
        personality: result.personality || 'balanced',
      }),
    });
    alert(`Demo order placed: BUY ${qty} ${result.symbol}`);
  };
```

### Step 3.4 — Add "Explain" buttons + modal in Orders

In `frontend/src/components/OrdersView.tsx`, add an explanation modal. First add state and a fetcher:

```tsx
import { useState } from 'react';
// inside OrdersView component:
const [explain, setExplain] = useState<any | null>(null);
const [explainLoading, setExplainLoading] = useState(false);

const openExplain = async (orderId: string) => {
  setExplainLoading(true);
  setExplain({ loading: true, order_id: orderId });
  try {
    const data = await fetch(`/api/explain/${orderId}`).then(r => {
      if (!r.ok) throw new Error('no explanation');
      return r.json();
    });
    setExplain(data);
  } catch {
    setExplain({ none: true });
  } finally {
    setExplainLoading(false);
  }
};
```

Add an "Explain" button to each order row (in the actions/last cell):
```tsx
<button
  onClick={() => openExplain(o.order_id)}
  className="text-[11px] px-2.5 py-1 rounded bg-[#1a1a1a] text-[#9dc0ff] btn-press hover:bg-[#222] transition-smooth"
>
  Why?
</button>
```

Add the modal at the end of the component's returned JSX:
```tsx
{explain && (
  <div onClick={() => setExplain(null)} className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 fade-in">
    <div onClick={e => e.stopPropagation()} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar slide-in-right">
      <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between sticky top-0 bg-[#0d0d0d]">
        <span className="text-white font-bold">Why this trade?</span>
        <button onClick={() => setExplain(null)} className="text-[#888] btn-press">✕</button>
      </div>
      <div className="p-5">
        {explainLoading || explain.loading ? (
          <div className="text-[#888] text-sm">Loading reasoning…</div>
        ) : explain.none ? (
          <div className="text-center py-8 text-[#666]">
            <div className="text-3xl mb-2">🤷</div>
            <div className="text-sm">This was a manual trade — no council analysis attached.</div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${explain.side === 'BUY' ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#ef4444]/15 text-[#ef4444]'}`}>{explain.side}</span>
              <span className="text-white font-bold">{explain.qty} {explain.symbol}</span>
              <span className="text-[#666] text-[11px] capitalize ml-auto">{explain.personality} stance</span>
            </div>
            {explain.consensus?.summary && (
              <div className="text-[#bbb] text-[13px] mb-4 p-3 bg-[#141414] rounded-lg">
                🏛️ {explain.consensus.summary}
              </div>
            )}
            <div className="space-y-2 mb-4">
              {(explain.votes || []).map((v: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[12px]">
                  <span>{v.icon || '🤖'}</span>
                  <span className="text-[#888] w-24 flex-shrink-0">{v.ai} ({v.role})</span>
                  <span className={`font-bold ${v.verdict === 'BUY' ? 'text-[#22c55e]' : v.verdict === 'SELL' ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>{v.verdict}</span>
                  <span className="text-[#aaa] flex-1">{v.reasoning}</span>
                </div>
              ))}
            </div>
            {explain.devils_advocate?.counter_case && (
              <div className="rounded-lg p-3 border border-[#ef4444]/30 bg-[#ef4444]/[0.04]">
                <div className="text-[#ff6b6b] text-[11px] font-bold mb-1">🔴 Devil's Advocate said</div>
                <div className="text-[#ddd] text-[12px]">{explain.devils_advocate.counter_case}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
)}
```

---

## FEATURE 4 — DAILY DESK DIGEST

A morning briefing that shows your portfolio through all 4 lenses + market context. Lightweight: reuses the council's latest logged reads + live quotes.

### Step 4.1 — Add the endpoint in `web/api.py`

```python
@app.get("/api/digest")
def daily_digest():
    """Morning desk briefing: market snapshot + portfolio review + watchlist signals."""
    from market.free_data import get_market_overview, get_top_movers
    import json as _json

    overview = get_market_overview()
    movers = get_top_movers()
    holdings = demo_broker.get_holdings()
    funds = demo_broker.get_funds()

    # Pull the most recent council read per held symbol from memory
    latest_reads = {}
    try:
        from engine.auto_trader import MEMORY_FILE
        if MEMORY_FILE.exists():
            mem = _json.loads(MEMORY_FILE.read_text())
            for m in mem:  # memory is newest-first
                if m.get("type") == "council_decision":
                    sym = m.get("symbol")
                    if sym and sym not in latest_reads:
                        latest_reads[sym] = {
                            "action": m.get("action"),
                            "agreement": m.get("agreement"),
                            "confidence": m.get("confidence"),
                        }
    except Exception:
        pass

    portfolio_review = []
    for h in holdings:
        read = latest_reads.get(h["symbol"], {})
        portfolio_review.append({
            "symbol": h["symbol"],
            "qty": h["quantity"],
            "pnl": h["pnl"],
            "pnl_pct": h["pnl_pct"],
            "desk_view": read.get("action", "—"),
            "desk_confidence": read.get("confidence", 0),
        })

    nifty = overview["nifty"]
    headline = (
        f"Market {'is OPEN' if overview['market_open'] else 'is CLOSED'}. "
        f"NIFTY {nifty.get('price', 0):,.0f} ({nifty.get('change_pct', 0):+.2f}%). "
        f"Your portfolio P&L: ₹{funds['pnl']:+,.0f} ({funds['pnl_pct']:+.1f}%)."
    )

    return {
        "date": __import__("datetime").datetime.now().strftime("%A, %d %b %Y"),
        "headline": headline,
        "market": overview,
        "movers": movers,
        "portfolio_review": portfolio_review,
        "cash": funds["available_cash"],
        "pnl": funds["pnl"],
    }
```

Add to `client.ts`:
```ts
  digest: { get: () => get('/api/digest') },
```

### Step 4.2 — Build the Digest view

Create `frontend/src/components/DigestView.tsx`:

```tsx
// frontend/src/components/DigestView.tsx — the morning desk briefing.
import { useState, useEffect } from 'react';

const API = '';
const verdictColor = (v: string) => v === 'BUY' ? '#22c55e' : v === 'SELL' ? '#ef4444' : v === 'HOLD' ? '#f59e0b' : '#666';

export default function DigestView() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/digest`).then(r => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><div className="skeleton h-24 rounded-lg mb-4" /><div className="skeleton h-40 rounded-lg" /></div>;
  if (!d) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar page-enter" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-1 text-[#888] text-sm">{d.date}</div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-4">Morning Desk Brief</h1>

        {/* Headline */}
        <div className="card-lift bg-gradient-to-br from-[#1a1208] to-[#0a0a0a] rounded-xl p-5 border border-[#2a1c10] mb-6">
          <p className="text-[#f7ddd2] text-[15px] leading-relaxed">{d.headline}</p>
        </div>

        {/* Market indices */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['nifty', 'sensex', 'banknifty'].map(k => {
            const q = d.market[k]; if (!q) return null;
            const up = (q.change_pct ?? 0) >= 0;
            return (
              <div key={k} className="card-lift bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
                <div className="text-[#888] text-[11px] uppercase">{q.symbol}</div>
                <div className="text-white font-bold text-lg mt-1">₹{q.price?.toLocaleString('en-IN')}</div>
                <div className={`text-xs ${up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{up ? '▲' : '▼'} {Math.abs(q.change_pct).toFixed(2)}%</div>
              </div>
            );
          })}
        </div>

        {/* Portfolio review */}
        <h2 className="text-white font-bold text-sm mb-3">Your Holdings — Desk View</h2>
        {d.portfolio_review.length === 0 ? (
          <div className="text-[#666] text-sm bg-[#0f0f0f] rounded-lg p-6 text-center border border-[#1a1a1a] mb-6">
            No holdings yet. Convene the council to find opportunities.
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {d.portfolio_review.map((h: any) => (
              <div key={h.symbol} className="row-hover bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold">{h.symbol}</span>
                  <span className="text-[#666] text-[11px] ml-2">{h.qty} qty</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${h.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {h.pnl >= 0 ? '+' : ''}₹{Math.abs(h.pnl).toFixed(0)} ({h.pnl_pct?.toFixed(1)}%)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ color: verdictColor(h.desk_view), background: `${verdictColor(h.desk_view)}22` }}>
                    Desk: {h.desk_view}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top movers */}
        <h2 className="text-white font-bold text-sm mb-3">What the Desk is Watching</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
            <div className="text-[#22c55e] text-xs font-bold mb-2">▲ Top Gainers</div>
            {(d.movers.gainers || []).slice(0, 4).map((g: any) => (
              <div key={g.symbol} className="flex justify-between text-[12px] py-1">
                <span className="text-[#ccc]">{g.symbol}</span>
                <span className="text-[#22c55e]">+{g.change_pct?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#1a1a1a]">
            <div className="text-[#ef4444] text-xs font-bold mb-2">▼ Top Losers</div>
            {(d.movers.losers || []).slice(0, 4).map((l: any) => (
              <div key={l.symbol} className="flex justify-between text-[12px] py-1">
                <span className="text-[#ccc]">{l.symbol}</span>
                <span className="text-[#ef4444]">{l.change_pct?.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## FEATURE 5 — Wire personality + devil's advocate into Settings UI

In `frontend/src/components/SettingsView.tsx`, add a "Desk Behaviour" section:

```tsx
<div className="bg-[#1e1e1e] rounded-xl p-5 mb-4">
  <h3 className="text-white font-bold text-sm mb-4">🎚️ Desk Behaviour</h3>

  {/* Risk personality */}
  <div className="mb-4">
    <label className="text-[#888] text-xs block mb-2">Risk Personality</label>
    <div className="flex gap-2">
      {['conservative', 'balanced', 'aggressive'].map(p => (
        <button key={p}
          onClick={() => setSettings({ ...settings, risk_personality: p })}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize btn-press transition-smooth ${
            settings.risk_personality === p ? 'bg-primary text-black' : 'bg-[#141414] text-[#aaa]'
          }`}>
          {p}
        </button>
      ))}
    </div>
    <p className="text-[#555] text-[11px] mt-2">
      Conservative = stronger signals + smaller sizes. Aggressive = act on weaker edges + bigger sizes.
    </p>
  </div>

  {/* Devil's advocate toggle */}
  <div className="flex items-center justify-between">
    <div>
      <div className="text-white text-sm">Devil's Advocate</div>
      <div className="text-[#555] text-[11px]">Always show the strongest case against each verdict</div>
    </div>
    <button
      onClick={() => setSettings({ ...settings, devils_advocate: !settings.devils_advocate })}
      className={`w-12 h-6 rounded-full transition-smooth relative ${settings.devils_advocate ? 'bg-[#22c55e]' : 'bg-[#333]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${settings.devils_advocate ? 'left-6' : 'left-0.5'}`} />
    </button>
  </div>
</div>
```

---

## STEP 6 — Add Digest to navigation

In `frontend/src/App.tsx`:
1. `import DigestView from './components/DigestView';`
2. Add case: `case 'Digest': return <DigestView />;`
3. Add to tools array (near the top, it's a daily-use screen): `['Digest', '📰'],`

---

## STEP 7 — Verify

```bash
cd orch-trading && source .venv/bin/activate
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# Personality is applied — convene with each setting and watch sizing change
curl -s -X POST http://localhost:8765/api/settings -H "Content-Type: application/json" -d '{"risk_personality":"aggressive"}'
curl -s -X POST http://localhost:8765/api/council -H "Content-Type: application/json" -d '{"symbol":"RELIANCE"}' | python3 -m json.tool
# ✅ response has "personality":"aggressive", "devils_advocate":{...}, larger suggested_size

# Digest
curl -s http://localhost:8765/api/digest | python3 -m json.tool
# ✅ headline + market + portfolio_review + movers
```

**UI checklist:**
- ✅ Settings → Desk Behaviour: pick Conservative/Balanced/Aggressive, toggle Devil's Advocate
- ✅ Council screen shows the active "stance" badge + a red Devil's Advocate card under the verdict
- ✅ Changing personality visibly changes the suggested position size
- ✅ Place a trade from the Council → go to Orders → click "Why?" → modal shows the full council reasoning + devil's advocate
- ✅ Manual orders show "no council analysis" in the Why? modal (graceful)
- ✅ Digest page shows the morning brief with your holdings' desk view

---

## 🎉 THE FULL PRODUCT — all 6 phases complete

```
P1  Foundation      — demo trading, live data, all pages work
P2  The Desk        — 4 specialist AIs vote in parallel
P3  The Debate       — watch them argue live (signature screen)
P4  Consensus Engine — safe auto-trading gated by agreement thresholds
P5  Track Record     — score predictions → accuracy-weighted self-improving council
P6  Polish           — devil's advocate, risk personality, explain-this-trade, daily digest
```

**What makes this genuinely different from every other trading app:**
- A **team of 4 AIs** that each specialise and **debate** — not one black box.
- **Full transparency** — every trade is explainable, forever, with the counter-case shown.
- **Self-improving** — the council weights AIs by their proven accuracy; your track record is a moat no one can copy.
- **Safe by design** — consensus-gated, devil's-advocate-checked, risk-personality-tuned, demo-first. The responsible answer to SEBI's algo crackdown.
- **Personalised** — the desk adapts to the user's risk appetite.

You now have a complete, differentiated, defensible product. For your hackathon: lead the demo with the **Council Debate screen** (Phase 3) — convene on a live stock, let the 4 AIs argue, show the devil's advocate, then the verdict — then show the **Track Record** proving the AIs have skin in the game. That story sells itself.

---

*Repo: https://github.com/arnavryie/orch-trading*
*Build order: Feature 1 (personality) → 2 (devil's advocate) → 3 (explain) → 4 (digest) → 5 (settings UI) → verify.*