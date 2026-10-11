import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/app_config.dart';
import '../../core/network/dio_client.dart';
import '../../core/security/key_manager.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/auth_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _urlController = TextEditingController();
  String _pubKeyFp = 'Loading...';
  String? _healthStatus;
  bool _testingHealth = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final url = await AppConfig.getBaseUrl();
    final fp = await KeyManager.getPublicKeyFingerprint();
    setState(() {
      _urlController.text = url;
      _pubKeyFp = fp;
    });
  }

  Future<void> _saveUrl() async {
    await AppConfig.setBaseUrl(_urlController.text);
    DioClient.reset();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backend Base URL saved!'), backgroundColor: AppColors.success),
      );
    }
  }

  Future<void> _testHealth() async {
    setState(() {
      _testingHealth = true;
      _healthStatus = null;
    });
    try {
      final dio = await DioClient.getInstance();
      final res = await dio.get('/health');
      setState(() {
        _healthStatus = '✅ Status: ${res.data['status']} | Redis: ${res.data['redis']} | Fabric: ${res.data['fabric']}';
        _testingHealth = false;
      });
    } catch (e) {
      setState(() {
        _healthStatus = '❌ Failed: ${DioClient.formatError(e)}';
        _testingHealth = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final lender = authState.currentLender;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings & Diagnostics')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Active Session Card
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
                const Text('ACTIVE LENDER SESSION', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 11)),
                const SizedBox(height: 10),
                Text(lender?.organizationName ?? 'Demo Lender', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text('MSP ID: ${lender?.mspId ?? 'Org1MSP'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(height: 6),
                Text('Key Fingerprint: $_pubKeyFp', style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.textFaint)),
              ],
            ),
          ),
          // Mode Toggle Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'DEMO SANDBOX MODE',
                        style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        DioClient.isDemoMode
                            ? 'Active (Zero-backend standalone simulation)'
                            : 'Disabled (Connecting to Live FastAPI at port 8000)',
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: DioClient.isDemoMode,
                  activeThumbColor: AppColors.gold,
                  onChanged: (val) {
                    setState(() {
                      DioClient.setDemoMode(val);
                    });
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Backend Base URL Configuration
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
                const Text('BACKEND BASE URL', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 11)),
                const SizedBox(height: 8),
                TextField(
                  controller: _urlController,
                  decoration: const InputDecoration(hintText: 'http://10.0.2.2:8000 or http://localhost:8000'),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  children: [
                    ActionChip(
                      label: const Text('Android (10.0.2.2:8000)', style: TextStyle(fontSize: 10)),
                      onPressed: () {
                        _urlController.text = 'http://10.0.2.2:8000';
                        _saveUrl();
                      },
                    ),
                    ActionChip(
                      label: const Text('Localhost (:8000)', style: TextStyle(fontSize: 10)),
                      onPressed: () {
                        _urlController.text = 'http://localhost:8000';
                        _saveUrl();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _saveUrl,
                        icon: const Icon(Icons.save, size: 16, color: Colors.black),
                        label: const Text('Save URL', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.gold),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _testingHealth ? null : _testHealth,
                        icon: _testingHealth
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.favorite_border, size: 16, color: AppColors.gold),
                        label: const Text('Ping /health', style: TextStyle(color: AppColors.gold)),
                        style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.gold)),
                      ),
                    ),
                  ],
                ),
                if (_healthStatus != null) ...[
                  const SizedBox(height: 10),
                  Text(_healthStatus!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Logout Button
          ElevatedButton.icon(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout, color: Colors.white, size: 18),
            label: const Text('Logout Session', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}
