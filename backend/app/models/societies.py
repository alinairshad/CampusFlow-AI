"""
Pydantic models for Society (University Societies).

Maps to the `societies` collection defined in design.md section 6.
Follows the same pattern as DepartmentOffice in models/directory.py.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ---------------------------------------------------------------------------
# Category enum (Requirement 12.1)
# ---------------------------------------------------------------------------

class SocietyCategory(str, Enum):
    TECH          = "Tech"
    SPORTS        = "Sports"
    LITERARY      = "Literary"
    ARTS          = "Arts"
    SOCIAL_WELFARE = "Social Welfare"
    CULTURAL      = "Cultural"
    OTHER         = "Other"


# ---------------------------------------------------------------------------
# DB document shape
# ---------------------------------------------------------------------------

class SocietyInDB(BaseModel):
    """Shape of a document in the `societies` collection."""
    id: Optional[str] = None            # stringified MongoDB _id
    university_id: str
    name: str
    category: SocietyCategory
    description: str
    how_to_join: str
    contact_email: str
    social_media_link: Optional[str] = None   # e.g. Instagram/Facebook URL
    faculty_advisor: Optional[str] = None     # faculty advisor name
    updated_at: datetime

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class SocietyCreateRequest(BaseModel):
    """Body accepted by POST /admin/societies."""
    name: str
    category: SocietyCategory
    description: str
    how_to_join: str
    contact_email: EmailStr
    social_media_link: Optional[str] = None
    faculty_advisor: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank.")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("description must not be blank.")
        return v.strip()

    @field_validator("how_to_join")
    @classmethod
    def how_to_join_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("how_to_join must not be blank.")
        return v.strip()

    @field_validator("social_media_link")
    @classmethod
    def social_media_link_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            return stripped if stripped else None
        return v

    @field_validator("faculty_advisor")
    @classmethod
    def faculty_advisor_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            stripped = v.strip()
            return stripped if stripped else None
        return v


class SocietyUpdateRequest(BaseModel):
    """
    Body accepted by PUT /admin/societies/{id}.
    All fields are optional — only provided fields are updated.
    """
    name: Optional[str] = None
    category: Optional[SocietyCategory] = None
    description: Optional[str] = None
    how_to_join: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    social_media_link: Optional[str] = None
    faculty_advisor: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank.")
        return v.strip() if v else v

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("description must not be blank.")
        return v.strip() if v else v

    @field_validator("how_to_join")
    @classmethod
    def how_to_join_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("how_to_join must not be blank.")
        return v.strip() if v else v


# ---------------------------------------------------------------------------
# Response shapes
# ---------------------------------------------------------------------------

class SocietyResponse(BaseModel):
    """Full entry — returned by GET /societies/{id} and admin write operations."""
    id: str
    university_id: str
    name: str
    category: SocietyCategory
    description: str
    how_to_join: str
    contact_email: str
    social_media_link: Optional[str] = None
    faculty_advisor: Optional[str] = None
    updated_at: datetime


class SocietyListItem(BaseModel):
    """
    Summary item — returned in list and search results.
    Shows enough for a card: name, category, one-line description preview, id.
    """
    id: str
    name: str
    category: SocietyCategory
    description_preview: str   # first 100 chars of description
    contact_email: str
    updated_at: datetime


class SocietyListResponse(BaseModel):
    societies: list[SocietyListItem]
    total: int


# ---------------------------------------------------------------------------
# Helpers: build response objects from raw DB documents
# ---------------------------------------------------------------------------

def _make_list_item(doc: dict) -> SocietyListItem:
    desc = doc.get("description", "")
    preview = desc[:100] + ("…" if len(desc) > 100 else "")
    return SocietyListItem(
        id=str(doc["_id"]),
        name=doc["name"],
        category=doc["category"],
        description_preview=preview,
        contact_email=doc["contact_email"],
        updated_at=doc["updated_at"],
    )


def _make_full_entry(doc: dict) -> SocietyResponse:
    return SocietyResponse(
        id=str(doc["_id"]),
        university_id=doc["university_id"],
        name=doc["name"],
        category=doc["category"],
        description=doc["description"],
        how_to_join=doc["how_to_join"],
        contact_email=doc["contact_email"],
        social_media_link=doc.get("social_media_link"),
        faculty_advisor=doc.get("faculty_advisor"),
        updated_at=doc["updated_at"],
    )
