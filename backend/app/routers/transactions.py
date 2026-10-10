"""
VeriGold — Transactions Router (Phase 4 §4.5.1)

Routes:
  GET /api/transactions — lender's transaction history, paginated, most recent first
"""
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.lender import Lender
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    summary="List lender's transaction history",
    description=(
        "Returns the calling lender's Fabric transaction audit trail, "
        "most recent first. Paginated via page/page_size."
    ),
)
async def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    stmt = (
        select(Transaction)
        .where(Transaction.lender_id == lender.id)
        .order_by(Transaction.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    txs = result.scalars().all()
    return {
        "page": page,
        "page_size": page_size,
        "transactions": [
            {
                "id": tx.id,
                "pledge_id": tx.pledge_id,
                "transaction_hash": tx.transaction_hash,
                "transaction_type": tx.transaction_type.value,
                "status": tx.status.value,
                "created_at": tx.created_at.isoformat(),
            }
            for tx in txs
        ],
    }
