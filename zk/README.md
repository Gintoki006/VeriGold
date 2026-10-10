# zk

Zero-Knowledge proof layer (Noir + Barretenberg).

## Scope

One circuit only — proving the single exposure-threshold statement:

```
total_amount_range_sum < threshold
```

- **Private input:** `total_exposure` — the borrower's actual bucket sum (NEVER revealed)
- **Public input:** `threshold` — the lender's stated maximum acceptable exposure

See [`../docs/decisions.md`](../docs/decisions.md) Decision 9 for the locked ZK statement.

## Directories

- `circuits/` — Noir source: `exposure_threshold/src/main.nr`
- `proofs/` — Pre-generated proof artifacts for fallback demo

## Fallback Plan

See `proofs/README.md`. If live proof generation is unstable near demo day, use `proofs/demo_proof.json` (pre-generated, clearly labelled during demo).
