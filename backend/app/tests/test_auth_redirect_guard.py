"""
VeriGold — Auth Redirect Guard and Header Tests

Tests that 401 Unauthorized responses from protected endpoints
include standard CORS headers so client-side Axios response interceptors
can clear session credentials and route safely without CORS preflight failures
or redirect loops.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_unauthorized_protected_endpoint_cors_headers():
    """Verify 401 response emits proper CORS headers and details."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request /api/auth/me without token
        response = await client.get(
            "/api/auth/me",
            headers={"Origin": "http://localhost:3000"}
        )
        assert response.status_code in (401, 403)
        assert "detail" in response.json()
        assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_invalid_bearer_token_rejected():
    """Verify malformed bearer token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/auth/me",
            headers={
                "Authorization": "Bearer invalid.jwt.token",
                "Origin": "http://localhost:3000",
            }
        )
        assert response.status_code == 401
