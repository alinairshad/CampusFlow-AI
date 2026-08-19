"""
RAG answer generation pipeline.
Embeds query → retrieves chunks → generates grounded answer.
Implemented in Stage 3.
"""


async def rewrite_query(query: str) -> str:
    """Optionally rewrite a short or ambiguous query before retrieval."""
    raise NotImplementedError("Implemented in Stage 3")


async def generate_rag_answer(
    query: str,
    university_id: str,
    category: str | None = None,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Full RAG pipeline: embed → retrieve → threshold check → generate.
    Returns: {"answer": str, "sources": list[dict], "found": bool}
    """
    raise NotImplementedError("Implemented in Stage 3")
