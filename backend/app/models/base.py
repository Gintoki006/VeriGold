"""VeriGold — SQLAlchemy async declarative base and session factory."""
from sqlalchemy.ext.asyncio import AsyncAttrs, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config.settings import get_settings


class Base(AsyncAttrs, DeclarativeBase):
    """Shared base for all VeriGold ORM models."""
    pass


def build_engine():
    settings = get_settings()
    return create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )


def build_session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False)
