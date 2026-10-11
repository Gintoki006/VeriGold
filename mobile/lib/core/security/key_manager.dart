import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class KeyManager {
  static const _storage = FlutterSecureStorage();
  static const _kPrivKeySeed = 'vg_signing_key_seed_b64';
  static const _kPubKeyB64   = 'vg_public_key_b64';

  static final _algorithm = Ed25519();

  /// Retrieves or generates a persistent Ed25519 KeyPair
  static Future<SimpleKeyPair> getOrCreateKeyPair() async {
    final existingSeed = await _storage.read(key: _kPrivKeySeed);
    if (existingSeed != null) {
      final seedBytes = base64Decode(existingSeed);
      return _algorithm.newKeyPairFromSeed(seedBytes);
    }

    // Generate fresh keypair
    final keyPair = await _algorithm.newKeyPair();
    final privBytes = await keyPair.extractPrivateKeyBytes();
    final pubKey = await keyPair.extractPublicKey();

    await _storage.write(key: _kPrivKeySeed, value: base64Encode(privBytes));
    await _storage.write(key: _kPubKeyB64,   value: base64Encode(pubKey.bytes));

    return keyPair;
  }

  /// Exports the public key as Base64 string for challenge authentication
  static Future<String> getPublicKeyBase64() async {
    final keyPair = await getOrCreateKeyPair();
    final pubKey = await keyPair.extractPublicKey();
    return base64Encode(pubKey.bytes);
  }

  /// Displays first 16 characters of Base64 public key as institutional identity fingerprint
  static Future<String> getPublicKeyFingerprint() async {
    final b64 = await getPublicKeyBase64();
    if (b64.length > 16) {
      return '${b64.substring(0, 16)}...';
    }
    return b64;
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
