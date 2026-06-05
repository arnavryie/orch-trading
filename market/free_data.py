# market/free_data.py
import yfinance as yf
import pandas as pd
from datetime import datetime
import pytz
import functools, time

IST = pytz.timezone("Asia/Kolkata")

NSE_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY",
    "HINDUNILVR", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK",
    "LT", "AXISBANK", "ASIANPAINT", "BAJFINANCE", "TITAN",
    "WIPRO", "ULTRACEMCO", "NESTLEIND", "TECHM", "POWERGRID",
    "SUNPHARMA", "MARUTI", "HCLTECH", "BAJAJFINSV", "NTPC",
]

def _yf_sym(symbol: str) -> str:
    sym = symbol.upper().strip()
    index_map = {
        "NIFTY": "^NSEI", "NIFTY50": "^NSEI",
        "NIFTY 50": "^NSEI", "NIFTY 50 INDEX": "^NSEI",
        "BANKNIFTY": "^NSEBANK", "SENSEX": "^BSESN",
        "INDIAVIX": "^INDIAVIX",
    }
    if sym in index_map:
        return index_map[sym]
    if sym.startswith("^") or "." in sym:
        return sym
    return sym + ".NS"

def is_market_open() -> bool:
    """Returns True if NSE is currently open: 9:15 AM – 3:30 PM IST, Mon–Fri."""
    from datetime import time as dtime
    now = datetime.now(IST)
    if now.weekday() >= 5:          # Saturday=5, Sunday=6
        return False
    t = now.time()                  # Extract time component (no timezone, safe)
    return dtime(9, 15) <= t <= dtime(15, 30)

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

def get_market_overview() -> dict:
    nifty = get_quote("NIFTY")
    sensex = get_quote("SENSEX")
    banknifty = get_quote("BANKNIFTY")
    return {
        "nifty": nifty,
        "sensex": sensex,
        "banknifty": banknifty,
        "market_open": is_market_open(),
    }

def get_top_movers() -> dict:
    gainers, losers = [], []
    for sym in NSE_SYMBOLS[:15]:
        q = get_quote(sym)
        if q.get("price", 0) > 0:
            if q["change_pct"] > 0:
                gainers.append(q)
            else:
                losers.append(q)
    gainers.sort(key=lambda x: x["change_pct"], reverse=True)
    losers.sort(key=lambda x: x["change_pct"])
    return {"gainers": gainers[:5], "losers": losers[:5]}

def get_watchlist_quotes(symbols: list) -> list:
    return [get_quote(s) for s in symbols]
