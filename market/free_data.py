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
        "BANKNIFTY": "^NSEBANK", "SENSEX": "^BSESN",
        "INDIAVIX": "^INDIAVIX",
    }
    if sym in index_map:
        return index_map[sym]
    if sym.startswith("^") or "." in sym:
        return sym
    return sym + ".NS"

def is_market_open() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:  # Sat/Sun
        return False
    market_open = now.replace(hour=9, minute=15, second=0)
    market_close = now.replace(hour=15, minute=30, second=0)
    return market_open <= now <= market_close

def get_quote(symbol: str) -> dict:
    sym = _yf_sym(symbol)
    try:
        t = yf.Ticker(sym)
        fi = t.fast_info
        price = float(fi.last_price or fi.previous_close or 0)
        prev = float(fi.previous_close or price)
        change = price - prev
        change_pct = (change / prev * 100) if prev else 0
        return {
            "symbol": symbol.upper(),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "high": round(float(fi.day_high or price), 2),
            "low": round(float(fi.day_low or price), 2),
            "volume": int(fi.shares or 0),
            "prev_close": round(prev, 2),
            "market_open": is_market_open(),
        }
    except Exception as e:
        return {"symbol": symbol.upper(), "price": 0, "error": str(e)}

def get_historical(symbol: str, period: str = "3mo", interval: str = "1d") -> list:
    sym = _yf_sym(symbol)
    try:
        df = yf.Ticker(sym).history(period=period, interval=interval)
        df = df.reset_index()
        rows = []
        for _, row in df.iterrows():
            t = row["Date"] if "Date" in row else row["Datetime"]
            rows.append({
                "time": int(pd.Timestamp(t).timestamp()),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        return rows
    except Exception as e:
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
