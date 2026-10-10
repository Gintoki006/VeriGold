# zk/proofs — Pre-Generated ZK Proof Artifacts

## Purpose

This directory holds pre-generated ZK proof artifacts for use as a **demo fallback** if live proof generation is too slow or unstable near demo day.

## The Proven Statement

```
total_amount_range_sum < threshold
```

- **Private input:** `total_exposure` — the borrower's actual bucket sum (NEVER shown to the verifier)
- **Public input:** `threshold` — the lender's stated maximum acceptable exposure

## How to Pre-Generate

```bash
# 1. Navigate to the circuit
cd zk/circuits/exposure_threshold

# 2. Compile the circuit
nargo compile

# 3. Set example inputs in Prover.toml:
#    total_exposure = "3"
#    threshold = "5"

# 4. Generate the proof
nargo prove

# 5. Verify the proof locally
nargo verify

# 6. Copy the resulting proof to this directory:
cp target/proof ../../proofs/demo_proof.json
```

## Fallback Decision Deadline

**End of Phase 5.** Before Phase 6 begins, the team must decide:
- Live proof generation during demo, OR
- Pre-generated proof (clearly labelled during presentation)

## Note

Never present a pre-generated proof as a live proof during the demo. If using fallback, state explicitly: *"This is a pre-generated proof artifact — verifiable on demand."*
