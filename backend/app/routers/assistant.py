"""
AI Assistant router — /assistant/query and conversation history.
Implemented in Stages 3–4.
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/query")
async def query_assistant():
    return {"detail": "Not yet implemented"}


@router.get("/conversations")
async def list_conversations():
    return {"detail": "Not yet implemented"}


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    return {"detail": "Not yet implemented"}
