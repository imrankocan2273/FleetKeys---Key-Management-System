class ApiConfig {
  const ApiConfig._();

  /// API base URL (dev/prod).
  ///
  /// Override at build/run time:
  /// flutter run --dart-define=API_BASE_URL=https://tvoj-digitalocean-domen
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://coral-app-zk7m2.ondigitalocean.app',
  );

  static String normalizeBaseUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.endsWith('/')) return trimmed.substring(0, trimmed.length - 1);
    return trimmed;
  }
}

