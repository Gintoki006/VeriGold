# VeriGold Mobile — Complete Flutter Implementation & Coding Guide

**Document:** Complete Flutter Developer Implementation Manual  
**Version:** 1.0 (Code-Complete)  
**Target Repository / Directory:** `verigold_mobile/` (create as a sibling directory next to `VeriGold/`)  
**Companion Documents:**
- [`PRD.md`](file:///e:/Verigold%20cloned/VeriGold/PRD.md)
- [`techstack.md`](file:///e:/Verigold%20cloned/VeriGold/techstack.md)
- [`README.md`](file:///e:/Verigold%20cloned/VeriGold/README.md)
- [`docs/api.md`](file:///e:/Verigold%20cloned/VeriGold/docs/api.md)
- [`docs/decisions.md`](file:///e:/Verigold%20cloned/VeriGold/docs/decisions.md)
- [`docs/demo.md`](file:///e:/Verigold%20cloned/VeriGold/docs/demo.md)
- [`docs/MOBILE_APP_IMPLEMENTATION_PLAN.md`](file:///e:/Verigold%20cloned/VeriGold/docs/MOBILE_APP_IMPLEMENTATION_PLAN.md)

---

## 1. Quick Start: Project Creation & Setup

Run these commands in your shell outside the `VeriGold` directory (e.g. in `e:\Verigold cloned`):

```bash
# 1. Initialize Flutter Project
flutter create --org com.verigold.app --platforms android,ios verigold_mobile
cd verigold_mobile

# 2. Create Directory Skeleton
mkdir -p lib/core/config lib/core/constants lib/core/network lib/core/security lib/core/theme lib/core/utils
mkdir -p lib/features/auth lib/features/dashboard lib/features/borrower_search lib/features/risk_report
mkdir -p lib/features/gold_appraisal lib/features/pledges lib/features/alerts lib/features/zk_proof lib/features/admin lib/features/settings
mkdir -p lib/shared/models lib/shared/widgets lib/shared/providers
```

---

## 2. Configuration Files

### 2.1 `pubspec.yaml`

Replace `pubspec.yaml` with the following:

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

  # State Management
  flutter_riverpod: ^2.5.1

  # Networking & HTTP
  dio: ^5.4.3+1

  # Secure Storage & Persistence
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.3

  # Cryptography (Ed25519 & Local Hashing)
  cryptography: ^2.7.1
  crypto: ^3.0.3

  # UI, Icons, Typography
  google_fonts: ^6.2.1
  lucide_icons: ^0.354.0
  flutter_animate: ^4.5.0
  shimmer: ^3.0.0

  # Hardware: Camera & Photo Selection
  image_picker: ^1.1.0

  # Formatting & IDs
  intl: ^0.19.0
  uuid: ^4.4.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
```

Run:
```bash
flutter pub get
```

---

### 2.2 Android Permissions & Cleartext HTTP (`android/app/src/main/AndroidManifest.xml`)

Open `android/app/src/main/AndroidManifest.xml`. Add Internet and Camera permissions above `<application>`, and enable `usesCleartextTraffic="true"` inside `<application>` for local development HTTP requests:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.CAMERA"/>

    <application
        android:label="VeriGold"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
```

---

### 2.3 iOS Camera Permissions (`ios/Runner/Info.plist`)

Add the following keys inside `<dict>` in `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>VeriGold requires camera access to photograph physical gold items for tamper-evident fingerprinting.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>VeriGold requires gallery access to attach gold item photos for appraisal verification.</string>
```

---

## 3. Core Architecture Code

### 3.1 App Configuration & Network Switcher (`lib/core/config/app_config.dart`)

```dart
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static const String _kBaseUrlKey = 'vg_api_base_url';

  // Default network loopback based on platform
  static String get defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000'; // Android emulator host alias
    }
    return 'http://127.0.0.1:8000'; // iOS simulator / Desktop
  }

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kBaseUrlKey) ?? defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kBaseUrlKey, url.trim());
  }
}
```

---

### 3.2 Dark Sovereign Luxury Theme (`lib/core/theme/app_theme.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const Color background = Color(0xFF0B0F17); // Obsidian black
  static const Color surface    = Color(0xFF111827); // Dark slate
  static const Color card       = Color(0xFF161F30); // Elevated glass card
  static const Color border     = Color(0xFF1F293D); // Border outline

  static const Color gold       = Color(0xFFD4AF37); // Sovereign Gold Primary
  static const Color goldLight  = Color(0xFFF3E5AB);
  static const Color goldDark   = Color(0xFF996515);

  static const Color success    = Color(0xFF10B981); // Emerald (Low risk / Approve)
  static const Color warning    = Color(0xFFF59E0B); // Amber (Med risk / Reduce)
  static const Color danger     = Color(0xFFEF4444); // Crimson (High risk / Reject)

  static const Color textMain   = Color(0xFFF9FAFB);
  static const Color textMuted  = Color(0xFF9CA3AF);
  static const Color textFaint  = Color(0xFF6B7280);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.gold,
      cardColor: AppColors.card,
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: AppColors.textMain,
        displayColor: AppColors.textMain,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.gold),
        titleTextStyle: TextStyle(
          color: AppColors.textMain,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.gold,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
    );
  }
}
```

---

### 3.3 HTTP Networking & Interceptors (`lib/core/network/dio_client.dart`)

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class DioClient {
  static Dio? _dioInstance;
  static const _storage = FlutterSecureStorage();

  static Future<Dio> getInstance() async {
    if (_dioInstance != null) return _dioInstance!;

    final baseUrl = await AppConfig.getBaseUrl();
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 25),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'vg_access_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          final status = error.response?.statusCode;
          if (status == 401) {
            // Token expired or invalid — clear session
            await _storage.delete(key: 'vg_access_token');
          }
          return handler.next(error);
        },
      ),
    );

    _dioInstance = dio;
    return dio;
  }

  static void reset() {
    _dioInstance = null;
  }
}
```

---

### 3.4 Cryptography & Key Management (`lib/core/security/key_manager.dart`)

Implements client-side Ed25519 keypair generation and signing matching the web portal's `tweetnacl`:

```dart
import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class KeyManager {
  static const _storage = FlutterSecureStorage();
  static const _kPrivKey = 'vg_signing_key_bytes';
  static const _kPubKey  = 'vg_public_key_b64';

  static final _algorithm = Ed25519();

  /// Retrieves or generates a persistent Ed25519 KeyPair
  static Future<SimpleKeyPair> getOrCreateKeyPair() async {
    final existingPriv = await _storage.read(key: _kPrivKey);
    if (existingPriv != null) {
      final privBytes = base64Decode(existingPriv);
      return _algorithm.newKeyPairFromSeed(privBytes);
    }

    final keyPair = await _algorithm.newKeyPair();
    final privBytes = await keyPair.extractPrivateKeyBytes();
    final pubKey = await keyPair.extractPublicKey();

    await _storage.write(key: _kPrivKey, value: base64Encode(privBytes));
    await _storage.write(key: _kPubKey,  value: base64Encode(pubKey.bytes));

    return keyPair;
  }

  /// Exports the public key Base64 string for auth challenge/verification
  static Future<String> getPublicKeyBase64() async {
    final keyPair = await getOrCreateKeyPair();
    final pubKey = await keyPair.extractPublicKey();
    return base64Encode(pubKey.bytes);
  }

  /// Signs the challenge nonce issued by the FastAPI backend
  static Future<String> signChallenge(String nonceOrMessage) async {
    final keyPair = await getOrCreateKeyPair();
    final messageStr = nonceOrMessage.startsWith('Sign this to authenticate with VeriGold:')
        ? nonceOrMessage
        : 'Sign this to authenticate with VeriGold: $nonceOrMessage';

    final messageBytes = utf8.encode(messageStr);
    final signature = await _algorithm.sign(messageBytes, keyPair: keyPair);
    return base64Encode(signature.bytes);
  }

  /// Client-side 12-digit Aadhaar input validator
  static String? validateAadhaar(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 12) {
      return 'Aadhaar must contain exactly 12 numeric digits.';
    }
    return null;
  }
}
```

---

## 4. Shared Models & Data Entities

### 4.1 Lender Profile (`lib/shared/models/lender.dart`)

```dart
class Lender {
  final int id;
  final String mspId;
  final String organizationName;
  final bool isAdmin;

  Lender({
    required this.id,
    required this.mspId,
    required this.organizationName,
    required this.isAdmin,
  });

  factory Lender.fromJson(Map<String, dynamic> json) {
    return Lender(
      id: json['id'] ?? 1,
      mspId: json['fabric_msp_id'] ?? json['msp_id'] ?? 'Org1MSP',
      organizationName: json['organization_name'] ?? json['org_name'] ?? 'Demo Lender',
      isAdmin: json['is_admin'] ?? (json['fabric_msp_id'] == 'Org1MSP'),
    );
  }
}
```

---

### 4.2 Risk Assessment Report (`lib/shared/models/borrower_risk.dart`)

```dart
class BorrowerRiskReport {
  final int riskScore;
  final String riskLevel; // LOW, MEDIUM, HIGH
  final int activePledgeCount;
  final String exposureRange;
  final bool velocityFlagged;
  final bool goldMatch;
  final String recommendation; // APPROVE, REDUCE_AMOUNT, REJECT
  final List<String> explanation;
  final String? llmReasoning;

  BorrowerRiskReport({
    required this.riskScore,
    required this.riskLevel,
    required this.activePledgeCount,
    required this.exposureRange,
    required this.velocityFlagged,
    required this.goldMatch,
    required this.recommendation,
    required this.explanation,
    this.llmReasoning,
  });

  factory BorrowerRiskReport.fromJson(Map<String, dynamic> json) {
    return BorrowerRiskReport(
      riskScore: json['risk_score'] ?? 0,
      riskLevel: (json['risk_level'] ?? 'LOW').toString().toUpperCase(),
      activePledgeCount: json['active_pledge_count'] ?? 0,
      exposureRange: json['exposure_range'] ?? '₹0–₹50K',
      velocityFlagged: json['velocity_flagged'] ?? false,
      goldMatch: json['gold_match'] ?? false,
      recommendation: json['recommendation'] ?? 'APPROVE',
      explanation: List<String>.from(json['explanation'] ?? []),
      llmReasoning: json['llm_reasoning'],
    );
  }
}
```

---

### 4.3 Pledge Entity (`lib/shared/models/pledge.dart`)

```dart
class Pledge {
  final String id;
  final String borrowerHash;
  final String goldFingerprint;
  final int amountRange;
  final String status; // ACTIVE, CLOSED
  final String transactionHash;
  final DateTime createdAt;
  final DateTime? closedAt;

  Pledge({
    required this.id,
    required this.borrowerHash,
    required this.goldFingerprint,
    required this.amountRange,
    required this.status,
    required this.transactionHash,
    required this.createdAt,
    this.closedAt,
  });

  factory Pledge.fromJson(Map<String, dynamic> json) {
    return Pledge(
      id: json['pledge_id'] ?? json['id'] ?? '',
      borrowerHash: json['borrower_hash'] ?? '',
      goldFingerprint: json['gold_fingerprint'] ?? '',
      amountRange: json['amount_range'] ?? 0,
      status: (json['status'] ?? 'ACTIVE').toString().toUpperCase(),
      transactionHash: json['transaction_hash'] ?? json['tx_hash'] ?? '',
      createdAt: DateTime.parse(json['created_at']),
      closedAt: json['closed_at'] != null ? DateTime.parse(json['closed_at']) : null,
    );
  }
}
```

---

## 5. State Management & Riverpod Providers

### 5.1 Authentication Provider (`lib/shared/providers/auth_provider.dart`)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/network/dio_client.dart';
import '../../core/security/key_manager.dart';
import '../models/lender.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
  final Lender? currentLender;
  final String selectedMsp;

  AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
    this.currentLender,
    this.selectedMsp = 'Org1MSP',
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
    Lender? currentLender,
    String? selectedMsp,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      currentLender: currentLender ?? this.currentLender,
      selectedMsp: selectedMsp ?? this.selectedMsp,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState()) {
    checkSession();
  }

  static const _storage = FlutterSecureStorage();

  void setSelectedMsp(String mspId) {
    state = state.copyWith(selectedMsp: mspId);
  }

  Future<void> checkSession() async {
    final token = await _storage.read(key: 'vg_access_token');
    if (token == null) return;

    try {
      final dio = await DioClient.getInstance();
      final res = await dio.get('/api/auth/me');
      state = state.copyWith(
        isAuthenticated: true,
        currentLender: Lender.fromJson(res.data),
      );
    } catch (_) {
      await _storage.delete(key: 'vg_access_token');
      state = state.copyWith(isAuthenticated: false, currentLender: null);
    }
  }

  Future<void> login(String bankMspId) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final pubKeyB64 = await KeyManager.getPublicKeyBase64();
      final dio = await DioClient.getInstance();

      // Step 1: Challenge Nonce
      final challengeRes = await dio.post('/api/auth/challenge', data: {
        'public_key': pubKeyB64,
        'identity_ref': pubKeyB64,
      });

      final challengeId = challengeRes.data['challenge_id'];
      final nonce = challengeRes.data['nonce'];

      // Step 2: Sign Challenge Nonce
      final signature = await KeyManager.signChallenge(nonce);

      // Step 3: Verify & Issue JWT
      final verifyRes = await dio.post('/api/auth/verify', data: {
        'challenge_id': challengeId,
        'signature': signature,
        'public_key': pubKeyB64,
        'identity_ref': pubKeyB64,
        'msp_id': bankMspId,
      });

      final token = verifyRes.data['access_token'];
      final lenderData = verifyRes.data['lender'];

      await _storage.write(key: 'vg_access_token', value: token);

      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        currentLender: Lender.fromJson(lenderData),
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'vg_access_token');
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
```

---

## 6. User Interface Screens

### 6.1 Authentication Screen (`lib/features/auth/auth_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/auth_provider.dart';

class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key});

  static const institutions = [
    {'msp': 'Org1MSP', 'name': 'Shri Lakshmi Finance Ltd', 'role': 'Org 1 • Primary / Admin', 'icon': '🏛️'},
    {'msp': 'Org2MSP', 'name': 'Sunrise Gold Loans',       'role': 'Org 2 • Member Bank',      'icon': '🏦'},
    {'msp': 'Org3MSP', 'name': 'Muthoot Quick Gold',       'role': 'Org 3 • Member Bank',      'icon': '🪙'},
    {'msp': 'Org4MSP', 'name': 'Manappuram Finance Ltd',   'role': 'Org 4 • Member Bank',      'icon': '🏢'},
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              // Brand Logo Header
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Icon(LucideIcons.shieldCheck, color: AppColors.gold, size: 36),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'VeriGold Mobile',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textMain),
              ),
              const SizedBox(height: 6),
              const Text(
                'Cross-Lender Privacy Registry for Gold Loans',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 32),

              const Text(
                'SELECT LENDING INSTITUTION',
                style: TextStyle(color: AppColors.gold, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.1),
              ),
              const SizedBox(height: 12),

              Expanded(
                child: ListView.separated(
                  itemCount: institutions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final inst = institutions[index];
                    final isSelected = authState.selectedMsp == inst['msp'];

                    return InkWell(
                      onTap: () => ref.read(authProvider.notifier).setSelectedMsp(inst['msp']!),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.card : AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppColors.gold : AppColors.border,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Text(inst['icon']!, style: const TextStyle(fontSize: 24)),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    inst['name']!,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    inst['role']!,
                                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            if (isSelected)
                              const Icon(LucideIcons.checkCircle2, color: AppColors.gold, size: 20),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              if (authState.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.danger),
                  ),
                  child: Text(
                    authState.error!,
                    style: const TextStyle(color: AppColors.danger, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // One-Tap Cryptographic Login Button
              ElevatedButton.icon(
                onPressed: authState.isLoading
                    ? null
                    : () => ref.read(authProvider.notifier).login(authState.selectedMsp),
                icon: authState.isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                      )
                    : const Icon(LucideIcons.keyRound, color: Colors.black),
                label: Text(
                  authState.isLoading ? 'Signing & Authorizing...' : 'Connect & Authorize Session',
                  style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 15),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

### 6.2 Executive Dashboard (`lib/features/dashboard/dashboard_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/auth_provider.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key, required this.onNavigateSearch});
  final Function(String aadhaar) onNavigateSearch;

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  Map<String, dynamic>? stats;
  List<dynamic> recentQueries = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadDashboardData();
  }

  Future<void> loadDashboardData() async {
    setState(() => isLoading = true);
    try {
      final dio = await DioClient.getInstance();
      final statsRes = await dio.get('/api/dashboard/stats');
      final queriesRes = await dio.get('/api/borrowers/search-history?limit=5');

      setState(() {
        stats = statsRes.data;
        recentQueries = queriesRes.data['queries'] ?? [];
        isLoading = false;
      });
    } catch (_) {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lender = ref.watch(authProvider).currentLender;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('VeriGold Registry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(
              lender?.organizationName ?? 'Demo Lender',
              style: const TextStyle(color: AppColors.gold, fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: loadDashboardData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: loadDashboardData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Top Summary Cards
            Row(
              children: [
                _buildStatCard('Queries Today', '${stats?['queries_today'] ?? 0}', LucideIcons.search, AppColors.gold),
                const SizedBox(width: 10),
                _buildStatCard('Active Pledges', '${stats?['my_active_pledges'] ?? 0}', LucideIcons.shield, AppColors.success),
                const SizedBox(width: 10),
                _buildStatCard('Fraud Alerts', '${stats?['open_high_risk_alerts'] ?? 0}', LucideIcons.alertTriangle, AppColors.danger),
              ],
            ),
            const SizedBox(height: 24),

            // Demo Shortcut Panel
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.zap, color: AppColors.gold, size: 16),
                      SizedBox(width: 8),
                      Text('HACKATHON DEMO SHORTCUTS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.gold)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildShortcutChip('Scenario A (Clean)', '111111111111', AppColors.success),
                      _buildShortcutChip('Scenario B (Moderate)', '222222222222', AppColors.warning),
                      _buildShortcutChip('Scenario C (Velocity)', '333333333333', AppColors.danger),
                      _buildShortcutChip('Scenario D (Gold Match)', '444444444444', AppColors.danger),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'RECENT BORROWER EVALUATIONS',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),

            if (isLoading)
              const Center(child: CircularProgressIndicator(color: AppColors.gold))
            else if (recentQueries.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Center(
                  child: Text('No searches recorded yet.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...recentQueries.map((q) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Commitment: ${(q['borrower_hash'] as String).substring(0, 16)}...',
                              style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: AppColors.textMain),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Decision: ${q['recommendation'] ?? 'REVIEW'}',
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                        _buildRiskBadge(q['risk_level'] ?? 'LOW'),
                      ],
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _buildShortcutChip(String label, String aadhaar, Color color) {
    return ActionChip(
      backgroundColor: color.withOpacity(0.12),
      side: BorderSide(color: color),
      label: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      onPressed: () => widget.onNavigateSearch(aadhaar),
    );
  }

  Widget _buildRiskBadge(String level) {
    final color = level == 'HIGH' ? AppColors.danger : (level == 'MEDIUM' ? AppColors.warning : AppColors.success);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color),
      ),
      child: Text(level, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}
```

---

### 6.3 Privacy-Preserving Borrower Search & Risk Assessment (`lib/features/borrower_search/borrower_search_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/borrower_risk.dart';

class BorrowerSearchScreen extends StatefulWidget {
  const BorrowerSearchScreen({super.key, this.initialAadhaar});
  final String? initialAadhaar;

  @override
  State<BorrowerSearchScreen> createState() => _BorrowerSearchScreenState();
}

class _BorrowerSearchScreenState extends State<BorrowerSearchScreen> {
  final _controller = TextEditingController();
  bool _searching = false;
  String? _error;
  BorrowerRiskReport? _report;
  String? _computedHash;

  @override
  void initState() {
    super.initState();
    if (widget.initialAadhaar != null) {
      _controller.text = widget.initialAadhaar!;
      _performSearch();
    }
  }

  Future<void> _performSearch() async {
    final aadhaar = _controller.text.replaceAll(RegExp(r'\D'), '');
    if (aadhaar.length != 12) {
      setState(() => _error = 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setState(() {
      _searching = true;
      _error = null;
      _report = null;
    });

    try {
      final dio = await DioClient.getInstance();

      // Step 1: Compute HMAC-SHA256 commitment (plaintext Aadhaar never logged)
      final hashRes = await dio.post('/api/borrowers/compute-hash', data: {'aadhaar': aadhaar});
      final bHash = hashRes.data['borrower_hash'];

      // Step 2: Query Fabric ledger & Risk Engine
      final searchRes = await dio.post('/api/borrowers/search', data: {'borrower_hash': bHash});

      setState(() {
        _computedHash = bHash;
        _report = BorrowerRiskReport.fromJson(searchRes.data);
        _searching = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _searching = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Borrower Risk Assessment')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Input Form
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Borrower Aadhaar Number', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                TextField(
                  controller: _controller,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter 12-digit synthetic test number',
                    hintStyle: const TextStyle(color: AppColors.textFaint, fontSize: 13),
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
                  ),
                ),
                const SizedBox(height: 6),
                const Text('🔒 Plaintext Aadhaar is hashed locally and never stored.', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _searching ? null : _performSearch,
                  icon: _searching
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(LucideIcons.search, color: Colors.black, size: 18),
                  label: Text(_searching ? 'Evaluating Ledger...' : 'Evaluate Borrower Risk', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.15), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.danger)),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
            ),

          if (_report != null) ...[
            // Risk Report Results Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Text('RISK LEVEL: ${_report!.riskLevel}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _getRiskColor(_report!.riskLevel))),
                  const SizedBox(height: 12),
                  // Score Display
                  Text('${_report!.riskScore}', style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: _getRiskColor(_report!.riskLevel))),
                  const Text('Out of 100 Risk Index', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  const SizedBox(height: 16),

                  // Recommendation Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _getRiskColor(_report!.riskLevel).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _getRiskColor(_report!.riskLevel)),
                    ),
                    child: Text('ACTION: ${_report!.recommendation}', textAlign: TextAlign.center, style: TextStyle(color: _getRiskColor(_report!.riskLevel), fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 16),

                  // Factor Badges
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildFactor('Active Pledges', '${_report!.activePledgeCount}'),
                      _buildFactor('Exposure', _report!.exposureRange),
                      _buildFactor('Velocity Flag', _report!.velocityFlagged ? 'YES ⚡' : 'NO'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI Narrative Card
            if (_report!.llmReasoning != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.sparkles, color: AppColors.gold, size: 16),
                        SizedBox(width: 8),
                        Text('GEMINI AI ADVISORY NARRATIVE', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(_report!.llmReasoning!, style: const TextStyle(fontSize: 13, height: 1.4)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  Color _getRiskColor(String level) {
    if (level == 'HIGH') return AppColors.danger;
    if (level == 'MEDIUM') return AppColors.warning;
    return AppColors.success;
  }

  Widget _buildFactor(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }
}
```

---

### 6.4 Zero-Knowledge Exposure Proof Demo (`lib/features/zk_proof/zk_proof_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';

class ZkProofScreen extends StatefulWidget {
  const ZkProofScreen({super.key});

  @override
  State<ZkProofScreen> createState() => _ZkProofScreenState();
}

class _ZkProofScreenState extends State<ZkProofScreen> {
  int _threshold = 5;
  bool _proving = false;
  Map<String, dynamic>? _proofResult;
  String? _error;

  Future<void> _generateProof() async {
    setState(() {
      _proving = true;
      _error = null;
      _proofResult = null;
    });

    try {
      final dio = await DioClient.getInstance();
      final res = await dio.post('/api/zk/prove-exposure', data: {
        'total_exposure': _threshold - 1,
        'threshold': _threshold,
      });

      setState(() {
        _proofResult = res.data;
        _proving = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _proving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Zero-Knowledge Exposure Proof')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.lock, color: AppColors.gold, size: 18),
                    SizedBox(width: 8),
                    Text('Cryptographic Exposure Policy', style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Proves that borrower collateral exposure is strictly below your institutional policy threshold without disclosing the exact amount to competitors.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 16),
                const Text('Maximum Acceptable Exposure Bucket', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                DropdownButtonFormField<int>(
                  value: _threshold,
                  dropdownColor: AppColors.surface,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: AppColors.border)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 2, child: Text('Bucket 2 (Up to 2 Pledges)')),
                    DropdownMenuItem(value: 3, child: Text('Bucket 3 (Up to 3 Pledges)')),
                    DropdownMenuItem(value: 4, child: Text('Bucket 4 (Up to 4 Pledges)')),
                    DropdownMenuItem(value: 5, child: Text('Bucket 5 (Institutional Max)')),
                  ],
                  onChanged: (val) => setState(() => _threshold = val!),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _proving ? null : _generateProof,
                  icon: _proving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(LucideIcons.cpu, color: Colors.black, size: 18),
                  label: Text(_proving ? 'Generating Noir Proof...' : 'Generate & Verify ZK Proof', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.15), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.danger)),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
            ),

          if (_proofResult != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.success),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.checkCircle2, color: AppColors.success, size: 24),
                      SizedBox(width: 10),
                      Text('Proof Verified', style: TextStyle(color: AppColors.success, fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Mode: ${_proofResult!['mode'] == 'fallback' ? 'Pre-generated demo artifact' : 'Live Barretenberg proof'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  const Divider(color: AppColors.border, height: 24),
                  const Text('Statement: total_exposure < threshold', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    'Proof Bytes: ${(_proofResult!['proof'] as String).substring(0, 32)}...',
                    style: const TextStyle(fontFamily: 'monospace', color: AppColors.gold, fontSize: 12),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
```

---

### 6.5 Main Navigation Shell (`lib/main.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'core/theme/app_theme.dart';
import 'shared/providers/auth_provider.dart';
import 'features/auth/auth_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/borrower_search/borrower_search_screen.dart';
import 'features/zk_proof/zk_proof_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: VeriGoldApp()));
}

class VeriGoldApp extends ConsumerWidget {
  const VeriGoldApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'VeriGold Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: authState.isAuthenticated ? const AppShell() : const AuthScreen(),
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;
  String? _prefilledAadhaar;

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(
        onNavigateSearch: (aadhaar) {
          setState(() {
            _prefilledAadhaar = aadhaar;
            _currentIndex = 1;
          });
        },
      ),
      BorrowerSearchScreen(initialAadhaar: _prefilledAadhaar),
      const ZkProofScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() {
          _prefilledAadhaar = null;
          _currentIndex = index;
        }),
        items: const [
          BottomNavigationBarItem(icon: Icon(LucideIcons.layoutDashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.search), label: 'Search'),
          BottomNavigationBarItem(icon: Icon(LucideIcons.lock), label: 'ZK Proof'),
        ],
      ),
    );
  }
}
```

---

## 7. Execution Commands: Running Web & Mobile Alongside

```bash
# Terminal 1: Run Backend & Local Ledger
cd "e:\Verigold cloned\VeriGold\backend"
python -m app.scripts.seed_demo_data
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Run Web Portal
cd "e:\Verigold cloned\VeriGold\frontend"
npm run dev

# Terminal 3: Run Mobile App (In your sibling verigold_mobile directory)
cd "e:\Verigold cloned\verigold_mobile"
flutter run
```
