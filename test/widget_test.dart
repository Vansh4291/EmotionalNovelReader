import 'package:emotional_novel_reader/app/app.dart';
import 'package:emotional_novel_reader/core/constants/app_constants.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App renders successfully and displays application name', (WidgetTester tester) async {
    await tester.pumpWidget(const EmotionalNovelReaderApp());
    expect(find.text(AppConstants.appName), findsOneWidget);
  });
}
