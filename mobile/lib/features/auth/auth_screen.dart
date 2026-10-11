import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/widgets/consortium_card.dart';

class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key});

  static const institutions = [
    {'msp': 'Org1MSP', 'name': 'Shri Lakshmi Finance Ltd', 'role': 'Org 1 • Primary / Admin', 'icon': '🏛️'},
    {'msp': 'Org2MSP', 'name': 'Sunrise Gold Loans',       'role': 'Org 2 • Member Bank',      'icon': '🏦'},
    {'msp': 'Org3MSP', 'name': 'Muthoot Quick Gold',       'role': 'Org 3 • Member Bank',      'icon': '🪙'},
    {'msp': 'Org4MSP', 'name': 'Manappuram Finance Ltd',   'role': 'Org 4 • Member Bank',      'icon': '🏢'},
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              // Brand Logo Header
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Icon(Icons.shield_outlined, color: AppColors.gold, size: 36),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'VeriGold Mobile',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textMain),
              ),
              const SizedBox(height: 6),
              const Text(
                'Cross-Lender Privacy Registry for Gold Loans',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 28),

              const Text(
                'SELECT LENDING INSTITUTION',
                style: TextStyle(color: AppColors.gold, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1),
              ),
              const SizedBox(height: 12),

              Expanded(
                child: ListView.separated(
                  itemCount: institutions.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final inst = institutions[index];
                    final isSelected = authState.selectedMsp == inst['msp'];

                    return ConsortiumInstitutionCard(
                      name: inst['name']!,
                      mspId: inst['msp']!,
                      role: inst['role']!,
                      iconEmoji: inst['icon']!,
                      isSelected: isSelected,
                      onTap: () => ref.read(authProvider.notifier).setSelectedMsp(inst['msp']!),
                    );
                  },
                ),
              ),

              if (authState.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.danger),
                  ),
                  child: Text(
                    authState.error!,
                    style: const TextStyle(color: AppColors.danger, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // One-Tap Cryptographic Login Button
              ElevatedButton.icon(
                onPressed: authState.isLoading
                    ? null
                    : () => ref.read(authProvider.notifier).login(authState.selectedMsp),
                icon: authState.isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                      )
                    : const Icon(Icons.key, color: Colors.black, size: 20),
                label: Text(
                  authState.isLoading ? 'Signing & Authorizing...' : 'Connect & Authorize Session',
                  style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 15),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 10),

              // Interactive Demo Sandbox Button
              OutlinedButton.icon(
                onPressed: authState.isLoading
                    ? null
                    : () => ref.read(authProvider.notifier).loginDemo(authState.selectedMsp),
                icon: const Icon(Icons.auto_awesome, color: AppColors.gold, size: 18),
                label: const Text(
                  'Explore Demo Sandbox (Zero-Backend)',
                  style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.gold, width: 1.2),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
