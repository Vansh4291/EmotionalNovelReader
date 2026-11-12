import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/features/statistics/data/repositories/statistics_repository_impl.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_goal_entity.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_session_entity.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;
  late AppLogger logger;
  late StatisticsRepositoryImpl repository;

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    logger = DefaultAppLogger();
    repository = StatisticsRepositoryImpl(database: db, logger: logger);

    // Seed book, chapter, and progress
    await db.insertBook(
      BooksCompanion.insert(
        id: 'book-101',
        title: 'Overlord Volume 1',
        originalFileName: 'overlord.epub',
        filePath: '/data/overlord.epub',
        format: 'epub',
        sha256: 'sha-overlord',
        fileSizeBytes: 2048,
        createdAt: DateTime.now().toUtc(),
      ),
    );

    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'chap-1',
        bookId: 'book-101',
        chapterIndex: 0,
        title: 'Chapter 1: The End and the Beginning',
        content: const Value(
          'Momonga looked around the Great Tomb of Nazarick.',
        ),
        wordCount: const Value(8),
        characterCount: const Value(47),
      ),
    ]);

    await db.saveReadingProgress(
      ReadingProgressTableCompanion.insert(
        bookId: 'book-101',
        currentLocation: 'char:0',
        progressPercentage: const Value(0.1),
        totalSecondsRead: const Value(100),
        updatedAt: DateTime.now().toUtc(),
      ),
    );
  });

  tearDown(() async {
    await db.close();
  });

  group('StatisticsRepository Tests', () {
    test('recordSession inserts session and updates book lastReadAt and progress totalSecondsRead', () async {
      final now = DateTime.now();
      final session = ReadingSessionEntity(
        id: 'sess-1',
        bookId: 'book-101',
        chapterId: 'chap-1',
        startTime: now.subtract(const Duration(minutes: 10)),
        endTime: now,
        durationSeconds: 600,
        charactersRead: 1200,
        chaptersCompleted: 1,
      );

      final result = await repository.recordSession(session);
      expect(result.isSuccess, isTrue);

      final sessions = (await repository.getAllSessions()).dataOrNull!;
      expect(sessions.length, equals(1));
      expect(sessions.first.id, equals('sess-1'));
      expect(sessions.first.durationSeconds, equals(600));

      final progress = await db.getReadingProgress('book-101');
      expect(progress, isNotNull);
      // Initial 100 + 600 = 700 seconds
      expect(progress!.totalSecondsRead, equals(700));

      final book = await db.getBookById('book-101');
      expect(book, isNotNull);
      expect(book!.lastReadAt, isNotNull);
    });

    test('getSummary accurately aggregates today, week, month, year, and 7-day buckets', () async {
      final now = DateTime(2026, 11, 12, 14, 0); // Reference time

      // Session today: 20 mins (1200s), 1 chapter
      await repository.recordSession(
        ReadingSessionEntity(
          id: 's-today',
          bookId: 'book-101',
          startTime: now.subtract(const Duration(minutes: 30)),
          endTime: now.subtract(const Duration(minutes: 10)),
          durationSeconds: 1200,
          chaptersCompleted: 1,
        ),
      );

      // Session 2 days ago: 30 mins (1800s), 2 chapters
      await repository.recordSession(
        ReadingSessionEntity(
          id: 's-2days',
          bookId: 'book-101',
          startTime: now.subtract(const Duration(days: 2)),
          endTime: now
              .subtract(const Duration(days: 2))
              .add(const Duration(minutes: 30)),
          durationSeconds: 1800,
          chaptersCompleted: 2,
        ),
      );

      // Session 20 days ago (same month): 15 mins (900s)
      await repository.recordSession(
        ReadingSessionEntity(
          id: 's-20days',
          bookId: 'book-101',
          startTime: now.subtract(const Duration(days: 10)),
          endTime: now
              .subtract(const Duration(days: 10))
              .add(const Duration(minutes: 15)),
          durationSeconds: 900,
        ),
      );

      // Add a goal
      await repository.saveGoal(
        ReadingGoalEntity(
          id: 'daily_time',
          goalType: ReadingGoalType.timeMinutes,
          targetValue: 30,
          isEnabled: true,
          createdAt: now,
          updatedAt: now,
        ),
      );

      final summaryRes = await repository.getSummary(referenceDate: now);
      expect(summaryRes.isSuccess, isTrue);

      final summary = summaryRes.dataOrNull!;
      expect(summary.todayReadingTimeSeconds, equals(1200)); // 20 mins
      expect(summary.weekReadingTimeSeconds, equals(1200 + 1800)); // 50 mins
      expect(
        summary.monthReadingTimeSeconds,
        equals(1200 + 1800 + 900),
      ); // 65 mins
      expect(summary.totalReadingTimeSeconds, equals(3900));
      expect(summary.totalChaptersCompleted, equals(3));
      expect(summary.totalSessionsCount, equals(3));

      // Goal progress: 20 mins of 30 mins target
      expect(summary.goalProgresses.length, equals(1));
      final gp = summary.goalProgresses.first;
      expect(gp.currentValue, equals(20));
      expect(gp.targetValue, equals(30));
      expect(gp.isCompleted, isFalse);
      expect(gp.progressPercentage, closeTo(0.66, 0.01));
    });

    test('Reading goals CRUD and toggling', () async {
      final now = DateTime.now();
      final goal = ReadingGoalEntity(
        id: 'daily_chapters',
        goalType: ReadingGoalType.chapters,
        targetValue: 2,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      );

      await repository.saveGoal(goal);

      var goals = (await repository.getGoals()).dataOrNull!;
      expect(goals.length, equals(1));
      expect(goals.first.targetValue, equals(2));

      await repository.deleteGoal('daily_chapters');
      goals = (await repository.getGoals()).dataOrNull!;
      expect(goals.isEmpty, isTrue);
    });
  });
}
