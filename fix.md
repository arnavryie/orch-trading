# ORCH-TRADING — PHASE 2 + 3: THE AI COUNCIL
## Build "The Desk" — 4 AIs that debate and vote on every trade
## For Antigravity — paste this entire file

**Repo:** https://github.com/arnavryie/orch-trading
**Prerequisite:** PART B bugs from the previous file are fixed and the app runs.
**This builds:** the multi-AI council backend (Phase 2) + the live Council Debate UI (Phase 3).

The result: type a symbol, and 4 specialist AIs (Scout, Fundamental, Technical, Risk) analyze it in parallel, you watch their verdicts stream in, and they reach a consensus with a suggested position size.

---

# PHASE 2 — THE COUNCIL BACKEND

## Step 1 — Add the 3 missing AI providers

You already have `gemini.py` and `groq_provider.py`. Add these three new files in `agent/providers/`.

### File: `agent/providers/grok.py`

```python
"""
agent/providers/grok.py
────────────────────────
Grok (xAI) provider — OpenAI-compatible API.
Role in the council: THE SCOUT — real-time news, X/Twitter sentiment, breaking events.
Grok has live web access which makes it best for "what's happening right now".
"""
from __future__ import annotations
import json, logging, os

log = logging.getLogger(__name__)


class GrokProvider:
    def __init__(self, api_key: str = None, model: str = "grok-2-latest"):
        self.api_key = api_key or os.environ.get("GROK_API_KEY", "")
        self.model = model
        self._client = None

    def _get_client(self):
        if not self._client:
            if not self.api_key:
                raise ValueError("GROK_API_KEY not set.")
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key, base_url="https://api.x.ai/v1")
        return self._client

    async def complete(self, prompt: str, system: str = "You are a helpful assistant.") -> str:
        try:
            client = self._get_client()
            resp = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.6,
                max_tokens=800,
            )
            return resp.choices[0].message.content
        except Exception as e:
            log.error("Grok complete() failed: %s", e)
            return f"[Grok Error] {e}"


_grok_instance: GrokProvider | None = None

def get_grok(api_key: str = None) -> GrokProvider:
    global _grok_instance
    if _grok_instance is None or api_key:
        _grok_instance = GrokProvider(api_key=api_key)
    return _grok_instance
```

### File: `agent/providers/openai_provider.py`

```python
"""
agent/providers/openai_provider.py
───────────────────────────────────
OpenAI GPT-4o provider.
Role in the council: THE FUNDAMENTAL ANALYST — valuation, earnings, balance sheet.
"""
from __future__ import annotations
import json, logging, os

log = logging.getLogger(__name__)


class OpenAIProvider:
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model
        self._client = None

    def _get_client(self):
        if not self._client:
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY not set.")
            from openai import OpenAI
            self._client = OpenAI(api_key=self.api_key)
        return self._client

    async def complete(self, prompt: str, system: str = "You are a helpful assistant.") -> str:
        try:
            client = self._get_client()
            resp = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
                max_tokens=800,
            )
            return resp.choices[0].message.content
        except Exception as e:
            log.error("OpenAI complete() failed: %s", e)
            return f"[OpenAI Error] {e}"


_openai_instance: OpenAIProvider | None = None

def get_openai(api_key: str = None) -> OpenAIProvider:
    global _openai_instance
    if _openai_instance is None or api_key:
        _openai_instance = OpenAIProvider(api_key=api_key)
    return _openai_instance
```

### File: `agent/providers/claude_provider.py`

```python
"""
agent/providers/claude_provider.py
───────────────────────────────────
Anthropic Claude provider.
Role in the council: THE RISK MANAGER + EXECUTION — position sizing, stop-loss,
final go/no-go. Claude is careful and conservative, ideal for the last word.
"""
from __future__ import annotations
import logging, os

log = logging.getLogger(__name__)


class ClaudeProvider:
    def __init__(self, api_key: str = None, model: str = "claude-sonnet-4-20250514"):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        self.model = model
        self._client = None

    def _get_client(self):
        if not self._client:
            if not self.api_key:
                raise ValueError("ANTHROPIC_API_KEY not set.")
            import anthropic
            self._client = anthropic.Anthropic(api_key=self.api_key)
        return self._client

    async def complete(self, prompt: str, system: str = "You are a helpful assistant.") -> str:
        try:
            client = self._get_client()
            resp = client.messages.create(
                model=self.model,
                max_tokens=800,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            # Concatenate all text blocks
            return "".join(block.text for block in resp.content if hasattr(block, "text"))
        except Exception as e:
            log.error("Claude complete() failed: %s", e)
            return f"[Claude Error] {e}"


_claude_instance: ClaudeProvider | None = None

def get_claude(api_key: str = None) -> ClaudeProvider:
    global _claude_instance
    if _claude_instance is None or api_key:
        _claude_instance = ClaudeProvider(api_key=api_key)
    return _claude_instance
```

