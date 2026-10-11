import 'package:flutter/material.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/models/borrower_risk.dart';
import '../../shared/widgets/animated_risk_gauge.dart';
import '../../shared/widgets/hash_pill_widget.dart';

class BorrowerSearchScreen extends StatefulWidget {
  const BorrowerSearchScreen({
    super.key,
    this.initialAadhaar,
    this.initialGoldFp,
  });

  final String? initialAadhaar;
  final String? initialGoldFp;

  @override
  State<BorrowerSearchScreen> createState() => _BorrowerSearchScreenState();
}

class _BorrowerSearchScreenState extends State<BorrowerSearchScreen> {
  final _controller = TextEditingController();
  bool _searching = false;
  String? _error;
  BorrowerRiskReport? _report;
  String? _computedHash;
  String? _goldFingerprint;

  // Pledge Registration in progress
  bool _registering = false;
  String? _txHash;

  @override
  void initState() {
    super.initState();
    _goldFingerprint = widget.initialGoldFp;
    if (widget.initialAadhaar != null && widget.initialAadhaar!.isNotEmpty) {
      _controller.text = widget.initialAadhaar!;
      _performSearch();
    }
  }

  Future<void> _performSearch() async {
    final aadhaar = _controller.text.replaceAll(RegExp(r'\D'), '');
    if (aadhaar.length != 12) {
      setState(() => _error = 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setState(() {
      _searching = true;
      _error = null;
      _report = null;
      _txHash = null;
    });

    try {
      final dio = await DioClient.getInstance();

      // Step 1: Compute HMAC-SHA256 commitment (plaintext Aadhaar never logged)
      final hashRes = await dio.post('/api/borrowers/compute-hash', data: {'aadhaar': aadhaar});
      final bHash = hashRes.data['borrower_hash'];

      // Step 2: Query Fabric registry & Hybrid Risk Engine
      final searchPayload = <String, dynamic>{'borrower_hash': bHash};
      if (_goldFingerprint != null && _goldFingerprint!.isNotEmpty) {
        searchPayload['gold_fingerprint'] = _goldFingerprint;
      }

      final searchRes = await dio.post('/api/borrowers/search', data: searchPayload);

      setState(() {
        _computedHash = bHash;
        _report = BorrowerRiskReport.fromJson(searchRes.data);
        _searching = false;
      });
    } catch (e) {
      setState(() {
        _error = DioClient.formatError(e);
        _searching = false;
      });
    }
  }

  void _showRegisterPledgeSheet() {
    if (_computedHash == null) return;
    int selectedAmountRange = 2; // Default ₹1L–₹2L

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Register Pledge on Fabric', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    'Borrower: ${_computedHash!.length > 16 ? '${_computedHash!.substring(0, 16)}...' : _computedHash}',
                    style: const TextStyle(fontFamily: 'monospace', color: AppColors.textMuted, fontSize: 12),
                  ),
                  const SizedBox(height: 16),

                  const Text('Loan Amount Range Bucket', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<int>(
                    initialValue: selectedAmountRange,
                    dropdownColor: AppColors.card,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.card,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 0, child: Text('Bucket 0: ₹0–₹50K')),
                      DropdownMenuItem(value: 1, child: Text('Bucket 1: ₹50K–₹1L')),
                      DropdownMenuItem(value: 2, child: Text('Bucket 2: ₹1L–₹2L')),
                      DropdownMenuItem(value: 3, child: Text('Bucket 3: ₹2L–₹5L')),
                      DropdownMenuItem(value: 4, child: Text('Bucket 4: ₹5L+')),
                    ],
                    onChanged: (val) => setSheetState(() => selectedAmountRange = val!),
                  ),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: _registering
                        ? null
                        : () async {
                            Navigator.pop(context);
                            _executeRegisterPledge(selectedAmountRange);
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.gold,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Confirm & Submit to Fabric', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _executeRegisterPledge(int amountRange) async {
    setState(() => _registering = true);
    try {
      final dio = await DioClient.getInstance();
      final res = await dio.post('/api/pledges', data: {
        'borrower_hash': _computedHash,
        'amount_range': amountRange,
        'gold_fingerprint': _goldFingerprint,
      });

      setState(() {
        _txHash = res.data['transaction_hash'] ?? res.data['tx_hash'];
        _registering = false;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Pledge registered successfully on Hyperledger Fabric!'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      setState(() => _registering = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to register pledge: ${DioClient.formatError(e)}'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Borrower Risk Assessment')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Input Form Card
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
                const Text('Borrower Aadhaar Number', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  controller: _controller,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter 12 digits (e.g. 111111111111)',
                    filled: true,
                    fillColor: AppColors.surface,
                    prefixIcon: const Icon(Icons.person_search, color: AppColors.gold, size: 20),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                if (_goldFingerprint != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.gold),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.auto_awesome, color: AppColors.gold, size: 16),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Collateral Attached: ${_goldFingerprint!.length > 16 ? '${_goldFingerprint!.substring(0, 16)}...' : _goldFingerprint}',
                            style: const TextStyle(fontSize: 11, color: AppColors.gold, fontWeight: FontWeight.bold),
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => _goldFingerprint = null),
                          child: const Icon(Icons.close, size: 16, color: AppColors.gold),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                const Text(
                  '🔒 Plaintext Aadhaar is hashed locally and never stored on-chain or in server logs.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 14),
                ElevatedButton.icon(
                  onPressed: _searching ? null : _performSearch,
                  icon: _searching
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(Icons.search, color: Colors.black, size: 18),
                  label: Text(
                    _searching ? 'Evaluating Ledger...' : 'Hash & Evaluate Risk',
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
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.danger),
              ),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
            ),

          if (_report != null) ...[
            // Risk Level & Gauge
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _getRiskColor(_report!.riskLevel)),
              ),
              child: Column(
                children: [
                  AnimatedRiskGauge(
                    score: _report!.riskScore,
                    level: _report!.riskLevel,
                  ),
                  const SizedBox(height: 10),
                  const Text('Primary Deterministic Engine & Fabric Ledger', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  if (_computedHash != null) ...[
                    const SizedBox(height: 12),
                    HashPillWidget(
                      label: 'HMAC Commitment',
                      hash: _computedHash!,
                      visibleLength: 16,
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Recommendation Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _getRiskColor(_report!.riskLevel).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _getRiskColor(_report!.riskLevel)),
                    ),
                    child: Text(
                      'SUGGESTED ACTION: ${_report!.recommendation}',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: _getRiskColor(_report!.riskLevel), fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Factor Badges
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildFactor('Active Pledges', '${_report!.activePledgeCount}'),
                      _buildFactor('Exposure', _report!.exposureRange),
                      _buildFactor('Velocity Alert', _report!.velocityFlagged ? 'YES ⚡' : 'NO'),
                      _buildFactor('Gold Match', _report!.goldMatch ? 'MATCH 🥇' : 'NO'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Rule Factors Breakdown
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
                  const Text('DETERMINISTIC RULE REASONING', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 11)),
                  const SizedBox(height: 10),
                  ..._report!.explanation.map((e) => Padding(
                        padding: const EdgeInsets.only(bottom: 6.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• ', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold)),
                            Expanded(child: Text(e, style: const TextStyle(fontSize: 12, color: AppColors.textMain))),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI Advisory Narrative
            if (_report!.llmReasoning != null) ...[
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
                        Icon(Icons.auto_awesome, color: AppColors.gold, size: 16),
                        SizedBox(width: 8),
                        Text('GEMINI AI ADVISORY NARRATIVE', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 11)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(_report!.llmReasoning!, style: const TextStyle(fontSize: 13, height: 1.45)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Register Pledge CTA Button
            ElevatedButton.icon(
              onPressed: _registering ? null : _showRegisterPledgeSheet,
              icon: _registering
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                  : const Icon(Icons.verified, color: Colors.black, size: 18),
              label: Text(_registering ? 'Submitting to Fabric...' : 'Register Pledge on Fabric Ledger', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.gold,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),

            if (_txHash != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.success),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Fabric Transaction Hash:', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11)),
                    const SizedBox(height: 4),
                    SelectableText(_txHash!, style: const TextStyle(fontFamily: 'monospace', fontSize: 11)),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Color _getRiskColor(String level) {
    if (level == 'HIGH') return AppColors.danger;
    if (level == 'MEDIUM') return AppColors.warning;
    return AppColors.success;
  }

  Widget _buildFactor(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
      ],
    );
  }
}
