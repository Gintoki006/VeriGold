class BorrowerRiskReport {
  final int riskScore;
  final String riskLevel; // LOW, MEDIUM, HIGH
  final int activePledgeCount;
  final String exposureRange;
  final bool velocityFlagged;
  final bool goldMatch;
  final String recommendation; // APPROVE, REDUCE_AMOUNT, REJECT
  final List<String> explanation;
  final String? llmReasoning;

  BorrowerRiskReport({
    required this.riskScore,
    required this.riskLevel,
    required this.activePledgeCount,
    required this.exposureRange,
    required this.velocityFlagged,
    required this.goldMatch,
    required this.recommendation,
    required this.explanation,
    this.llmReasoning,
  });

  factory BorrowerRiskReport.fromJson(Map<String, dynamic> json) {
    return BorrowerRiskReport(
      riskScore: json['risk_score'] ?? 0,
      riskLevel: (json['risk_level'] ?? 'LOW').toString().toUpperCase(),
      activePledgeCount: json['active_pledge_count'] ?? 0,
      exposureRange: json['exposure_range'] ?? '₹0–₹50K',
      velocityFlagged: json['velocity_flagged'] ?? false,
      goldMatch: json['gold_match'] ?? false,
      recommendation: json['recommendation'] ?? 'APPROVE',
      explanation: List<String>.from(json['explanation'] ?? []),
      llmReasoning: json['llm_reasoning'],
    );
  }
}
