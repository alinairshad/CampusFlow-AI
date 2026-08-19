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
    logger.info("Database indexes ensured.")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        print("MongoDB connection closed.")


def get_database():
    """Return the application database handle."""
    if _client is None:
        raise RuntimeError("Database not initialised — call connect_db() first.")
    return _client[settings.DATABASE_NAME]
