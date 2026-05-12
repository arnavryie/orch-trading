"""
market/free_data.py
───────────────────
Free real-time and historical market data using yfinance.
No broker credentials needed.
NSE stocks use the .NS suffix. NIFTY 50 = ^NSEI, INDIAVIX = ^INDIAVIX.
"""

from __future__ import annotations

import json
import time
import logging
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

import pandas as pd
import yfinance as yf

log = logging.getLogger(__name__)

# ── Symbol helpers ─────────────────────────────────────────────

NIFTY50_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "SBIN", "BAJFINANCE", "BHARTIARTL", "KOTAKBANK",
    "LT", "HCLTECH", "AXISBANK", "ASIANPAINT", "MARUTI",
    "SUNPHARMA", "TITAN", "WIPRO", "ULTRACEMCO", "NESTLEIND",
    "POWERGRID", "NTPC", "TECHM", "INDUSINDBK", "TATASTEEL",
    "ONGC", "JSWSTEEL", "HINDALCO", "COALINDIA", "BPCL",
    "GRASIM", "DIVISLAB", "DRREDDY", "CIPLA", "APOLLOHOSP",
    "ADANIPORTS", "TATACONSUM", "BAJAJFINSV", "EICHERMOT", "HEROMOTOCO",
    "BRITANNIA", "SHREECEM", "BAJAJ-AUTO", "UPL", "SBILIFE",
    "HDFCLIFE", "PIDILITIND", "DMART", "LTIM", "M&M"
]

SECTOR_ETFS = {
    "IT": "NIFTYIT.NS",
    "Bank": "NIFTYBANK.NS",
    "Metal": "NIFTYMETAL.NS",
    "Pharma": "NIFTYPHARMA.NS",
    "FMCG": "NIFTYFMCG.NS",
    "Realty": "NIFTYREALTY.NS",
    "Auto": "NIFTYAUTO.NS",
    "Energy": "NIFTYENERGY.NS",
}

_fii_cache: dict = {"data": None, "ts": 0}


def _ns(symbol: str) -> str:
    """Append .NS suffix if missing for NSE stocks."""
    symbol = symbol.upper().strip()
    if symbol in ("^NSEI", "^NSEBANK", "^INDIAVIX", "NIFTY", "BANKNIFTY"):
        mapping = {
            "NIFTY": "^NSEI",
            "BANKNIFTY": "^NSEBANK",
            "^NSEI": "^NSEI",
            "^NSEBANK": "^NSEBANK",
            "^INDIAVIX": "^INDIAVIX",
        }
        return mapping.get(symbol, f"^{symbol}")
    if symbol.endswith(".NS") or symbol.endswith(".BO"):
        return symbol
    return f"{symbol}.NS"


def is_market_open() -> bool:
    """Returns True if NSE is currently open (9:15–15:30 IST Mon–Fri)."""
    now_ist = datetime.now(timezone.utc).astimezone()
    # Approximate IST offset
    import pytz
    ist = pytz.timezone("Asia/Kolkata")
    now_ist = datetime.now(ist)
    if now_ist.weekday() >= 5:  # Saturday or Sunday
        return False
    if now_ist.hour < 9 or (now_ist.hour == 9 and now_ist.minute < 15):
        return False
    if now_ist.hour > 15 or (now_ist.hour == 15 and now_ist.minute >= 30):
        return False
    return True


# ── Quote ──────────────────────────────────────────────────────

