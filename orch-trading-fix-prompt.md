# ORCH-TRADING: Full Fix & Demo Mode Prompt
## For Claude Code (paste this entire prompt)

---

## PROJECT CONTEXT

This is the `orch-trading` repo (also called **Vibe Trading**) — an agentic AI trading platform for Indian markets (NSE/BSE). The app has a React + Electron macOS frontend and a Python FastAPI backend running on port 8765.

**The current problem:** The UI loads but every single sidebar page is broken — Holdings, Positions, Orders, Funds, Alerts, FII/DII Flows, Patterns, Scan, GEX, IV Smile, Risk Report, Strategy, Delta Hedge, What-If, Drift, Memory — none of them return real data. The backend either crashes or returns empty responses.

**Goal:** Make the ENTIRE app work end-to-end in DEMO mode. Every page must load with real data or sensible demo data. The app must be a fully automatic AI trading system driven by Gemini Flash and/or Groq.

---

## WHAT NEEDS TO BE DONE — STEP BY STEP

---

### STEP 1 — INSTALL ALL MISSING DEPENDENCIES

Run the following and fix any errors:

```bash
pip install -e .
pip install yfinance pandas numpy scipy rich textual prompt_toolkit fastapi uvicorn fpdf2 python-telegram-bot python-dotenv keyring pyotp python-dateutil pytz feedparser newsapi-python httpx anthropic openai google-genai pytest pytest-mock
pip install nsepython jugaad-data
pip install websockets aiohttp
pip install plotly kaleido  # for chart generation
pip install ta  # technical analysis indicators (RSI, MACD, EMA etc.)
```

Then go into `frontend/` or `macos-app/` (whichever has `package.json`) and run:
```bash
npm install
```

Fix any npm peer dependency errors. Make sure the React build works.

---

### STEP 2 — CREATE DEMO BROKER (FULL MOCK)

Create a file `brokers/demo.py` that implements the **exact same interface** as the real broker adapters (Zerodha/Fyers). This demo broker must:

1. Start with ₹10,00,000 (10 lakh) virtual cash
2. Persist state to a local JSON file `~/.orch-trading/demo_portfolio.json` so it survives restarts
3. Support ALL of these methods that the rest of the codebase calls:
   - `get_holdings()` → returns list of stocks held with qty, avg price, current price, P&L
   - `get_positions()` → returns open intraday positions
   - `get_orders()` → returns order history (last 50)
   - `get_funds()` → returns available cash, used margin, total portfolio value
   - `place_order(symbol, qty, order_type, price)` → BUY or SELL, updates holdings and cash
   - `cancel_order(order_id)` → removes pending order
   - `get_quote(symbol)` → fetches real-time price via yfinance (see Step 3)
   - `get_historical(symbol, interval, period)` → fetches OHLCV from yfinance

4. When placing a BUY order:
   - Deduct `qty × price` from available cash
   - Add to holdings
   - Record in order history with timestamp, status = COMPLETE

5. When placing a SELL order:
   - Check if holding exists
   - Add proceeds to cash
   - Update or remove from holdings

6. Save state after every transaction

The demo broker must be automatically selected when no real broker credentials are present (i.e., `FYERS_APP_ID` and `KITE_API_KEY` are both missing from `.env`).

---

### STEP 3 — REAL-TIME MARKET DATA (FREE, NO BROKER NEEDED)

For all market data, use **yfinance** as the primary free data source. NSE stocks use the `.NS` suffix (e.g., `RELIANCE.NS`, `INFY.NS`, `NIFTY.NS` → use `^NSEI` for NIFTY index).

Create `market/free_data.py` with these functions:

```python
def get_quote(symbol: str) -> dict:
    """
    Returns current price, day high/low, volume, % change.
    Appends .NS automatically if not present.
    Uses yfinance Ticker.fast_info for speed.
    Falls back to .history(period='1d') if fast_info fails.
    """

def get_historical_ohlcv(symbol: str, period: str = "3mo", interval: str = "1d") -> pd.DataFrame:
    """
    Returns OHLCV DataFrame.
    period options: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y
    interval options: 1m, 5m, 15m, 30m, 1h, 1d, 1wk
    """

def get_options_chain(symbol: str, expiry: str = None) -> dict:
    """
    Returns options chain using yfinance .option_chain().
    If symbol has no options data, return mock data with sensible PCR.
    """

def get_nifty_data() -> dict:
    """
    Returns NIFTY 50 index data: price, change, PE, VIX.
    VIX: use ^INDIAVIX ticker.
    """

def get_fii_dii_flows() -> dict:
    """
    Scrape FII/DII data from NSE website: https://www.nseindia.com/api/fiidiiTradeReact
    Use requests with proper headers (NSE blocks without User-Agent).
    Cache result for 30 minutes.
    If scraping fails, return mock data with realistic numbers.
    """

def get_market_breadth() -> dict:
    """
    Calculate advance/decline ratio from NIFTY 50 constituents.
    Fetch quotes for all 50 stocks and count advances vs declines.
    """

def get_sector_performance() -> list:
    """
    Fetch sector ETF prices for NIFTY sectors:
    NIFTYMETAL.NS, NIFTYIT.NS, NIFTYBANK.NS, NIFTYPHARMA.NS etc.
    Return % change for each sector today.
    """
```

