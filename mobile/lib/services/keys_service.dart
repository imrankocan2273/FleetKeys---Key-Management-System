import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'authenticated_api_client.dart';

class KeyActor {
  const KeyActor({
    required this.name,
    this.position,
    this.phone,
  });

  final String name;
  final String? position;
  final String? phone;
}

class UserKeyItem {
  const UserKeyItem({
    required this.id,
    required this.keyCode,
    required this.status,
    this.checkedOutBy,
    this.checkedOutByPosition,
    this.checkedOutByPhone,
  });

  final String id;
  final String keyCode;
  final String status;
  final String? checkedOutBy;
  final String? checkedOutByPosition;
  final String? checkedOutByPhone;

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
  KeysService({http.Client? client, AuthenticatedApiClient? apiClient})
    : _client = client ?? http.Client(),
      _apiClient = apiClient;

  final http.Client _client;
  final AuthenticatedApiClient? _apiClient;

  static String get _baseUrl => ApiConfig.normalizeBaseUrl(ApiConfig.baseUrl);

  Future<ScannedKeyPreview?> fetchKeyPreviewByQrToken({
    required String accessToken,
    required String qrToken,
  }) async {
    final keysUri = Uri.parse('$_baseUrl/api/keys');
    final response = await _get(
      keysUri,
      accessToken: accessToken,
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

    final response = await _post(
      uri,
      accessToken: accessToken,
      body: jsonEncode({
        'qr_token': qrToken,
        'action': action,
        'message': message,
      }),
    );

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        payload['message'] ?? payload['details'] ?? 'Scan key event failed',
      );
    }
  }

  Future<List<UserKeyItem>> fetchKeysForUser({
    required String accessToken,
  }) async {
    final keysUri = Uri.parse('$_baseUrl/api/keys');

    final keysResponse = await _get(keysUri, accessToken: accessToken);

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

    final checkedOutByByKeyId = <String, KeyActor>{};

    await Future.wait(
      checkedOutKeys.map((row) async {
        final actor = await _fetchLastTakenActorForKey(
          accessToken: accessToken,
          keyId: row.id,
        );
        if (actor != null && actor.name.trim().isNotEmpty) {
          checkedOutByByKeyId[row.id] = actor;
        }
      }),
    );

    return parsedKeys
        .map(
          (row) {
            final actor = checkedOutByByKeyId[row.id];
            return UserKeyItem(
              id: row.id,
              keyCode: row.keyCode,
              status: row.status,
              checkedOutBy: actor?.name,
              checkedOutByPosition: actor?.position,
              checkedOutByPhone: actor?.phone,
            );
          },
        )
        .toList();
  }

  Future<KeyActor?> _fetchLastTakenActorForKey({
    required String accessToken,
    required String keyId,
  }) async {
    final eventsUri = Uri.parse('$_baseUrl/api/keys/$keyId/events?limit=10');

    final response = await _get(eventsUri, accessToken: accessToken);

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
      final actorPosition = (event['actor_position'] as String?)?.trim();
      final actorPhone = (event['actor_phone'] as String?)?.trim();

      return KeyActor(
        name: (actorName != null && actorName.isNotEmpty) ? actorName : 'Unknown',
        position: (actorPosition != null && actorPosition.isNotEmpty) ? actorPosition : null,
        phone: (actorPhone != null && actorPhone.isNotEmpty) ? actorPhone : null,
      );
    }

    return null;
  }

  Future<http.Response> _get(Uri uri, {required String accessToken}) {
    final apiClient = _apiClient;
    if (apiClient != null) return apiClient.get(uri);

    return _client.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );
  }

  Future<http.Response> _post(
    Uri uri, {
    required String accessToken,
    Object? body,
  }) {
    final apiClient = _apiClient;
    if (apiClient != null) return apiClient.post(uri, body: body);

    return _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: body,
    );
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
