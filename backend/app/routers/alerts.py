"""
VeriGold — Alerts Router (Phase 4 §4.5.2)

Routes:
  GET  /api/alerts              — fraud alerts list, most recent first
  POST /api/alerts/{id}/review  — mark fraud alert as reviewed/acknowledged
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.fraud_alert import AlertStatus, AlertType, FraudAlert
from app.models.lender import Lender
from app.models.pledge_mirror import PledgeMirror, PledgeStatus

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    summary="List fraud alerts",
    description=(
        "Returns fraud alerts for borrowers against whom the calling lender "
        "holds at least one active pledge. Paginated, most recent first."
    ),
)
async def list_alerts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    limit: int | None = None,
    risk_level: str | None = None,
    alert_type: str | None = None,
    alert_status: str | None = Query(default=None, alias="status"),
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    actual_limit = limit if limit is not None else page_size
    offset = (page - 1) * actual_limit if limit is None else 0

    settings = get_settings()

    # Subquery: borrower hashes for which this lender holds an active pledge
    active_borrowers_stmt = (
        select(PledgeMirror.borrower_hash)
        .where(PledgeMirror.lender_id == lender.id)
        .where(PledgeMirror.status == PledgeStatus.active)
        .distinct()
    )

    stmt = select(FraudAlert)

    # In production, lenders only see alerts for borrowers they have active pledges on.
    # In DEMO_MODE, if the lender has no pledges yet, show all alerts for demo visibility.
    if not getattr(settings, "DEMO_MODE", False):
        stmt = stmt.where(FraudAlert.borrower_hash.in_(active_borrowers_stmt))
    else:
        # Check if lender has any pledges; if so filter by them, otherwise allow all demo alerts
        pledge_count = (
            await db.execute(
                select(PledgeMirror.id).where(PledgeMirror.lender_id == lender.id).limit(1)
            )
        ).scalar_one_or_none()
        if pledge_count is not None:
            stmt = stmt.where(FraudAlert.borrower_hash.in_(active_borrowers_stmt))

    # Filter by alert_type if provided (e.g. VELOCITY, GOLD_MATCH, HIGH_EXPOSURE)
    if alert_type and alert_type.upper() != "ALL":
        try:
            at_enum = AlertType[alert_type.upper()]
            stmt = stmt.where(FraudAlert.alert_type == at_enum)
        except KeyError:
            pass

    # Filter by status if provided
    if alert_status:
        try:
            st_enum = AlertStatus[alert_status.lower()]
            stmt = stmt.where(FraudAlert.status == st_enum)
        except KeyError:
            pass

    # Filter by risk_level (HIGH >= 70, MEDIUM 40..69, LOW < 40)
    if risk_level:
        rl_upper = risk_level.upper()
        if rl_upper == "HIGH":
            stmt = stmt.where(FraudAlert.risk_score >= 70)
        elif rl_upper == "MEDIUM":
            stmt = stmt.where(FraudAlert.risk_score >= 40, FraudAlert.risk_score < 70)
        elif rl_upper == "LOW":
            stmt = stmt.where(FraudAlert.risk_score < 40)

    stmt = stmt.order_by(FraudAlert.created_at.desc()).offset(offset).limit(actual_limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()

    return {
        "page": page,
        "page_size": actual_limit,
        "alerts": [
            {
                "id": a.id,
                "borrower_hash": a.borrower_hash,
                "gold_fingerprint": a.gold_fingerprint,
                "risk_score": a.risk_score,
                "risk_level": "HIGH" if a.risk_score >= 70 else ("MEDIUM" if a.risk_score >= 40 else "LOW"),
                "alert_type": a.alert_type.value,
                "message": a.message,
                "explanation": a.message,  # Frontend alert card expects explanation
                "status": a.status.value,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
    }


@router.post(
    "/{alert_id}/review",
    summary="Mark fraud alert as reviewed",
    description="Transition a fraud alert to acknowledged/reviewed status.",
)
async def review_alert(
    alert_id: int,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FraudAlert).where(FraudAlert.id == alert_id)
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found.",
        )

    alert.status = AlertStatus.acknowledged
    await db.commit()
    logger.info("Alert %d marked acknowledged by lender %d", alert_id, lender.id)

    return {
        "id": alert.id,
        "status": alert.status.value,
        "message": "Alert successfully marked as reviewed.",
    }
