import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'shared/providers/auth_provider.dart';
import 'features/auth/auth_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/borrower_search/borrower_search_screen.dart';
import 'features/gold_appraisal/gold_appraisal_screen.dart';
import 'features/pledges/pledges_screen.dart';
import 'features/alerts/alerts_screen.dart';
import 'features/zk_proof/zk_proof_screen.dart';
import 'features/admin/admin_screen.dart';
import 'features/settings/settings_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: VeriGoldApp()));
}

class AppRoutes {
  static const String auth = '/auth';
  static const String dashboard = '/dashboard';
  static const String search = '/search';
  static const String appraisal = '/appraisal';
  static const String pledges = '/pledges';
  static const String tools = '/tools';
  static const String alerts = '/alerts';
  static const String zk = '/zk';
  static const String admin = '/admin';
  static const String settings = '/settings';
}

class VeriGoldApp extends ConsumerWidget {
  const VeriGoldApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'VeriGold Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      initialRoute: '/',
      onGenerateRoute: (settings) {
        final rawName = settings.name ?? '/';
        // Normalize web hash routes e.g. "/#/dashboard" or "/dashboard"
        final cleanName = rawName.replaceFirst(RegExp(r'^/#'), '');

        // Unauthenticated guard
        if (!authState.isAuthenticated) {
          return MaterialPageRoute(
            builder: (_) => const AuthScreen(),
            settings: settings,
          );
        }

        switch (cleanName) {
          case '/':
          case AppRoutes.dashboard:
            return MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 0),
              settings: settings,
            );
          case AppRoutes.search:
            return MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 1),
              settings: settings,
            );
          case AppRoutes.appraisal:
            return MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 2),
              settings: settings,
            );
          case AppRoutes.pledges:
            return MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 3),
              settings: settings,
            );
          case AppRoutes.tools:
            return MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 4),
              settings: settings,
            );
          case AppRoutes.alerts:
            return MaterialPageRoute(
              builder: (_) => const AlertsScreen(),
              settings: settings,
            );
          case AppRoutes.zk:
            return MaterialPageRoute(
              builder: (_) => const ZkProofScreen(),
              settings: settings,
            );
          case AppRoutes.admin:
            return MaterialPageRoute(
              builder: (_) => const AdminScreen(),
              settings: settings,
            );
          case AppRoutes.settings:
            return MaterialPageRoute(
              builder: (_) => const SettingsScreen(),
              settings: settings,
            );
          case AppRoutes.auth:
            return MaterialPageRoute(
              builder: (_) => const AuthScreen(),
              settings: settings,
            );
          default:
            return MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 0),
              settings: settings,
            );
        }
      },
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late int _currentIndex;
  String? _prefilledAadhaar;
  String? _attachedGoldFp;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(
        onNavigateSearch: (aadhaar) {
          setState(() {
            _prefilledAadhaar = aadhaar;
            _currentIndex = 1;
          });
        },
      ),
      BorrowerSearchScreen(
        key: ValueKey('$_prefilledAadhaar-$_attachedGoldFp'),
        initialAadhaar: _prefilledAadhaar,
        initialGoldFp: _attachedGoldFp,
      ),
      GoldAppraisalScreen(
        onAttachToSearch: (fp) {
          setState(() {
            _attachedGoldFp = fp;
            _currentIndex = 1;
          });
        },
      ),
      const PledgesScreen(),
      const MoreToolsScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() {
          if (index != 1) {
            _prefilledAadhaar = null;
          }
          _currentIndex = index;
        }),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined, size: 22), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.search, size: 22), label: 'Search'),
          BottomNavigationBarItem(icon: Icon(Icons.fingerprint, size: 22), label: 'Appraisal'),
          BottomNavigationBarItem(icon: Icon(Icons.shield_outlined, size: 22), label: 'Pledges'),
          BottomNavigationBarItem(icon: Icon(Icons.menu, size: 22), label: 'Tools'),
        ],
      ),
    );
  }
}

class MoreToolsScreen extends ConsumerWidget {
  const MoreToolsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lender = ref.watch(authProvider).currentLender;

    return Scaffold(
      appBar: AppBar(title: const Text('Consortium Registry Tools')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildToolTile(
            context,
            title: 'Threat Alerts & Fraud Feed',
            subtitle: 'Review velocity bursts and collateral double-pledge flags',
            icon: Icons.warning_amber_rounded,
            color: AppColors.danger,
            screen: const AlertsScreen(),
          ),
          const SizedBox(height: 10),
          _buildToolTile(
            context,
            title: 'Zero-Knowledge Exposure Proof',
            subtitle: 'Verify exposure under threshold without revealing values',
            icon: Icons.lock_outline,
            color: AppColors.gold,
            screen: const ZkProofScreen(),
          ),
          const SizedBox(height: 10),
          if (lender?.isAdmin == true) ...[
            _buildToolTile(
              context,
              title: 'Consortium Admin Console',
              subtitle: 'Manage participating lenders and platform policies',
              icon: Icons.admin_panel_settings_outlined,
              color: AppColors.gold,
              screen: const AdminScreen(),
            ),
            const SizedBox(height: 10),
          ],
          _buildToolTile(
            context,
            title: 'Settings & Network Diagnostics',
            subtitle: 'Change backend URL, ping /health, view public key',
            icon: Icons.settings_outlined,
            color: AppColors.textMain,
            screen: const SettingsScreen(),
          ),
        ],
      ),
    );
  }

  Widget _buildToolTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Widget screen,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        leading: Icon(icon, color: color, size: 22),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.textMuted),
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => screen)),
      ),
    );
  }
}
