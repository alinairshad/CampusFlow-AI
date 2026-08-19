"""
Admin directory management router — /admin/directory.
Implemented in Stage 6.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/", status_code=201)
async def create_directory_entry():
    return {"detail": "Not yet implemented"}


@router.put("/{entry_id}")
async def update_directory_entry(entry_id: str):
    return {"detail": "Not yet implemented"}


@router.delete("/{entry_id}")
async def delete_directory_entry(entry_id: str):
    return {"detail": "Not yet implemented"}
