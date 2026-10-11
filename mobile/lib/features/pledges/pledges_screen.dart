import 'package:flutter/material.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/pledge.dart';
import '../../shared/widgets/hash_pill_widget.dart';

class PledgesScreen extends StatefulWidget {
  const PledgesScreen({super.key});

  @override
  State<PledgesScreen> createState() => _PledgesScreenState();
}

class _PledgesScreenState extends State<PledgesScreen> {
  List<Pledge> _pledges = [];
  bool _loading = true;
  String? _error;
  String _filter = 'ALL'; // ALL, ACTIVE, CLOSED
  String? _closingId;

  @override
  void initState() {
    super.initState();
    _loadPledges();
  }

  Future<void> _loadPledges() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = await DioClient.getInstance();
      final res = await dio.get('/api/pledges');
      final list = (res.data['pledges'] as List).map((j) => Pledge.fromJson(j)).toList();
      setState(() {
        _pledges = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = DioClient.formatError(e);
        _loading = false;
      });
    }
  }

  Future<void> _closePledge(String pledgeId) async {
    setState(() => _closingId = pledgeId);
    try {
      final dio = await DioClient.getInstance();
      await dio.post('/api/pledges/$pledgeId/close');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pledge closed successfully on Fabric.'), backgroundColor: AppColors.success),
        );
      }
      await _loadPledges();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(DioClient.formatError(e)), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _closingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _pledges.where((p) {
      if (_filter == 'ACTIVE') return p.status == 'ACTIVE';
      if (_filter == 'CLOSED') return p.status == 'CLOSED';
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hyperledger Fabric Pledges'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPledges,
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
                _buildFilterChip('ACTIVE'),
                const SizedBox(width: 8),
                _buildFilterChip('CLOSED'),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Pledges List
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadPledges,
              color: AppColors.gold,
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
                  : _error != null
                      ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)))
                      : filtered.isEmpty
                          ? const Center(
                              child: Text('No pledges found for this filter.', style: TextStyle(color: AppColors.textMuted)),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: filtered.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final p = filtered[index];
                                final isClosing = _closingId == p.id;

                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppColors.card,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            p.id,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.gold),
                                          ),
                                          _buildStatusBadge(p.status),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Amount: ${p.amountRangeLabel}',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 6,
                                        children: [
                                          HashPillWidget(
                                            label: 'Borrower',
                                            hash: p.borrowerHash,
                                            visibleLength: 14,
                                          ),
                                          HashPillWidget(
                                            label: 'Tx Hash',
                                            hash: p.transactionHash,
                                            visibleLength: 14,
                                          ),
                                        ],
                                      ),
                                      if (p.status == 'ACTIVE') ...[
                                        const SizedBox(height: 12),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: OutlinedButton.icon(
                                            onPressed: isClosing ? null : () => _closePledge(p.id),
                                            icon: isClosing
                                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                                : const Icon(Icons.check_box_outlined, size: 14, color: AppColors.danger),
                                            label: Text(
                                              isClosing ? 'Closing...' : 'Close Pledge',
                                              style: const TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold),
                                            ),
                                            style: OutlinedButton.styleFrom(
                                              side: const BorderSide(color: AppColors.danger),
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                            ),
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

  Widget _buildStatusBadge(String status) {
    final isClosed = status == 'CLOSED';
    final color = isClosed ? AppColors.textMuted : AppColors.success;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color),
      ),
      child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
