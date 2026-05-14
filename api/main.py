from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import asyncio
import os
import sys
import json
from typing import List, Dict

# Ensure standard repo paths are readable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from brokers import session as broker_session
from bot import status as bot_status
# Soft dependencies just in case DB not initialized
try:
    from engine.hkirat_db import Models, Invocations, init_db
    DB_READY = True
except ImportError:
    DB_READY = False

app = FastAPI(title="India Trade Fullstack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory Global State for UI Management ---
ACTIVE_AGENTS = {}
from engine.logger import subscribe, unsubscribe, log
from engine.async_loop import engine_entrypoint
from analysis.technical import analyse
from dataclasses import asdict
from typing import Optional

ENGINE_TASK: Optional[asyncio.Task] = None

# --- BROKER PIPELINES ---
@app.get("/api/broker/status")
async def get_broker_status():
    try:
        brokers = broker_session.get_all_brokers()
        return {
            "connected": len(brokers) > 0,
            "count": len(brokers),
            "active": list(brokers.keys())
        }
    except Exception:
        return {"connected": False, "active": []}

@app.get("/api/broker/funds")
async def get_funds():
    try:
        broker = broker_session.get_broker()
        funds = broker.get_funds()
        return {
            "available_cash": funds.available_cash,
            "used_margin": funds.used_margin,
            "total_balance": funds.total_balance,
            "currency": "INR"
        }
    except Exception as e:
        # Mock default if system is not logged in via terminal
        return {"available_cash": 1000000.0, "used_margin": 0.0, "total_balance": 1000000.0, "currency": "INR", "note": "Mock Mode"}

@app.get("/api/broker/holdings")
async def get_holdings():
    try:
        broker = broker_session.get_broker()
        holdings = broker.get_holdings()
        return [h.__dict__ for h in holdings]
    except Exception:
        return [{"symbol": "RELIANCE", "quantity": 10, "last_price": 2900.00, "pnl": 1500}]

@app.get("/api/broker/orders")
async def get_orders():
    """Fetch all recent order data."""
    try:
        broker = broker_session.get_broker()
        orders = broker.get_orders()
        return [asdict(o) for o in orders]
    except Exception:
        # Quick mock if session unavailable
        return [
            {"order_id": "ORD1", "symbol": "INFY", "transaction_type": "BUY", "quantity": 10, "status": "COMPLETE", "price": 1405.5},
            {"order_id": "ORD2", "symbol": "NIFTY", "transaction_type": "SELL", "quantity": 50, "status": "REJECTED", "price": 22550}
        ]

# --- ENGINE & BOT CONTROLS ---
@app.get("/api/bot/status")
async def get_system_status():
    global ENGINE_TASK
    return {
        "loop_running": ENGINE_TASK is not None and not ENGINE_TASK.done(),
        "badge": bot_status.get_badge(),
        "db_online": DB_READY
    }

@app.post("/api/bot/start")
async def start_bot():
    global ENGINE_TASK
    if ENGINE_TASK and not ENGINE_TASK.done():
        return {"status": "Already Running"}
    
    ENGINE_TASK = asyncio.create_task(engine_entrypoint())
    log("SYS", "Autopilot Loop successfully attached to background processor by API Command.")
    return {"status": "Triggered"}

@app.post("/api/bot/stop")
async def stop_bot():
    global ENGINE_TASK
    if ENGINE_TASK and not ENGINE_TASK.done():
        ENGINE_TASK.cancel()
        log("WARN", "System Halt signal transmitted to engine loop.")
        try:
            await asyncio.wait_for(ENGINE_TASK, timeout=2.0)
        except Exception:
            pass
        ENGINE_TASK = None
        return {"status": "Halted"}
    return {"status": "Already stopped"}

# --- SETTINGS ---
import keyring
SERVICE_NAME = "orch-trading"
_SETTINGS_FILE = os.path.expanduser("~/.orch-trading/settings.json")

@app.get("/api/settings")
async def get_settings():
    config = {}
    if os.path.exists(_SETTINGS_FILE):
        with open(_SETTINGS_FILE, "r") as f:
            try:
                config = json.load(f)
            except:
                pass
            
    keys = {
        "GEMINI_API_KEY": keyring.get_password(SERVICE_NAME, "GEMINI_API_KEY") or "",
        "GROQ_API_KEY": keyring.get_password(SERVICE_NAME, "GROQ_API_KEY") or "",
    }
    
    return {"config": config, "settings": keys}

@app.post("/api/settings")
async def save_settings(body: dict = Body(...)):
    # Extract keys and save to keyring
    if "GEMINI_API_KEY" in body:
        val = body.pop("GEMINI_API_KEY")
        if val:
            keyring.set_password(SERVICE_NAME, "GEMINI_API_KEY", val)
            os.environ["GEMINI_API_KEY"] = val
    if "GROQ_API_KEY" in body:
        val = body.pop("GROQ_API_KEY")
        if val:
            keyring.set_password(SERVICE_NAME, "GROQ_API_KEY", val)
            os.environ["GROQ_API_KEY"] = val
            
    # Save the rest to settings.json
    os.makedirs(os.path.dirname(_SETTINGS_FILE), exist_ok=True)
    with open(_SETTINGS_FILE, "w") as f:
        json.dump(body, f, indent=2)
        
    return {"status": "ok"}

# --- MARKET SCANNER EXPOSURE ---
import yfinance as yf

@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    try:
        sanitized = symbol.upper().replace("NSE:", "")
        if not sanitized.endswith(".NS") and not sanitized.endswith(".BO") and not sanitized in ["NIFTY", "BANKNIFTY", "FINNIFTY"]:
            sanitized += ".NS"
            
        ticker = yf.Ticker(sanitized)
        hist = ticker.history(period="2d")
        if len(hist) >= 2:
            prev_close = hist['Close'].iloc[-2]
            current = hist['Close'].iloc[-1]
        elif len(hist) == 1:
            prev_close = hist['Close'].iloc[0]
            current = hist['Close'].iloc[0]
        else:
            return {"symbol": symbol, "price": 0.0, "change": 0.0, "change_pct": 0.0}
            
        change = current - prev_close
        change_pct = (change / prev_close) * 100 if prev_close else 0.0
        
        return {
            "symbol": symbol,
            "price": float(current),
            "change": float(change),
            "change_pct": float(change_pct)
        }
    except Exception as e:
        return {"symbol": symbol, "price": 0.0, "change": 0.0, "change_pct": 0.0, "error": str(e)}

@app.get("/api/analysis/summary/{symbol}")
async def get_analysis_snapshot(symbol: str):
    try:
        sanitized_symbol = symbol.upper().replace("NSE:", "")
        snapshot = analyse(sanitized_symbol)
        return asdict(snapshot)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AGENTIC CHAT ---
@app.post("/api/chat")
async def chat_endpoint(body: dict = Body(...)):
    """
    Main AI chat endpoint. Accepts a message and executes Gemini Function Calling.
    Returns AI reply, list of tool actions taken, and optional UI redirect.
    """
    message = body.get("message", "").strip()
    context = body.get("context", {})
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    
    try:
        from agent.engine import get_engine
        engine = get_engine()
        result = await asyncio.get_event_loop().run_in_executor(
            None, engine.process, message, context
        )
        return result
    except Exception as e:
        log("ERROR", f"Chat engine error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- DEMO CONTROLS ---
@app.post("/api/demo/reset")
async def reset_demo():
    """Reset the demo portfolio to fresh ₹10,00,000."""
    try:
        from brokers.demo import get_demo_broker
        broker = get_demo_broker()
        broker.reset()
        return {"status": "ok", "message": "Demo portfolio reset to ₹10,00,000"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- POSITIONS ---
@app.get("/api/broker/positions")
async def get_positions():
    try:
        from brokers.demo import get_demo_broker
        broker = get_demo_broker()
        positions = broker.get_positions()
        return [asdict(p) for p in positions]
    except Exception:
        return []

# --- WEBSOCKETS ---
@app.websocket("/ws/market-data")
async def ws_market(websocket: WebSocket):
    await websocket.accept()
    try:
        from market.free_data import get_quote, is_market_open
        watch_symbols = ["NIFTY", "BANKNIFTY", "RELIANCE", "INFY", "TCS"]
        idx = 0
        while True:
            sym = watch_symbols[idx % len(watch_symbols)]
            idx += 1
            try:
                q = await asyncio.get_event_loop().run_in_executor(None, get_quote, sym)
                await websocket.send_json({
                    "type": "TICK",
                    "symbol": sym,
                    "price": q["ltp"],
                    "change": q["change"],
                    "change_pct": q["change_pct"],
                    "market_open": q.get("market_open", False),
                })
            except Exception:
                import random
                await websocket.send_json({
                    "type": "TICK",
                    "symbol": sym,
                    "price": 22500.0 + random.uniform(-50, 50),
                    "change": random.uniform(-100, 100),
                    "change_pct": random.uniform(-0.5, 0.5),
                    "market_open": False,
                })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/agent-logs")
async def ws_logs(websocket: WebSocket):
    await websocket.accept()
    q = asyncio.Queue()
    subscribe(q)
    
    # Welcome line
    await websocket.send_json({"timestamp": "LIVE", "level": "SYS", "msg": "Connecting downstream to swarm node..."})
    
    try:
        while True:
            data = await q.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        unsubscribe(q)

# --- STATIC BUILD HOSTING ---
FRONTEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))

if os.path.exists(FRONTEND_PATH):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_PATH, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    async def serve_react(catchall: str):
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))
else:
    @app.get("/")
    async def fallback_root():
        return {"msg": "FastAPI logic core running. React build folder not detected. Please compile frontend."}
