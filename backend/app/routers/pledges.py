"""
VeriGold — Pledges Router (Phase 4 §4.4.2)

Routes:
  POST /api/pledges                    — register a new pledge (Fabric + mirror)
  POST /api/pledges/{pledge_id}/close  — close an existing pledge
  GET  /api/pledges                    — list lender's own pledge mirrors (paginated)
  GET  /api/pledges/{pledge_id}        — single pledge mirror

All routes require auth. Only the owning lender can close or view their pledges.
"""
import hashlib
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.lender import Lender
from app.models.pledge_mirror import PledgeMirror
from app.services.fabric_gateway import get_fabric_client
from app.services.pledge_service import close_pledge, register_pledge
from app.utils.errors import PledgeNotFoundError, UnauthorizedPledgeError

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class RegisterPledgeRequest(BaseModel):
    borrower_hash: str = Field(
        ...,
        min_length=64,
        max_length=64,
        description="64-char hex HMAC-SHA256 of borrower Aadhaar",
    )
    gold_fingerprint: str | None = Field(
        default=None,
        description="64-char SHA-256 fingerprint of the gold item (optional, generated if not provided)",
    )
    amount_range: int = Field(
        ...,
        ge=0,
        le=4,
        description="Loan amount bucket 0-4 per PRD §11.2",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Register a pledge",
    description="Submit a new pledge to Hyperledger Fabric and persist the off-chain mirror.",
)
@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a pledge (alias)",
)
async def register(
    body: RegisterPledgeRequest,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    fabric = get_fabric_client(lender.fabric_msp_id)
    gold_fp = body.gold_fingerprint or hashlib.sha256(f"DEMO-GOLD-{body.borrower_hash}-{uuid4().hex}".encode()).hexdigest()
    result = await register_pledge(
        borrower_hash=body.borrower_hash,
        gold_fingerprint=gold_fp,
        amount_range=body.amount_range,
        lender_id=lender.id,
        lender_msp_id=lender.fabric_msp_id,
        fabric=fabric,
        db=db,
    )
    try:
        from app.services.auth_service import get_redis
        redis_client = await get_redis()
        await redis_client.delete(f"borrower_summary:{body.borrower_hash}")
    except Exception as exc:
        logger.warning("Failed to invalidate borrower cache: %s", exc)

    return {
        "pledge_id": result["pledge_id"],
        "id": result["pledge_id"],
        "transaction_hash": result["transaction_hash"],
        "tx_hash": result["transaction_hash"],
    }


@router.post(
    "/{pledge_id}/close",
    summary="Close a pledge",
    description=(
        "Close an existing active pledge. Verifies ownership before touching Fabric. "
        "Returns the Fabric transaction hash."
    ),
)
async def close(
    pledge_id: str,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    fabric = get_fabric_client(lender.fabric_msp_id)
    result = await close_pledge(
        pledge_id=pledge_id,
        lender_id=lender.id,
        lender_msp_id=lender.fabric_msp_id,
        fabric=fabric,
        db=db,
    )
    try:
        from app.services.auth_service import get_redis
        stmt = select(PledgeMirror).where(PledgeMirror.pledge_id == pledge_id)
        res = await db.execute(stmt)
        m = res.scalar_one_or_none()
        if m:
            redis_client = await get_redis()
            await redis_client.delete(f"borrower_summary:{m.borrower_hash}")
    except Exception:
        pass
    return result


@router.get(
    "",
    summary="List lender's pledges",
    description=(
        "Returns the lender's pledge mirrors (off-chain read-replica), "
        "most recently created first. Paginated via page/page_size."
    ),
)
@router.get(
    "/my",
    summary="List lender's pledges (my alias)",
)
async def list_pledges(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    limit: int | None = None,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    actual_limit = limit if limit is not None else page_size
    offset = (page - 1) * actual_limit

    inst_lenders = select(Lender.id).where(Lender.fabric_msp_id == lender.fabric_msp_id)
    where_cond = (PledgeMirror.lender_id == lender.id) | PledgeMirror.lender_id.in_(inst_lenders)

    count_stmt = select(func.count(PledgeMirror.id)).where(where_cond)
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(PledgeMirror)
        .where(where_cond)
        .order_by(PledgeMirror.created_at.desc())
        .offset(offset)
        .limit(actual_limit)
    )
    result = await db.execute(stmt)
    mirrors = result.scalars().all()
    return {
        "page": page,
        "page_size": actual_limit,
        "total": total,
        "pledges": [
            {
                "id": m.pledge_id,
                "pledge_id": m.pledge_id,
                "borrower_hash": m.borrower_hash,
                "gold_fingerprint": m.gold_fingerprint,
                "amount_range": m.amount_range,
                "status": m.status.value.upper(),
                "transaction_hash": m.transaction_hash,
                "tx_hash": m.transaction_hash,
                "created_at": m.created_at.isoformat(),
                "closed_at": m.closed_at.isoformat() if m.closed_at else None,
            }
            for m in mirrors
        ],
    }


@router.get(
    "/{pledge_id}",
    summary="Get a single pledge",
    description="Fetch one pledge mirror by pledge_id. Only accessible by the owning lender.",
)
async def get_pledge(
    pledge_id: str,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PledgeMirror).where(PledgeMirror.pledge_id == pledge_id)
    result = await db.execute(stmt)
    mirror: PledgeMirror | None = result.scalar_one_or_none()

    if mirror is None:
        raise PledgeNotFoundError(pledge_id)

    if mirror.lender_id != lender.id:
        inst_lender_ids = (
            await db.execute(select(Lender.id).where(Lender.fabric_msp_id == lender.fabric_msp_id))
        ).scalars().all()
        if mirror.lender_id not in inst_lender_ids:
            raise UnauthorizedPledgeError(pledge_id)

    return {
        "id": mirror.pledge_id,
        "pledge_id": mirror.pledge_id,
        "borrower_hash": mirror.borrower_hash,
        "gold_fingerprint": mirror.gold_fingerprint,
        "amount_range": mirror.amount_range,
        "status": mirror.status.value.upper(),
        "transaction_hash": mirror.transaction_hash,
        "tx_hash": mirror.transaction_hash,
        "created_at": mirror.created_at.isoformat(),
        "closed_at": mirror.closed_at.isoformat() if mirror.closed_at else None,
    }
