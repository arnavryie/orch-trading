"""
agent/providers/groq_provider.py
─────────────────────────────────
Groq LLM provider (OpenAI-compatible API).
Uses Llama-3.3-70b — great for fast news analysis.
"""

from __future__ import annotations

import json
import logging
import os

log = logging.getLogger(__name__)


class GroqProvider:
    def __init__(self, api_key: str = None, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY", "")
        self.model = model
        self._client = None

    def _get_client(self):
        if not self._client:
            if not self.api_key:
                raise ValueError("GROQ_API_KEY not set.")
            from openai import OpenAI
            self._client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
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
                temperature=0.7,
                max_tokens=1024,
            )
            return resp.choices[0].message.content
        except Exception as e:
            log.error("Groq complete() failed: %s", e)
            return f"[Groq Error] {e}"

    async def analyze_news_sentiment(self, symbol: str, headlines: list[str]) -> dict:
        """Analyze news headlines for market sentiment."""
        prompt = f"""
Analyze these news headlines about {symbol} and rate market sentiment.
Headlines: {json.dumps(headlines)}

Return ONLY valid JSON:
{{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "score": <-100 to 100>,
  "key_themes": ["<theme1>", "<theme2>"],
  "summary": "<1-2 sentence summary>"
}}
"""
        try:
            text = await self.complete(prompt, system="You are a financial news analyst specializing in Indian markets.")
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1:
                return json.loads(text[start:end])
        except Exception as e:
            log.error("analyze_news_sentiment failed: %s", e)
        return {"sentiment": "NEUTRAL", "score": 0, "key_themes": [], "summary": "Analysis unavailable"}


_groq_instance: GroqProvider | None = None


def get_groq() -> GroqProvider:
    global _groq_instance
    if _groq_instance is None:
        _groq_instance = GroqProvider()
    return _groq_instance
