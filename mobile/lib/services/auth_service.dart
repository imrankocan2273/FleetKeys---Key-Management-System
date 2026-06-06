import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

class LoginResult {
  const LoginResult({
    required this.accessToken,
    required this.refreshToken,
    required this.businessType,
    required this.role,
    required this.companyId,
    required this.companyName,
    required this.userDisplayName,
  });

  final String accessToken;
  final String refreshToken;
  final String businessType;
  final String role;
  final String companyId;
  final String companyName;
  final String userDisplayName;
}

class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  static String get _baseUrl => ApiConfig.normalizeBaseUrl(ApiConfig.baseUrl);

  Future<LoginResult> login({
    required String username,
    required String password,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/auth/login');

    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        'client_type': 'mobile_user',
      }),
    );

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['message'] ?? 'Login failed');
    }

    final profile = payload['profile'] as Map<String, dynamic>?;
    final user = payload['user'] as Map<String, dynamic>?;
    final accessToken = payload['access_token'] as String?;
    final refreshToken = payload['refresh_token'] as String?;

    if (profile == null || accessToken == null || accessToken.isEmpty) {
      throw Exception('Invalid login response payload');
    }

    final email = (user?['email'] as String?)?.trim() ?? '';
    final derivedName = email.contains('@') ? email.split('@').first : email;

    return LoginResult(
      accessToken: accessToken,
      refreshToken: refreshToken ?? '',
      businessType: (profile['business_type'] as String?) ?? '',
      role: (profile['role'] as String?) ?? '',
      companyId: (profile['company_id'] as String?) ?? '',
      companyName: (profile['company_name'] as String?) ?? '',
      userDisplayName: derivedName.isEmpty ? 'User' : derivedName,
    );
  }

  Future<void> logout({required String accessToken}) async {
    final uri = Uri.parse('$_baseUrl/api/auth/logout');

    await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'access_token': accessToken}),
    );
  }

  Future<LoginResult> refresh({required String refreshToken}) async {
    final uri = Uri.parse('$_baseUrl/api/auth/refresh');

    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    final Map<String, dynamic> payload =
        jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(payload['message'] ?? 'Refresh failed');
    }

    final profile = payload['profile'] as Map<String, dynamic>?;
    final user = payload['user'] as Map<String, dynamic>?;
    final accessToken = payload['access_token'] as String?;
    final nextRefreshToken = payload['refresh_token'] as String?;

    if (profile == null || accessToken == null || accessToken.isEmpty) {
      throw Exception('Invalid refresh response payload');
    }

    final email = (user?['email'] as String?)?.trim() ?? '';
    final derivedName = email.contains('@') ? email.split('@').first : email;

    return LoginResult(
      accessToken: accessToken,
      refreshToken: nextRefreshToken ?? refreshToken,
      businessType: (profile['business_type'] as String?) ?? '',
      role: (profile['role'] as String?) ?? '',
      companyId: (profile['company_id'] as String?) ?? '',
      companyName: (profile['company_name'] as String?) ?? '',
      userDisplayName: derivedName.isEmpty ? 'User' : derivedName,
    );
  }
}
