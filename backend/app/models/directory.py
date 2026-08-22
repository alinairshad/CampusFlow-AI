"""
Pydantic models for DepartmentOffice (University Directory).

Maps to the `departments_offices` collection defined in design.md section 6.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# DB document shape
# ---------------------------------------------------------------------------

class DepartmentOfficeInDB(BaseModel):
    """Shape of a document in the `departments_offices` collection."""
    id: Optional[str] = None            # stringified MongoDB _id
    university_id: str
    name: str
    location: str                        # building/room description
    working_hours: str                   # e.g. "Mon–Fri 9 AM–5 PM"
    contact: str                         # phone and/or email
    services: list[str]                  # list of services offered (min 1)
    category: Optional[str] = None       # e.g. "Finance", "Academic" — free text
    description: Optional[str] = None    # optional longer blurb
    # Future map support per design.md §12 — present but never required
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    updated_at: datetime

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class DirectoryEntryCreateRequest(BaseModel):
    """Body accepted by POST /admin/directory."""
    name: str
    location: str
    working_hours: str
    contact: str
    services: list[str]
    category: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank.")
        return v.strip()

    @field_validator("services")
    @classmethod
    def services_not_empty(cls, v: list[str]) -> list[str]:
        filtered = [s.strip() for s in v if s.strip()]
        if not filtered:
            raise ValueError("At least one service must be provided.")
        return filtered


class DirectoryEntryUpdateRequest(BaseModel):
    """
    Body accepted by PUT /admin/directory/{id}.
    All fields are optional — only provided fields are updated.
    """
    name: Optional[str] = None
    location: Optional[str] = None
    working_hours: Optional[str] = None
    contact: Optional[str] = None
    services: Optional[list[str]] = None
    category: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank.")
        return v.strip() if v else v

    @field_validator("services")
    @classmethod
    def services_not_empty(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            filtered = [s.strip() for s in v if s.strip()]
            if not filtered:
                raise ValueError("At least one service must be provided.")
            return filtered
        return v


# ---------------------------------------------------------------------------
# Response shapes
# ---------------------------------------------------------------------------

class DirectoryEntryResponse(BaseModel):
    """Full entry — returned by GET /directory/{id} and admin write operations."""
    id: str
    university_id: str
    name: str
    location: str
    working_hours: str
    contact: str
    services: list[str]
    category: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    updated_at: datetime


class DirectoryListItem(BaseModel):
    """
    Summary item — returned in list and search results.
    Per req 8.4: name, category, one-line service description + link (id).
    """
    id: str
    name: str
    category: Optional[str] = None
    location: str
    contact: str
    working_hours: str
    service_summary: str    # first service, or joined first two
    updated_at: datetime


class DirectoryListResponse(BaseModel):
    entries: list[DirectoryListItem]
    total: int


# ---------------------------------------------------------------------------
# Helper: build a DirectoryListItem from a raw DB document
# ---------------------------------------------------------------------------

def _make_list_item(doc: dict) -> DirectoryListItem:
    services = doc.get("services", [])
    if len(services) == 0:
        summary = ""
    elif len(services) == 1:
        summary = services[0]
    else:
        summary = f"{services[0]}, {services[1]}"
        if len(services) > 2:
            summary += f" +{len(services) - 2} more"
    return DirectoryListItem(
        id=str(doc["_id"]),
        name=doc["name"],
        category=doc.get("category"),
        location=doc["location"],
        contact=doc["contact"],
        working_hours=doc["working_hours"],
        service_summary=summary,
        updated_at=doc["updated_at"],
    )


def _make_full_entry(doc: dict) -> DirectoryEntryResponse:
    return DirectoryEntryResponse(
        id=str(doc["_id"]),
        university_id=doc["university_id"],
        name=doc["name"],
        location=doc["location"],
        working_hours=doc["working_hours"],
        contact=doc["contact"],
        services=doc.get("services", []),
        category=doc.get("category"),
        description=doc.get("description"),
        latitude=doc.get("latitude"),
        longitude=doc.get("longitude"),
        updated_at=doc["updated_at"],
    )
