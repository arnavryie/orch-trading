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
