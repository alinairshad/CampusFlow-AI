"""
Pydantic models for User and StudentProfile.

Covers:
- DB document shapes (UserInDB, StudentProfileInDB)
- Request bodies (UserRegisterRequest, UserLoginRequest, StudentProfileUpdateRequest)
- Response shapes (TokenResponse, StudentProfileResponse)
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator


# ---------------------------------------------------------------------------
# DB document shapes (what is stored in MongoDB)
# ---------------------------------------------------------------------------

class UserInDB(BaseModel):
    """Shape of a document in the `users` collection."""
    id: Optional[str] = None          # stringified MongoDB _id, populated after insert
    university_id: str
    email: str
    password_hash: str
    role: Literal["student", "admin"]
    created_at: datetime

    model_config = {"populate_by_name": True}


class StudentProfileInDB(BaseModel):
    """Shape of a document in the `student_profiles` collection."""
    id: Optional[str] = None          # stringified MongoDB _id
    user_id: str                       # ref to users._id
    university_id: str
    name: str
    department: str
    semester: str
    batch: str
    interests: list[str] = []
    created_at: datetime

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    """Body accepted by POST /auth/register."""
    name: str
    email: EmailStr
    password: str
    department: str
    semester: str
    batch: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        has_letter = any(c.isalpha() for c in v)
        has_digit = any(c.isdigit() for c in v)
        if not has_letter or not has_digit:
            raise ValueError("Password must contain at least one letter and one digit.")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be blank.")
        return v.strip()


class UserLoginRequest(BaseModel):
    """Body accepted by POST /auth/login."""
    email: EmailStr
    password: str


class StudentProfileUpdateRequest(BaseModel):
    """Body accepted by PUT /students/me — only profile fields are updatable."""
    name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    batch: Optional[str] = None
    interests: Optional[list[str]] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name must not be blank.")
        return v.strip() if v else v


# ---------------------------------------------------------------------------
# Response shapes (never expose password_hash)
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    """Returned by POST /auth/login on success."""
    access_token: str
    token_type: str = "bearer"


class StudentProfileResponse(BaseModel):
    """
    Returned by GET /students/me.
    Merges user fields (email, role, created_at) with profile fields
    so the dashboard has everything it needs in one call.
    """
    # from users collection
    user_id: str
    email: str
    role: Literal["student", "admin"]
    university_id: str
    created_at: datetime

    # from student_profiles collection
    name: str
    department: str
    semester: str
    batch: str
    interests: list[str] = []


class DashboardApplicationItem(BaseModel):
    """One application row in the dashboard widget."""
    id: str
    application_type: str
    type_label: str
    status: str
    created_at: datetime


class DashboardConversationItem(BaseModel):
    """One conversation row in the dashboard widget."""
    id: str
    first_message_preview: str
    message_count: int
    updated_at: datetime


class DashboardResponse(BaseModel):
    """
    Single aggregated response for GET /students/dashboard.
    Returns profile + 5 recent applications + 3 recent conversations
    in one call so the frontend makes only one network request on load.
    """
    profile: StudentProfileResponse
    recent_applications: list[DashboardApplicationItem]
    recent_conversations: list[DashboardConversationItem]
