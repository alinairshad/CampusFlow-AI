"""
FastAPI dependencies: get_current_user and require_role.

get_current_user decodes the JWT and returns a CurrentUser dataclass —
no DB round-trip. Routes that need the full profile fetch it explicitly.
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token

bearer_scheme = HTTPBearer()


@dataclass
class CurrentUser:
    """Lightweight identity object decoded from the JWT payload."""
    user_id: str
    role: str
    university_id: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """
    Validate the Bearer JWT and return the decoded identity.
    Raises 401 if the token is missing, malformed, or expired.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # All three claims are required — a token missing any of them is invalid
    try:
        return CurrentUser(
            user_id=payload["sub"],
            role=payload["role"],
            university_id=payload["university_id"],
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing required claims.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_role(role: str):
    """
    Return a FastAPI dependency that enforces a specific role.
    Raises 403 if the authenticated user's role does not match.
    Usage: Depends(require_role("admin"))
    """
    async def _check(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return _check
