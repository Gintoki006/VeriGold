class ZkProofResult {
  final String statement;
  final int threshold;
  final String proof;
  final bool verified;
  final String mode; // live or fallback

  ZkProofResult({
    required this.statement,
    required this.threshold,
    required this.proof,
    required this.verified,
    required this.mode,
  });

  factory ZkProofResult.fromJson(Map<String, dynamic> json) {
    return ZkProofResult(
      statement: json['statement'] ?? 'total_exposure < threshold',
      threshold: json['threshold'] ?? 5,
      proof: json['proof'] ?? '',
      verified: json['verified'] ?? false,
      mode: json['mode'] ?? 'fallback',
    );
  }
}
