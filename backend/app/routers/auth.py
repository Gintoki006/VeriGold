"""
VeriGold — Auth Router

Implements:
  POST /api/auth/challenge  — issue a one-time nonce for Ed25519 signing
  POST /api/auth/verify     — verify signature, return JWT
  POST /api/auth/logout     — stateless 204 (JWT cannot be invalidated server-side)
  GET  /api/auth/me         — return current lender info from JWT

Security decisions:
  - Logout is stateless: JWT validity window is short (JWT_EXPIRY_MINUTES).
    True revocation requires a Redis denylist — deferred to post-MVP if needed.
  - /me requires a valid token; lender info comes from DB, not just the JWT,
    so stale/deactivated lenders see 403 immediately.
"""
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.lender import Lender
from app.services import auth_service
from app.validators.auth_schemas import ChallengeRequest, VerifyRequest

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /challenge
# ---------------------------------------------------------------------------
@router.post("/challenge", summary="Issue auth challenge nonce")
async def challenge(body: ChallengeRequest):
    """
    Issue a one-time nonce for the given identity_ref.
    The lender signs the returned message with their Ed25519 private key
    and submits it to /verify.
    """
    result = await auth_service.issue_challenge(body.identity_ref)
    return result


# ---------------------------------------------------------------------------
# POST /verify
# ---------------------------------------------------------------------------
@router.post("/verify", summary="Verify signed challenge and issue JWT")
async def verify(body: VerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify Ed25519 signature against the stored nonce.
    Returns a bearer JWT and lender profile on success.
    """
    token = await auth_service.verify_challenge(
        identity_ref=body.identity_ref,
        signature_hex=body.signature,
        public_key_hex=body.public_key,
        db=db,
        msp_id=body.msp_id,
    )
    stmt = select(Lender).where(Lender.login_identity_ref == body.identity_ref)
    result = await db.execute(stmt)
    lender = result.scalar_one_or_none()
    lender_data = {
        "id": lender.id if lender else 1,
        "msp_id": lender.fabric_msp_id if lender else (body.msp_id or "Org1MSP"),
        "fabric_msp_id": lender.fabric_msp_id if lender else (body.msp_id or "Org1MSP"),
        "organization_name": lender.organization_name if lender else "Demo Lender",
        "org_name": lender.organization_name if lender else "Demo Lender",
        "is_admin": (lender.fabric_msp_id == "Org1MSP") if lender else True,
    }
    return {"access_token": token, "token_type": "bearer", "lender": lender_data}



# ---------------------------------------------------------------------------
# POST /logout
# ---------------------------------------------------------------------------
@router.post("/logout", status_code=204, summary="Logout (stateless — client discards JWT)")
async def logout():
    """
    Stateless logout. JWT is short-lived; client should discard the token.
    No server-side session to destroy.
    """
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------
@router.get("/me", summary="Get current lender info")
async def me(lender: Lender = Depends(get_current_lender)):
    """Return the authenticated lender's profile. Requires a valid JWT."""
    return {
        "id": lender.id,
        "identity_ref": lender.login_identity_ref,
        "organization_name": lender.organization_name,
        "org_name": lender.organization_name,
        "fabric_msp_id": lender.fabric_msp_id,
        "msp_id": lender.fabric_msp_id,
        "status": lender.status.value,
        "is_admin": (lender.fabric_msp_id == "Org1MSP"),
    }
