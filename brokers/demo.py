# brokers/demo.py
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
import yfinance as yf

DEMO_FILE = Path.home() / ".orch-trading" / "demo_portfolio.json"
INITIAL_CAPITAL = 1_000_000  # ₹10,00,000

def _load():
    DEMO_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DEMO_FILE.exists():
        data = {
            "cash": INITIAL_CAPITAL,
            "holdings": {},   # symbol -> {qty, avg_price}
            "orders": [],     # list of order dicts
            "positions": [],  # intraday positions
        }
        _save(data)
        return data
    with open(DEMO_FILE) as f:
        return json.load(f)

def _save(data):
    DEMO_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DEMO_FILE, "w") as f:
        json.dump(data, f, indent=2)

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

def get_funds():
    data = _load()
    # Calculate current portfolio value
    total_invested = 0.0
    current_value = 0.0
    for symbol, holding in data["holdings"].items():
        qty = holding["qty"]
        avg = holding["avg_price"]
        current = _get_price(symbol)
        total_invested += qty * avg
        current_value += qty * current
    pnl = current_value - total_invested
    return {
        "available_cash": round(data["cash"], 2),
        "opening_balance": INITIAL_CAPITAL,
        "portfolio_value": round(current_value, 2),
        "total_invested": round(total_invested, 2),
        "pnl": round(pnl, 2),
        "pnl_pct": round((pnl / total_invested * 100) if total_invested > 0 else 0, 2),
        "equity": {"margin_available": round(data["cash"], 2), "margins_used": round(total_invested, 2)},
    }

def get_holdings():
    data = _load()
    result = []
    for symbol, h in data["holdings"].items():
        if h["qty"] <= 0:
            continue
        current = _get_price(symbol)
        avg = h["avg_price"]
        qty = h["qty"]
        invested = qty * avg
        current_val = qty * current
        pnl = current_val - invested
        result.append({
            "symbol": symbol,
            "quantity": qty,
            "avg_price": round(avg, 2),
            "current_price": round(current, 2),
            "invested": round(invested, 2),
            "current_value": round(current_val, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round((pnl / invested * 100) if invested > 0 else 0, 2),
            "exchange": "NSE",
        })
    return result

def get_positions():
    data = _load()
    return data.get("positions", [])

def get_orders(limit=50):
    data = _load()
    return list(reversed(data["orders"]))[:limit]

def place_order(symbol: str, qty: int, order_type: str, price: float = None):
    """order_type: BUY or SELL"""
    data = _load()
    sym = symbol.upper()
    if price is None or price == 0:
        price = _get_price(sym)
    if price == 0:
        return {"success": False, "error": f"Could not fetch price for {sym}"}

    order_id = str(uuid.uuid4())[:8].upper()
    timestamp = datetime.now().isoformat()

    if order_type.upper() == "BUY":
        cost = qty * price
        if data["cash"] < cost:
            return {"success": False, "error": f"Insufficient funds. Need ₹{cost:.0f}, have ₹{data['cash']:.0f}"}
        data["cash"] -= cost
        if sym not in data["holdings"]:
            data["holdings"][sym] = {"qty": 0, "avg_price": 0}
        h = data["holdings"][sym]
        total_qty = h["qty"] + qty
        h["avg_price"] = ((h["qty"] * h["avg_price"]) + (qty * price)) / total_qty
        h["qty"] = total_qty

    elif order_type.upper() == "SELL":
        if sym not in data["holdings"] or data["holdings"][sym]["qty"] < qty:
            return {"success": False, "error": f"Insufficient holdings for {sym}"}
        proceeds = qty * price
        data["cash"] += proceeds
        data["holdings"][sym]["qty"] -= qty
        if data["holdings"][sym]["qty"] == 0:
            del data["holdings"][sym]

    order = {
        "order_id": order_id,
        "symbol": sym,
        "qty": qty,
        "type": order_type.upper(),
        "price": round(price, 2),
        "status": "COMPLETE",
        "timestamp": timestamp,
        "exchange": "NSE",
    }
    data["orders"].append(order)
    _save(data)
    return {"success": True, "order_id": order_id, "message": f"{order_type.upper()} {qty} {sym} @ ₹{price:.2f} executed"}

def reset():
    """Reset demo portfolio to initial ₹10L"""
    if DEMO_FILE.exists():
        DEMO_FILE.unlink()
    return {"success": True, "message": "Demo portfolio reset to ₹10,00,000"}
