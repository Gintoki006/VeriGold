import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Luxury Dark Obsidian Canvas
  static const Color background = Color(0xFF0B0F17);
  static const Color surface    = Color(0xFF111827);
  static const Color card       = Color(0xFF161F30);
  static const Color cardHover  = Color(0xFF1F293D);
  static const Color border     = Color(0xFF223049);
  static const Color divider    = Color(0xFF1E293B);

  // Sovereign Gold Accents
  static const Color gold       = Color(0xFFD4AF37);
  static const Color goldLight  = Color(0xFFF3E5AB);
  static const Color goldDark   = Color(0xFF996515);
  static const Color goldGlow   = Color(0x33D4AF37);

  // Institutional Status Codes
  static const Color success    = Color(0xFF10B981); // Emerald (Approved / Low Risk)
  static const Color warning    = Color(0xFFF59E0B); // Amber (Reduced / Medium Risk)
  static const Color danger     = Color(0xFFEF4444); // Crimson (Rejected / High Risk)

  // Typography Tokens
  static const Color textMain   = Color(0xFFF9FAFB);
  static const Color textMuted  = Color(0xFF9CA3AF);
  static const Color textFaint  = Color(0xFF6B7280);
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      fontFamily: GoogleFonts.outfit().fontFamily,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.gold,
      cardColor: AppColors.card,
      canvasColor: AppColors.surface,
      dividerColor: AppColors.divider,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.gold,
        secondary: AppColors.goldLight,
        surface: AppColors.surface,
        error: AppColors.danger,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.gold),
        titleTextStyle: TextStyle(
          color: AppColors.textMain,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.gold,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.textFaint, fontSize: 13),
        labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.gold, width: 1.5),
        ),
      ),
    );
  }
}
