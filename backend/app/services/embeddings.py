"""
Embedding generation via OpenRouter's /embeddings endpoint.

Uses httpx (already in requirements.txt) with the OpenAI-compatible
request/response format. Batching is supported: `input` accepts a list
of strings in one call; `data[]` in the response is ordered by `index`.
"""
import logging
from typing import Union

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level shared client (connection pool reuse across requests)
# ---------------------------------------------------------------------------
_embed_client: httpx.AsyncClient | None = None


def _get_embed_client() -> httpx.AsyncClient:
    global _embed_client
    if _embed_client is None or _embed_client.is_closed:
        _embed_client = httpx.AsyncClient(timeout=60.0)
    return _embed_client


# ---------------------------------------------------------------------------
# Internal HTTP helper
# ---------------------------------------------------------------------------

async def _call_embeddings_api(input_payload: Union[str, list[str]]) -> list[dict]:
    """
    POST to the configured embeddings endpoint.

    Returns the `data` list from the response — each item is:
      {"embedding": list[float], "object": "embedding", "index": int}

    Raises
    ------
    PermissionError   on 401 (bad/missing API key)
    ValueError        on 402 (insufficient credits)
    RuntimeError      on 429 (rate limited) or 5xx (provider error)
    RuntimeError      on unexpected response shapes
    """
    url = f"{settings.LLM_API_BASE.rstrip('/')}/embeddings"

    payload = {
        "model": settings.EMBEDDING_MODEL,
        "input": input_payload,
        "encoding_format": "float",
    }

    client = _get_embed_client()
    try:
        response = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
        )
    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "Embedding API request timed out after 60 s. "
            "Try again or check OpenRouter status."
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"Network error reaching embedding API: {exc}") from exc

    # Surface clear, actionable errors for the most common failure modes
    if response.status_code == 401:
        raise PermissionError(
            "Embedding API returned 401 — check LLM_API_KEY in .env."
        )
    if response.status_code == 402:
        raise ValueError(
            "Embedding API returned 402 — OpenRouter account has insufficient credits."
        )
    if response.status_code == 429:
        raise RuntimeError(
            "Embedding API returned 429 — rate limited. "
            "Reduce batch size or add retry logic."
        )
    if response.status_code >= 500:
        raise RuntimeError(
            f"Embedding API returned {response.status_code} — provider error. "
            f"Response: {response.text[:200]}"
        )
    if response.status_code != 200:
        raise RuntimeError(
            f"Embedding API returned unexpected status {response.status_code}: "
            f"{response.text[:200]}"
        )

    body = response.json()

    # Validate response shape
    if "data" not in body or not isinstance(body["data"], list):
        raise RuntimeError(
            f"Unexpected embedding API response — 'data' list missing: {str(body)[:200]}"
        )

    return body["data"]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_embedding(text: str) -> list[float]:
    """
    Return a 1536-dimensional embedding vector for a single text string.

    Parameters
    ----------
    text : the text to embed (should be a non-empty string)

    Returns
    -------
    list[float] of length 1536
    """
    if not text or not text.strip():
        raise ValueError("Cannot embed an empty string.")

    data = await _call_embeddings_api(text)

    if not data or "embedding" not in data[0]:
        raise RuntimeError(
            f"Embedding API returned no embedding in data[0]: {str(data)[:200]}"
        )

    embedding = data[0]["embedding"]
    logger.debug(
        "Generated embedding: model=%s  dims=%d  text_preview=%r",
        settings.EMBEDDING_MODEL,
        len(embedding),
        text[:60],
    )
    return embedding


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Return embedding vectors for a batch of texts in one API call.

    OpenRouter accepts a list of strings under `input`, returning
    `data[]` ordered by `index`. Results are re-sorted by index before
    returning so the output order always matches the input order.

    Parameters
    ----------
    texts : list of non-empty strings

    Returns
    -------
    list[list[float]] — same length and order as `texts`
    """
    if not texts:
        return []

    # Validate all inputs before making the network call
    for i, t in enumerate(texts):
        if not t or not t.strip():
            raise ValueError(f"texts[{i}] is empty — cannot embed.")

    data = await _call_embeddings_api(texts)

    if len(data) != len(texts):
        raise RuntimeError(
            f"Embedding API returned {len(data)} embeddings for {len(texts)} inputs."
        )

    # Sort by `index` field to guarantee input order is preserved
    data_sorted = sorted(data, key=lambda item: item["index"])

    embeddings = []
    for item in data_sorted:
        if "embedding" not in item:
            raise RuntimeError(
                f"Embedding item missing 'embedding' field: {str(item)[:200]}"
            )
        embeddings.append(item["embedding"])

    logger.info(
        "Batch embeddings generated: model=%s  count=%d  dims=%d",
        settings.EMBEDDING_MODEL,
        len(embeddings),
        len(embeddings[0]) if embeddings else 0,
    )
    return embeddings
