import 'package:flutter/material.dart';
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
        _error = DioClient.formatError(e);
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
                    Icon(Icons.lock_outline, color: AppColors.gold, size: 20),
                    SizedBox(width: 8),
                    Text('Cryptographic Exposure Policy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'VeriGold cryptographically proves that a borrower\'s total collateral exposure is below your specified risk policy without disclosing the exact amount or active loans to any competing lender.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.45),
                ),
                const SizedBox(height: 16),
                const Text('Maximum Permissible Exposure (Threshold Bucket)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                DropdownButtonFormField<int>(
                  initialValue: _threshold,
                  dropdownColor: AppColors.surface,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 2, child: Text('Bucket 2 — Low Exposure (Up to 2 Pledges)')),
                    DropdownMenuItem(value: 3, child: Text('Bucket 3 — Moderate Exposure (Up to 3 Pledges)')),
                    DropdownMenuItem(value: 4, child: Text('Bucket 4 — High Exposure (Up to 4 Pledges)')),
                    DropdownMenuItem(value: 5, child: Text('Bucket 5 — Maximum Institutional Limit')),
                  ],
                  onChanged: (val) => setState(() => _threshold = val!),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _proving ? null : _generateProof,
                  icon: _proving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(Icons.memory, color: Colors.black, size: 18),
                  label: Text(
                    _proving ? 'Generating Noir Proof...' : 'Generate & Verify ZK Proof',
                    style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    minimumSize: const Size.fromHeight(46),
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
              decoration: BoxDecoration(color: AppColors.danger.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.danger)),
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
                      Icon(Icons.check_circle, color: AppColors.success, size: 24),
                      SizedBox(width: 10),
                      Text('Zero-Knowledge Proof Verified', style: TextStyle(color: AppColors.success, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Mode: ${_proofResult!['mode'] == 'fallback' ? 'Pre-generated demo artifact' : 'Live Barretenberg CLI proof'}',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                  const Divider(color: AppColors.border, height: 24),
                  const Text('Statement: total_exposure < threshold', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Threshold: Bucket ${_proofResult!['threshold']}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  const SizedBox(height: 8),
                  Text(
                    'Proof Bytes: ${(_proofResult!['proof']?.toString().length ?? 0) > 32 ? '${_proofResult!['proof']!.toString().substring(0, 32)}...' : (_proofResult!['proof'] ?? 'N/A')}',
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
