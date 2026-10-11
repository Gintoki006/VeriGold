import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static const String _kBaseUrlKey = 'vg_api_base_url';

  /// Resolves the default backend endpoint based on current platform:
  /// - Web / Windows: http://localhost:8000
  /// - Android emulator: http://10.0.2.2:8000
  /// - iOS Simulator / macOS: http://127.0.0.1:8000
  static String get defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://127.0.0.1:8000';
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
