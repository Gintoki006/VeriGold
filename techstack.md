# VeriGold — Tech Stack & Architecture

**Version:** 2.0 (Finalized — Hackathon Build)
**Companion document to:** PRD.md
**Timeline:** 1–2 weeks to hackathon

---

## 1. Final Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js + React + Tailwind CSS | Web application (your UI) |
| **Login/Session Auth** | Wallet-style signed-challenge auth → JWT | Lender login, decoupled from ledger identity |
| **Backend** | FastAPI + Python | APIs, orchestration |
| **Private Database** | Supabase PostgreSQL | Application + operational data |
| **Cache** | Redis | Caching, rate limiting, temp workflow state |
| **Borrower Identity** | HMAC-SHA256 (keyed hash) | Privacy-preserving borrower commitment |
| **Gold Fingerprint** | Quantized/bucketed attributes → SHA-256 | Deterministic asset fingerprint, tolerant of measurement variance |
| **Image Evidence** | pHash | Supporting visual similarity evidence |
| **Risk Engine** | Hybrid: rule-based scorer (primary/authoritative) + LLM (Gemini API, explanation + secondary signal) | Deterministic, auditable score with natural-language reasoning |
| **ZK Circuit** | Noir | Defines one bounded privacy proof (exposure-threshold statement) |
| **ZK Proving** | Barretenberg | Generate/verify the ZK proof |
| **Blockchain** | Hyperledger Fabric (single network) | Permissioned cross-lender registry |
| **Fabric Base** | `fabric-samples/test-network` | Pre-configured CA/orderer/peers/CouchDB — do not build from scratch |
| **Smart Contract** | Fabric Chaincode | Registry/business logic |
| **Fabric State DB** | CouchDB | Fabric world state, rich queries |
| **Fabric Identity** | Fabric CA + MSP | Per-lender-org ledger-write identity, held server-side |
| **Blockchain API** | Fabric Gateway | FastAPI ↔ Fabric bridge |
| **Alerting** | Webhook / WebSocket service | Real-time fraud alerts to other lenders |
| **Infrastructure** | Docker + Docker Compose | Run Fabric network + supporting services |

---

## 2. Identity Model — Two Separate Concerns

This is the most important architectural decision in the stack, so it's called out explicitly here.

**Login/session identity** and **ledger-write identity** are not the same thing and must not be conflated:

| Concern | Mechanism | Scope |
|---|---|---|
| **Login (who is this lender)** | Wallet-style connect → sign a backend-issued challenge/nonce → backend verifies signature → JWT issued | Proves session ownership only. Does not touch Fabric. |
| **Ledger writes (register/close pledge)** | Backend holds each lender org's Fabric CA-issued X.509/MSP identity; signs and submits via Fabric Gateway on the authenticated lender's behalf | Only Fabric-recognized identities can write to the chain — a login signature scheme (e.g., a Stellar-style wallet signature) cannot itself authorize a Fabric transaction, because Fabric only verifies its own CA-issued certificates. |

**Why this split exists:** any wallet/login scheme (Freighter or otherwise) proves "this session belongs to this lender" — that's a self-contained, simple auth mechanism. It does **not** and cannot make Fabric aware of that identity, since Fabric's trust model is built entirely around its own CA/MSP PKI. Rather than trying to force one identity system to serve both purposes, the backend acts as the custodial bridge: it verifies the login signature first, then signs the actual ledger transaction using the lender's separately-issued Fabric identity.

```text
Login Flow                          Ledger Write Flow
─────────────                       ──────────────────
Connect identity                    Authenticated request (valid JWT)
      │                                     │
      ▼                                     ▼
Sign backend challenge              Backend looks up lender's
      │                             Fabric MSP identity
      ▼                                     │
Backend verifies signature                  ▼
      │                             Fabric Gateway signs +
      ▼                             submits transaction
JWT issued → session                        │
                                             ▼
                                     Chaincode executes,
                                     ledger updated
```

---

## 3. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │       LENDER        │
                         │   Bank / NBFC etc.  │
                         └──────────┬──────────┘
                                    │
                                    ▼
              ┌────────────────────────────────────┐
              │             FRONTEND               │
              │     Next.js + React + Tailwind     │
              └────────────────┬───────────────────┘
                               │ HTTPS / REST
                               ▼
              ┌────────────────────────────────────┐
              │              FASTAPI               │
              │  API + Auth + Workflow Orchestration│
              └────────────────┬───────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐     ┌─────────────────┐     ┌────────────────┐
