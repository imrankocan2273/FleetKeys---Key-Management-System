import 'package:http/http.dart' as http;

import 'auth_service.dart';
import 'session_service.dart';

class AuthenticatedApiClient {
  AuthenticatedApiClient({
    required SessionService sessionService,
    AuthService? authService,
    http.Client? client,
    void Function(AppSession? session)? onSessionChanged,
  }) : _sessionService = sessionService,
       _authService = authService ?? AuthService(),
       _client = client ?? http.Client(),
       _onSessionChanged = onSessionChanged;

  final SessionService _sessionService;
  final AuthService _authService;
  final http.Client _client;
  final void Function(AppSession? session)? _onSessionChanged;

  Future<http.Response> get(Uri uri) {
    return _send((token) {
      return _client.get(uri, headers: _headers(token));
    });
  }

  Future<http.Response> post(Uri uri, {Object? body}) {
    return _send((token) {
      return _client.post(uri, headers: _headers(token), body: body);
    });
  }

  Map<String, String> _headers(String token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> _send(
    Future<http.Response> Function(String token) request,
  ) async {
    final session = await _sessionService.getSession();
    if (session == null || session.accessToken.isEmpty) {
      throw Exception('Session expired. Please login again.');
    }

    final response = await request(session.accessToken);
    if (response.statusCode != 401) return response;

    final refreshed = await _refreshSession(session);
    if (refreshed == null) return response;

    return request(refreshed.accessToken);
  }

  Future<AppSession?> _refreshSession(AppSession session) async {
    if (session.refreshToken.isEmpty) {
      await _clearSession();
      return null;
    }

    try {
      final result = await _authService.refresh(
        refreshToken: session.refreshToken,
      );
      final refreshed = AppSession(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        businessType: result.businessType,
        role: result.role,
        companyId: result.companyId,
        companyName: result.companyName,
        userDisplayName: result.userDisplayName,
      );

      await _sessionService.saveSession(refreshed);
      _onSessionChanged?.call(refreshed);
      return refreshed;
    } catch (_) {
      await _clearSession();
      return null;
    }
  }

  Future<void> _clearSession() async {
    await _sessionService.clearSession();
    _onSessionChanged?.call(null);
  }
}
