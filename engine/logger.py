import asyncio
import json
from typing import List, Any

_subscribers: List[asyncio.Queue] = []

def subscribe(queue: asyncio.Queue):
    if queue not in _subscribers:
        _subscribers.append(queue)

def unsubscribe(queue: asyncio.Queue):
    if queue in _subscribers:
        _subscribers.remove(queue)

def log(level: str, message: str):
    print(f"[{level}] {message}")
    
    loop = None
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        pass
        
    if loop and loop.is_running():
        payload = {
            "timestamp": str(loop.time()),
            "level": level,
            "msg": message
        }
        for q in _subscribers:
            asyncio.run_coroutine_threadsafe(q.put(payload), loop) if not loop.is_running() else loop.create_task(q.put(payload))
