import 'package:flutter/material.dart';

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
