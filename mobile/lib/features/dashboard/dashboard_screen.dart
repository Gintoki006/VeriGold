import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/widgets/metric_card.dart';
import '../../shared/widgets/hash_pill_widget.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({
    super.key,
    required this.onNavigateSearch,
  });

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
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: loadDashboardData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: loadDashboardData,
        color: AppColors.gold,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Top Summary Row (Modular Metric Cards)
            Row(
              children: [
                MetricCard(
                  title: 'Queries Today',
                  value: '${stats?['queries_today'] ?? 0}',
                  icon: Icons.search,
                  accentColor: AppColors.gold,
                ),
                const SizedBox(width: 10),
                MetricCard(
                  title: 'Active Pledges',
                  value: '${stats?['my_active_pledges'] ?? 0}',
                  icon: Icons.shield_outlined,
                  accentColor: AppColors.success,
                ),
                const SizedBox(width: 10),
                MetricCard(
                  title: 'Fraud Alerts',
                  value: '${stats?['open_high_risk_alerts'] ?? 0}',
                  icon: Icons.warning_amber_rounded,
                  accentColor: AppColors.danger,
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Demo Shortcut Toolbar
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
                      Icon(Icons.bolt, color: AppColors.gold, size: 18),
                      SizedBox(width: 8),
                      Text('HACKATHON DEMO SHORTCUTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gold)),
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
              style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
            ),
            const SizedBox(height: 10),

            if (isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(color: AppColors.gold),
                ),
              )
            else if (recentQueries.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Center(
                  child: Text('No borrower evaluations found yet.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ),
              )
            else
              ...recentQueries.map((q) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              HashPillWidget(
                                label: 'Borrower',
                                hash: (q['borrower_hash'] ?? '').toString(),
                                visibleLength: 16,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Recommendation: ${q['recommendation'] ?? (q['risk_level'] == 'HIGH' ? 'REJECT' : (q['risk_level'] == 'MEDIUM' ? 'REDUCE_AMOUNT' : 'APPROVE'))}',
                                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        _buildRiskBadge(q['risk_level'] ?? 'LOW'),
                      ],
                    ),
                  )),
          ],
        ),
      ),
    );
  }


  Widget _buildShortcutChip(String label, String aadhaar, Color color) {
    return ActionChip(
      backgroundColor: color.withValues(alpha: 0.12),
      side: BorderSide(color: color),
      label: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      onPressed: () => widget.onNavigateSearch(aadhaar),
    );
  }

  Widget _buildRiskBadge(String level) {
    final color = level == 'HIGH' ? AppColors.danger : (level == 'MEDIUM' ? AppColors.warning : AppColors.success);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color),
      ),
      child: Text(level, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}
