"""
Admin stats router — GET /admin/stats

Returns basic usage counts for the admin dashboard overview (req 10.2):
  total_documents        — processed documents in the knowledge base
  total_students         — registered student accounts
  total_queries          — total user-role messages across all conversations
                           (most accurate proxy for "queries handled", counting
                           multi-turn follow-ups individually — assumption A)
  total_directory_entries — department/office entries in the directory

All four counts run in parallel via asyncio.gather for minimal latency.
Protected by require_role("admin").
"""
import asyncio
import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import settings
from app.core.deps import CurrentUser, require_role
from app.db.mongo import get_database

logger = logging.getLogger(__name__)
router = APIRouter()


class AdminStatsResponse(BaseModel):
    total_documents: int
    total_students: int
    total_queries: int
    total_directory_entries: int


@router.get("/", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user: CurrentUser = Depends(require_role("admin")),
):
    """
    Return basic usage statistics for the admin dashboard.

    All counts are scoped to the configured university_id.
    Queries run in parallel — single network round-trip to MongoDB.
    """
    db = get_database()
    uid = settings.UNIVERSITY_ID

    async def count_documents():
        return await db["documents"].count_documents(
            {"university_id": uid, "status": "processed"}
        )

    async def count_students():
        return await db["users"].count_documents(
            {"university_id": uid, "role": "student"}
        )

    async def count_queries():
        """
        Count all user-role messages across all conversations.
        Uses aggregation: $unwind messages → $match role=="user" → $count.
        """
        pipeline = [
            {"$match": {"university_id": uid}},
            {"$unwind": "$messages"},
            {"$match": {"messages.role": "user"}},
            {"$count": "total"},
        ]
        cursor = db["conversations"].aggregate(pipeline)
        result = await cursor.to_list(length=1)
        return result[0]["total"] if result else 0

    async def count_directory():
        return await db["departments_offices"].count_documents(
            {"university_id": uid}
        )

    total_docs, total_students, total_queries, total_dir = await asyncio.gather(
        count_documents(),
        count_students(),
        count_queries(),
        count_directory(),
    )

    logger.info(
        "Admin stats: docs=%d  students=%d  queries=%d  directory=%d",
        total_docs, total_students, total_queries, total_dir,
    )

    return AdminStatsResponse(
        total_documents=total_docs,
        total_students=total_students,
        total_queries=total_queries,
        total_directory_entries=total_dir,
    )
