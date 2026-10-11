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

class AuthNotifier extends Notifier<AuthState> {
  static const _storage = FlutterSecureStorage();

  @override
  AuthState build() {
    Future.microtask(() => checkSession());
    return AuthState();
  }

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

  Future<void> login(String bankMspId, {bool demo = false}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      if (demo) {
        DioClient.setDemoMode(true);
      }
      final pubKeyB64 = await KeyManager.getPublicKeyBase64();
      final dio = await DioClient.getInstance();

      // Step 1: Request Challenge Nonce
      final challengeRes = await dio.post('/api/auth/challenge', data: {
        'public_key': pubKeyB64,
        'identity_ref': pubKeyB64,
      });

      final challengeId = challengeRes.data['challenge_id'] ?? challengeRes.data['nonce'];
      final nonce = challengeRes.data['nonce'] ?? challengeRes.data['challenge'] ?? '';

      // Step 2: Detached Cryptographic Signing
      final signature = await KeyManager.signChallenge(nonce);

      // Step 3: Verify Signature & Issue JWT Session
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
      state = state.copyWith(
        isLoading: false,
        error: DioClient.formatError(e),
      );
    }
  }

  Future<void> loginDemo([String? mspId]) async {
    await login(mspId ?? state.selectedMsp, demo: true);
  }

  Future<void> logout() async {
    try {
      final dio = await DioClient.getInstance();
      await dio.post('/api/auth/logout');
    } catch (_) {}
    await _storage.delete(key: 'vg_access_token');
    state = AuthState();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
