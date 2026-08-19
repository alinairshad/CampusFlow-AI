"""
Authentication router — /auth/register and /auth/login.
Implemented in Stage 1.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/register", status_code=201)
async def register():
    # Stage 1 implementation
    return {"detail": "Not yet implemented"}


@router.post("/login")
async def login():
    # Stage 1 implementation
    return {"detail": "Not yet implemented"}
