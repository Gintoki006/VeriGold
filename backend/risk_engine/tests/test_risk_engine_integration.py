"""
VeriGold — Risk Engine Integration Tests (Phase 5 §5.2.5)

Tests the full rule + LLM + decision escalation pipeline.
All Gemini API calls are mocked — no real API key needed.

Scenarios tested:
  1. REDUCE from rules + LLM "velocity_anomaly" -> escalates to REJECT
  2. HIGH from rules + LLM "NO_ESCALATE" -> stays HIGH REJECT (LLM cannot lower)
  3. APPROVE from rules + LLM "ESCALATE" -> stays APPROVE (LLM cannot skip MEDIUM)
  4. LLM API failure -> rule result returned unchanged with fallback llm_reasoning
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from risk_engine.llm.decision_engine import apply_llm_escalation
from risk_engine.rules.scorer import compute_rule_score


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def rule_result(active=0, velocity=0, gold_match=False, exposure_sum=0):
    return compute_rule_score({
        "active_pledge_count": active,
        "total_amount_range_sum": exposure_sum,
        "velocity_7d": velocity,
        "gold_match": gold_match,
    })


def llm_escalate(reason="velocity_anomaly"):
    return {
        "llm_reasoning": "AI detected anomalous velocity pattern.",
        "escalate": True,
        "escalation_reason": reason,
    }


def llm_no_escalate():
    return {
        "llm_reasoning": "No additional concerns beyond rule score.",
        "escalate": False,
        "escalation_reason": None,
    }


def llm_fallback():
    return {
        "llm_reasoning": "LLM analysis unavailable — rule-based assessment is definitive.",
        "escalate": False,
        "escalation_reason": None,
    }


# ---------------------------------------------------------------------------
# Scenario 1: REDUCE_AMOUNT + LLM ESCALATE -> REJECT
# ---------------------------------------------------------------------------

def test_scenario_1_reduce_plus_escalate_becomes_reject():
    """REDUCE_AMOUNT from rules + velocity_anomaly from LLM -> escalates to REJECT."""
    # 2 active (score=50) -> MEDIUM/REDUCE_AMOUNT
    rr = rule_result(active=2)
    assert rr["recommendation"] == "REDUCE_AMOUNT"

    final = apply_llm_escalation(rr, llm_escalate("velocity_anomaly"))

    assert final["recommendation"] == "REJECT"
    assert final["risk_level"] == "HIGH"
    assert final["score"] >= 70
    assert final["llm_escalated"] is True
    # Escalation reason should be in explanation
    assert any("velocity" in e.lower() for e in final["explanation"])


def test_scenario_1_escalation_reason_in_explanation():
    """Escalation reason string must appear in the explanation list."""
    rr = rule_result(active=2)
    final = apply_llm_escalation(rr, llm_escalate("cross_identity_gold_match"))
    assert any("cross-identity" in e.lower() or "gold" in e.lower() for e in final["explanation"])


# ---------------------------------------------------------------------------
# Scenario 2: HIGH from rules + LLM "NO_ESCALATE" -> stays HIGH REJECT
# ---------------------------------------------------------------------------

def test_scenario_2_high_reject_llm_cannot_lower():
    """Rule says REJECT -> LLM NO_ESCALATE must not change anything."""
    rr = rule_result(active=4, velocity=4)
    assert rr["recommendation"] == "REJECT"
    assert rr["risk_level"] == "HIGH"

    final = apply_llm_escalation(rr, llm_no_escalate())

    assert final["recommendation"] == "REJECT"
    assert final["risk_level"] == "HIGH"
    assert final["llm_escalated"] is False


def test_scenario_2_high_reject_llm_escalate_ignored():
    """Rule says REJECT -> even if LLM says ESCALATE, result stays REJECT (already max)."""
    rr = rule_result(active=4, velocity=4)
    assert rr["recommendation"] == "REJECT"

    # LLM says escalate — should be ignored
    final = apply_llm_escalation(rr, llm_escalate("velocity_anomaly"))

    assert final["recommendation"] == "REJECT"
    assert final["llm_escalated"] is False  # LLM escalation not credited


# ---------------------------------------------------------------------------
# Scenario 3: APPROVE from rules + LLM "ESCALATE" -> stays APPROVE
# ---------------------------------------------------------------------------

def test_scenario_3_approve_llm_escalate_ignored():
    """LLM cannot skip MEDIUM. APPROVE + ESCALATE must stay APPROVE."""
    rr = rule_result(active=0)
    assert rr["recommendation"] == "APPROVE"

    final = apply_llm_escalation(rr, llm_escalate("unusual_exposure_pattern"))

    assert final["recommendation"] == "APPROVE"
    assert final["risk_level"] == "LOW"
    assert final["llm_escalated"] is False


# ---------------------------------------------------------------------------
# Scenario 4: LLM API failure -> rule result returned with fallback reasoning
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scenario_4_llm_failure_fallback():
    """Simulate Gemini API failure: result should match rule output with fallback llm_reasoning."""
    from app.config.settings import RiskConfig
    from risk_engine.llm.gemini_client import _FALLBACK_RESPONSE

    # 2 active -> MEDIUM/REDUCE_AMOUNT
    rr = rule_result(active=2)
    assert rr["recommendation"] == "REDUCE_AMOUNT"

    # decision_engine receives the fallback (as gemini_client returns on error)
    final = apply_llm_escalation(rr, _FALLBACK_RESPONSE)

    # Must NOT escalate
    assert final["recommendation"] == "REDUCE_AMOUNT"
    assert final["llm_escalated"] is False
    # Must include the fallback reasoning string
    assert "unavailable" in final["llm_reasoning"].lower()


@pytest.mark.asyncio
async def test_scenario_4_run_risk_engine_llm_failure():
    """End-to-end: run_risk_engine with LLM API failure returns rule result + fallback."""
    from risk_engine.llm.gemini_client import _FALLBACK_RESPONSE

    from unittest.mock import AsyncMock
    with patch(
        "app.services.risk_service.get_llm_analysis",
        new_callable=AsyncMock,
        return_value=_FALLBACK_RESPONSE,
    ):
        from app.services.risk_service import run_risk_engine

        result = await run_risk_engine({
            "active_pledge_count": 2,
            "total_amount_range_sum": 0,
            "velocity_7d": 0,
            "gold_match": False,
        })

    assert result["recommendation"] == "REDUCE_AMOUNT"
    assert result["llm_escalated"] is False
    assert "unavailable" in result["llm_reasoning"].lower()


# ---------------------------------------------------------------------------
# Structural invariants
# ---------------------------------------------------------------------------

def test_llm_reasoning_always_present_in_final():
    """Final result must always contain llm_reasoning regardless of path."""
    scenarios = [
        (rule_result(active=0), llm_no_escalate()),
        (rule_result(active=2), llm_escalate()),
        (rule_result(active=4, velocity=4), llm_no_escalate()),
    ]
    for rr, lr in scenarios:
        final = apply_llm_escalation(rr, lr)
        assert "llm_reasoning" in final
        assert isinstance(final["llm_reasoning"], str)
        assert len(final["llm_reasoning"]) > 0
