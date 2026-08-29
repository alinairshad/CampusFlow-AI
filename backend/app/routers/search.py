"""
Unified search router — GET /search?q=

Combines three parallel queries (req 8.1, 12.9):
  1. Vector search over document_chunks (semantic, embedding-based)
  2. $text search over departments_offices (keyword-based)
  3. $text search over societies (keyword-based)

Returns three named sections:
  {
    "document_results":  [...],  # chunk hits — document_id, category, chunk_preview, score
    "directory_results": [...],  # office/dept entries — id, name, category, service_summary, location
    "society_results":   [...],  # society entries — id, name, category, description_preview
    "query": str,
    "message": str | None,       # set when ALL three sections are empty
  }

No authentication required — search is public.
"""
import asyncio
import logging

from fastapi import APIRouter, Query

from app.core.config import settings
from app.db.mongo import get_database
from app.models.directory import _make_list_item as _dir_list_item
from app.models.societies import _make_list_item as _soc_list_item
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
    Unified search across knowledge-base documents, university directory,
    and university societies.
    """
    q = q.strip()
    if not q:
        return {
            "query": "",
            "document_results": [],
            "directory_results": [],
            "society_results": [],
            "message": "Please enter a search query.",
        }

    # Run all three searches in parallel
    doc_results, dir_results, soc_results = await asyncio.gather(
        _search_documents(q),
        _search_directory(q),
        _search_societies(q),
        return_exceptions=True,
    )

    if isinstance(doc_results, Exception):
        logger.error("Document search failed: %s", doc_results)
        doc_results = []

    if isinstance(dir_results, Exception):
        logger.error("Directory search failed: %s", dir_results)
        dir_results = []

    if isinstance(soc_results, Exception):
        logger.error("Societies search failed: %s", soc_results)
        soc_results = []

    total = len(doc_results) + len(dir_results) + len(soc_results)
    message = "No results found across documents, directory, or societies." if total == 0 else None

    logger.info(
        "Unified search: q=%r  doc=%d  dir=%d  soc=%d",
        q[:60], len(doc_results), len(dir_results), len(soc_results),
    )

    return {
        "query": q,
        "document_results": doc_results,
        "directory_results": dir_results,
        "society_results": soc_results,
        "message": message,
    }


# ---------------------------------------------------------------------------
# Internal search helpers
# ---------------------------------------------------------------------------

async def _search_documents(q: str) -> list[dict]:
    """Vector search over document_chunks — up to 5 results."""
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
            "document_id":   r["document_id"],
            "category":      r["category"],
            "chunk_preview": r["chunk_text"][:200],
            "score":         round(r.get("score", 0.0), 4),
        }
        for r in results
    ]


async def _search_directory(q: str) -> list[dict]:
    """$text search over departments_offices — up to 10 results."""
    db = get_database()
    cursor = db["departments_offices"].find(
        {"$text": {"$search": q}, "university_id": settings.UNIVERSITY_ID},
        {"score": {"$meta": "textScore"}},
        sort=[("score", {"$meta": "textScore"})],
    )
    docs = await cursor.to_list(length=10)

    results = []
    for doc in docs:
        item = _dir_list_item(doc)
        results.append({
            "id":              item.id,
            "name":            item.name,
            "category":        item.category,
            "service_summary": item.service_summary,
            "location":        item.location,
        })
    return results


async def _search_societies(q: str) -> list[dict]:
    """
    $text search over societies — up to 10 results.
    Returns {id, name, category, description_preview} per hit (req 12.9).
    """
    db = get_database()
    cursor = db["societies"].find(
        {"$text": {"$search": q}, "university_id": settings.UNIVERSITY_ID},
        {"score": {"$meta": "textScore"}},
        sort=[("score", {"$meta": "textScore"})],
    )
    docs = await cursor.to_list(length=10)

    results = []
    for doc in docs:
        item = _soc_list_item(doc)
        results.append({
            "id":                  item.id,
            "name":                item.name,
            "category":            item.category,
            "description_preview": item.description_preview,
        })
    return results
