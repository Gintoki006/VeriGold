"""
VeriGold — ZK Proof Router (Phase 6 §6.2.2)

Implements:
  POST /api/zk/prove-exposure

Generates a ZK proof of the statement: "borrower's total exposure < threshold"
without revealing the actual exposure value.

Auth required. See zk_service.py for proof generation details.
"""
import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.middleware.auth import get_current_lender
from app.models.lender import Lender
from app.services.zk_service import generate_exposure_proof

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ProveExposureRequest(BaseModel):
    total_exposure: int = Field(
        ge=0,
        le=20,
        description=(
            "Borrower's total exposure (sum of amount_range_code across active pledges). "
            "Private input — never returned in response."
        ),
    )
    threshold: int = Field(
        ge=1,
        le=20,
        description="Lender's maximum acceptable exposure (public input — returned in response).",
    )


class ProveExposureResponse(BaseModel):
    statement: str = Field(
        description="Human-readable statement being proven.",
        examples=["total_exposure < threshold"],
    )
    threshold: int = Field(description="Public input: the threshold being proven against.")
    proof: str = Field(description="Proof bytes as a hex string.")
    verified: bool = Field(description="True if the proof was successfully verified.")
    mode: str = Field(
        description="'live' (Barretenberg CLI) or 'fallback' (pre-generated demo artifact).",
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/prove-exposure",
    response_model=ProveExposureResponse,
    summary="Generate ZK exposure proof",
    description=(
        "Generates a zero-knowledge proof that the borrower's total exposure is "
        "below the given threshold — without revealing the actual exposure value. "
        "The private input (`total_exposure`) is never included in the response."
    ),
)
async def prove_exposure(
    body: ProveExposureRequest,
    lender: Lender = Depends(get_current_lender),
) -> ProveExposureResponse:
    """
    POST /api/zk/prove-exposure

    Requires a valid JWT. Generates and verifies a Noir ZK proof.
    """
    logger.info(
        "ZK prove-exposure request: lender_id=%d threshold=%d",
        lender.id,
        body.threshold,
    )

    result = await generate_exposure_proof(
        total_exposure=body.total_exposure,
        threshold=body.threshold,
    )

    return ProveExposureResponse(
        statement=result["statement"],
        threshold=result["threshold"],
        proof=result["proof"],
        verified=result["verified"],
        mode=result["mode"],
    )
