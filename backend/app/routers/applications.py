"""
Application generator router — /applications.
Implemented in Stage 5.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/generate", status_code=201)
async def generate_application():
    return {"detail": "Not yet implemented"}


@router.get("/")
async def list_applications():
    return {"detail": "Not yet implemented"}


@router.get("/{app_id}/pdf")
async def download_pdf(app_id: str):
    return {"detail": "Not yet implemented"}
