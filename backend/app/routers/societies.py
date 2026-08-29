"""
Student-facing societies router — /societies.

No authentication required — society listings are public (same pattern as /directory).

Route ordering: /search MUST be declared before /{society_id} to prevent
FastAPI matching the literal string "search" as a path parameter.

GET /                  — list all societies, sorted by name   (Task 12.3)
GET /search?q=         — keyword search via $text             (Task 12.4)
GET /{society_id}      — full detail for one society          (Task 12.3)
"""
import logging

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.db.mongo import get_database
from app.models.societies import (
    SocietyListResponse,
    SocietyResponse,
    _make_full_entry,
    _make_list_item,
)

logger = logging.getLogger(__name__)
router = APIRouter()

COLLECTION = "societies"


# ---------------------------------------------------------------------------
# GET /societies  — list all entries
# ---------------------------------------------------------------------------

@router.get("/", response_model=SocietyListResponse)
async def list_societies():
    """
    Return all society entries for the university, sorted by name.
    No authentication required.
    """
    db = get_database()

    cursor = db[COLLECTION].find(
        {"university_id": settings.UNIVERSITY_ID},
        sort=[("name", 1)],
    )
    docs = await cursor.to_list(length=200)

    items = [_make_list_item(doc) for doc in docs]
    logger.debug("Societies list: %d entries", len(items))
    return SocietyListResponse(societies=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /societies/search  — keyword search (BEFORE /{society_id})
# ---------------------------------------------------------------------------

@router.get("/search", response_model=SocietyListResponse)
async def search_societies(
    q: str = Query(default="", max_length=500, description="Search keywords"),
):
    """
    Keyword search across name, description, and category using MongoDB $text.
    Empty query returns an empty list.
    No authentication required.
    """
    if not q or not q.strip():
        return SocietyListResponse(societies=[], total=0)

    db = get_database()

    cursor = db[COLLECTION].find(
        {
            "$text": {"$search": q.strip()},
            "university_id": settings.UNIVERSITY_ID,
        },
        {"score": {"$meta": "textScore"}},
        sort=[("score", {"$meta": "textScore"})],
    )
    docs = await cursor.to_list(length=50)

    items = [_make_list_item(doc) for doc in docs]
    logger.info("Societies search: q=%r  results=%d", q[:60], len(items))
    return SocietyListResponse(societies=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /societies/{society_id}  — full detail (AFTER /search)
# ---------------------------------------------------------------------------

@router.get("/{society_id}", response_model=SocietyResponse)
async def get_society(society_id: str):
    """
    Return the full details for a single society entry.
    No authentication required.
    404 if the entry does not exist.
    """
    db = get_database()

    try:
        oid = ObjectId(society_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Society not found.")

    doc = await db[COLLECTION].find_one(
        {"_id": oid, "university_id": settings.UNIVERSITY_ID}
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Society not found.")

    logger.debug("Society detail: id=%s  name=%r", society_id, doc.get("name"))
    return _make_full_entry(doc)
