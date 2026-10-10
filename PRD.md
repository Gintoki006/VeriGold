# VeriGold — Product Requirements Document (PRD)

**Product:** VeriGold — "CIBIL for Gold Loans"
**Document:** Team PRD / Implementation Requirements
**Version:** 2.0 (Finalized — Hackathon Build)
**Audience:** Developers, designers, AI/backend engineers, smart-contract engineers, QA, presenters
**Timeline:** 1–2 weeks to hackathon
**Primary Goal:** Single implementation-oriented document defining what the team must build, how the system should behave, and what is required for the MVP.

---

## 1. Product Overview

VeriGold is a decentralized, privacy-preserving cross-lender registry for gold-loan lenders.

Before disbursing a gold loan, a lender can query whether the borrower already has active gold-loan exposure recorded by participating lenders, and whether the specific gold item being pledged has already been pledged elsewhere. VeriGold does **not** expose another lender's customer details. Instead, it returns aggregate risk signals such as:

- Active pledge count
- Bucketed exposure range
- Recent pledge velocity
- Gold-fingerprint match status (same physical item pledged elsewhere)
- Risk score (hybrid rule-based + LLM)
- Risk level
- Explainable risk factors
- Suggested lending action (APPROVE / REDUCE / REJECT)

### Core product principle

> **A lender does not need to know where the other loans are. It needs to know that they exist.**

### MVP outcome

A lender should be able to:

1. Log in via wallet-style signed-challenge authentication.
2. Search a borrower using an Aadhaar number (hashed client-side before transmission).
3. Submit gold appraisal data (and optionally a photo) for fingerprinting.
4. Retrieve the borrower's aggregate pledge information and any gold-fingerprint match.
5. Receive an explainable, hybrid (rule-based + LLM) risk report.
6. Optionally view a zero-knowledge proof verifying an exposure condition without revealing the underlying value.
7. Register a new pledge if the loan is approved.
8. Close the pledge after repayment.
9. View their own pledges and transaction history.
10. View fraud/high-risk alerts.

---

## 2. Problem Statement

Gold-loan lenders operate with no visibility into a borrower's active gold-loan exposure at other participating institutions, and no way to detect the same physical gold item being pledged across multiple lenders.

The product addresses:

- Cross-lender visibility
- Repeat/rotating pledge patterns
- Same-collateral, different-identity fraud (gold-level, not just borrower-level)
- Excessive concurrent exposure
- High pledge velocity
- Lack of a neutral shared registry
- Privacy concerns between competing lenders

---

## 3. Goals

### G1 — Borrower exposure lookup
Allow an authenticated lender to query a borrower and receive aggregate exposure information.

### G2 — Privacy-preserving identification
Ensure plaintext Aadhaar is never sent to the backend or stored on-chain.

### G3 — Shared immutable registry
Record pledge events on Hyperledger Fabric so participating lenders can rely on a common registry.

### G4 — Gold-level fingerprinting
Detect the same physical gold item being pledged across lenders, independent of borrower identity matching.

### G5 — Explainable, hybrid risk assessment
Convert registry data into a transparent LOW/MEDIUM/HIGH risk result with reasons, combining a deterministic rule engine (primary, authoritative score) with an LLM (explanation + secondary anomaly signal, never the sole authority on the decision).

### G6 — Privacy-preserving proof (stretch)
Demonstrate at least one working zero-knowledge proof (e.g., "exposure is below threshold") without revealing the underlying value.

### G7 — Pledge lifecycle
Support: `Register → Active → Close`

### G8 — Lender dashboard
Give lenders a practical interface for searches, pledges, alerts, and transaction history.

### G9 — Hackathon-ready demonstration
Show a complete working flow, including at least one real on-chain transaction on the Fabric network.

---

## 4. Non-Goals for MVP

- Full production regulatory deployment
- Real customer Aadhaar processing in production
- Generalized ZK proof system (scope to one proof statement only)
- Trained ML fraud model (XGBoost etc.) — deferred until real pledge/outcome data exists
- Graph Neural Network fraud-ring detection
- Household/address-based identity linking
- Mobile application
- Integration with real NBFC loan-management systems
- Multi-tier Fabric consortium / public-chain anchoring (roadmap only)
- Token economics, international expansion

