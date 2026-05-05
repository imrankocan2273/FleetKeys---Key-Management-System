import 'package:flutter/material.dart';

import 'user_keys_screen.dart';

class RentACarUserScreen extends StatelessWidget {
  const RentACarUserScreen({
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
      title: 'Rent-a-Car Ključevi',
      companyName: companyName,
      accessToken: accessToken,
      onLogout: onLogout,
      loading: loading,
    );
  }
}
