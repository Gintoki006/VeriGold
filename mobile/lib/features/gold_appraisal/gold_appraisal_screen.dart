import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/network/dio_client.dart';
import '../../core/theme/app_theme.dart';

class GoldAppraisalScreen extends StatefulWidget {
  const GoldAppraisalScreen({
    super.key,
    required this.onAttachToSearch,
  });

  final Function(String fingerprint) onAttachToSearch;

  @override
  State<GoldAppraisalScreen> createState() => _GoldAppraisalScreenState();
}

class _GoldAppraisalScreenState extends State<GoldAppraisalScreen> {
  final _weightController = TextEditingController(text: '22.5');
  final _purityController = TextEditingController(text: '91.6');
  final _dimController    = TextEditingController(text: '65');
  final _charController   = TextEditingController(text: 'BIS916 hallmark');

  String _itemType = 'Bangle';
  File? _photoFile;

  bool _computing = false;
  bool _matching = false;
  String? _error;
  String? _fingerprint;
  Map<String, dynamic>? _matchResult;

  final _picker = ImagePicker();

  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 80);
      if (picked != null) {
        setState(() => _photoFile = File(picked.path));
      }
    } catch (e) {
      setState(() => _error = 'Camera access error: $e');
    }
  }

  Future<void> _computeFingerprint() async {
    final weight = double.tryParse(_weightController.text);
    final purity = double.tryParse(_purityController.text);

    if (weight == null || weight <= 0) {
      setState(() => _error = 'Enter a valid positive weight in grams.');
      return;
    }
    if (purity == null || purity <= 0 || purity > 100) {
      setState(() => _error = 'Enter a valid purity percentage (e.g. 91.6 for 22K).');
      return;
    }

    setState(() {
      _computing = true;
      _error = null;
      _fingerprint = null;
      _matchResult = null;
    });

    try {
      final dio = await DioClient.getInstance();

      final payload = {
        'weight_grams': weight,
        'purity_percent': purity,
        'item_type': _itemType,
        'item_count': 1,
        'dimensions': {'diameter_mm': double.tryParse(_dimController.text) ?? 65.0},
        'characteristics': {'hallmark': _charController.text},
      };

      Response res;
      if (_photoFile != null) {
        final formData = FormData.fromMap({
          'data': payload,
          'photo': await MultipartFile.fromFile(_photoFile!.path),
        });
        res = await dio.post('/api/gold/fingerprint', data: formData);
      } else {
        res = await dio.post('/api/gold/fingerprint', data: payload);
      }

      final fp = res.data['fingerprint'] ?? res.data['fingerprint_hash'];
      setState(() {
        _fingerprint = fp;
        _computing = false;
      });

      // Auto-trigger Fabric Match Check
      _checkFabricMatch(fp);
    } catch (e) {
      setState(() {
        _error = DioClient.formatError(e);
        _computing = false;
      });
    }
  }

  Future<void> _checkFabricMatch(String fp) async {
    setState(() => _matching = true);
    try {
      final dio = await DioClient.getInstance();
      final res = await dio.post('/api/gold/match-check', data: {'fingerprint': fp});
      setState(() {
        _matchResult = res.data;
        _matching = false;
      });
    } catch (e) {
      setState(() {
        _error = DioClient.formatError(e);
        _matching = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Physical Gold Appraisal')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Appraisal Form
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
                const Text('PHYSICAL COLLATERAL ATTRIBUTES', style: TextStyle(color: AppColors.gold, fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),

                // Item Type
                const Text('Item Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _itemType,
                  dropdownColor: AppColors.surface,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Bangle', child: Text('Bangle')),
                    DropdownMenuItem(value: 'Ring', child: Text('Ring')),
                    DropdownMenuItem(value: 'Necklace', child: Text('Necklace')),
                    DropdownMenuItem(value: 'Chain', child: Text('Chain')),
                    DropdownMenuItem(value: 'Earring', child: Text('Earring')),
                    DropdownMenuItem(value: 'Coin', child: Text('Coin')),
                    DropdownMenuItem(value: 'Bar', child: Text('Bar')),
                  ],
                  onChanged: (val) => setState(() => _itemType = val!),
                ),
                const SizedBox(height: 12),

                // Weight & Purity Row
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Weight (Grams)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _weightController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(hintText: 'e.g. 22.5'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Purity (%)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 6),
                          TextField(
                            controller: _purityController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(hintText: 'e.g. 91.6 for 22K'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Characteristics
                const Text('Hallmarks / Characteristics', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                TextField(
                  controller: _charController,
                  decoration: const InputDecoration(hintText: 'e.g. BIS916 hallmark, TBZ maker'),
                ),
                const SizedBox(height: 14),

                // Camera Attachment Section
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => _pickPhoto(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt, size: 16),
                      label: const Text('Camera', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.border)),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: () => _pickPhoto(ImageSource.gallery),
                      icon: const Icon(Icons.photo_library, size: 16),
                      label: const Text('Gallery', style: TextStyle(fontSize: 12)),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.border)),
                    ),
                    if (_photoFile != null) ...[
                      const SizedBox(width: 10),
                      const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                      const SizedBox(width: 4),
                      const Text('Photo Ready', style: TextStyle(color: AppColors.success, fontSize: 11)),
                    ],
                  ],
                ),
                const SizedBox(height: 16),

                ElevatedButton.icon(
                  onPressed: _computing ? null : _computeFingerprint,
                  icon: _computing
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(Icons.fingerprint, color: Colors.black, size: 18),
                  label: Text(_computing ? 'Quantizing & Fingerprinting...' : 'Generate Fingerprint & Match Check', style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
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

          if (_fingerprint != null) ...[
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
                  const Text('CANONICAL COLLATERAL FINGERPRINT', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold, fontSize: 11)),
                  const SizedBox(height: 6),
                  SelectableText(
                    _fingerprint!,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.textMain),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (_matching)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: CircularProgressIndicator(color: AppColors.gold),
              ),
            )
          else if (_matchResult != null) ...[
            // Match Result Banner
            if (_matchResult!['match_found'] == true) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.danger, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 24),
                        SizedBox(width: 10),
                        Text('COLLATERAL MATCH FOUND', style: TextStyle(color: AppColors.danger, fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Warning: Physical item attributes match an active pledge registered on the Fabric consortium ledger.',
                      style: TextStyle(fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Pledge ID: ${_matchResult!['matched_pledge_id'] ?? 'PLG-DEMO-D-ORG1'}',
                      style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.success, width: 1.5),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: AppColors.success, size: 24),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text('Collateral Unique Across Consortium (No Matches)', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Attach to Search CTA
            OutlinedButton.icon(
              onPressed: () {
                widget.onAttachToSearch(_fingerprint!);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Collateral fingerprint attached to Borrower Search!')),
                );
              },
              icon: const Icon(Icons.attach_file, size: 16, color: AppColors.gold),
              label: const Text('Attach Collateral to Borrower Search', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.gold),
                minimumSize: const Size.fromHeight(46),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
