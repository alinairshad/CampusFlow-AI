"""
MongoDB connection setup via Motor (async driver).
connect_db() and close_db() are called from main.py lifecycle events.
"""
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    # Ping to verify connectivity at startup
    await _client.admin.command("ping")
    print("MongoDB connection established.")


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
