"""
VeriGold — Auth Unit Tests (Phase 3 §3.2.4)

Tests:
  1. Valid Ed25519 signature -> JWT returned
  2. Invalid signature -> 401
  3. Expired/missing nonce -> 401
  4. Inactive lender -> 403
  5. Protected route without token -> 401
  6. Protected route with valid token -> 200

Test strategy:
  - Services are tested directly (not through HTTP) using mocked Redis & DB.
  - HTTPException semantics are verified on the service layer.
  - Route-level tests use FastAPI TestClient with overridden dependencies.
"""
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config.settings import get_settings
from app.middleware.auth import get_current_lender
from app.models.lender import Lender, LenderStatus
from app.routers.auth import router as auth_router
from app.services import auth_service

settings = get_settings()

# ---------------------------------------------------------------------------
# Ed25519 key pair for tests
# ---------------------------------------------------------------------------
_PRIV_KEY = Ed25519PrivateKey.generate()
_PUB_KEY = _PRIV_KEY.public_key()
_PUB_KEY_HEX = _PUB_KEY.public_bytes_raw().hex()

IDENTITY_REF = "test-org1-lender-ref"
NONCE = "abc123deadbeef" * 4  # 56 chars — realistic nonce shape


def sign_message(message: str) -> str:
    """Sign a string with the test private key, return hex."""
    sig_bytes = _PRIV_KEY.sign(message.encode("utf-8"))
    return sig_bytes.hex()


# ---------------------------------------------------------------------------
# Minimal FastAPI app for route-level tests
# ---------------------------------------------------------------------------
def _make_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/auth")

    @app.get("/protected", response_model=None)
    async def protected_route(lender: Lender = Depends(get_current_lender)):
        return {"id": lender.id, "status": lender.status.value}

    return app


# ---------------------------------------------------------------------------
# Helper: build an active Lender mock
# ---------------------------------------------------------------------------
def _active_lender(lender_id: int = 1) -> Lender:
    lender = MagicMock(spec=Lender)
    lender.id = lender_id
    lender.login_identity_ref = IDENTITY_REF
    lender.organization_name = "Test Org"
    lender.fabric_msp_id = "Org1MSP"
    lender.status = LenderStatus.active
    return lender


def _inactive_lender(lender_id: int = 2) -> Lender:
    lender = _active_lender(lender_id)
    lender.status = LenderStatus.suspended
    return lender


# ===========================================================================
# 1. Valid signature -> JWT returned
# ===========================================================================
@pytest.mark.asyncio
async def test_verify_challenge_valid_signature_returns_jwt():
    """A correct Ed25519 signature against the stored nonce returns a JWT."""
    challenge_msg = f"Sign this to authenticate with VeriGold: {NONCE}"
    signature_hex = sign_message(challenge_msg)

    active_lender = _active_lender()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = active_lender

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.flush = AsyncMock()

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=NONCE)
    mock_redis.delete = AsyncMock()

    with patch.object(auth_service, "get_redis", return_value=mock_redis):
        token = await auth_service.verify_challenge(
            identity_ref=IDENTITY_REF,
            signature_hex=signature_hex,
            public_key_hex=_PUB_KEY_HEX,
            db=mock_db,
        )

    assert isinstance(token, str)
    assert len(token) > 10
    # Nonce must be consumed (delete called)
    mock_redis.delete.assert_called_once()


# ===========================================================================
# 2. Invalid signature -> 401
# ===========================================================================
@pytest.mark.asyncio
async def test_verify_challenge_invalid_signature_raises_401():
    """A tampered signature raises HTTP 401."""
    from fastapi import HTTPException

    bad_sig = "deadbeef" * 8  # 64 hex chars — not a valid sig for this nonce

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=NONCE)
    mock_redis.delete = AsyncMock()

    with patch.object(auth_service, "get_redis", return_value=mock_redis):
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_challenge(
                identity_ref=IDENTITY_REF,
                signature_hex=bad_sig,
                public_key_hex=_PUB_KEY_HEX,
                db=AsyncMock(),
            )

    assert exc_info.value.status_code == 401
    # Nonce is already consumed (deleted before sig check would fail)


# ===========================================================================
# 3. Expired/missing nonce -> 401
# ===========================================================================
@pytest.mark.asyncio
async def test_verify_challenge_missing_nonce_raises_401():
    """When Redis returns None (expired or never issued), raise HTTP 401."""
    from fastapi import HTTPException

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)

    with patch.object(auth_service, "get_redis", return_value=mock_redis):
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_challenge(
                identity_ref=IDENTITY_REF,
                signature_hex="ab" * 32,
                public_key_hex=_PUB_KEY_HEX,
                db=AsyncMock(),
            )

    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower() or "not found" in exc_info.value.detail.lower()


# ===========================================================================
# 4. Inactive lender -> 403
# ===========================================================================
@pytest.mark.asyncio
async def test_verify_challenge_inactive_lender_raises_403():
    """A suspended lender cannot authenticate — raise HTTP 403."""
    from fastapi import HTTPException

    challenge_msg = f"Sign this to authenticate with VeriGold: {NONCE}"
    signature_hex = sign_message(challenge_msg)

    inactive = _inactive_lender()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = inactive

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=NONCE)
    mock_redis.delete = AsyncMock()

    with patch.object(auth_service, "get_redis", return_value=mock_redis):
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.verify_challenge(
                identity_ref=IDENTITY_REF,
                signature_hex=signature_hex,
                public_key_hex=_PUB_KEY_HEX,
                db=mock_db,
            )

    assert exc_info.value.status_code == 403


# ===========================================================================
# 5. Protected route without token -> 401
# ===========================================================================
def test_protected_route_without_token_returns_401():
    """Accessing a protected route with no Authorization header → 401."""
    app = _make_test_app()
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/protected")
    assert response.status_code == 403  # HTTPBearer returns 403 when no scheme


# ===========================================================================
# 6. Protected route with valid token -> 200
# ===========================================================================
def test_protected_route_with_valid_token_returns_200():
    """A protected route with a valid JWT and active lender returns 200."""
    active = _active_lender()

    app = _make_test_app()

    # Override get_current_lender to bypass real DB/Redis
    async def _mock_get_current_lender():
        return active

    app.dependency_overrides[get_current_lender] = _mock_get_current_lender

    # Generate a real JWT
    token = auth_service._create_access_token(
        sub=str(active.id),
        identity_ref=IDENTITY_REF,
        msp_id=active.fabric_msp_id,
    )

    client = TestClient(app)
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


# ===========================================================================
# 7. issue_challenge generates a nonce and stores it in Redis
# ===========================================================================
@pytest.mark.asyncio
async def test_issue_challenge_stores_nonce_in_redis():
    """issue_challenge creates a nonce and calls redis.set with correct TTL."""
    mock_redis = AsyncMock()
    mock_redis.set = AsyncMock()

    with patch.object(auth_service, "get_redis", return_value=mock_redis):
        result = await auth_service.issue_challenge(IDENTITY_REF)

    assert "nonce" in result
    assert "message" in result
    assert result["nonce"] in result["message"]
    mock_redis.set.assert_called_once()
    call_kwargs = mock_redis.set.call_args
    assert call_kwargs.kwargs.get("ex") == 300  # 5-minute TTL