def get_quote(symbol: str) -> dict:
    """
    Returns current price, day high/low, volume, % change.
    Falls back gracefully when market is closed.
    """
    ticker_sym = _ns(symbol)
    try:
        ticker = yf.Ticker(ticker_sym)
        info = ticker.fast_info
        ltp = float(info.last_price or 0)
        prev_close = float(info.previous_close or ltp)
        change = round(ltp - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0
        return {
            "symbol": symbol.upper(),
            "ltp": ltp,
            "open": float(info.open or 0),
            "high": float(info.day_high or 0),
            "low": float(info.day_low or 0),
            "prev_close": prev_close,
            "change": change,
            "change_pct": change_pct,
            "volume": int(info.three_month_average_volume or 0),
            "market_open": is_market_open(),
        }
    except Exception as e:
        log.warning("get_quote(%s) failed: %s", symbol, e)
        # Return stub so UI doesn't crash
        return {
            "symbol": symbol.upper(), "ltp": 0, "open": 0, "high": 0,
            "low": 0, "prev_close": 0, "change": 0, "change_pct": 0,
            "volume": 0, "market_open": False, "error": str(e)
        }


# ── Historical OHLCV ───────────────────────────────────────────

def get_historical_ohlcv(symbol: str, period: str = "3mo", interval: str = "1d") -> pd.DataFrame:
    """Returns OHLCV DataFrame. Columns: Open, High, Low, Close, Volume."""
    ticker_sym = _ns(symbol)
    try:
        df = yf.download(ticker_sym, period=period, interval=interval,
                         progress=False, auto_adjust=True)
        if df.empty:
            raise ValueError(f"No data for {ticker_sym}")
        df.index = pd.to_datetime(df.index)
        return df
    except Exception as e:
        log.warning("get_historical_ohlcv(%s) failed: %s", symbol, e)
        return pd.DataFrame()


def get_ohlcv_json(symbol: str, period: str = "3mo", interval: str = "1d") -> list[dict]:
    """Returns OHLCV as list of dicts for JSON serialization."""
    df = get_historical_ohlcv(symbol, period, interval)
    if df.empty:
        return []
    result = []
    for ts, row in df.iterrows():
        result.append({
            "date": ts.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
            "volume": int(row["Volume"]),
        })
    return result


# ── Options Chain ──────────────────────────────────────────────

def get_options_chain(symbol: str, expiry: Optional[str] = None) -> dict:
    """Returns options chain dict with calls/puts and PCR."""
    ticker_sym = _ns(symbol)
    try:
        ticker = yf.Ticker(ticker_sym)
        expirations = ticker.options
        if not expirations:
            raise ValueError("No options data")

        target_expiry = expiry if expiry in expirations else expirations[0]
        chain = ticker.option_chain(target_expiry)
        calls = chain.calls[["strike", "lastPrice", "openInterest", "impliedVolatility", "volume"]].to_dict("records")
        puts = chain.puts[["strike", "lastPrice", "openInterest", "impliedVolatility", "volume"]].to_dict("records")

        total_call_oi = sum(c.get("openInterest", 0) or 0 for c in calls)
        total_put_oi = sum(p.get("openInterest", 0) or 0 for p in puts)
        pcr = round(total_put_oi / total_call_oi, 3) if total_call_oi else 1.0

        return {
            "symbol": symbol.upper(),
            "expiry": target_expiry,
            "expirations": list(expirations),
            "calls": calls,
            "puts": puts,
            "pcr": pcr,
            "total_call_oi": int(total_call_oi),
            "total_put_oi": int(total_put_oi),
        }
    except Exception as e:
        log.warning("get_options_chain(%s) failed: %s, returning mock", symbol, e)
        return _mock_options_chain(symbol)


def _mock_options_chain(symbol: str) -> dict:
    base = 22500 if "NIFTY" in symbol.upper() else 1500
    strikes = [base - 300 + i * 100 for i in range(7)]
    calls = [{"strike": s, "lastPrice": max(1, base - s) + 20, "openInterest": 50000, "impliedVolatility": 0.18, "volume": 5000} for s in strikes]
    puts  = [{"strike": s, "lastPrice": max(1, s - base) + 20, "openInterest": 60000, "impliedVolatility": 0.20, "volume": 4000} for s in strikes]
    return {"symbol": symbol, "expiry": "2025-05-29", "expirations": ["2025-05-29"], "calls": calls, "puts": puts, "pcr": 1.2, "total_call_oi": 350000, "total_put_oi": 420000}


# ── NIFTY / VIX ───────────────────────────────────────────────

def get_nifty_data() -> dict:
    """Returns NIFTY 50 index data with VIX."""
    nifty = get_quote("^NSEI")
    vix_data = get_quote("^INDIAVIX")
    return {
        "nifty": {
            "price": nifty["ltp"],
            "change": nifty["change"],
            "change_pct": nifty["change_pct"],
            "prev_close": nifty["prev_close"],
        },
        "vix": vix_data["ltp"],
        "market_open": is_market_open(),
    }


# ── FII/DII Flows ──────────────────────────────────────────────

def get_fii_dii_flows() -> dict:
    """Fetches FII/DII flow data from NSE. Falls back to mock if unavailable."""
    global _fii_cache
    now = time.time()
    if _fii_cache["data"] and (now - _fii_cache["ts"]) < 1800:
        return _fii_cache["data"]

    try:
        import httpx
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Referer": "https://www.nseindia.com/",
        }
        # NSE requires a session cookie first
        with httpx.Client(headers=headers, timeout=10) as client:
            client.get("https://www.nseindia.com/", headers=headers)
            resp = client.get("https://www.nseindia.com/api/fiidiiTradeReact", headers=headers)
            data = resp.json()

        result = []
        for item in data[:10]:
            result.append({
                "date": item.get("date", ""),
                "fii_buy": float(str(item.get("fiiBuyValue", 0)).replace(",", "") or 0),
                "fii_sell": float(str(item.get("fiiSellValue", 0)).replace(",", "") or 0),
                "fii_net": float(str(item.get("fiiNetValue", 0)).replace(",", "") or 0),
                "dii_buy": float(str(item.get("diiBuyValue", 0)).replace(",", "") or 0),
                "dii_sell": float(str(item.get("diiSellValue", 0)).replace(",", "") or 0),
                "dii_net": float(str(item.get("diiNetValue", 0)).replace(",", "") or 0),
            })
        _fii_cache = {"data": {"flows": result, "source": "NSE"}, "ts": now}
        return _fii_cache["data"]
    except Exception as e:
        log.warning("FII/DII fetch failed: %s, using mock", e)
        return _mock_fii_dii()


