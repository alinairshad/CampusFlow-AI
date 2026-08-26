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
    admin_stats,
    directory,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
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


@app.exception_handler(RuntimeError)
async def db_not_initialised_handler(request: Request, exc: RuntimeError) -> JSONResponse:
    """
    Catch the RuntimeError raised by get_database() when _client is None
    (Atlas idle-timeout or startup failure).

    Recovery path:
      1. Attempt one reconnect via connect_db().
      2. If reconnect succeeds → return 503 "please retry" so the client
         retries without risk of double-insert from a re-run handler.
      3. If reconnect also fails → return 503 "database temporarily unavailable".

    Returning 503 (not silently retrying the original handler) is deliberately
    conservative: the original handler may have partially executed before the
    error, so re-running it could cause side effects (e.g. double-inserts).
    """
    if not str(exc).startswith(_DB_NOT_INIT_PREFIX):
        # Not a DB initialisation error — let FastAPI handle it normally
        raise exc

    _logger.warning("DB not initialised on %s %s — attempting reconnect",
                    request.method, request.url.path)

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
app.include_router(admin_stats.router, prefix="/admin/stats", tags=["admin-stats"])
app.include_router(directory.router, prefix="/directory", tags=["directory"])
app.include_router(assistant.router, prefix="/assistant", tags=["assistant"])
app.include_router(applications.router, prefix="/applications", tags=["applications"])
app.include_router(search.router, prefix="/search", tags=["search"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
