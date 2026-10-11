import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';

/// In-memory mock backend interceptor providing a zero-dependency sandbox.
/// Replicates the entire VeriGold FastAPI & Hyperledger Fabric consortium API.
class MockBackendInterceptor extends Interceptor {
  // In-memory state for interactive session
  static final List<Map<String, dynamic>> _pledges = [
    {
      'pledge_id': 'PLG-8821',
      'id': 'PLG-8821',
      'borrower_hash': '0x7a3e9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d',
      'gold_fingerprint': '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4',
      'amount_range': 2,
      'status': 'ACTIVE',
      'transaction_hash': '0x4f8a9e2d1c3b5a7f9e1d7a3e9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d8821',
      'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
    },
    {
      'pledge_id': 'PLG-6410',
      'id': 'PLG-6410',
      'borrower_hash': '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
      'gold_fingerprint': '0xa9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d7a3',
      'amount_range': 1,
      'status': 'ACTIVE',
      'transaction_hash': '0x9e2d1c3b5a7f9e1d88214f8a9e2d1c3b5a7f9e1d7a3e9c4b1f8d2a6e5c0b6410',
      'created_at': DateTime.now().subtract(const Duration(days: 5)).toIso8601String(),
    },
    {
      'pledge_id': 'PLG-3392',
      'id': 'PLG-3392',
      'borrower_hash': '0x9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d7a3e',
      'gold_fingerprint': '0x5d8a9e2d1c3b5a7f9e1d7a3e9c4b1f8d2a6e5c0b',
      'amount_range': 3,
      'status': 'CLOSED',
      'transaction_hash': '0x3a1bf77e9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d7a3e9c4b1f8d2a6e3392',
      'created_at': DateTime.now().subtract(const Duration(days: 14)).toIso8601String(),
      'closed_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
    },
  ];

  static final List<Map<String, dynamic>> _alerts = [
    {
      'id': 101,
      'borrower_hash': '0x9999999999999999999999999999999999999999',
      'gold_fingerprint': '0x8821882188218821882188218821882188218821',
      'risk_score': 98,
      'risk_level': 'HIGH',
      'alert_type': 'COLLISION',
      'message': 'CRITICAL: Physical gold fingerprint collision detected with Org1MSP! Serial #VG-GLD-8821 pledged 48h ago.',
      'status': 'open',
      'created_at': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
    },
    {
      'id': 102,
      'borrower_hash': '0x5566556655665566556655665566556655665566',
      'gold_fingerprint': null,
      'risk_score': 74,
      'risk_level': 'HIGH',
      'alert_type': 'VELOCITY',
      'message': 'Borrower initiated 3 inquiries across 3 consortium members in past 48 hours.',
      'status': 'open',
      'created_at': DateTime.now().subtract(const Duration(hours: 4)).toIso8601String(),
    },
    {
      'id': 103,
      'borrower_hash': '0x8910891089108910891089108910891089108910',
      'gold_fingerprint': null,
      'risk_score': 58,
      'risk_level': 'MEDIUM',
      'alert_type': 'CROSS_MSP',
      'message': 'Cross-lender concurrent pledge request detected within 12 hours.',
      'status': 'open',
      'created_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
    },
  ];

  static final List<Map<String, dynamic>> _lenders = [
    {'id': 1, 'msp_id': 'Org1MSP', 'name': 'Sunrise Gold Finance', 'is_admin': true, 'active': true},
    {'id': 2, 'msp_id': 'Org2MSP', 'name': 'Apex Gold Capital', 'is_admin': false, 'active': true},
    {'id': 3, 'msp_id': 'Org3MSP', 'name': 'Muthoot Synergy NBFC', 'is_admin': false, 'active': true},
    {'id': 4, 'msp_id': 'Org4MSP', 'name': 'Manappuram Union', 'is_admin': false, 'active': true},
  ];

  static String _activeMspId = 'Org1MSP';

  static void setActiveMsp(String msp) {
    _activeMspId = msp;
  }

