# VeriGold — Locked Team Decisions

> **Status:** All 12 decisions locked before coding.  
> Source: PRD.md §35  
> These decisions must not be changed during implementation without a documented team discussion.

---

## Decision 1 — Borrower Hash Key / Pepper Management

**Decision:** The HMAC-SHA256 pepper (server-side secret key) is stored exclusively as an environment variable (`BORROWER_HASH_KEY`). It is never stored in the database, never sent to the frontend, and never hardcoded in source code.

**Rationale:** Storing it in the DB would expose it to a DB breach. Sending it to the frontend would allow borrower hash reversal. Env var with a secret manager (e.g., Render/Railway secrets) is sufficient for MVP.

---

## Decision 2 — Gold Weight and Purity Quantization Buckets

**Decision:**
- Weight: quantize to the nearest **0.5g** (e.g., 100.42g → 100.5g → stored as 100500 mg integer).
- Purity: quantize to the nearest **karat** (e.g., 91.6% → 22 karat).

**Rationale:** Independent appraisals of the same gold item will have small measurement variance. Exact-value hashing would not match. These buckets are the minimum granularity needed for reliable cross-lender deduplication.

---

## Decision 3 — Risk Score Thresholds and Rule Weights

**Decision:**

| Condition | Score Impact |
|---|---:|
| 0 active loans | +10 |
| 1 active loan | +25 |
| 2 active loans | +50 |
| 3+ active loans | +80 |
| Velocity ≥ 2 pledges in 7 days | +20 |
| Gold fingerprint match found | +40 |
| High total exposure (range sum ≥ 3) | +15 |

Thresholds:
- LOW: score < 30
- MEDIUM: score 30–69
- HIGH: score ≥ 70

All weights and thresholds are in `backend/app/config/settings.py::RiskConfig` — never hardcoded inline.

---

## Decision 4 — LLM Escalation Rule

**Decision:** The Gemini LLM may escalate a recommendation from REDUCE_AMOUNT to REJECT **only if it explicitly names one or both of these concerns:**
- `velocity_anomaly`
- `cross_identity_gold_match`

The LLM:
- Can **never** lower a risk score.
- Can **never** change REJECT to APPROVE or REDUCE.
- Can **never** change APPROVE to REDUCE.
- Is **never** the sole authority on the risk decision.

**Rationale:** Prevents hallucination-driven false approvals and unpredictable score manipulation.

---

## Decision 5 — On-Chain Read/Write Authorization

**Decision:**
- **Read** (`GetBorrowerSummary`, `GetPledge`, `GetGoldMatch`, `GetActivePledges`): any enrolled lender may read.
- **Write** (`RegisterPledge`): any enrolled lender may write.
- **ClosePledge**: only the lender org whose `MSPID` matches the pledge's `lender_id` may close it.

---

## Decision 6 — Fabric Org / Peer Setup for Demo

**Decision:** 2 Fabric organizations for the demo network:
- Org1 = **LenderA** (e.g., Bank A)
- Org2 = **LenderB** (e.g., NBFC B)

Base network: `fabric-samples/test-network`. Do not build a custom Fabric network from scratch.

---

## Decision 7 — Pledge Mutations: Custodial Backend Signing

**Decision:** All Fabric pledge write operations (RegisterPledge, ClosePledge) are signed and submitted by the **backend** using the lender's Fabric CA-issued MSP identity. The frontend never holds or uses Fabric keys.

**Rationale:** Fabric's trust model uses its own CA/MSP PKI. Browser-side signing would require exposing Fabric private keys to the frontend — unacceptable.

---

## Decision 8 — Lender Onboarding and Allowlisting

**Decision:** Lenders are onboarded via an **admin allowlist**. A lender account is created in the `lenders` Supabase table with `status = 'active'`. The backend rejects any Fabric write operation from a lender whose status is not `'active'`. Fabric CA identity issuance is also an admin-triggered step.

---

## Decision 9 — Zero-Knowledge Proof: Single Statement and Exact Inputs

**Decision:**
- **Statement:** `total_amount_range_sum < threshold`
- **Private input:** `total_exposure` (the borrower's actual bucket sum — NEVER revealed to the querying lender)
- **Public input:** `threshold` (the lender's stated maximum acceptable exposure)

Only this one statement is in scope for MVP. No further ZK use cases.

---

## Decision 10 — Demo Data Format and Fallback Plan

**Decision:** Demo uses 4 synthetic borrower hashes (Scenarios A–D). No real Aadhaar numbers.

| Scenario | Active Pledges | Velocity | Gold Match | Expected |
|---|---|---|---|---|
| A — Clean | 0 | 0 | No | LOW |
| B — Moderate | 2 | 1 | No | MEDIUM |
| C — Velocity Fraud | 4 | 4 in 7d | No | HIGH |
| D — Gold Match Fraud | 0 | 0 | YES | HIGH |

**Fallback:**
- If Fabric is unstable near demo: use pre-seeded PostgreSQL mirror data for the risk report.
- If ZK proving is too slow: use pre-generated proof artifact at `zk/proofs/demo_proof.json` (clearly labelled during the demo).
- Decision deadline for fallback: **end of Phase 5**.

---

## Decision 11 — Error Handling: Fabric / Risk Engine / ZK Unavailability

**Decision:**
- **Fabric unavailable:** Return HTTP 503. Never return a cached, fabricated, or partial risk result.
- **Risk engine unavailable:** Return HTTP 503. Never fabricate a risk level.
- **ZK proof generation fails:** Return a clearly labelled failure state. Never silently skip the proof step or show a fake verification result.

> *Integrity over availability, always.*

---

## Decision 12 — Off-Chain Query Log Retention

**Decision:** Off-chain query logs are retained for **90 days**. Logs contain: lender ID, action type, timestamp, success/failure, transaction hash (where applicable), correlation ID. Logs must **never** contain plaintext Aadhaar or other PII — only borrower hashes.

---

## Decision 13 — ZK Proof Strategy for Demo and Cloud Deployment (Phase 9)

**Decision date:** Phase 9  
**Decision:** Use **live ZK proof generation on the local demo machine**. Use **pre-generated proof fallback** on any cloud deployment.

**Details:**

| Environment | ZK Mode | Config |
|---|---|---|
| Local demo machine (with Nargo installed) | Live `bb prove` + `bb verify` | `ZK_PROOF_FALLBACK=false` |
| Render / Railway cloud backend | Pre-generated fallback artifact | `ZK_PROOF_FALLBACK=true` |
| CI / test suite | Fallback (no binary dependency) | `ZK_PROOF_FALLBACK=true` |

**Rationale:**
- The Barretenberg `bb` binary and Nargo toolchain are not available in standard cloud containers without a custom build layer.
- Installing the full Noir toolchain in a container image adds ~500 MB and significant build time — unacceptable for an MVP demo deploy.
- The fallback artifact (`zk/proofs/demo_proof.json`) is a real, pre-generated Noir proof for the `exposure_threshold` circuit. It is clearly labelled `"mode": "fallback"` in the API response.
- Live proving on the demo machine provides a genuine ZK demonstration without cloud constraints.

**Integrity contract:** The fallback response must always include `"mode": "fallback"` so the frontend can display the "Pre-generated proof (demo mode)" label. It must never claim the proof was just generated.
