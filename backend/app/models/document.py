"""
Pydantic models for Document and DocumentChunk.

Covers:
- DB document shapes (DocumentInDB, DocumentChunkInDB)
- Category enum (DocumentCategory)
- Response shapes (DocumentUploadResponse, DocumentListItem, DocumentListResponse)
"""
from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Category enum — must match design.md section 6
# ---------------------------------------------------------------------------

class DocumentCategory(str, Enum):
    FEES = "Fees"
    EXAMINATION = "Examination"
    SCHOLARSHIP = "Scholarship"
    REGISTRATION = "Registration"
    ACADEMIC_POLICY = "Academic Policy"
    DEPARTMENT_INFO = "Department Info"
    FAQ = "FAQ"


# ---------------------------------------------------------------------------
# DB document shapes (what is stored in MongoDB)
# ---------------------------------------------------------------------------

class DocumentInDB(BaseModel):
    """Shape of a document in the `documents` collection."""
    id: Optional[str] = None              # stringified MongoDB _id
    university_id: str
    title: str
    category: DocumentCategory
    filename: str
    uploaded_by: str                       # user_id string ref (admin)
    uploaded_at: datetime
    status: Literal["processed", "failed"] = "processed"

    model_config = {"populate_by_name": True}


class DocumentChunkInDB(BaseModel):
    """
    Shape of a document in the `document_chunks` collection.

    `embedding` is stored as a list of floats (1536-dimensional for
    text-embedding-3-small). The Atlas Vector Search index is defined
    on this field — see design.md section 5.1 and Task 2.5 notes.
    """
    id: Optional[str] = None              # stringified MongoDB _id
    document_id: str                       # ref to documents._id
    university_id: str
    category: DocumentCategory
    chunk_index: int                       # 0-based position within the source doc
    chunk_text: str
    embedding: list[float]                 # 1536 floats for text-embedding-3-small
    created_at: datetime

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Response shapes
# ---------------------------------------------------------------------------

class DocumentUploadResponse(BaseModel):
    """
    Returned by POST /admin/documents on success.
    Tells the admin how many chunks were created.
    """
    id: str                                # MongoDB _id of the created document
    title: str
    category: DocumentCategory
    filename: str
    status: Literal["processed", "failed"]
    chunks_created: int
    uploaded_at: datetime


class DocumentListItem(BaseModel):
    """One item in the admin document library list."""
    id: str
    title: str
    category: DocumentCategory
    filename: str
    uploaded_by: str
    uploaded_at: datetime
    status: Literal["processed", "failed"]


class DocumentListResponse(BaseModel):
    """Returned by GET /admin/documents."""
    documents: list[DocumentListItem]
    total: int
