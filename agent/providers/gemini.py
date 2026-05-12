"""
agent/providers/gemini.py
─────────────────────────
Gemini Flash AI provider for stock analysis and trade decisions.
"""

from __future__ import annotations

import json
import logging
import os

log = logging.getLogger(__name__)


class GeminiProvider:
    def __init__(self, api_key: str = None, model: str = "gemini-2.0-flash-exp"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = model
        self._client = None

    def _get_client(self):
        if not self._client:
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY not set. Add it in Settings or .env")
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self._client = genai.GenerativeModel(self.model_name)
        return self._client

    async def complete(self, prompt: str, system: str = None) -> str:
        """Generate a text completion from Gemini."""
        try:
            client = self._get_client()
            full_prompt = f"{system}\n\n{prompt}" if system else prompt
            response = client.generate_content(full_prompt)
            return response.text
        except Exception as e:
            log.error("Gemini complete() failed: %s", e)
            return f"[AI Error] {e}"

    async def analyze_stock(self, symbol: str, market_data: dict) -> dict:
        """
        Analyze a stock and return structured verdict.
        Returns: {verdict, confidence, entry, stop_loss, targets, rationale}
        """
        prompt = f"""
You are a professional Indian stock market analyst specializing in NSE/BSE equities.
Analyze the following stock data and provide a structured trading recommendation.

Stock: {symbol}
Data: {json.dumps(market_data, indent=2)}

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{{
  "verdict": "BUY" | "SELL" | "HOLD",
  "confidence": <0-100>,
  "entry": <price>,
  "stop_loss": <price>,
  "targets": [<price1>, <price2>],
  "rationale": "<2-3 sentence explanation>",
  "timeframe": "intraday" | "swing" | "positional",
  "risk_reward": <ratio>
}}
"""
        try:
            text = await self.complete(prompt)
            # Extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
        except Exception as e:
            log.error("analyze_stock failed: %s", e)
        return {
            "verdict": "HOLD", "confidence": 50, "entry": 0,
            "stop_loss": 0, "targets": [], "rationale": "Analysis unavailable",
            "timeframe": "swing", "risk_reward": 1.5
        }

    async def decide_trade(self, portfolio: dict, market_data: dict, watchlist: list) -> dict:
        """
        Auto-trading decision engine.
        Returns list of orders to place.
        """
        prompt = f"""
You are an autonomous AI trading agent for the Indian stock market.
Review the current portfolio and market conditions and decide what to trade.

Portfolio:
{json.dumps(portfolio, indent=2)}

Market Data (current quotes):
{json.dumps(market_data, indent=2)}

Watchlist: {watchlist}

Rules:
- Max 1-2 new positions per cycle
- Never risk more than 2% of portfolio per trade
- Prefer stocks with RSI < 40 (oversold) for buys
- Take profits if position is up > 8%
- Cut losses if position is down > 4%

Return ONLY valid JSON:
{{
  "orders": [
    {{
      "symbol": "<NSE symbol>",
      "action": "BUY" | "SELL",
      "quantity": <int>,
      "reason": "<brief reason>",
      "urgency": "high" | "medium" | "low"
    }}
  ],
  "commentary": "<overall market assessment in 1-2 sentences>"
}}
"""
        try:
            text = await self.complete(prompt)
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
        except Exception as e:
            log.error("decide_trade failed: %s", e)
        return {"orders": [], "commentary": "AI analysis unavailable"}

    async def morning_brief(self, nifty_data: dict, fii_data: dict, top_movers: list) -> str:
        """Generate a morning market brief narrative."""
        prompt = f"""
You are a senior analyst at a top Indian brokerage. Write a crisp morning market brief.

NIFTY: {nifty_data}
FII/DII Activity: {fii_data}
Top Movers: {top_movers}

Write 3-4 punchy sentences covering: market sentiment, key levels to watch, 
FII activity impact, and one actionable insight. Use INR notation (₹).
Be specific with numbers. Do NOT use markdown formatting.
"""
        return await self.complete(prompt)


# ── Singleton ─────────────────────────────────────────────────

_gemini_instance: GeminiProvider | None = None


def get_gemini() -> GeminiProvider:
    global _gemini_instance
    if _gemini_instance is None:
        _gemini_instance = GeminiProvider()
    return _gemini_instance
