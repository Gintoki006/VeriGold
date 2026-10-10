"""
VeriGold — Unit Tests: Borrower Identity Engine (Phase 1.1.3)

Test coverage:
  1. Determinism — same Aadhaar + same key → same hash every call
  2. Isolation — different Aadhaar → different hash
  3. Input validation — 11-digit, letters, empty, whitespace-only → ValueError
  4. Key dependency — different key → different hash
  5. Normalisation — spaces/dashes stripped before hashing

Run with: pytest backend/app/tests/test_borrower_identity.py -v
"""

import pytest

from app.utils.borrower_identity import compute_borrower_hash

# Stable test keys (32 bytes = 256-bit HMAC key)
_KEY_A = bytes.fromhex("a" * 64)
_KEY_B = bytes.fromhex("b" * 64)

# Valid demo Aadhaar numbers (synthetic — not real UIDs)
_AADHAAR_VALID_1 = "123456789012"
_AADHAAR_VALID_2 = "987654321098"


class TestDeterminism:
    """Same inputs must always produce the same output."""

    def test_same_aadhaar_same_key_same_hash(self):
        h1 = compute_borrower_hash(_AADHAAR_VALID_1, key=_KEY_A)
        h2 = compute_borrower_hash(_AADHAAR_VALID_1, key=_KEY_A)
        assert h1 == h2

    def test_output_is_64_char_hex(self):
        h = compute_borrower_hash(_AADHAAR_VALID_1, key=_KEY_A)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)


class TestIsolation:
    """Different Aadhaar numbers must produce different hashes."""

    def test_different_aadhaar_different_hash(self):
        h1 = compute_borrower_hash(_AADHAAR_VALID_1, key=_KEY_A)
        h2 = compute_borrower_hash(_AADHAAR_VALID_2, key=_KEY_A)
        assert h1 != h2


class TestKeyDependency:
    """Hash must change when the HMAC key changes (key-binding property)."""

    def test_different_key_different_hash(self):
        h_a = compute_borrower_hash(_AADHAAR_VALID_1, key=_KEY_A)
        h_b = compute_borrower_hash(_AADHAAR_VALID_1, key=_KEY_B)
        assert h_a != h_b


class TestInputValidation:
    """Invalid inputs must raise ValueError — never silently produce garbage."""

    @pytest.mark.parametrize("bad_input", [
        "12345678901",     # 11 digits — too short
        "1234567890123",   # 13 digits — too long
        "12345678901a",    # letters mixed in
        "abcdefghijkl",    # all letters
        "",                # empty string
        "   ",             # whitespace only
        "0000 0000 000",   # 11 digits with spaces
        "1234 5678 90",    # 10 digits with spaces
    ])
    def test_invalid_format_raises_value_error(self, bad_input):
        with pytest.raises(ValueError, match="Invalid Aadhaar format"):
            compute_borrower_hash(bad_input, key=_KEY_A)


class TestNormalisation:
    """Spaces and dashes common in display formats should be stripped."""

    def test_spaces_stripped_matches_raw(self):
        raw = compute_borrower_hash("123456789012", key=_KEY_A)
        spaced = compute_borrower_hash("1234 5678 9012", key=_KEY_A)
        assert raw == spaced

    def test_dashes_stripped_matches_raw(self):
        raw = compute_borrower_hash("123456789012", key=_KEY_A)
        dashed = compute_borrower_hash("1234-5678-9012", key=_KEY_A)
        assert raw == dashed
