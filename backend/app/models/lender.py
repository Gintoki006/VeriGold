"""VeriGold — Lender model (enrolled gold lending institution)."""
from datetime import datetime
import enum
from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class LenderStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class Lender(Base):
    """
    Represents an enrolled lender on the VeriGold platform.
    Login identity is stored as an opaque reference (e.g., Supabase user UUID) —
    no plaintext passwords or PII held here.
    """
    __tablename__ = "lenders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    login_identity_ref: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True,
        comment="Opaque ref to Supabase auth user UUID"
    )
    fabric_msp_id: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="Hyperledger Fabric MSP identifier, e.g. Org1MSP"
    )
    organization_name: Mapped[str] = mapped_column(String(128), nullable=False)
    api_key_hash: Mapped[str | None] = mapped_column(
        String(128), nullable=True,
        comment="bcrypt hash of API key — original never stored"
    )
    status: Mapped[LenderStatus] = mapped_column(
        Enum(LenderStatus), nullable=False, default=LenderStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