**Important:** When market is closed (weekends, after 3:30 PM IST, before 9:15 AM IST), yfinance still returns the last closing prices. This is correct behaviour — show those prices with a "Market Closed" badge in the UI. Do NOT show errors or empty screens when market is closed.

---

### STEP 4 — FIX EVERY FASTAPI ENDPOINT

Go through `web/api.py` (or wherever the FastAPI routes are defined). For every route that is currently broken, empty, or returning 500 errors, fix it by:

1. Wiring it to the demo broker (Step 2) or free market data (Step 3)
2. Returning proper JSON that the frontend expects

Make sure ALL of these endpoints work and return real/demo data:

| Endpoint | Data source |
|----------|-------------|
| `GET /api/holdings` | Demo broker `get_holdings()` |
| `GET /api/positions` | Demo broker `get_positions()` |
| `GET /api/orders` | Demo broker `get_orders()` |
| `GET /api/funds` | Demo broker `get_funds()` |
| `GET /api/quote/{symbol}` | yfinance |
| `POST /api/order` | Demo broker `place_order()` |
| `DELETE /api/order/{id}` | Demo broker `cancel_order()` |
| `GET /api/alerts` | Local alerts store (JSON file) |
| `POST /api/alerts` | Save to local alerts store |
| `GET /api/flows` | FII/DII scraper or mock |
| `GET /api/patterns` | yfinance OHLCV + TA analysis |
| `GET /api/scan` | Run scan on NIFTY 50 stocks |
| `GET /api/gex/{symbol}` | Options chain from yfinance |
| `GET /api/iv-smile/{symbol}` | Options chain from yfinance |
| `GET /api/risk-report` | Portfolio from demo broker + risk calcs |
| `GET /api/strategy` | Return 58-strategy library |
| `GET /api/delta-hedge` | Greeks from options chain |
| `GET /api/what-if` | Portfolio simulation (accepts params) |
| `GET /api/drift` | Portfolio drift from target allocation |
| `GET /api/memory` | Read from local memory JSON store |
| `GET /api/morning-brief` | Aggregate: NIFTY, FII, top movers, news |
| `POST /skills/analyze` | AI analysis pipeline (Step 6) |
| `GET /api/chart/{symbol}` | Return OHLCV JSON for charting |
| `GET /api/health` | `{"status": "ok", "broker": "demo", "market": "open/closed"}` |

Add CORS middleware to FastAPI so the React frontend can call it from `localhost:3000` or any Electron origin:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

---

### STEP 5 — SETTINGS PAGE WITH API KEY MANAGEMENT

In the frontend (React), add a **Settings page** accessible from the sidebar. This page must have:

#### Section 1: AI Provider
A dropdown to select active AI provider:
- `Gemini Flash` (gemini-2.0-flash-exp) ← set as default
- `Groq` (llama-3.3-70b-versatile or mixtral-8x7b)
- `OpenAI GPT-4o`
- `Claude (Anthropic)`
- `Ollama (Local)`

For each provider, show an input field for the API key. Save keys to `~/.orch-trading/settings.json` via a `POST /api/settings` endpoint. Keys must be stored securely using the OS keychain (`keyring` library).

#### Section 2: Broker
A dropdown:
- `Demo Mode (₹10,00,000 virtual funds)` ← default
- `Fyers (Data + Trading)`
- `Zerodha Kite`
- `Upstox`
- `Angel One`

For Demo Mode: show current virtual balance, a "Reset to ₹10L" button, and the current P&L.

For real brokers: show API key / secret fields + OAuth login button.

#### Section 3: Auto-Trading
Toggle switches:
- `Enable Auto-Trading` (OFF by default — must be explicitly turned ON)
- `Max position size` (default ₹50,000 per trade)
- `Max daily loss limit` (default ₹10,000 — pause trading if hit)
- `Risk per trade` (default 2%)
- `Trading mode`: Paper / Live

#### Section 4: Notifications
- Telegram Bot Token input
- Telegram Chat ID input
- Test button

Save all settings with a "Save Settings" button that calls `POST /api/settings`.