---

## 5. Users and Roles

### 5.1 Lender / Loan Officer
Primary user. Can: authenticate, search borrowers, submit gold appraisals, view risk reports, register/close pledges, view own history, view alerts, view transaction hashes.

### 5.2 Admin
Internal platform role. Can: view registered lenders, platform-level pledge info, monitor alerts, view analytics, manage lender onboarding/allowlisting.

### 5.3 Borrower
Not an MVP dashboard user. Represented indirectly via a privacy-preserving borrower identifier (HMAC-SHA256 commitment).

### 5.4 Regulator (future persona)
Potential future access to anonymized market-level intelligence.

---

## 6. Product Scope — MVP Feature List

| ID | Feature | Priority |
|---|---|---|
| F-01 | Wallet-style signed-challenge authentication | P0 |
| F-02 | Lender onboarding (incl. Fabric identity issuance) | P0 |
| F-03 | Local Aadhaar hashing (HMAC-SHA256) | P0 |
| F-04 | Borrower search | P0 |
| F-05 | Borrower summary retrieval (Fabric registry) | P0 |
| F-06 | Gold appraisal input + fingerprint generation | P0 |
| F-07 | Gold-fingerprint match check | P0 |
| F-08 | Hybrid (rule + LLM) risk scoring | P0 |
| F-09 | Risk report UI | P0 |
| F-10 | Register pledge (on Fabric) | P0 |
| F-11 | Close pledge | P0 |
| F-12 | My Pledges | P0 |
| F-13 | Transaction history | P0 |
| F-14 | Fraud/high-risk alerts | P1 |
| F-15 | ZK proof demo (single statement) | P1 |
| F-16 | Admin dashboard | P1 |
| F-17 | Analytics dashboard | P2 |
| F-18 | Notifications | P2 |

---

## 7. End-to-End User Flow — Lender Onboarding

```text
Landing Page
    ↓
Connect wallet-style identity
    ↓
Sign Authentication Challenge
    ↓
Backend verifies signature
    ↓
Create/Register lender account
    ↓
Backend issues Fabric CA identity (MSP) for the lender org
    ↓
Lender receives dashboard access (JWT session)
```

### Requirements

- The lender's login identity must uniquely and stably identify the lender account.
- Authentication must use a signed challenge message (nonce), not a static password.
- JWT used for authenticated API sessions.
- Every lender must be allowlisted before any Fabric write operation is permitted.
- Secrets/keys must never be exposed in frontend source code.

---

## 8. Authentication Architecture

**Login/session identity and ledger-write identity are deliberately separate concerns:**

- **Login (session auth):** wallet-style connect → sign a random challenge/nonce → backend verifies the signature against the public key → JWT issued, tied to that identity as the lender's stable account ID.
- **Ledger writes (Fabric):** each lender org has a Fabric CA-issued X.509/MSP identity, held and managed server-side. When an authenticated lender (valid JWT) submits a pledge, the backend signs and submits that transaction via the Fabric Gateway using the lender's mapped Fabric identity.

This avoids requiring the login credential itself to be Fabric-compatible — Fabric only ever sees its own CA-issued identities, and the login layer only ever needs to prove "this session belongs to this lender."

---

## 9. Borrower Search Flow

```text
Lender enters Aadhaar
        ↓
Browser validates input
        ↓
Browser generates HMAC-SHA256 borrower commitment
        ↓
Hash sent to backend
        ↓
Backend validates request
        ↓
Backend queries Fabric registry (via Fabric Gateway)
        ↓
Borrower summary returned
        ↓
Backend calls Hybrid Risk Engine
        ↓
Risk report generated (score + explanation)
        ↓
Frontend displays result
```

### Functional Requirements

- **FR-SEARCH-01:** Search form accepts the borrower identifier required by the MVP.
- **FR-SEARCH-02:** Plaintext Aadhaar must never be sent to the backend.
- **FR-SEARCH-03:** The borrower hash (HMAC-SHA256, server-held key/pepper) must be deterministic for the same borrower.
- **FR-SEARCH-04:** Backend must reject malformed/invalid requests.
- **FR-SEARCH-05:** Backend must retrieve aggregate pledge information from Fabric.
- **FR-SEARCH-06:** Backend sends only the required summary information to the risk engine.
- **FR-SEARCH-07:** Frontend must display loading, success, empty-result, and error states.
- **FR-SEARCH-08:** The system must never fabricate a risk result if the registry query fails.

