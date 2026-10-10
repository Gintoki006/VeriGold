"""VeriGold — Query model (audit log for every borrower risk query)."""
from datetime import datetime
import enum
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Query(Base):
    """
    Immutable audit record for every risk query made by a lender.
    Retained for 90 days per Decision 12. No borrower PII — only hashes.
    """
    __tablename__ = "queries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lender_id: Mapped[int] = mapped_column(
        ForeignKey("lenders.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    borrower_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="HMAC-SHA256 commitment — no plaintext Aadhaar"
    )
    risk_score: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Composite score 0-100 from deterministic rule engine"
    )
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel), nullable=False
    )
    recommendation: Mapped[str] = mapped_column(
        String(32), nullable=False,
        comment="APPROVE | REDUCE_AMOUNT | REJECT"
    )
    llm_escalated: Mapped[bool] = mapped_column(
        default=False, nullable=False,
        comment="True if LLM override modified the recommendation"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    lender = relationship("Lender", lazy="selectin")