---

## Step 2 — Build the Council module

### File: `agent/council.py`

```python
"""
agent/council.py
─────────────────
THE AI TRADING DESK.
Four specialist AIs analyze a stock in parallel, then a consensus is computed.

Roles:
  🔍 Scout       (Grok)   — news, sentiment, breaking events
  📊 Fundamental (GPT-4o) — valuation, earnings, financial health
  ⚡ Technical    (Gemini) — chart patterns, RSI/MACD/EMA, levels
  🛡️ Risk        (Claude) — position sizing, stop-loss, final go/no-go
"""
from __future__ import annotations
import asyncio
import json
import logging
import re
from pathlib import Path

log = logging.getLogger(__name__)

SETTINGS_FILE = Path.home() / ".orch-trading" / "settings.json"


def _load_keys() -> dict:
    """Read API keys from settings.json."""
    if SETTINGS_FILE.exists():
        try:
            s = json.loads(SETTINGS_FILE.read_text())
            return {
                "grok":   s.get("grok_api_key", "")    or "",
                "openai": s.get("openai_api_key", "")  or "",
                "gemini": s.get("gemini_api_key", "")  or "",
                "claude": s.get("claude_api_key", "")  or "",
            }
        except Exception:
            pass
    return {"grok": "", "openai": "", "gemini": "", "claude": ""}


def _has_key(key: str) -> bool:
    return bool(key) and "****" not in key


def _parse_verdict(text: str) -> dict:
    """Extract {verdict, confidence, reasoning} from an AI's JSON-ish response."""
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            obj = json.loads(text[start:end])
            v = str(obj.get("verdict", "HOLD")).upper()
            if v not in ("BUY", "SELL", "HOLD"):
                v = "HOLD"
            return {
                "verdict": v,
                "confidence": int(obj.get("confidence", 50)),
                "reasoning": str(obj.get("reasoning", "")).strip()[:400],
            }
    except Exception:
        pass
    # Fallback: scrape keywords from plain text
    up = text.upper()
    verdict = "BUY" if "BUY" in up else "SELL" if "SELL" in up else "HOLD"
    return {"verdict": verdict, "confidence": 50, "reasoning": text.strip()[:400] or "No response"}


# ── Role system prompts ────────────────────────────────────────────────────

_SCOUT_SYS = """You are THE SCOUT on an Indian stock trading desk.
Your job: assess real-time news, social sentiment, and breaking events for a stock.
You care about: recent announcements, sector buzz, retail chatter, any catalyst.
Be decisive. Output ONLY this JSON:
{"verdict":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"1-2 sentences on news/sentiment"}"""

_FUNDAMENTAL_SYS = """You are THE FUNDAMENTAL ANALYST on an Indian stock trading desk.
Your job: judge valuation and financial health.
You care about: P/E vs sector, earnings trend, ROE/ROCE, debt, growth quality.
Be decisive. Output ONLY this JSON:
{"verdict":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"1-2 sentences on valuation/fundamentals"}"""

_TECHNICAL_SYS = """You are THE TECHNICAL TRADER on an Indian stock trading desk.
Your job: read the chart.
You care about: trend, RSI, MACD, moving averages, support/resistance, volume.
Be decisive. Output ONLY this JSON:
{"verdict":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"1-2 sentences on the technical setup"}"""

_RISK_SYS = """You are THE RISK MANAGER on an Indian stock trading desk — you have the FINAL word.
You have just heard the Scout, Fundamental, and Technical analysts' verdicts.
Your job: weigh their views, judge the risk, and make the final call.
You care about: agreement between analysts, volatility, downside, position sizing.
Be conservative when analysts disagree. Output ONLY this JSON:
{"verdict":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"1-2 sentences — your final decision and why"}"""


def _build_context(symbol: str, market_data: dict) -> str:
    return f"""Stock: {symbol} (NSE)
Price: ₹{market_data.get('price', 0):,.2f}
Change today: {market_data.get('change_pct', 0):+.2f}%
Day High: ₹{market_data.get('high', 0):,.2f}  Day Low: ₹{market_data.get('low', 0):,.2f}
Prev Close: ₹{market_data.get('prev_close', 0):,.2f}
Market: {'OPEN' if market_data.get('market_open') else 'CLOSED'}"""


# ── Individual analyst calls ────────────────────────────────────────────────

async def _ask(provider, system: str, context: str, role: str, ai_name: str, icon: str) -> dict:
    """Run one analyst. Returns a vote dict (always returns, never raises)."""
    try:
        text = await provider.complete(
            f"{context}\n\nGive your verdict as the {role}.",
            system=system,
        )
        v = _parse_verdict(text)
    except Exception as e:
        log.error("%s failed: %s", role, e)
        v = {"verdict": "HOLD", "confidence": 0, "reasoning": f"Unavailable: {e}"}
    return {"role": role, "ai": ai_name, "icon": icon, **v}


def _abstain(role: str, ai_name: str, icon: str) -> dict:
    return {"role": role, "ai": ai_name, "icon": icon,
            "verdict": "ABSTAIN", "confidence": 0,
            "reasoning": f"No API key for {ai_name} — add it in Settings to enable this seat."}


# ── The main entry point ────────────────────────────────────────────────────

async def run_council(symbol: str) -> dict:
    """Run the full council on a symbol and return votes + consensus."""
    import sys
    from pathlib import Path as _P
    sys.path.insert(0, str(_P(__file__).parent.parent))
    from market.free_data import get_quote

    symbol = symbol.upper().strip()
    market = get_quote(symbol)
    context = _build_context(symbol, market)
    keys = _load_keys()

    # Build the 3 parallel analysts (Scout, Fundamental, Technical)
    tasks = []

    if _has_key(keys["grok"]):
        from agent.providers.grok import get_grok
        tasks.append(_ask(get_grok(keys["grok"]), _SCOUT_SYS, context, "Scout", "Grok", "🔍"))
    else:
        async def _s(): return _abstain("Scout", "Grok", "🔍")
        tasks.append(_s())

    if _has_key(keys["openai"]):
        from agent.providers.openai_provider import get_openai
        tasks.append(_ask(get_openai(keys["openai"]), _FUNDAMENTAL_SYS, context, "Fundamental", "GPT-4o", "📊"))
    else:
        async def _f(): return _abstain("Fundamental", "GPT-4o", "📊")
        tasks.append(_f())

    if _has_key(keys["gemini"]):
        from agent.providers.gemini import GeminiProvider
        gem = GeminiProvider(api_key=keys["gemini"])
        tasks.append(_ask(gem, _TECHNICAL_SYS, context, "Technical", "Gemini", "⚡"))
    else:
        async def _t(): return _abstain("Technical", "Gemini", "⚡")
        tasks.append(_t())

    # Run the 3 analysts in parallel
    analyst_votes = await asyncio.gather(*tasks)

    # Risk Manager (Claude) gets the analysts' votes and makes the final call
    summary = "\n".join(
        f"- {v['ai']} ({v['role']}): {v['verdict']} ({v['confidence']}%) — {v['reasoning']}"
        for v in analyst_votes if v["verdict"] != "ABSTAIN"
    ) or "No analyst input available."

    if _has_key(keys["claude"]):
        from agent.providers.claude_provider import get_claude
        risk_context = f"{context}\n\nAnalyst verdicts:\n{summary}"
        risk_vote = await _ask(get_claude(keys["claude"]), _RISK_SYS, risk_context, "Risk", "Claude", "🛡️")
    else:
        risk_vote = _abstain("Risk", "Claude", "🛡️")

    all_votes = list(analyst_votes) + [risk_vote]

    # ── Compute consensus ──
    active = [v for v in all_votes if v["verdict"] != "ABSTAIN"]
    buy  = sum(1 for v in active if v["verdict"] == "BUY")
    sell = sum(1 for v in active if v["verdict"] == "SELL")
    hold = sum(1 for v in active if v["verdict"] == "HOLD")
    total = len(active)

    if total == 0:
        consensus = {"action": "NO DATA", "confidence": 0, "agreement": 0,
                     "summary": "No AIs configured. Add API keys in Settings."}
        suggested_size = 0
    else:
        # The Risk Manager's vote carries extra weight if present
        if risk_vote["verdict"] != "ABSTAIN":
            action = risk_vote["verdict"]
        else:
            counts = {"BUY": buy, "SELL": sell, "HOLD": hold}
            action = max(counts, key=counts.get)

        agree_count = sum(1 for v in active if v["verdict"] == action)
        agreement = round(agree_count / total * 100)
        avg_conf = round(sum(v["confidence"] for v in active if v["verdict"] == action) / max(agree_count, 1))

        consensus = {
            "action": action,
            "confidence": avg_conf,
            "agreement": agreement,
            "votes": {"buy": buy, "sell": sell, "hold": hold, "total": total},
            "summary": f"{agree_count} of {total} agree on {action} · {avg_conf}% confidence",
        }

        # Confidence-weighted position sizing (demo: % of a ₹50k max ticket)
        if action == "BUY":
            size_factor = (agreement / 100) * (avg_conf / 100)
            suggested_size = round(50000 * size_factor / 1000) * 1000  # round to nearest 1000
        else:
            suggested_size = 0

    return {
        "symbol": symbol,
        "price": market.get("price", 0),
        "market_open": market.get("market_open", False),
        "votes": all_votes,
        "consensus": consensus,
        "suggested_size": suggested_size,
    }
```

