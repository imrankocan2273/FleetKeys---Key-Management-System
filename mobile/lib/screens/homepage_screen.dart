import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/authenticated_api_client.dart';
import '../services/keys_service.dart';
import 'qr_scanner_screen.dart';

class HomepageScreen extends StatefulWidget {
  const HomepageScreen({
    super.key,
    required this.companyName,
    required this.accessToken,
    required this.apiClient,
    required this.onQrScanned,
    required this.onLogout,
    required this.loading,
  });

  final String companyName;
  final String accessToken;
  final AuthenticatedApiClient apiClient;
  final ValueChanged<String> onQrScanned;
  final VoidCallback onLogout;
  final bool loading;

  @override
  State<HomepageScreen> createState() => _HomepageScreenState();
}

class _HomepageScreenState extends State<HomepageScreen>
    with WidgetsBindingObserver {
  static const Color blue = Color(0xFF4F8FB3);
  // 1s refresh spam-a server + troši bateriju; dovoljno je za demo 10s.
  static const Duration _autoRefreshInterval = Duration(seconds: 10);

  late final KeysService _keysService;
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

  Future<void> _openKeyDetails(UserKeyItem item) async {
    if (!mounted) return;

    final statusView = _statusView(item);
    final isAvailable = item.status == 'available';

    Future<void> callPhone(String phone) async {
      final sanitized = phone.replaceAll(RegExp(r'[^0-9+]'), '');
      if (sanitized.isEmpty) return;

      final uri = Uri(scheme: 'tel', path: sanitized);
      try {
        // iOS: otvara standardni "Call / Cancel" sheet za broj (Phone app).
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ne mogu otvoriti poziv na ovom uređaju.')),
        );
      }
    }

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Key details',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Text(
                      item.keyCode,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusView.background,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      statusView.pillText,
                      style: TextStyle(
                        color: statusView.foreground,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (isAvailable)
                const Text(
                  'This key is currently available.',
                  style: TextStyle(color: Colors.black87),
                )
              else
                _CheckedOutBySection(
                  actorName: item.checkedOutBy,
                  actorPosition: item.checkedOutByPosition,
                  actorPhone: item.checkedOutByPhone,
                  onCall: callPhone,
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    _keysService = KeysService(apiClient: widget.apiClient);
    WidgetsBinding.instance.addObserver(this);
    _loadKeys();
    _startAutoRefresh();
  }

  Future<void> _openScanner() async {
    final token = await Navigator.of(
      context,
    ).push<String>(MaterialPageRoute(builder: (_) => const QrScannerScreen()));
    if (token == null || token.trim().isEmpty) return;
    widget.onQrScanned(token.trim());
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
          IconButton(
            onPressed: widget.loading ? null : _openScanner,
            tooltip: 'Scan QR',
            icon: const Icon(Icons.qr_code_scanner_rounded),
          ),
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
                      onTap: () => _openKeyDetails(item),
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

class _CheckedOutBySection extends StatelessWidget {
  const _CheckedOutBySection({
    required this.actorName,
    required this.actorPosition,
    required this.actorPhone,
    required this.onCall,
  });

  final String? actorName;
  final String? actorPosition;
  final String? actorPhone;
  final Future<void> Function(String phone) onCall;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final phone = (actorPhone ?? '').trim();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.55),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Checked out by',
                  style: TextStyle(
                    fontSize: 13,
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  (actorName?.trim().isNotEmpty == true) ? actorName!.trim() : 'Unknown',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                if (actorPosition?.trim().isNotEmpty == true) ...[
                  const SizedBox(height: 2),
                  Text(
                    actorPosition!.trim(),
                    style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
                if (phone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    phone,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          IconButton.filledTonal(
            onPressed: phone.isEmpty ? null : () => onCall(phone),
            icon: const Icon(Icons.call),
            tooltip: phone.isEmpty ? 'No phone' : 'Call',
          ),
        ],
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
