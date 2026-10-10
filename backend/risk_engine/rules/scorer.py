"""
VeriGold — Rule-Based Risk Scorer (Phase 5 §5.1.1)

Deterministic, weight-driven scorer. Every numeric constant is read from
`settings.RiskConfig` — never hard-coded in this module.

Input (feature_vector):
  active_pledge_count      int   — count of OPEN pledges across all lenders
  total_amount_range_sum   int   — sum of amount_range_code (0-4) across active pledges
  velocity_7d              int   — pledges opened in last 7 days (any lender)
  gold_match               bool  — True if submitted gold fingerprint matched an active pledge

Output dict (PRD §17 output schema):
  score           int           0-100
  risk_level      str           "LOW" | "MEDIUM" | "HIGH"
  recommendation  str           "APPROVE" | "REDUCE_AMOUNT" | "REJECT"
  velocity_flagged bool
  explanation     list[str]     one human-readable string per contributing factor (non-empty)
"""
from app.config.settings import RISK_CONFIG, RiskConfig


def compute_rule_score(feature_vector: dict, config: RiskConfig = RISK_CONFIG) -> dict:
    """
    Compute a deterministic risk score from a borrower feature vector.

    Args:
        feature_vector: Dict with keys active_pledge_count, total_amount_range_sum,
                        velocity_7d, gold_match.
        config:         RiskConfig instance (injectable for tests).

    Returns:
        Dict matching PRD §17 schema.
    """
    rc = config
    score = 0
    explanation: list[str] = []
    velocity_flagged = False

    # ------------------------------------------------------------------
    # Factor 1 — Active pledge count
    # ------------------------------------------------------------------
    active = int(feature_vector.get("active_pledge_count", 0))
    if active == 0:
        score += rc.SCORE_0_ACTIVE
        explanation.append(f"No active pledges found (score +{rc.SCORE_0_ACTIVE})")
    elif active == 1:
        score += rc.SCORE_1_ACTIVE
        explanation.append(f"1 active pledge across lenders (score +{rc.SCORE_1_ACTIVE})")
    elif active == 2:
        score += rc.SCORE_2_ACTIVE
        explanation.append(
            f"2 active pledges — elevated cross-lender exposure (score +{rc.SCORE_2_ACTIVE})"
        )
    else:
        score += rc.SCORE_3PLUS_ACTIVE
        explanation.append(
            f"{active} active pledges — high cross-lender exposure (score +{rc.SCORE_3PLUS_ACTIVE})"
        )

    # ------------------------------------------------------------------
    # Factor 2 — Pledge velocity (last 7 days)
    # ------------------------------------------------------------------
    velocity = int(feature_vector.get("velocity_7d", 0))
    if velocity >= rc.VELOCITY_THRESHOLD:
        score += rc.SCORE_VELOCITY_FLAG
        velocity_flagged = True
        explanation.append(
            f"High pledge velocity: {velocity} pledges in 7 days "
            f"(threshold >={rc.VELOCITY_THRESHOLD}, score +{rc.SCORE_VELOCITY_FLAG})"
        )

    # ------------------------------------------------------------------
    # Factor 3 — Gold fingerprint match (cross-lender duplicate item)
    # ------------------------------------------------------------------
    if feature_vector.get("gold_match", False):
        score += rc.SCORE_GOLD_MATCH
        explanation.append(
            f"Gold item fingerprint matches an active pledge at another lender "
            f"(score +{rc.SCORE_GOLD_MATCH})"
        )

    # ------------------------------------------------------------------
    # Factor 4 — Total amount range sum (aggregate exposure)
    # ------------------------------------------------------------------
    exposure_sum = int(feature_vector.get("total_amount_range_sum", 0))
    if exposure_sum >= rc.HIGH_EXPOSURE_SUM:
        score += rc.SCORE_HIGH_EXPOSURE
        explanation.append(
            f"Aggregate exposure sum {exposure_sum} >= threshold {rc.HIGH_EXPOSURE_SUM} "
            f"(score +{rc.SCORE_HIGH_EXPOSURE})"
        )

    # ------------------------------------------------------------------
    # Cap and classify
    # ------------------------------------------------------------------
    score = min(score, 100)

    if score < rc.THRESHOLD_LOW:
        risk_level = "LOW"
        recommendation = "APPROVE"
    elif score < rc.THRESHOLD_HIGH:
        risk_level = "MEDIUM"
        recommendation = "REDUCE_AMOUNT"
    else:
        risk_level = "HIGH"
        recommendation = "REJECT"

    # Guarantee explanation is always non-empty (defensive)
    if not explanation:
        explanation.append("No risk factors detected")

    return {
        "score": score,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "velocity_flagged": velocity_flagged,
        "explanation": explanation,
    }
