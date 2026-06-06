import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/keys_service.dart';

class UserKeysScreen extends StatefulWidget {
  const UserKeysScreen({
    super.key,
    required this.title,
    required this.companyName,
    required this.accessToken,
    required this.onLogout,
    required this.loading,
  });

  final String title;
  final String companyName;
  final String accessToken;
  final VoidCallback onLogout;
  final bool loading;

  @override
  State<UserKeysScreen> createState() => _UserKeysScreenState();
}

class _UserKeysScreenState extends State<UserKeysScreen> {
  static const Color blue = Color(0xFF4F8FB3);

  final _keysService = KeysService();

  bool _loadingKeys = true;
  String? _error;
  List<UserKeyItem> _keys = const [];

  @override
  void initState() {
    super.initState();
    _loadKeys();
  }

  Future<void> _loadKeys() async {
    if (mounted) {
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
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _loadingKeys = false);
      }
    }
  }

  Future<void> _openKeyDetails(UserKeyItem item) async {
    if (!mounted) return;

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
        final isAvailable = item.isAvailable;
        final title = isAvailable ? 'Slobodan ključ' : 'Uzet ključ';

        final statusColor = isAvailable ? const Color(0xFFE4F5E9) : const Color(0xFFFFE8E8);
        final statusTextColor = isAvailable ? const Color(0xFF1D7C3B) : const Color(0xFFB33232);

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Text(
                      item.keyCode,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusColor,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      isAvailable ? 'Slobodan' : 'Uzet',
                      style: TextStyle(
                        color: statusTextColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (isAvailable)
                const Text(
                  'Ovaj ključ je trenutno slobodan.',
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
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          TextButton(
            onPressed: widget.loading ? null : widget.onLogout,
            child: Text(widget.loading ? 'Odjava...' : 'Odjava'),
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
                      child: const Text('Pokušaj ponovo'),
                    ),
                  ],
                )
              else if (_keys.isEmpty)
                const Text('Nema ključeva za prikaz.')
              else
                ..._keys.map((item) {
                  final isAvailable = item.isAvailable;
                  final statusText = isAvailable
                      ? 'Slobodan'
                      : 'Uzet od ${item.checkedOutBy ?? 'Nepoznato'}';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ListTile(
                      onTap: () => _openKeyDetails(item),
                      title: Text(
                        item.keyCode,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(statusText),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: isAvailable
                              ? const Color(0xFFE4F5E9)
                              : const Color(0xFFFFE8E8),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          isAvailable ? 'Slobodan' : 'Uzet',
                          style: TextStyle(
                            color: isAvailable
                                ? const Color(0xFF1D7C3B)
                                : const Color(0xFFB33232),
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
                  'Uzeo:',
                  style: TextStyle(
                    fontSize: 13,
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  (actorName?.trim().isNotEmpty == true) ? actorName!.trim() : 'Nepoznato',
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
            tooltip: phone.isEmpty ? 'Nema broja' : 'Pozovi',
          ),
        ],
      ),
    );
  }
}
