import 'package:flutter/material.dart';

import '../screens/home_screen.dart';
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

  String? _token;
  bool _bootstrapping = true;
  bool _loggingOut = false;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final token = await _sessionService.getToken();
    if (!mounted) return;

    setState(() {
      _token = token;
      _bootstrapping = false;
    });
  }

  Future<void> _handleLoginSuccess(String token) async {
    await _sessionService.saveToken(token);
    if (!mounted) return;

    setState(() {
      _token = token;
    });
  }

  Future<void> _handleLogout() async {
    if (_token == null || _loggingOut) return;

    setState(() => _loggingOut = true);

    try {
      await _authService.logout(accessToken: _token!);
    } finally {
      await _sessionService.clearToken();

      if (mounted) {
        setState(() {
          _token = null;
          _loggingOut = false;
        });
      }
    }
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
          : (_token == null || _token!.isEmpty)
              ? LoginScreen(onLoginSuccess: _handleLoginSuccess)
              : HomeScreen(onLogout: _handleLogout, loading: _loggingOut),
    );
  }
}
