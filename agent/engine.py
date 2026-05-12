"""
agent/engine.py
───────────────
Agentic Chat Engine — Gemini 2.0 Flash with Function Calling.

The ChatEngine processes natural language commands from the UI chat box.
It uses Gemini Function Calling to dispatch real tools (place_order, analyze,
check_funds, set_alert, navigate) and returns a cinematic confirmation.

Groq (Llama 3) is used as optional speed-layer for news sentiment queries.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SETTINGS_FILE = Path.home() / ".orch-trading" / "settings.json"
SERVICE_NAME = "india-trade-cli"

# ── Key resolution ────────────────────────────────────────────────


def _get_key(name: str) -> str:
    """Fetch key from keyring → settings.json → env → ''."""
    # 1. keyring
    try:
        import keyring
        val = keyring.get_password(SERVICE_NAME, name)
        if val:
            return val
    except Exception:
        pass
    # 2. settings.json
    try:
        if SETTINGS_FILE.exists():
            data = json.loads(SETTINGS_FILE.read_text())
            if data.get(name):
                return data[name]
    except Exception:
        pass
    # 3. env
    return os.environ.get(name, "")


# ── Tool implementations ──────────────────────────────────────────


def _tool_place_order(symbol: str, qty: int, side: str) -> dict:
    """Execute a demo order via DemoBroker."""
    from brokers.demo import get_demo_broker
    from brokers.base import OrderRequest
    from market.free_data import is_market_open

    broker = get_demo_broker()
    funds = broker.get_funds()

    # Validate capital
    from market.free_data import get_quote
    try:
        ltp = get_quote(symbol.upper())["ltp"]
    except Exception:
        ltp = 100.0

    total_cost = ltp * abs(qty)
    if side.upper() == "BUY" and total_cost > funds.available_cash:
        return {
            "status": "REJECTED",
            "reason": f"Insufficient funds. Need ₹{total_cost:,.0f}, have ₹{funds.available_cash:,.0f}",
            "symbol": symbol,
        }

    req = OrderRequest(
        symbol=symbol.upper(),
        exchange="NSE",
        transaction_type=side.upper(),
        quantity=abs(qty),
        order_type="MARKET",
        product="CNC",
        tag="chat",
    )
    resp = broker.place_order(req)

    market_msg = "" if is_market_open() else " [Market closed — order queued for next open]"
    return {
        "status": resp.status,
        "order_id": resp.order_id,
        "symbol": symbol.upper(),
        "qty": qty,
        "side": side.upper(),
        "price": resp.average_price,
        "note": market_msg.strip() or None,
    }


def _tool_analyze_market(symbol: str) -> dict:
    """Technical analysis snapshot for a symbol."""
    try:
        from analysis.technical import analyse
        from dataclasses import asdict
        result = analyse(symbol.upper())
        return asdict(result)
    except Exception as e:
        from market.free_data import get_quote
        q = get_quote(symbol.upper())
        return {
            "symbol": symbol.upper(),
            "ltp": q["ltp"],
            "change_pct": q["change_pct"],
            "error": str(e),
        }


def _tool_check_funds() -> dict:
    """Return current demo portfolio balance."""
    from brokers.demo import get_demo_broker
    broker = get_demo_broker()
    funds = broker.get_funds()
    holdings = broker.get_holdings()
    total_pnl = sum(h.pnl for h in holdings)
    return {
        "available_cash": funds.available_cash,
        "used_margin": funds.used_margin,
        "total_balance": funds.total_balance,
        "open_positions": len(holdings),
        "total_pnl": round(total_pnl, 2),
        "currency": "INR",
    }


def _tool_set_alert(symbol: str, price: float, condition: str = "above") -> dict:
    """Add a price alert to the local store."""
    try:
        from engine.alerts import alert_manager
        cond = "ABOVE" if condition.lower() in ("above", "crosses", ">") else "BELOW"
        alert = alert_manager.add_price_alert(symbol.upper(), cond, price)
        return {"status": "created", "alert": alert.describe()}
    except Exception as e:
        # Fallback: write directly to demo portfolio alerts
        demo_dir = Path.home() / ".orch-trading"
        demo_dir.mkdir(parents=True, exist_ok=True)
        alerts_file = demo_dir / "alerts.json"
        alerts = json.loads(alerts_file.read_text()) if alerts_file.exists() else []
        import uuid
        alerts.append({
            "id": str(uuid.uuid4())[:8],
            "symbol": symbol.upper(),
            "condition": condition,
            "price": price,
        })
        alerts_file.write_text(json.dumps(alerts, indent=2))
        return {"status": "created", "symbol": symbol.upper(), "price": price, "condition": condition}


def _tool_ui_action(route: str) -> dict:
    """Signal a frontend navigation action."""
    ROUTE_MAP = {
        "risk": "Risk Report",
        "risk report": "Risk Report",
        "holdings": "Holdings",
        "orders": "Orders",
        "funds": "Funds",
        "analysis": "Analysis",
        "dashboard": "Analysis",
        "alerts": "Alerts",
        "settings": "Settings",
        "morning brief": "Morning Brief",
        "morning": "Morning Brief",
        "scan": "Scan",
        "gex": "GEX",
        "iv smile": "IV Smile",
        "strategy": "Strategy",
        "drift": "Drift",
        "memory": "Memory",
        "what-if": "What-If",
        "whatif": "What-If",
        "delta hedge": "Delta Hedge",
        "positions": "Positions",
        "patterns": "Patterns",
        "fii": "FII/DII Flows",
        "dii": "FII/DII Flows",
    }
    normalized = route.lower().strip()
    page = ROUTE_MAP.get(normalized, route)
    return {"redirect": page, "status": "navigating"}


# ── Gemini Tool Schema ────────────────────────────────────────────

GEMINI_TOOLS = [
    {
        "name": "place_order",
        "description": (
            "Place a buy or sell order on the demo portfolio. "
            "Use this when the user says 'buy', 'sell', 'purchase', 'short' any stock. "
            "Always confirm quantity and symbol before calling."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "NSE stock symbol e.g. RELIANCE, INFY, TCS"},
                "qty": {"type": "integer", "description": "Number of shares"},
                "side": {"type": "string", "enum": ["BUY", "SELL"], "description": "Transaction side"},
            },
            "required": ["symbol", "qty", "side"],
        },
    },
    {
        "name": "analyze_market",
        "description": (
            "Get technical analysis (RSI, MACD, trend, verdict) for a stock or index. "
            "Use when user asks to 'analyze', 'check', 'assess', or 'look at' a symbol."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "NSE symbol e.g. NIFTY, RELIANCE"},
            },
            "required": ["symbol"],
        },
    },
    {
        "name": "check_funds",
        "description": "Check the current portfolio balance, available cash, used margin, and P&L.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "set_alert",
        "description": (
            "Set a price alert for a symbol. "
            "Use when user says 'alert me', 'notify me', 'set alert', 'watch' a price level."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string"},
                "price": {"type": "number", "description": "Price trigger level"},
                "condition": {"type": "string", "enum": ["above", "below"], "description": "Trigger condition"},
            },
            "required": ["symbol", "price"],
        },
    },
    {
        "name": "ui_action",
        "description": (
            "Navigate the UI to a specific page. "
            "Use when user says 'take me to', 'go to', 'show me', 'open' a page."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "route": {"type": "string", "description": "Page name: holdings, orders, funds, risk, alerts, scan, etc."},
            },
            "required": ["route"],
        },
    },
]

TOOL_EXECUTORS = {
    "place_order": _tool_place_order,
    "analyze_market": _tool_analyze_market,
    "check_funds": _tool_check_funds,
    "set_alert": _tool_set_alert,
    "ui_action": _tool_ui_action,
}

SYSTEM_PROMPT = """You are ARIA — the Autonomous Reasoning and Intelligence Agent for Orch-Trading.
You are a precision market intelligence engine embedded in a real-time trading terminal.

