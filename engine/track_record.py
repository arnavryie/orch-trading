"""
engine/track_record.py
──────────────────────
Scores past council predictions against what prices actually did, builds a
per-AI accuracy scoreboard, and derives vote weights so accurate AIs count more.

Scoring rule (evaluated HORIZON_DAYS trading days after each prediction):
  BUY  is correct if the stock rose  more than THRESHOLD_PCT
  SELL is correct if the stock fell  more than THRESHOLD_PCT
  HOLD is correct if it stayed within ±THRESHOLD_PCT
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

DIR = Path.home() / ".orch-trading"
MEMORY_FILE = DIR / "memory.json"

HORIZON_DAYS = 5      # trading-day horizon to judge a prediction
THRESHOLD_PCT = 1.5   # move needed for BUY/SELL to count as correct
MIN_SAMPLES = 5       # scored calls needed before an AI's weight leaves neutral


def _load_memory() -> list:
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text())
        except Exception:
            return []
    return []


def _judge(verdict: str, ret_pct: float):
    """Return True/False if scoreable, None if not (ABSTAIN/NO DATA)."""
    if verdict == "BUY":
        return ret_pct > THRESHOLD_PCT
    if verdict == "SELL":
        return ret_pct < -THRESHOLD_PCT
    if verdict == "HOLD":
        return abs(ret_pct) <= THRESHOLD_PCT
    return None


def _base(d: dict) -> dict:
    return {
        "symbol": d.get("symbol"),
        "action": d.get("action"),
        "price": d.get("price"),
        "timestamp": d.get("timestamp"),
        "agreement": d.get("agreement"),
        "confidence": d.get("confidence"),
    }


def score_predictions() -> list:
    """Evaluate every logged council prediction. Returns list newest-first."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from market.free_data import get_historical

    mem = _load_memory()
    decisions = [m for m in mem if m.get("type") == "council_decision" and (m.get("price") or 0) > 0]

    # Group by symbol so we fetch history once per symbol
    by_symbol: dict[str, list] = {}
    for d in decisions:
        by_symbol.setdefault(d["symbol"], []).append(d)

    scored = []
    for sym, decs in by_symbol.items():
        hist = get_historical(sym, period="6mo", interval="1d")  # ascending {time, close}
        if not hist:
            for d in decs:
                scored.append({**_base(d), "status": "no_data"})
            continue

        bars = sorted(
            [(datetime.fromtimestamp(b["time"], tz=timezone.utc).date(), b["close"]) for b in hist],
            key=lambda x: x[0],
        )

        for d in decs:
            try:
                ddate = datetime.fromisoformat(d["timestamp"]).date()
            except Exception:
                scored.append({**_base(d), "status": "no_data"})
                continue

            # First bar on/after the decision date
            idx = next((i for i, (bd, _) in enumerate(bars) if bd >= ddate), None)
            if idx is None or idx + HORIZON_DAYS >= len(bars):
                scored.append({**_base(d), "status": "pending"})
                continue

            future_close = bars[idx + HORIZON_DAYS][1]
            decision_price = d["price"]
            ret = (future_close - decision_price) / decision_price * 100 if decision_price else 0

            ai_results = []
            for v in d.get("votes", []):
                verdict = v.get("verdict")
                correct = _judge(verdict, ret)
                if correct is None:
                    continue
                ai_results.append({"ai": v.get("ai"), "verdict": verdict, "correct": correct})

            scored.append({
                **_base(d),
                "status": "evaluated",
                "return_pct": round(ret, 2),
                "future_close": round(future_close, 2),
                "consensus_correct": _judge(d.get("action"), ret),
                "ai_results": ai_results,
            })

    scored.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return scored


def get_ai_scoreboard() -> dict:
    """Aggregate per-AI accuracy + overall consensus accuracy."""
    scored = score_predictions()
    agg: dict[str, dict] = {}
    for s in scored:
        if s["status"] != "evaluated":
            continue
        for r in s.get("ai_results", []):
            ai = r["ai"]
            if not ai:
                continue
            a = agg.setdefault(ai, {"ai": ai, "correct": 0, "total": 0})
            a["total"] += 1
            if r["correct"]:
                a["correct"] += 1

    board = []
    for ai, a in agg.items():
        acc = round(a["correct"] / a["total"] * 100) if a["total"] else 0
        board.append({"ai": ai, "accuracy": acc, "correct": a["correct"], "total": a["total"]})
    board.sort(key=lambda x: (x["accuracy"], x["total"]), reverse=True)

    evaluated = [s for s in scored if s["status"] == "evaluated"]
    cons_correct = sum(1 for s in evaluated if s.get("consensus_correct"))
    consensus = {
        "accuracy": round(cons_correct / len(evaluated) * 100) if evaluated else 0,
        "correct": cons_correct,
        "total": len(evaluated),
    }
    pending = sum(1 for s in scored if s["status"] == "pending")

    return {"board": board, "consensus": consensus, "evaluated": len(evaluated), "pending": pending}


def get_ai_weights() -> dict:
    """Vote weights per AI (0.2–1.0). Neutral 0.5 until MIN_SAMPLES scored calls."""
    try:
        board = get_ai_scoreboard()["board"]
    except Exception:
        return {}
    weights = {}
    for e in board:
        if e["total"] >= MIN_SAMPLES:
            weights[e["ai"]] = max(0.2, e["accuracy"] / 100)  # floor so no AI is fully muted
        else:
            weights[e["ai"]] = 0.5
    return weights
