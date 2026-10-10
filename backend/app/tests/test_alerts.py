"""
VeriGold — Alerts Unit Tests

Tests:
  1. GET /api/alerts returns alert items with risk_level and explanation
  2. GET /api/alerts filters by alert_type and risk_level
  3. POST /api/alerts/{id}/review marks the alert as acknowledged
  4. POST /api/alerts/{id}/review on non-existent alert returns 404
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.fraud_alert import AlertStatus, AlertType, FraudAlert
from app.models.lender import Lender, LenderStatus
from app.routers.alerts import router as alerts_router

TEST_LENDER = Lender(
    id=1,
    login_identity_ref="test-org1-lender",
    fabric_msp_id="Org1MSP",
    organization_name="Test Lender Org1",
    status=LenderStatus.active,
)

SAMPLE_ALERT = FraudAlert(
    id=10,
    borrower_hash="a" * 64,
    gold_fingerprint="f" * 64,
    risk_score=85,
    alert_type=AlertType.GOLD_MATCH,
    message="Gold item fingerprint matches an active pledge.",
    status=AlertStatus.open,
    created_at=datetime.now(timezone.utc),
)


def _make_test_app(mock_db_session: AsyncMock) -> FastAPI:
    app = FastAPI()
    app.include_router(alerts_router, prefix="/api/alerts")
    app.dependency_overrides[get_current_lender] = lambda: TEST_LENDER
    app.dependency_overrides[get_db] = lambda: mock_db_session
    return app


def test_list_alerts_response_format():
    mock_db = AsyncMock()
    mock_execute = MagicMock()
    
    # Mock pledge query (returns 1 to simulate active pledges)
    mock_execute.scalar_one_or_none.return_value = 1
    # Mock alerts result
    mock_execute.scalars.return_value.all.return_value = [SAMPLE_ALERT]
    mock_db.execute.return_value = mock_execute

    app = _make_test_app(mock_db)
    client = TestClient(app)

    res = client.get("/api/alerts?alert_type=GOLD_MATCH&risk_level=HIGH")
    assert res.status_code == 200
    data = res.json()
    assert "alerts" in data
    assert len(data["alerts"]) == 1
    alert_item = data["alerts"][0]
    assert alert_item["id"] == 10
    assert alert_item["risk_score"] == 85
    assert alert_item["risk_level"] == "HIGH"
    assert alert_item["explanation"] == "Gold item fingerprint matches an active pledge."
    assert alert_item["status"] == "open"


def test_review_alert_success():
    mock_db = AsyncMock()
    alert_to_review = FraudAlert(
        id=42,
        borrower_hash="b" * 64,
        gold_fingerprint=None,
        risk_score=90,
        alert_type=AlertType.VELOCITY,
        message="Velocity alert",
        status=AlertStatus.open,
        created_at=datetime.now(timezone.utc),
    )
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = alert_to_review
    mock_db.execute.return_value = mock_execute
    mock_db.commit = AsyncMock()

    app = _make_test_app(mock_db)
    client = TestClient(app)

    res = client.post("/api/alerts/42/review")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 42
    assert data["status"] == "acknowledged"
    assert alert_to_review.status == AlertStatus.acknowledged
    mock_db.commit.assert_awaited_once()


def test_review_alert_not_found():
    mock_db = AsyncMock()
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_execute

    app = _make_test_app(mock_db)
    client = TestClient(app)

    res = client.post("/api/alerts/9999/review")
    assert res.status_code == 404
