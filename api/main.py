from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
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
            "available": funds.available_cash,
            "used": funds.used_margin,
            "total": funds.total_balance,
            "currency": "INR"
        }
    except Exception as e:
        # Mock default if system is not logged in via terminal
        return {"available": 100000.00, "used": 0, "total": 100000.00, "currency": "INR", "note": "Mock Mode"}

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

# --- MARKET SCANNER EXPOSURE ---
@app.get("/api/analysis/summary/{symbol}")
async def get_analysis_snapshot(symbol: str):
    try:
        sanitized_symbol = symbol.upper().replace("NSE:", "")
        snapshot = analyse(sanitized_symbol)
        return asdict(snapshot)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- WEBSOCKETS ---
@app.websocket("/ws/market-data")
async def ws_market(websocket: WebSocket):
    await websocket.accept()
    try:
        symbols = ["NIFTY", "BANKNIFTY", "RELIANCE", "INFY"]
        import random
        while True:
            sym = random.choice(symbols)
            await websocket.send_json({
                "type": "TICK",
                "symbol": sym,
                "price": 22500.00 + random.uniform(-10, 10) if "NIFTY" in sym else 1500.00 + random.uniform(-2, 2)
            })
            await asyncio.sleep(1)
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
