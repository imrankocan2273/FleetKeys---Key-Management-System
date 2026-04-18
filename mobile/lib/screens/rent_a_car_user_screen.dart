import 'package:flutter/material.dart';

class RentACarUserScreen extends StatelessWidget {
  const RentACarUserScreen({
    super.key,
    required this.companyName,
    required this.onLogout,
    required this.loading,
  });

  final String companyName;
  final VoidCallback onLogout;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    const blue = Color(0xFF4F8FB3);

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Rent-a-Car User',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: blue,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  companyName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: blue,
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: loading ? null : onLogout,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: blue,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Text(loading ? 'Logging out...' : 'Logout'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
