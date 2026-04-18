import 'package:flutter_test/flutter_test.dart';

import 'package:fleetkeys_mobile/app/app.dart';

void main() {
  testWidgets('App boots', (WidgetTester tester) async {
    await tester.pumpWidget(const FleetKeysApp());

    expect(find.text('FleetKeys iOS app starter is ready.'), findsOneWidget);
  });
}