---

### STEP 6 — GEMINI FLASH AS THE AI BRAIN

In `agent/providers/gemini.py` (create if doesn't exist), implement:

```python
import google.generativeai as genai

class GeminiProvider:
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash-exp"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
    
    async def complete(self, prompt: str, system: str = None) -> str:
        ...
    
    async def analyze_stock(self, symbol: str, market_data: dict) -> dict:
        """
        Given symbol + OHLCV + fundamentals + options data,
        return structured analysis: verdict (BUY/SELL/HOLD), 
        confidence (0-100), entry, stop_loss, targets, rationale
        """
    
    async def decide_trade(self, portfolio: dict, market_data: dict, watchlist: list) -> dict:
        """
        Auto-trading decision: given current portfolio and market data,
        decide what to buy/sell. Return list of orders to place.
        Respects max position size and daily loss limits from settings.
        """
```

Also add a **Groq provider** in `agent/providers/groq_provider.py`:
```python
from openai import OpenAI  # Groq uses OpenAI-compatible API

class GroqProvider:
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
```

Groq is particularly useful for news analysis since it's fast and Llama models have recent training data.

---

### STEP 7 — AUTO-TRADING ENGINE

Create `engine/auto_trader.py`:

```python
class AutoTrader:
    """
    Runs in background. Every 5 minutes during market hours (9:15–15:30 IST Mon-Fri):
    1. Fetch current portfolio from demo broker
    2. Fetch quotes for all watchlist stocks + current holdings
    3. Calculate technical indicators (RSI, MACD, EMA) using `ta` library
    4. Send data to Gemini Flash with decide_trade() prompt
    5. Execute any BUY/SELL orders Gemini recommends
    6. Log all decisions to memory store
    7. Check daily loss limit — pause if exceeded
    """
    
    async def run_cycle(self):
        ...
    
    def start(self):
        # Start background asyncio task
        ...
    
    def stop(self):
        ...
```

Add a FastAPI endpoint `POST /api/auto-trader/start` and `POST /api/auto-trader/stop` and `GET /api/auto-trader/status`.

Show the auto-trader status in the sidebar (green dot = running, red = stopped).

---

### STEP 8 — CHARTS IN THE FRONTEND

Every page that shows a stock needs a price chart. Use **Recharts** (already in the React dependencies) to render OHLCV candlestick charts. 

For each chart:
1. Fetch OHLCV from `GET /api/chart/{symbol}?period=3mo&interval=1d`
2. Render as a candlestick or line chart with Recharts
3. Add a period selector: 1D / 1W / 1M / 3M / 1Y
4. Show volume bars at the bottom
5. Overlay SMA 20 and SMA 50 lines
6. When market is closed, show a "Market Closed — Last price as of [time]" banner instead of an error

---

### STEP 9 — FIX EACH SIDEBAR PAGE

For each of these pages in the React frontend, make sure it:
- Calls the correct FastAPI endpoint
- Shows a loading spinner while fetching
- Shows proper data when loaded
- Shows a friendly error message (not crash) if API fails

**Morning Brief:** Call `GET /api/morning-brief`. Show NIFTY price + % change, FII/DII net flow, top 3 gainers/losers from NIFTY 50, today's economic events.

**Holdings:** Call `GET /api/holdings`. Show table: Symbol | Qty | Avg Price | Current Price | P&L | P&L%. Show total portfolio value and overall P&L at top.

**Positions:** Call `GET /api/positions`. Show intraday positions with M2M P&L.

**Orders:** Call `GET /api/orders`. Show order history table with status badges (COMPLETE/PENDING/CANCELLED).

**Funds:** Call `GET /api/funds`. Show: Available Cash, Used Margin, Total Value, Today's P&L. Show a pie chart of allocation.

**Alerts:** Call `GET /api/alerts`. Show list of active price alerts. Allow user to add new alert (symbol, condition, price).

**FII/DII Flows:** Call `GET /api/flows`. Show FII buy/sell/net and DII buy/sell/net as a bar chart for last 10 trading days.

**Patterns:** Call `GET /api/patterns`. Show chart patterns detected (Head & Shoulders, Double Top, etc.) across NIFTY 50 stocks.

**Scan:** Call `GET /api/scan`. Show stocks matching criteria (RSI oversold, MACD crossover, etc.). Add filter dropdowns.

**GEX:** Call `GET /api/gex/NIFTY`. Show Gamma Exposure chart by strike. Show flip point.

**IV Smile:** Call `GET /api/iv-smile/NIFTY`. Show IV across strikes as a smile curve.

**Risk Report:** Call `GET /api/risk-report`. Show: VaR, portfolio beta, concentration risk, sector allocation.

**Strategy:** Call `GET /api/strategy`. Show 58 strategies in a searchable grid. Clicking one shows details and a "Apply to NIFTY" button.

**Delta Hedge:** Call `GET /api/delta-hedge`. Show net delta of current positions and suggest hedge trades.

**What-If:** Call `GET /api/what-if` with params. Show portfolio impact of hypothetical trades.

**Drift:** Call `GET /api/drift`. Show how current allocation drifted from target.

**Memory:** Call `GET /api/memory`. Show log of all past AI analyses with outcomes.

---

### STEP 10 — DEFAULT WATCHLIST & STARTUP STATE

Create `~/.orch-trading/config.json` with default values if it doesn't exist:

```json
{
  "watchlist": ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "NIFTY", "BANKNIFTY"],
  "ai_provider": "gemini",
  "broker": "demo",
  "auto_trading": false,
  "max_position_size": 50000,
  "daily_loss_limit": 10000,
  "risk_per_trade": 2.0,
  "capital": 1000000
}
```

On startup, the backend should:
1. Load config
2. Initialize demo broker with ₹10L if no portfolio file exists
3. Start FastAPI on port 8765
4. Load AI provider (if API key exists in keyring)
5. Log "Demo mode active — ₹10,00,000 virtual funds" to console

---

### STEP 11 — ENV FILE

Update `.env.example` and create a working `.env` with:

```env
# AI Providers (add at least one)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Broker (leave blank for demo mode)
FYERS_APP_ID=
FYERS_SECRET_KEY=
KITE_API_KEY=
KITE_API_SECRET=
UPSTOX_API_KEY=
UPSTOX_API_SECRET=

# Demo Mode
DEMO_MODE=true
DEMO_CAPITAL=1000000

# Trading
TOTAL_CAPITAL=1000000
DEFAULT_RISK_PCT=2
TRADING_MODE=PAPER

# Optional
NEWSAPI_KEY=
TELEGRAM_BOT_TOKEN=

# Server
API_PORT=8765
CORS_ORIGINS=*
```

If `DEMO_MODE=true` OR all broker keys are empty → automatically use demo broker.
If `GEMINI_API_KEY` is set → use Gemini Flash as default AI.
If `GROQ_API_KEY` is set → use Groq as fallback for news analysis.

---

### STEP 12 — RUN & VERIFY

After all changes, verify this sequence works:

```bash
# Terminal 1: Start backend
cd /path/to/orch-trading
python -m uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# Terminal 2: Check all endpoints
curl http://localhost:8765/api/health
curl http://localhost:8765/api/funds
curl http://localhost:8765/api/holdings
curl http://localhost:8765/api/quote/RELIANCE
curl http://localhost:8765/api/morning-brief

# Terminal 3: Start frontend
cd macos-app  # or frontend/
npm run dev
```

Every curl must return valid JSON with actual data. The frontend must show data on every page, not errors or loading spinners.

---

### FINAL CHECKLIST

Before finishing, verify:
- [ ] `pip install -e .` succeeds with zero errors
- [ ] `npm install` in frontend succeeds
- [ ] FastAPI starts on port 8765 without errors
- [ ] `/api/health` returns `{"status": "ok"}`
- [ ] `/api/funds` returns ₹10L demo funds
- [ ] `/api/holdings` returns empty list (no holdings yet, which is correct)
- [ ] `/api/quote/RELIANCE` returns current/last price from yfinance
- [ ] `/api/morning-brief` returns NIFTY data + some news
- [ ] Frontend builds and loads without console errors
- [ ] All 16 sidebar pages load without crashing
- [ ] Settings page is accessible and saves API keys
- [ ] Gemini Flash is wired as the AI brain for `analyze` command
- [ ] Groq provider is implemented and selectable in settings
- [ ] Auto-trader can be toggled on/off from settings
- [ ] Charts render on Holdings/Positions/Analysis pages
- [ ] "Market Closed" shows gracefully when NSE is closed (no crashes)
- [ ] Demo portfolio persists across restarts

---

## PRIORITY ORDER

Do these in order:
1. Fix all pip/npm installs first
2. Create demo broker
3. Create free market data module (yfinance)
4. Fix all FastAPI endpoints
5. Fix frontend pages one by one (start with Holdings, Funds, Orders — simplest ones)
6. Add Settings page
7. Wire Gemini Flash AI provider
8. Wire Groq provider
9. Add charts to each page
10. Test auto-trading engine

Do NOT skip to complex features (auto-trader, GEX, IV Smile) before the basics (Holdings, Funds, Orders) work.

---

*This is the orch-trading repo at https://github.com/arnavryie/orch-trading — clone it locally and make all changes on the main branch.*
