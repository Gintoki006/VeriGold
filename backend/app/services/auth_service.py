"""
VeriGold — Auth Service

Implements the two-step lender authentication protocol:
  1. issue_challenge  — generates a one-time nonce stored in Redis (TTL 300 s)
  2. verify_challenge — verifies Ed25519 signature, issues JWT

Security invariants:
  - Nonces are single-use (deleted after verification — replay prevention).
  - JWT payload never contains plaintext Aadhaar.
  - Inactive lenders receive HTTP 403; unknown identity_ref gets created on
    first successful login so lenders don't need manual DB provisioning.
  - Signature verification uses the cryptography library's Ed25519 primitives.
"""
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models.lender import Lender, LenderStatus

logger = logging.getLogger(__name__)
settings = get_settings()

_NONCE_PREFIX = "auth:nonce:"
_NONCE_TTL = 300  # seconds — 5 minutes


# ---------------------------------------------------------------------------
# Redis helpers — module-level singleton pool
# ---------------------------------------------------------------------------
_redis_pool: aioredis.Redis | None = None
_local_nonces: dict[str, tuple[str, float]] = {}


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=3.0,
            socket_connect_timeout=3.0,
            health_check_interval=30,
            retry_on_timeout=True,
        )
    return _redis_pool


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def issue_challenge(identity_ref: str) -> dict:
    """
    Generate a one-time nonce and store it in Redis with a 5-minute TTL.

    Returns:
        {"nonce": "...", "challenge_id": "...", "message": "Sign this to authenticate with VeriGold: ..."}
    """
    if not identity_ref or len(identity_ref) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="identity_ref must be a non-empty string ≤ 128 chars",
        )

    nonce = secrets.token_hex(32)
    nonce_key = f"{_NONCE_PREFIX}{identity_ref}"
    _local_nonces[nonce_key] = (nonce, time.time() + _NONCE_TTL)
    try:
        redis = await get_redis()
        await redis.set(nonce_key, nonce, ex=_NONCE_TTL)
    except Exception as exc:
        logger.warning("Redis store nonce failed, stored in memory fallback: %s", exc)

    return {
        "nonce": nonce,
        "challenge_id": identity_ref,
        "message": f"Sign this to authenticate with VeriGold: {nonce}",
    }


_INSTITUTION_NAMES = {
    "Org1MSP": "Shri Lakshmi Finance Ltd",
    "Org2MSP": "Sunrise Gold Loans",
    "Org3MSP": "Muthoot Quick Gold",
    "Org4MSP": "Manappuram Finance Ltd",
}


async def verify_challenge(
    identity_ref: str,
    signature_hex: str,
    public_key_hex: str,
    db: AsyncSession,
    msp_id: str | None = None,
) -> str:
    """
    Verify the Ed25519 signature against the stored nonce, then issue a JWT.

    Raises:
        HTTPException 401 — nonce missing/expired or signature invalid
        HTTPException 403 — lender account is not active
    Returns:
        JWT access token string
    """
    import base64

    # --- Fetch & consume nonce (one-time use) ---
    nonce_key = f"{_NONCE_PREFIX}{identity_ref}"
    nonce = None
    try:
        redis = await get_redis()
        nonce = await redis.get(nonce_key)
        if nonce:
            try:
                await redis.delete(nonce_key)
            except Exception:
                pass
    except Exception as exc:
        logger.warning("Redis get nonce failed: %s", exc)

    if not nonce and nonce_key in _local_nonces:
        stored_val, exp = _local_nonces.pop(nonce_key, (None, 0))
        if exp >= time.time():
            nonce = stored_val
    else:
        _local_nonces.pop(nonce_key, None)

    if not nonce:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Challenge not found or expired. Request a new challenge.",
        )

    # --- Verify Ed25519 signature ---
    message = f"Sign this to authenticate with VeriGold: {nonce}"
    try:
        try:
            pub_key_bytes = bytes.fromhex(public_key_hex)
        except Exception:
            pub_key_bytes = base64.b64decode(public_key_hex)

        try:
            sig_bytes = bytes.fromhex(signature_hex)
        except Exception:
            sig_bytes = base64.b64decode(signature_hex)

        pub_key = Ed25519PublicKey.from_public_bytes(pub_key_bytes)
        pub_key.verify(sig_bytes, message.encode("utf-8"))
    except (InvalidSignature, ValueError) as exc:
        logger.warning("Ed25519 signature verification failed for identity_ref=%s: %s", identity_ref, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature verification failed.",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error during signature verification for identity_ref=%s: %s", identity_ref, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature verification failed.",
        ) from exc

    target_msp = msp_id or "Org1MSP"
    target_org_name = _INSTITUTION_NAMES.get(target_msp, f"Demo Lender ({target_msp})")

    # --- Look up lender, create or update on login ---
    # First: find canonical institutional record by fabric_msp_id
    stmt = (
        select(Lender)
        .where(Lender.fabric_msp_id == target_msp)
        .order_by(Lender.id.asc())
        .limit(1)
    )
    result = await db.execute(stmt)
    lender: Lender | None = result.scalar_one_or_none()

    # Second: fallback by login_identity_ref if not found by msp
    if lender is None:
        stmt_ref = (
            select(Lender)
            .where(Lender.login_identity_ref == identity_ref)
            .order_by(Lender.id.asc())
            .limit(1)
        )
        res_ref = await db.execute(stmt_ref)
        lender = res_ref.scalar_one_or_none()

    if lender is None:
        # Auto-create as active for development / demo mode
        lender = Lender(
            login_identity_ref=identity_ref,
            fabric_msp_id=target_msp,
            organization_name=target_org_name,
            status=LenderStatus.active,
        )
        db.add(lender)
        await db.commit()
        await db.refresh(lender)
    else:
        # Ensure organization name is synchronized
        if target_org_name and lender.organization_name != target_org_name:
            lender.organization_name = target_org_name
            await db.commit()
            await db.refresh(lender)

    if lender.status != LenderStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lender account is not active. Contact the VeriGold administrator.",
        )

    # --- Issue JWT ---
    token = _create_access_token(
        sub=str(lender.id),
        identity_ref=identity_ref,
        msp_id=lender.fabric_msp_id,
    )
    return token


def _create_access_token(sub: str, identity_ref: str, msp_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRY_MINUTES
    )
    payload = {
        "sub": sub,
        "identity_ref": identity_ref,
        "msp_id": msp_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
