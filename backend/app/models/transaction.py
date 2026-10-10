"""VeriGold — Transaction model (Fabric transaction audit trail)."""
from datetime import datetime
import enum
from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class TransactionType(str, enum.Enum):
    REGISTER_PLEDGE = "REGISTER_PLEDGE"
    CLOSE_PLEDGE = "CLOSE_PLEDGE"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    failed = "failed"


class Transaction(Base):
    """
    Audit trail for every Fabric transaction submitted by the backend.
    Correlates Fabric tx hashes to internal pledge and lender IDs.
    Used for reconciliation and dispute resolution.
    """
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lender_id: Mapped[int] = mapped_column(
        ForeignKey("lenders.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    pledge_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="UUID of the pledge this transaction relates to"
    )
    transaction_hash: Mapped[str | None] = mapped_column(
        String(128), nullable=True, unique=True,
        comment="Fabric-assigned transaction ID (TxID); null while pending"
    )
    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType), nullable=False
    )
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), nullable=False, default=TransactionStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    lender = relationship("Lender", lazy="selectin")
