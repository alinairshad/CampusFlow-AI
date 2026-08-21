"""
LLM-based intent classification.

Single LLM call → strict JSON {category, type} → validated against
IntentClassification Pydantic model.

Fallback chain on parse/validation failure:
  1. First attempt — normal call with json_mode=True
  2. One retry — stricter prompt reminder
  3. Final fallback — {"category": "Other", "type": "knowledge"} (req 4.3)
"""
import json
import logging
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.services.llm_client import LLMError, chat_completion

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

class IntentClassification(BaseModel):
    category: Literal[
        "Academic",
        "Finance",
        "Registration",
        "Examination",
        "Scholarship",
        "IT Support",
        "Administration",
        "Campus Life",
        "Hostel",
        "Transport",
        "Other",
    ]
    type: Literal["knowledge", "problem", "application"]


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are an intent classifier for a university student assistant system.

Classify the student's query into exactly ONE category and ONE type.

CATEGORIES (pick the single most relevant):
Academic, Finance, Registration, Examination, Scholarship,
IT Support, Administration, Campus Life, Hostel, Transport, Other

TYPES:
- "knowledge"     — student wants factual information or an explanation
- "problem"       — student has a specific issue or complaint that needs action steps
- "application"   — student wants to generate a formal letter or application

Respond with ONLY a JSON object in this exact format, no other text:
{"category": "<category>", "type": "<type>"}
"""

_RETRY_SUFFIX = (
    "\n\nIMPORTANT: You must respond with ONLY valid JSON in the exact format: "
    '{"category": "<category>", "type": "<type>"} — no markdown, no explanation.'
)

_FALLBACK = IntentClassification(category="Other", type="knowledge")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def classify_intent(query: str) -> IntentClassification:
    """
    Classify a student query into {category, type}.

    Never raises — falls back to {category: "Other", type: "knowledge"}
    if the LLM is unreachable or returns unparseable output (req 4.3).

    Parameters
    ----------
    query : the raw student query string

    Returns
    -------
    IntentClassification with validated category and type fields
    """
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]

    # ── Attempt 1 ─────────────────────────────────────────────────────────────
    raw = await _call_and_parse(messages, attempt=1)
    if raw is not None:
        return raw

    # ── Attempt 2 — stricter reminder ─────────────────────────────────────────
    messages_retry = [
        {"role": "system", "content": _SYSTEM_PROMPT + _RETRY_SUFFIX},
        {"role": "user", "content": query},
    ]
    raw = await _call_and_parse(messages_retry, attempt=2)
    if raw is not None:
        return raw

    # ── Fallback ───────────────────────────────────────────────────────────────
    logger.warning(
        "Intent classification failed after 2 attempts for query=%r — "
        "using fallback {Other, knowledge}",
        query[:80],
    )
    return _FALLBACK


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _call_and_parse(
    messages: list[dict],
    attempt: int,
) -> IntentClassification | None:
    """
    Make one LLM call and try to parse the result.
    Returns IntentClassification on success, None on any failure.
    """
    try:
        content = await chat_completion(
            messages,
            temperature=0.0,      # fully deterministic for classification
            max_tokens=64,        # {"category": "...", "type": "..."} is tiny
            json_mode=True,
        )
    except LLMError as exc:
        logger.warning("LLM call failed on attempt %d: %s", attempt, exc)
        return None

    return _parse_response(content, attempt)


def _parse_response(content: str, attempt: int) -> IntentClassification | None:
    """Parse and validate the raw LLM string. Returns None on any error."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        logger.warning(
            "Intent classifier attempt %d: JSON decode failed — raw=%r",
            attempt, content[:120],
        )
        return None

    try:
        return IntentClassification(**data)
    except (ValidationError, TypeError) as exc:
        logger.warning(
            "Intent classifier attempt %d: validation failed — data=%r  err=%s",
            attempt, data, exc,
        )
        return None