  static String _getOrgName(String msp) {
    switch (msp) {
      case 'Org1MSP':
        return 'Sunrise Gold Finance (Org1MSP)';
      case 'Org2MSP':
        return 'Apex Gold Capital (Org2MSP)';
      case 'Org3MSP':
        return 'Muthoot Synergy NBFC (Org3MSP)';
      case 'Org4MSP':
        return 'Manappuram Union (Org4MSP)';
      default:
        return 'Consortium Member ($msp)';
    }
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final path = options.path;
    final method = options.method.toUpperCase();

    // 1. /api/auth/challenge
    if (path.contains('/api/auth/challenge')) {
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'challenge_id': 'ch-demo-${DateTime.now().millisecondsSinceEpoch}',
            'nonce': 'a8f9c1b2d3e4f5a6b7c8d9e0f1a2b3c4',
          },
        ),
      );
    }

    // 2. /api/auth/verify
    if (path.contains('/api/auth/verify')) {
      final msp = (options.data is Map ? options.data['msp_id'] : null) ?? _activeMspId;
      _activeMspId = msp;
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'access_token': 'vg-demo-session-token-live',
            'lender': {
              'id': 1,
              'fabric_msp_id': msp,
              'organization_name': _getOrgName(msp),
              'is_admin': msp == 'Org1MSP',
            },
          },
        ),
      );
    }

    // 3. /api/auth/me
    if (path.contains('/api/auth/me')) {
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'id': 1,
            'fabric_msp_id': _activeMspId,
            'organization_name': _getOrgName(_activeMspId),
            'is_admin': _activeMspId == 'Org1MSP',
          },
        ),
      );
    }

    // 4. /api/dashboard/stats
    if (path.contains('/api/dashboard/stats')) {
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'queries_today': 42,
            'my_active_pledges': _pledges.where((p) => p['status'] == 'ACTIVE').length,
            'open_high_risk_alerts': _alerts.where((a) => a['status'] == 'open' && a['risk_level'] == 'HIGH').length,
            'avg_processing_time_ms': 142,
          },
        ),
      );
    }

    // 5. /api/borrowers/search-history
    if (path.contains('/api/borrowers/search-history')) {
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'queries': [
              {
                'aadhaar_masked': 'XXXX-XXXX-4242',
                'borrower_hash': '0x7a3e9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d7a3e9c4b1f8d2a6e5c0b4f42',
                'risk_level': 'LOW',
                'risk_score': 12,
                'recommendation': 'APPROVE',
                'created_at': DateTime.now().subtract(const Duration(minutes: 25)).toIso8601String(),
              },
              {
                'aadhaar_masked': 'XXXX-XXXX-8910',
                'borrower_hash': '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a8910',
                'risk_level': 'MEDIUM',
                'risk_score': 58,
                'recommendation': 'REDUCE_AMOUNT',
                'created_at': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
              },
              {
                'aadhaar_masked': 'XXXX-XXXX-5566',
                'borrower_hash': '0x9c4b1f8d2a6e5c0b4f8a9e2d1c3b5a7f9e1d7a3e9c4b1f8d2a6e5c0b4f8a5566',
                'risk_level': 'HIGH',
                'risk_score': 74,
                'recommendation': 'REJECT',
                'created_at': DateTime.now().subtract(const Duration(hours: 5)).toIso8601String(),
              },
              {
                'aadhaar_masked': 'XXXX-XXXX-9999',
                'borrower_hash': '0x9999999999999999999999999999999999999999999999999999999999999999',
                'risk_level': 'HIGH',
                'risk_score': 98,
                'recommendation': 'REJECT',
                'created_at': DateTime.now().subtract(const Duration(hours: 8)).toIso8601String(),
              },
            ],
          },
        ),
      );
    }

    // 6. /api/borrowers/compute-hash
    if (path.contains('/api/borrowers/compute-hash')) {
      final aadhaar = (options.data is Map ? options.data['aadhaar'] : '')?.toString() ?? '';
      final bytes = utf8.encode('salt_$aadhaar');
      final digest = sha256.convert(bytes);
      String hashStr = digest.toString();
      if (aadhaar.contains('1111') || aadhaar.endsWith('4242')) {
        hashStr = '${hashStr.substring(0, 56)}42421111';
      } else if (aadhaar.contains('2222') || aadhaar.endsWith('8910')) {
        hashStr = '${hashStr.substring(0, 56)}89102222';
      } else if (aadhaar.contains('3333') || aadhaar.endsWith('5566')) {
        hashStr = '${hashStr.substring(0, 56)}55663333';
      } else if (aadhaar.contains('4444') || aadhaar.endsWith('9999')) {
        hashStr = '${hashStr.substring(0, 56)}99994444';
      }
      return handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: {'borrower_hash': '0x$hashStr'},
        ),
      );
    }

    // 7. /api/borrowers/search
    if (path.contains('/api/borrowers/search')) {
      final data = options.data is Map ? options.data : {};
      final bHash = (data['borrower_hash'] ?? '').toString();
      final goldFp = data['gold_fingerprint'];

      // Scenario detection
      if (bHash.contains('4242') || bHash.contains('1111')) {
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'risk_score': 12,
            'risk_level': 'LOW',
            'active_pledge_count': 0,
            'exposure_range': '₹0–₹50K',
            'velocity_flagged': false,
            'gold_match': false,
            'recommendation': 'APPROVE',
            'explanation': [
              'Zero open gold pledges across consortium banks',
              'No velocity inquiries recorded in past 90 days',
              'Clean institutional credit track record (CIBIL equivalent 790+)',
            ],
            'llm_reasoning':
                'Borrower Ravi Kumar presents a pristine low-risk profile. Collateral eligibility is verified with zero competing liens across Org1MSP through Org4MSP. Approved for immediate disbursement within standard 75% LTV ceiling.',
          },
        ));
      } else if (bHash.contains('8910') || bHash.contains('2222')) {
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'risk_score': 58,
            'risk_level': 'MEDIUM',
            'active_pledge_count': 2,
            'exposure_range': '₹1L–₹2L',
            'velocity_flagged': false,
            'gold_match': false,
            'recommendation': 'REDUCE_AMOUNT',
            'explanation': [
              '2 active pledges registered across Org2MSP and Org3MSP',
              'Aggregate outstanding gold credit: ₹1,65,000',
              'Debt-service coverage ratio marginally constrained',
            ],
            'llm_reasoning':
                'Borrower Priya Sharma holds active pledges at Apex Gold Capital and Muthoot Synergy NBFC. Collateral valuation requires a 15% haircut to avoid over-leveraging. Recommend haircut and maximum 60% LTV disbursement.',
          },
        ));
      } else if (bHash.contains('5566') || bHash.contains('3333')) {
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'risk_score': 74,
            'risk_level': 'HIGH',
            'active_pledge_count': 3,
            'exposure_range': '₹2L–₹5L',
            'velocity_flagged': true,
            'gold_match': false,
            'recommendation': 'REJECT',
            'explanation': [
              'Velocity anomaly: 3 loan pledges registered within 7 days',
              'Aggregate exposure exceeds ₹3,50,000 threshold',
              'Multiple credit inquiries logged across 3 distinct lenders',
            ],
            'llm_reasoning':
                'High-risk profile detected. Rapid borrowing velocity indicates severe financial distress or loan-stacking behavior. Immediate rejection advised to prevent portfolio default.',
          },
        ));
      } else if (bHash.contains('9999') || bHash.contains('4444') || goldFp != null) {
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'risk_score': 98,
            'risk_level': 'HIGH',
            'active_pledge_count': 5,
            'exposure_range': '₹5L+',
            'velocity_flagged': true,
            'gold_match': true,
            'recommendation': 'REJECT',
            'explanation': [
              'CRITICAL: Physical gold fingerprint collision detected with Org1MSP!',
              'Serial #VG-GLD-8821 was already pledged 48 hours ago at Apex Gold',
              'Identified syndicate circular pledging behavior pattern',
            ],
            'llm_reasoning':
                'CRITICAL CONSORTIUM ALERT: Collinear asset pledging identified. Physical characteristics match active pledge #PLG-8821. Recommended immediate asset freeze and consortium escalation.',
          },
        ));
      } else {
        // Dynamic fallback based on hash
        final score = 25 + (bHash.hashCode.abs() % 50);
        final level = score > 65 ? 'HIGH' : (score > 40 ? 'MEDIUM' : 'LOW');
        final rec = score > 65 ? 'REJECT' : (score > 40 ? 'REDUCE_AMOUNT' : 'APPROVE');
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {
            'risk_score': score,
            'risk_level': level,
            'active_pledge_count': score > 50 ? 2 : 1,
            'exposure_range': score > 50 ? '₹1L–₹2L' : '₹50K–₹1L',
            'velocity_flagged': score > 70,
            'gold_match': false,
            'recommendation': rec,
            'explanation': [
              'Standard consortium check executed',
              'Privacy-preserving HMAC validated without plaintext disclosure',
            ],
            'llm_reasoning':
                'Automated assessment completed across all consortium member nodes. Risk score reflects current aggregate institutional exposure.',
          },
        ));
      }
    }

    // 8. /api/pledges (GET or POST)
    if (path.contains('/api/pledges')) {
      if (path.contains('/close')) {
        // Close pledge
        final parts = path.split('/');
        final idIdx = parts.indexOf('pledges') + 1;
        final id = idIdx < parts.length ? parts[idIdx] : '';
        for (var p in _pledges) {
          if (p['pledge_id'] == id || p['id'] == id) {
            p['status'] = 'CLOSED';
            p['closed_at'] = DateTime.now().toIso8601String();
          }
        }
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {'status': 'CLOSED', 'message': 'Pledge closed on Hyperledger Fabric.'},
        ));
      }

      if (method == 'POST') {
        final data = options.data is Map ? options.data : {};
        final newId = 'PLG-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
        final newTx = '0x${DateTime.now().millisecondsSinceEpoch}ab9f7c2e1d0a5b6c8d7e9f0a1b2c3d4e';
        final newPledge = {
          'pledge_id': newId,
          'id': newId,
          'borrower_hash': data['borrower_hash'] ?? '0x7a3e9c4b1f8d2a6e',
          'gold_fingerprint': data['gold_fingerprint'] ?? '0xe3b0c44298fc1c14',
          'amount_range': data['amount_range'] ?? 2,
          'status': 'ACTIVE',
          'transaction_hash': newTx,
          'created_at': DateTime.now().toIso8601String(),
        };
        _pledges.insert(0, newPledge);
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: newPledge,
        ));
      }

      // GET /api/pledges
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {'pledges': _pledges, 'total': _pledges.length},
      ));
    }

    // 9. /api/alerts (GET or POST /review)
    if (path.contains('/api/alerts')) {
      if (path.contains('/review')) {
        return handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {'status': 'reviewed', 'message': 'Alert marked reviewed.'},
        ));
      }

      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {'alerts': _alerts, 'total': _alerts.length},
      ));
    }

    // 10. /api/zk/generate-proof
    if (path.contains('/api/zk/generate-proof')) {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {
          'proof': '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
          'public_inputs': ['100000', '1'],
          'is_valid': true,
        },
      ));
    }

    // 11. /api/zk/verify-proof'
    if (path.contains('/api/zk/verify-proof')) {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {
          'verified': true,
          'circuit': 'UltraPlonk_Noir_LTV_Ceiling',
          'execution_time_ms': 18,
        },
      ));
    }

    // 12. /api/admin/stats & /api/admin/lenders
    if (path.contains('/api/admin/stats')) {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {
          'total_consortium_queries': 1420,
          'total_active_pledges': 842,
          'active_lenders_count': 4,
          'fabric_blocks_committed': 19284,
        },
      ));
    }

    if (path.contains('/api/admin/lenders')) {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {'lenders': _lenders},
      ));
    }

    // 13. /health
    if (path.contains('/health')) {
      return handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: {
          'status': 'healthy',
          'fabric': 'connected',
          'engine': 'online',
          'mode': 'demo_sandbox',
        },
      ));
    }

    // Fallback: pass to standard handler
    handler.next(options);
  }
}
