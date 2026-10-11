# VeriGold UI Design System & Component Architecture
### Production-Ready Flutter Interface Guidelines inspired by Flutter Component Library

---

## 1. Executive Summary & Design Philosophy

The VeriGold mobile application represents the digital trust infrastructure for the Indian gold loan consortium ("CIBIL for Gold Loans"). In high-stakes institutional finance and multi-lender collateral verification, the interface must exude **precision, luxury, institutional sovereignty, and cryptographic certainty**.

Inspired by curated Flutter UI repositories such as [Flutter Component Library](https://fluttercomponentlibrary.com/) by [@zubithedev](https://github.com/zubithedev) and modern FinTech benchmarks (Apple Pay, Revolut Ultra, Bloomberg Professional), this design system establishes:

1. **High-Contrast Dark Aesthetics:** Obsidian and deep midnight navy foundations that prevent screen fatigue during high-volume loan operations.
2. **Imperial Gold Accents:** Curated warm gold gradients (`#D4AF37` to `#F3E5AB`) representing gold collateral without appearing garish.
3. **Atomic Component Modularity:** Isolated, reusable widgets designed with zero side-effects and strong typing.
4. **Instant Comprehension:** Clear visual telemetry where risk levels (Low, Medium, High) and collision statuses are discernible within 200 milliseconds.
5. **Deterministic State Feedback:** Dedicated visual treatments for cryptographic hashing, Noir zero-knowledge proofs, and offline sandbox execution.

---

## 2. Color Palette & Token System

### 2.1 Core Foundations (Dark Obsidian & Slate)
| Token Name | Hex Code | HSL | Semantic Role |
| :--- | :--- | :--- | :--- |
| `background` | `#0B0F17` | `220°, 35%, 7%` | Root scaffold background canvas |
| `surface` | `#111827` | `220°, 39%, 11%` | Bottom sheets, drawers, navigation bars |
| `card` | `#162032` | `219°, 39%, 14%` | Elevated content containers, list tiles |
| `cardHover` | `#1F2E47` | `218°, 39%, 20%` | Interactive hover/pressed state |
| `border` | `#23334D` | `217°, 37%, 22%` | Structural 1px separation lines |
| `borderActive`| `#D4AF37` | `46°, 65%, 52%` | Active focus, selected institution card |

### 2.2 Gold Collateral Accents (Imperial Luxury)
| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `goldPrimary` | `#D4AF37` | Primary action buttons, active tab indicators, key badges |
| `goldLight` | `#F5D77F` | Subtle highlights, active toggle thumb |
| `goldMuted` | `#937A26` | Inactive gold borders, disabled state accents |
| `goldGlow` | `rgba(212, 175, 55, 0.15)` | Radial background glow on verified collateral cards |

### 2.3 Semantic Risk & Verification Signals
| Severity | Base Color | Soft Background Pill | Hex Code | Semantic Context |
| :--- | :--- | :--- | :--- | :--- |
| **Low / Verified** | Emerald Jade | `rgba(16, 185, 129, 0.12)` | `#10B981` | Approve loan, clean credit, valid ZK proof |
| **Moderate** | Amber Solar | `rgba(245, 158, 11, 0.12)` | `#F59E0B` | Haircut recommended, 2+ active consortium pledges |
| **High / Critical** | Ruby Crimson | `rgba(239, 68, 68, 0.15)` | `#EF4444` | Double-pledge collision, velocity burst, fraud ring |
| **Cryptographic** | Royal Indigo | `rgba(99, 102, 241, 0.15)`| `#6366F1` | SHA-256 fingerprint, Noir UltraPlonk circuit |

### 2.4 Text Legibility Hierarchy
```dart
class AppColors {
  // Foundations
  static const Color background = Color(0xFF0B0F17);
  static const Color surface = Color(0xFF111827);
  static const Color card = Color(0xFF162032);
  static const Color cardHover = Color(0xFF1F2E47);
  static const Color border = Color(0xFF23334D);

  // Gold Accents
  static const Color gold = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFF5D77F);
  static const Color goldMuted = Color(0xFF937A26);

  // Semantic Signals
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color crypto = Color(0xFF6366F1);

  // Typography
  static const Color textMain = Color(0xFFF8FAFC);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textFaint = Color(0xFF64748B);
}
```

---

## 3. Typography Scale & Font Pairing

A production-ready financial application requires dual typography:
1. **Geometric Sans-Serif (`Outfit` or `Inter`)** for headlines, labels, and analytical narratives.
2. **Monospace Font (`JetBrains Mono` or `Fira Code`)** for cryptographic hashes, Fabric block heights, Aadhaar HMAC commitments, and gold serials.

### Hierarchy Scale

| Role | Font Family | Size | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Metric** | Outfit | 32px | Bold (700) | 1.1 | -0.5px |
| **Header 1** | Outfit | 20px | SemiBold (600) | 1.25 | -0.2px |
| **Header 2** | Outfit | 16px | SemiBold (600) | 1.3 | 0px |
| **Body Medium** | Outfit | 14px | Regular (400) | 1.45 | 0px |
| **Caption / Pill** | Outfit | 11px | Medium (500) | 1.3 | +0.4px |
| **Hash / Code** | JetBrains Mono | 12px | Medium (500) | 1.4 | +0.2px |

---

## 4. Component Catalog (Modular Flutter Widgets)

Inspired by components showcased on [Flutter Component Library](https://fluttercomponentlibrary.com/), the following production-ready widgets provide consistency across all application screens:

### 4.1 Component 1: `MetricCard` (Telemetry KPI Tile)
A responsive glassmorphic metric card displaying dynamic counters with icons, micro-labels, and animated transitions.

```dart
import 'package:flutter/material.dart';

class MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color accentColor;
  final VoidCallback? onTap;

  const MetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.accentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF162032),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF23334D)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: accentColor, size: 20),
              ),
              const SizedBox(height: 10),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFF8FAFC),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF94A3B8),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

### 4.2 Component 2: `HashPillWidget` (Cryptographic Copyable Hash)
Safely formats and displays hashes with tap-to-copy, haptic feedback, and tooltip indicators.

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
    Clipboard.setData(ClipboardData(text: hash));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard!'),
        backgroundColor: const Color(0xFFD4AF37),
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
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF23334D)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '$label: ',
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              truncatedHash,
              style: const TextStyle(
                fontFamily: 'monospace',
                color: Color(0xFFD4AF37),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 6),
            const Icon(Icons.copy_rounded, size: 12, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}
```

---

### 4.3 Component 3: `AnimatedRiskGauge` (Radial Telemetry Visualizer)
A smooth, hardware-accelerated circular gauge representing primary credit/fraud risk score (0–100).

```dart
import 'dart:math';
import 'package:flutter/material.dart';

class AnimatedRiskGauge extends StatelessWidget {
  final int score;
  final String level;

  const AnimatedRiskGauge({
    super.key,
    required this.score,
    required this.level,
  });

  Color get scoreColor {
    if (score > 65) return const Color(0xFFEF4444); // High
    if (score > 35) return const Color(0xFFF59E0B); // Medium
    return const Color(0xFF10B981); // Low
  }

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: score / 100.0),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOutCubic,
      builder: (context, progress, child) {
        return SizedBox(
          width: 140,
          height: 140,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: const Size(140, 140),
                painter: _GaugePainter(
                  progress: progress,
                  activeColor: scoreColor,
                  trackColor: const Color(0xFF23334D),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${(progress * 100).toInt()}',
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: scoreColor,
                      letterSpacing: -1,
                    ),
                  ),
                  Text(
                    level,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: scoreColor,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double progress;
  final Color activeColor;
  final Color trackColor;

  _GaugePainter({
    required this.progress,
    required this.activeColor,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 16) / 2;

    final trackPaint = Paint()
      ..color = trackColor
      ..strokeWidth = 10
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final activePaint = Paint()
      ..color = activeColor
      ..strokeWidth = 10
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Draw background 240-degree sweep
    const startAngle = 0.75 * pi;
    const sweepAngle = 1.5 * pi;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      trackPaint,
    );

    // Draw progress arc
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle * progress,
      false,
      activePaint,
    );
  }

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.progress != progress || old.activeColor != activeColor;
}
```

---

### 4.4 Component 4: `ConsortiumInstitutionCard` (Cryptographic Auth Tile)
Used for institutional switching between member lenders with active state highlights and role badges.

```dart
import 'package:flutter/material.dart';

class ConsortiumInstitutionCard extends StatelessWidget {
  final String name;
  final String mspId;
  final String role;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const ConsortiumInstitutionCard({
    super.key,
    required this.name,
    required this.mspId,
    required this.role,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF162032) : const Color(0xFF111827),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFF23334D),
            width: isSelected ? 1.8 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFFD4AF37).withOpacity(0.12),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFFD4AF37).withOpacity(0.15)
                    : const Color(0xFF23334D).withOpacity(0.4),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFF94A3B8),
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFF8FAFC),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Text(
                        mspId,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: Color(0xFFD4AF37),
                        ),
                      ),
                      const Text(
                        ' • ',
                        style: TextStyle(color: Color(0xFF64748B)),
                      ),
                      Text(
                        role,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFFD4AF37),
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}
```

---

## 5. Layout Grids & Spacing Tokens

To prevent visual clutter across varying mobile and tablet displays:

| Spacing Token | Pixels | Application |
| :--- | :--- | :--- |
| `xs` | 4px | Internal icon padding, badge gap |
| `sm` | 8px | Grid item spacing, list item internal margins |
| `md` | 12px | Card internal element separation |
| `lg` | 16px | Screen outer edge margin, section headers |
| `xl` | 24px | Distinct section separators |
| `xxl`| 32px | Major screen divisions, modal header padding |

### Adaptive Breakpoints
- **Mobile Handset (< 600dp):** Single column vertical list with sticky bottom navigation.
- **Tablet / Large Foldable (600dp – 900dp):** 2-column KPI grid, side-by-side search & live risk breakdown.
- **Desktop / Web (> 900dp):** Centered max-width containment (800dp) preserving phone aspect ratio or expanding to dual-pane master-detail view.

---

## 6. Motion, Transitions & Micro-Interactions

High-frequency banking applications require snappy, non-blocking animations:

1. **Page Transitions:** Slide + Fade transitions using `CupertinoPageTransition` or `PageRouteBuilder` with `Curves.easeOutCubic` (280ms duration).
2. **Button Tap Physics:** `Transform.scale` with 0.98 scale depression on press for tactile feedback.
3. **Number Counters:** `TweenAnimationBuilder<int>` on dashboard KPI counters (`42`, `128`) on screen mount.
4. **Haptic Feedback:**
   - Single tap navigation: `HapticFeedback.selectionClick()`
   - Transaction commit / Pledge registration: `HapticFeedback.mediumImpact()`
   - High Risk Collision alert: `HapticFeedback.heavyImpact()`

---

## 7. Implementation Checklist for Production Release

- [x] **Theme Synchronization:** Ensure all widgets consume `Theme.of(context)` tokens instead of hardcoded hex values.
- [x] **Safe Hash Renderers:** Ensure every hex string has a length check (`.length > 16`) to guarantee zero `RangeError` exceptions.
- [x] **Responsive Scaling:** Wrap screens in `SafeArea` and `RefreshIndicator` with `alwaysScrollableScrollPhysics`.
- [x] **Offline Feedback:** When disconnected from Fabric or backend, surface non-intrusive sandbox indicators (`AppColors.gold` pill).
- [x] **High Contrast Typography:** Ensure minimum 4.5:1 WCAG AA contrast for all secondary text and 7:1 for critical numerals.