PERSONALITY: Sharp, technical, cinematic. No fluff. Every response feels like a Bloomberg terminal crossed with a sci-fi command deck. Use Indian market context (NSE/BSE, ₹ currency, IST timezone).

RULES:
- When a user says "buy X shares of Y", ALWAYS call place_order immediately.
- When market is closed, still execute the order and note it's queued for next open.
- Keep responses SHORT. 2-4 lines max unless giving a full analysis.
- Use ₹ symbol for prices, not "Rs" or "INR".
- Format numbers in Indian notation (1,00,000 not 100,000).
- Never say "I cannot" — you can always do something useful.
- After placing an order, confirm with exact symbol, quantity, price, and order ID.
- After navigation requests, confirm where you're routing the user.
"""


# ── ChatEngine class ──────────────────────────────────────────────


class ChatEngine:
    """Processes chat messages using Gemini Function Calling."""

    def __init__(self):
        self._client = None
        self._groq_client = None

    def _get_gemini(self):
        if self._client:
            return self._client
        api_key = _get_key("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured. Go to Settings → AI Providers.")
        try:
            from google import genai
            self._client = genai.Client(api_key=api_key)
        except ImportError:
            raise ImportError("google-genai not installed. Run: pip install google-genai")
        return self._client

    def _build_gemini_tools(self):
        """Convert tool schema list to Gemini SDK Tool format."""
        from google.genai import types
        function_declarations = []
        for tool in GEMINI_TOOLS:
            # Convert JSON schema properties to Gemini Schema format
            props = {}
            for pname, pdef in tool["parameters"].get("properties", {}).items():
                ptype = pdef.get("type", "string").upper()
                schema_type = {
                    "STRING": types.Type.STRING,
                    "INTEGER": types.Type.INTEGER,
                    "NUMBER": types.Type.NUMBER,
                    "BOOLEAN": types.Type.BOOLEAN,
                    "ARRAY": types.Type.ARRAY,
                    "OBJECT": types.Type.OBJECT,
                }.get(ptype, types.Type.STRING)

                prop_kwargs: dict[str, Any] = {"type": schema_type}
                if "description" in pdef:
                    prop_kwargs["description"] = pdef["description"]
                if "enum" in pdef:
                    prop_kwargs["enum"] = pdef["enum"]
                props[pname] = types.Schema(**prop_kwargs)

            fn_decl = types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties=props,
                    required=tool["parameters"].get("required", []),
                ),
            )
            function_declarations.append(fn_decl)
        return [types.Tool(function_declarations=function_declarations)]

    def process(self, message: str, context: dict | None = None) -> dict:
        """
        Process a chat message. Returns:
        {
            "reply": str,
            "actions": list[dict],  # tools executed
            "redirect": str | None,  # page to navigate to
        }
        """
        actions: list[dict] = []
        redirect: str | None = None

        try:
            client = self._get_gemini()
        except (ValueError, ImportError) as e:
            return {"reply": str(e), "actions": [], "redirect": None}

        from google.genai import types

        tools = self._build_gemini_tools()
        contents = [types.Content(role="user", parts=[types.Part(text=message)])]

        try:
            # Agentic loop: keep calling until no more tool calls
            for _iteration in range(6):  # max 6 tool call rounds
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=tools,
                        temperature=0.4,
                    ),
                )

                candidate = response.candidates[0] if response.candidates else None
                if not candidate:
                    break

                # Check for function calls
                function_calls = [
                    p.function_call
                    for p in candidate.content.parts
                    if hasattr(p, "function_call") and p.function_call
                ]

                if not function_calls:
                    # No more tool calls — extract final text response
                    text_parts = [
                        p.text for p in candidate.content.parts
                        if hasattr(p, "text") and p.text
                    ]
                    final_reply = " ".join(text_parts).strip()
                    break

                # Execute tools
                tool_results = []
                for fc in function_calls:
                    tool_name = fc.name
                    tool_args = dict(fc.args) if fc.args else {}

                    log.info("[ChatEngine] Tool call: %s(%s)", tool_name, tool_args)

                    if tool_name in TOOL_EXECUTORS:
                        try:
                            result = TOOL_EXECUTORS[tool_name](**tool_args)
                        except Exception as exc:
                            result = {"error": str(exc)}
                    else:
                        result = {"error": f"Unknown tool: {tool_name}"}

                    # Track action for frontend
                    action_record = {"tool": tool_name, "args": tool_args, "result": result}
                    actions.append(action_record)

                    # Check for redirect
                    if tool_name == "ui_action" and "redirect" in result:
                        redirect = result["redirect"]

                    tool_results.append(
                        types.Part(
                            function_response=types.FunctionResponse(
                                name=tool_name,
                                response=result,
                            )
                        )
                    )

                # Add model response and tool results to conversation
                contents.append(candidate.content)
                contents.append(types.Content(role="user", parts=tool_results))

            else:
                final_reply = "Processing complete. Multiple operations executed."

        except Exception as e:
            log.error("[ChatEngine] Gemini error: %s", e, exc_info=True)
            # Fallback: try to handle common commands locally
            final_reply = self._local_fallback(message, actions)

        # Ensure final_reply is set
        if not final_reply:
            final_reply = self._summarize_actions(actions)

        return {
            "reply": final_reply,
            "actions": actions,
            "redirect": redirect,
        }

    def _local_fallback(self, message: str, actions: list) -> str:
        """Handle basic commands without AI when API key is missing."""
        msg_lower = message.lower()
        if any(w in msg_lower for w in ["fund", "balance", "cash", "money"]):
            result = _tool_check_funds()
            return (
                f"Portfolio status: ₹{result['available_cash']:,.0f} available | "
                f"₹{result['total_balance']:,.0f} total | P&L: ₹{result['total_pnl']:,.0f}"
            )
        return "⚠ AI engine offline. Set your GEMINI_API_KEY in Settings to activate the full engine."

    def _summarize_actions(self, actions: list) -> str:
        """Generate a reply from executed actions when AI response is empty."""
        if not actions:
            return "Command processed."
        lines = []
        for a in actions:
            r = a.get("result", {})
            if a["tool"] == "place_order":
                if r.get("status") == "COMPLETE":
                    lines.append(
                        f"✓ {r['side']} {r['qty']}x {r['symbol']} @ ₹{r.get('price', 0):,.2f} | Order #{r.get('order_id')}"
                    )
                else:
                    lines.append(f"✗ Order rejected: {r.get('reason', 'unknown')}")
            elif a["tool"] == "check_funds":
                lines.append(f"Available: ₹{r.get('available_cash', 0):,.0f} | Total: ₹{r.get('total_balance', 0):,.0f}")
        return " | ".join(lines) if lines else "Done."


# ── Singleton ─────────────────────────────────────────────────────

_engine: ChatEngine | None = None


def get_engine() -> ChatEngine:
    global _engine
    if _engine is None:
        _engine = ChatEngine()
    return _engine
