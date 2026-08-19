"""
Unified search router — /search.
Implemented in Stage 6.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def unified_search(q: str = ""):
    return {"detail": "Not yet implemented"}
