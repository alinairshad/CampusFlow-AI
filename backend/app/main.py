import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

logging.basicConfig(level=logging.INFO)

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
    allow_origins=settings.ALLOWED_ORIGINS,
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
