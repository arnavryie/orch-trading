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
