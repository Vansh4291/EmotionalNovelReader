import 'package:bloc_test/bloc_test.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_goal_entity.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_session_entity.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_statistics_summary.dart';
import 'package:emotional_novel_reader/features/statistics/presentation/cubit/statistics_cubit.dart';
import 'package:emotional_novel_reader/features/statistics/presentation/cubit/statistics_state.dart';
import 'package:emotional_novel_reader/features/statistics/presentation/screens/statistics_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockStatisticsCubit extends MockCubit<StatisticsState>
    implements StatisticsCubit {}

void main() {
  late MockStatisticsCubit mockCubit;

  setUp(() {
    mockCubit = MockStatisticsCubit();
  });

  Widget buildTestableWidget(StatisticsState state) {
    when(() => mockCubit.state).thenReturn(state);
    return MaterialApp(
      home: BlocProvider<StatisticsCubit>.value(
        value: mockCubit,
        child: const StatisticsScreen(),
      ),
    );
  }

  group('StatisticsScreen Widget Tests', () {
    testWidgets('Renders loading indicator in initial/loading state', (
      tester,
    ) async {
      await tester.pumpWidget(buildTestableWidget(const StatisticsLoading()));
      expect(find.text('Loading reading statistics...'), findsOneWidget);
    });

    testWidgets('Renders empty view when no sessions and no goals', (
      tester,
    ) async {
      const emptySummary = ReadingStatisticsSummary(
        totalReadingTimeSeconds: 0,
        todayReadingTimeSeconds: 0,
        weekReadingTimeSeconds: 0,
        monthReadingTimeSeconds: 0,
        yearReadingTimeSeconds: 0,
        totalChaptersCompleted: 0,
        totalCharactersRead: 0,
        totalSessionsCount: 0,
        dailyReadingSeconds: {},
        recentSessions: [],
        goalProgresses: [],
      );

      await tester.pumpWidget(
        buildTestableWidget(
          const StatisticsLoaded(summary: emptySummary, goals: []),
        ),
      );

      expect(find.text('No Reading Data Yet'), findsOneWidget);
      expect(find.text('Set a Goal'), findsOneWidget);
    });

    testWidgets('Renders metrics, goals, and chart when loaded', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final now = DateTime.now();
      final goal = ReadingGoalEntity(
        id: 'daily_time',
        goalType: ReadingGoalType.timeMinutes,
        targetValue: 30,
        createdAt: now,
        updatedAt: now,
      );

      final summary = ReadingStatisticsSummary(
        totalReadingTimeSeconds: 3600,
        todayReadingTimeSeconds: 1500, // 25 min
        weekReadingTimeSeconds: 3600,
        monthReadingTimeSeconds: 3600,
        yearReadingTimeSeconds: 3600,
        totalChaptersCompleted: 4,
        totalCharactersRead: 8000,
        totalSessionsCount: 2,
        dailyReadingSeconds: {DateTime(now.year, now.month, now.day): 1500},
        recentSessions: [
          ReadingSessionEntity(
            id: 's-1',
            bookId: 'b-1',
            startTime: now,
            endTime: now,
            durationSeconds: 1500,
            chaptersCompleted: 1,
          ),
        ],
        goalProgresses: [
          ReadingGoalProgress(goal: goal, currentValue: 25, targetValue: 30),
        ],
      );

      await tester.pumpWidget(
        buildTestableWidget(StatisticsLoaded(summary: summary, goals: [goal])),
      );

      expect(find.text('Statistics & Goals'), findsOneWidget);
      expect(find.text('Daily Reading Time'), findsOneWidget);
      expect(find.text('25 min / 30 min'), findsOneWidget);
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('This Week'), findsOneWidget);
      expect(find.text('Lifetime Progress'), findsOneWidget);
      expect(find.text('Recent Sessions'), findsOneWidget);
    });

    testWidgets('Tapping Set Goal action opens goal dialog', (tester) async {
      const emptySummary = ReadingStatisticsSummary(
        totalReadingTimeSeconds: 0,
        todayReadingTimeSeconds: 0,
        weekReadingTimeSeconds: 0,
        monthReadingTimeSeconds: 0,
        yearReadingTimeSeconds: 0,
        totalChaptersCompleted: 0,
        totalCharactersRead: 0,
        totalSessionsCount: 0,
        dailyReadingSeconds: {},
        recentSessions: [],
        goalProgresses: [],
      );

      await tester.pumpWidget(
        buildTestableWidget(
          const StatisticsLoaded(summary: emptySummary, goals: []),
        ),
      );

      await tester.tap(find.byIcon(Icons.add_task_rounded));
      await tester.pumpAndSettle();

      expect(find.text('Set Daily Reading Goal'), findsOneWidget);
      expect(find.text('Save Goal'), findsOneWidget);
    });
  });
}
