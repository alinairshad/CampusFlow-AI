"""
Student router.

GET /students/me         — merged profile (user + student_profiles)
PUT /students/me         — update profile fields
GET /students/dashboard  — single aggregation: profile + recent apps + recent convs
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import CurrentUser, get_current_user
from app.db.mongo import get_database
from app.models.user import (
    DashboardApplicationItem,
    DashboardConversationItem,
    DashboardResponse,
    StudentProfileResponse,
    StudentProfileUpdateRequest,
)
from app.services.application_generator import APP_TYPE_LABELS

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_profile_or_404(db, user_id: str) -> dict:
    """Return the merged user+profile dict, or raise 404."""
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="User not found.")
    profile = await db["student_profiles"].find_one({"user_id": user_id})
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Student profile not found.")
    return user, profile


def _build_profile_response(user: dict, profile: dict) -> StudentProfileResponse:
    return StudentProfileResponse(
        user_id=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        university_id=user["university_id"],
        created_at=user["created_at"],
        name=profile["name"],
        department=profile["department"],
        semester=profile["semester"],
        batch=profile["batch"],
        interests=profile.get("interests", []),
        is_mentor=profile.get("is_mentor", False),
    )


# ---------------------------------------------------------------------------
# GET /students/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=StudentProfileResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Return the authenticated student's merged profile.
    Joins users + student_profiles — never exposes password_hash.
    """
    db = get_database()
    user, profile = await _get_profile_or_404(db, current_user.user_id)
    return _build_profile_response(user, profile)


# ---------------------------------------------------------------------------
# PUT /students/me
# ---------------------------------------------------------------------------

@router.put("/me", response_model=StudentProfileResponse)
async def update_me(
    body: StudentProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update profile-level fields (name, department, semester, batch, interests).
    Email, role, and university_id are never updatable via this endpoint.
    Only fields explicitly provided (non-None) are updated.
    """
    db = get_database()
    user, profile = await _get_profile_or_404(db, current_user.user_id)

    updates: dict = {}
    for field in ("name", "department", "semester", "batch", "interests"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val

    # is_mentor is a boolean toggle — must check explicitly for None, not just falsiness
    if body.is_mentor is not None:
        updates["is_mentor"] = body.is_mentor

    if updates:
        await db["student_profiles"].update_one(
            {"user_id": current_user.user_id},
            {"$set": updates},
        )
        # Re-fetch updated profile
        profile = await db["student_profiles"].find_one(
            {"user_id": current_user.user_id}
        )

    logger.info("Profile updated: student=%s  fields=%s",
                current_user.user_id, list(updates.keys()))
    return _build_profile_response(user, profile)


# ---------------------------------------------------------------------------
# GET /students/dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: CurrentUser = Depends(get_current_user)):
    """
    Single aggregated endpoint for the student dashboard.

    Returns in one call:
      - profile summary (user + student_profiles merged)
      - 5 most recent applications with status
      - 3 most recent conversation summaries

    All queries are filtered by student_id = current_user.user_id
    (req 9.4 — data isolation is enforced by the filter, not just trust).
    """
    db = get_database()
    student_id = current_user.user_id

    # ── Profile ───────────────────────────────────────────────────────────────
    user, profile = await _get_profile_or_404(db, student_id)
    profile_resp = _build_profile_response(user, profile)

    # ── Recent applications (5 most recent, any status) ───────────────────────
    app_cursor = db["applications"].find(
        {"student_id": student_id, "university_id": current_user.university_id},
        sort=[("created_at", -1)],
        limit=5,
    )
    app_docs = await app_cursor.to_list(length=5)
    recent_apps = [
        DashboardApplicationItem(
            id=str(doc["_id"]),
            application_type=doc["type"],
            type_label=APP_TYPE_LABELS.get(doc["type"], doc["type"]),
            status=doc["status"],
            created_at=doc["created_at"],
        )
        for doc in app_docs
    ]

    # ── Recent conversations (3 most recently updated) ────────────────────────
    conv_cursor = db["conversations"].find(
        {"student_id": student_id, "university_id": current_user.university_id},
        sort=[("updated_at", -1)],
        limit=3,
    )
    conv_docs = await conv_cursor.to_list(length=3)
    recent_convs = []
    for doc in conv_docs:
        messages = doc.get("messages", [])
        first_user = next((m for m in messages if m.get("role") == "user"), None)
        preview = (first_user["content"][:80] if first_user else "") + (
            "…" if first_user and len(first_user["content"]) > 80 else ""
        )
        recent_convs.append(
            DashboardConversationItem(
                id=str(doc["_id"]),
                first_message_preview=preview,
                message_count=len(messages),
                updated_at=doc["updated_at"],
            )
        )

    logger.info(
        "Dashboard loaded: student=%s  apps=%d  convs=%d",
        student_id, len(recent_apps), len(recent_convs),
    )

    return DashboardResponse(
        profile=profile_resp,
        recent_applications=recent_apps,
        recent_conversations=recent_convs,
    )
