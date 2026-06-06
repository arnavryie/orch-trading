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

# Personality profiles — retune the desk's behaviour
_PERSONALITY = {
    "conservative": {
        "clause": "Be CONSERVATIVE. Only recommend BUY/SELL on strong, clear signals. When in doubt, prefer HOLD. Prioritise capital protection over opportunity.",
        "size_mult": 0.5,
    },
    "balanced": {
        "clause": "Be BALANCED. Weigh opportunity against risk evenly. Recommend action on reasonable conviction.",
        "size_mult": 1.0,
    },
    "aggressive": {
        "clause": "Be AGGRESSIVE. Act on emerging opportunities even with moderate conviction. Favour decisive BUY/SELL over HOLD when there is a credible edge.",
        "size_mult": 1.6,
    },
}

def _personality() -> dict:
    keys = _load_keys()  # also loads the full settings file via SETTINGS_FILE
    try:
        import json as _json
        s = _json.loads(SETTINGS_FILE.read_text()) if SETTINGS_FILE.exists() else {}
    except Exception:
        s = {}
    name = s.get("risk_personality", "balanced")
    return {"name": name, **_PERSONALITY.get(name, _PERSONALITY["balanced"])}


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

_DEVIL_SYS = """You are THE DEVIL'S ADVOCATE on a trading desk.
The council has reached a verdict. Your ONLY job is to argue the STRONGEST possible
case AGAINST that verdict — the risks, the bear/bull counter-case, what could go wrong.
Be specific and sharp. This is a deliberate check against groupthink.
Output ONLY this JSON:
{"counter_case":"2-3 punchy sentences arguing against the verdict","biggest_risk":"the single biggest risk in one line"}"""

async def _devils_advocate(symbol: str, context: str, action: str) -> dict:
    """Run the contrarian. Uses whichever provider key is available."""
    keys = _load_keys()
    prompt = f"{context}\n\nThe council's verdict is: {action}. Argue against it."

    provider = None
    try:
        if _has_key(keys["claude"]):
            from agent.providers.claude_provider import get_claude
            provider = get_claude(keys["claude"])
        elif _has_key(keys["openai"]):
            from agent.providers.openai_provider import get_openai
            provider = get_openai(keys["openai"])
        elif _has_key(keys["gemini"]):
            from agent.providers.gemini import GeminiProvider
            provider = GeminiProvider(api_key=keys["gemini"])
        elif _has_key(keys["grok"]):
            from agent.providers.grok import get_grok
            provider = get_grok(keys["grok"])
    except Exception:
        provider = None

    if provider is None:
        return {}

    try:
        text = await provider.complete(prompt, system=_DEVIL_SYS)
        start, end = text.find("{"), text.rfind("}") + 1
        if start != -1 and end > start:
            import json as _json
            obj = _json.loads(text[start:end])
            return {
                "against_action": action,
                "counter_case": str(obj.get("counter_case", "")).strip()[:400],
                "biggest_risk": str(obj.get("biggest_risk", "")).strip()[:200],
            }
    except Exception:
        pass
    return {}

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
    
    persona = _personality()
    context = context + f"\n\nDESK STANCE: {persona['clause']}"

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
        # Phase 5: weight each AI's vote by its historical accuracy × its confidence
        try:
            from engine.track_record import get_ai_weights
            weights = get_ai_weights()
        except Exception:
            weights = {}

        tally = {"BUY": 0.0, "SELL": 0.0, "HOLD": 0.0}
        for v in active:
            w = weights.get(v["ai"], 0.5)
            tally[v["verdict"]] += w * (v["confidence"] / 100)

        action = max(tally, key=tally.get) if any(tally.values()) else "HOLD"
        agree_count = sum(1 for v in active if v["verdict"] == action)
        agreement = round(agree_count / total * 100)
        avg_conf = round(sum(v["confidence"] for v in active if v["verdict"] == action) / max(agree_count, 1))

        consensus = {
            "action": action,
            "confidence": avg_conf,
            "agreement": agreement,
            "votes": {"buy": buy, "sell": sell, "hold": hold, "total": total},
            "weighted": bool(weights),
            "summary": f"{agree_count} of {total} agree on {action} · {avg_conf}% confidence" +
                       (" · accuracy-weighted" if weights else ""),
        }

        if action == "BUY":
            size_factor = (agreement / 100) * (avg_conf / 100) * persona["size_mult"]
            suggested_size = round(50000 * size_factor / 1000) * 1000
        else:
            suggested_size = 0

    # Devil's Advocate — always show the counter-case (if enabled)
    devil = {}
    try:
        import json as _json
        s = _json.loads(SETTINGS_FILE.read_text()) if SETTINGS_FILE.exists() else {}
        if s.get("devils_advocate", True) and total > 0 and consensus.get("action") in ("BUY", "SELL"):
            devil = await _devils_advocate(symbol, context, consensus["action"])
    except Exception:
        devil = {}

    return {
        "symbol": symbol,
        "price": market.get("price", 0),
        "market_open": market.get("market_open", False),
        "personality": persona["name"],
        "votes": all_votes,
        "consensus": consensus,
        "suggested_size": suggested_size,
        "devils_advocate": devil,
    }
