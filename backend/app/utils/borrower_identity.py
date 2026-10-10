"""
VeriGold — Borrower Identity Engine (Phase 1.1.1)

Privacy-preserving HMAC-SHA256 commitment scheme for Aadhaar numbers.

Design:
  - Only the HMAC hash is ever stored or transmitted; plaintext Aadhaar never
    leaves this function.
  - The HMAC key (BORROWER_HASH_KEY) is a hex-encoded secret loaded exclusively
    from the environment via Settings — never hardcoded, never in the DB.
  - Output is a 64-character lowercase hex string (256 bits of collision resistance).
  - Deterministic: same Aadhaar + same key → same hash, always.

Decision references:
  - Decision 1 (docs/decisions.md): HMAC pepper in env var only
  - Decision 12: No PII in query logs — only hashes
"""

import hashlib
import hmac
import re

from app.config.settings import get_settings

# Aadhaar is exactly 12 decimal digits (per UIDAI specification)
_AADHAAR_RE = re.compile(r"^\d{12}$")


def _load_key() -> bytes:
    """
    Decode the hex-encoded BORROWER_HASH_KEY from settings into raw bytes.
    Called once per process; cached by the @lru_cache on get_settings().
    """
    settings = get_settings()
    raw = settings.BORROWER_HASH_KEY
    try:
        return bytes.fromhex(raw)
    except ValueError:
        # Fallback: treat as UTF-8 string key (development only)
        return raw.encode("utf-8")


def compute_borrower_hash(aadhaar: str, key: bytes | None = None) -> str:
    """
    Compute the HMAC-SHA256 commitment for an Aadhaar number.

    Args:
        aadhaar: The 12-digit Aadhaar number (with or without spaces/dashes).
        key:     Optional override key (for unit tests). Defaults to the
                 BORROWER_HASH_KEY from application settings.

    Returns:
        64-character lowercase hex string.

    Raises:
        ValueError: If the Aadhaar number is not exactly 12 decimal digits
                    after normalisation.
    """
    # Normalise: strip all whitespace and dashes (common user input formats)
    normalised = re.sub(r"[\s\-]", "", aadhaar)

    if not _AADHAAR_RE.match(normalised):
        raise ValueError(
            f"Invalid Aadhaar format: must be exactly 12 decimal digits, "
            f"got {len(normalised)!r} characters after normalisation."
        )

    effective_key = key if key is not None else _load_key()

    return hmac.new(
        effective_key,
        normalised.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
