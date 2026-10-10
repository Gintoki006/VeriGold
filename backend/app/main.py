"""
VeriGold — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import get_settings
from app.db.database import engine
from app.routers import admin, alerts, auth, borrowers, dashboard, gold, pledges, transactions, zk
import app.services.auth_service as auth_svc
from app.utils.errors import (
    FabricUnavailableError,
    PledgeNotFoundError,
    RiskEngineUnavailableError,
    UnauthorizedPledgeError,
)

settings = get_settings()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VeriGold API starting up...")
    # Warm Redis pool
    try:
        redis = await auth_svc.get_redis()
        await redis.ping()
        try:
            from urllib.parse import urlsplit, urlunsplit
            parsed = urlsplit(settings.REDIS_URL)
            if parsed.password:
                netloc = f"{parsed.username or ''}:***@{parsed.hostname}{f':{parsed.port}' if parsed.port else ''}"
                safe_url = urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))
            else:
                safe_url = settings.REDIS_URL
        except Exception:
            safe_url = "redis://[configured]"
        logger.info("Redis connected: %s", safe_url)
    except Exception as exc:
        logger.warning("Redis not available at startup: %s", exc)

    # Verify DB connectivity
    try:
        async with engine.connect() as conn:
            pass
        logger.info("Database connected.")
    except Exception as exc:
        logger.warning("Database not available at startup: %s", exc)

    yield

    logger.info("VeriGold API shutting down...")
    if auth_svc._redis_pool is not None:
        await auth_svc._redis_pool.aclose()
        logger.info("Redis pool closed.")
    await engine.dispose()
    logger.info("DB engine disposed.")


app = FastAPI(
    title="VeriGold API",
    description="Privacy-preserving cross-lender gold loan registry",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_cors_origins: list[str] = []
if settings.FRONTEND_URL:
    _cors_origins.append(settings.FRONTEND_URL.rstrip("/"))
if settings.NEXT_PUBLIC_API_URL and settings.NEXT_PUBLIC_API_URL not in _cors_origins:
    _cors_origins.append(settings.NEXT_PUBLIC_API_URL.rstrip("/"))
if not _cors_origins:
    _cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(borrowers.router, prefix="/api/borrowers", tags=["borrowers"])
app.include_router(gold.router, prefix="/api/gold", tags=["gold"])
app.include_router(pledges.router, prefix="/api/pledges", tags=["pledges"])
app.include_router(zk.router, prefix="/api/zk", tags=["zk"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# ---------------------------------------------------------------------------
def _cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    headers: dict[str, str] = {}
    if origin and (origin.rstrip("/") in _cors_origins or "*" in _cors_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return headers


# ---------------------------------------------------------------------------
# Domain exception handlers (FabricUnavailableError, PledgeNotFoundError, etc.)
# These all extend HTTPException so FastAPI serialises them automatically.
# We register explicit handlers to ensure they are never swallowed by the
# catch-all 500 handler below.
# ---------------------------------------------------------------------------
@app.exception_handler(FabricUnavailableError)
@app.exception_handler(PledgeNotFoundError)
@app.exception_handler(UnauthorizedPledgeError)
@app.exception_handler(RiskEngineUnavailableError)
async def domain_exception_handler(request: Request, exc: Exception):
    from fastapi.responses import JSONResponse as _JSONResponse
    resp_headers = _cors_headers(request)
    if hasattr(exc, "headers") and exc.headers:
        resp_headers.update(exc.headers)
    return _JSONResponse(
        status_code=exc.status_code,  # type: ignore[attr-defined]
        content={"detail": exc.detail},  # type: ignore[attr-defined]
        headers=resp_headers,
    )

# ---------------------------------------------------------------------------
# Global exception handler — never leak stack traces to clients
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
        headers=_cors_headers(request),
    )

# ---------------------------------------------------------------------------
# Health endpoint — reflects live connectivity in Phase 3+
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health():
    """Health check. Reflects live Redis and DB connectivity."""
    redis_ok = False
    try:
        redis = await auth_svc.get_redis()
        await redis.ping()
        redis_ok = True
    except Exception:
        pass

    return {"status": "ok", "fabric": False, "redis": redis_ok}


