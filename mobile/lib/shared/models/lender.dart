class Lender {
  final int id;
  final String mspId;
  final String organizationName;
  final bool isAdmin;

  Lender({
    required this.id,
    required this.mspId,
    required this.organizationName,
    required this.isAdmin,
  });

  factory Lender.fromJson(Map<String, dynamic> json) {
    return Lender(
      id: json['id'] ?? 1,
      mspId: json['fabric_msp_id'] ?? json['msp_id'] ?? 'Org1MSP',
      organizationName: json['organization_name'] ?? json['org_name'] ?? 'Demo Lender',
      isAdmin: json['is_admin'] ?? (json['fabric_msp_id'] == 'Org1MSP'),
    );
  }
}
