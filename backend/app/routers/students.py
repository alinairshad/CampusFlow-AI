"""
Student router — /students/me (GET, PUT).
Implemented in Stage 1.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def get_me():
    return {"detail": "Not yet implemented"}


@router.put("/me")
async def update_me():
    return {"detail": "Not yet implemented"}
