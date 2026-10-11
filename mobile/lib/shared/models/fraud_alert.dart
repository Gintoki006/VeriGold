class FraudAlert {
  final int id;
  final String borrowerHash;
  final String? goldFingerprint;
  final int riskScore;
  final String riskLevel;
  final String alertType;
  final String message;
  final String status;
  final DateTime createdAt;

  FraudAlert({
    required this.id,
    required this.borrowerHash,
    this.goldFingerprint,
    required this.riskScore,
    required this.riskLevel,
    required this.alertType,
    required this.message,
    required this.status,
    required this.createdAt,
  });

  factory FraudAlert.fromJson(Map<String, dynamic> json) {
    return FraudAlert(
      id: json['id'] ?? 0,
      borrowerHash: json['borrower_hash'] ?? '',
      goldFingerprint: json['gold_fingerprint'],
      riskScore: json['risk_score'] ?? 0,
      riskLevel: (json['risk_level'] ?? 'HIGH').toString().toUpperCase(),
      alertType: (json['alert_type'] ?? 'VELOCITY').toString().toUpperCase(),
      message: json['message'] ?? json['explanation'] ?? '',
      status: (json['status'] ?? 'open').toString().toLowerCase(),
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
    );
  }
}
