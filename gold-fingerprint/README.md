# gold-fingerprint

Gold attribute quantization and SHA-256 fingerprinting engine.

- `quantize/` — weight (→ nearest 0.5g) and purity (→ nearest karat) bucketing
- `hashing/` — canonical JSON serialization → SHA-256
- `phash/` — image perceptual hash (supporting evidence only)
- `tests/` — unit tests

See [`../docs/decisions.md`](../docs/decisions.md) Decision 2 for exact quantization rules.
