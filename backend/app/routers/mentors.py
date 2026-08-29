"""
Mentor directory router — /mentors

GET /           — list all students with is_mentor=True  (Task 13.3)
GET /search     — keyword + department filter             (Task 13.4)

Both endpoints require a valid student JWT (Option A — auth-required,
not public, to protect student email addresses from being freely crawled).
Any authenticated user may browse (student or admin); the JWT is checked
only for authentication, not for a specific role.

Data source: student_profiles + users collections — no new collection.
"""
import logging
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.deps import CurrentUser, get_current_user
from app.core.config import settings
from app.db.mongo import get_database

logger = logging.getLogger(__name__)
router = APIRouter()

COLLECTION = "student_profiles"


# ---------------------------------------------------------------------------
# Response shapes (inline — no new model file needed)
# ---------------------------------------------------------------------------

class MentorListItem(BaseModel):
    """One mentor card — pulled from student_profiles + users."""
    user_id: str
    name: str
    department: str
    semester: str
    batch: str
    interests: list[str]
    contact_email: str           # from users collection


class MentorListResponse(BaseModel):
    mentors: list[MentorListItem]
    total: int


# ---------------------------------------------------------------------------
# Helper: join student_profiles with users to get email
# ---------------------------------------------------------------------------

async def _profiles_to_mentors(docs: list[dict], db) -> list[MentorListItem]:
    """
    Given a list of student_profile documents, fetch the corresponding email
    from the users collection and assemble MentorListItem objects.

    Uses a single $in query for all user_ids rather than N individual lookups.
    """
    if not docs:
        return []

    user_ids = [ObjectId(doc["user_id"]) for doc in docs]
    user_cursor = db["users"].find(
        {"_id": {"$in": user_ids}},
        {"_id": 1, "email": 1},
    )
    users_by_id = {str(u["_id"]): u["email"] async for u in user_cursor}

    items = []
    for doc in docs:
        uid = doc["user_id"]
        email = users_by_id.get(uid, "")
        items.append(MentorListItem(
            user_id=uid,
            name=doc["name"],
            department=doc["department"],
            semester=doc["semester"],
            batch=doc["batch"],
            interests=doc.get("interests", []),
            contact_email=email,
        ))
    return items


# ---------------------------------------------------------------------------
# GET /mentors  — full list, sorted by name
# ---------------------------------------------------------------------------

@router.get("/", response_model=MentorListResponse)
async def list_mentors(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Return all students who have enabled mentor availability,
    sorted by name, scoped to the current university.
    Requires a valid JWT (any authenticated user may browse).
    """
    db = get_database()

    cursor = db[COLLECTION].find(
        {
            "is_mentor": True,
            "university_id": settings.UNIVERSITY_ID,
        },
        sort=[("name", 1)],
    )
    docs = await cursor.to_list(length=200)

    items = await _profiles_to_mentors(docs, db)

    logger.info(
        "Mentor list: %d mentors returned (university=%s  requester=%s)",
        len(items), settings.UNIVERSITY_ID, current_user.user_id,
    )
    return MentorListResponse(mentors=items, total=len(items))


# ---------------------------------------------------------------------------
# GET /mentors/search  — keyword + department filter (Task 13.4 stub)
# Declared here so /search does not conflict with a future /{user_id} path.
# ---------------------------------------------------------------------------

@router.get("/search", response_model=MentorListResponse)
async def search_mentors(
    q: str = Query(default="", max_length=500, description="Keyword search across name and interests"),
    department: str = Query(default="", max_length=100, description="Exact department filter"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Search mentors by keyword (name/interests) and/or exact department.

    Behaviour:
      - q and department both empty → returns all mentors (same as GET /)
      - q only                      → $text search, all departments
      - department only             → all mentors in that department
      - q + department              → $text search within that department
      - empty q matches all mentors in the given department (no $text needed)

    Auth: requires valid JWT (any authenticated user).
    """
    db = get_database()

    q_stripped   = q.strip()
    dept_stripped = department.strip()

    # Build the filter — always scope to is_mentor=True + university_id
    filter_doc: dict = {
        "is_mentor": True,
        "university_id": settings.UNIVERSITY_ID,
    }

    if dept_stripped:
        # Exact case-insensitive match using a case-insensitive regex
        filter_doc["department"] = re.compile(
            f"^{re.escape(dept_stripped)}$", re.IGNORECASE
        )

    if q_stripped:
        # Add $text search predicate
        filter_doc["$text"] = {"$search": q_stripped}
        # Sort by text relevance when searching, then name as tiebreaker
        cursor = db[COLLECTION].find(
            filter_doc,
            {"score": {"$meta": "textScore"}},
            sort=[("score", {"$meta": "textScore"}), ("name", 1)],
        )
    else:
        # No keyword — sort by name only
        cursor = db[COLLECTION].find(filter_doc, sort=[("name", 1)])

    docs = await cursor.to_list(length=200)
    items = await _profiles_to_mentors(docs, db)

    logger.info(
        "Mentor search: q=%r  dept=%r  results=%d  requester=%s",
        q_stripped[:40], dept_stripped, len(items), current_user.user_id,
    )
    return MentorListResponse(mentors=items, total=len(items))
