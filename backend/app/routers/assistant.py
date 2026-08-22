"""
AI Assistant router.

POST /assistant/query          — main query endpoint (Task 3.7)
GET  /assistant/conversations  — list student's conversations (Task 3.8)
GET  /assistant/conversations/{id} — full conversation detail (Task 3.8)
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.core.deps import CurrentUser, get_current_user
from app.services.conversation import get_conversation_history, save_conversation_turn
from app.services.intent_classifier import classify_intent
from app.services.rag_answer import generate_rag_answer

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AssistantQueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Query must not be empty.")
        return v.strip()


class AssistantQueryResponse(BaseModel):
    conversation_id: str
    type: str                    # "knowledge" | "problem" | "application"
    answer: str
    sources: list[dict]
    found: bool


# ---------------------------------------------------------------------------
# Placeholder text for unimplemented intents
# ---------------------------------------------------------------------------

_PROBLEM_PLACEHOLDER = (
    "Your issue has been noted as a problem that requires action steps. "
    "The step-by-step action plan feature is coming in a later stage — "
    "please contact the relevant department directly in the meantime."
)

_APPLICATION_PLACEHOLDER = (
    "It looks like you need a formal application or letter. "
    "The AI Application Generator is coming in a later stage — "
    "please use the university's standard application forms in the meantime."
)


# ---------------------------------------------------------------------------
# POST /assistant/query
# ---------------------------------------------------------------------------

@router.post("/query", response_model=AssistantQueryResponse)
async def query_assistant(
    body: AssistantQueryRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Main AI assistant endpoint.

    Orchestration:
      1. Load recent conversation history (if conversation_id provided)
      2. Classify intent → {category, type}
      3. Route by type:
           knowledge   → RAG pipeline (embed → retrieve → threshold → generate)
           problem     → placeholder (Stage 4)
           application → placeholder (Stage 5)
      4. Persist the turn and return the response with conversation_id
    """
    student_id = current_user.user_id
    university_id = current_user.university_id

    # ── Step 1: Load recent history for multi-turn context ───────────────────
    history: list[dict] = []
    if body.conversation_id:
        history = await get_conversation_history(student_id, body.conversation_id)
        logger.debug(
            "Loaded %d history messages for conversation=%s",
            len(history), body.conversation_id,
        )

    # ── Step 2: Classify intent ──────────────────────────────────────────────
    try:
        intent = await classify_intent(body.query)
    except Exception as exc:
        # classify_intent is designed never to raise, but guard anyway
        logger.error("Intent classification unexpected error: %s", exc)
        intent_type = "knowledge"
        intent_category = None
    else:
        intent_type = intent.type
        intent_category = intent.category

    logger.info(
        "Query received: student=%s  type=%s  category=%s  query=%r",
        student_id, intent_type, intent_category, body.query[:60],
    )

    # ── Step 3: Route by intent type ────────────────────────────────────────
    answer: str
    sources: list[dict] = []
    found: bool = False

    if intent_type == "knowledge":
        try:
            rag_result = await generate_rag_answer(
                query=body.query,
                university_id=university_id,
                category=None,           # intent category != document category; search all
                conversation_history=history,
            )
            answer = rag_result["answer"]
            sources = rag_result["sources"]
            found = rag_result["found"]
        except Exception as exc:
            # Never leak internal errors to the client (req 11.2)
            logger.error(
                "RAG pipeline error for student=%s query=%r: %s",
                student_id, body.query[:60], exc, exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while processing your query. Please try again.",
            ) from exc

    elif intent_type == "problem":
        # Stage 4 — action plan not yet implemented
        answer = _PROBLEM_PLACEHOLDER
        found = False

    else:
        # intent_type == "application" — Stage 5 not yet implemented
        answer = _APPLICATION_PLACEHOLDER
        found = False

    # ── Step 4: Persist the conversation turn ────────────────────────────────
    try:
        conversation_id = await save_conversation_turn(
            student_id=student_id,
            university_id=university_id,
            user_message=body.query,
            assistant_message=answer,
            intent_type=intent_type,
            sources=sources,
            found=found,
            conversation_id=body.conversation_id,
        )
    except Exception as exc:
        # Persistence failure is non-fatal — the student still gets their answer
        logger.error(
            "Failed to persist conversation turn for student=%s: %s",
            student_id, exc, exc_info=True,
        )
        # Fall back: use whatever id we were given (or a placeholder)
        conversation_id = body.conversation_id or "persistence-failed"

    return AssistantQueryResponse(
        conversation_id=conversation_id,
        type=intent_type,
        answer=answer,
        sources=sources,
        found=found,
    )


# ---------------------------------------------------------------------------
# GET /assistant/conversations  (stub — Task 3.8)
# ---------------------------------------------------------------------------

@router.get("/conversations")
async def list_conversations(
    current_user: CurrentUser = Depends(get_current_user),
):
    return {"detail": "Not yet implemented — Task 3.8"}


# ---------------------------------------------------------------------------
# GET /assistant/conversations/{conv_id}  (stub — Task 3.8)
# ---------------------------------------------------------------------------

@router.get("/conversations/{conv_id}")
async def get_conversation(
    conv_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    return {"detail": "Not yet implemented — Task 3.8"}
