# VeriGold — API Specification

> **Status:** Stub — to be filled in during Phase 3.  
> Source: PRD.md §15

---

## Base URL

```
http://localhost:8000/api
```

---

## Authentication

### `POST /api/auth/challenge`
Request a signed challenge nonce for wallet-style authentication.

**Response:**
```json
{ "challenge": "<random nonce string>" }
```

---

### `POST /api/auth/verify`
Verify the signed challenge and issue a JWT.

**Request:**
```json
{
  "public_key": "...",
  "signature": "...",
  "challenge": "..."
}
```

**Response:**
```json
{ "token": "<jwt>" }
```

---

### `POST /api/auth/logout`
Invalidate the current session.

---

### `GET /api/auth/me`
Return the authenticated lender's profile.

---

## Borrower

### `POST /api/borrowers/search`
Submit an HMAC-SHA256 borrower hash and receive the full risk report.

**Request:**
```json
{ "borrower_hash": "..." }
```

**Response:**
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
  "llm_reasoning": "..."
}
```

---

### `POST /api/borrowers/compute-hash`
Compute the HMAC-SHA256 commitment for a given Aadhaar (server-side, for verification only).

---

## Gold

### `POST /api/gold/fingerprint`
Compute and return the gold fingerprint for a submitted appraisal.

### `POST /api/gold/match-check`
Check whether a gold fingerprint matches any active pledge on the registry.

---

## Pledges

### `POST /api/pledges`
Register a new pledge on the Fabric registry.

### `POST /api/pledges/{pledge_id}/close`
Close an active pledge.

### `GET /api/pledges`
List the authenticated lender's pledges.

### `GET /api/pledges/{pledge_id}`
Retrieve a single pledge record.

---

## ZK Proof

### `POST /api/zk/prove-exposure`
Generate and return a ZK proof that total exposure is below the lender's stated threshold.

---

## Alerts

### `GET /api/alerts`
Retrieve fraud/high-risk alerts for the authenticated lender.

---

## Transactions

### `GET /api/transactions`
Retrieve the authenticated lender's Fabric transaction history.

---

## Health

### `GET /health`
**Response:**
```json
{ "status": "ok", "fabric": false, "redis": false }
```
