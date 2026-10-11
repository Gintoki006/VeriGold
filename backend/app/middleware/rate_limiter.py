import logging
"""
VeriGold — Redis Sliding Window Rate Limiter

Implements a per-lender sliding window rate limiter for the borrower search
endpoint (POST /api/borrowers/search) using Redis atomic Lua scripts.

Key format:  rate:borrower_search:{lender_id}
Window:      60 seconds
Limit:       settings.BORROWER_SEARCH_RATE_LIMIT requests per window

Returns HTTP 429 with Retry-After header if the limit is exceeded.

Usage (FastAPI dependency):
    @router.post("/search")
    async def search(
        lender: Lender = Depends(get_current_lender),
        _: None = Depends(borrower_search_rate_limit),
    ):
        ...
"""
import time

from fastapi import Depends, HTTPException, Request, status

from app.config.settings import get_settings
from app.middleware.auth import get_current_lender
from app.models.lender import Lender
from app.services.auth_service import get_redis

settings = get_settings()
logger = logging.getLogger(__name__)

_WINDOW_SECONDS = 60
_RATE_KEY_PREFIX = "rate:borrower_search:"

# Lua script — atomic check-and-increment inside a sliding window
_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local cutoff = now - window

-- Remove timestamps older than the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

-- Count requests within the window
local count = redis.call('ZCARD', key)

if count >= limit then
    -- Return the oldest timestamp so the caller knows when to retry
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    if oldest and oldest[2] then
        return {0, math.ceil(oldest[2] + window - now)}
    end
    return {0, window}
end

-- Add current timestamp
redis.call('ZADD', key, now, now)
redis.call('EXPIRE', key, window)
return {1, 0}
"""


async def borrower_search_rate_limit(
    lender: Lender = Depends(get_current_lender),
) -> None:
    """
    FastAPI dependency: enforce per-lender sliding-window rate limit.
    Raises HTTP 429 with Retry-After if the limit is exceeded.
    """
    try:
        redis = await get_redis()
        if redis is None:
            return
        key = f"{_RATE_KEY_PREFIX}{lender.id}"
        now = time.time()
        limit = settings.BORROWER_SEARCH_RATE_LIMIT

        result = await redis.eval(
            _SLIDING_WINDOW_LUA,
            1,          # number of keys
            key,        # KEYS[1]
            now,        # ARGV[1]
            _WINDOW_SECONDS,  # ARGV[2]
            limit,      # ARGV[3]
        )
        allowed, retry_after = int(result[0]), int(result[1])
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Redis rate limiter unavailable, failing open: %s", exc)


async def check_rate_limit(lender_id: int, redis) -> None:
    """
    Imperative rate-limit check for use in route handlers that already hold
    a redis instance. Raises HTTP 429 if exceeded.
    """
    if redis is None:
        return
    key = f"{_RATE_KEY_PREFIX}{lender_id}"
    now = time.time()
    limit = settings.BORROWER_SEARCH_RATE_LIMIT

    try:
        result = await redis.eval(
            _SLIDING_WINDOW_LUA,
            1,
            key,
            now,
            _WINDOW_SECONDS,
            limit,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Redis rate limit check failed, failing open: %s", exc)
        return

    allowed, retry_after = int(result[0]), int(result[1])
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "retry_after": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )
