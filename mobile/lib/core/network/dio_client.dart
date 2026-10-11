import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';
import 'mock_backend_interceptor.dart';

class DioClient {
  static Dio? _dioInstance;
  static const _storage = FlutterSecureStorage();
  static bool isDemoMode = true; // Enabled by default for seamless standalone execution

  static void setDemoMode(bool enabled) {
    isDemoMode = enabled;
    reset();
  }

  static Future<Dio> getInstance() async {
    if (_dioInstance != null) return _dioInstance!;

    final baseUrl = await AppConfig.getBaseUrl();
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // If Demo Sandbox is enabled, prioritize MockBackendInterceptor
    if (isDemoMode) {
      dio.interceptors.add(MockBackendInterceptor());
    }

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
            // Expired or invalid session — discard token
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

  /// Extracts clean user-facing error message from backend response
  static String formatError(dynamic error) {
    if (error is DioException) {
      final status = error.response?.statusCode;
      if (status == 401) {
        return 'Session expired. Please re-authorize your institutional key.';
      }
      if (status == 429) {
        return 'Rate limit exceeded (Max 10 searches per 60s). Please wait before retrying.';
      }
      if (status == 503) {
        return 'Hyperledger Fabric or Risk Engine unavailable. No data has been fabricated.';
      }

      final data = error.response?.data;
      if (data is Map && data.containsKey('detail')) {
        final detail = data['detail'];
        if (detail is String) return detail;
        if (detail is List && detail.isNotEmpty) {
          final first = detail[0];
          if (first is Map && first.containsKey('msg')) return first['msg'].toString();
        }
        return detail.toString();
      }

      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Connection timeout reaching VeriGold backend. Check server status.';
      }

      if (error.type == DioExceptionType.connectionError) {
        return 'Unable to reach VeriGold backend at localhost:8000. Switch to Demo Mode in Settings or click Explore Demo.';
      }
    }
    return error.toString();
  }
}