---

## 10. Gold Fingerprinting

### Purpose
Detect the same physical gold item pledged across lenders, independent of (and in addition to) borrower-identity matching.

### Flow

```text
Gold Asset
    │
    ├── Appraisal Data (weight, purity, type, dimensions, characteristics)
    │       ↓
    │   Quantize/Bucket (weight → nearest 0.5g, purity → nearest karat)
    │       ↓
    │   Canonical JSON → SHA-256 → Attribute Fingerprint
    │
    └── Photo (optional)
            ↓
        pHash → Image Fingerprint (visual similarity evidence)

Attribute Fingerprint + Image Fingerprint → Gold Matching Engine
(bucketed hash match = primary signal, pHash distance = confirmatory)
```

### Requirements

- Quantization must happen before hashing — exact-value hashing will not match real independent appraisals of the same item.
- pHash similarity is supporting evidence only, never sole proof of identity between two items.
- Gold fingerprint (bucketed SHA-256) is stored on-chain alongside the pledge record.

---

## 11. Privacy Requirements

### 11.1 Data That Must NOT Be Stored On-Chain
- Name, phone number, address
- Plaintext Aadhaar
- Exact loan amount (use amount-range buckets)
- Full gold appraisal detail beyond the fingerprint
- Other unnecessary PII

### 11.2 Amount Privacy

| Code | Range |
|---|---|
| 0 | ₹0–₹50K |
| 1 | ₹50K–₹1L |
| 2 | ₹1L–₹2L |
| 3 | ₹2L–₹5L |
| 4 | ₹5L+ |

### 11.3 Lender Privacy
A lender's risk result must not expose which other lender created the borrower's other pledges.

### 11.4 Zero-Knowledge Proof (in scope, tightly bounded)
One concrete circuit only — e.g., proving **"total exposure is below the lender's threshold"** without revealing the exact total. Do not attempt a general-purpose ZK verification system; scope to this single statement for the demo.

---

## 12. Borrower Identity & Cryptography

| Purpose | Method | Notes |
|---|---|---|
| Borrower commitment | HMAC-SHA256 (keyed) | Plain SHA-256 is brute-forceable given Aadhaar's small valid-number space; must use a server-held key/pepper |
| Gold attribute fingerprint | SHA-256 over quantized/bucketed data | Never used inside a ZK circuit |
| ZK circuit inputs | Poseidon/Pedersen (ZK-friendly hash) if a commitment must be proven in-circuit | SHA-256/HMAC-SHA256 is expensive inside Noir circuits |

---

## 13. Smart Contract (Hyperledger Fabric)

### Platform
- Hyperledger Fabric (single network for hackathon — use `fabric-samples/test-network` as the base rather than building from scratch)
- Chaincode
- Fabric CA + MSP for lender org identities
- CouchDB as world-state DB
- Fabric Gateway as the FastAPI ↔ Fabric bridge

### On-Chain Data Model

```text
Pledge
├── pledge_id
├── borrower_hash (HMAC-SHA256)
├── gold_fingerprint (bucketed SHA-256)
├── lender_id
├── amount_range
├── status
└── created_at
```

### Required Chaincode Functions

- `register_pledge` — creates a new active pledge (borrower hash, gold fingerprint, amount range, authorized lender identity) → returns pledge ID / tx result
- `close_pledge` — active → closed; pledge must exist, be active, and requester must be authorized
- `get_pledge` — returns a pledge record where permitted
- `get_borrower_summary` — returns aggregate info for risk evaluation:
  ```json
  {
    "active_pledge_count": 2,
    "total_amount_range_sum": 3,
    "velocity_7d": 1,
    "last_pledge_timestamp": 1699999999
  }
  ```
- `get_gold_match` — returns whether the submitted gold fingerprint matches an existing active pledge
- `get_active_pledges` — returns active pledge identifiers for the application

