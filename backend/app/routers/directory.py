"""
Student-facing directory router — /directory.
Implemented in Stage 6.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_entries():
    return {"detail": "Not yet implemented"}


@router.get("/search")
async def search_entries(q: str = ""):
    return {"detail": "Not yet implemented"}


@router.get("/{entry_id}")
async def get_entry(entry_id: str):
    return {"detail": "Not yet implemented"}
