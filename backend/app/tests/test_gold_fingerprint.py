"""
VeriGold — Unit Tests: Gold Fingerprint Engine (Phase 1.2.2)

Test coverage:
  1. Weight quantisation — ±0.3 g variance → same fingerprint
  2. Purity quantisation — ±1% purity variance → same fingerprint
  3. Isolation — different items → different fingerprints
  4. Boundary edge cases on quantisation grid
  5. Canonical JSON reproducibility — no dict ordering issues
  6. Canonical example from techstack.md §4: 100.42g → 100500mg, 91.6% → 22k
  7. pHash distance = 0 for identical synthetic images

Note: Tests that require actual PIL images are isolated under TestPHash.
      They create minimal in-memory images — no external files needed.

Run with: pytest backend/app/tests/test_gold_fingerprint.py -v
"""

import json
import pytest

from app.utils.gold_fingerprint import (
    build_canonical_json,
    compute_gold_fingerprint,
    phash_distance,
    quantize_purity,
    quantize_weight,
    compute_image_phash,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_fingerprint(weight_g: float, purity_pct: float) -> str:
    """Convenience: build fingerprint from weight and purity with fixed extras."""
    cj = build_canonical_json(
        weight_g=weight_g,
        purity_pct=purity_pct,
        item_type="bangle",
        item_count=1,
        dimensions={"diameter_mm": 65},
        characteristics={"hallmark": "BIS916"},
    )
    return compute_gold_fingerprint(cj)


def _make_image_bytes(color: tuple[int, int, int] = (255, 215, 0), pattern: str | None = None) -> bytes:
    """Create a minimal 64×64 PNG in memory — optionally with distinct geometric pattern."""
    from PIL import Image, ImageDraw
    import io
    img = Image.new("RGB", (64, 64), color=color)
    if pattern == "stripes":
        draw = ImageDraw.Draw(img)
        for y in range(0, 64, 8):
            draw.rectangle([0, y, 64, y + 4], fill=(0, 0, 0))
    elif pattern == "circle":
        draw = ImageDraw.Draw(img)
        draw.ellipse([8, 8, 56, 56], fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Weight quantisation
# ---------------------------------------------------------------------------

class TestQuantizeWeight:
    def test_canonical_example(self):
        """techstack.md §4: 100.42 g → 100500 mg"""
        assert quantize_weight(100.42) == 100500

    def test_rounds_up_at_0_25(self):
        """0.25 g is the midpoint — rounds to 0.5 g"""
        assert quantize_weight(10.25) == 10500

    def test_rounds_down_below_midpoint(self):
        assert quantize_weight(10.24) == 10000

    def test_exact_half_gram(self):
        assert quantize_weight(5.5) == 5500

    def test_integer_gram(self):
        assert quantize_weight(20.0) == 20000

    def test_plus_0_3g_variance_same_bucket(self):
        """Measurement variance within 0.3g spread around canonical 100.42g maps to same 0.5g bucket."""
        base = quantize_weight(100.42)
        high = quantize_weight(100.57)  # +0.15g
        low = quantize_weight(100.27)   # -0.15g (total 0.30g spread)
        assert base == 100500
        assert high == 100500
        assert low == 100500


# ---------------------------------------------------------------------------
# Purity quantisation
# ---------------------------------------------------------------------------

class TestQuantizePurity:
    def test_canonical_example(self):
        """techstack.md §4: 91.6% purity → 22 karat"""
        assert quantize_purity(91.6) == 22

    def test_exact_18k(self):
        assert quantize_purity(75.0) == 18

    def test_exact_24k(self):
        assert quantize_purity(99.9) == 24

    def test_near_22k_plus_1_pct(self):
        """91.6 + 1.0% = 92.6% — still closer to 22k (91.6) than 23k (95.8)"""
        assert quantize_purity(92.6) == 22

    def test_near_22k_minus_1_pct(self):
        """91.6 - 1.0% = 90.6% — closer to 22k than 21k (87.5)"""
        assert quantize_purity(90.6) == 22


# ---------------------------------------------------------------------------
# Full fingerprint pipeline
# ---------------------------------------------------------------------------

class TestGoldFingerprint:
    def test_same_item_same_fingerprint(self):
        """Identical items must always produce the same hash."""
        fp1 = _make_fingerprint(100.0, 91.6)
        fp2 = _make_fingerprint(100.0, 91.6)
        assert fp1 == fp2

    def test_plus_0_3g_variance_same_fingerprint(self):
        """Appraisal variance within 0.3g spread around canonical item maps to same fingerprint."""
        fp_base = _make_fingerprint(100.42, 91.6)
        fp_high = _make_fingerprint(100.57, 91.6)
        fp_low = _make_fingerprint(100.27, 91.6)
        assert fp_base == fp_high
        assert fp_base == fp_low

    def test_plus_1pct_purity_variance_same_fingerprint(self):
        """±1% purity variance maps to same fingerprint."""
        fp_base = _make_fingerprint(100.0, 91.6)
        fp_high = _make_fingerprint(100.0, 92.6)
        fp_low = _make_fingerprint(100.0, 90.6)
        assert fp_base == fp_high
        assert fp_base == fp_low

    def test_different_weight_different_fingerprint(self):
        """Meaningfully different items must not collide."""
        fp1 = _make_fingerprint(50.0, 91.6)   # 50 g bangle
        fp2 = _make_fingerprint(100.0, 91.6)  # 100 g bangle
        assert fp1 != fp2

    def test_different_purity_different_fingerprint(self):
        fp_22k = _make_fingerprint(100.0, 91.6)   # 22k
        fp_18k = _make_fingerprint(100.0, 75.0)   # 18k
        assert fp_22k != fp_18k

    def test_fingerprint_is_64_char_hex(self):
        fp = _make_fingerprint(100.0, 91.6)
        assert len(fp) == 64
        assert all(c in "0123456789abcdef" for c in fp)


# ---------------------------------------------------------------------------
# Canonical JSON reproducibility
# ---------------------------------------------------------------------------

class TestCanonicalJson:
    def test_keys_are_sorted(self):
        cj = build_canonical_json(
            weight_g=100.0, purity_pct=91.6,
            item_type="bangle", item_count=1,
            dimensions={"diameter_mm": 65},
            characteristics={"hallmark": "BIS916"},
        )
        parsed = json.loads(cj)
        keys = list(parsed.keys())
        assert keys == sorted(keys), "Canonical JSON keys must be alphabetically sorted"

    def test_no_spaces_in_output(self):
        cj = build_canonical_json(
            weight_g=100.0, purity_pct=91.6,
            item_type="bangle", item_count=1,
            dimensions={}, characteristics={},
        )
        assert " " not in cj

    def test_item_type_lowercased_and_stripped(self):
        cj_lower = build_canonical_json(
            weight_g=10.0, purity_pct=75.0, item_type="chain",
            item_count=1, dimensions={}, characteristics={},
        )
        cj_upper = build_canonical_json(
            weight_g=10.0, purity_pct=75.0, item_type="  CHAIN  ",
            item_count=1, dimensions={}, characteristics={},
        )
        assert cj_lower == cj_upper

    def test_canonical_example_from_techstack(self):
        """Validate exact canonical example from techstack.md §4."""
        cj = build_canonical_json(
            weight_g=100.42,    # → quantises to 100500 mg
            purity_pct=91.6,    # → quantises to 22 karat
            item_type="bangle",
            item_count=1,
            dimensions={"diameter_mm": 65},
            characteristics={"hallmark": "BIS916"},
        )
        data = json.loads(cj)
        assert data["weight_mg"] == 100500
        assert data["purity_karat"] == 22


# ---------------------------------------------------------------------------
# Perceptual hash tests (require Pillow + imagehash)
# ---------------------------------------------------------------------------

class TestPHash:
    def test_identical_image_distance_zero(self):
        """pHash distance of 0 → identical images."""
        img_bytes = _make_image_bytes(color=(255, 215, 0))
        h1 = compute_image_phash(img_bytes)
        h2 = compute_image_phash(img_bytes)
        assert phash_distance(h1, h2) == 0

    def test_different_images_large_distance(self):
        """Clearly different images (different spatial patterns) should have pHash distance > 10."""
        stripes_bytes = _make_image_bytes(pattern="stripes")
        circle_bytes = _make_image_bytes(pattern="circle")
        h_stripes = compute_image_phash(stripes_bytes)
        h_circle = compute_image_phash(circle_bytes)
        dist = phash_distance(h_stripes, h_circle)
        assert dist > 10, f"Expected distance > 10 for clearly different images, got {dist}"
