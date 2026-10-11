import 'package:flutter/material.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/fraud_alert.dart';
import '../../shared/widgets/hash_pill_widget.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<FraudAlert> _alerts = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL'; // ALL, OPEN, HIGH

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = await DioClient.getInstance();
      final res = await dio.get('/api/alerts');
      final list = (res.data['alerts'] as List).map((j) => FraudAlert.fromJson(j)).toList();
      setState(() {
        _alerts = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = DioClient.formatError(e);
        _loading = false;
      });
    }
  }

  Future<void> _reviewAlert(int alertId) async {
    try {
      final dio = await DioClient.getInstance();
      await dio.post('/api/alerts/$alertId/review');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alert marked as reviewed.'), backgroundColor: AppColors.success),
        );
      }
      await _loadAlerts();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(DioClient.formatError(e)), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _alerts.where((a) {
      if (_filter == 'OPEN') return a.status == 'open';
      if (_filter == 'HIGH') return a.riskLevel == 'HIGH';
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Consortium Fraud Feed'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAlerts,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('ALL'),
                const SizedBox(width: 8),
                _buildFilterChip('OPEN'),
                const SizedBox(width: 8),
                _buildFilterChip('HIGH'),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Alerts List
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadAlerts,
              color: AppColors.gold,
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
                  : _error != null
                      ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)))
                      : filtered.isEmpty
                          ? const Center(
                              child: Text('No fraud alerts logged.', style: TextStyle(color: AppColors.textMuted)),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: filtered.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final a = filtered[index];
                                final isAcknowledged = a.status == 'reviewed';

                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppColors.card,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: a.riskLevel == 'HIGH' ? AppColors.danger.withValues(alpha: 0.5) : AppColors.border,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Icon(
                                                a.alertType == 'COLLISION' ? Icons.warning_rounded : Icons.speed_rounded,
                                                color: a.riskLevel == 'HIGH' ? AppColors.danger : AppColors.warning,
                                                size: 18,
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                '${a.alertType} (Score: ${a.riskScore})',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 13,
                                                  color: a.riskLevel == 'HIGH' ? AppColors.danger : AppColors.warning,
                                                ),
                                              ),
                                            ],
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: (isAcknowledged ? AppColors.textMuted : AppColors.danger).withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              isAcknowledged ? 'REVIEWED' : 'OPEN',
                                              style: TextStyle(color: isAcknowledged ? AppColors.textMuted : AppColors.danger, fontSize: 10, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(a.message, style: const TextStyle(fontSize: 13, height: 1.4)),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 6,
                                        children: [
                                          HashPillWidget(
                                            label: 'Borrower',
                                            hash: a.borrowerHash,
                                            visibleLength: 14,
                                          ),
                                          if (a.goldFingerprint != null && a.goldFingerprint!.isNotEmpty)
                                            HashPillWidget(
                                              label: 'Gold FP',
                                              hash: a.goldFingerprint!,
                                              visibleLength: 14,
                                            ),
                                        ],
                                      ),
                                      if (!isAcknowledged) ...[
                                        const SizedBox(height: 10),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: TextButton.icon(
                                            onPressed: () => _reviewAlert(a.id),
                                            icon: const Icon(Icons.check, size: 14, color: AppColors.gold),
                                            label: const Text('Mark Reviewed', style: TextStyle(color: AppColors.gold, fontSize: 12, fontWeight: FontWeight.bold)),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _filter == label;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.black : AppColors.textMain, fontWeight: FontWeight.bold)),
      selected: isSelected,
      selectedColor: AppColors.gold,
      backgroundColor: AppColors.surface,
      onSelected: (_) => setState(() => _filter = label),
    );
  }
}
