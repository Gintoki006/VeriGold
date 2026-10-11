class Pledge {
  final String id;
  final String borrowerHash;
  final String goldFingerprint;
  final int amountRange;
  final String status; // ACTIVE, CLOSED
  final String transactionHash;
  final DateTime createdAt;
  final DateTime? closedAt;

  Pledge({
    required this.id,
    required this.borrowerHash,
    required this.goldFingerprint,
    required this.amountRange,
    required this.status,
    required this.transactionHash,
    required this.createdAt,
    this.closedAt,
  });

  factory Pledge.fromJson(Map<String, dynamic> json) {
    return Pledge(
      id: json['pledge_id'] ?? json['id'] ?? '',
      borrowerHash: json['borrower_hash'] ?? '',
      goldFingerprint: json['gold_fingerprint'] ?? '',
      amountRange: json['amount_range'] ?? 0,
      status: (json['status'] ?? 'ACTIVE').toString().toUpperCase(),
      transactionHash: json['transaction_hash'] ?? json['tx_hash'] ?? '',
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
      closedAt: json['closed_at'] != null ? DateTime.parse(json['closed_at']) : null,
    );
  }

  String get amountRangeLabel {
    switch (amountRange) {
      case 0:
        return '₹0–₹50K';
      case 1:
        return '₹50K–₹1L';
      case 2:
        return '₹1L–₹2L';
      case 3:
        return '₹2L–₹5L';
      case 4:
        return '₹5L+';
      default:
        return 'Bucket $amountRange';
    }
  }
}
