"""
VeriGold — Domain Exceptions (Phase 4 §4.1.2)

All domain errors map to specific HTTP status codes via the global exception
handlers registered in main.py.

Usage:
    raise FabricUnavailableError("peer timeout")
    raise PledgeNotFoundError("PLG-ABC123")
"""
from fastapi import HTTPException, status


class FabricUnavailableError(HTTPException):
    """Hyperledger Fabric Gateway is unreachable or returned an unexpected error."""
    def __init__(self, detail: str = "Fabric ledger is temporarily unavailable."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            headers={"Retry-After": "10"},
        )


class PledgeNotFoundError(HTTPException):
    """No pledge with the given pledge_id exists on-chain or in the mirror table."""
    def __init__(self, pledge_id: str = ""):
        msg = f"Pledge '{pledge_id}' not found." if pledge_id else "Pledge not found."
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=msg)


class UnauthorizedPledgeError(HTTPException):
    """Requesting lender does not own the pledge they are trying to close."""
    def __init__(self, pledge_id: str = ""):
        msg = (
            f"Lender is not authorized to modify pledge '{pledge_id}'."
            if pledge_id
            else "Unauthorized pledge operation."
        )
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=msg)


class RiskEngineUnavailableError(HTTPException):
    """Risk engine failed in a way that prevents returning a result."""
    def __init__(self, detail: str = "Risk engine is temporarily unavailable."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )
