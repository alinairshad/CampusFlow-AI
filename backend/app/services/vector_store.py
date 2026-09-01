"""
Atlas Vector Search query and insert wrappers.

The `$vectorSearch` aggregation stage requires a Vector Search index
to exist on the `document_chunks` collection in Atlas. This index is
created manually via the Atlas UI — see the JSON definition in Task 2.5
notes / README. The index name is hardcoded as VECTOR_INDEX_NAME below.

Standard (non-vector) indexes — (university_id, category) compound —
are created programmatically in mongo.py _create_indexes().
"""
import logging
from datetime import datetime, timezone

from bson import ObjectId

from app.db.mongo import get_database

logger = logging.getLogger(__name__)

# Must match the name you give the index in Atlas UI exactly
VECTOR_INDEX_NAME = "document_chunks_vector_index"
CHUNKS_COLLECTION = "document_chunks"


# ---------------------------------------------------------------------------
# Insert
# ---------------------------------------------------------------------------

async def insert_chunks(chunks: list[dict]) -> None:
    """
    Insert document chunk documents into `document_chunks`.

    Each dict in `chunks` must contain:
        document_id   : str  (ref to documents._id)
        university_id : str
        category      : str  (DocumentCategory value)
        chunk_index   : int
        chunk_text    : str
        embedding     : list[float]   (1536 dims)
        created_at    : datetime (UTC)

    Parameters
    ----------
    chunks : list of dicts ready to insert (built by the upload endpoint)
    """
    if not chunks:
        return

    db = get_database()
    result = await db[CHUNKS_COLLECTION].insert_many(chunks, ordered=False)
    logger.info(
        "Inserted %d chunks (document_id=%s)",
        len(result.inserted_ids),
        chunks[0].get("document_id"),
    )


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

async def search_similar(
    query_embedding: list[float],
    university_id: str,
    category: str | None = None,
    top_k: int = 5,
    min_score: float = 0.7,
) -> list[dict]:
    """
    Retrieve the top-k most similar chunks using Atlas Vector Search.

    Uses the `$vectorSearch` aggregation stage with an optional pre-filter
    on `university_id` (always applied) and `category` (applied when given).

    The pre-filter narrows the candidate set before the ANN search, which
    is both faster and more accurate than post-filtering.

    Parameters
    ----------
    query_embedding : 1536-dim float vector from generate_embedding()
    university_id   : always filtered — no cross-university leakage
    category        : optional — when provided, limits to that category
    top_k           : number of results to return (default 5)
    min_score       : minimum cosine similarity to include (default 0.7)

    Returns
    -------
    List of dicts with keys:
        chunk_text    : str
        document_id   : str
        category      : str
        chunk_index   : int
        score         : float  (cosine similarity)
    """
    db = get_database()

    # Build the pre-filter document
    pre_filter: dict = {"university_id": {"$eq": university_id}}
    if category:
        pre_filter["category"] = {"$eq": category}

    # numCandidates should be >= 10 × top_k for good recall; cap at 1000
    num_candidates = min(max(top_k * 10, 50), 1000)

    pipeline = [
        {
            "$vectorSearch": {
                "index": VECTOR_INDEX_NAME,
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": num_candidates,
                "limit": top_k * 2,      # fetch extras before score filtering
                "filter": pre_filter,
            }
        },
        # Attach the search score so we can threshold it
        {
            "$addFields": {
                "score": {"$meta": "vectorSearchScore"}
            }
        },
        # Drop results below the similarity threshold
        {
            "$match": {
                "score": {"$gte": min_score}
            }
        },
        # Final limit after threshold filtering
        {
            "$limit": top_k
        },
        # Return only what the RAG pipeline needs — no raw embeddings
        {
            "$project": {
                "_id": 0,
                "chunk_text": 1,
                "document_id": 1,
                "category": 1,
                "chunk_index": 1,
                "score": 1,
            }
        },
    ]

    cursor = db[CHUNKS_COLLECTION].aggregate(pipeline)
    results = await cursor.to_list(length=top_k)

    logger.info(
        "Vector search: university=%s  category=%s  top_k=%d  results_returned=%d",
        university_id,
        category or "any",
        top_k,
        len(results),
    )
    return results


# ---------------------------------------------------------------------------
# Keyword / regex fallback search
# ---------------------------------------------------------------------------

async def search_keyword(
    query: str,
    university_id: str,
    category: str | None = None,
    top_k: int = 5,
    keyword_score: float = 0.60,
) -> list[dict]:
    """
    Fallback keyword search using MongoDB regex on ``chunk_text``.

    Used when vector search returns no results above the similarity threshold
    — typically for queries that are short abbreviation-heavy strings whose
    embeddings don't score well against any chunk but whose literal text
    IS present in a chunk (e.g. "BSSE fee", "BSCS tuition").

    Strategy
    --------
    - Extract individual tokens from the query (≥ 2 chars, alphanumeric).
    - For each token build a case-insensitive regex.
    - Score each candidate chunk by how many tokens it contains (0–1 range).
    - Return only chunks that match ALL tokens (AND logic); fall back to ANY
      (OR logic) if AND yields nothing.

    Parameters
    ----------
    query         : original or rewritten query string
    university_id : always filtered — no cross-university leakage
    category      : optional document category filter
    top_k         : max results to return
    keyword_score : synthetic similarity score assigned to keyword hits

    Returns
    -------
    Same shape as ``search_similar``:
        [{"chunk_text", "document_id", "category", "chunk_index", "score"}, ...]
    """
    db = get_database()

    # Tokenise: keep meaningful tokens only (≥2 chars, letters/digits/.)
    import re
    tokens = [
        t for t in re.split(r"[\s,;:]+", query.strip())
        if len(t) >= 2 and re.search(r"[A-Za-z0-9]", t)
    ]
    if not tokens:
        return []

    # Build per-token regex conditions
    regex_conditions = [
        {"chunk_text": {"$regex": re.escape(tok), "$options": "i"}}
        for tok in tokens
    ]

    base_filter: dict = {"university_id": {"$eq": university_id}}
    if category:
        base_filter["category"] = {"$eq": category}

    # Try AND first (all tokens must appear)
    and_filter = {**base_filter, "$and": regex_conditions}
    cursor = db[CHUNKS_COLLECTION].find(
        and_filter,
        {"_id": 0, "chunk_text": 1, "document_id": 1,
         "category": 1, "chunk_index": 1},
        limit=top_k,
    )
    results = await cursor.to_list(length=top_k)

    # If AND yields nothing, fall back to OR (any token matches)
    if not results and len(tokens) > 1:
        or_filter = {**base_filter, "$or": regex_conditions}
        cursor = db[CHUNKS_COLLECTION].find(
            or_filter,
            {"_id": 0, "chunk_text": 1, "document_id": 1,
             "category": 1, "chunk_index": 1},
            limit=top_k,
        )
        results = await cursor.to_list(length=top_k)

    # Attach a synthetic score so downstream code can treat these uniformly
    for r in results:
        r["score"] = keyword_score

    logger.info(
        "Keyword search: university=%s  tokens=%s  results=%d",
        university_id, tokens, len(results),
    )
    return results


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

async def delete_chunks_by_document(document_id: str) -> int:
    """
    Remove all chunks associated with a document.

    Parameters
    ----------
    document_id : string form of the document's MongoDB _id

    Returns
    -------
    Number of chunks deleted.
    """
    db = get_database()
    result = await db[CHUNKS_COLLECTION].delete_many({"document_id": document_id})
    logger.info(
        "Deleted %d chunks for document_id=%s",
        result.deleted_count,
        document_id,
    )
    return result.deleted_count
