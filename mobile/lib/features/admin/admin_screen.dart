import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/auth_provider.dart';

class AdminScreen extends ConsumerStatefulWidget {
  const AdminScreen({super.key});

  @override
  ConsumerState<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends ConsumerState<AdminScreen> {
  Map<String, dynamic>? _stats;
  List<dynamic> _lenders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    loadAdminData();
  }

  Future<void> loadAdminData() async {
    setState(() => _loading = true);
    try {
      final dio = await DioClient.getInstance();
      final statsRes = await dio.get('/api/admin/stats');
      final lendersRes = await dio.get('/api/admin/lenders');

      setState(() {
        _stats = statsRes.data;
        _lenders = lendersRes.data['lenders'] ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = DioClient.formatError(e);
        _loading = false;
      });
    }
  }

  Future<void> _toggleLender(int id, bool currentActive) async {
    try {
      final dio = await DioClient.getInstance();
      await dio.patch('/api/admin/lenders/$id', data: {'is_active': !currentActive});
      setState(() {
        _lenders = _lenders.map((l) {
          if (l['id'] == id) {
            return {...l, 'is_active': !currentActive};
          }
          return l;
        }).toList();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${DioClient.formatError(e)}'), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lender = ref.watch(authProvider).currentLender;
    if (lender?.isAdmin != true) {
      return Scaffold(
        appBar: AppBar(title: const Text('Admin Console')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Text(
              '🔒 Access Denied: Admin console is restricted to Org1MSP (Primary Consortium Admin).',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.danger, fontSize: 14),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Console (Org1MSP)'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: loadAdminData),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Platform Metrics
                    if (_stats != null) ...[
                      Row(
                        children: [
                          _buildStatCard('Total Pledges', '${_stats!['total_pledges'] ?? 0}'),
                          const SizedBox(width: 8),
                          _buildStatCard('Active Pledges', '${_stats!['active_pledges'] ?? 0}'),
                          const SizedBox(width: 8),
                          _buildStatCard('Queries Today', '${_stats!['queries_today'] ?? 0}'),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],

                    const Text(
                      'MEMBER LENDING INSTITUTIONS',
                      style: TextStyle(color: AppColors.gold, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                    const SizedBox(height: 10),

                    ..._lenders.map((l) {
                      final isActive = l['is_active'] ?? true;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
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
                                  Text(l['org_name'] ?? 'Lender', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(l['fabric_msp_id'] ?? 'OrgMSP', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                                ],
                              ),
                            ),
                            Switch(
                              value: isActive,
                              activeThumbColor: AppColors.gold,
                              onChanged: (_) => _toggleLender(l['id'], isActive),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
    );
  }

  Widget _buildStatCard(String title, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.gold)),
            const SizedBox(height: 4),
            Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
