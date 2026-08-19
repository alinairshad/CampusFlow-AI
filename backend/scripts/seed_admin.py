"""
Seed script — create the initial admin account.

Usage (from backend/ directory):
    python scripts/seed_admin.py

Required environment variables (set in .env or inline):
    ADMIN_EMAIL     e.g. admin@university.edu
    ADMIN_PASSWORD  must satisfy the same 8-char, letter+digit rule
    ADMIN_NAME      e.g. "System Admin"

The script is idempotent: if an account with ADMIN_EMAIL already exists,
it prints a message and exits cleanly without creating a duplicate.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Ensure the backend/ package root is on the path when run as a script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"ERROR: environment variable {name!r} is not set or empty.", file=sys.stderr)
        sys.exit(1)
    return value


def _validate_password(password: str) -> None:
    if len(password) < 8:
        print("ERROR: ADMIN_PASSWORD must be at least 8 characters.", file=sys.stderr)
        sys.exit(1)
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        print("ERROR: ADMIN_PASSWORD must contain at least one letter and one digit.", file=sys.stderr)
        sys.exit(1)


async def seed() -> None:
    admin_email = _require_env("ADMIN_EMAIL").lower()
    admin_password = _require_env("ADMIN_PASSWORD")
    admin_name = _require_env("ADMIN_NAME")

    _validate_password(admin_password)

    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=10000)
    db = client[settings.DATABASE_NAME]

    try:
        # Idempotency check — exit cleanly if admin already exists
        existing = await db["users"].find_one({"email": admin_email})
        if existing:
            print(f"Admin already exists: {admin_email} (id={existing['_id']}) — nothing to do.")
            return

        now = datetime.now(timezone.utc)

        # Insert user doc with role: "admin"
        user_doc = {
            "university_id": settings.UNIVERSITY_ID,
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": now,
        }
        user_result = await db["users"].insert_one(user_doc)
        user_id = user_result.inserted_id

        # Insert a minimal student_profiles-style record so the schema is consistent.
        # Admins don't have a department/semester/batch, so we use placeholder values.
        profile_doc = {
            "user_id": str(user_id),
            "university_id": settings.UNIVERSITY_ID,
            "name": admin_name,
            "department": "Administration",
            "semester": "N/A",
            "batch": "N/A",
            "interests": [],
            "created_at": now,
        }
        await db["student_profiles"].insert_one(profile_doc)

        print(f"Admin account created successfully.")
        print(f"  Email        : {admin_email}")
        print(f"  Name         : {admin_name}")
        print(f"  Role         : admin")
        print(f"  University ID: {settings.UNIVERSITY_ID}")
        print(f"  User ID      : {user_id}")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed())
