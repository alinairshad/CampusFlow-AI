"""
Authentication router — /auth/register and /auth/login.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongo import get_database
from app.models.user import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post("/register", status_code=201)
async def register(body: UserRegisterRequest):
    """
    Register a new student account.

    - Role is always "student" — admin accounts are created via seed script only.
    - Returns {id, email} on success. No token issued; client must call /auth/login.
    - 409 if email already exists.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    # Build the user document
    user_doc = {
        "university_id": settings.UNIVERSITY_ID,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "role": "student",
        "created_at": now,
    }

    # Insert user — the unique index on email catches duplicates
    try:
        user_result = await db["users"].insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_id = user_result.inserted_id

    # Insert student profile — roll back user doc if this fails
    profile_doc = {
        "user_id": str(user_id),
        "university_id": settings.UNIVERSITY_ID,
        "name": body.name,
        "department": body.department,
        "semester": body.semester,
        "batch": body.batch,
        "interests": [],
        "created_at": now,
    }

    try:
        await db["student_profiles"].insert_one(profile_doc)
    except Exception as exc:
        # Roll back the user document so the DB stays consistent
        logger.error("Profile insert failed after user insert — rolling back user %s: %s", user_id, exc)
        await db["users"].delete_one({"_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again.",
        )

    logger.info("New student registered: %s (id=%s)", body.email, user_id)
    return {"id": str(user_id), "email": body.email.lower()}


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
async def login(body: UserLoginRequest):
    """
    Authenticate a user and issue a JWT access token.

    Returns a generic 401 for both "email not found" and "wrong password"
    (requirement 1.5 — do not reveal which field was incorrect).
    """
    db = get_database()

    # Look up user by email (case-insensitive — stored lowercase)
    user = await db["users"].find_one({"email": body.email.lower()})

    # Deliberate: same error message whether email is absent or password is wrong
    _invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None:
        raise _invalid

    if not verify_password(body.password, user["password_hash"]):
        raise _invalid

    # Build JWT payload (assumption A from planning)
    token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["role"],
        "university_id": user["university_id"],
    })

    logger.info("User logged in: %s (role=%s)", user["email"], user["role"])
    return TokenResponse(access_token=token)
