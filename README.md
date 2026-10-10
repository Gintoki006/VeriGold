# VeriGold

> **VeriGold is a privacy-preserving, cross-lender gold-loan registry that gives lenders a real-time, explainable view of a borrower's existing exposure and the pledge history of the physical gold itself — without revealing another lender's underlying customer data.**

---

## Architecture

- **Trust Layer:** Hyperledger Fabric permissioned blockchain — stores borrower hashes, gold fingerprints, amount-range buckets, and pledge status. Immutable, decentralised, auditable by all enrolled lenders.
- **Privacy Layer:** HMAC-SHA256 borrower commitment (plaintext Aadhaar never persisted) + Zero-Knowledge Proof for exposure-threshold verification without revealing the exact value.
- **Application Layer:** FastAPI (Python) backend orchestrating Fabric Gateway, HMAC/fingerprint engines, and a hybrid rule-based + Gemini LLM risk engine. Next.js/React frontend for lender dashboard.
- **Gold Fingerprint Engine:** Quantised physical attributes (weight → 0.5g bins, purity → nearest karat) SHA-256 hashed for collateral-level duplicate detection across lenders.

---

## Prerequisites

| Tool | Version |
|---|---|
| Docker & Docker Compose | Latest stable |
| Node.js | v20+ |
| Python | 3.11+ |
| Go | 1.21+ |
| Rust | Latest stable (Barretenberg toolchain) |
| Nargo (Noir CLI) | Latest stable |

---

## Quick Start (Local Development)

### 1. Start infrastructure (FastAPI + Redis)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — fill in all secrets

docker compose up --build
```

FastAPI will be available at `http://localhost:8000`.

### 2. Start the Fabric test network

```bash
cd fabric
./network/start.sh
./network/deploy-chaincode.sh
./network/enroll-lenders.sh
```

### 3. Start the frontend dev server

```bash
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000

cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`.

### 4. Seed demo data

```bash
cd backend
python -m app.scripts.seed_demo_data
```

This prints a reference card with all demo borrower hashes and the pre-pledged gold fingerprint.

### 5. Verify backend health

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "redis": true}
```

---

## Production Deployment

### Frontend → Vercel

1. Connect the repo to [Vercel](https://vercel.com) and set **Root Directory** to `frontend/`.
2. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://<your-render-url>.onrender.com`
3. Deploy — the `vercel.json` in `frontend/` handles the rest.

### Backend → Render

1. Connect the repo to [Render](https://render.com).
2. Select **render.yaml** in the repo root for Blueprint deploy.
3. Fill in secret env vars in the Render dashboard:
   - `DATABASE_URL` (Supabase connection string)
   - `BORROWER_HASH_KEY` (generate: `openssl rand -hex 32`)
   - `GEMINI_API_KEY`
   - `FABRIC_GATEWAY_URL` (demo machine IP:port)
4. After deploy, set `FRONTEND_URL` to your Vercel URL to lock CORS.

### Generate secrets

```bash
# JWT_SECRET and BORROWER_HASH_KEY
openssl rand -hex 32
```

> **Never commit real secret values.** Only `.env.example` files (with placeholder values) are in source control.

---

## Running Tests

```bash
# Backend — all tests including E2E integration suite
cd backend
python -m pytest app/tests/ -v

# Frontend — production build check (no errors = pass)
cd frontend
npm run build
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `JWT_SECRET` | backend | JWT signing key |
| `BORROWER_HASH_KEY` | backend | HMAC-SHA256 pepper for Aadhaar hashing |
| `GEMINI_API_KEY` | backend | Gemini LLM advisory analysis |
| `REDIS_URL` | backend | Rate limiting + borrower cache |
| `FABRIC_GATEWAY_URL` | backend | Fabric peer endpoint |
| `FRONTEND_URL` | backend | Allowed CORS origin (e.g. `https://verigold.vercel.app`) |
| `ZK_PROOF_FALLBACK` | backend | `true` for cloud deploy, `false` for local with Nargo |
| `NEXT_PUBLIC_API_URL` | frontend | Backend API base URL |

---

## Documentation

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | High-level system architecture and component diagram |
| [`docs/api.md`](docs/api.md) | Backend API spec (all endpoints) |
| [`docs/demo.md`](docs/demo.md) | 3-minute hackathon demo script (9 steps, 4 scenarios) |
| [`docs/decisions.md`](docs/decisions.md) | 13 locked team decisions governing implementation |
| [`PRD.md`](PRD.md) | Full Product Requirements Document |
| [`techstack.md`](techstack.md) | Tech stack and architectural rationale |

---

## Repository Structure

```text
verigold/
├── frontend/           — Next.js 16 + React (lender dashboard, 9 pages)
├── backend/            — FastAPI + Python (API, risk engine, Fabric bridge)
│   ├── app/            — Application code (routers, services, models, tests)
│   ├── risk_engine/    — Hybrid rule scorer + Gemini LLM + decision engine
│   └── alembic/        — Database migrations
├── chaincode/          — Hyperledger Fabric Go chaincode (6 functions)
├── fabric/             — Fabric network scripts (wraps fabric-samples/test-network)
├── zk/                 — Noir ZK circuit (exposure_threshold) + proofs
├── docs/               — Architecture, API, demo script, team decisions
└── docker-compose.yml  — Local infrastructure orchestration (FastAPI + Redis)
```

---

## Security & Privacy

- **Aadhaar is never stored.** Only HMAC-SHA256 hashes reach the backend.
- **No stack traces in API responses.** All 500s return `{"detail": "..."}`.
- **Rate limited** — 10 borrower searches per lender per 60s.
- **Cross-lender pledge isolation** — lenders can only modify their own pledges (HTTP 403 otherwise).
- **ZK proof** — total exposure is a private witness, never in API responses.
- **Secrets** — JWT_SECRET, BORROWER_HASH_KEY, GEMINI_API_KEY are env-only, never hardcoded.
