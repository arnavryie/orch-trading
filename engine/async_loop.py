import asyncio
import sys
import os

# Ensure parent directory is in path if executing directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent.orchestrator import run_swarm_cycle
from engine.logger import log

async def stream_market_data(data_queue: asyncio.Queue):
    """Constantly fetches live ticks and pushes to the Swarm."""
    log("SYS", "Live Data Stream established.")
    try:
        while True:
            # TODO: Fetch real data from brokers/ websocket
            fake_tick = {"symbol": "NIFTY", "ltp": 22500}
            await data_queue.put(fake_tick)
            await asyncio.sleep(5.0) # Slower pace for better UX readability
    except asyncio.CancelledError:
        log("SYS", "Data stream shut down.")

async def engine_entrypoint():
    log("SYS", "Initializing Multi-Agent Trading Swarm Core...")
    data_queue = asyncio.Queue()
    
    try:
        # Run data streaming and AI decision cycles in parallel
        await asyncio.gather(
            stream_market_data(data_queue),
            run_swarm_cycle(data_queue)
        )
    except asyncio.CancelledError:
        log("WARN", "Engine execution task cancelled.")

if __name__ == "__main__":
    asyncio.run(engine_entrypoint())