def _mock_fii_dii() -> dict:
    import random
    from datetime import timedelta
    today = datetime.now()
    flows = []
    for i in range(10):
        d = today - timedelta(days=i + 1)
        if d.weekday() >= 5:
            continue
        fii_net = random.uniform(-3000, 3000)
        dii_net = -fii_net * random.uniform(0.5, 1.2)
        flows.append({
            "date": d.strftime("%d-%b-%Y"),
            "fii_buy": round(abs(fii_net) + random.uniform(1000, 5000), 2),
            "fii_sell": round(abs(fii_net) + random.uniform(1000, 5000), 2),
            "fii_net": round(fii_net, 2),
            "dii_buy": round(abs(dii_net) + random.uniform(1000, 5000), 2),
            "dii_sell": round(abs(dii_net) + random.uniform(1000, 5000), 2),
            "dii_net": round(dii_net, 2),
        })
    return {"flows": flows, "source": "mock"}


# ── Market Breadth ─────────────────────────────────────────────

def get_market_breadth() -> dict:
    """Calculate advance/decline ratio from NIFTY 50 stocks."""
    try:
        syms = [_ns(s) for s in NIFTY50_SYMBOLS[:25]]  # limit API calls
        tickers = yf.download(syms, period="2d", interval="1d", progress=False, auto_adjust=True)
        closes = tickers["Close"]
        changes = closes.pct_change().iloc[-1] * 100
        advances = int((changes > 0).sum())
        declines = int((changes < 0).sum())
        unchanged = len(changes) - advances - declines
        return {
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged,
            "ratio": round(advances / declines, 2) if declines else 10.0,
        }
    except Exception as e:
        log.warning("market_breadth failed: %s", e)
        return {"advances": 30, "declines": 18, "unchanged": 2, "ratio": 1.67}


# ── Sector Performance ─────────────────────────────────────────

def get_sector_performance() -> list[dict]:
    """Returns % change for each sector ETF today."""
    results = []
    for sector, sym in SECTOR_ETFS.items():
        try:
            q = get_quote(sym.replace(".NS", ""))
            results.append({
                "sector": sector,
                "symbol": sym,
                "change_pct": q["change_pct"],
                "ltp": q["ltp"],
            })
        except Exception:
            results.append({"sector": sector, "symbol": sym, "change_pct": 0, "ltp": 0})
    return sorted(results, key=lambda x: x["change_pct"], reverse=True)


# ── Technical Signals (Scanner) ────────────────────────────────

