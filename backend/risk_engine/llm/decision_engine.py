"""
VeriGold — LLM Escalation Decision Engine (Phase 5 §5.2.2)

Enforces the strict escalation policy defined in PRD §5.2.2:

  ALLOWED ESCALATION PATH:
    APPROVE             → LLM cannot directly escalate to REJECT or REDUCE_AMOUNT
    REDUCE_AMOUNT + LLM ESCALATE → REJECT (only allowed path)
    REJECT              → LLM result IGNORED (already highest; cannot reduce)

  The rule engine owns the score. LLM can only promote REDUCE_AMOUNT to REJECT.
"""
import logging

logger = logging.getLogger(__name__)


def apply_llm_escalation(rule_result: dict, llm_result: dict) -> dict:
    """
    Merge LLM advisory result into the rule result following the escalation policy.

    Args:
        rule_result: Output of compute_rule_score (score, risk_level, recommendation,
                     velocity_flagged, explanation).
        llm_result:  Output of get_llm_analysis (llm_reasoning, escalate,
                     escalation_reason).

    Returns:
        Final merged risk report dict. Never modifies inputs in place.
    """
    result = dict(rule_result)
    result["llm_reasoning"] = llm_result.get(
        "llm_reasoning", "LLM analysis unavailable."
    )
    result["llm_escalated"] = False

    recommendation = rule_result.get("recommendation", "")
    llm_escalate = llm_result.get("escalate", False)
    escalation_reason = llm_result.get("escalation_reason")

    # ------------------------------------------------------------------
    # Case 1: Rule says REJECT — LLM result is ignored entirely.
    #         LLM cannot lower a REJECT.
    # ------------------------------------------------------------------
    if recommendation == "REJECT":
        logger.debug("LLM decision ignored: rule already at REJECT")
        return result

    # ------------------------------------------------------------------
    # Case 2: Rule says APPROVE — LLM cannot skip MEDIUM.
    #         Must go APPROVE -> REDUCE_AMOUNT -> REJECT.
    # ------------------------------------------------------------------
    if recommendation == "APPROVE" and llm_escalate:
        logger.warning(
            "LLM tried to escalate APPROVE directly to REJECT — ignored. "
            "Escalation path is APPROVE->REDUCE->REJECT. "
            "reason=%r",
            escalation_reason,
        )
        return result

    # ------------------------------------------------------------------
    # Case 3: Rule says REDUCE_AMOUNT + LLM says ESCALATE — escalate to REJECT.
    #         This is the ONLY valid LLM escalation path.
    # ------------------------------------------------------------------
    if recommendation == "REDUCE_AMOUNT" and llm_escalate:
        result["recommendation"] = "REJECT"
        result["risk_level"] = "HIGH"
        result["score"] = max(result["score"], 70)
        result["llm_escalated"] = True
        if escalation_reason:
            result["explanation"] = list(result.get("explanation", [])) + [
                f"LLM escalation: {_format_escalation_reason(escalation_reason)}"
            ]
        logger.info(
            "LLM escalated REDUCE_AMOUNT -> REJECT (reason=%s, score bumped to %d)",
            escalation_reason,
            result["score"],
        )

    # ------------------------------------------------------------------
    # Case 4: Rule says REDUCE_AMOUNT + LLM says NO_ESCALATE — keep as-is.
    # ------------------------------------------------------------------
    return result


def _format_escalation_reason(reason: str) -> str:
    """Convert snake_case escalation reason to human-readable label."""
    labels = {
        "velocity_anomaly": "Unusual pledge velocity pattern detected by AI analysis",
        "cross_identity_gold_match": "AI detected potential cross-identity gold item reuse",
        "unusual_exposure_pattern": "AI flagged an unusual aggregate exposure pattern",
    }
    return labels.get(reason, reason)
