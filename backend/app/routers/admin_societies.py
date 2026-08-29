"""
Admin societies management router — /admin/societies.

POST /           — create a society entry  (admin only)
PUT  /{society_id} — update a society entry  (admin only)
DELETE /{society_id} — delete a society entry (admin only)

Follows the same pattern as admin_directory.py.
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.deps import CurrentUser, require_role
from app.db.mongo import get_database
from app.models.societies import (
    SocietyCreateRequest,
    SocietyResponse,
    SocietyUpdateRequest,
    _make_full_entry,
)

logger = logging.getLogger(__name__)
router = APIRouter()

COLLECTION = "societies"


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

async def _get_society_or_404(db, society_id: str) -> dict:
    """Fetch a society by id, scoped to the university. Raises 404 if absent."""
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
    return doc


# ---------------------------------------------------------------------------
# POST /admin/societies
# ---------------------------------------------------------------------------

@router.post("/", status_code=201, response_model=SocietyResponse)
async def create_society(
    body: SocietyCreateRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """Create a new society entry."""
    db = get_database()
    now = datetime.now(timezone.utc)

    doc = {
        "university_id": settings.UNIVERSITY_ID,
        "name": body.name,
        "category": body.category.value,
        "description": body.description,
        "how_to_join": body.how_to_join,
        "contact_email": str(body.contact_email),
        "social_media_link": body.social_media_link,
        "faculty_advisor": body.faculty_advisor,
        "updated_at": now,
    }

    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id

    logger.info("Society created: id=%s  name=%r  admin=%s",
                result.inserted_id, body.name, current_user.user_id)
    return _make_full_entry(doc)


# ---------------------------------------------------------------------------
# PUT /admin/societies/{society_id}
# ---------------------------------------------------------------------------

@router.put("/{society_id}", response_model=SocietyResponse)
async def update_society(
    society_id: str,
    body: SocietyUpdateRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Update an existing society entry (partial update — only provided fields change).
    """
    db = get_database()
    await _get_society_or_404(db, society_id)

    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    for field in ("name", "description", "how_to_join",
                  "social_media_link", "faculty_advisor"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val
    if body.category is not None:
        updates["category"] = body.category.value
    if body.contact_email is not None:
        updates["contact_email"] = str(body.contact_email)

    await db[COLLECTION].update_one(
        {"_id": ObjectId(society_id)},
        {"$set": updates},
    )
    updated_doc = await db[COLLECTION].find_one({"_id": ObjectId(society_id)})

    logger.info("Society updated: id=%s  fields=%s  admin=%s",
                society_id, list(updates.keys()), current_user.user_id)
    return _make_full_entry(updated_doc)


# ---------------------------------------------------------------------------
# DELETE /admin/societies/{society_id}
# ---------------------------------------------------------------------------

@router.delete("/{society_id}", status_code=204)
async def delete_society(
    society_id: str,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """Delete a society entry. Returns 204 No Content on success."""
    db = get_database()
    doc = await _get_society_or_404(db, society_id)

    await db[COLLECTION].delete_one({"_id": ObjectId(society_id)})

    logger.info("Society deleted: id=%s  name=%r  admin=%s",
                society_id, doc.get("name"), current_user.user_id)
    # 204 — no body