def run_nifty50_scan() -> list[dict]:
    """
    Run technical scan on NIFTY 50: RSI, MACD crossover signals.
    Returns list of stocks matching key conditions.
    """
    results = []
    try:
        import ta
    except ImportError:
        log.warning("ta library not installed, returning mock scan")
        return _mock_scan()

    for sym in NIFTY50_SYMBOLS[:20]:  # Top 20 to keep it snappy
        try:
            df = get_historical_ohlcv(sym, period="3mo", interval="1d")
            if df.empty or len(df) < 30:
                continue
            close = df["Close"].squeeze()
            rsi = ta.momentum.RSIIndicator(close=close, window=14).rsi().iloc[-1]
            macd_obj = ta.trend.MACD(close=close)
            macd_val = macd_obj.macd().iloc[-1]
            macd_sig = macd_obj.macd_signal().iloc[-1]
            ema20 = ta.trend.EMAIndicator(close=close, window=20).ema_indicator().iloc[-1]
            ema50 = ta.trend.EMAIndicator(close=close, window=50).ema_indicator().iloc[-1]
            ltp = float(close.iloc[-1])

            signal = "NEUTRAL"
            if rsi < 35 and macd_val > macd_sig:
                signal = "BULLISH"
            elif rsi > 65 and macd_val < macd_sig:
                signal = "BEARISH"

            results.append({
                "symbol": sym,
                "ltp": round(ltp, 2),
                "rsi": round(rsi, 1),
                "macd": round(macd_val, 3),
                "macd_signal": round(macd_sig, 3),
                "ema20": round(ema20, 2),
                "ema50": round(ema50, 2),
                "trend": "UP" if ema20 > ema50 else "DOWN",
                "signal": signal,
            })
        except Exception as e:
            log.debug("scan(%s) error: %s", sym, e)

    return sorted(results, key=lambda x: x["rsi"])


def _mock_scan() -> list[dict]:
    import random
    return [
        {
            "symbol": sym,
            "ltp": round(random.uniform(500, 3000), 2),
            "rsi": round(random.uniform(25, 75), 1),
            "macd": round(random.uniform(-5, 5), 3),
            "macd_signal": round(random.uniform(-5, 5), 3),
            "ema20": round(random.uniform(500, 3000), 2),
            "ema50": round(random.uniform(500, 3000), 2),
            "trend": random.choice(["UP", "DOWN"]),
            "signal": random.choice(["BULLISH", "BEARISH", "NEUTRAL"]),
        }
        for sym in NIFTY50_SYMBOLS[:15]
    ]


# ── GEX / IV Smile ─────────────────────────────────────────────

def get_gex_data(symbol: str = "NIFTY") -> dict:
    """Gamma Exposure by strike from options chain."""
    chain = get_options_chain(symbol)
    spot = get_quote(symbol)["ltp"] or 22500
    gex_by_strike = {}
    for c in chain.get("calls", []):
        s = c["strike"]
        gex = c["openInterest"] * c["impliedVolatility"] * spot * 0.01
        gex_by_strike[s] = gex_by_strike.get(s, 0) + gex
    for p in chain.get("puts", []):
        s = p["strike"]
        gex = -p["openInterest"] * p["impliedVolatility"] * spot * 0.01
        gex_by_strike[s] = gex_by_strike.get(s, 0) + gex

    strikes = sorted(gex_by_strike.keys())
    gex_list = [{"strike": s, "gex": round(gex_by_strike[s], 2)} for s in strikes]
    flip_point = min(gex_list, key=lambda x: abs(x["gex"]))["strike"] if gex_list else spot

    return {
        "symbol": symbol,
        "spot": spot,
        "gex": gex_list,
        "flip_point": flip_point,
        "expiry": chain.get("expiry", ""),
    }


def get_iv_smile(symbol: str = "NIFTY") -> dict:
    """IV across strikes as smile curve."""
    chain = get_options_chain(symbol)
    spot = get_quote(symbol)["ltp"] or 22500
    smile = []
    for c in chain.get("calls", []):
        smile.append({
            "strike": c["strike"],
            "iv_call": round(float(c.get("impliedVolatility", 0) or 0) * 100, 2),
        })
    for p in chain.get("puts", []):
        for item in smile:
            if item["strike"] == p["strike"]:
                item["iv_put"] = round(float(p.get("impliedVolatility", 0) or 0) * 100, 2)
                break
    return {"symbol": symbol, "spot": spot, "smile": smile, "expiry": chain.get("expiry", "")}
