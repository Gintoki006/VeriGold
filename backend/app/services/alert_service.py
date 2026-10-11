"""
VeriGold — Alert Service (Phase 5 §5.3.1)

Creates FraudAlert records when a borrower triggers a HIGH risk assessment.
Alert type is determined by the dominant risk factor:
  VELOCITY    — velocity_flagged is True
  GOLD_MATCH  — gold_match is True (and velocity not flagged)
  HIGH_EXPOSURE — fallback for all other HIGH cases

Called from borrower_service after risk_service returns.
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fraud_alert import AlertStatus, AlertType, FraudAlert

logger = logging.getLogger(__name__)


async def maybe_create_alert(
    risk_report: dict,
    borrower_hash: str,
    gold_fingerprint: str | None,
    db: AsyncSession,
) -> FraudAlert | None:
    """
    Insert a FraudAlert if risk_level is HIGH.

    Args:
        risk_report:      Final merged risk report from run_risk_engine.
        borrower_hash:    HMAC-SHA256 commitment (never plaintext Aadhaar).
        gold_fingerprint: SHA-256 fingerprint if provided, else None.
        db:               Async database session.

    Returns:
        The created FraudAlert row, or None if not HIGH risk.
    """
    if risk_report.get("risk_level") != "HIGH":
        return None

    # Determine alert type by dominant factor (order matters)
    if risk_report.get("velocity_flagged"):
        alert_type = AlertType.VELOCITY
        message = (
            f"High pledge velocity detected: {risk_report.get('velocity_7d', '?')} "
            f"pledges in 7 days (score {risk_report.get('score', '?')})."
        )
    elif risk_report.get("gold_match"):
        alert_type = AlertType.GOLD_MATCH
        message = (
            "Gold item fingerprint matches an active pledge at another lender. "
            f"Risk score: {risk_report.get('score', '?')}."
        )
    else:
        alert_type = AlertType.HIGH_EXPOSURE
        message = (
            f"Borrower has {risk_report.get('active_pledge_count', '?')} active pledges "
            f"with aggregate exposure sum {risk_report.get('total_amount_range_sum', '?')}. "
            f"Risk score: {risk_report.get('score', '?')}."
        )

    # Deduplication: do not create multiple open alerts for the same borrower
    dup_stmt = (
        select(FraudAlert.id)
        .where(
            FraudAlert.borrower_hash == borrower_hash,
            FraudAlert.status == AlertStatus.open,
        )
        .limit(1)
    )
    existing_alert = await db.scalar(dup_stmt)
    if existing_alert:
        logger.debug("FraudAlert already open for borrower=%s, skipping duplicate", borrower_hash[:8])
        return None

    alert = FraudAlert(
        borrower_hash=borrower_hash,
        gold_fingerprint=gold_fingerprint if alert_type == AlertType.GOLD_MATCH else None,
        risk_score=risk_report.get("score", 0),
        alert_type=alert_type,
        message=message,
        status=AlertStatus.open,
    )

    try:
        db.add(alert)
        await db.flush()  # get the ID without committing (caller controls transaction)
        logger.info(
            "FraudAlert created: id=%d type=%s borrower=%s score=%d",
            alert.id,
            alert_type.value,
            borrower_hash[:8],
            alert.risk_score,
        )
    except Exception as exc:  # noqa: BLE001
        # Alert creation must never crash the main search flow
        logger.error(
            "Failed to create FraudAlert for borrower=%s: %s",
            borrower_hash[:8],
            exc,
        )
        return None

    return alert
