"""
VeriGold — Rule Scorer Unit Tests (Phase 5 §5.1.2)

Covers all 5 scenarios from PRD §25:
  A: 0 active, 0 velocity, no gold match  -> score 10, LOW, APPROVE
  B: 2 active, velocity 1, no gold match  -> MEDIUM, REDUCE_AMOUNT
  C: 4 active (3+ bucket), velocity 4    -> score 100, HIGH, REJECT, velocity_flagged=True
  D: 0 active, gold_match=True            -> score 50 (10+40), check threshold, gold_match=True

Plus:
  - Weights injectable via custom RiskConfig (score changes if config changes)
  - explanation list is always non-empty
"""
import pytest
from dataclasses import dataclass

from risk_engine.rules.scorer import compute_rule_score
from app.config.settings import RiskConfig


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_fv(
    active: int = 0,
    exposure_sum: int = 0,
    velocity: int = 0,
    gold_match: bool = False,
) -> dict:
    return {
        "active_pledge_count": active,
        "total_amount_range_sum": exposure_sum,
        "velocity_7d": velocity,
        "gold_match": gold_match,
    }


# ---------------------------------------------------------------------------
# Scenario A — clean borrower: 0 active, 0 velocity, no gold match
# Expected: score 10, LOW, APPROVE
# ---------------------------------------------------------------------------

def test_scenario_a_clean_borrower():
    result = compute_rule_score(make_fv(active=0, velocity=0, gold_match=False))
    assert result["score"] == 10
    assert result["risk_level"] == "LOW"
    assert result["recommendation"] == "APPROVE"
    assert result["velocity_flagged"] is False


# ---------------------------------------------------------------------------
# Scenario B — 2 active pledges, velocity 1 (below threshold), no gold match
# SCORE_2_ACTIVE=50 -> MEDIUM (30 <= score < 70), REDUCE_AMOUNT
# ---------------------------------------------------------------------------

def test_scenario_b_two_active_low_velocity():
    result = compute_rule_score(make_fv(active=2, velocity=1, gold_match=False))
    assert result["score"] == 50  # only SCORE_2_ACTIVE, velocity < threshold
    assert result["risk_level"] == "MEDIUM"
    assert result["recommendation"] == "REDUCE_AMOUNT"
    assert result["velocity_flagged"] is False


# ---------------------------------------------------------------------------
# Scenario C — 4 active (3+ bucket), velocity=4 (>= threshold=2)
# SCORE_3PLUS_ACTIVE=80 + SCORE_VELOCITY=20 = 100, HIGH, REJECT
# ---------------------------------------------------------------------------

def test_scenario_c_max_risk():
    result = compute_rule_score(make_fv(active=4, velocity=4, gold_match=False))
    assert result["score"] == 100
    assert result["risk_level"] == "HIGH"
    assert result["recommendation"] == "REJECT"
    assert result["velocity_flagged"] is True


# ---------------------------------------------------------------------------
# Scenario D — 0 active, gold_match=True
# SCORE_0_ACTIVE=10 + SCORE_GOLD_MATCH=40 = 50, MEDIUM, REDUCE_AMOUNT
# ---------------------------------------------------------------------------

def test_scenario_d_gold_match():
    result = compute_rule_score(make_fv(active=0, gold_match=True))
    assert result["score"] == 50
    assert result["risk_level"] == "MEDIUM"
    assert result["recommendation"] == "REDUCE_AMOUNT"


# ---------------------------------------------------------------------------
# Test: score changes when config changes (weights injectable)
# ---------------------------------------------------------------------------

def test_config_injectable_weights():
    """Changing SCORE_0_ACTIVE in a custom config must change the score."""
    custom_config = RiskConfig(SCORE_0_ACTIVE=5)
    result = compute_rule_score(make_fv(active=0), config=custom_config)
    assert result["score"] == 5

    default_result = compute_rule_score(make_fv(active=0))
    assert default_result["score"] == 10  # default SCORE_0_ACTIVE


# ---------------------------------------------------------------------------
# Test: explanation list is always non-empty
# ---------------------------------------------------------------------------

def test_explanation_non_empty_all_scenarios():
    scenarios = [
        make_fv(active=0),
        make_fv(active=1, velocity=3),
        make_fv(active=3, gold_match=True),
        make_fv(active=2, exposure_sum=4),
    ]
    for fv in scenarios:
        result = compute_rule_score(fv)
        assert len(result["explanation"]) > 0, f"Empty explanation for fv={fv}"


# ---------------------------------------------------------------------------
# Test: score capped at 100
# ---------------------------------------------------------------------------

def test_score_capped_at_100():
    # 3+ active(80) + velocity(20) + gold(40) + exposure(15) = 155 -> capped at 100
    result = compute_rule_score(
        make_fv(active=5, velocity=5, gold_match=True, exposure_sum=10)
    )
    assert result["score"] == 100


# ---------------------------------------------------------------------------
# Test: velocity_flagged only set when velocity >= threshold
# ---------------------------------------------------------------------------

def test_velocity_flag_at_exactly_threshold():
    default_threshold = RiskConfig().VELOCITY_THRESHOLD  # 2
    # Exactly at threshold
    result_at = compute_rule_score(make_fv(active=0, velocity=default_threshold))
    assert result_at["velocity_flagged"] is True

    # One below threshold
    result_below = compute_rule_score(make_fv(active=0, velocity=default_threshold - 1))
    assert result_below["velocity_flagged"] is False


# ---------------------------------------------------------------------------
# Test: HIGH_EXPOSURE_SUM boundary (exactly at threshold = contribution)
# ---------------------------------------------------------------------------

def test_high_exposure_at_threshold():
    rc = RiskConfig()
    result_at = compute_rule_score(
        make_fv(active=0, exposure_sum=rc.HIGH_EXPOSURE_SUM)
    )
    assert result_at["score"] == rc.SCORE_0_ACTIVE + rc.SCORE_HIGH_EXPOSURE

    result_below = compute_rule_score(
        make_fv(active=0, exposure_sum=rc.HIGH_EXPOSURE_SUM - 1)
    )
    assert result_below["score"] == rc.SCORE_0_ACTIVE  # no high-exposure contribution