---

## Step 3 — Add the `/api/council` endpoint

In `web/api.py`, add this near the other endpoints:

```python
# ─── THE AI COUNCIL ───────────────────────────────────────────────────────────
class CouncilRequest(BaseModel):
    symbol: str

@app.post("/api/council")
async def council(req: CouncilRequest):
    """Run the multi-AI council on a symbol. Returns each AI's vote + consensus."""
    from agent.council import run_council
    try:
        return await run_council(req.symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Also make sure `web/api.py` settings accept the new keys. In the `SettingsUpdate` model add:
```python
    grok_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None
```
In `load_settings()` default dict add:
```python
            "grok_api_key": "",
            "claude_api_key": "",
```
In the `get_settings_endpoint()` masking loop, add `"grok_api_key"` and `"claude_api_key"` to the list of keys to mask, and in `update_settings()` add them to the "don't overwrite masked" loop.

---

## Step 4 — Verify the backend

```bash
cd orch-trading && source .venv/bin/activate
pip install anthropic openai google-generativeai
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload

# In another terminal (add at least one AI key in Settings first, or via the file):
curl -s -X POST http://localhost:8765/api/council \
  -H "Content-Type: application/json" \
  -d '{"symbol":"RELIANCE"}' | python3 -m json.tool
```
Expected: a `votes` array (4 entries, some may ABSTAIN if keys missing) and a `consensus` object. With zero keys, all abstain and consensus says "Add API keys".

---

# PHASE 3 — THE COUNCIL DEBATE UI (the signature screen)

This is the screen that makes your app unforgettable. Build it beautifully.

### File: `frontend/src/components/CouncilView.tsx`

```tsx
// frontend/src/components/CouncilView.tsx
// THE AI TRADING DESK — watch 4 specialist AIs debate and vote on a trade.
import { useState } from 'react';

