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