│   BORROWER    │     │      GOLD       │     │      RISK      │
│   IDENTITY    │     │   FINGERPRINT   │     │     ENGINE     │
│    ENGINE     │     │     ENGINE      │     │                │
│               │     │                 │     │  Hybrid: Rule  │
│ HMAC-SHA256   │     │ Appraisal Data  │     │  Engine (primary)│
│ Commitment    │     │  (quantized)    │     │  + LLM (Gemini) │
└───────┬───────┘     │       +         │     └───────┬────────┘
        │              │ Image Evidence  │             │
        │              └────────┬────────┘             │
        │                       │                      │
        │              ┌────────┴────────┐             │
        │              ▼                 ▼             │
        │       ┌──────────────┐  ┌──────────────┐    │
        │       │ SHA-256      │  │    pHash     │    │
        │       │ Bucketed     │  │ Image        │    │
        │       │ Fingerprint  │  │ Evidence     │    │
        │       └──────┬───────┘  └──────┬───────┘    │
        │              │                 │             │
        └──────────────┼─────────────────┼─────────────┘
                       │                 │
                       ▼                 ▼
              ┌────────────────────────────────┐
              │       VERIFICATION ENGINE       │
              │  Borrower Match / Gold Match /  │
              │  Existing Pledge / Exposure     │
              └───────────────┬────────────────┘
                              │
                              ▼
              ┌────────────────────────────────┐
              │        PRIVACY ENGINE          │
              │      Noir + Barretenberg       │
              │   (single exposure-threshold   │
              │         statement)             │
              └───────────────┬────────────────┘
                              │
                              ▼
              ┌────────────────────────────────┐
              │         DECISION ENGINE        │
              │ Rule score = authoritative.    │
              │ LLM may escalate REDUCE→REJECT │
              │ only, never set score alone.   │
              │   APPROVE / REDUCE / REJECT    │
              └───────────────┬────────────────┘
                              │
               ┌──────────────┼───────────────┐
               ▼                              ▼
      ┌─────────────────┐           ┌──────────────────┐
      │    SUPABASE     │           │  ALERTING LAYER  │
      │   PostgreSQL    │           │ Webhook/WebSocket│
      │ Private/App Data│           │  to other lenders│
      └─────────────────┘           └──────────────────┘
               │
               ▼ (async, decoupled from decision response)
      ┌─────────────────┐
      │ FABRIC GATEWAY  │
      │ (signs with the │
      │  lender's MSP   │
      │  identity)      │
      └────────┬────────┘
               ▼
      ┌─────────────────────────┐
      │   HYPERLEDGER FABRIC    │
      │  (single network, base  │
      │  = fabric-samples/      │
      │    test-network)        │
      └───────────┬─────────────┘
                  ▼
              Chaincode
                  ▼
               CouchDB
              World State
```

**Key design point carried through:** the APPROVE/REDUCE/REJECT decision is returned to the lender before the pledge is committed to Fabric. Fabric consensus and ZK proof generation are not millisecond-scale operations — pledge recording happens asynchronously after the decision response.

---

## 4. Gold Fingerprint Architecture

```text
                         GOLD ASSET
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
          APPRAISAL DATA              PHOTO
                 │                       │
        ┌────────┼────────┐              │
        │        │        │              ▼
      Weight   Purity    Type          pHash
        │        │        │              │
        └────────┼────────┘              │
                 ▼                       │
          QUANTIZE / BUCKET              │
    (weight → nearest 0.5g,              │
     purity → nearest karat)             │
                 │                       │
                 ▼                       │
          Canonical JSON                │
                 │                       │
                 ▼                       │
              SHA-256                   │
                 │                       │
                 ▼                       ▼
       ATTRIBUTE FINGERPRINT       IMAGE FINGERPRINT
                 │                       │
                 └───────────┬───────────┘
                             ▼
                  SIMILARITY-BASED MATCHING
              (bucketed hash match = primary signal,
               pHash distance = confirmatory)
```

**Why quantization matters:** two independent appraisals of the same physical item will almost never produce identical raw measurements (differing scale precision, rounding). Hashing exact values would make the matching engine effectively never fire on real duplicates. Bucketing attributes before hashing is what makes matching actually work.

Example canonical input:
```json
{
  "weight_mg": 100420,
  "purity_ppm": 916000,
  "item_type": "bangle",
  "item_count": 2,
  "dimensions": { "length_mm": 65.2, "width_mm": 8.1 },
  "characteristics": "floral engraving"
}
```

---

## 5. Hybrid Risk Engine

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

**Why hybrid, not pure LLM or pure ML:**
- A trained model (e.g., XGBoost) has no labeled fraud data at launch — cold start makes it either random or decorative.
- A pure LLM-set score isn't guaranteed consistent between runs, which is a liability for a lending decision a regulator or judge might scrutinize.
- The rule engine is deterministic, testable, and produces a stable, auditable "why" for every decision.
- The LLM adds real value as a narrative explainer and as a bounded secondary check — it can raise the risk level but never lower it or set it independently, so it can't silently make the system less safe.

Example rule weights (kept configurable, not hard-coded):

| Condition | Score Impact |
|---|---:|
| 0 active loans | +10 |
| 1 active loan | +25 |
| 2 active loans | +50 |
| 3+ active loans | +80 |
| Velocity ≥ 2 in 7 days | +20 |
| Gold fingerprint match found | +40 |
| High total exposure | +10–20 |

---

## 6. Privacy Engine (ZK)

```text
Private Data (e.g., total exposure)
     │
     ▼
