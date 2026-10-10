"""
VeriGold — Gold Fingerprint Engine (Phase 1.2.1)

Cryptographic fingerprinting pipeline for gold items:

  1. quantize_weight   — rounds weight to nearest 0.5 g → milligrams (int)
  2. quantize_purity   — rounds purity percentage to nearest karat (int)
  3. build_canonical_json — assembles a fully-sorted, deterministic JSON string
  4. compute_gold_fingerprint — SHA-256 of canonical JSON → hex string
  5. compute_image_phash — perceptual hash of a gold item photo → hex string
  6. phash_distance — Hamming distance between two pHash hex strings

Design decisions (docs/decisions.md §2):
  - Weight tolerance: ±0.25 g maps to same bucket (round to nearest 0.5 g)
  - Purity tolerance: ±0.5 karat maps to same bucket (round to nearest karat)
  - Canonical JSON uses sort_keys=True + no spaces → deterministic across
    Python versions and dict insertion order
  - SHA-256 is collision-resistant for fraud detection at our scale

Reference example (techstack.md §4):
  100.42 g → 100.5 g → 100500 mg
  91.6 % purity → 22 karat
"""

import hashlib
import io
import json
import math
from typing import Any


# ---------------------------------------------------------------------------
# Weight quantisation
# ---------------------------------------------------------------------------

def quantize_weight(weight_g: float) -> int:
    """
    Round weight to the nearest 0.5 g and return as milligrams (integer).

    Uses round-half-up arithmetic rounding on the 0.5g grid.

    Example:
        >>> quantize_weight(100.42)
        100500
        >>> quantize_weight(10.25)
        10500
        >>> quantize_weight(10.24)
        10000
    """
    steps = math.floor(weight_g * 2.0 + 0.5)
    return int(steps * 500)


# ---------------------------------------------------------------------------
# Purity quantisation
# ---------------------------------------------------------------------------

# Karat → percentage lookup (standard gold purity values)
_KARAT_PURITY: list[tuple[int, float]] = [
    (24, 99.9),
    (23, 95.8),
    (22, 91.6),
    (21, 87.5),
    (20, 83.3),
    (18, 75.0),
    (14, 58.3),
    (10, 41.7),
    (9, 37.5),
]


def quantize_purity(purity_percentage: float) -> int:
    """
    Round purity percentage to the nearest standard karat value.

    Nearest-karat is defined by minimum absolute distance to the _KARAT_PURITY
    table. Ties go to the higher karat.

    Example:
        >>> quantize_purity(91.6)   # 22k gold
        22
        >>> quantize_purity(90.0)   # closer to 22k (91.6%) than 21k (87.5%)
        22
        >>> quantize_purity(75.0)   # exactly 18k
        18
    """
    return min(
        _KARAT_PURITY,
        key=lambda kp: abs(purity_percentage - kp[1]),
    )[0]


# ---------------------------------------------------------------------------
# Canonical JSON construction
# ---------------------------------------------------------------------------

def build_canonical_json(
    weight_g: float,
    purity_pct: float,
    item_type: str,
    item_count: int,
    dimensions: dict[str, Any],
    characteristics: dict[str, Any],
) -> str:
    """
    Build a deterministic, alphabetically-sorted JSON string for a gold item.

    All floating-point inputs are quantised before serialisation so that
    small measurement variances map to the same fingerprint.

    Args:
        weight_g:        Gross weight in grams (will be quantised to mg).
        purity_pct:      Gold purity as percentage (will be quantised to karat).
        item_type:       E.g. "bangle", "chain", "coin" (lowercase, stripped).
        item_count:      Number of identical items (e.g. 2 bangles = 2).
        dimensions:      Free-form measurement dict (passed through as-is).
        characteristics: Additional physical descriptors (passed through as-is).

    Returns:
        Compact JSON string with sorted keys, no spaces.
    """
    data = {
        "characteristics": characteristics,
        "dimensions": dimensions,
        "item_count": item_count,
        "item_type": item_type.strip().lower(),
        "purity_karat": quantize_purity(purity_pct),
        "weight_mg": quantize_weight(weight_g),
    }
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


# ---------------------------------------------------------------------------
# SHA-256 fingerprint
# ---------------------------------------------------------------------------

def compute_gold_fingerprint(canonical_json: str) -> str:
    """
    SHA-256 hash of the canonical JSON string.

    Returns a 64-character lowercase hex string.
    """
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Perceptual hashing (image)
# ---------------------------------------------------------------------------

def compute_image_phash(image_bytes: bytes) -> str:
    """
    Compute the perceptual hash (pHash) of a gold item image.

    Uses imagehash.phash() with a PIL image decoded from raw bytes.
    Returns the hash as a hex string (e.g. "f8e0c0a0a0c0e0f8").

    Requires: imagehash>=4.3.1, Pillow>=10.3.0
    """
    import imagehash  # deferred to avoid hard import at module load
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes))
    return str(imagehash.phash(image))


def phash_distance(hash1: str, hash2: str) -> int:
    """
    Compute the Hamming distance between two pHash hex strings.

    A distance of 0 means identical images.
    A distance > 10 typically indicates clearly different items.

    Args:
        hash1: Hex string from compute_image_phash().
        hash2: Hex string from compute_image_phash().

    Returns:
        Integer Hamming distance (number of differing bits).
    """
    import imagehash

    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    return h1 - h2
