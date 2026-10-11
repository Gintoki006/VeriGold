"""
VeriGold — Dashboard Router
Provides summary metrics for the institutional lender dashboard.
"""
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.fraud_alert import AlertStatus, FraudAlert
from app.models.lender import Lender
from app.models.pledge_mirror import PledgeMirror, PledgeStatus
from app.models.query import Query

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/stats", summary="Get dashboard summary stats for current lender")
async def get_dashboard_stats(
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # Subquery for all lender IDs belonging to the same institution
    inst_lenders = select(Lender.id).where(Lender.fabric_msp_id == lender.fabric_msp_id)
    lender_match = (Query.lender_id == lender.id) | Query.lender_id.in_(inst_lenders)
    pledge_match = (PledgeMirror.lender_id == lender.id) | PledgeMirror.lender_id.in_(inst_lenders)

    # 1. Queries today by this lender / institution
    q_stmt = (
        select(func.count(Query.id))
        .where(lender_match)
        .where(Query.created_at >= start_of_day)
    )
    queries_today = (await db.execute(q_stmt)).scalar() or 0

    # 2. My active pledges
    p_stmt = (
        select(func.count(PledgeMirror.id))
        .where(pledge_match)
        .where(PledgeMirror.status == PledgeStatus.active)
    )
    my_active_pledges = (await db.execute(p_stmt)).scalar() or 0

    # 3. Open high-risk alerts associated with this lender's active borrowers
    active_borrowers_stmt = (
        select(PledgeMirror.borrower_hash)
        .where(pledge_match)
        .distinct()
    )
    a_stmt = (
        select(func.count(FraudAlert.id))
        .where(FraudAlert.borrower_hash.in_(active_borrowers_stmt))
        .where(FraudAlert.status == AlertStatus.open)
    )
    open_high_risk_alerts = (await db.execute(a_stmt)).scalar() or 0

    return {
        "queries_today": queries_today,
        "my_active_pledges": my_active_pledges,
        "open_high_risk_alerts": open_high_risk_alerts,
    }