---

## 14. Backend Requirements

### Technology
FastAPI + Python, Supabase PostgreSQL, Redis, Fabric SDK/Gateway client.

### Responsibilities
1. Authenticate lenders (verify login signature, issue/manage JWT).
2. Map authenticated lenders to their Fabric CA identity for ledger writes.
3. Validate and rate-limit API requests.
4. Bridge application requests to Fabric via Fabric Gateway.
5. Compute borrower HMAC-SHA256 commitment.
6. Compute gold fingerprint (quantize → SHA-256 + pHash).
7. Call the hybrid risk engine (rule-based + LLM).
8. Trigger ZK proof generation/verification where applicable.
9. Store off-chain records, query/audit logs, fraud alerts.
10. Record pledges on Fabric **asynchronously**, decoupled from the decision response (Fabric consensus + ZK proof generation are not millisecond-scale).
11. Push alerts via the webhook/WebSocket alerting layer.
12. Never leak secrets or internal errors; sanitize error responses.

---

## 15. Suggested Backend API

### Authentication
```text
POST /api/auth/challenge
POST /api/auth/verify
POST /api/auth/logout
GET  /api/auth/me
```

### Borrower
```text
POST /api/borrowers/search
```
Request:
```json
{ "borrower_hash": "..." }
```
Response:
```json
{
  "risk_score": 55,
  "risk_level": "MEDIUM",
  "active_pledge_count": 2,
  "exposure_range": "₹1L–₹2L+",
  "velocity_flagged": false,
  "gold_match": false,
  "recommendation": "REDUCE_AMOUNT",
  "explanation": [
    "Active pledges: 2",
    "Total exposure: Medium range",
    "Velocity: 1 pledge in 7 days"
  ],
  "llm_reasoning": "The borrower shows moderate concurrent exposure with normal velocity; recommend reducing the loan amount rather than outright rejection."
}
```

### Gold
```text
POST /api/gold/fingerprint
POST /api/gold/match-check
```

### Pledges
```text
POST /api/pledges
POST /api/pledges/:pledgeId/close
GET  /api/pledges
GET  /api/pledges/:pledgeId
```

### ZK
```text
POST /api/zk/prove-exposure
```

### Alerts
```text
GET /api/alerts
```

### Transactions
```text
GET /api/transactions
```

---

## 16. Off-Chain Database — Suggested Tables

### `lenders`
```text
id, login_identity_ref, fabric_msp_id, name/organization_name,
api_key_hash, status, created_at, updated_at
```

### `pledge_mirrors`
```text
id, pledge_id, borrower_hash, gold_fingerprint, lender_id,
amount_range, status, transaction_hash, created_at, closed_at
```

### `queries`
```text
id, lender_id, borrower_hash, risk_score, risk_level, created_at
```

### `fraud_alerts`
```text
id, borrower_hash, gold_fingerprint, risk_score, alert_type,
message, status, created_at
```

### `transactions`
```text
id, lender_id, pledge_id, transaction_hash, transaction_type,
status, created_at
```

---

## 17. Hybrid Risk Engine Requirements

### Technology
Python (FastAPI service) — deterministic rules module + Gemini API for the LLM layer.

### Architecture

```text
Feature Vector (active pledges, exposure, velocity, LTV, gold_match)
        │
        ├────────────────────────────┐
        ▼                            ▼
  Rule-Based Scorer            LLM Secondary Check
  (deterministic,              (Gemini API — reviews
   weighted, PRIMARY            same features, flags
   and authoritative            anomalies, generates
   score)                       natural-language reasoning)
        │                            │
        └─────────────┬──────────────┘
                      ▼
              Decision Engine
   Rule score sets APPROVE/REDUCE/REJECT.
   LLM flag may only escalate REDUCE → REJECT
   when it raises a specific named concern —
   never silently overrides the score downward,
   never sets the score alone.
                      │
                      ▼
   Final Score + Rule-Based Reasons + LLM Narrative
```

### Scoring Rules (rule engine — primary, configurable)

