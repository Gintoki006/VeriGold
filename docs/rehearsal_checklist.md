# VeriGold — Demo Rehearsal Checklist (Phase 9 §9.4)

> Run through this checklist end-to-end before going on stage.  
> Every item must be **✅** before the demo starts.

---

## Pre-Demo Setup

| # | Step | Status |
|---|---|---|
| 1 | Fabric test-network running (`./fabric/network/start.sh`) | ☐ |
| 2 | Chaincode deployed (`./fabric/network/deploy-chaincode.sh`) | ☐ |
| 3 | Lenders enrolled (`./fabric/network/enroll-lenders.sh`) | ☐ |
| 4 | `docker compose up -d` — FastAPI + Redis healthy | ☐ |
| 5 | `GET http://localhost:8000/health` → `{"status":"ok","redis":true}` | ☐ |
| 6 | Demo data seeded (`cd backend && python -m app.scripts.seed_demo_data`) | ☐ |
| 7 | Reference card printed — keep it handy (Aadhaar numbers + gold item values) | ☐ |
| 8 | `cd frontend && npm run dev` — UI loads at localhost:3000 | ☐ |
| 9 | Tab 1: landing page open at `http://localhost:3000` | ☐ |
| 10 | Tab 2: auth page ready at `http://localhost:3000/auth` | ☐ |
| 11 | Browser devtools closed (no console errors visible to audience) | ☐ |
| 12 | Screen resolution set for presentation (1920×1080 recommended) | ☐ |

---

## AC Verification (All 12 Acceptance Criteria)

Run through each AC manually in sequence.

### AC-01 — Login flow works end-to-end

1. Navigate to `/auth`.
2. Click **Generate Identity** → key pair generated, pubkey displayed.
3. Click **Request Challenge** → nonce returned from backend.
4. Signing happens automatically → step 3 turns green.
5. Redirected to `/dashboard` with lender name shown in sidebar.

**Expected:** Dashboard loads with stats row. No error banners.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-02 — No plaintext Aadhaar in request logs

1. In the borrower search form, enter any 12-digit number.
2. Click **Hash & Search**.
3. Open browser Network tab → inspect the POST to `/api/borrowers/search`.

**Expected:** Request body contains only `borrower_hash` (64-char hex). No `aadhaar` field.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-03 — Borrower with 2 active pledges → MEDIUM risk

1. Enter Scenario B Aadhaar: `222222222222`.
2. Submit.

**Expected:** Risk badge shows **MEDIUM** (amber). Recommendation: `REDUCE_AMOUNT`. Active pledges: 2.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-04 — Borrower with 0 pledges → LOW risk

1. Enter Scenario A Aadhaar: `111111111111`.
2. Submit.

**Expected:** Risk badge shows **LOW** (green). Recommendation: `APPROVE`. Active pledges: 0.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-05 — Risk result includes explanation list + LLM narrative

*(Verify during AC-03 or AC-04 result)*

**Expected:** At least one explanation bullet visible below the risk badge. LLM narrative paragraph shown.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-06 — Gold match → flagged in risk score (+40 points)

1. Navigate to **Gold Appraisal** (`/dashboard/gold-appraisal`).
2. Enter Scenario D gold item:
   - Weight: `22.5` g | Purity: `91.6` % | Type: `Bangle`
   - Dimensions: `65mm` diameter | Characteristics: `BIS916`
3. Click **Compute Fingerprint** then **Check for Match**.

**Expected:** **MATCH FOUND** alert shown (red). Risk score ≥ 40.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-07 — Pledge registered → Fabric tx hash returned

1. From Scenario A risk report, click **Register Pledge**.
2. Select amount range, confirm.

**Expected:** `PLG-XXXXXXXX` displayed, Fabric transaction hash shown below.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-08 — Pledge closed → removed from active count

1. Navigate to **My Pledges** (`/dashboard/pledges`).
2. Click **Close** on the Scenario A pledge. Confirm in modal.

**Expected:** Status changes to **CLOSED** with a new tx hash. Return to dashboard and re-search Scenario A → 0 active pledges.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-09 — ZK proof verification passes

1. Navigate to **ZK Proof Demo** (`/dashboard/zk-proof`).
2. Select threshold bucket **5**. Click **Generate Proof**.

**Expected:** ✅ **Proof Verified** shown. Statement `total_exposure < threshold` displayed. Private input not shown.  
**Pass:** ☐ | **Fail:** ☐

---

### AC-10 — Wrong lender cannot close another's pledge (HTTP 403)

*(Verified via automated test `TestPledgeLifecycle::test_close_pledge_by_wrong_lender_raises_403` — PASSED)*

**Status:** Automatically verified ✅

---

### AC-11 — Fabric down → HTTP 503

*(Verified via automated test `TestAPIErrorResponses::test_fabric_unavailable_raises_correct_error_class` — PASSED)*

**Status:** Automatically verified ✅

---

### AC-12 — Full demo flow runs without errors

*(This entire checklist is the rehearsal. Pass if all ACs above pass.)*

**Pass:** ☐ | **Fail:** ☐

---

## Error State Checks (§9.4.4)

| Scenario | Expected UI | Status |
|---|---|---|
| Invalid Aadhaar (< 12 digits) | Inline validation error, no API call | ☐ |
| Invalid Aadhaar (non-numeric) | Inline validation error | ☐ |
| Backend not reachable | "Service unavailable" error banner, no blank screen | ☐ |
| Auth token expired | Redirected to `/auth` with `?redirect=` param | ☐ |
| Empty pledge list | `EmptyState` component shown ("No pledges yet") | ☐ |
| No alerts | `EmptyState` component shown ("No alerts") | ☐ |

---

## Timing Check (§9.4.5)

Target: **≤ 3 minutes** total for full demo flow (Steps 1–9 from `docs/demo.md`).

| Segment | Target Time | Actual |
|---|---|---|
| Step 1: Problem intro | 25s | |
| Step 2: Login | 20s | |
| Step 3: Scenario C (velocity fraud) | 30s | |
| Step 4: Scenario D (gold match) | 30s | |
| Step 5: Scenario A (clean) | 20s | |
| Step 6: Register pledge | 20s | |
| Step 7: ZK proof | 20s | |
| Step 8: Close pledge | 15s | |
| Step 9: Final message | 10s | |
| **Total** | **≤ 3:10** | |

---

## Fallback Confirmation

| Failure Mode | Fallback Ready? |
|---|---|
| Fabric unavailable | PostgreSQL mirror seeded ☐ |
| Gemini API rate-limited | Rule-only scoring active (automatic) ✅ |
| ZK proof slow (> 10s) | `ZK_PROOF_FALLBACK=true` fallback labelled ✅ |
| Auth backend down | Cannot demo — restart required ☐ |

---

*Last updated: Phase 9 — Demo Rehearsal*
