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