const API = ''; // Vite proxy

interface Vote {
  role: string;
  ai: string;
  icon: string;
  verdict: string;
  confidence: number;
  reasoning: string;
}
interface CouncilResult {
  symbol: string;
  price: number;
  market_open: boolean;
  votes: Vote[];
  consensus: {
    action: string;
    confidence: number;
    agreement: number;
    summary: string;
    votes?: { buy: number; sell: number; hold: number; total: number };
  };
  suggested_size: number;
}

const verdictColor = (v: string) =>
  v === 'BUY' ? '#22c55e' : v === 'SELL' ? '#ef4444' : v === 'HOLD' ? '#f59e0b' : '#666';

const verdictBg = (v: string) =>
  v === 'BUY' ? 'rgba(34,197,94,0.1)' : v === 'SELL' ? 'rgba(239,68,68,0.1)'
  : v === 'HOLD' ? 'rgba(245,158,11,0.1)' : 'rgba(102,102,102,0.1)';

const ROLE_BLURB: Record<string, string> = {
  Scout: 'News & social sentiment',
  Fundamental: 'Valuation & earnings',
  Technical: 'Chart patterns & indicators',
  Risk: 'Position sizing — final call',
};

export default function CouncilView() {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [revealed, setRevealed] = useState(0); // how many votes shown (for stagger animation)
  const [error, setError] = useState('');

  const convene = async () => {
    setLoading(true); setError(''); setResult(null); setRevealed(0);
    try {
      const res = await fetch(`${API}/api/council`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });
      if (!res.ok) throw new Error('Council failed');
      const data: CouncilResult = await res.json();
      setResult(data);
      // Stagger-reveal each vote like a real meeting
      data.votes.forEach((_, i) => setTimeout(() => setRevealed(i + 1), 600 * (i + 1)));
      setTimeout(() => setRevealed(data.votes.length + 1), 600 * (data.votes.length + 1));
    } catch (e: any) {
      setError(e.message || 'Failed to convene council');
    } finally {
      setLoading(false);
    }
  };

  const placeTrade = async () => {
    if (!result || result.suggested_size <= 0) return;
    const qty = Math.max(1, Math.floor(result.suggested_size / result.price));
    await fetch(`${API}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: result.symbol, qty, order_type: 'BUY' }),
    });
    alert(`Demo order placed: BUY ${qty} ${result.symbol}`);
  };

  const allRevealed = result && revealed > result.votes.length;

  return (
    <div className="flex-1 overflow-y-auto bg-black custom-scrollbar" style={{ padding: '24px', paddingBottom: '80px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight">The AI Trading Desk</h1>
          <p className="text-[#888] text-sm mt-1">Four specialist AIs debate the trade. You see every vote.</p>
        </div>

        {/* Symbol input + convene */}
        <div className="flex gap-2 mb-8">
          <div className="flex items-center gap-2 bg-[#161616] rounded-lg px-3 py-2 flex-1 border border-[#2a2a2a]">
            <span className="text-[#555]">🔍</span>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') convene(); }}
              placeholder="RELIANCE, TCS, INFY…"
              className="bg-transparent outline-none text-white flex-1 text-sm"
            />
          </div>
          <button
            onClick={convene}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-primary text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Convening…' : 'Convene Council'}
          </button>
        </div>

        {error && <div className="text-[#ef4444] text-sm mb-4">{error}</div>}

        {/* The 4 council seats */}
        {result && (
          <div className="space-y-3 mb-8">
            {result.votes.map((v, i) => {
              const show = revealed > i;
              return (
                <div
                  key={v.role}
                  style={{
                    opacity: show ? 1 : 0.15,
                    transform: show ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'all 0.4s ease',
                    background: '#0f0f0f',
                    borderLeft: `3px solid ${verdictColor(v.verdict)}`,
                  }}
                  className="rounded-lg p-4 border border-[#1e1e1e]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{v.icon}</span>
                      <div>
                        <div className="text-white font-bold text-sm">
                          {v.role} <span className="text-[#666] font-normal">· {v.ai}</span>
                        </div>
                        <div className="text-[#666] text-[11px]">{ROLE_BLURB[v.role] || ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        style={{ color: verdictColor(v.verdict), background: verdictBg(v.verdict) }}
                        className="px-3 py-1 rounded-full text-xs font-bold"
                      >
                        {v.verdict}
                      </span>
                      {v.verdict !== 'ABSTAIN' && (
                        <div className="text-[#888] text-[11px] mt-1">{v.confidence}% confident</div>
                      )}
                    </div>
                  </div>
                  {show && (
                    <p className="text-[#bbb] text-[13px] mt-3 leading-relaxed">{v.reasoning}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Consensus verdict */}
        {result && allRevealed && (
          <div
            style={{
              background: `linear-gradient(135deg, ${verdictBg(result.consensus.action)}, #0a0a0a)`,
              border: `1px solid ${verdictColor(result.consensus.action)}33`,
              animation: 'fadeIn 0.6s ease',
            }}
            className="rounded-xl p-6"
          >
            <div className="text-[#888] text-xs uppercase tracking-wider mb-2">Council Verdict</div>
            <div className="flex items-baseline gap-4 mb-4">
              <span style={{ color: verdictColor(result.consensus.action) }} className="text-4xl font-black">
                {result.consensus.action}
              </span>
              <span className="text-[#888] text-sm">{result.consensus.summary}</span>
            </div>

            {/* Agreement + confidence bars */}
            {result.consensus.votes && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[#666] text-[11px] mb-1">Agreement</div>
                  <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                    <div style={{ width: `${result.consensus.agreement}%`, background: verdictColor(result.consensus.action) }} className="h-full rounded-full transition-all" />
                  </div>
                  <div className="text-white text-xs mt-1">{result.consensus.agreement}%</div>
                </div>
                <div>
                  <div className="text-[#666] text-[11px] mb-1">Confidence</div>
                  <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                    <div style={{ width: `${result.consensus.confidence}%`, background: verdictColor(result.consensus.action) }} className="h-full rounded-full transition-all" />
                  </div>
                  <div className="text-white text-xs mt-1">{result.consensus.confidence}%</div>
                </div>
              </div>
            )}

            {/* Suggested action */}
            {result.consensus.action === 'BUY' && result.suggested_size > 0 && (
              <div className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-4 mt-2 border border-[#1e1e1e]">
                <div>
                  <div className="text-[#888] text-[11px]">Confidence-weighted size</div>
                  <div className="text-white font-bold">
                    ₹{result.suggested_size.toLocaleString('en-IN')}
                    <span className="text-[#666] font-normal text-xs ml-2">
                      ≈ {Math.floor(result.suggested_size / result.price)} shares @ ₹{result.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={placeTrade}
                  className="px-5 py-2 rounded-lg bg-[#22c55e] text-black font-bold text-sm hover:opacity-90 transition"
                >
                  Place Demo Trade
                </button>
              </div>
            )}

            <div className="text-[#555] text-[11px] mt-4">
              Demo mode · virtual money · not financial advice
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-16 text-[#555]">
            <div className="text-5xl mb-4">🏛️</div>
            <div className="text-sm">Enter a symbol and convene the council.</div>
            <div className="text-[11px] mt-2">Tip: add Grok, GPT, Gemini & Claude keys in Settings to fill all 4 seats.</div>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }`}</style>
    </div>
  );
}
```

---

## Step 5 — Add Council to the app

### Add the API method
In `frontend/src/api/client.ts`, add to the `api` object:
```ts
  council: {
    convene: (symbol: string) => post('/api/council', { symbol }),
  },
```

### Add to navigation
In `frontend/src/App.tsx`:

1. Import it at top:
```tsx
import CouncilView from './components/CouncilView';
```

2. Add a case in `renderContent()`:
```tsx
      case 'Council':      return <CouncilView />;
```

3. Add it to the secondary sidebar tools list (the array with `['Morning Brief', '☀️']` etc.). Add as the FIRST item so it's prominent:
```tsx
                ['Council', '🏛️'],
```

Optionally, make Council a primary tab too — in `PRIMARY_TABS` and the `TopNav` `NAV_TABS`, you could add `'Council'` so it's always one click away. (Recommended — it's your flagship feature.)

---

## Step 6 — Verify the full flow

1. Start backend + frontend.
2. Go to **Settings**, add at least one AI key (Gemini is cheapest to test with). Ideally add all four (Grok, GPT, Gemini, Claude) to see all seats fill.
3. Go to **Council**, type `RELIANCE`, click **Convene Council**.
4. Watch each AI's verdict stagger-reveal, then the consensus verdict appears with agreement/confidence bars.
5. If consensus is BUY, click **Place Demo Trade** → check Holdings updates.

**Checklist:**
- ✅ `/api/council` returns votes + consensus
- ✅ Missing keys → that seat shows "ABSTAIN" (no crash)
- ✅ Each vote reveals with a stagger animation
- ✅ Consensus shows action, agreement %, confidence %
- ✅ BUY consensus shows suggested size + working Place Demo Trade button
- ✅ With zero keys, clean empty/abstain state (no errors)

---

## WHAT'S NEXT (Phase 4 preview)

Once the council works and looks good, the next phase is the **Consensus Engine for auto-trading**:
- A background loop that runs the council on your watchlist every N minutes
- Only auto-executes (demo) when agreement ≥ your threshold AND confidence ≥ your threshold
- Logs every council decision to Memory so you build the AI track record (Phase 5)

But get Phase 2+3 fully working and looking sharp first — the Council Debate screen is the heart of the whole product.

---

*Repo: https://github.com/arnavryie/orch-trading*
*Build order: Phase 2 backend → verify with curl → Phase 3 UI → verify the full flow.*