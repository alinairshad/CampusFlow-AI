"""
Problem-to-Action plan generation.

Reuses the same retrieval infrastructure as generate_rag_answer:
  generate_embedding + search_similar (category=None, semantic only)

If no chunks meet RAG_MIN_SCORE → deterministic not-found (req 5.7, no LLM call).
If chunks found → single LLM call with json_mode=True → ActionPlanOutput.
Parse + validate with Pydantic. On failure → one retry → graceful fallback.
"""
import json
import logging

from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.services.embeddings import generate_embedding
from app.services.llm_client import LLMError, chat_completion
from app.services.vector_store import search_similar

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Output schema (assumption B)
# ---------------------------------------------------------------------------

class ActionPlanOutput(BaseModel):
    department: str           # e.g. "Finance Office / Accounts Department"
    required_docs: list[str]  # e.g. ["Fee challan receipt", "Student ID"]
    steps: list[str]          # ordered 3–6 steps
    next_action: str          # single most immediate step (~1 sentence)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_NOT_FOUND_ANSWER = (
    "I couldn't find verified guidance on this specific issue in the "
    "university's knowledge base. Please contact the relevant department "
    "directly — they will be able to advise you on the correct process."
)

_SYSTEM_TEMPLATE = """\
You are CampusFlow AI, an academic assistant helping a university student resolve an administrative problem.

Using ONLY the information in the context sections below, produce a structured action plan.
Do NOT invent department names, deadlines, fees, or procedures that are not stated in the context.
If the context does not contain enough information for a specific field, state "Not specified in available documents".

Respond with ONLY valid JSON matching this exact schema — no markdown, no explanation:
{{
  "department": "<the office or department responsible for resolving this issue>",
  "required_docs": ["<document 1>", "<document 2>"],
  "steps": ["<step 1>", "<step 2>", "<step 3>"],
  "next_action": "<the single most immediate action the student should take right now>"
}}

--- CONTEXT ---
{context_block}
--- END CONTEXT ---
"""

_RETRY_SUFFIX = (
    "\n\nIMPORTANT: You MUST respond with ONLY valid JSON matching the schema above. "
    "No markdown fences, no extra text."
)

_FALLBACK: ActionPlanOutput = ActionPlanOutput(
    department="Please contact the relevant university office directly.",
    required_docs=["Your student ID", "Any relevant correspondence"],
    steps=[
        "Identify the relevant department for your issue.",
        "Visit or email the department during working hours.",
        "Bring any supporting documents related to your problem.",
        "Request a reference number for follow-up.",
    ],
    next_action=(
        "Contact the relevant department directly — "
        "verified policy guidance is not available for this issue."
    ),
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_action_plan(
    query: str,
    university_id: str,
    category: str | None = None,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Generate a structured action plan for a student's problem.

    Parameters
    ----------
    query            : student's problem description
    university_id    : used as the mandatory retrieval filter
    category         : ignored (semantic-only retrieval, same reason as RAG fix)
    conversation_history : recent messages for additional context in the prompt

    Returns
    -------
    {
        "department"   : str,
        "required_docs": list[str],
        "steps"        : list[str],
        "next_action"  : str,
        "sources"      : list[dict],  # same shape as RAG sources
        "found"        : bool,
    }
    """
    # ── Embed + retrieve ─────────────────────────────────────────────────────
    query_embedding = await generate_embedding(query)

    results = await search_similar(
        query_embedding=query_embedding,
        university_id=university_id,
        category=None,                          # semantic-only (assumption A)
        top_k=5,
        min_score=settings.ACTION_PLAN_MIN_SCORE,
    )

    # ── Threshold gate — req 5.7 ─────────────────────────────────────────────
    if not results:
        logger.info(
            "Action plan: no chunks above threshold %.2f for query=%r",
            settings.RAG_MIN_SCORE, query[:60],
        )
        return {
            "department":    _NOT_FOUND_ANSWER,
            "required_docs": [],
            "steps":         [],
            "next_action":   _NOT_FOUND_ANSWER,
            "sources":       [],
            "found":         False,
        }

    # ── Build context block ───────────────────────────────────────────────────
    context_lines = []
    for i, chunk in enumerate(results, start=1):
        context_lines.append(
            f"[{i}] (Category: {chunk['category']})\n{chunk['chunk_text']}"
        )
    context_block = "\n\n".join(context_lines)

    system_prompt = _SYSTEM_TEMPLATE.format(context_block=context_block)

    # Optionally prepend recent conversation history for richer context
    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        history_text = "Recent conversation context:\n" + "\n".join(
            f"{m['role'].capitalize()}: {m['content']}"
            for m in conversation_history[-4:]   # last 2 exchanges is enough
        )
        messages.append({"role": "user", "content": history_text})
        messages.append({
            "role": "assistant",
            "content": "Understood. I will use this context when generating the action plan.",
        })
    messages.append({"role": "user", "content": query})

    # ── LLM call with parse + retry ───────────────────────────────────────────
    plan = await _call_and_parse(messages, attempt=1)

    if plan is None:
        messages_retry = [
            {"role": "system", "content": system_prompt + _RETRY_SUFFIX},
        ]
        if conversation_history:
            messages_retry += messages[1:-1]   # keep history if present
        messages_retry.append({"role": "user", "content": query})
        plan = await _call_and_parse(messages_retry, attempt=2)

    if plan is None:
        logger.warning(
            "Action plan generation failed after 2 attempts for query=%r — using fallback",
            query[:80],
        )
        plan = _FALLBACK

    # ── Build sources (same shape as RAG sources) ─────────────────────────────
    seen: set[str] = set()
    sources = []
    for chunk in results:
        doc_id = chunk["document_id"]
        if doc_id in seen:
            continue
        seen.add(doc_id)
        sources.append({
            "document_id":   doc_id,
            "category":      chunk["category"],
            "chunk_preview": chunk["chunk_text"][:200],
            "score":         round(chunk.get("score", 0.0), 4),
        })

    logger.info(
        "Action plan generated: query=%r  department=%r  steps=%d  sources=%d",
        query[:60], plan.department, len(plan.steps), len(sources),
    )

    return {
        "department":    plan.department,
        "required_docs": plan.required_docs,
        "steps":         plan.steps,
        "next_action":   plan.next_action,
        "sources":       sources,
        "found":         True,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _call_and_parse(
    messages: list[dict],
    attempt: int,
) -> ActionPlanOutput | None:
    """Make one LLM call and attempt to parse the result. Returns None on any failure."""
    try:
        content = await chat_completion(
            messages=messages,
            temperature=0.2,
            max_tokens=512,
            json_mode=True,
        )
    except LLMError as exc:
        logger.warning("Action plan LLM call failed on attempt %d: %s", attempt, exc)
        return None

    return _parse(content, attempt)


def _parse(content: str, attempt: int) -> ActionPlanOutput | None:
    """Parse and validate the raw LLM string. Returns None on any error."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        logger.warning(
            "Action plan attempt %d: JSON decode failed — raw=%r", attempt, content[:120]
        )
        return None

    try:
        return ActionPlanOutput(**data)
    except (ValidationError, TypeError) as exc:
        logger.warning(
            "Action plan attempt %d: validation failed — data=%r  err=%s",
            attempt, data, exc,
        )
        return None
