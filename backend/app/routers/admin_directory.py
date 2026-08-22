"""
Admin directory management router — /admin/directory.

POST /           — create a directory entry  (admin only)
PUT  /{entry_id} — update a directory entry  (admin only)
DELETE /{entry_id} — delete a directory entry (admin only)
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.deps import CurrentUser, require_role
from app.db.mongo import get_database
from app.models.directory import (
    DirectoryEntryCreateRequest,
    DirectoryEntryResponse,
    DirectoryEntryUpdateRequest,
    _make_full_entry,
)

logger = logging.getLogger(__name__)
router = APIRouter()

COLLECTION = "departments_offices"


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

async def _get_entry_or_404(db, entry_id: str) -> dict:
    """Fetch a directory entry by id, scoped to the university. Raises 404 if absent."""
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
    return doc


# ---------------------------------------------------------------------------
# POST /admin/directory
# ---------------------------------------------------------------------------

@router.post("/", status_code=201, response_model=DirectoryEntryResponse)
async def create_directory_entry(
    body: DirectoryEntryCreateRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """Create a new department/office entry in the university directory."""
    db = get_database()
    now = datetime.now(timezone.utc)

    doc = {
        "university_id": settings.UNIVERSITY_ID,
        "name": body.name,
        "location": body.location,
        "working_hours": body.working_hours,
        "contact": body.contact,
        "services": body.services,
        "category": body.category,
        "description": body.description,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "updated_at": now,
    }

    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id

    logger.info(
        "Directory entry created: id=%s  name=%r  admin=%s",
        result.inserted_id, body.name, current_user.user_id,
    )
    return _make_full_entry(doc)


# ---------------------------------------------------------------------------
# PUT /admin/directory/{entry_id}
# ---------------------------------------------------------------------------

@router.put("/{entry_id}", response_model=DirectoryEntryResponse)
async def update_directory_entry(
    entry_id: str,
    body: DirectoryEntryUpdateRequest,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Update an existing directory entry.
    Only fields that are explicitly provided are updated (partial update).
    """
    db = get_database()

    # Confirm existence before updating
    await _get_entry_or_404(db, entry_id)

    # Build $set payload from non-None fields only
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    for field in ("name", "location", "working_hours", "contact", "services",
                  "category", "description", "latitude", "longitude"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    await db[COLLECTION].update_one(
        {"_id": ObjectId(entry_id)},
        {"$set": updates},
    )

    updated_doc = await db[COLLECTION].find_one({"_id": ObjectId(entry_id)})

    logger.info(
        "Directory entry updated: id=%s  fields=%s  admin=%s",
        entry_id, list(updates.keys()), current_user.user_id,
    )
    return _make_full_entry(updated_doc)


# ---------------------------------------------------------------------------
# DELETE /admin/directory/{entry_id}
# ---------------------------------------------------------------------------

@router.delete("/{entry_id}", status_code=204)
async def delete_directory_entry(
    entry_id: str,
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Delete a directory entry. Returns 204 No Content on success.
    Returns 404 if the entry does not exist.
    """
    db = get_database()
    doc = await _get_entry_or_404(db, entry_id)

    await db[COLLECTION].delete_one({"_id": ObjectId(entry_id)})

    logger.info(
        "Directory entry deleted: id=%s  name=%r  admin=%s",
        entry_id, doc.get("name"), current_user.user_id,
    )
    # 204 — no body
