# VeriGold — Architecture

> Copied from `techstack.md §3`. This is the source-of-truth architecture diagram for system documentation.

---

## High-Level Architecture

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
      │   PostgreSQL    │           │ Webhook/WebSocket │
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
      ┌─────────────────────────┐
      │         CouchDB         │
      │     (Fabric world       │
      │     state / rich        │
      │      queries)           │
      └─────────────────────────┘
```

---

## Key Architectural Rules

1. **Trust Layer vs Application Layer:** Only immutable shared-trust data (borrower hash, gold fingerprint, pledge status, amount range) belongs on-chain. Everything else belongs off-chain.
2. **Async Fabric writes:** Fabric consensus and ZK proof generation are not millisecond-scale. Pledge registration is decoupled from the risk decision response.
3. **LLM boundary:** The Gemini LLM may only escalate a REDUCE recommendation to REJECT. It can never lower a risk score, set the risk level alone, or override the deterministic rule engine.
4. **Aadhaar never leaves the browser in plaintext:** HMAC-SHA256 (with server-held pepper) is computed client-side before any network request.

---

## Component Responsibilities

| Component | Responsibility |
|---|---|
| **Frontend** | Lender UI, local HMAC computation, signed-challenge auth, rendering risk reports |
| **FastAPI** | API routing, JWT auth, input validation, rate limiting, Fabric Gateway bridge, risk engine orchestration |
| **Borrower Identity Engine** | HMAC-SHA256 keyed hash with server pepper |
| **Gold Fingerprint Engine** | Quantization (0.5g / nearest karat) → canonical JSON → SHA-256 + pHash |
| **Risk Engine** | Rule-based scorer (primary, authoritative) + Gemini LLM (explanation + secondary anomaly signal) |
| **ZK Engine** | Noir circuit + Barretenberg proving/verification for single exposure-threshold statement |
| **Fabric Chaincode** | RegisterPledge, ClosePledge, GetBorrowerSummary, GetGoldMatch, GetActivePledges |
| **Supabase PostgreSQL** | Lenders, pledge mirrors, queries, fraud alerts, transactions |
| **Redis** | Rate limiting, caching, temporary workflow state |
| **Alerting** | Webhook/WebSocket fraud alert push to enrolled lenders |
