"""
brokers/demo.py
───────────────
Full demo/paper trading broker with ₹10,00,000 virtual funds.
Persists state to ~/.orch-trading/demo_portfolio.json.
Implements the same BrokerAPI interface as real brokers.
"""

from __future__ import annotations

import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from brokers.base import (
    BrokerAPI, Funds, Holding, Position, Quote,
    OrderRequest, OrderResponse, Order, UserProfile, OptionsContract
)

log = logging.getLogger(__name__)

DEMO_DIR = Path.home() / ".orch-trading"
PORTFOLIO_FILE = DEMO_DIR / "demo_portfolio.json"
DEFAULT_CAPITAL = 1_000_000.0  # ₹10 lakh


def _now() -> str:
    return datetime.now().isoformat()


class DemoBroker(BrokerAPI):
    """
    Paper trading broker. All trades are simulated.
    Uses yfinance for live price lookups.
    """

    def __init__(self, capital: float = DEFAULT_CAPITAL):
        DEMO_DIR.mkdir(parents=True, exist_ok=True)
        if PORTFOLIO_FILE.exists():
            self._state = json.loads(PORTFOLIO_FILE.read_text())
            log.info("[demo] Loaded portfolio from %s", PORTFOLIO_FILE)
        else:
            self._state = {
                "cash": capital,
                "initial_capital": capital,
                "holdings": {},   # symbol -> {qty, avg_price}
                "orders": [],
            }
            self._save()
            log.info("[demo] Demo mode active — ₹%s virtual funds", f"{capital:,.0f}")

    # ── Persistence ───────────────────────────────────────────

    def _save(self):
        PORTFOLIO_FILE.write_text(json.dumps(self._state, indent=2))

    # ── Auth ──────────────────────────────────────────────────

    def get_login_url(self) -> str:
        return "http://localhost:8765/demo"

    def complete_login(self, **kwargs) -> UserProfile:
        return UserProfile(
            user_id="DEMO001",
            name="Demo Trader",
            email="demo@orch-trading.local",
            broker="DEMO"
        )

    def is_authenticated(self) -> bool:
        return True

    def logout(self) -> None:
        pass

    # ── Account ───────────────────────────────────────────────

    def get_profile(self) -> UserProfile:
        return UserProfile(
            user_id="DEMO001",
            name="Demo Trader",
            email="demo@orch-trading.local",
            broker="DEMO"
        )

    def get_funds(self) -> Funds:
        cash = self._state["cash"]
        holdings_value = self._holdings_value()
        initial = self._state.get("initial_capital", DEFAULT_CAPITAL)
        used_margin = max(0.0, initial - cash)
        return Funds(
            available_cash=round(cash, 2),
            used_margin=round(used_margin, 2),
            total_balance=round(cash + holdings_value, 2),
        )

    def _holdings_value(self) -> float:
        total = 0.0
        for sym, pos in self._state["holdings"].items():
            try:
                from market.free_data import get_quote
                ltp = get_quote(sym)["ltp"]
            except Exception:
                ltp = pos["avg_price"]
            total += pos["qty"] * ltp
        return total

    # ── Portfolio ─────────────────────────────────────────────

    def get_holdings(self) -> list[Holding]:
        result = []
        for sym, pos in self._state["holdings"].items():
            if pos["qty"] <= 0:
                continue
            try:
                from market.free_data import get_quote
                q = get_quote(sym)
                ltp = q["ltp"]
                day_change = q["change"]
                day_change_pct = q["change_pct"]
            except Exception:
                ltp = pos["avg_price"]
                day_change = 0.0
                day_change_pct = 0.0

            avg = pos["avg_price"]
            pnl = round((ltp - avg) * pos["qty"], 2)
            pnl_pct = round(((ltp - avg) / avg) * 100, 2) if avg else 0

            result.append(Holding(
                symbol=sym,
                exchange="NSE",
                quantity=pos["qty"],
                avg_price=round(avg, 2),
                last_price=round(ltp, 2),
                pnl=pnl,
                pnl_pct=pnl_pct,
                day_change=round(day_change, 2),
                day_change_pct=round(day_change_pct, 2),
            ))
        return result

    def get_positions(self) -> list[Position]:
        # Demo mode: no intraday positions (CNC only)
        return []

    # ── Market Data ───────────────────────────────────────────

    def get_quote(self, instruments: list[str]) -> dict[str, Quote]:
        from market.free_data import get_quote as _fq
        result = {}
        for inst in instruments:
            sym = inst.split(":")[-1]
            q = _fq(sym)
            result[inst] = Quote(
                symbol=sym,
                last_price=q["ltp"],
                open=q["open"],
                high=q["high"],
                low=q["low"],
                close=q["prev_close"],
                volume=q["volume"],
                change=q["change"],
                change_pct=q["change_pct"],
            )
        return result

    def get_options_chain(self, underlying: str, expiry: Optional[str] = None) -> list[OptionsContract]:
        from market.free_data import get_options_chain
        data = get_options_chain(underlying, expiry)
        contracts = []
        for c in data.get("calls", []):
            contracts.append(OptionsContract(
                symbol=f"{underlying}{data['expiry'].replace('-','')}CE",
                underlying=underlying,
                expiry=data["expiry"],
                strike=c["strike"],
                option_type="CE",
                last_price=c["lastPrice"],
                oi=c["openInterest"],
                oi_change=0,
                volume=c.get("volume", 0),
                iv=c.get("impliedVolatility", 0),
            ))
        return contracts

    # ── Orders ────────────────────────────────────────────────

    def place_order(self, order: OrderRequest) -> OrderResponse:
        sym = order.symbol.upper()
        try:
            from market.free_data import get_quote
            ltp = get_quote(sym)["ltp"]
        except Exception:
            ltp = order.price or 100

        exec_price = order.price if (order.order_type == "LIMIT" and order.price) else ltp
        total_cost = exec_price * order.quantity

        if order.transaction_type == "BUY":
            if total_cost > self._state["cash"]:
                return OrderResponse(order_id="", status="REJECTED",
                                     message=f"Insufficient funds. Need ₹{total_cost:,.0f}, have ₹{self._state['cash']:,.0f}")

            self._state["cash"] -= total_cost
            h = self._state["holdings"].setdefault(sym, {"qty": 0, "avg_price": 0})
            new_qty = h["qty"] + order.quantity
            h["avg_price"] = ((h["avg_price"] * h["qty"]) + total_cost) / new_qty
            h["qty"] = new_qty

        elif order.transaction_type == "SELL":
            h = self._state["holdings"].get(sym)
            if not h or h["qty"] < order.quantity:
                return OrderResponse(order_id="", status="REJECTED",
                                     message=f"Insufficient holdings for {sym}")
            h["qty"] -= order.quantity
            self._state["cash"] += exec_price * order.quantity
            if h["qty"] == 0:
                del self._state["holdings"][sym]

        order_id = str(uuid.uuid4())[:8].upper()
        record = {
            "order_id": order_id,
            "symbol": sym,
            "exchange": order.exchange,
            "transaction_type": order.transaction_type,
            "quantity": order.quantity,
            "order_type": order.order_type,
            "product": order.product,
            "status": "COMPLETE",
            "price": round(exec_price, 2),
            "average_price": round(exec_price, 2),
            "filled_quantity": order.quantity,
            "placed_at": _now(),
            "tag": order.tag or "demo",
        }
        self._state["orders"].append(record)
        if len(self._state["orders"]) > 100:
            self._state["orders"] = self._state["orders"][-100:]
        self._save()

        log.info("[demo] %s %s x%d @ ₹%.2f | ID: %s",
                 order.transaction_type, sym, order.quantity, exec_price, order_id)
        return OrderResponse(
            order_id=order_id,
            status="COMPLETE",
            average_price=round(exec_price, 2),
            filled_quantity=order.quantity,
        )

    def get_orders(self) -> list[Order]:
        return [
            Order(
                order_id=o["order_id"],
                symbol=o["symbol"],
                exchange=o.get("exchange", "NSE"),
                transaction_type=o["transaction_type"],
                quantity=o["quantity"],
                order_type=o["order_type"],
                product=o["product"],
                status=o["status"],
                price=o.get("price"),
                average_price=o.get("average_price"),
                filled_quantity=o.get("filled_quantity", 0),
                placed_at=o.get("placed_at"),
                tag=o.get("tag"),
            )
            for o in reversed(self._state["orders"][-50:])
        ]

    def cancel_order(self, order_id: str) -> bool:
        for o in self._state["orders"]:
            if o["order_id"] == order_id and o["status"] == "PENDING":
                o["status"] = "CANCELLED"
                self._save()
                return True
        return False

    def get_historical_data(self, symbol: str, exchange: str = "NSE",
                             interval: str = "day", from_date=None, to_date=None) -> list[dict]:
        from market.free_data import get_ohlcv_json
        period_map = {"minute": "5d", "hour": "1mo", "day": "1y", "week": "2y"}
        period = period_map.get(interval, "1y")
        return get_ohlcv_json(symbol, period=period)

    def reset(self, capital: float = DEFAULT_CAPITAL):
        """Reset portfolio to fresh state."""
        self._state = {
            "cash": capital,
            "initial_capital": capital,
            "holdings": {},
            "orders": [],
        }
        self._save()
        log.info("[demo] Portfolio reset to ₹%s", f"{capital:,.0f}")


# ── Singleton ─────────────────────────────────────────────────

_demo_instance: Optional[DemoBroker] = None


def get_demo_broker() -> DemoBroker:
    global _demo_instance
    if _demo_instance is None:
        import os
        capital = float(os.environ.get("DEMO_CAPITAL", DEFAULT_CAPITAL))
        _demo_instance = DemoBroker(capital)
    return _demo_instance