| Condition | Score Impact | Interpretation |
|---|---:|---|
| 0 active loans | +10 | LOW |
| 1 active loan | +25 | LOW–MEDIUM |
| 2 active loans | +50 | MEDIUM |
| 3+ active loans | +80 | HIGH |
| Velocity ≥ 2 in 7 days | +20 | Velocity Alert |
| Gold fingerprint match found | +40 | Same-collateral flag |
| High total exposure | +10–20 | Additional risk |

Keep thresholds and weights in a dedicated, configurable module — not hard-coded across the app.

### Input
```json
{
  "active_pledge_count": 2,
  "total_amount_range_sum": 3,
  "velocity_7d": 1,
  "last_pledge_timestamp": 1699999999,
  "gold_match": false
}
```

### Output
```json
{
  "risk_score": 55,
  "risk_level": "MEDIUM",
  "velocity_flagged": false,
  "gold_match": false,
  "recommendation": "REDUCE_AMOUNT",
  "explanation": [
    "Active pledges: 2 (Medium)",
    "Total exposure: Medium range",
    "Velocity: 1 pledge in 7 days (Normal)"
  ],
  "llm_reasoning": "..."
}
```

### Explainability
Every risk result must include score, risk level, individual contributing factors, velocity status, exposure interpretation, gold-match status, and suggested action. The engine must never return a bare risk level with no explanation.

### Recommendation Logic
```text
LOW       → APPROVE
MEDIUM    → REDUCE_AMOUNT
HIGH      → REJECT
```
Thresholds configurable. Presented as **decision-support**, not an autonomous lending decision.

---

## 18. Zero-Knowledge Proof Requirements

- **Scope:** exactly one circuit — proving a single bounded statement (e.g., "total exposure is below the lender's stated threshold") without revealing the exact value.
- **Stack:** Noir (circuit definition) + Barretenberg (proof generation/verification).
- **Fallback:** given the timeline, decide early whether the proof is generated live in the demo or shown as a pre-generated, clearly labeled result if live generation proves unreliable close to demo day.
- Not a general-purpose privacy layer for MVP — treat any further ZK use cases as roadmap.

---

## 19. Frontend Requirements

### Technology
Next.js, React, Tailwind CSS.

### Required Pages
- **Landing Page:** what VeriGold is, the problem, privacy, blockchain, hybrid AI risk engine, login CTA.
- **Authentication:** connect identity, sign challenge, session status.
- **Dashboard:** borrower search, queries today, active pledges, fraud alerts, recent queries.
- **Risk Report:** risk level, score, active pledge count, exposure range, velocity alert, gold-match status, rule-based explanation, LLM narrative, recommendation.
- **Gold Appraisal / Fingerprint:** input weight/purity/type/dimensions (+ optional photo), display fingerprint match result.
- **My Pledges:** pledge ID, amount range, status, created date, transaction hash, close action.
- **Alerts:** alert type, risk level, time, explanation.
- **ZK Proof Demo:** shows the proof statement, inputs (hidden), and verification result.
- **Admin Dashboard:** lenders, pledges, alerts, basic platform statistics.

### Frontend States
```text
Logged Out / Authenticating / Authenticated
Searching / Search Success / No Existing Exposure / Search Error
Risk Report Loaded
Fingerprinting Gold / Gold Match Found / No Match
Registering Pledge / Pledge Registered
Closing Pledge / Pledge Closed
Transaction Pending / Transaction Failed
ZK Proof Generating / Proof Verified / Proof Failed
```
No user action should leave the UI stuck in an indefinite loading state.

---

## 20. Security Requirements

### Critical
- Never store plaintext Aadhaar.
- Never expose backend secrets, Fabric private keys, or API keys in frontend code or source control.
- Validate every API input; sanitize error responses.
- Use HTTPS in deployed environments.
- Rate-limit borrower search.
- Authenticate every lender-specific endpoint; verify lender authorization before pledge mutation.
- Do not trust client-provided risk scores or lender identity.
- Keep API keys hashed where possible; maintain audit logs for important actions.

### Smart Contract / Chaincode
- Authorized lender access only.
- Valid amount-range enum, valid pledge status transitions.
- Correct ownership/authorization for pledge closure.
- No unauthorized mutation.

---

## 21. Privacy Threat Model