Commitment / Private Inputs
     │
     ▼
     Noir Circuit
  (single statement:
  "exposure < threshold")
     │
     ▼
  Barretenberg
     │
     ▼
   ZK Proof
     │
     ▼
 Verification
```

**Scope discipline:** build exactly one circuit for one statement. Do not generalize this into a proof system that handles arbitrary queries — that scope creep is the most likely single point of failure given the timeline.

**Implementation note:** if the borrower commitment itself is ever an input to this circuit, use a ZK-friendly hash (Poseidon or Pedersen) for that specific value — SHA-256/HMAC-SHA256 is expensive to compute inside a Noir circuit. The gold fingerprint (SHA-256) never needs to be proven in-circuit, so it's unaffected.

**Fallback plan:** decide in week 1 whether the proof is generated live during the demo or shown as a pre-generated, clearly labeled result, so a live infra hiccup doesn't derail the demo.

---

## 7. Blockchain Architecture (Hyperledger Fabric — Single Network)

```text
                     FastAPI
                        │
                        ▼
                Fabric Gateway
             (signs with lender's
              mapped MSP identity)
                        │
                        ▼
              Hyperledger Fabric
           (base: fabric-samples/
              test-network)
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
    Org A              Org B            Org C
     Peer               Peer             Peer
   (mock lenders for demo purposes)
       └────────────────┼────────────────┘
                        ▼
                    Chaincode
                        │
                        ▼
                     CouchDB
                   World State
```

**Build guidance:** use `fabric-samples/test-network` as the starting point — it ships a working 2+ org network (CA, orderer, peers, CouchDB) wired together via scripts. Building this from raw Fabric components independently is a multi-day sink better spent on chaincode logic and integration. 2–3 mock organizations are sufficient to demonstrate cross-lender visibility for the hackathon; no tiered consortium, no public-chain anchoring — those are explicitly roadmap items (see PRD Section 34).

### Chaincode responsibilities
- Register pledge
- Update/close pledge
- Verify pledge
- Gold-fingerprint match lookup
- Registry business rules and authorization

### Fabric CA + MSP
```text
Lender Org A Identity ─┐
Lender Org B Identity ─┼──► Fabric CA ──► MSP ──► Authorized Network Access
Lender Org C Identity ─┘
```
Each lender org's Fabric identity is issued once during onboarding and held server-side; it's what the Fabric Gateway uses to sign ledger writes on that lender's behalf (see Section 2 above).

---

## 8. Data Architecture

### Supabase PostgreSQL (private/off-chain)
```text
├── lenders            (incl. login_identity_ref, fabric_msp_id)
├── borrowers
├── gold_assets
├── appraisal_records
├── evidence_metadata
├── loan_applications
├── risk_assessments
├── llm_risk_explanations
└── verification_records
```

### Hyperledger Fabric (shared registry)
```text
Pledge Registry
├── Pledge ID
├── Borrower Commitment (HMAC-SHA256)
├── Gold Fingerprint (bucketed SHA-256)
├── Lender ID
├── Pledge Status
└── Timestamp
```

CouchDB is the Fabric world-state database — not the primary application database. Supabase remains the system of record for everything that doesn't need shared, tamper-evident storage.

---

## 9. Redis

```text
                    FASTAPI
                       │
              ┌────────┴────────┐
              ▼                 ▼
        PostgreSQL            Redis
        Persistent            Temporary
        Data                  / Cache
```

Used for: verification result caching, rate limiting, temporary workflow state, caching repeated risk-engine feature vectors (avoids redundant LLM calls during demo/testing), and frequently accessed registry information.

---

## 10. Docker Architecture

```text
                    Docker Compose
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
     FastAPI           Redis           Fabric
                                     (test-network
                                       base)
                                           │
                             ┌─────────────┼─────────────┐
                             ▼             ▼             ▼
                           CA           Peer          Orderer
                                           │
                                           ▼
                                       CouchDB
