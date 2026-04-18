import 'package:shared_preferences/shared_preferences.dart';

class AppSession {
  const AppSession({
    required this.accessToken,
    required this.refreshToken,
    required this.businessType,
    required this.role,
    required this.companyId,
    required this.companyName,
  });

  final String accessToken;
  final String refreshToken;
  final String businessType;
  final String role;
  final String companyId;
  final String companyName;
}

class SessionService {
  static const _tokenKey = 'fk_access_token';
  static const _refreshTokenKey = 'fk_refresh_token';
  static const _businessTypeKey = 'fk_business_type';
  static const _roleKey = 'fk_role';
  static const _companyIdKey = 'fk_company_id';
  static const _companyNameKey = 'fk_company_name';

  Future<AppSession?> getSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token == null || token.isEmpty) return null;

    return AppSession(
      accessToken: token,
      refreshToken: prefs.getString(_refreshTokenKey) ?? '',
      businessType: prefs.getString(_businessTypeKey) ?? '',
      role: prefs.getString(_roleKey) ?? '',
      companyId: prefs.getString(_companyIdKey) ?? '',
      companyName: prefs.getString(_companyNameKey) ?? '',
    );
  }

  Future<void> saveSession(AppSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, session.accessToken);
    await prefs.setString(_refreshTokenKey, session.refreshToken);
    await prefs.setString(_businessTypeKey, session.businessType);
    await prefs.setString(_roleKey, session.role);
    await prefs.setString(_companyIdKey, session.companyId);
    await prefs.setString(_companyNameKey, session.companyName);
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_businessTypeKey);
    await prefs.remove(_roleKey);
    await prefs.remove(_companyIdKey);
    await prefs.remove(_companyNameKey);
  }
}
