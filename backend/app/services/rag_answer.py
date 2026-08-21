"""
RAG answer generation pipeline.

Task 3.2 — rewrite_query: expand short/ambiguous queries before retrieval.
Task 3.3 — embed + retrieve + threshold check (implemented next).
Task 3.4 — deterministic "not found" fallback (implemented next).
Task 3.5 — grounded answer generation (implemented next).
"""
import logging

from app.services.llm_client import LLMError, chat_completion

logger = logging.getLogger(__name__)

# Rewrite is only triggered for queries that are likely too sparse for good
# vector retrieval. Both conditions must be considered:
#   - very short (few words — not enough semantic signal)
#   - no question word or verb — reads more like a keyword search
_REWRITE_WORD_THRESHOLD = 8

_QUESTION_SIGNALS = {
    "what", "when", "where", "who", "why", "how", "which", "is", "are",
    "can", "could", "do", "does", "will", "should", "has", "have",
    "explain", "tell", "describe", "list", "show",
}

_REWRITE_SYSTEM = """\
You are a query expansion assistant for a university information system.

Your task: rewrite the student's short or unclear query into a clear, \
complete question that will retrieve relevant university policy documents.

Rules:
- Keep the original intent exactly — do not change what is being asked.
- Expand abbreviations and add context where obvious (e.g. "fee" → "student tuition fee").
- Output ONLY the rewritten question, no explanation, no quotes.
- If the query is already clear, return it unchanged.
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def rewrite_query(query: str) -> str:
    """
    Optionally rewrite a short or ambiguous query before retrieval.

    Rewrite is triggered when the query is under _REWRITE_WORD_THRESHOLD
    words AND contains no recognised question signal words — i.e. it reads
    like a keyword search rather than a natural-language question.

    On any LLM error the original query is returned unchanged, so retrieval
    can still proceed.

    Parameters
    ----------
    query : raw student query string

    Returns
    -------
    Rewritten query string (or original if no rewrite was needed/possible)
    """
    if not query or not query.strip():
        return query

    stripped = query.strip()

    # Check whether rewrite is needed
    if not _needs_rewrite(stripped):
        logger.debug("Query rewrite skipped (query is already clear): %r", stripped[:80])
        return stripped

    logger.debug("Rewriting query: %r", stripped[:80])

    try:
        rewritten = await chat_completion(
            messages=[
                {"role": "system", "content": _REWRITE_SYSTEM},
                {"role": "user", "content": stripped},
            ],
            temperature=0.2,
            max_tokens=128,
            json_mode=False,
        )
    except LLMError as exc:
        # Non-fatal — fall back to original query so retrieval still proceeds
        logger.warning("Query rewrite LLM call failed (%s) — using original query", exc)
        return stripped

    rewritten = rewritten.strip().strip('"').strip("'")

    # Sanity guard: if the rewrite came back empty or absurdly long, use original
    if not rewritten or len(rewritten) > 500:
        logger.warning(
            "Query rewrite returned unusable result (%d chars) — using original",
            len(rewritten),
        )
        return stripped

    logger.info("Query rewritten: %r → %r", stripped[:60], rewritten[:80])
    return rewritten


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _needs_rewrite(query: str) -> bool:
    """
    Return True if the query is short enough and sparse enough to benefit
    from rewriting.

    Both conditions must be true:
    1. Word count is below the threshold.
    2. No recognised question/intent signal word is present.
    """
    if not query or not query.strip():
        return False
    words = query.lower().split()
    if len(words) >= _REWRITE_WORD_THRESHOLD:
        return False
    has_signal = any(w.rstrip("?") in _QUESTION_SIGNALS for w in words)
    return not has_signal


# ---------------------------------------------------------------------------
# Task 3.3–3.5 stubs (implemented in subsequent tasks)
# ---------------------------------------------------------------------------

async def generate_rag_answer(
    query: str,
    university_id: str,
    category: str | None = None,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Full RAG pipeline: rewrite → embed → retrieve → threshold → generate.
    Returns: {"answer": str, "sources": list[dict], "found": bool}
    Implemented in Tasks 3.3–3.5.
    """
    raise NotImplementedError("Implemented in Tasks 3.3–3.5")
