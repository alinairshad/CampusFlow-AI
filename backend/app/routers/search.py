"""
Unified search router — GET /search?q=

Combines two parallel queries (req 8.1):
  1. Vector search over document_chunks (semantic, embedding-based)
  2. $text search over departments_offices (keyword-based)

Returns two named sections (assumption B):
  {
    "document_results": [...],   # chunk hits with source document reference
    "directory_results": [...],  # office/department summaries
    "query": str,                # echoed back for UI display
    "message": str | None,       # set when both sections are empty
  }

No authentication required — search is public (assumption D).
"""
import asyncio
import logging

from fastapi import APIRouter, Query

from app.core.config import settings
from app.db.mongo import get_database
from app.models.directory import _make_list_item
from app.services.embeddings import generate_embedding
from app.services.vector_store import search_similar

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# GET /search
# ---------------------------------------------------------------------------

@router.get("/")
async def unified_search(
    q: str = Query(default="", max_length=500, description="Natural-language search query"),
):
    """
    Unified search across knowledge-base documents and the university directory.

    Returns:
      document_results: up to 5 chunk hits with chunk_preview, document_id, category, score
      directory_results: up to 10 matching directory entries (name, category, service_summary, id)
    """
    q = q.strip()
    if not q:
        return {
            "query": "",
            "document_results": [],
            "directory_results": [],
            "message": "Please enter a search query.",
        }

    # ── Run both searches in parallel ────────────────────────────────────────
    doc_results, dir_results = await asyncio.gather(
        _search_documents(q),
        _search_directory(q),
        return_exceptions=True,
    )

    # Handle individual search failures gracefully — one failure shouldn't
    # suppress the other section's results
    if isinstance(doc_results, Exception):
        logger.error("Document search failed: %s", doc_results)
        doc_results = []

    if isinstance(dir_results, Exception):
        logger.error("Directory search failed: %s", dir_results)
        dir_results = []

    total = len(doc_results) + len(dir_results)
    message = "No results found." if total == 0 else None

    logger.info(
        "Unified search: q=%r  doc_hits=%d  dir_hits=%d",
        q[:60], len(doc_results), len(dir_results),
    )

    return {
        "query": q,
        "document_results": doc_results,
        "directory_results": dir_results,
        "message": message,
    }


# ---------------------------------------------------------------------------
# Internal search helpers
# ---------------------------------------------------------------------------

async def _search_documents(q: str) -> list[dict]:
    """
    Embed the query and run Atlas Vector Search over document_chunks.

    Returns up to 5 results, each with:
      document_id, category, chunk_preview (first 200 chars), score
    """
    try:
        embedding = await generate_embedding(q)
    except Exception as exc:
        logger.warning("Embedding failed for unified search: %s", exc)
        return []

    results = await search_similar(
        query_embedding=embedding,
        university_id=settings.UNIVERSITY_ID,
        category=None,
        top_k=5,
        min_score=settings.RAG_MIN_SCORE,
    )

    return [
        {
            "document_id": r["document_id"],
            "category":    r["category"],
            "chunk_preview": r["chunk_text"][:200],
            "score":       round(r.get("score", 0.0), 4),
        }
        for r in results
    ]


async def _search_directory(q: str) -> list[dict]:
    """
    Run MongoDB $text search over departments_offices.

    Returns up to 10 results, each with:
      id, name, category, service_summary, location
    Per req 8.4 format: summary + link (id for client to construct /directory/{id}).
    """
    db = get_database()

    cursor = db["departments_offices"].find(
        {
            "$text": {"$search": q},
            "university_id": settings.UNIVERSITY_ID,
        },
        {"score": {"$meta": "textScore"}},
        sort=[("score", {"$meta": "textScore"})],
    )
    docs = await cursor.to_list(length=10)

    results = []
    for doc in docs:
        item = _make_list_item(doc)
        results.append({
            "id":              item.id,
            "name":            item.name,
            "category":        item.category,
            "service_summary": item.service_summary,
            "location":        item.location,
        })
    return results
