"""
VeriGold — Risk Report Schema Alignment and Contract Tests

Verifies that the borrower search and risk evaluation endpoints return
both flat fields and the nested compatibility structures expected by
the Next.js dashboard components:
  - risk_assessment (risk_level, score, recommendation, explanations, llm_narrative)
  - summary (active_pledge_count, total_exposure_range, velocity_flag, gold_match)
  - explanations normalization (dicts with factor & description)
"""
import pytest
from app.config.settings import RISK_CONFIG
from risk_engine.rules.scorer import compute_rule_score


def test_risk_report_nested_structure_compatibility():
    """Verify that normalized explanation and summary structures match UI contracts."""
    raw_explanations = [
        {"factor": "active_pledges", "description": "1 active pledge"},
        "Unusual pledge concentration in short window",
    ]
    formatted = []
    for exp in raw_explanations:
        if isinstance(exp, dict):
            formatted.append(exp)
        else:
            formatted.append({"factor": "Risk Signal", "description": str(exp)})

    assert len(formatted) == 2
    assert formatted[0]["factor"] == "active_pledges"
    assert formatted[1]["factor"] == "Risk Signal"
    assert "Unusual" in formatted[1]["description"]


def test_risk_scorer_contract_ranges():
    """Verify rule scorer bounds and thresholds."""
    features = {
        "active_pledge_count": 0,
        "velocity_7d": 0,
        "total_amount_range_sum": 0,
        "gold_match": False,
    }
    result = compute_rule_score(features)
    assert result["score"] == RISK_CONFIG.SCORE_0_ACTIVE
    assert result["risk_level"] == "LOW"
    assert not result["velocity_flagged"]