| Threat | Expected Behavior |
|---|---|
| Plaintext Aadhaar leakage | Browser hashes locally; backend never receives plaintext |
| Cross-lender information leakage | No other lender identity, exact amounts, or customer records exposed |
| Unauthorized pledge closure | Only the authorized lender can close its own pledge |
| API abuse | Borrower queries rate-limited |
| Secret exposure | No private keys, DB credentials, API secrets, or Fabric identity keys in source control |
| Gold-fingerprint leakage | Fingerprint reveals match status only, not underlying appraisal detail to other lenders |

---

## 22. On-Chain vs Off-Chain Boundary

**On-Chain:** borrower hash, gold fingerprint, lender ID, pledge ID, amount range, status, timestamp.

**Off-Chain:** lender accounts, session data, query logs, analytics, fraud alerts, application metadata, database mirrors, full appraisal detail.

> **Rule:** Only immutable shared-trust data belongs on-chain. Everything else belongs off-chain.

---

## 23. Error Handling

| Scenario | UI Response |
|---|---|
| Login identity unavailable | Ask user to connect/install required identity method |
| Login rejected | Authentication cancelled |
| Invalid input | Inline validation |
| Borrower not found | "No active pledges found" |
| Fabric unavailable | Retry message |
| Transaction pending | Show transaction status |
| Transaction failed | Explain failure + retry |
| Risk engine unavailable | Show system error; do not fabricate a risk result |
| ZK proof failed | Show failure state; do not silently skip the proof step |
| Unauthorized lender | Access denied |
| Rate limit exceeded | Try again later |

---

## 24. Observability and Audit

Record for important actions: lender ID, action type, timestamp, success/failure, transaction hash where applicable, request correlation ID. Sensitive plaintext borrower data must not be unnecessarily logged.

---

## 25. Testing Requirements

### Chaincode
Register pledge, close pledge, duplicate/invalid operations, unauthorized operations, amount-range validation, status transitions, summary calculation, gold-match lookup.

### Backend
Authentication, JWT validation, request validation, borrower search, Fabric integration, risk-engine integration, rate limiting, authorization, error handling.

### Risk Engine
0 / 1 / 2 / 3+ active pledges; velocity 0 / 1 / ≥2; high exposure; gold match found/not found; combined risk factors; LLM-escalation-only-upward behavior.

### Frontend
Login flow, search, loading states, risk report rendering, gold fingerprint UI, register/close pledge, transaction status, ZK proof UI, error states.

---

## 26. Demo Dataset

Use clearly marked **synthetic/demo data only** — never real Aadhaar numbers.

### Scenario A — Clean Borrower
```text
Active pledges: 0 | Velocity: 0 | Exposure: ₹0 | Gold match: No
Expected: LOW
```

### Scenario B — Moderate Exposure
```text
Active pledges: 2 | Velocity: 1 | Exposure: Medium | Gold match: No
Expected: MEDIUM
```

### Scenario C — Fraud / High-Risk (borrower velocity)
```text
Active pledges: 4 | Velocity: 4 in 7 days | Exposure: High | Gold match: No
Expected: HIGH, Velocity Alert
```

### Scenario D — Gold-Fingerprint Fraud
```text
Active pledges (this identity): 0 | Gold match: YES (same item pledged
under a different borrower identity elsewhere)
Expected: HIGH, Gold Match Alert
```

---

## 27. Acceptance Criteria

- **AC-01 Authentication:** Given a valid identity is available, when the lender connects and signs the auth challenge, then the lender reaches the authenticated dashboard.
- **AC-02 Privacy:** Given a borrower search, when the request is sent, then plaintext Aadhaar is never transmitted.
- **AC-03 Existing Exposure:** Given a borrower with active pledges, when searched, then the aggregate risk report is displayed.
- **AC-04 No Exposure:** Given a borrower with no active pledges, when searched, then zero active pledges and the corresponding risk result are shown.
- **AC-05 Risk Explanation:** Given any successful risk calculation, then the report includes rule-based contributing factors and an LLM narrative.
- **AC-06 Gold Match:** Given a gold item already pledged elsewhere, when a new appraisal is submitted, then a gold-match flag is raised and reflected in the risk score.
- **AC-07 Register Pledge:** Given a lender approves a loan, when the pledge is registered, then it is created on Fabric and a transaction hash is displayed.
- **AC-08 Close Pledge:** Given an active pledge owned by the lender, when closed, then it becomes closed and is excluded from future active summaries.
- **AC-09 ZK Proof:** Given the exposure-threshold scenario, when the proof is generated, then verification succeeds without revealing the underlying exposure value.
- **AC-10 Authorization:** Given an unauthorized pledge operation attempt, then it is rejected.
- **AC-11 Fabric Failure:** Given a Fabric transaction fails, then the UI shows failure and never displays a false success state.
- **AC-12 Demo:** The team can demonstrate: login → search borrower → show HIGH risk (velocity) case → show HIGH risk (gold match) case → show LOW risk case → register pledge → show Fabric transaction → show ZK proof → close pledge → show updated status.

