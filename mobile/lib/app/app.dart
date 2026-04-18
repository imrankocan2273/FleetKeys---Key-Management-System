import 'package:flutter/material.dart';

import '../screens/hotel_motel_user_screen.dart';
import '../screens/login_screen.dart';
import '../screens/rent_a_car_user_screen.dart';
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

  AppSession? _session;
  bool _bootstrapping = true;
  bool _loggingOut = false;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final session = await _sessionService.getSession();
    if (!mounted) return;

    setState(() {
      _session = session;
      _bootstrapping = false;
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

    if (session.businessType == 'rent-a-car') {
      return RentACarUserScreen(
        companyName: session.companyName,
        onLogout: _handleLogout,
        loading: _loggingOut,
      );
    }

    if (session.businessType == 'hotel/motel') {
      return HotelMotelUserScreen(
        companyName: session.companyName,
        onLogout: _handleLogout,
        loading: _loggingOut,
      );
    }

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Unsupported business type for mobile app'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _loggingOut ? null : _handleLogout,
                  child: Text(_loggingOut ? 'Logging out...' : 'Logout'),
                ),
              ],
            ),
          ),
        ),
      ),
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
