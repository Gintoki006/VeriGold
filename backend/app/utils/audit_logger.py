"""
VeriGold — Audit Logger

Writes structured audit records to the `queries` table (borrower searches)
and `transactions` table (pledge lifecycle actions).

Security invariants:
  - NEVER log plaintext Aadhaar numbers.
  - Log only borrower_hash (the HMAC-SHA256 commitment).
  - correlation_id links logs from a single request across services.
  - tx_hash is the on-chain Fabric TxID (None for query-only ops).
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query import Query, RiskLevel
from app.models.transaction import Transaction, TransactionStatus, TransactionType

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    lender_id: int,
    action_type: str,
    success: bool,
    *,
    borrower_hash: Optional[str] = None,
    risk_score: Optional[int] = None,
    risk_level: Optional[str] = None,
    recommendation: Optional[str] = None,
    llm_escalated: bool = False,
    pledge_id: Optional[str] = None,
    tx_hash: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> None:
    """
    Write an audit record to the DB.

    Args:
        db             : Active async DB session (caller's session — not committed here).
        lender_id      : ID of the lender performing the action.
        action_type    : "BORROWER_SEARCH", "PLEDGE_REGISTER", or "PLEDGE_CLOSE".
        success        : Whether the operation succeeded.
        borrower_hash  : HMAC-SHA256 commitment — NEVER plaintext Aadhaar.
        risk_score     : Integer composite score 0-100.
        risk_level     : "LOW", "MEDIUM", or "HIGH".
        recommendation : "APPROVE", "REDUCE_AMOUNT", or "REJECT".
        llm_escalated  : True if Gemini overrode the deterministic recommendation.
        pledge_id      : Fabric pledge ID for pledge operations.
        tx_hash        : On-chain Fabric TxID (None for queries).
        correlation_id : Request-scoped ID for distributed tracing.
    """
    corr_id = correlation_id or str(uuid.uuid4())

    try:
        if action_type == "BORROWER_SEARCH":
            _risk_level = RiskLevel(risk_level) if risk_level else RiskLevel.LOW
            record = Query(
                lender_id=lender_id,
                borrower_hash=borrower_hash or "",
                risk_score=risk_score or 0,
                risk_level=_risk_level,
                recommendation=recommendation or "APPROVE",
                llm_escalated=llm_escalated,
                created_at=datetime.now(timezone.utc),
            )
            db.add(record)
            await db.flush()

        elif action_type in ("PLEDGE_REGISTER", "PLEDGE_CLOSE"):
            tx_type = (
                TransactionType.REGISTER_PLEDGE
                if action_type == "PLEDGE_REGISTER"
                else TransactionType.CLOSE_PLEDGE
            )
            tx_status = (
                TransactionStatus.confirmed if success else TransactionStatus.failed
            )
            record = Transaction(
                lender_id=lender_id,
                pledge_id=pledge_id or "",
                transaction_hash=tx_hash,
                transaction_type=tx_type,
                status=tx_status,
                created_at=datetime.now(timezone.utc),
            )
            db.add(record)
            await db.flush()

        else:
            logger.warning(
                "audit_logger: unknown action_type=%s corr=%s", action_type, corr_id
            )

    except Exception as exc:  # noqa: BLE001
        # Audit logging must never crash the main request flow
        logger.error(
            "audit_logger: failed action=%s corr=%s err=%s",
            action_type,
            corr_id,
            exc,
        )


async def log_query(
    db: AsyncSession,
    lender_id: int,
    borrower_hash: str,
    risk_level: "RiskLevel",
    recommendation: str,
    llm_escalated: bool = False,
) -> None:
    """
    Convenience wrapper for borrower search audit records.
    Delegates to log_action() — errors are silently absorbed.
    """
    await log_action(
        db=db,
        lender_id=lender_id,
        action_type="BORROWER_SEARCH",
        success=True,
        borrower_hash=borrower_hash,
        risk_level=risk_level.value if hasattr(risk_level, "value") else str(risk_level),
        recommendation=recommendation,
        llm_escalated=llm_escalated,
    )