---

## 28. Team Work Breakdown

| Team | Responsibilities | Deliverable |
|---|---|---|
| **Frontend** | Landing, auth UI, dashboard, borrower search, risk report, gold appraisal UI, pledge screens, alerts, ZK proof UI, admin UI | Next.js + React + Tailwind app |
| **Backend** | FastAPI app, auth, lender onboarding, validation, DB, rate limiting, Fabric Gateway bridge, risk-engine integration, ZK integration, logging | FastAPI service |
| **Smart Contract** | Chaincode, data structures, register/close pledge, borrower summary, gold-match lookup, authorization, tests, test-network deployment | Fabric chaincode (based on `fabric-samples/test-network`) |
| **AI/Risk** | Rule-based scorer, LLM integration, velocity/exposure/gold-match evaluation, explanation generation, unit tests | Hybrid risk-scoring module (FastAPI service or integrated) |
| **ZK** | Noir circuit for the single exposure-threshold statement, Barretenberg proving/verification, integration with backend | Noir circuit + proof pipeline |
| **QA/Integration/Demo** | End-to-end testing, test dataset, failure-state testing, privacy testing, demo script, presentation, transaction verification | Demo readiness |

---

## 29. Recommended Repository Structure

```text
verigold/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── services/
│
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   └── utils/
│   └── risk_engine/
│       ├── rules/
│       ├── llm/
│       └── tests/
│
├── gold-fingerprint/
│   ├── quantize/
│   ├── hashing/
│   └── phash/
│
├── zk/
│   ├── circuits/
│   └── proofs/
│
├── chaincode/
│   └── verigold/
│       ├── src/
│       └── tests/
│
├── docs/
│   ├── architecture.md
│   ├── techstack.md
│   ├── api.md
│   └── demo.md
│
└── README.md
```

---

## 30. Environment Variables

### Frontend
```text
NEXT_PUBLIC_API_URL=
```

### Backend
```text
DATABASE_URL=
JWT_SECRET=
BORROWER_HASH_KEY=
FABRIC_GATEWAY_URL=
FABRIC_CA_URL=
FABRIC_MSP_CONFIG_PATH=
CHAINCODE_NAME=
REDIS_URL=
GEMINI_API_KEY=
ZK_CIRCUIT_PATH=
```

Never commit actual secret values. Use `.env.example` with placeholders.

---

## 31. Deployment Plan

| Component | Target |
|---|---|
| Frontend | Vercel |
| Backend | Render / Railway |
| Database | Supabase PostgreSQL |
| Cache | Redis (managed or containerized) |
| Fabric Network | Self-hosted via Docker Compose (`fabric-samples/test-network` base) |
| ZK Proving | Runs within backend service or as a sidecar container |

---

## 32. MVP Priority

### P0 — Must Work
```text
Login/auth → Borrower search → Privacy-preserving identifier →
Fabric summary → Gold fingerprint check → Hybrid risk engine →
Risk report → Register pledge → Close pledge → Transaction proof
```

### P1 — Should Work
```text
Fraud alerts, ZK proof demo, admin dashboard, audit/history
```

### P2 — If Time Permits
```text
Analytics, notifications, advanced visualizations
```

---

## 33. Hackathon Demo Requirements (~3 minutes)

