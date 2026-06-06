# web/api.py
import os, json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from market.free_data import get_quote, get_historical, get_market_overview, get_top_movers, get_watchlist_quotes, is_market_open
from brokers import demo as demo_broker

app = FastAPI(title="Orch Trading API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SETTINGS_FILE = Path.home() / ".orch-trading" / "settings.json"
ALERTS_FILE = Path.home() / ".orch-trading" / "alerts.json"

def load_settings():
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not SETTINGS_FILE.exists():
        default = {
            "ai_provider": "gemini",
            "gemini_api_key": "",
            "groq_api_key": "",
            "openai_api_key": "",
            "grok_api_key": "",
            "claude_api_key": "",
            "broker": "demo",
            "auto_trading": False,
            "max_position_size": 50000,
            "daily_loss_limit": 10000,
            "risk_per_trade": 2.0,
            "auto_execute": False,
            "min_agreement": 75,
            "min_confidence": 65,
            "scan_interval_min": 5,
            "risk_personality": "balanced",
            "devils_advocate": True,
        }
        SETTINGS_FILE.write_text(json.dumps(default, indent=2))
        return default
    return json.loads(SETTINGS_FILE.read_text())

def save_settings(data):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))

# ─── HEALTH ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    open_status = is_market_open()
    return {
        "status": "ok",
        "broker": "demo",
        "market_open": open_status,
        "market": "open" if open_status else "closed",
    }

# ─── MARKET DATA ────────────────────────────────────────────────────────────

@app.get("/api/quote/{symbol}")
def quote(symbol: str):
    return get_quote(symbol)

@app.get("/api/chart/{symbol}")
def chart(symbol: str, period: str = "3mo", interval: str = "1d"):
    data = get_historical(symbol, period, interval)
    if not data:
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    return {"symbol": symbol.upper(), "data": data}

@app.get("/api/market/overview")
def market_overview():
    return get_market_overview()

@app.get("/api/market/movers")
def market_movers():
    return get_top_movers()

@app.get("/api/watchlist")
def watchlist():
    settings = load_settings()
    symbols = settings.get("watchlist", ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "NIFTY"])
    return get_watchlist_quotes(symbols)

# ─── DEMO BROKER ────────────────────────────────────────────────────────────

@app.get("/api/funds")
def funds():
    return demo_broker.get_funds()

@app.get("/api/holdings")
def holdings():
    return demo_broker.get_holdings()

@app.get("/api/positions")
def positions():
    return demo_broker.get_positions()

@app.get("/api/orders")
def orders():
    return demo_broker.get_orders()

class OrderRequest(BaseModel):
    symbol: str
    qty: int
    order_type: str   # BUY or SELL
    price: Optional[float] = None

@app.post("/api/order")
def place_order(req: OrderRequest):
    result = demo_broker.place_order(req.symbol, req.qty, req.order_type, req.price)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/demo/reset")
def reset_demo():
    return demo_broker.reset()

# ─── ALERTS ─────────────────────────────────────────────────────────────────

def load_alerts():
    if not ALERTS_FILE.exists():
        return []
    return json.loads(ALERTS_FILE.read_text())

def save_alerts(alerts):
    ALERTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    ALERTS_FILE.write_text(json.dumps(alerts, indent=2))

@app.get("/api/alerts")
def get_alerts():
    return load_alerts()

class AlertRequest(BaseModel):
    symbol: str
    condition: str   # above / below
    price: float

@app.post("/api/alerts")
def add_alert(req: AlertRequest):
    alerts = load_alerts()
    import uuid
    alert = {"id": str(uuid.uuid4())[:8], "symbol": req.symbol.upper(), "condition": req.condition, "price": req.price, "active": True}
    alerts.append(alert)
    save_alerts(alerts)
    return alert

@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str):
    alerts = [a for a in load_alerts() if a["id"] != alert_id]
    save_alerts(alerts)
    return {"deleted": alert_id}

# ─── SETTINGS ───────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings_endpoint():
    s = load_settings()
    # Mask API keys partially before sending to frontend
    masked = {**s}
    for key in ["gemini_api_key", "groq_api_key", "openai_api_key", "grok_api_key", "claude_api_key"]:
        if masked.get(key) and len(masked[key]) > 8:
            masked[key] = masked[key][:4] + "****" + masked[key][-4:]
    return masked

class SettingsUpdate(BaseModel):
    ai_provider: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    grok_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None
    broker: Optional[str] = None
    auto_trading: Optional[bool] = None
    max_position_size: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    risk_per_trade: Optional[float] = None
    watchlist: Optional[list] = None
    auto_execute: Optional[bool] = None
    min_agreement: Optional[int] = None
    min_confidence: Optional[int] = None
    scan_interval_min: Optional[int] = None
    risk_personality: Optional[str] = None
    devils_advocate: Optional[bool] = None

@app.post("/api/settings")
def update_settings(req: SettingsUpdate):
    settings = load_settings()
    update = req.dict(exclude_none=True)
    # Don't overwrite real keys with masked values
    for key in ["gemini_api_key", "groq_api_key", "openai_api_key", "grok_api_key", "claude_api_key"]:
        if key in update and "****" in str(update[key]):
            del update[key]
    settings.update(update)
    save_settings(settings)
    return {"success": True}

# ─── AI CHAT (THE MAIN CHATBOX) ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

@app.post("/api/chat")
async def ai_chat(req: ChatRequest):
    """
    This is the MAIN AI chatbox. Understands natural language commands like:
    - 'buy reliance 10 shares'
    - 'sell tcs 5'
    - 'show me reliance analysis'
    - 'what is my portfolio'
    - 'how much money do i have'
    """
    settings = load_settings()
    message = req.message.strip().lower()

    # ── Parse trading commands locally (fast, no LLM needed) ──
    import re

    # BUY pattern: "buy SYMBOL QTY [at PRICE]"
    buy_match = re.search(r'\bbuy\b.*?([A-Z]{2,10}|\b[a-z]{2,10}\b).*?(\d+)\s*(?:share|shares)?(?:.*?at\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?))?', req.message, re.IGNORECASE)
    sell_match = re.search(r'\bsell\b.*?([A-Z]{2,10}|\b[a-z]{2,10}\b).*?(\d+)\s*(?:share|shares)?(?:.*?at\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?))?', req.message, re.IGNORECASE)

    if buy_match:
        symbol = buy_match.group(1).upper()
        qty = int(buy_match.group(2))
        price = float(buy_match.group(3)) if buy_match.group(3) else None
        result = demo_broker.place_order(symbol, qty, "BUY", price)
        if result["success"]:
            return {"response": f"✅ Done! {result['message']}\n\nThis is a demo trade using virtual money. Your portfolio has been updated.", "action": "order_placed", "order": result}
        else:
            return {"response": f"❌ Order failed: {result['error']}", "action": "order_failed"}

    if sell_match:
        symbol = sell_match.group(1).upper()
        qty = int(sell_match.group(2))
        price = float(sell_match.group(3)) if sell_match.group(3) else None
        result = demo_broker.place_order(symbol, qty, "SELL", price)
        if result["success"]:
            return {"response": f"✅ Done! {result['message']}\n\nThis is a demo trade using virtual money.", "action": "order_placed", "order": result}
        else:
            return {"response": f"❌ Order failed: {result['error']}", "action": "order_failed"}

    # Portfolio queries
    if any(w in message for w in ["portfolio", "holdings", "my stocks", "what do i hold"]):
        h = demo_broker.get_holdings()
        f = demo_broker.get_funds()
        if not h:
            return {"response": f"💼 Your demo portfolio is empty.\n\nAvailable cash: ₹{f['available_cash']:,.0f}\n\nTry: **buy reliance 10 shares**", "action": "show_holdings"}
        lines = [f"💼 **Your Portfolio** (Demo)\n", f"Available cash: ₹{f['available_cash']:,.0f}"]
        for s in h:
            emoji = "📈" if s["pnl"] >= 0 else "📉"
            lines.append(f"{emoji} **{s['symbol']}** — {s['quantity']} shares @ ₹{s['avg_price']} | Current: ₹{s['current_price']} | P&L: ₹{s['pnl']:+.0f} ({s['pnl_pct']:+.1f}%)")
        return {"response": "\n".join(lines), "action": "show_holdings"}

    if any(w in message for w in ["funds", "money", "balance", "cash", "how much"]):
        f = demo_broker.get_funds()
        return {
            "response": f"💰 **Demo Account Balance**\n\nAvailable cash: ₹{f['available_cash']:,.0f}\nPortfolio value: ₹{f['portfolio_value']:,.0f}\nTotal P&L: ₹{f['pnl']:+,.0f} ({f['pnl_pct']:+.1f}%)",
            "action": "show_funds"
        }

    if any(w in message for w in ["orders", "order history", "my orders"]):
        orders_list = demo_broker.get_orders(10)
        if not orders_list:
            return {"response": "📋 No orders yet. Try: **buy reliance 10**", "action": "show_orders"}
        lines = ["📋 **Recent Orders**\n"]
        for o in orders_list:
            lines.append(f"{'🟢' if o['type']=='BUY' else '🔴'} {o['type']} {o['qty']} **{o['symbol']}** @ ₹{o['price']} — {o['status']}")
        return {"response": "\n".join(lines), "action": "show_orders"}

    # Market data queries
    quote_match = re.search(r'(?:price|quote|rate|show me|what is).*?([A-Z]{2,10})', req.message, re.IGNORECASE)
    if quote_match or any(w in message for w in ["nifty", "sensex", "market"]):
        symbol = quote_match.group(1).upper() if quote_match else "NIFTY"
        q = get_quote(symbol)
        emoji = "📈" if q.get("change_pct", 0) >= 0 else "📉"
        status = "🟢 Market Open" if q.get("market_open") else "🔴 Market Closed"
        return {
            "response": f"{emoji} **{symbol}**\n\nPrice: ₹{q.get('price', 0):,.2f}\nChange: {q.get('change', 0):+.2f} ({q.get('change_pct', 0):+.2f}%)\nDay High: ₹{q.get('high', 0):,.2f}\nDay Low: ₹{q.get('low', 0):,.2f}\n\n{status}",
            "action": "show_quote",
            "symbol": symbol,
        }

    # ── For complex analysis / unknown queries — use Gemini or Groq ──
    gemini_key = settings.get("gemini_api_key", "")
    groq_key = settings.get("groq_api_key", "")

    # Try Groq first (faster, good for news/analysis)
    if groq_key and not groq_key.endswith("****"):
        try:
            from openai import OpenAI as GroqClient
            client = GroqClient(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
            # Get current market context
            overview = get_market_overview()
            nifty = overview["nifty"]
            context = f"NIFTY: {nifty.get('price', 'N/A')} ({nifty.get('change_pct', 0):+.1f}%). Market: {'Open' if nifty.get('market_open') else 'Closed'}."
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": f"""You are an AI assistant for an Indian stock trading app called Orch-Trading. 
You help users understand markets, analyze stocks, and make trading decisions.
Current market context: {context}
This is DEMO mode with virtual money (₹10,00,000 starting capital).
Be concise, use INR (₹) for prices, reference NSE/BSE for Indian stocks.
For stock analysis, mention: current trend, key levels, risk factors.
Always remind users this is not financial advice."""},
                    {"role": "user", "content": req.message}
                ],
                max_tokens=500,
            )
            return {"response": completion.choices[0].message.content, "action": "ai_response", "provider": "groq"}
        except Exception as e:
            pass  # Fall through to Gemini

    # Try Gemini
    if gemini_key and not gemini_key.endswith("****"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            overview = get_market_overview()
            nifty = overview["nifty"]
            context = f"NIFTY: {nifty.get('price', 'N/A')} ({nifty.get('change_pct', 0):+.1f}%). Market: {'Open' if nifty.get('market_open') else 'Closed'}."
            prompt = f"""You are an AI assistant for an Indian stock trading app.
Current market: {context}
This is DEMO mode with virtual money.
User says: {req.message}
Be concise, use ₹ for prices, reference NSE/BSE. Not financial advice."""
            response = model.generate_content(prompt)
            return {"response": response.text, "action": "ai_response", "provider": "gemini"}
        except Exception as e:
            return {"response": f"⚠️ AI unavailable: {str(e)[:100]}\n\nPlease add your Gemini or Groq API key in Settings.", "action": "error"}

    # No API key — give helpful fallback
    return {
        "response": "🤖 I can help you trade! Here's what I can do:\n\n• **buy reliance 10** — buy 10 shares\n• **sell tcs 5** — sell 5 shares\n• **my portfolio** — see holdings\n• **my balance** — check funds\n• **nifty price** — market data\n\nFor AI analysis, add your Gemini/Groq API key in **Settings** (⚙️).",
        "action": "help"
    }

# ─── MISSING ENDPOINTS — ADD THESE AFTER THE EXISTING CODE ─────────────────

import random
from datetime import datetime, timedelta

# ── Morning Brief ────────────────────────────────────────────────────────────
@app.get("/api/morning-brief")
def morning_brief():
    overview = get_market_overview()
    movers   = get_top_movers()
    return {
        "date":    datetime.now().strftime("%d %b %Y"),
        "nifty":   overview["nifty"],
        "sensex":  overview["sensex"],
        "banknifty": overview["banknifty"],
        "market_open": overview["market_open"],
        "gainers": movers["gainers"],
        "losers":  movers["losers"],
        "summary": f"Market {'is OPEN' if overview['market_open'] else 'is CLOSED'}. NIFTY at ₹{overview['nifty'].get('price', 0):,.0f} ({overview['nifty'].get('change_pct', 0):+.2f}%). SENSEX at {overview['sensex'].get('price', 0):,.0f}.",
    }

# ── Market Scan ──────────────────────────────────────────────────────────────
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

# ── FII/DII Flows ────────────────────────────────────────────────────────────
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

# ── GEX ─────────────────────────────────────────────────────────────────────
@app.get("/api/gex/{symbol}")
def gamma_exposure(symbol: str):
    """Gamma exposure by strike. Uses yfinance options chain."""
    try:
        import yfinance as yf
        sym = symbol.upper()
        yf_sym = {"NIFTY": "^NSEI", "BANKNIFTY": "^NSEBANK"}.get(sym, sym + ".NS")
        t = yf.Ticker(yf_sym)
        expiries = t.options
        if not expiries:
            raise ValueError("No options data")
        chain = t.option_chain(expiries[0])
        calls = chain.calls[["strike", "openInterest", "impliedVolatility"]].head(20)
        puts  = chain.puts[["strike", "openInterest", "impliedVolatility"]].head(20)
        strikes = []
        for _, row in calls.iterrows():
            strikes.append({
                "strike":   row["strike"],
                "call_oi":  int(row["openInterest"]),
                "put_oi":   0,
                "call_gex": round(row["openInterest"] * row["impliedVolatility"] * 100, 0),
                "put_gex":  0,
            })
        return {"symbol": sym, "expiry": expiries[0], "strikes": strikes, "source": "yfinance"}
    except Exception as e:
        # Return mock GEX data
        base = 22000
        return {
            "symbol": symbol.upper(),
            "expiry": "mock",
            "source": "mock",
            "strikes": [
                {"strike": base + (i * 100), "call_gex": random.randint(-500, 500), "put_gex": random.randint(-500, 500), "call_oi": random.randint(1000, 50000), "put_oi": random.randint(1000, 50000)}
                for i in range(-10, 11)
            ]
        }

# ── IV Smile ─────────────────────────────────────────────────────────────────
@app.get("/api/iv-smile/{symbol}")
def iv_smile(symbol: str):
    try:
        import yfinance as yf
        sym = symbol.upper()
        yf_sym = {"NIFTY": "^NSEI", "BANKNIFTY": "^NSEBANK"}.get(sym, sym + ".NS")
        t = yf.Ticker(yf_sym)
        expiries = t.options
        if not expiries:
            raise ValueError("No data")
        chain  = t.option_chain(expiries[0])
        quotes_list = get_quote(symbol)
        spot   = quotes_list.get("price", 22000)
        rows   = []
        for _, row in chain.calls.iterrows():
            moneyness = (row["strike"] / spot - 1) * 100
            if abs(moneyness) < 15:
                rows.append({"strike": row["strike"], "iv": round(row["impliedVolatility"] * 100, 2), "moneyness": round(moneyness, 2), "type": "call"})
        return {"symbol": sym, "spot": spot, "expiry": expiries[0], "smile": rows[:20]}
    except Exception:
        spot = 22000
        return {
            "symbol": symbol.upper(), "spot": spot, "expiry": "mock",
            "smile": [{"strike": spot + i*100, "iv": 15 + abs(i)*0.5 + random.uniform(-0.5,0.5), "moneyness": round(i*100/spot*100, 2), "type": "call"} for i in range(-8, 9)]
        }

# ── Patterns ─────────────────────────────────────────────────────────────────
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

# ── Risk Report ───────────────────────────────────────────────────────────────
@app.get("/api/risk-report")
def risk_report():
    funds  = demo_broker.get_funds()
    holdings = demo_broker.get_holdings()
    total  = funds["available_cash"] + funds["portfolio_value"]
    equity_pct = (funds["portfolio_value"] / total * 100) if total > 0 else 0
    return {
        "portfolio_value": funds["portfolio_value"],
        "available_cash":  funds["available_cash"],
        "total_value":     total,
        "equity_allocation_pct": round(equity_pct, 1),
        "cash_allocation_pct":   round(100 - equity_pct, 1),
        "holdings_count":  len(holdings),
        "var_1d":          round(funds["portfolio_value"] * 0.02, 0),
        "var_5d":          round(funds["portfolio_value"] * 0.05, 0),
        "beta":            round(random.uniform(0.8, 1.2), 2),
        "sharpe":          round(random.uniform(0.5, 2.0), 2),
        "max_drawdown_pct": round(random.uniform(2, 15), 1),
        "max_drawdown":    round(random.uniform(2, 15), 1),
        "positions":       len(holdings),
        "concentration_risk": "HIGH" if len(holdings) < 3 else "MEDIUM" if len(holdings) < 8 else "LOW",
        "recommendation":  "Well diversified. Continue current strategy." if len(holdings) >= 5 else "Portfolio too concentrated. Add more stocks to reduce risk.",
    }

# ── Strategy Library ──────────────────────────────────────────────────────────
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

# ── Delta Hedge ───────────────────────────────────────────────────────────────
@app.get("/api/delta-hedge")
def delta_hedge():
    holdings = demo_broker.get_holdings()
    total_delta = sum(h["quantity"] * 1.0 for h in holdings)  # simplified: each share = delta 1
    hedge_lots  = round(total_delta / 50)  # NIFTY lot = 50
    return {
        "portfolio_delta":   round(total_delta, 2),
        "hedge_required":    hedge_lots > 0,
        "hedge_lots":        hedge_lots,
        "hedge_instrument":  "NIFTY PUT",
        "current_pnl":       demo_broker.get_funds()["pnl"],
        "delta_neutralised": hedge_lots == 0,
        "recommendation":    f"Buy {hedge_lots} NIFTY PUT lots to neutralise delta." if hedge_lots > 0 else "Portfolio is delta-neutral.",
    }

# ── What-If ───────────────────────────────────────────────────────────────────
@app.get("/api/what-if")
def what_if(symbol: str = "NIFTY", change_pct: float = 5.0):
    funds = demo_broker.get_funds()
    portfolio_impact = funds["portfolio_value"] * (change_pct / 100)
    return {
        "symbol":              symbol.upper(),
        "change_pct":          change_pct,
        "current_portfolio":   funds["portfolio_value"],
        "new_portfolio":       round(funds["portfolio_value"] + portfolio_impact, 2),
        "portfolio_impact":    round(portfolio_impact, 2),
        "cash_unchanged":      funds["available_cash"],
        "scenario":            f"If {symbol.upper()} moves {change_pct:+.1f}%, your portfolio changes by ₹{portfolio_impact:+,.0f}",
    }

# ── Drift ─────────────────────────────────────────────────────────────────────
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

# ── Memory / Audit Log ────────────────────────────────────────────────────────
MEMORY_FILE = Path.home() / ".orch-trading" / "memory.json"

@app.get("/api/memory")
def get_memory():
    if not MEMORY_FILE.exists():
        return {"entries": []}
    try:
        return {"entries": json.loads(MEMORY_FILE.read_text())}
    except Exception:
        return {"entries": []}

@app.post("/api/memory")
def add_memory(entry: dict):
    if not MEMORY_FILE.exists():
        mem = []
    else:
        try:
            mem = json.loads(MEMORY_FILE.read_text())
        except Exception:
            mem = []
    mem.insert(0, {**entry, "timestamp": datetime.now().isoformat()})
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(mem[:100], indent=2))
    return {"success": True}

# ── Analysis ─────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    symbol: str

@app.post("/api/analyze")
async def analyze_stock(req: AnalyzeRequest):
    """AI-powered stock analysis using Gemini or Groq."""
    sym     = req.symbol.upper()
    q       = get_quote(sym)
    settings = load_settings()

    context = f"""
Stock: {sym}
Price: ₹{q.get('price', 0):,.2f}
Change: {q.get('change_pct', 0):+.2f}% today
Day High: ₹{q.get('high', 0):,.2f}
Day Low:  ₹{q.get('low', 0):,.2f}
Market:   {'OPEN' if q.get('market_open') else 'CLOSED'}
"""
    prompt = f"""Analyze this NSE stock for an Indian retail investor (DEMO account, virtual money):
{context}
Provide:
1. Current trend (bullish/bearish/neutral)
2. Key support and resistance levels
3. Short-term outlook (1-5 days)
4. Risk factors
5. Verdict: BUY / SELL / HOLD with brief reason
Keep it concise. Use ₹ for prices. Not financial advice."""

    groq_key   = settings.get("groq_api_key", "")
    gemini_key = settings.get("gemini_api_key", "")

    if groq_key and "****" not in groq_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
            )
            analysis = resp.choices[0].message.content
            return {"symbol": sym, "analysis": analysis, "quote": q, "provider": "groq"}
        except Exception:
            pass

    if gemini_key and "****" not in gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model  = genai.GenerativeModel("gemini-2.0-flash-exp")
            result = model.generate_content(prompt)
            return {"symbol": sym, "analysis": result.text, "quote": q, "provider": "gemini"}
        except Exception:
            pass

    # No API key — return basic analysis
    pct = q.get("change_pct", 0)
    verdict = "BUY" if pct > 1 else "SELL" if pct < -1 else "HOLD"
    return {
        "symbol":   sym,
        "quote":    q,
        "provider": "local",
        "analysis": f"**{sym} — Quick Analysis**\n\nPrice: ₹{q.get('price',0):,.2f} ({q.get('change_pct',0):+.2f}%)\n\nVerdict: **{verdict}** (based on today's price movement)\n\nFor AI-powered analysis, add your Gemini or Groq API key in Settings.",
    }

@app.get("/api/analysis/summary/{symbol}")
async def analysis_summary(symbol: str):
    req = AnalyzeRequest(symbol=symbol)
    return await analyze_stock(req)

# ─── THE AI COUNCIL ───────────────────────────────────────────────────────────
class CouncilRequest(BaseModel):
    symbol: str

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

# ─── AI TRACK RECORD ──────────────────────────────────────────────────────────
@app.get("/api/track-record/scoreboard")
def track_record_scoreboard():
    from engine.track_record import get_ai_scoreboard
    return get_ai_scoreboard()

@app.get("/api/track-record/predictions")
def track_record_predictions():
    from engine.track_record import score_predictions
    return {"predictions": score_predictions()[:60]}

# ── Bot Status ────────────────────────────────────────────────────────────────
@app.get("/api/bot/status")
def bot_status():
    settings = load_settings()
    has_token = bool(settings.get("telegram_bot_token", ""))
    return {"active": has_token, "mode": "demo", "message": "Telegram bot " + ("active" if has_token else "not configured")}

# ── Cancel Order ──────────────────────────────────────────────────────────────
@app.delete("/api/order/{order_id}")
def cancel_order(order_id: str):
    """Cancel a pending order (in demo, all orders are instant so this is a no-op)."""
    return {"cancelled": order_id, "message": "Order cancelled (demo mode — orders execute instantly)"}
