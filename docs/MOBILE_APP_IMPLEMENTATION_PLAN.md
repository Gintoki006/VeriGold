# VeriGold Mobile — Dual-Client Implementation Plan

**Document:** Engineering Implementation Plan & Architecture Specification  
**Version:** 1.0 (Finalized)  
**Target Repository / Directory:** `verigold_mobile` (sibling or dedicated mobile directory)  
**Companion Documents:**
- [`PRD.md`](file:///e:/Verigold%20cloned/VeriGold/PRD.md) (Product Requirements Document v2.0)
- [`techstack.md`](file:///e:/Verigold%20cloned/VeriGold/techstack.md) (Tech Stack & Architectural Rationale v2.0)
- [`README.md`](file:///e:/Verigold%20cloned/VeriGold/README.md) (System Setup, Architecture & Testing)
- [`docs/api.md`](file:///e:/Verigold%20cloned/VeriGold/docs/api.md) (Backend API Specification)
- [`docs/decisions.md`](file:///e:/Verigold%20cloned/VeriGold/docs/decisions.md) (13 Locked Team Decisions)
- [`docs/demo.md`](file:///e:/Verigold%20cloned/VeriGold/docs/demo.md) (3-Minute Hackathon Demo Script)

---

## 1. Executive Summary & Cross-Document Evaluation

This document outlines the complete plan to build, test, and run a **Flutter mobile application (`verigold_mobile`)** operating alongside the existing Next.js web application (`frontend/`). Both clients connect simultaneously to the single **VeriGold FastAPI backend (`backend/`)**, sharing the same **Hyperledger Fabric** blockchain ledger, **Supabase PostgreSQL** private mirror database, and **Redis** cache.

```text
                                  ┌───────────────────────────────┐
                                  │       LENDER USER BASES       │
                                  ├───────────────┬───────────────┤
                                  │ Institutional │  Field Loan   │
                                  │ Branch Portal │  Officers     │
                                  └───────┬───────┴───────┬───────┘
                                          │               │
                                          ▼               ▼
                        ┌───────────────────┐   ┌───────────────────┐
                        │    WEB CLIENT     │   │   MOBILE CLIENT   │
                        │ Next.js 16/React  │   │   Flutter 3.x     │
                        │ (Desktop Browser) │   │ (Android/iOS App) │
                        └─────────┬─────────┘   └─────────┬─────────┘
                                  │                       │
                                  │ HTTPS / REST (JWT)    │
                                  └───────────┬───────────┘
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │             FASTAPI BACKEND               │
                        │           (Port :8000 / Cloud)            │
                        ├─────────────────────┬─────────────────────┤
                        │  Hybrid Risk Engine │  Fabric Gateway     │
                        │  (Rule + Gemini LLM)│  (Server MSP Bridge)│
                        └─────────┬───────────┴───────────┬─────────┘
                                  │                       │
                    ┌─────────────┴────────┐    ┌─────────┴─────────┐
                    ▼                      ▼    ▼                   ▼
             ┌──────────────┐      ┌─────────────┐   ┌───────────────────────────┐
             │  PostgreSQL  │      │    Redis    │   │    HYPERLEDGER FABRIC     │
             │  (Supabase)  │      │ (Cache/Rate)│   │ (CouchDB + Orderer/Peers) │
             └──────────────┘      └─────────────┘   └───────────────────────────┘
```

### 1.1 Architectural Traceability Matrix

Every feature is mapped directly from [`PRD.md`](file:///e:/Verigold%20cloned/VeriGold/PRD.md) and [`docs/decisions.md`](file:///e:/Verigold%20cloned/VeriGold/docs/decisions.md) to the Flutter mobile client:

| PRD Ref | Feature / Invariant | Web Implementation | Mobile Implementation (Flutter) | Locked Decision Ref |
|---|---|---|---|---|
| **PRD §7, §8** | **Ed25519 Session Auth** | `tweetnacl` in `sessionStorage` | `cryptography` package + `flutter_secure_storage` | **Dec 2, Dec 7**: Session identity decoupled from Fabric MSP; Fabric signing is custodial |
| **PRD §9** | **Borrower Identity Privacy** | Client validates 12 digits, backend computes HMAC | Native 12-digit input with auto-formatting `XXXX XXXX XXXX`; plaintext Aadhaar never logged | **Dec 1**: `BORROWER_HASH_KEY` pepper never exposed to client |
| **PRD §10** | **Gold Collateral Fingerprint** | Quantized JSON SHA-256 + browser pHash | Native Camera/Gallery (`image_picker`), multipart upload with image bytes for `pHash`, attribute fingerprint | **Dec 2**: 0.5g weight bins & nearest karat purity quantization |
| **PRD §17** | **Hybrid Risk Scoring** | Rule engine authoritative + Gemini narrative | Dynamic Score Gauge (0–100), weighted factor cards, Gemini advisory card, decision banner | **Dec 3, Dec 4**: Score <30 (LOW), 30–69 (MED), ≥70 (HIGH); LLM escalates upward only |
| **PRD §18** | **Zero-Knowledge Proof** | Web UI calls `/api/zk/prove-exposure` | Interactive threshold selector (Buckets 2–5), animated proving shimmer, verifiable proof viewer | **Dec 9, Dec 13**: Single statement `total_exposure < threshold`; live/fallback mode flag |
| **PRD §13, §16** | **Pledge Lifecycle** | Register on Fabric, list mirrors, close pledge | Bottom-sheet registration modal, pull-to-refresh paginated feed, swipe-to-close with modal confirmation | **Dec 5, Dec 7**: Read all, write own, close only own pledge |
| **PRD §20, §23** | **Failure Integrity** | 503 on Fabric/Risk engine down, 429 rate limit | Dio network interceptors surfacing explicit error banners; zero fabricated risk states | **Dec 11**: Integrity over availability; never fabricate scores |
| **PRD §26, §33** | **Hackathon Demo Scenarios** | Demo borrower hashes & gold item D | Instant 1-tap "Demo Quick-Fill" toolbar covering Scenarios A, B, C, and D | **Dec 10**: Demo dataset fidelity for 3-minute pitch |

---

## 2. Directory Layout & Coexistence Architecture

The mobile app will live in a dedicated parallel directory (e.g. `e:\Verigold cloned\verigold_mobile` or `verigold_mobile/` alongside `VeriGold/`):

```text
e:\Verigold cloned\
├── VeriGold/                     # Existing full-stack repository
│   ├── backend/                  # FastAPI backend (:8000)
│   ├── frontend/                 # Next.js web application (:3000)
│   ├── fabric/                   # Hyperledger Fabric network & chaincode
│   ├── zk/                       # Noir circuit & proving artifacts
│   └── docs/                     # Architecture, API & Decision records
└── verigold_mobile/              # New Flutter mobile repository
    ├── android/                  # Android native project (Cleartext HTTP enabled)
    ├── ios/                      # iOS native project (Camera/Photos permissions)
    ├── lib/                      # Flutter Dart source code
    │   ├── core/                 # Config, Networking, Security, Theme
    │   ├── features/             # Auth, Dashboard, Search, Risk, Gold, Pledges, ZK, Admin
    │   └── shared/               # Widgets, Models, Providers
    └── pubspec.yaml              # Dependencies & asset manifests
```

### 2.1 Network Topology & Loopback Routing

Because mobile emulators and physical devices run in sandboxed network environments, they cannot reach host machines via plain `localhost`:

```text
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│       ANDROID EMULATOR CLIENT        │       │      PHYSICAL PHONE (WI-FI/LAN)      │
│     API Base: http://10.0.2.2:8000   │       │     API Base: http://192.168.1.X:8000│
└──────────────────┬───────────────────┘       └──────────────────┬───────────────────┘
                   │                                              │
                   └──────────────────────┬───────────────────────┘
                                          ▼
                       ┌─────────────────────────────────────┐
                       │     HOST MACHINE (DEV COMPUTER)     │
                       │   FastAPI Server on 0.0.0.0:8000    │
                       └─────────────────────────────────────┘
```

The Flutter app will include a **Runtime Environment Switcher** in Settings with presets:
1. `Android Emulator` (`http://10.0.2.2:8000`)
2. `iOS Simulator / Localhost` (`http://localhost:8000`)
3. `LAN / Wi-Fi IP` (`http://<custom_ip>:8000`)
4. `Production Cloud` (`https://<render-backend-url>.onrender.com`)

---

## 3. Technology Stack & Dependencies (`pubspec.yaml`)

```yaml
name: verigold_mobile
description: Institutional privacy-preserving cross-lender gold-loan registry client.
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

  # State Management & DI
  flutter_riverpod: ^2.5.1

  # Networking & HTTP Interceptors
  dio: ^5.4.3+1

  # Secure Storage & Session Persistence
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.3

  # Cryptography (Ed25519 & Local Hashing)
  cryptography: ^2.7.1
  crypto: ^3.0.3

  # UI Design, Typography & Icons
  google_fonts: ^6.2.1
  lucide_icons: ^0.354.0
  flutter_animate: ^4.5.0
  shimmer: ^3.0.0

  # Charts & Visualizations
  fl_chart: ^0.68.0

  # Hardware: Camera & Gallery for Gold Appraisal
  image_picker: ^1.1.0

  # Utilities
  intl: ^0.19.0
  uuid: ^4.4.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/icons/
```

---

## 4. Phase-by-Phase Implementation Plan

### Phase 1: Environment Setup, Design Tokens & Core Infrastructure
- **Objective:** Establish the Flutter codebase, configure Android/iOS permissions, set up network interceptors, and build the dark luxury sovereign theme.
- **Tasks:**
  1. Initialize Flutter project in the target directory:
     ```bash
     flutter create --org com.verigold.app --platforms android,ios verigold_mobile
     ```
  2. Configure `android/app/src/main/AndroidManifest.xml`:
     - Add `android:usesCleartextTraffic="true"` inside `<application>` for local `http://` testing.
     - Add permissions: `android.permission.INTERNET`, `android.permission.CAMERA`.
  3. Configure `ios/Runner/Info.plist`:
     - Add `NSCameraUsageDescription` ("VeriGold requires camera access to photograph physical gold items for tamper-evident fingerprinting.").
     - Add `NSPhotoLibraryUsageDescription`.
  4. Implement `AppTheme` (`lib/core/theme/`):
     - Background `#0B0F17`, Surface `#111827`, Card `#161F30`, Border `#1F293D`.
     - Sovereign Gold `#D4AF37`, Light Gold `#F3E5AB`, Accent Green `#10B981`, Red `#EF4444`.
     - Outfit font typography theme.
  5. Implement `DioClient` with `AuthInterceptor`:
     - Injects `Authorization: Bearer <token>` from `flutter_secure_storage`.
     - Handles 401 (triggers logout event), 429 (rate-limit banner), and 503 (Fabric/risk engine offline banner per Decision 11).

---

### Phase 2: Cryptographic Layer & Multi-Institution Auth Flow
- **Objective:** Replicate the web app's Ed25519 challenge-response handshake and institution switcher (`Org1MSP`–`Org4MSP`).
- **Endpoints:**
  - `POST /api/auth/challenge`
  - `POST /api/auth/verify`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- **Tasks:**
  1. Implement `KeyManager` (`lib/core/security/key_manager.dart`):
     - Uses `cryptography`'s `Ed25519()` algorithm.
     - Generates and persists the 32-byte private key securely in `FlutterSecureStorage`.
     - Exports Base64/Hex public key and 16-character public key fingerprint (`"0x1234...abcd"`).
  2. Implement `AuthNotifier` (Riverpod):
     - Challenge-response workflow:
       - Sends public key to `/api/auth/challenge`.
       - Obtains `nonce` and `challenge_id`.
       - Signs the message `Sign this to authenticate with VeriGold: <nonce>`.
       - Sends signature + `msp_id` to `/api/auth/verify`.
       - Stores returned JWT and lender profile in secure storage.
  3. Build `AuthScreen` (`lib/features/auth/presentation/auth_screen.dart`):
     - Institution selector cards:
       - 🏛️ `Org1MSP` — Shri Lakshmi Finance Ltd (Primary / Admin)
       - 🏦 `Org2MSP` — Sunrise Gold Loans (Member Bank)
       - 🪙 `Org3MSP` — Muthoot Quick Gold (Member Bank)
       - 🏢 `Org4MSP` — Manappuram Finance Ltd (Member Bank)
     - Multi-step cryptographic visualizer (Step 1 Keygen → Step 2 Nonce Request → Step 3 Sign → Step 4 Authorized).
     - 1-Tap Quick Login button for instant demo access.

---

### Phase 3: Executive Dashboard & Quick Demo Hub
- **Objective:** Give loan officers instant metrics, query history, high-risk alert counters, and demo scenario triggers.
- **Endpoints:**
  - `GET /api/dashboard/stats`
  - `GET /api/borrowers/search-history?limit=10`
  - `GET /api/alerts?limit=5&risk_level=HIGH`
- **Tasks:**
  1. Build `DashboardScreen` (`lib/features/dashboard/`):
     - Metric cards: **Queries Today**, **My Active Pledges**, **High-Risk Alerts** (with pulsing alert indicator).
     - Recent search query feed showing borrower commitment snippet, risk badge, and timestamp.
     - Pull-to-refresh pulling live stats from FastAPI.
  2. Implement `DemoScenariosBar` widget:
     - Floating or pinned toolbar providing 1-tap pre-fill for the 4 hackathon demo cases:
       - **Scenario A:** Aadhaar `111111111111` (Clean borrower → Low Risk)
       - **Scenario B:** Aadhaar `222222222222` (Moderate exposure → Medium Risk)
       - **Scenario C:** Aadhaar `333333333333` (Velocity fraud → 4 pledges in 7 days → High Risk)
       - **Scenario D:** Aadhaar `444444444444` + Pre-pledged Bangle attributes (Gold match fraud → High Risk)

---

### Phase 4: Privacy-Preserving Borrower Search & Hybrid Risk Engine
- **Objective:** Search borrowers while maintaining zero plaintext PII leakage and rendering explainable hybrid risk scores.
- **Endpoints:**
  - `POST /api/borrowers/compute-hash`
  - `POST /api/borrowers/search`
- **Tasks:**
  1. Build `BorrowerSearchScreen`:
     - 12-digit Aadhaar input with auto-formatting (`1234 5678 9012`), client-side regex check (`^\d{12}$`), and numeric keypad.
     - Optional gold fingerprint attachment pill (if pre-computed from the Appraisal tab).
     - Search button triggering `/api/borrowers/compute-hash` followed by `/api/borrowers/search`.
  2. Build `RiskReportScreen` (`lib/features/risk_report/`):
     - **Dynamic Circular Gauge (`ScoreGauge`):** Animated score 0–100 with smooth sweep and colored gradient.
     - **Recommendation Banner:** High-contrast indicator for `APPROVE`, `REDUCE_AMOUNT`, or `REJECT`.
     - **Summary Attribute Grid:** Active Pledges, Exposure Range (e.g. ₹1L–₹2L+), 7-Day Velocity Flag, Collateral Match Status.
     - **Explainable Rule Breakdown:** Card listing deterministic rules evaluated (e.g. `+50 Active Loans: 2`, `+20 Velocity Flag`).
     - **Gemini AI Advisory Narrative:** Dedicated card rendering natural-language rationale from the Gemini LLM.
     - **"Register Pledge on Fabric" CTA:** Opens registration modal with pre-bound borrower commitment.

---

### Phase 5: Native Gold Appraisal & Collateral Fingerprinting
- **Objective:** Physical gold appraisal form with native camera capture, attribute quantization, canonical SHA-256 fingerprinting, and Fabric deduplication lookup.
- **Endpoints:**
  - `POST /api/gold/fingerprint`
  - `POST /api/gold/match-check`
- **Tasks:**
  1. Build `GoldAppraisalScreen` (`lib/features/gold_appraisal/`):
     - Appraisal form fields:
       - Item Type dropdown (Ring, Necklace, Bangle, Bracelet, Earring, Chain, Coin, Bar, Other).
       - Weight in grams (e.g., `22.5`).
       - Purity percentage (e.g., `91.6` for 22K).
       - Dimensions (length/width or diameter in mm).
       - Characteristics (e.g., `BIS916 hallmark`).
     - Camera/Gallery photo picker with image thumbnail and remove button.
  2. Implement fingerprint computation:
     - Sends attributes and optional photo bytes to `/api/gold/fingerprint`.
     - Displays generated 64-char SHA-256 fingerprint and perceptual `pHash`.
  3. Implement collateral match check:
     - Calls `/api/gold/match-check`.
     - If match found: Displays Crimson Warning Card showing matched pledge ID and lending institution MSP.
     - If unique: Displays Emerald Success Badge ("Collateral Unique Across Consortium").
  4. Provide "Attach to Borrower Search" button passing the fingerprint into the search flow.

---

### Phase 6: Hyperledger Fabric Pledge Lifecycle Management
- **Objective:** Register new active pledges on Fabric and manage existing institution pledges (list, view details, close pledge).
- **Endpoints:**
  - `POST /api/pledges`
  - `POST /api/pledges/{pledge_id}/close`
  - `GET /api/pledges/my`
  - `GET /api/pledges/{pledge_id}`
- **Tasks:**
  1. Build `RegisterPledgeModal` (Bottom Sheet):
     - Inputs: Borrower hash (pre-filled), Gold fingerprint, Rupee loan amount with live mapping to amount range bucket (0–4 per PRD §11.2):
       - `0`: ₹0–₹50K
       - `1`: ₹50K–₹1L
       - `2`: ₹1L–₹2L
       - `3`: ₹2L–₹5L
       - `4`: ₹5L+
     - Submits to `POST /api/pledges`.
     - Displays confirmation card showing new Pledge ID and Fabric Transaction Hash with one-tap copy.
  2. Build `MyPledgesScreen` (`lib/features/pledges/`):
     - Filter tabs: `ALL`, `ACTIVE`, `CLOSED`.
     - Pull-to-refresh list displaying Pledge ID, Amount Range, Created Date, Status Badge, and Transaction Hash.
     - **Close Pledge Action:** Tap "Close Pledge" on active rows → confirmation dialog → `POST /api/pledges/{pledge_id}/close` → updates row status to `CLOSED` with closure tx hash.

---

### Phase 7: Institutional Fraud Alerts Feed
- **Objective:** Real-time visibility into high-risk borrower velocity bursts and collateral re-pledge attempts across consortium members.
- **Endpoints:**
  - `GET /api/alerts`
  - `POST /api/alerts/{id}/review`
- **Tasks:**
  1. Build `AlertsScreen` (`lib/features/alerts/`):
     - Filter chips: `ALL`, `VELOCITY`, `GOLD_MATCH`, `HIGH_EXPOSURE`, and Risk Level (`HIGH`, `MEDIUM`).
     - Alert Cards displaying:
       - Type icon (⚡ Velocity, 🥇 Gold Match, 🚨 High Exposure).
       - Risk score badge (e.g. `Score 85 • HIGH`).
       - Explanation text.
       - Borrower commitment snippet and gold fingerprint snippet.
       - Creation timestamp.
  2. Implement "Mark as Reviewed" action:
     - Submits `POST /api/alerts/{id}/review`.
     - Optimistically updates status to `acknowledged`.

---

### Phase 8: Zero-Knowledge Exposure Proof Demo
- **Objective:** Mobile demonstration of proving that borrower exposure is strictly below a lender threshold without revealing the rupee total or active loan count.
- **Endpoints:**
  - `POST /api/zk/prove-exposure`
- **Tasks:**
  1. Build `ZkProofScreen` (`lib/features/zk_proof/`):
     - Educational panel explaining cryptographic zero-knowledge verification (`total_exposure < threshold`).
     - Threshold selector dropdown/segmented button (Buckets 2, 3, 4, 5).
     - "Generate ZK Proof" trigger button with loading shimmer/pulse animation.
     - Proof verification card:
       - Verified Checkmark (`Zero-Knowledge Proof Verified`).
       - Mode badge (`Live Barretenberg Proof` or `Pre-generated Demo Artifact` per Decision 13).
       - Public threshold value.
       - Proof hex byte snippet with one-tap copy button.

---

### Phase 9: Admin Console, Settings & Diagnostics
- **Objective:** Platform oversight for `Org1MSP` and diagnostics for switching network hosts.
- **Endpoints:**
  - `GET /api/admin/stats`
  - `GET /api/admin/lenders`
  - `PATCH /api/admin/lenders/{id}`
  - `GET /health`
- **Tasks:**
  1. Build `AdminScreen` (`lib/features/admin/`):
     - Guarded by `lender.is_admin == true` (`Org1MSP`). Non-admin users are locked out.
     - Platform statistics: Total Pledges, Active Pledges, Consortium Queries Today, Open Alerts.
     - Lenders Table: Member organizations, MSP ID, Status badge, and switch toggle calling `PATCH /api/admin/lenders/{id}` to activate/deactivate members.
  2. Build `SettingsScreen` (`lib/features/settings/`):
     - Base URL Switcher with immediate persistence.
     - Live `/health` diagnostic ping showing Backend status, Fabric status, and Redis status.
     - Current Institution details, Public Key Fingerprint copy, and Logout CTA.

---

## 5. Concurrent Execution & Step-by-Step Runbook

Follow these exact steps to run the **Next.js Web Portal**, the **FastAPI Backend**, and the **Flutter Mobile App** concurrently:

```powershell
# ==============================================================================
# STEP 1: START INFRASTRUCTURE & BACKEND (Terminal 1)
# ==============================================================================
cd "e:\Verigold cloned\VeriGold"

# Start Docker containers (PostgreSQL, Redis, Fabric Gateway)
docker compose up -d

# Seed the demo dataset (Scenarios A/B/C/D)
cd backend
python -m app.scripts.seed_demo_data

# Start FastAPI dev server (listening on 0.0.0.0 so emulators can connect)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# ==============================================================================
# STEP 2: START WEB APPLICATION (Terminal 2)
# ==============================================================================
cd "e:\Verigold cloned\VeriGold\frontend"
npm run dev
# Web app is live at: http://localhost:3000

# ==============================================================================
# STEP 3: CREATE & RUN FLUTTER MOBILE APP (Terminal 3)
# ==============================================================================
cd "e:\Verigold cloned"
# Create Flutter project in sibling directory
flutter create --org com.verigold.app verigold_mobile
cd verigold_mobile

# Add dependencies from Section 3
flutter pub get

# Launch on Android Emulator or Connected Device
flutter run
```

---

## 6. End-to-End Verification & Acceptance Test Suite

Execute this verification script to ensure full parity between Web and Mobile:

| Test ID | Test Action | Expected Result | Parity Check |
|---|---|---|---|
| **TC-01** | Login as `Org1MSP` on Mobile | Ed25519 signature verified, JWT issued, Dashboard loads stats | Matches Web Auth flow |
| **TC-02** | Search Scenario C (`333333333333`) on Mobile | Score ≥ 70, HIGH risk badge, Velocity alert, REJECT recommendation | Identical risk score and LLM rationale on Web |
| **TC-03** | Gold Appraisal Scenario D on Mobile | Take photo, submit 22.5g / 91.6% Bangle → Match Found alert | Triggers same collateral duplicate flag as Web |
| **TC-04** | Register Pledge for Scenario A on Mobile | Fabric tx hash generated, pledge appears in `My Pledges` | **Instantly visible in Web My Pledges table** |
| **TC-05** | Close Pledge on Web portal | Pledge closed on Web | **Instantly reflects as CLOSED on Mobile upon refresh** |
| **TC-06** | Generate ZK Proof on Mobile | Threshold bucket 4 → Verified status, proof hex snippet | Matches Web ZK demo |
| **TC-07** | Admin toggle on Mobile as `Org1MSP` | Deactivate `Org2MSP` | `Org2MSP` is blocked on both Web and Mobile |
