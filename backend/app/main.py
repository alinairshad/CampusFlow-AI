import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.mongo import connect_db, close_db
from app.routers import (
    auth,
    students,
    admin_documents,
    admin_directory,
    admin_societies,
    admin_stats,
    directory,
    societies,
    mentors,
    assistant,
    applications,
    search,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

app = FastAPI(
    title="CampusFlow AI",
    description="Intelligent university companion API",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# allow_origin_regex covers Vercel preview deployments (campus-flow-*-*.vercel.app)
# so that preview URLs work alongside the stable production domain.
# The stable domain is also listed explicitly in ALLOWED_ORIGINS (env var).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"https://campus-flow-[\w-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database lifecycle
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    await connect_db()


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


# ---------------------------------------------------------------------------
# Global exception handler — MongoDB not-initialised recovery
# ---------------------------------------------------------------------------
_DB_NOT_INIT_PREFIX = "Database not initialised"
_logger = logging.getLogger(__name__)

# Lock prevents concurrent requests from all calling connect_db() simultaneously
# during a cold-start window when _client is None.
_reconnect_lock = asyncio.Lock()


@app.exception_handler(RuntimeError)
async def db_not_initialised_handler(request: Request, exc: RuntimeError) -> JSONResponse:
    """
    Catch the RuntimeError raised by get_database() when _client is None
    (Atlas idle-timeout or cold-start race).

    The asyncio.Lock ensures only ONE reconnect attempt runs at a time.
    Concurrent requests that arrive while a reconnect is in progress wait
    for it to finish, then return 503 "please retry" — they don't each
    spawn a new Motor client.

    Recovery path:
      1. Acquire lock — other concurrent handlers queue behind this one.
      2. Re-check _client inside the lock (it may have been set by a
         concurrent handler that finished just before we acquired).
      3. If still None, attempt connect_db() (which itself retries with backoff).
      4. Return 503 "please retry" on success or failure — conservative
         choice to avoid double-inserts from re-running the original handler.
    """
    if not str(exc).startswith(_DB_NOT_INIT_PREFIX):
        raise exc

    _logger.warning("DB not initialised on %s %s — acquiring reconnect lock",
                    request.method, request.url.path)

    async with _reconnect_lock:
        # Re-check inside the lock: a prior waiter may have already reconnected
        from app.db.mongo import _client as current_client
        if current_client is not None:
            _logger.info("Reconnect already completed by concurrent handler — returning 503 retry")
            return JSONResponse(
                status_code=503,
                content={"detail": "Database reconnected. Please retry your request."},
                headers={"Retry-After": "1"},
            )

        try:
            await connect_db()
            _logger.info("Reconnect succeeded — returning 503 so client can retry")
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "Database reconnected after an idle timeout. "
                              "Please retry your request."
                },
                headers={"Retry-After": "1"},
            )
        except Exception as reconnect_exc:
            _logger.error("Reconnect failed: %s", reconnect_exc)
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "Database is temporarily unavailable. Please try again shortly."
                },
                headers={"Retry-After": "5"},
            )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(students.router, prefix="/students", tags=["students"])
app.include_router(admin_documents.router, prefix="/admin/documents", tags=["admin-documents"])
app.include_router(admin_directory.router, prefix="/admin/directory", tags=["admin-directory"])
app.include_router(admin_societies.router, prefix="/admin/societies", tags=["admin-societies"])
app.include_router(admin_stats.router, prefix="/admin/stats", tags=["admin-stats"])
app.include_router(directory.router, prefix="/directory", tags=["directory"])
app.include_router(societies.router, prefix="/societies", tags=["societies"])
app.include_router(mentors.router,   prefix="/mentors",   tags=["mentors"])
app.include_router(assistant.router, prefix="/assistant", tags=["assistant"])
app.include_router(applications.router, prefix="/applications", tags=["applications"])
app.include_router(search.router, prefix="/search", tags=["search"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
