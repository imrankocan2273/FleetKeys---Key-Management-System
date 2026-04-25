import 'package:flutter/material.dart';

import 'user_keys_screen.dart';

class HotelMotelUserScreen extends StatelessWidget {
  const HotelMotelUserScreen({
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
  Widget build(BuildContext context) {
    return UserKeysScreen(
      title: 'Hotel/Motel Ključevi',
      companyName: companyName,
      accessToken: accessToken,
      onLogout: onLogout,
      loading: loading,
    );
  }
}
