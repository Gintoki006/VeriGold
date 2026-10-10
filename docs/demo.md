# VeriGold — Hackathon Demo Script

> **Duration:** ~3 minutes  
> **Updated:** Phase 8 §8.2.2 — includes final credentials, hashes, and fallback plan

---

## Pre-Demo Checklist

Run all of these **before** going on stage.

```bash
# 1. Start Fabric test-network
./fabric/network/start.sh

# 2. Deploy chaincode
./fabric/network/deploy-chaincode.sh

# 3. Enroll lenders (Org1 + Org2)
./fabric/network/enroll-lenders.sh

# 4. Start backend + Redis + PostgreSQL
docker compose up -d

# 5. Seed demo data (prints reference card)
cd backend && python -m app.scripts.seed_demo_data

# 6. Start frontend dev server
cd frontend && npm run dev

# 7. Pre-open two browser tabs:
#    Tab 1 → http://localhost:3000       (Landing page / Auth)
#    Tab 2 → http://localhost:3000/auth  (Login — ready to click)
```

---

## Demo Borrower Hashes (from seed_demo_data.py output)

> **Run `python -m app.scripts.seed_demo_data` to regenerate with your BORROWER_HASH_KEY.**  
> The values below are the expected output for the default development key `"change-me-in-production"`.

| Scenario | Aadhaar (synthetic) | Description |
|---|---|---|
| **A** | `111111111111` | Clean — 0 pledges → **LOW / APPROVE** |
| **B** | `222222222222` | Moderate — 2 pledges → **MEDIUM / REDUCE_AMOUNT** |
| **C** | `333333333333` | High velocity — 4 pledges in 7d → **HIGH / REJECT** |
| **D** | `444444444444` | Gold match — 0 pledges but gold already pledged → **HIGH / REJECT** |

### Scenario D — Pre-pledged Gold Item

| Field | Value |
|---|---|
| Item type | Bangle |
| Weight | 22.5 g |
| Purity | 91.6 % (22K) |
| Dimensions | 65 mm diameter |
| Characteristics | BIS916 hallmark |

Enter these values in the Gold Appraisal form to trigger a **MATCH FOUND** alert.

---

## Demo Lender Credentials (public keys only — shown during demo)

> Two lender accounts are pre-seeded by the backend admin API at startup (see `backend/app/db/database.py` initial data migration).

| Organisation | MSP ID | Role |
|---|---|---|
| Shri Lakshmi Finance Ltd | `Org1MSP` | Primary demo lender (Admin) |
| Sunrise Gold Loans | `Org2MSP` | Secondary lender (for cross-lender pledge view) |

Login with **Org1MSP** for the demo. The Ed25519 key pair is generated fresh in the browser at login time — no credential to copy.

---

## 3-Minute Demo Flow

### Step 1 — The Problem (~25s)

> *"A borrower walks into 5 different gold loan shops and pledges the same earrings at each one. Nobody knows — until now."*

1. Show the **VeriGold landing page** (`http://localhost:3000`).
2. Narrate the problem section: no shared registry exists today.
3. Point to the four pillars: HMAC Privacy, Blockchain, AI Risk, ZK Proof.

---

### Step 2 — Login (~20s)

1. Click **"Connect & Login"** on the landing page → navigates to `/auth`.
2. Click **"Generate Identity"** — explain: *"Ed25519 key pair, private key stays in this browser tab only. Never transmitted."*
3. Click **"Request Challenge"** — backend issues a one-time nonce.
4. *Signing is automatic.* Show the "Authenticated" step turning green.
5. Dashboard appears with stats.

---

### Step 3 — HIGH Risk: Velocity Fraud (Scenario C) (~30s)

> *"Borrower C has taken 4 gold loans in the last 7 days across 4 different lenders."*

