import 'dart:async';

import 'package:flutter/material.dart';

import '../services/keys_service.dart';

class HomepageScreen extends StatefulWidget {
  const HomepageScreen({
    super.key,
    required this.companyName,
    required this.accessToken,
    required this.onLogout,
    required this.loading,
  });

  final String companyName;
  final String accessToken;
  final VoidCallback onLogout;
  final bool loading;

  @override
  State<HomepageScreen> createState() => _HomepageScreenState();
}

class _HomepageScreenState extends State<HomepageScreen>
    with WidgetsBindingObserver {
  static const Color blue = Color(0xFF4F8FB3);
  static const Duration _autoRefreshInterval = Duration(seconds: 1);

  final _keysService = KeysService();
  Timer? _refreshTimer;
  bool _requestInFlight = false;
  bool _queuedRefresh = false;

  bool _loadingKeys = true;
  String? _error;
  List<UserKeyItem> _keys = const [];

  _StatusView _statusView(UserKeyItem item) {
    switch (item.status) {
      case 'available':
        return const _StatusView(
          subtitle: 'Available',
          pillText: 'Available',
          background: Color(0xFFE4F5E9),
          foreground: Color(0xFF1D7C3B),
        );
      case 'checked_out':
        return _StatusView(
          subtitle: 'Checked out by ${item.checkedOutBy ?? 'Unknown'}',
          pillText: 'Checked Out',
          background: const Color(0xFFFFE8E8),
          foreground: const Color(0xFFB33232),
        );
      case 'maintenance':
        return const _StatusView(
          subtitle: 'Maintenance',
          pillText: 'Maintenance',
          background: Color(0xFFFFF4DF),
          foreground: Color(0xFF9A5A00),
        );
      case 'lost':
        return const _StatusView(
          subtitle: 'Lost',
          pillText: 'Lost',
          background: Color(0xFFF4E8FF),
          foreground: Color(0xFF5C2E91),
        );
      default:
        return _StatusView(
          subtitle: item.status,
          pillText: item.status,
          background: const Color(0xFFECEFF3),
          foreground: const Color(0xFF445264),
        );
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadKeys();
    _startAutoRefresh();
  }

  @override
  void reassemble() {
    super.reassemble();
    _startAutoRefresh();
    _loadKeys(showLoader: false);
  }

  void _startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(_autoRefreshInterval, (_) {
      _loadKeys(showLoader: false);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadKeys(showLoader: false);
    }
  }

  Future<void> _loadKeys({bool showLoader = true}) async {
    if (_requestInFlight) {
      _queuedRefresh = true;
      return;
    }

    _requestInFlight = true;

    if (mounted && showLoader) {
      setState(() {
        _loadingKeys = true;
        _error = null;
      });
    }

    try {
      final keys = await _keysService.fetchKeysForUser(
        accessToken: widget.accessToken,
      );

      if (!mounted) return;
      setState(() {
        _keys = keys;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      _requestInFlight = false;
      if (mounted && showLoader) {
        setState(() => _loadingKeys = false);
      }

      if (_queuedRefresh && mounted) {
        _queuedRefresh = false;
        unawaited(_loadKeys(showLoader: false));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Homepage'),
        actions: [
          TextButton(
            onPressed: widget.loading ? null : widget.onLogout,
            child: Text(widget.loading ? 'Logging out...' : 'Logout'),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadKeys,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                widget.companyName,
                style: const TextStyle(
                  color: blue,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              if (_loadingKeys)
                const Padding(
                  padding: EdgeInsets.only(top: 48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _error!,
                      style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: _loadKeys,
                      child: const Text('Try again'),
                    ),
                  ],
                )
              else if (_keys.isEmpty)
                const Text('No keys to display.')
              else
                ..._keys.map((item) {
                  final statusView = _statusView(item);

                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      title: Text(
                        item.keyCode,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(statusView.subtitle),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: statusView.background,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          statusView.pillText,
                          style: TextStyle(
                            color: statusView.foreground,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusView {
  const _StatusView({
    required this.subtitle,
    required this.pillText,
    required this.background,
    required this.foreground,
  });

  final String subtitle;
  final String pillText;
  final Color background;
  final Color foreground;
}
