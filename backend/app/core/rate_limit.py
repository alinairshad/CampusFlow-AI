"""
Per-user in-memory rate limiter — sliding window algorithm.

Design (confirmed in planning):
    - Single Render instance → in-memory dict is correct, no Redis needed.
    - State resets on server restart (acceptable for MVP).
    - Uses a collections.deque to store the timestamps of the last N requests
      per user. Old timestamps are popped when the window expires.

Usage:
    from app.core.rate_limit import rate_limit_user

    @router.post("/my-endpoint")
    async def my_endpoint(
        _: None = Depends(rate_limit_user("assistant_query", max_calls=10, window_seconds=60)),
        current_user: CurrentUser = Depends(get_current_user),
    ):
        ...

The factory key ("assistant_query") namespaces limits so different endpoints
have independent counters per user — a user burning their /assistant/query
limit does not affect their /applications/generate allowance.
"""
import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.core.deps import CurrentUser, get_current_user

# Global state — one dict per limit namespace: { user_id -> deque[float] }
_buckets: dict[str, dict[str, deque]] = defaultdict(lambda: defaultdict(deque))
# Lock not needed: FastAPI runs a single asyncio event loop per process;
# coroutine access to the dict is effectively single-threaded.


class RateLimiter:
    """
    Sliding-window rate limiter.

    Parameters
    ----------
    namespace      : string key to namespace this limiter's counters
    max_calls      : maximum number of calls allowed in the window
    window_seconds : length of the sliding window in seconds
    """

    def __init__(self, namespace: str, max_calls: int, window_seconds: int):
        self.namespace = namespace
        self.max_calls = max_calls
        self.window_seconds = window_seconds

    def is_allowed(self, user_id: str) -> tuple[bool, int]:
        """
        Check whether this user may make another call right now.

        Returns
        -------
        (allowed: bool, retry_after: int)
            retry_after is seconds until the oldest call expires (only
            meaningful when allowed is False).
        """
        now = time.monotonic()
        window_start = now - self.window_seconds
        bucket = _buckets[self.namespace][user_id]

        # Evict timestamps outside the current window
        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= self.max_calls:
            # Oldest timestamp in the window
            retry_after = max(1, int(bucket[0] - window_start) + 1)
            return False, retry_after

        bucket.append(now)
        return True, 0


# ---------------------------------------------------------------------------
# Pre-built limiter instances
# ---------------------------------------------------------------------------
_assistant_limiter = RateLimiter(
    namespace="assistant_query",
    max_calls=10,
    window_seconds=60,
)

_application_limiter = RateLimiter(
    namespace="application_generate",
    max_calls=5,
    window_seconds=60,
)


# ---------------------------------------------------------------------------
# FastAPI dependency factory
# ---------------------------------------------------------------------------

def rate_limit_user(limiter: RateLimiter) -> Callable:
    """
    Return a FastAPI dependency that enforces the given RateLimiter
    for the authenticated user.

    Raises HTTP 429 with a Retry-After header when the limit is exceeded.

    Usage:
        Depends(rate_limit_user(_assistant_limiter))
    """
    async def _check(current_user: CurrentUser = Depends(get_current_user)):
        allowed, retry_after = limiter.is_allowed(current_user.user_id)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded: max {limiter.max_calls} requests "
                    f"per {limiter.window_seconds} seconds. "
                    f"Try again in {retry_after} second(s)."
                ),
                headers={"Retry-After": str(retry_after)},
            )
        return current_user

    return _check


# ---------------------------------------------------------------------------
# Named dependency shortcuts for the two rate-limited endpoints
# ---------------------------------------------------------------------------

# Use with:  Depends(limit_assistant_query)
limit_assistant_query     = rate_limit_user(_assistant_limiter)

# Use with:  Depends(limit_application_generate)
limit_application_generate = rate_limit_user(_application_limiter)
