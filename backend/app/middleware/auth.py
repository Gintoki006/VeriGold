"""
VeriGold — JWT Auth Middleware

Provides:
  get_current_lender(token, db) -> Lender
    FastAPI dependency injected into all protected route handlers.

Security:
  - Decodes and verifies JWT using settings.JWT_SECRET.
  - Loads lender from DB; re-checks status == active on every request.
  - Raises HTTP 401 on any token error (expired, tampered, missing).
  - Raises HTTP 403 if lender account was deactivated after token issuance.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.db.database import get_db
from app.models.lender import Lender, LenderStatus

settings = get_settings()

_bearer_scheme = HTTPBearer(auto_error=True)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_lender(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Lender:
    """
    FastAPI dependency: decode JWT and return the active Lender.

    Usage:
        @router.get("/protected")
        async def handler(lender: Lender = Depends(get_current_lender)):
            ...
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        lender_id_str: str | None = payload.get("sub")
        if lender_id_str is None:
            raise _CREDENTIALS_EXCEPTION
        lender_id = int(lender_id_str)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, ValueError):
        raise _CREDENTIALS_EXCEPTION

    # Re-query DB every request — catches deactivations after token issuance
    stmt = select(Lender).where(Lender.id == lender_id)
    result = await db.execute(stmt)
    lender: Lender | None = result.scalar_one_or_none()

    if lender is None:
        raise _CREDENTIALS_EXCEPTION

    if lender.status != LenderStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lender account is not active.",
        )

    return lender
