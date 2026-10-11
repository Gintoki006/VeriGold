"""
VeriGold — Async SQLAlchemy database engine, session factory, and get_db() dependency.

Usage:
    from app.db.database import get_db
    async def my_route(db: AsyncSession = Depends(get_db)):
        ...
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config.settings import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Engine — asyncpg driver, pool_pre_ping keeps connections healthy
# ---------------------------------------------------------------------------
# Convert postgresql:// -> postgresql+asyncpg:// if needed
_raw_url = settings.DATABASE_URL
if _raw_url.startswith("postgresql://"):
    _async_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgres://"):
    _async_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    _async_url = _raw_url

engine = create_async_engine(
    _async_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=3,
    pool_recycle=180,
    connect_args={
        "timeout": None,
        "command_timeout": None,
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency — yields a session per request, always closed on exit
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async DB session; roll back on error, close when done."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