```

Docker is the infrastructure/deployment layer for local dev and demo — everything should come up with a single `docker compose up`.

---

## 11. Complete End-to-End Flow

```text
LENDER
  │
  ▼
Next.js + React + Tailwind
  │
  ▼
Login (signed challenge → JWT)
  │
  ▼
FastAPI
  │
  ├─────────────────────────────┐
  ▼                             ▼
Borrower Information        Gold Appraisal
  │                             │
  ▼                             ├── Weight → quantize
HMAC-SHA256                     ├── Purity → quantize
  │                             ├── Type
  │                             └── Photo → pHash
  │                                      │
  │                                      ▼
  │                              Bucketed SHA-256
  │                              → Gold Fingerprint
  │                                      │
  └──────────────────┬───────────────────┘
                     ▼
              Verification Engine
                     │
                     ▼
              Fabric Registry Lookup
                     │
          Existing Pledge? / Gold Match?
                     │
               ┌─────┴─────┐
              NO           YES
               │            │
               ▼            ▼
            Continue    Hybrid Risk Engine
                        (Rule engine = primary
                         score; LLM = narrative
                         + bounded escalation)
                           │
                           ▼
                    Privacy Engine
                (Noir + Barretenberg —
                 exposure-threshold proof)
                           │
                           ▼
                    Decision Engine
                 ┌─────────┼─────────┐
                 ▼         ▼         ▼
              APPROVE    REDUCE    REJECT
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
      Return to Lender          Async: Record Pledge
      (fast response)           on Hyperledger Fabric
                                 (backend signs via
                                  lender's Fabric MSP
                                  identity)
                                        │
                                        ▼
                              Alerting Layer → notify
                              other lenders if relevant
```

---

## 12. Build Sequencing Guidance (1–2 Week Timeline)

Given the amount of infrastructure in this stack, sequencing matters more than the architecture itself:

1. **Start the Fabric network first, in parallel with everything else.** It's the highest-risk, most infra-heavy piece (network config, environment issues). Use `fabric-samples/test-network` rather than building from raw components.
2. **Build gold fingerprinting early too** — it's pure Python with no infrastructure dependency, so it's a safe, fast win that can run in parallel with Fabric setup.
3. **Test the login → Fabric-identity mapping path early.** It's the one genuinely novel piece of glue code (not copy-paste from a sample repo) and everything else (pledge registration, closure) depends on it working.
4. **Scope the ZK circuit to exactly one statement from day one.** Resist any temptation to generalize it mid-build.
5. **Decide your fallback for Fabric and ZK before you need it** — e.g., a pre-generated proof shown as a static result if live generation isn't stable close to demo day. Don't discover this the night before.
6. **Rule engine before LLM integration** — get deterministic scoring working and tested first; layer the LLM narrative/escalation on top once the core scoring is stable.

---

## 13. Final Stack — Locked

```text
FRONTEND
├── Next.js
├── React
└── Tailwind CSS

AUTH
├── Wallet-style signed-challenge login → JWT (session identity)
└── Fabric CA + MSP (separate, server-held ledger-write identity)

BACKEND
└── FastAPI + Python

DATA
├── Supabase PostgreSQL
└── Redis

GOLD IDENTIFICATION
├── Bucketed/quantized appraisal data
├── SHA-256 → Gold Fingerprint
└── pHash → Image Evidence

BORROWER IDENTITY
└── HMAC-SHA256 (keyed hash)

RISK
├── Rule-based scorer (primary, deterministic, authoritative)
└── LLM (Gemini API) → narrative explanation + bounded escalation only

PRIVACY
├── Noir → ZK Circuit (single exposure-threshold statement)
└── Barretenberg → ZK Proof generation/verification

BLOCKCHAIN
├── Hyperledger Fabric (single network, fabric-samples/test-network base)
├── Fabric Chaincode
├── Fabric CA + MSP
└── Fabric Gateway
    └── CouchDB (world state)

ALERTING
└── Webhook / WebSocket service

INFRASTRUCTURE
└── Docker + Docker Compose
```

### One-line summary

**Next.js + React + Tailwind → (login via signed challenge) → FastAPI → Borrower Identity (HMAC-SHA256) + Gold Fingerprint (bucketed SHA-256 + pHash) → Fabric Registry Verification → Hybrid Risk Engine (rule-based primary + LLM narrative/escalation) → Noir + Barretenberg ZK Proof (single statement) → Decision Engine (async pledge recording via Fabric Gateway, signed with the lender's server-held Fabric MSP identity) → Hyperledger Fabric + Chaincode + CouchDB + Alerting Layer.**
