"""
Embedding generation via the configured LLM provider API.
Implemented in Stage 2.
"""


async def generate_embedding(text: str) -> list[float]:
    """Return an embedding vector for the given text."""
    raise NotImplementedError("Implemented in Stage 2")


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Return embedding vectors for a batch of texts."""
    raise NotImplementedError("Implemented in Stage 2")
