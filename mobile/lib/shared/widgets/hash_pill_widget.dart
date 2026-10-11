import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';

class HashPillWidget extends StatelessWidget {
  final String label;
  final String hash;
  final int visibleLength;

  const HashPillWidget({
    super.key,
    required this.label,
    required this.hash,
    this.visibleLength = 16,
  });

  String get truncatedHash {
    if (hash.isEmpty) return 'N/A';
    if (hash.length <= visibleLength) return hash;
    return '${hash.substring(0, visibleLength)}...';
  }

  void _copyToClipboard(BuildContext context) {
    if (hash.isEmpty) return;
    Clipboard.setData(ClipboardData(text: hash));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard!'),
        backgroundColor: AppColors.gold,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _copyToClipboard(context),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '$label: ',
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              truncatedHash,
              style: const TextStyle(
                fontFamily: 'monospace',
                color: AppColors.gold,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 6),
            const Icon(Icons.copy_rounded, size: 12, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
