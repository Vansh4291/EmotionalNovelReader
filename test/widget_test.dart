import 'package:flutter/widgets.dart';
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/app/app.dart';
import 'package:emotional_novel_reader/app/di/injection.dart';
import 'package:emotional_novel_reader/core/constants/app_constants.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() async {
    final testDb = AppDatabase(NativeDatabase.memory());
    await configureDependencies(databaseOverride: testDb);
  });

  tearDown(() async {
    if (getIt.isRegistered<AppDatabase>()) {
      await getIt<AppDatabase>().close();
    }
    await getIt.reset();
  });

  testWidgets('App renders successfully and displays application name in AppBar', (WidgetTester tester) async {
    await tester.pumpWidget(const EmotionalNovelReaderApp());
    await tester.pumpAndSettle();

    expect(find.text(AppConstants.appName), findsOneWidget);

    // Clean up widget tree and flush any Drift stream cleanup timers
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(milliseconds: 100));
  });
}
