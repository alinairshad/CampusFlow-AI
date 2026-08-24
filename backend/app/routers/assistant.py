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
from app.core.rate_limit import limit_assistant_query
from app.db.mongo import get_database
from app.models.conversation import (
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationMessage,
    ConversationSource,
    ConversationSummary,
)
from app.services.conversation import get_conversation_history, save_conversation_turn
from app.services.intent_classifier import classify_intent
from app.services.rag_answer import generate_rag_answer
from app.services.action_plan import generate_action_plan

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
        if len(v) > 1000:
            raise ValueError("Query must be 1000 characters or fewer.")
        return v.strip()

    @field_validator("conversation_id")
    @classmethod
    def conversation_id_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        # MongoDB ObjectId is exactly 24 hex characters
        if len(v) != 24 or not all(c in "0123456789abcdefABCDEF" for c in v):
            raise ValueError(
                "conversation_id must be a 24-character hexadecimal MongoDB ObjectId."
            )
        return v


class AssistantQueryResponse(BaseModel):
    conversation_id: str
    type: str                            # "knowledge" | "problem" | "application"
    answer: str                          # for problem: this is next_action text
    sources: list[dict]
    found: bool
    action_plan: Optional[dict] = None  # populated only when type == "problem"


# ---------------------------------------------------------------------------
# Placeholder text for unimplemented intents
# ---------------------------------------------------------------------------

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
    current_user: CurrentUser = Depends(limit_assistant_query),
):
    """
    Main AI assistant endpoint.

    Orchestration:
      1. Load recent conversation history (if conversation_id provided)
      2. Classify intent → {category, type}
      3. Route by type:
           knowledge   → RAG pipeline (embed → retrieve → threshold → generate)
           problem     → Action Plan pipeline (embed → retrieve → structured plan)
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
    action_plan: dict | None = None

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
        try:
            plan_result = await generate_action_plan(
                query=body.query,
                university_id=university_id,
                category=None,
                conversation_history=history,
            )
            # answer = next_action (assumption C: Option 1)
            answer = plan_result["next_action"]
            sources = plan_result["sources"]
            found = plan_result["found"]
            # Full structured plan returned separately (assumption D)
            if found:
                action_plan = {
                    "department":    plan_result["department"],
                    "required_docs": plan_result["required_docs"],
                    "steps":         plan_result["steps"],
                    "next_action":   plan_result["next_action"],
                }
        except Exception as exc:
            logger.error(
                "Action plan error for student=%s query=%r: %s",
                student_id, body.query[:60], exc, exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while generating your action plan. Please try again.",
            ) from exc

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
            action_plan=action_plan,
        )
    except Exception as exc:
        # Persistence failure is non-fatal — the student still gets their answer
        logger.error(
            "Failed to persist conversation turn for student=%s: %s",
            student_id, exc, exc_info=True,
        )
        conversation_id = body.conversation_id or "persistence-failed"

    return AssistantQueryResponse(
        conversation_id=conversation_id,
        type=intent_type,
        answer=answer,
        sources=sources,
        found=found,
        action_plan=action_plan,
    )


# ---------------------------------------------------------------------------
# GET /assistant/conversations
# ---------------------------------------------------------------------------

@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List the authenticated student's conversations, newest first, max 20.
    Returns one summary per conversation (id, first user message preview,
    message count, created_at, updated_at).
    """
    db = get_database()

    cursor = db["conversations"].find(
        {
            "student_id": current_user.user_id,
            "university_id": current_user.university_id,
        },
        sort=[("updated_at", -1)],
        limit=20,
    )
    docs = await cursor.to_list(length=20)

    summaries = []
    for doc in docs:
        messages = doc.get("messages", [])
        # First user message as the preview
        first_user = next((m for m in messages if m.get("role") == "user"), None)
        preview = (first_user["content"][:80] if first_user else "") + (
            "…" if first_user and len(first_user["content"]) > 80 else ""
        )
        summaries.append(
            ConversationSummary(
                id=str(doc["_id"]),
                first_message_preview=preview,
                message_count=len(messages),
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
            )
        )

    logger.info(
        "Listed %d conversations for student=%s",
        len(summaries), current_user.user_id,
    )
    return ConversationListResponse(conversations=summaries, total=len(summaries))


# ---------------------------------------------------------------------------
# GET /assistant/conversations/{conv_id}
# ---------------------------------------------------------------------------

@router.get("/conversations/{conv_id}", response_model=ConversationDetailResponse)
async def get_conversation_detail(
    conv_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Return the full message list for a conversation, including sources.
    404 if the conversation does not exist or belongs to another student.
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    db = get_database()

    try:
        oid = ObjectId(conv_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Conversation not found.")

    doc = await db["conversations"].find_one(
        {
            "_id": oid,
            "student_id": current_user.user_id,       # ownership check
            "university_id": current_user.university_id,
        }
    )

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Conversation not found.")

    # Deserialise messages into Pydantic models
    messages = []
    for m in doc.get("messages", []):
        sources = [
            ConversationSource(
                document_id=s.get("document_id", ""),
                category=s.get("category", ""),
                chunk_preview=s.get("chunk_preview", ""),
                score=s.get("score", 0.0),
            )
            for s in m.get("sources", [])
        ]
        messages.append(
            ConversationMessage(
                role=m["role"],
                content=m["content"],
                type=m.get("type"),
                sources=sources,
                found=m.get("found"),
                created_at=m["created_at"],
            )
        )

    logger.info(
        "Conversation detail fetched: id=%s  student=%s  messages=%d",
        conv_id, current_user.user_id, len(messages),
    )

    return ConversationDetailResponse(
        id=conv_id,
        student_id=doc["student_id"],
        messages=messages,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )
