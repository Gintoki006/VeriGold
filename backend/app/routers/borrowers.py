"""
VeriGold — Borrowers Router (Phase 4 §4.2.2)

Routes:
  POST /api/borrowers/compute-hash — HMAC-SHA256 of an Aadhaar number
  POST /api/borrowers/search       — Full borrower search with risk scoring

Security:
  - Aadhaar is NEVER logged or stored; only the hash is used.
  - /search requires JWT auth + per-lender rate limiting.
  - gold_fingerprint is optional; if provided triggers GetGoldMatch on Fabric.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.middleware.rate_limiter import check_rate_limit
from app.models.lender import Lender
from app.models.query import Query as QueryModel
from app.services.borrower_service import search_borrower
from app.services.auth_service import get_redis
from app.services.fabric_gateway import get_fabric_client
from app.utils.borrower_identity import compute_borrower_hash

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ComputeHashRequest(BaseModel):
    aadhaar: str = Field(
        ...,
        description="12-digit Aadhaar number (spaces/dashes stripped automatically)",
        examples=["123456789012"],
    )


class ComputeHashResponse(BaseModel):
    borrower_hash: str = Field(
        ...,
        description="HMAC-SHA256 commitment of the Aadhaar — 64-char hex",
    )


class BorrowerSearchRequest(BaseModel):
    borrower_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        description="64-char hex HMAC-SHA256 of borrower Aadhaar",
    )
    gold_fingerprint: str | None = Field(
        default=None,
        min_length=64,
        max_length=64,
        description="Optional: 64-char SHA-256 fingerprint of the gold item to cross-check",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/compute-hash",
    response_model=ComputeHashResponse,
    summary="Compute borrower hash",
    description=(
        "Accepts an Aadhaar number and returns its HMAC-SHA256 commitment. "
        "The Aadhaar is NEVER echoed back, stored, or logged."
    ),
)
async def compute_hash(body: ComputeHashRequest) -> ComputeHashResponse:
    try:
        h = compute_borrower_hash(body.aadhaar)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return ComputeHashResponse(borrower_hash=h)


@router.post(
    "/search",
    summary="Search borrower on Fabric ledger",
    description=(
        "Query Fabric for a borrower's pledge summary, compute risk score, "
        "and optionally cross-check a gold item fingerprint. "
        "Requires auth. Rate-limited to BORROWER_SEARCH_RATE_LIMIT req/60s per lender."
    ),
)
async def search(
    body: BorrowerSearchRequest,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    # Rate limit check
    redis = None
    try:
        redis = await get_redis()
        await check_rate_limit(lender_id=lender.id, redis=redis)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Redis unavailable during search rate limit check: %s", exc)

    fabric = get_fabric_client(lender.fabric_msp_id)

    result = await search_borrower(
        borrower_hash=body.borrower_hash,
        gold_fingerprint=body.gold_fingerprint,
        lender_id=lender.id,
        lender_msp_id=lender.fabric_msp_id,
        fabric=fabric,
        redis=redis,
        db=db,
    )
    return result


@router.get(
    "/search-history",
    summary="Get recent borrower query history for lender",
)
async def search_history(
    limit: int = 10,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(QueryModel)
        .where(QueryModel.lender_id == lender.id)
        .order_by(QueryModel.created_at.desc())
        .limit(min(limit, 50))
    )
    result = await db.execute(stmt)
    queries = result.scalars().all()
    return {
        "queries": [
            {
                "id": q.id,
                "borrower_hash": q.borrower_hash,
                "risk_level": q.risk_level.value if hasattr(q.risk_level, "value") else str(q.risk_level),
                "recommendation": q.recommendation,
                "queried_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in queries
        ]
    }
