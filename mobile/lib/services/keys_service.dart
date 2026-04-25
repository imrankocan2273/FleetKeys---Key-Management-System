import 'dart:convert';

import 'package:http/http.dart' as http;

class UserKeyItem {
  const UserKeyItem({
    required this.id,
    required this.keyCode,
    required this.status,
    this.checkedOutBy,
  });

  final String id;
  final String keyCode;
  final String status;
  final String? checkedOutBy;

  bool get isAvailable => status == 'available';
}

class ScannedKeyPreview {
  const ScannedKeyPreview({
    required this.keyCode,
    required this.status,
    this.note,
  });

  final String keyCode;
  final String status;
  final String? note;
}

class KeysService {
  KeysService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String _baseUrl = 'http://127.0.0.1:4000';

  Future<ScannedKeyPreview?> fetchKeyPreviewByQrToken({
    required String accessToken,
    required String qrToken,
  }) async {
    final keysUri = Uri.parse('$_baseUrl/api/keys');
    final response = await _client.get(
      keysUri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    ).timeout(const Duration(seconds: 5));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;
    final rawKeys = payload['keys'] as List<dynamic>? ?? const [];
    final token = qrToken.trim();

    for (final row in rawKeys) {
      if (row is! Map<String, dynamic>) continue;
      final rowToken = (row['qr_token'] as String?)?.trim() ?? '';
      if (rowToken != token) continue;

      return ScannedKeyPreview(
        keyCode: (row['key_code'] as String?)?.trim().isNotEmpty == true
            ? (row['key_code'] as String).trim()
            : '-',
        status: (row['status'] as String?)?.trim() ?? 'available',
        note: (row['note'] as String?)?.trim(),
      );
    }

    return null;
  }

  Future<void> scanKeyEvent({
    required String accessToken,
    required String qrToken,
    required String action,
    String? message,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/keys/scan');

    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'qr_token': qrToken,
        'action': action,
        'message': message,
      }),
    );

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['message'] ?? payload['details'] ?? 'Scan key event failed');
    }
  }

  Future<List<UserKeyItem>> fetchKeysForUser({required String accessToken}) async {
    final keysUri = Uri.parse('$_baseUrl/api/keys');

    final keysResponse = await _client.get(
      keysUri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    final Map<String, dynamic> payload =
        jsonDecode(keysResponse.body) as Map<String, dynamic>;

    if (keysResponse.statusCode < 200 || keysResponse.statusCode >= 300) {
      throw Exception(payload['message'] ?? 'Loading keys failed');
    }

    final rawKeys = (payload['keys'] as List<dynamic>? ?? const []);
    final parsedKeys = rawKeys
        .whereType<Map<String, dynamic>>()
        .map(
          (row) => _KeyRow(
            id: (row['id'] as String?) ?? '',
            keyCode: (row['key_code'] as String?) ?? '-',
            status: (row['status'] as String?) ?? 'available',
          ),
        )
        .where((row) => row.id.isNotEmpty)
        .toList();

    final checkedOutKeys = parsedKeys
        .where((row) => row.status == 'checked_out')
        .toList();

    final checkedOutByByKeyId = <String, String>{};

    await Future.wait(
      checkedOutKeys.map((row) async {
        final actor = await _fetchLastActorForKey(
          accessToken: accessToken,
          keyId: row.id,
        );
        if (actor != null && actor.isNotEmpty) {
          checkedOutByByKeyId[row.id] = actor;
        }
      }),
    );

    return parsedKeys
        .map(
          (row) => UserKeyItem(
            id: row.id,
            keyCode: row.keyCode,
            status: row.status,
            checkedOutBy: checkedOutByByKeyId[row.id],
          ),
        )
        .toList();
  }

  Future<String?> _fetchLastActorForKey({
    required String accessToken,
    required String keyId,
  }) async {
    final eventsUri = Uri.parse('$_baseUrl/api/keys/$keyId/events?limit=10');

    final response = await _client.get(
      eventsUri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;

    final events = payload['events'] as List<dynamic>? ?? const [];

    for (final event in events) {
      if (event is! Map<String, dynamic>) continue;

      final action = (event['action'] as String?) ?? '';
      if (action != 'taken') continue;

      final actorName = (event['actor_name'] as String?)?.trim();
      if (actorName != null && actorName.isNotEmpty) {
        return actorName;
      }

      return 'Unknown';
    }

    return 'Unknown';
  }
}

class _KeyRow {
  const _KeyRow({
    required this.id,
    required this.keyCode,
    required this.status,
  });

  final String id;
  final String keyCode;
  final String status;
}
