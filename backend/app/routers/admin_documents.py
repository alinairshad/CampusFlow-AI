"""
Admin document management router — /admin/documents.
Implemented in Stage 2.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/", status_code=201)
async def upload_document():
    return {"detail": "Not yet implemented"}


@router.get("/")
async def list_documents():
    return {"detail": "Not yet implemented"}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    return {"detail": "Not yet implemented"}
