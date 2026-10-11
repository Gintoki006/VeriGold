# VeriGold Mobile Client (Flutter)

> **Institutional mobile client for the VeriGold privacy-preserving cross-lender gold-loan registry ("CIBIL for Gold Loans").**

---

## Overview

`mobile/` is a standalone, full-featured Flutter mobile application built alongside the VeriGold Next.js web application (`frontend/`). Both applications connect concurrently to the single FastAPI backend (`backend/`), sharing the Hyperledger Fabric ledger, Supabase PostgreSQL database mirrors, and Redis cache.

---

## Features

- **Institutional Authentication (`lib/features/auth/`):**
  - Institution selector for `Org1MSP` (Shri Lakshmi Finance), `Org2MSP` (Sunrise Gold Loans), `Org3MSP` (Muthoot Quick Gold), and `Org4MSP` (Manappuram Finance).
  - Client-side Ed25519 key generation & detached signing (`cryptography` package).
  - One-tap quick login handshake issuing JWT bearer session.

- **Executive Dashboard (`lib/features/dashboard/`):**
  - Summary metrics: Queries Today, Active Pledges, Open High-Risk Alerts.
  - Hackathon Demo Shortcut Chips: 1-tap testing for Scenarios A, B, C, and D.
  - Recent borrower evaluation history feed.

- **Privacy-Preserving Borrower Search (`lib/features/borrower_search/`):**
  - 12-digit Aadhaar input (plaintext Aadhaar is never stored or logged).
  - HMAC-SHA256 privacy commitment via `/api/borrowers/compute-hash`.
  - Comprehensive risk report: animated score (0–100), risk badge (LOW / MEDIUM / HIGH), recommendation banner (APPROVE / REDUCE / REJECT), explainable rule factors, and Gemini AI narrative.
  - **Register Pledge on Fabric:** Modal to select amount range (Buckets 0–4) and register the pledge directly on Hyperledger Fabric.

- **Physical Gold Appraisal & Fingerprinting (`lib/features/gold_appraisal/`):**
  - Collateral attributes form: item type, weight, purity, dimensions, characteristics.
  - Camera & Gallery image picker.
  - Quantized attribute SHA-256 fingerprinting & perceptual pHash.
  - Active collateral duplicate check on Fabric registry.
  - "Attach to Borrower Search" button passing the fingerprint into search.

- **Fabric Pledge Lifecycle Management (`lib/features/pledges/`):**
  - Paginated feed of lender's own pledges.
  - Filter tabs: ALL, ACTIVE, CLOSED.
  - Close Pledge action with confirmation modal and Fabric tx hash tracking.

- **Threat Alerts & Fraud Feed (`lib/features/alerts/`):**
  - Real-time consortium fraud flags (Velocity bursts, Collateral re-pledges).
  - Filter chips and "Mark Reviewed" status toggling.

- **Zero-Knowledge Exposure Proof (`lib/features/zk_proof/`):**
  - Policy threshold selector (Buckets 2–5).
  - Generates & verifies Noir proof (`total_exposure < threshold`) without revealing values.

- **Consortium Admin Console (`lib/features/admin/`):**
  - Role-guarded for `Org1MSP` (Primary Admin).
  - Platform metrics and lender organization activation switchers.

- **Settings & Network Diagnostics (`lib/features/settings/`):**
  - Runtime Base URL switcher (`10.0.2.2:8000` for Android emulator, `localhost:8000` for iOS/Desktop, custom LAN IP).
  - Live `/health` ping diagnostic testing Backend, Redis, and Fabric readiness.

---

## How to Run

### Prerequisites
- Flutter SDK (3.27+ / 3.47+)
- Backend running (`cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`)

### Launch Commands

```bash
# In the mobile/ directory:
cd mobile
flutter run

# Or via PowerShell from repo root:
.\scripts\mobile.ps1
```

### Network Loopback Notes
- **Android Emulator:** Uses `http://10.0.2.2:8000`
- **iOS Simulator / Desktop:** Uses `http://localhost:8000`
- **Physical Phone over Wi-Fi:** Enter your computer's local IP (e.g. `http://192.168.1.15:8000`) in the Settings screen.
