"""
VeriGold — Borrower Service (Phase 5 — fully wired with hybrid risk engine)

Implements the borrower search flow:
  1. Redis cache hit (60-second TTL) — skip Fabric call
  2. Cache miss — call GetBorrowerSummary on Fabric
  3. If gold_fingerprint provided — call GetGoldMatch on Fabric
  4. Hybrid Risk Engine: rule score + Gemini LLM (concurrent) + escalation decision
  5. Create FraudAlert if risk_level == HIGH
  6. Log to `queries` table via audit_logger
  7. Return full risk report

Security:
  - borrower_hash is already the HMAC commitment — never accepts raw Aadhaar
  - gold_fingerprint is SHA-256 of canonical JSON — no PII
  - Raw Fabric response is never returned to the client
"""
import json
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models.query import RiskLevel
from app.services.fabric_gateway import FabricGatewayClient
from app.services.risk_service import run_risk_engine
from app.services.alert_service import maybe_create_alert
from app.utils.audit_logger import log_query

logger = logging.getLogger(__name__)
settings = get_settings()

# Redis TTL for borrower summary cache (seconds)
_BORROWER_CACHE_TTL = 60


async def search_borrower(
    borrower_hash: str,
    gold_fingerprint: str | None,
    lender_id: int,
    lender_msp_id: str,
    fabric: FabricGatewayClient,
    redis: Any,  # redis.asyncio.Redis
    db: AsyncSession,
) -> dict:
    """
    Full borrower search pipeline.

    Returns a risk report dict matching PRD §15 output schema.
    """
    # ------------------------------------------------------------------
    # 1. Redis cache check (resilient — never crash if Redis times out or is offline)
    # ------------------------------------------------------------------
    cache_key = f"borrower_summary:{borrower_hash}"
    cached = None
    if redis is not None:
        try:
            cached = await redis.get(cache_key)
        except Exception as exc:
            logger.warning("Redis cache read failed for %s: %s", borrower_hash[:8], exc)

    borrower_summary = None
    if cached:
        logger.debug("Borrower cache hit: %s", borrower_hash[:8])
        try:
            borrower_summary = json.loads(cached)
        except Exception as exc:
            logger.warning("Failed to decode cached borrower summary for %s: %s", borrower_hash[:8], exc)
            borrower_summary = None

    if not borrower_summary:
        # ---------------------------------------------------------------
        # 2. Fabric: GetBorrowerSummary
        # ---------------------------------------------------------------
        raw = await fabric.evaluate_transaction(
            "GetBorrowerSummary", [borrower_hash]
        )
        borrower_summary = json.loads(raw)
        raw_str = raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)
        if redis is not None:
            try:
                await redis.set(cache_key, raw_str, ex=_BORROWER_CACHE_TTL)
            except Exception as exc:
                logger.warning("Redis cache write failed for %s: %s", borrower_hash[:8], exc)
        logger.debug("Fabric GetBorrowerSummary fetched for %s", borrower_hash[:8])

    # ------------------------------------------------------------------
    # 3. Fabric: GetGoldMatch (optional)
    # ------------------------------------------------------------------
    gold_match = False
    matched_pledge_id: str | None = None
    if gold_fingerprint:
        raw_match = await fabric.evaluate_transaction(
            "GetGoldMatch", [gold_fingerprint]
        )
        match_data = json.loads(raw_match)
        gold_match = match_data.get("matchFound", False)
        matched_pledge_id = match_data.get("matchedPledgeId") or None

    # ------------------------------------------------------------------
    # 4. Hybrid Risk Engine: rule score + Gemini LLM (concurrent) + escalation
    # ------------------------------------------------------------------
    feature_vector = {
        "active_pledge_count": borrower_summary.get("activePledgeCount", 0),
        "total_amount_range_sum": borrower_summary.get("totalAmountRangeSum", 0),
        "velocity_7d": borrower_summary.get("velocity7d", 0),
        "gold_match": gold_match,
    }
    risk_report = await run_risk_engine(feature_vector)

    # Annotate with request-scoped fields not part of feature vector
    risk_report["borrower_hash"] = borrower_hash
    risk_report["active_pledge_count"] = feature_vector["active_pledge_count"]
    risk_report["total_amount_range_sum"] = feature_vector["total_amount_range_sum"]
    risk_report["velocity_7d"] = feature_vector["velocity_7d"]
    risk_report["gold_match"] = gold_match
    if matched_pledge_id:
        risk_report["matched_pledge_id"] = matched_pledge_id
    risk_report["lender_msps"] = borrower_summary.get("lenderMSPIDs", [])

    # ------------------------------------------------------------------
    # 5. Fraud alert if HIGH risk
    # ------------------------------------------------------------------
    await maybe_create_alert(
        risk_report=risk_report,
        borrower_hash=borrower_hash,
        gold_fingerprint=gold_fingerprint,
        db=db,
    )

    # ------------------------------------------------------------------
    # 6. Audit log
    # ------------------------------------------------------------------
    await log_query(
        db=db,
        lender_id=lender_id,
        borrower_hash=borrower_hash,
        risk_level=RiskLevel[risk_report["risk_level"]],
        recommendation=risk_report["recommendation"],
        llm_escalated=risk_report.get("llm_escalated", False),
    )
    try:
        await db.commit()
    except Exception as exc:
        logger.error("Failed to commit DB session after borrower search: %s", exc)
        await db.rollback()

    # ------------------------------------------------------------------
    # 7. Nested schemas for UI compatibility
    # ------------------------------------------------------------------
    raw_explanations = risk_report.get("explanation", [])
    formatted_explanations = []
    for exp in raw_explanations:
        if isinstance(exp, dict):
            formatted_explanations.append(exp)
        else:
            formatted_explanations.append({"factor": "Risk Signal", "description": str(exp)})

    risk_report["risk_assessment"] = {
        "risk_level": risk_report["risk_level"],
        "score": risk_report["score"],
        "recommendation": risk_report["recommendation"],
        "explanations": formatted_explanations,
        "llm_narrative": risk_report.get("llm_reasoning", ""),
    }
    risk_report["summary"] = {
        "active_pledge_count": feature_vector["active_pledge_count"],
        "total_exposure_range": feature_vector["total_amount_range_sum"],
        "velocity_flag": risk_report.get("velocity_flagged", False),
        "gold_match": gold_match,
    }

    return risk_report
