"""
Atlas Vector Search query and insert wrappers.
Implemented in Stage 2.
"""


async def insert_chunks(chunks: list[dict]) -> None:
    """Insert document chunks with embeddings into the vector store."""
    raise NotImplementedError("Implemented in Stage 2")


async def search_similar(
    query_embedding: list[float],
    university_id: str,
    category: str | None = None,
    top_k: int = 5,
    min_score: float = 0.7,
) -> list[dict]:
    """Retrieve the top-k most similar chunks from Atlas Vector Search."""
    raise NotImplementedError("Implemented in Stage 2")


async def delete_chunks_by_document(document_id: str) -> None:
    """Remove all chunks associated with a document."""
    raise NotImplementedError("Implemented in Stage 2")
