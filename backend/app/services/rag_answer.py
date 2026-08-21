"""
RAG answer generation pipeline.

Task 3.2 — rewrite_query: expand short/ambiguous queries before retrieval.
Task 3.3 — embed + retrieve + threshold check (implemented next).
Task 3.4 — deterministic "not found" fallback (implemented next).
Task 3.5 — grounded answer generation (implemented next).
"""
import logging

from app.core.config import settings
from app.services.embeddings import generate_embedding
from app.services.llm_client import LLMError, chat_completion
from app.services.vector_store import search_similar

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
# Task 3.3–3.5 — generate_rag_answer
# ---------------------------------------------------------------------------

# "Not found" response — deterministic, no LLM call
_NOT_FOUND_ANSWER = (
    "I wasn't able to find verified information on that in the university's "
    "knowledge base. Please check with the relevant department directly, or "
    "ask an admin to upload the relevant policy document."
)


async def generate_rag_answer(
    query: str,
    university_id: str,
    category: str | None = None,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Full RAG pipeline: rewrite → embed → retrieve → threshold → generate.

    Returns
    -------
    {
        "answer"  : str,
        "sources" : list[{"document_id", "category", "chunk_preview"}],
        "found"   : bool,
        "rewritten_query": str,   # for debugging / transparency
    }
    """
    # ── Task 3.2 — Query rewrite ──────────────────────────────────────────────
    rewritten = await rewrite_query(query)

    # ── Task 3.3 — Embed the (possibly rewritten) query ───────────────────────
    query_embedding = await generate_embedding(rewritten)

    # ── Task 3.3 — Retrieve top-k chunks from Atlas Vector Search ─────────────
    # search_similar already applies min_score as a $match stage, but we fetch
    # with a slightly lower internal threshold and apply settings.RAG_MIN_SCORE
    # here so the threshold is tunable at runtime without redeploying.
    results = await search_similar(
        query_embedding=query_embedding,
        university_id=university_id,
        category=category,
        top_k=5,
        min_score=settings.RAG_MIN_SCORE,
    )

    # ── Task 3.4 — Deterministic "not found" fallback ─────────────────────────
    # If no chunks meet the threshold, return immediately — do NOT call the LLM.
    # This is a hard code branch, not a model decision (req 3.4, design §5.2).
    if not results:
        logger.info(
            "RAG: no chunks above threshold %.2f for query=%r (category=%s)",
            settings.RAG_MIN_SCORE, rewritten[:60], category,
        )
        return {
            "answer": _NOT_FOUND_ANSWER,
            "sources": [],
            "found": False,
            "rewritten_query": rewritten,
        }

    # ── Task 3.5 — Grounded answer generation ────────────────────────────────
    return await _generate_answer(
        original_query=query,
        rewritten_query=rewritten,
        results=results,
        conversation_history=conversation_history or [],
    )


# ---------------------------------------------------------------------------
# Task 3.5 internals
# ---------------------------------------------------------------------------

# CHUNK_PREVIEW_CHARS: how many characters of each chunk to show in sources.
# Long enough for meaningful citation, short enough for a clean UI chip.
_CHUNK_PREVIEW_CHARS = 200

# System prompt — grounding instruction is explicit and non-negotiable.
# Key rules enforced here satisfy req 3.5 ("answer only from provided context")
# and req 11.7 ("never fabricate university-specific facts").
_RAG_SYSTEM_TEMPLATE = """\
You are CampusFlow AI, an academic assistant for university students.

Answer the student's question using ONLY the information in the context \
sections below. Do not use any outside knowledge, do not invent deadlines, \
fees, office names, or policies that are not explicitly stated in the context.

If the context does not contain enough information to answer fully, say so \
clearly — do not guess or speculate.

Keep your answer concise, helpful, and in plain language a student can act on.

--- CONTEXT ---
{context_block}
--- END CONTEXT ---
"""

_HISTORY_INTRO = "Recent conversation (for context only — do not answer old questions again):\n"


def _build_context_block(results: list[dict]) -> str:
    """Format retrieved chunks into a numbered context block for the prompt."""
    lines = []
    for i, chunk in enumerate(results, start=1):
        lines.append(
            f"[{i}] (Category: {chunk['category']})\n{chunk['chunk_text']}"
        )
    return "\n\n".join(lines)


def _build_sources(results: list[dict]) -> list[dict]:
    """Build the sources list returned to the frontend."""
    seen_docs: set[str] = set()
    sources = []
    for chunk in results:
        doc_id = chunk["document_id"]
        if doc_id in seen_docs:
            # Deduplicate: only include each source document once,
            # using the highest-scored chunk as the preview.
            continue
        seen_docs.add(doc_id)
        sources.append({
            "document_id": doc_id,
            "category": chunk["category"],
            "chunk_preview": chunk["chunk_text"][:_CHUNK_PREVIEW_CHARS],
            "score": round(chunk.get("score", 0.0), 4),
        })
    return sources


async def _generate_answer(
    original_query: str,
    rewritten_query: str,
    results: list[dict],
    conversation_history: list[dict],
) -> dict:
    """
    Call the LLM with retrieved context and conversation history to produce
    a grounded answer.

    Parameters
    ----------
    original_query       : the student's raw input (shown to user)
    rewritten_query      : the expanded query used for retrieval (for logging)
    results              : list of chunk dicts from search_similar
    conversation_history : up to 6 recent messages [{role, content}]

    Returns
    -------
    {"answer": str, "sources": list[dict], "found": bool, "rewritten_query": str}
    """
    context_block = _build_context_block(results)
    system_prompt = _RAG_SYSTEM_TEMPLATE.format(context_block=context_block)

    # Build messages: system → optional history → current question
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        # Prepend a brief label so the model understands the history's purpose
        history_text = _HISTORY_INTRO + "\n".join(
            f"{m['role'].capitalize()}: {m['content']}"
            for m in conversation_history[-6:]   # cap at last 6 messages
        )
        messages.append({"role": "user", "content": history_text})
        messages.append({
            "role": "assistant",
            "content": "Understood. I will use this context when answering.",
        })

    messages.append({"role": "user", "content": original_query})

    try:
        answer = await chat_completion(
            messages=messages,
            temperature=0.2,   # low — we want factual, not creative
            max_tokens=512,
            json_mode=False,
        )
    except LLMError as exc:
        logger.error("RAG generation LLM call failed: %s", exc)
        return {
            "answer": (
                "I encountered an error generating an answer. "
                "Please try again in a moment."
            ),
            "sources": _build_sources(results),
            "found": False,
            "rewritten_query": rewritten_query,
        }

    sources = _build_sources(results)

    logger.info(
        "RAG answer generated: query=%r  chunks_used=%d  sources=%d",
        original_query[:60], len(results), len(sources),
    )

    return {
        "answer": answer,
        "sources": sources,
        "found": True,
        "rewritten_query": rewritten_query,
    }
