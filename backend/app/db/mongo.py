"""
MongoDB connection setup via Motor (async driver).
connect_db() and close_db() are called from main.py lifecycle events.
"""
import logging

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """
    Attempt to connect to MongoDB and verify with a ping.

    Stage-0 safety net: if the connection fails (e.g. Atlas not yet
    configured), log a warning and leave _client as None so the server
    can still start.  All endpoints that call get_database() will raise
    a RuntimeError until a real connection is established — that is the
    correct behaviour for later stages.
    """
    global _client
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,  # fail fast; don't block startup
        )
        await client.admin.command("ping")
        _client = client
        logger.info("MongoDB connection established.")
        await _create_indexes(client[settings.DATABASE_NAME])
    except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as exc:
        _client = None
        logger.warning(
            "MongoDB not connected — set MONGODB_URI in .env once Atlas is set up. "
            "(%s: %s)",
            type(exc).__name__,
            exc,
        )


async def _create_indexes(db) -> None:
    """Create all required indexes. Safe to call on every startup (idempotent)."""
    # users.email — unique index (enforces no duplicate accounts)
    await db["users"].create_index("email", unique=True)

    # document_chunks — compound index for filtered retrieval by university + category.
    # This is a standard B-tree index (NOT the vector index — that one is created
    # manually in Atlas UI as a Search Index, not via create_index()).
    await db["document_chunks"].create_index(
        [("university_id", 1), ("category", 1)],
        name="document_chunks_university_category",
    )

    # document_chunks — index on document_id for fast chunk deletion
    await db["document_chunks"].create_index(
        "document_id",
        name="document_chunks_document_id",
    )

    # documents — index on university_id for admin document listing
    await db["documents"].create_index(
        [("university_id", 1), ("uploaded_at", -1)],
        name="documents_university_uploaded_at",
    )

    # applications — index for student application history queries
    await db["applications"].create_index(
        [("student_id", 1), ("created_at", -1)],
        name="applications_student_created_at",
    )

    # departments_offices — compound index for university-scoped listing + sorting
    await db["departments_offices"].create_index(
        [("university_id", 1), ("name", 1)],
        name="departments_offices_university_name",
    )

    # departments_offices — text index for keyword search (req 7.3, 8.1)
    # Covers name, services[], and description fields.
    # Standard MongoDB text index — no manual Atlas setup needed (unlike vector index).
    await db["departments_offices"].create_index(
        [("name", "text"), ("services", "text"), ("description", "text")],
        name="departments_offices_text",
        default_language="english",
    )

    logger.info("Database indexes ensured.")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_database():
    """Return the application database handle."""
    if _client is None:
        raise RuntimeError("Database not initialised — call connect_db() first.")
    return _client[settings.DATABASE_NAME]