1. In the Borrower Risk Search form, enter Aadhaar: **`333333333333`**.
2. Point out: *"The browser converts this to an HMAC hash before it leaves the page — the backend never sees the Aadhaar."*
3. Click **"Hash & Search"** → Risk Report appears.
4. Show: **HIGH risk badge** (red), score ≥ 70, velocity alert explanation, LLM narrative, **REJECT** recommendation.
5. Highlight: explainability — each risk factor shown individually.

---

### Step 4 — Gold Fingerprint Fraud (Scenario D) (~30s)

> *"Borrower D has no prior loans — but the gold they're bringing in has already been pledged elsewhere."*

1. Navigate to **Gold Appraisal** (`/dashboard/gold-appraisal`).
2. Enter the Scenario D gold item details:
   - Weight: **22.5g** | Purity: **91.6%** | Type: **Bangle**
   - Dimensions: **65mm diameter** | Characteristics: **BIS916**
3. Click **"Compute Fingerprint"** → hash appears.
4. Click **"Check for Match"** → **MATCH FOUND — High Risk** alert appears (red).
5. Narrate: *"Same earrings, different borrower name — caught before a second loan is issued."*

---

### Step 5 — Clean Borrower + Approve (Scenario A) (~20s)

> *"Borrower A — first-time borrower, clean history."*

1. Navigate back to Dashboard. Search Aadhaar: **`111111111111`**.
2. Show: **LOW risk** (green badge), score < 30, **APPROVE** recommendation, 0 active pledges.

---

### Step 6 — Register Pledge on Fabric (~20s)

1. On the Scenario A risk report, select amount range, click **"Register Pledge on Fabric"**.
2. Show: Fabric transaction hash appears below the button.
3. Narrate: *"Immutable record on Hyperledger Fabric — every enrolled lender can verify this, but nobody can tamper with it."*

---

### Step 7 — Zero-Knowledge Proof (~20s)

> *"We can prove Borrower A's total exposure is below ₹1 lakh — without revealing the exact amount."*

1. Navigate to **ZK Proof Demo** (`/dashboard/zk-proof`).
2. Select threshold bucket **5**. Click **"Generate Proof"**.
3. Show: ✅ **Proof Verified**, statement shown, proof hash truncated, private input hidden.
4. Narrate: *"The prover never reveals the actual exposure — just that it's below your threshold."*

---

### Step 8 — Close Pledge (~15s)

1. Navigate to **My Pledges** (`/dashboard/pledges`).
2. Click **"Close"** on the pledge registered in Step 6. Confirm in the modal.
3. Show: status updates to **CLOSED**, new tx hash confirmed on Fabric.
4. Return to Dashboard and search Borrower A → **0 active pledges** (cleared from registry).

---

### Step 9 — Final Message (~10s)

> *"VeriGold — Verify Before You Lend."*

Show the landing page again. Close with the tagline.

---

## Fallback Plan

| Failure | Fallback |
|---|---|
| **Fabric unavailable** | Risk scores are computed from PostgreSQL mirror (seeded by seed_demo_data.py). Show a note: *"Using mirror data — full Fabric demo below."* |
| **Gemini API rate-limited** | Risk engine falls back to rule-only scoring — result is still fully explainable. |
| **ZK proof too slow** | Use pre-generated proof at `zk/proofs/demo_proof.json` (clearly label as pre-generated). The `ZK_PROOF_FALLBACK=true` env var activates this automatically. |
| **Auth challenge fails** | Reset session storage, regenerate key pair, retry. |

---

## Security Audit Results (§8.3.x)

All checks passed as of Phase 8. See [Security Audit](#security-audit) section of architecture.md.

- ✅ No plaintext Aadhaar in source code or logs
- ✅ All 500 errors return `{"detail": "..."}`, no stack traces
- ✅ Rate limit (10 req/60s) enforced at middleware layer
- ✅ Cross-lender pledge close blocked with HTTP 403
- ✅ JWT_SECRET, BORROWER_HASH_KEY, GEMINI_API_KEY — env only, never hardcoded
