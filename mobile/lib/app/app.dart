import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

import '../screens/homepage_screen.dart';
import '../screens/key_scan_action_screen.dart';
import '../screens/login_screen.dart';
import '../services/auth_service.dart';
import '../services/session_service.dart';

class FleetKeysApp extends StatefulWidget {
  const FleetKeysApp({super.key});

  @override
  State<FleetKeysApp> createState() => _FleetKeysAppState();
}

class _FleetKeysAppState extends State<FleetKeysApp> {
  final _sessionService = SessionService();
  final _authService = AuthService();
  final _appLinks = AppLinks();

  AppSession? _session;
  bool _bootstrapping = true;
  bool _loggingOut = false;
  StreamSubscription<Uri>? _linkSub;
  String? _pendingQrToken;
  String? _pendingKeyName;
  String? _pendingStatus;
  String? _pendingNote;

  @override
  void initState() {
    super.initState();
    _loadSession();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  Future<void> _loadSession() async {
    final session = await _sessionService.getSession();
    if (!mounted) return;

    setState(() {
      _session = session;
      _bootstrapping = false;
    });
  }

  Future<void> _initDeepLinks() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      _handleIncomingUri(initialUri);
    } catch (_) {}

    _linkSub = _appLinks.uriLinkStream.listen(
      _handleIncomingUri,
      onError: (_) {},
    );
  }

  void _handleIncomingUri(Uri? uri) {
    if (uri == null) return;
    if (uri.scheme != 'fleetkeys') return;

    final token = uri.queryParameters['qr_token']?.trim();
    if (token == null || token.isEmpty) return;
    if (!mounted) return;

    if (_pendingQrToken != null && _pendingQrToken == token) {
      return;
    }

    setState(() {
      _pendingQrToken = token;
      _pendingKeyName = uri.queryParameters['key_name']?.trim();
      _pendingStatus = uri.queryParameters['status']?.trim();
      _pendingNote = uri.queryParameters['note']?.trim();
    });
  }

  Future<void> _handleLoginSuccess(LoginResult result) async {
    final session = AppSession(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      businessType: result.businessType,
      role: result.role,
      companyId: result.companyId,
      companyName: result.companyName,
      userDisplayName: result.userDisplayName,
    );

    await _sessionService.saveSession(session);
    if (!mounted) return;

    setState(() {
      _session = session;
    });
  }

  Future<void> _handleLogout() async {
    if (_session == null || _loggingOut) return;

    setState(() => _loggingOut = true);

    try {
      await _authService.logout(accessToken: _session!.accessToken);
    } finally {
      await _sessionService.clearSession();

      if (mounted) {
        setState(() {
          _session = null;
          _loggingOut = false;
        });
      }
    }
  }

  Widget _buildUserHome() {
    final session = _session;
    if (session == null) {
      return LoginScreen(onLoginSuccess: _handleLoginSuccess);
    }

    if (_pendingQrToken != null && _pendingQrToken!.isNotEmpty) {
      return KeyScanActionScreen(
        qrToken: _pendingQrToken!,
        keyName: _pendingKeyName,
        keyStatus: _pendingStatus,
        keyNote: _pendingNote,
        userDisplayName: session.userDisplayName,
        accessToken: session.accessToken,
        onCancel: () {
          if (!mounted) return;
          setState(() {
            _pendingQrToken = null;
            _pendingKeyName = null;
            _pendingStatus = null;
            _pendingNote = null;
          });
        },
        onDone: () {
          if (!mounted) return;
          setState(() {
            _pendingQrToken = null;
            _pendingKeyName = null;
            _pendingStatus = null;
            _pendingNote = null;
          });
        },
      );
    }

    return HomepageScreen(
      companyName: session.companyName,
      accessToken: session.accessToken,
      onLogout: _handleLogout,
      loading: _loggingOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    const blue = Color(0xFF4F8FB3);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'FleetKeys',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: blue),
        scaffoldBackgroundColor: Colors.white,
        useMaterial3: true,
      ),
      home: _bootstrapping
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : (_session == null || _session!.accessToken.isEmpty)
              ? LoginScreen(onLoginSuccess: _handleLoginSuccess)
              : _buildUserHome(),
    );
  }
}
