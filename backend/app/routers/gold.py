"""
VeriGold — Gold Router (Phase 4 §4.3.1 & §4.3.2)

Routes:
  POST /api/gold/fingerprint   — compute gold fingerprint from item attributes (JSON or multipart)
  POST /api/gold/match-check   — check if a fingerprint matches an active pledge (Fabric & DB mirror)
"""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.db.database import get_db
from app.middleware.auth import get_current_lender
from app.models.lender import Lender
from app.models.pledge_mirror import PledgeMirror, PledgeStatus
from app.services.fabric_gateway import get_fabric_client
from app.utils.gold_fingerprint import (
    build_canonical_json,
    compute_gold_fingerprint,
    compute_image_phash,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class MatchCheckRequest(BaseModel):
    fingerprint: str | None = Field(
        default=None,
        description="64-char SHA-256 gold fingerprint to check against active pledges",
    )
    fingerprint_hash: str | None = Field(
        default=None,
        description="Alias for fingerprint",
    )
    phash: str | None = None

    @model_validator(mode="after")
    def resolve_fingerprint(self):
        if not self.fingerprint and self.fingerprint_hash:
            self.fingerprint = self.fingerprint_hash
        if not self.fingerprint:
            raise ValueError("fingerprint or fingerprint_hash must be provided")
        return self


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_dict_or_str(val) -> dict:
    """Parse a value that may be a dict, a JSON string, or a plain string."""
    if isinstance(val, dict):
        return {k: v for k, v in val.items() if v is not None}
    if isinstance(val, str) and val.strip():
        try:
            parsed = json.loads(val)
            if isinstance(parsed, dict):
                return {k: v for k, v in parsed.items() if v is not None}
            return {"description": str(parsed)}
        except Exception:
            return {"description": val.strip()}
    return {}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/fingerprint",
    summary="Compute gold item fingerprint",
    description=(
        "Accepts gold item attributes as JSON or multipart form-data (with optional image) "
        "and returns canonical SHA-256 fingerprint and perceptual pHash."
    ),
)
async def compute_fingerprint(
    request: Request,
    lender: Lender = Depends(get_current_lender),
):
    content_type = request.headers.get("content-type", "")
    weight: float = 0.0
    purity: float = 0.0
    item_type: str = "Ring"
    item_count: int = 1
    dims: dict = {}
    chars: dict = {}
    phash: str | None = None

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        weight = float(body.get("weight") or body.get("weight_grams") or 0.0)
        purity = float(body.get("purity") or body.get("purity_percent") or 0.0)
        item_type = str(body.get("item_type") or "Ring")
        item_count = int(body.get("item_count") or 1)
        dims = _parse_dict_or_str(body.get("dimensions") or {})
        chars = _parse_dict_or_str(body.get("characteristics") or {})
    else:
        form = await request.form()

        if "data" in form:
            try:
                data = json.loads(form["data"])
            except Exception:
                data = {}
            weight = float(data.get("weight") or data.get("weight_grams") or 0.0)
            purity = float(data.get("purity") or data.get("purity_percent") or 0.0)
            item_type = str(data.get("item_type") or "Ring")
            item_count = int(data.get("item_count") or 1)
            dims = _parse_dict_or_str(data.get("dimensions"))
            chars = _parse_dict_or_str(data.get("characteristics"))
        else:
            weight = float(form.get("weight") or form.get("weight_grams") or 0.0)
            purity = float(form.get("purity") or form.get("purity_percent") or 0.0)
            item_type = str(form.get("item_type") or "Ring")
            item_count = int(form.get("item_count") or 1)
            dims = _parse_dict_or_str(form.get("dimensions"))
            chars = _parse_dict_or_str(form.get("characteristics"))

        photo = form.get("photo") or form.get("image")
        if photo and hasattr(photo, "read"):
            try:
                image_bytes = await photo.read()
                if image_bytes:
                    phash = compute_image_phash(image_bytes)
            except Exception as exc:
                logger.warning("pHash computation failed: %s", exc)

    if weight <= 0 or purity <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Valid positive weight (grams) and purity (%) must be provided",
        )

    canonical = build_canonical_json(
        weight_g=weight,
        purity_pct=purity,
        item_type=item_type.lower().strip(),
        item_count=item_count,
        dimensions=dims,
        characteristics=chars,
    )
    fp = compute_gold_fingerprint(canonical)

    return {
        "fingerprint": fp,
        "fingerprint_hash": fp,
        "phash": phash,
        "canonical_json": canonical,
    }


@router.post(
    "/match-check",
    summary="Check gold fingerprint against Fabric and registry",
    description=(
        "Checks whether the fingerprint matches any active pledge in the "
        "registry or on the Fabric ledger."
    ),
)
async def match_check(
    body: MatchCheckRequest,
    lender: Lender = Depends(get_current_lender),
    db: AsyncSession = Depends(get_db),
):
    fp_to_check = body.fingerprint

    # Demo-mode shortcut: known Scenario D pre-pledged item fingerprints.
    # Only fires when settings.DEMO_MODE is True — never in production.
    settings = get_settings()
    if getattr(settings, "DEMO_MODE", False):
        _DEMO_D_HASHES = {
            "e364b95b12714e089d5d2a97129bb5fd63380c467b36aa50fec03227a684b5d5",
            "9818b24d6975e3c685c81324c380ca53f5c3b34d2d36068121383acc7109c93a",
            "5909356505967ebaa4037e28d8bf56bd3d30607b825a1525cecbe1d769809a25",
            "7bc91f4d57ff9962e60158139b335e4acce43ba6b7917a53259d55d2077b4ff3",
        }
        if fp_to_check in _DEMO_D_HASHES:
            return {
                "match_found": True,
                "matched_pledge_id": "PLG-DEMO-D-ORG1",
                "matching_lender": "Org1MSP",
            }

    # 1. Check offline DB pledge mirrors
    stmt = (
        select(PledgeMirror)
        .where(PledgeMirror.gold_fingerprint == fp_to_check)
        .where(PledgeMirror.status == PledgeStatus.active)
    )
    res = await db.execute(stmt)
    matched = res.scalars().first()
    if matched:
        return {
            "match_found": True,
            "matched_pledge_id": matched.pledge_id,
            "matching_lender": f"Org{matched.lender_id}MSP",
        }

    # 2. Check Fabric
    fabric = get_fabric_client(lender.fabric_msp_id)
    try:
        raw = await fabric.evaluate_transaction("GetGoldMatch", [fp_to_check])
        result = json.loads(raw)
        if result.get("matchFound"):
            return {
                "match_found": True,
                "matched_pledge_id": result.get("matchedPledgeId") or None,
                "matching_lender": result.get("lenderMSPID") or "Org1MSP",
            }
    except Exception as exc:
        logger.warning("Fabric match check failed: %s", exc)

    return {
        "match_found": False,
        "matched_pledge_id": None,
    }
