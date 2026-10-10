"""VeriGold — FraudAlert model (system-generated risk alerts)."""
from datetime import datetime
import enum
from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AlertType(str, enum.Enum):
    VELOCITY = "VELOCITY"
    GOLD_MATCH = "GOLD_MATCH"
    HIGH_EXPOSURE = "HIGH_EXPOSURE"


class AlertStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"


class FraudAlert(Base):
    """
    System-generated alert when a borrower triggers a risk rule.
    Contains only hashes — no plaintext borrower identity.
    Visible to lenders who hold an active pledge against this borrower.
    """
    __tablename__ = "fraud_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    borrower_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="HMAC-SHA256 of Aadhaar — never stores plaintext"
    )
    gold_fingerprint: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="Set for GOLD_MATCH alerts; null for VELOCITY/HIGH_EXPOSURE"
    )
    risk_score: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Score at the time alert was triggered"
    )
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType), nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Human-readable alert description for lender dashboard"
    )
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus), nullable=False, default=AlertStatus.open
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
