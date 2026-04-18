import 'dart:convert';

import 'package:http/http.dart' as http;

class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static const String _baseUrl = 'http://127.0.0.1:4000';

  Future<String?> login({required String username, required String password}) async {
    final uri = Uri.parse('$_baseUrl/api/auth/login');

    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return payload['access_token'] as String?;
    }

    throw Exception(payload['message'] ?? 'Login failed');
  }

  Future<void> logout({required String accessToken}) async {
    final uri = Uri.parse('$_baseUrl/api/auth/logout');

    await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'access_token': accessToken}),
    );
  }
}
