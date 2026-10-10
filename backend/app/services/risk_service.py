"""
VeriGold — Risk Service (Phase 5 §5.2.3)

Orchestrates the full hybrid risk engine:
  1. Compute deterministic rule score
  2. Call Gemini LLM concurrently (asyncio.gather)
  3. Apply escalation decision (decision_engine)
  4. Return merged final risk report

This module is the single entrypoint for all risk assessment in the platform.
"""
import asyncio
import logging

from risk_engine.rules.scorer import compute_rule_score
from risk_engine.llm.gemini_client import get_llm_analysis
from risk_engine.llm.decision_engine import apply_llm_escalation

logger = logging.getLogger(__name__)


async def run_risk_engine(feature_vector: dict) -> dict:
    """
    Run the full hybrid risk engine (rule + LLM) for a borrower feature vector.

    Args:
        feature_vector: Dict with:
          active_pledge_count      int
          total_amount_range_sum   int
          velocity_7d              int
          gold_match               bool

    Returns:
        Final merged risk report matching PRD §17 output schema.
    """
    # ------------------------------------------------------------------
    # Step 1: Deterministic rule score (synchronous — fast)
    # ------------------------------------------------------------------
    rule_result = compute_rule_score(feature_vector)
    logger.debug(
        "Rule score: %d | %s | %s",
        rule_result["score"],
        rule_result["risk_level"],
        rule_result["recommendation"],
    )

    # ------------------------------------------------------------------
    # Step 2: LLM analysis (async, runs concurrently with any other I/O)
    #         We use asyncio.gather so LLM call does not block the event loop.
    #         The rule result is already computed synchronously above.
    # ------------------------------------------------------------------
    (llm_result,) = await asyncio.gather(
        get_llm_analysis(feature_vector, rule_result)
    )
    logger.debug(
        "LLM result: escalate=%s | reason=%s",
        llm_result.get("escalate"),
        llm_result.get("escalation_reason"),
    )

    # ------------------------------------------------------------------
    # Step 3: Apply escalation policy
    # ------------------------------------------------------------------
    final_result = apply_llm_escalation(rule_result, llm_result)

    return final_result