1. **Problem:** one borrower, multiple lenders, no cross-lender visibility.
2. **Solution:** VeriGold — privacy, Fabric registry, hybrid AI risk, ZK proof.
3. **High-Risk Borrower (velocity):** search → 4 active pledges, high velocity → HIGH risk.
4. **High-Risk (gold match):** submit gold appraisal already pledged elsewhere → gold-match flag → HIGH risk.
5. **Clean Borrower:** search → 0 active pledges → LOW risk.
6. **Blockchain Proof:** register pledge → Fabric transaction → transaction hash shown.
7. **ZK Proof:** show the exposure-threshold proof verifying without revealing the value.
8. **Close Pledge:** transaction confirmed, status updated.
9. **Final Message:** *VeriGold — Verify Before You Lend.*

---

## 34. Future Roadmap (Post-Hackathon)

- **Phase 1 — Production:** NBFC pilot, legal review, RBI sandbox exploration, mobile app.
- **Phase 2 — Growth:** more lender integrations, loan-management-system APIs, trained ML fraud model (once real outcome data exists), household-level aggregation.
- **Phase 3 — Ecosystem:** regulatory reporting, broader collateral types, larger lender network.
- **Phase 4 — Advanced Infrastructure:** tiered Fabric consortium (anchor peers + gateway clients), public-chain anchoring for independent auditability, generalized ZK query layer, real-time alerting at scale.

---

## 35. Important Team Decisions (Finalize Before Coding)

1. Exact borrower-hash key/pepper management (HMAC-SHA256).
2. Exact quantization buckets for gold weight/purity.
3. Exact risk-score thresholds and rule weights.
4. Exact LLM escalation rule (when it may move REDUCE → REJECT).
5. Who can read which on-chain data.
6. Fabric org/peer setup — how many orgs for the demo network.
7. Whether pledge mutations are backend-signed (custodial) throughout.
8. Exact lender onboarding/allowlisting process.
9. Which single ZK statement is being proven, and its exact inputs.
10. Demo data format and fallback plan (esp. for Fabric and ZK if unstable near demo day).
11. Error-handling behavior when Fabric, risk engine, or ZK proving is unavailable.
12. How long off-chain query logs are retained.

---

## 36. Key Architecture Rule

```text
                 VERIGOLD
                     │
        ┌────────────┴────────────┐
        │                         │
   TRUST LAYER              APPLICATION LAYER
        │                         │
  Hyperledger Fabric        FastAPI
  (registry + gold          Supabase PostgreSQL
   fingerprint +            Next.js/React
   amount range)            Redis
        │                         │
 Immutable shared          Business/UI logic,
 trust data                hybrid risk scoring,
        │                  ZK proof generation
        └────────────┬────────────┘
                     │
          Explainable, Privacy-Preserving Risk
```

> **Rule:** Put the minimum shared trust data on-chain. Keep application logic, analytics, and operational data off-chain.

---

## 37. Final MVP Definition

VeriGold MVP is successful when a lender can:

```text
1. Authenticate (signed challenge)
        ↓
2. Search a synthetic borrower
        ↓
3. Query the shared Fabric registry
        ↓
4. Submit a gold appraisal and check for fingerprint match
        ↓
5. Receive aggregate exposure + gold-match status
        ↓
6. Receive an explainable hybrid risk score
        ↓
7. See a working ZK proof for one exposure statement
        ↓
8. Register a pledge
        ↓
9. Verify its Fabric transaction
        ↓
10. Close the pledge
        ↓
11. Verify the updated borrower state
```

At the end of the demo, the team should be able to prove:

- **Privacy** — plaintext borrower identity never reaches the backend, and exposure can be verified below a threshold without revealing the value (ZK).
- **Shared Trust** — pledge registration and closure are verifiable on the Fabric registry.
- **Fraud Coverage at Two Levels** — both borrower-identity exposure and gold-collateral reuse are detected.
- **Explainable Risk** — the risk result is derived from visible, rule-based factors plus a natural-language rationale, never a black box.

---

## 38. One-Sentence Product Definition

> **VeriGold is a privacy-preserving, cross-lender gold-loan registry that gives lenders a real-time, explainable view of a borrower's existing exposure and the pledge history of the physical gold itself — without revealing another lender's underlying customer data.**
