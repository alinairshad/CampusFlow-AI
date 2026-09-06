"""
Shared LLM chat completion client.

All Stage 3+ services (intent_classifier, rag_answer, action_plan,
application_generator) call this module instead of duplicating
httpx setup, error handling, and retry logic.

Exposes one async function:
    chat_completion(messages, model, temperature, max_tokens, json_mode)
        → str  (the assistant message content)
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Request timeout: generous for generation calls, LLMs can be slow
_TIMEOUT = httpx.Timeout(timeout=120.0, connect=10.0)

# ---------------------------------------------------------------------------
# Module-level shared client (connection pool reuse across requests)
# ---------------------------------------------------------------------------
# A single AsyncClient is created at import time and reused for all LLM calls
# within the same worker process, avoiding the per-call TCP handshake overhead
# (~30-80ms per call with a fresh client).  httpx.AsyncClient is thread-safe
# and concurrency-safe for async usage.
_llm_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return (or create) the shared LLM httpx client."""
    global _llm_client
    if _llm_client is None or _llm_client.is_closed:
        _llm_client = httpx.AsyncClient(timeout=_TIMEOUT)
    return _llm_client


class LLMError(Exception):
    """Base class for LLM client errors — carries an HTTP status code."""
    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


class LLMAuthError(LLMError):
    """401 — bad/missing API key."""


class LLMCreditError(LLMError):
    """402 — insufficient credits."""


class LLMRateLimitError(LLMError):
    """429 — rate limited."""


class LLMProviderError(LLMError):
    """5xx — upstream provider error."""


# ---------------------------------------------------------------------------
# Core call
# ---------------------------------------------------------------------------

async def chat_completion(
    messages: list[dict],
    *,
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> str:
    """
    Call the configured LLM chat completions endpoint.

    Parameters
    ----------
    messages    : OpenAI-format message list, e.g.
                  [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
    model       : override settings.CHAT_MODEL for this call
    temperature : 0.0 = deterministic, higher = more creative
    max_tokens  : maximum tokens in the response
    json_mode   : if True, adds response_format={"type":"json_object"} — use
                  when the prompt explicitly requests JSON output

    Returns
    -------
    The assistant's reply as a plain string (stripped).

    Raises
    ------
    LLMAuthError       on 401
    LLMCreditError     on 402
    LLMRateLimitError  on 429
    LLMProviderError   on 5xx
    LLMError           on any other non-200 or network error
    """
    url = f"{settings.LLM_API_BASE.rstrip('/')}/chat/completions"
    chosen_model = model or settings.CHAT_MODEL

    payload: dict = {
        "model": chosen_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    logger.debug(
        "LLM call: model=%s  messages=%d  json_mode=%s",
        chosen_model, len(messages), json_mode,
    )

    client = _get_client()
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
        raise LLMError("LLM request timed out after 120 s.") from exc
    except httpx.RequestError as exc:
        raise LLMError(f"Network error reaching LLM API: {exc}") from exc

    if response.status_code == 401:
        raise LLMAuthError(
            "LLM API returned 401 — check LLM_API_KEY in .env.",
            status_code=401,
        )
    if response.status_code == 402:
        raise LLMCreditError(
            "LLM API returned 402 — OpenRouter account has insufficient credits.",
            status_code=402,
        )
    if response.status_code == 429:
        raise LLMRateLimitError(
            "LLM API returned 429 — rate limited. Reduce request frequency.",
            status_code=429,
        )
    if response.status_code >= 500:
        raise LLMProviderError(
            f"LLM API returned {response.status_code} — provider error: "
            f"{response.text[:200]}",
            status_code=response.status_code,
        )
    if response.status_code != 200:
        raise LLMError(
            f"LLM API returned unexpected status {response.status_code}: "
            f"{response.text[:200]}",
            status_code=response.status_code,
        )

    body = response.json()

    # Validate response shape
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMError(
            f"Unexpected LLM response shape — could not extract content: "
            f"{str(body)[:300]}"
        ) from exc

    if content is None:
        raise LLMError("LLM returned a null content field (model may have refused).")

    usage = body.get("usage", {})
    logger.info(
        "LLM call complete: model=%s  prompt_tokens=%s  completion_tokens=%s",
        chosen_model,
        usage.get("prompt_tokens", "?"),
        usage.get("completion_tokens", "?"),
    )

    return content.strip()
