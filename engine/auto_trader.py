"""
engine/auto_trader.py
─────────────────────
Background auto-trading engine.
Runs every 5 minutes during market hours (9:15–15:30 IST Mon–Fri).
Uses Gemini Flash to make trade decisions.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path

log = logging.getLogger(__name__)

MEMORY_DIR = Path.home() / ".orch-trading"
MEMORY_FILE = MEMORY_DIR / "memory.json"
SETTINGS_FILE = MEMORY_DIR / "settings.json"
CONFIG_FILE = MEMORY_DIR / "config.json"

DEFAULT_CONFIG = {
    "watchlist": ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "NIFTY", "BANKNIFTY"],
    "ai_provider": "gemini",
    "broker": "demo",
    "auto_trading": False,
    "max_position_size": 50000,
    "daily_loss_limit": 10000,
    "risk_per_trade": 2.0,
    "capital": 1000000,
}


def load_config() -> dict:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    CONFIG_FILE.write_text(json.dumps(DEFAULT_CONFIG, indent=2))
    return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


def load_memory() -> list[dict]:
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text())
        except Exception:
            return []
    return []


def append_memory(entry: dict):
    memory = load_memory()
    entry["timestamp"] = datetime.now().isoformat()
    memory.append(entry)
    memory = memory[-200:]  # Keep last 200 entries
    MEMORY_FILE.write_text(json.dumps(memory, indent=2))


class AutoTrader:
    """
    Background trading engine. Runs AI-driven trade cycles during market hours.
    """

    def __init__(self):
        self._running = False
        self._task: asyncio.Task | None = None
        self._cycle_count = 0
        self._daily_pnl = 0.0
        self._status = "stopped"

    def get_status(self) -> dict:
        config = load_config()
        return {
            "running": self._running,
            "status": self._status,
            "cycles": self._cycle_count,
            "daily_pnl": self._daily_pnl,
            "auto_trading_enabled": config.get("auto_trading", False),
        }

    def start(self):
        if self._running:
            return
        self._running = True
        self._status = "running"
        self._task = asyncio.create_task(self._loop())
        log.info("[auto_trader] Engine started")

    def stop(self):
        self._running = False
        self._status = "stopped"
        if self._task and not self._task.done():
            self._task.cancel()
        log.info("[auto_trader] Engine stopped")

    async def _loop(self):
        log.info("[auto_trader] Loop active — checking every 5 minutes during market hours")
        while self._running:
            try:
                from market.free_data import is_market_open
                if is_market_open():
                    await self.run_cycle()
                else:
                    self._status = "market_closed"
                    log.debug("[auto_trader] Market closed — sleeping")
                await asyncio.sleep(300)  # 5 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.error("[auto_trader] Loop error: %s", e)
                await asyncio.sleep(60)

    async def run_cycle(self):
        config = load_config()
        self._cycle_count += 1
        self._status = "analyzing"
        log.info("[auto_trader] Cycle %d — running", self._cycle_count)

        try:
            # 1. Get current portfolio
            from brokers.demo import get_demo_broker
            broker = get_demo_broker()
            funds = broker.get_funds()
            holdings = broker.get_holdings()

            portfolio = {
                "cash": funds.available_cash,
                "total_value": funds.total_balance,
                "holdings": [
                    {"symbol": h.symbol, "qty": h.quantity, "avg_price": h.avg_price,
                     "ltp": h.last_price, "pnl": h.pnl, "pnl_pct": h.pnl_pct}
                    for h in holdings
                ]
            }

            # 2. Check daily loss limit
            if self._daily_pnl < -config.get("daily_loss_limit", 10000):
                self._status = "halted_loss_limit"
                log.warning("[auto_trader] Daily loss limit hit — halting")
                append_memory({"type": "halt", "reason": "daily_loss_limit", "pnl": self._daily_pnl})
                return

            # 3. Fetch market data for watchlist
            from market.free_data import get_quote
            watchlist = config.get("watchlist", DEFAULT_CONFIG["watchlist"])
            market_data = {}
            for sym in watchlist[:8]:
                try:
                    market_data[sym] = get_quote(sym)
                except Exception:
                    pass

            # 4. Ask Gemini to decide
            if not config.get("auto_trading", False):
                self._status = "monitoring"
                log.info("[auto_trader] Auto-trading OFF — monitoring only")
                return

            from agent.providers.gemini import get_gemini
            gemini = get_gemini()
            decision = await gemini.decide_trade(portfolio, market_data, watchlist)

            # 5. Execute orders
            from brokers.base import OrderRequest
            max_pos_size = config.get("max_position_size", 50000)

            for order_info in decision.get("orders", []):
                sym = order_info.get("symbol", "")
                action = order_info.get("action", "")
                qty = order_info.get("quantity", 0)

                if not sym or not action or qty <= 0:
                    continue

                ltp = market_data.get(sym, {}).get("ltp", 0)
                if ltp <= 0:
                    q = get_quote(sym)
                    ltp = q["ltp"]

                if action == "BUY" and ltp * qty > max_pos_size:
                    qty = int(max_pos_size / ltp)

                if qty <= 0:
                    continue

                order = OrderRequest(
                    symbol=sym,
                    exchange="NSE",
                    transaction_type=action,
                    quantity=qty,
                    order_type="MARKET",
                    product="CNC",
                    tag="auto_trader",
                )
                resp = broker.place_order(order)
                log.info("[auto_trader] Order %s: %s %s x%d → %s", resp.order_id, action, sym, qty, resp.status)

                self._daily_pnl += (resp.average_price or 0) * qty * (-1 if action == "BUY" else 1)

                append_memory({
                    "type": "trade",
                    "symbol": sym,
                    "action": action,
                    "quantity": qty,
                    "price": resp.average_price,
                    "status": resp.status,
                    "reason": order_info.get("reason", ""),
                    "commentary": decision.get("commentary", ""),
                })

            self._status = "running"

        except Exception as e:
            log.error("[auto_trader] Cycle error: %s", e)
            self._status = "error"


# ── Singleton ─────────────────────────────────────────────────
_auto_trader: AutoTrader | None = None


def get_auto_trader() -> AutoTrader:
    global _auto_trader
    if _auto_trader is None:
        _auto_trader = AutoTrader()
    return _auto_trader
