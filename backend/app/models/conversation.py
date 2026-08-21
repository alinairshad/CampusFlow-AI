"""
Pydantic models for Conversation and ConversationMessage.

Maps to the `conversations` collection defined in design.md section 6.
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Message shape
# ---------------------------------------------------------------------------

class ConversationSource(BaseModel):
    """One source citation attached to an assistant message."""
    document_id: str
    category: str
    chunk_preview: str
    score: float = 0.0


class ConversationMessage(BaseModel):
    """A single turn (user or assistant) inside a conversation."""
    role: Literal["user", "assistant"]
    content: str
    # Populated on assistant messages only
    type: Optional[Literal["knowledge", "problem", "application"]] = None
    sources: list[ConversationSource] = []
    found: Optional[bool] = None          # True / False / None for user messages
    created_at: datetime


# ---------------------------------------------------------------------------
# Conversation document
# ---------------------------------------------------------------------------

class ConversationInDB(BaseModel):
    """Shape of a document in the `conversations` collection."""
    id: Optional[str] = None             # stringified MongoDB _id
    university_id: str
    student_id: str                       # ref to users._id
    messages: list[ConversationMessage] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Response shapes
# ---------------------------------------------------------------------------

class ConversationSummary(BaseModel):
    """Lightweight item for the conversation list endpoint."""
    id: str
    first_message_preview: str           # first user message, truncated
    message_count: int
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int


class ConversationDetailResponse(BaseModel):
    """Full conversation with all messages — for GET /conversations/{id}."""
    id: str
    student_id: str
    messages: list[ConversationMessage]
    created_at: datetime
    updated_at: datetime
