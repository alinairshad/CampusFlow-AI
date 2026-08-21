"""
Conversation persistence helpers.

save_conversation_turn  — create a new conversation or append to existing.
get_conversation_history — return the last N messages for LLM context.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongo import get_database

logger = logging.getLogger(__name__)

CONVERSATIONS_COLLECTION = "conversations"

# Maximum messages returned for multi-turn LLM context (assumption F: 6 = 3 exchanges)
HISTORY_WINDOW = 6


# ---------------------------------------------------------------------------
# save_conversation_turn
# ---------------------------------------------------------------------------

async def save_conversation_turn(
    *,
    student_id: str,
    university_id: str,
    user_message: str,
    assistant_message: str,
    intent_type: str,
    sources: list[dict],
    found: bool,
    conversation_id: str | None = None,
) -> str:
    """
    Persist one user→assistant exchange.

    If conversation_id is None, a new conversation document is created.
    If conversation_id is provided, the two new messages are appended to
    that existing document.

    Parameters
    ----------
    student_id          : user._id string
    university_id       : settings.UNIVERSITY_ID
    user_message        : the student's raw query
    assistant_message   : the generated answer
    intent_type         : "knowledge" | "problem" | "application"
    sources             : list of source dicts from generate_rag_answer
    found               : whether relevant chunks were found
    conversation_id     : existing conversation _id (string) or None

    Returns
    -------
    The conversation_id (new or existing) as a string.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    user_msg = {
        "role": "user",
        "content": user_message,
        "type": None,
        "sources": [],
        "found": None,
        "created_at": now,
    }

    assistant_msg = {
        "role": "assistant",
        "content": assistant_message,
        "type": intent_type,
        "sources": sources,
        "found": found,
        "created_at": now,
    }

    if conversation_id is None:
        # ── Create new conversation ───────────────────────────────────────────
        doc = {
            "university_id": university_id,
            "student_id": student_id,
            "messages": [user_msg, assistant_msg],
            "created_at": now,
            "updated_at": now,
        }
        result = await db[CONVERSATIONS_COLLECTION].insert_one(doc)
        cid = str(result.inserted_id)
        logger.info(
            "New conversation created: id=%s  student=%s", cid, student_id
        )
        return cid

    # ── Append to existing conversation ──────────────────────────────────────
    try:
        oid = ObjectId(conversation_id)
    except InvalidId:
        logger.warning(
            "Invalid conversation_id %r — creating new conversation instead",
            conversation_id,
        )
        return await save_conversation_turn(
            student_id=student_id,
            university_id=university_id,
            user_message=user_message,
            assistant_message=assistant_message,
            intent_type=intent_type,
            sources=sources,
            found=found,
            conversation_id=None,
        )

    result = await db[CONVERSATIONS_COLLECTION].update_one(
        {
            "_id": oid,
            "student_id": student_id,        # ownership check
            "university_id": university_id,  # tenant check
        },
        {
            "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
            "$set": {"updated_at": now},
        },
    )

    if result.matched_count == 0:
        # Conversation not found or not owned by this student — create fresh
        logger.warning(
            "conversation_id=%r not found for student=%s — creating new",
            conversation_id, student_id,
        )
        return await save_conversation_turn(
            student_id=student_id,
            university_id=university_id,
            user_message=user_message,
            assistant_message=assistant_message,
            intent_type=intent_type,
            sources=sources,
            found=found,
            conversation_id=None,
        )

    logger.info(
        "Conversation updated: id=%s  student=%s  (+2 messages)",
        conversation_id, student_id,
    )
    return conversation_id


# ---------------------------------------------------------------------------
# get_conversation_history
# ---------------------------------------------------------------------------

async def get_conversation_history(
    student_id: str,
    conversation_id: str,
    window: int = HISTORY_WINDOW,
) -> list[dict]:
    """
    Return the last `window` messages from a conversation for LLM context.

    Only returns conversations owned by the given student_id.
    Returns an empty list if the conversation is not found.

    Parameters
    ----------
    student_id       : must match the conversation's student_id field
    conversation_id  : MongoDB _id string of the conversation
    window           : number of recent messages to return (default 6)

    Returns
    -------
    List of {"role": str, "content": str} dicts, oldest first,
    limited to the last `window` messages.
    """
    db = get_database()

    try:
        oid = ObjectId(conversation_id)
    except InvalidId:
        logger.warning("get_conversation_history: invalid id %r", conversation_id)
        return []

    doc = await db[CONVERSATIONS_COLLECTION].find_one(
        {"_id": oid, "student_id": student_id},
        # Only fetch the fields we need for context injection
        {"messages.role": 1, "messages.content": 1, "_id": 0},
    )

    if doc is None:
        return []

    messages = doc.get("messages", [])
    # Slice to the last `window` messages — oldest first within the window
    recent = messages[-window:]
    return [{"role": m["role"], "content": m["content"]} for m in recent]
