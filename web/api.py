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
            "broker": "demo",
            "auto_trading": False,
            "max_position_size": 50000,
            "daily_loss_limit": 10000,
            "risk_per_trade": 2.0,
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
    return {"status": "ok", "broker": "demo", "market_open": is_market_open()}

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
    for key in ["gemini_api_key", "groq_api_key", "openai_api_key"]:
        if masked.get(key) and len(masked[key]) > 8:
            masked[key] = masked[key][:4] + "****" + masked[key][-4:]
    return masked

class SettingsUpdate(BaseModel):
    ai_provider: Optional[str] = None
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    broker: Optional[str] = None
    auto_trading: Optional[bool] = None
    max_position_size: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    risk_per_trade: Optional[float] = None
    watchlist: Optional[list] = None

@app.post("/api/settings")
def update_settings(req: SettingsUpdate):
    settings = load_settings()
    update = req.dict(exclude_none=True)
    # Don't overwrite real keys with masked values
    for key in ["gemini_api_key", "groq_api_key", "openai_api_key"]:
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
