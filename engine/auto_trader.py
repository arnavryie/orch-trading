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
                            _append_memory({
                                "type": "trade_explanation",
                                "order_id": r.get("order_id"),
                                "symbol": sym,
                                "side": "BUY",
                                "qty": qty,
                                "price": price,
                                "consensus": result.get("consensus", {}),
                                "personality": result.get("personality", "balanced"),
                                "votes": result.get("votes", []),
                                "devils_advocate": result.get("devils_advocate", {}),
                            })
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
                        _append_memory({
                            "type": "trade_explanation",
                            "order_id": r.get("order_id"),
                            "symbol": sym,
                            "side": "SELL",
                            "qty": qty,
                            "price": price,
                            "consensus": result.get("consensus", {}),
                            "personality": result.get("personality", "balanced"),
                            "votes": result.get("votes", []),
                            "devils_advocate": result.get("devils_advocate", {}),
                        })
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
