"""
Student-facing directory router — /directory.

No authentication required — directory info is public (assumption D).

Route ordering matters: /search must be declared before /{entry_id}
so FastAPI doesn't try to match the literal string "search" as an id.

GET /                 — list all entries, sorted by name   (Task 6.3)
GET /search?q=        — keyword search via $text           (Task 6.5)
GET /{entry_id}       — full detail for one entry          (Task 6.3)
"""
import logging

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.db.mongo import get_database
from app.models.directory import (
    DirectoryEntryResponse,
    DirectoryListResponse,
    _make_full_entry,
    _make_list_item,
)

logger = logging.getLogger(__name__)
router = APIRouter()

COLLECTION = "departments_offices"


# ---------------------------------------------------------------------------
# GET /directory   — list all entries
# ---------------------------------------------------------------------------

@router.get("/", response_model=DirectoryListResponse)
async def list_entries():
    """
    Return all department/office entries for the university, sorted by name.
    No authentication required.
    """
    db = get_database()

    cursor = db[COLLECTION].find(
        {"university_id": settings.UNIVERSITY_ID},
        sort=[("name", 1)],
    )
    docs = await cursor.to_list(length=200)

    items = [_make_list_item(doc) for doc in docs]
    logger.debug("Directory list: %d entries", len(items))
    return DirectoryListResponse(entries=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /directory/search   — keyword search  (declared BEFORE /{entry_id})
# ---------------------------------------------------------------------------

@router.get("/search", response_model=DirectoryListResponse)
async def search_entries(
    q: str = Query(default="", max_length=500, description="Search keywords"),
):
    """
    Keyword search across name, services, and description using MongoDB $text.
    Empty query returns an empty list (not all entries — use GET / for that).
    No authentication required.
    """
    if not q or not q.strip():
        return DirectoryListResponse(entries=[], total=0)

    db = get_database()

    cursor = db[COLLECTION].find(
        {
            "$text": {"$search": q.strip()},
            "university_id": settings.UNIVERSITY_ID,
        },
        # Include text score so highest-relevance results come first
        {"score": {"$meta": "textScore"}},
        sort=[("score", {"$meta": "textScore"})],
    )
    docs = await cursor.to_list(length=50)

    items = [_make_list_item(doc) for doc in docs]
    logger.info("Directory search: q=%r  results=%d", q[:60], len(items))
    return DirectoryListResponse(entries=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /directory/{entry_id}   — full detail
# ---------------------------------------------------------------------------

@router.get("/{entry_id}", response_model=DirectoryEntryResponse)
async def get_entry(entry_id: str):
    """
    Return the full details for a single directory entry.
    No authentication required.
    404 if the entry does not exist.
    """
    db = get_database()

    try:
        oid = ObjectId(entry_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Directory entry not found.")

    doc = await db[COLLECTION].find_one(
        {"_id": oid, "university_id": settings.UNIVERSITY_ID}
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Directory entry not found.")

    logger.debug("Directory detail: id=%s  name=%r", entry_id, doc.get("name"))
    return _make_full_entry(doc)
