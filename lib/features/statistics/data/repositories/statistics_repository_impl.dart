import 'package:drift/drift.dart';

import '../../../../core/database/app_database.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/logging/app_logger.dart';
import '../../domain/entities/reading_goal_entity.dart';
import '../../domain/entities/reading_session_entity.dart';
import '../../domain/entities/reading_statistics_summary.dart';
import '../../domain/repositories/statistics_repository.dart';

class StatisticsRepositoryImpl implements StatisticsRepository {
  StatisticsRepositoryImpl({required this.database, required this.logger});

  final AppDatabase database;
  final AppLogger logger;

  ReadingSessionEntity _mapSession(ReadingSession row) {
    return ReadingSessionEntity(
      id: row.id,
      bookId: row.bookId,
      chapterId: row.chapterId,
      startTime: row.startTime,
      endTime: row.endTime,
      durationSeconds: row.durationSeconds,
      charactersRead: row.charactersRead,
      chaptersCompleted: row.chaptersCompleted,
    );
  }

  ReadingGoalEntity _mapGoal(ReadingGoal row) {
    return ReadingGoalEntity(
      id: row.id,
      goalType: ReadingGoalType.fromString(row.goalType),
      targetValue: row.targetValue,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  @override
  Future<Result<void>> recordSession(ReadingSessionEntity session) async {
    try {
      await database.transaction(() async {
        await database.insertReadingSession(
          ReadingSessionsCompanion(
            id: Value(session.id),
            bookId: Value(session.bookId),
            chapterId: Value(session.chapterId),
            startTime: Value(session.startTime),
            endTime: Value(session.endTime),
            durationSeconds: Value(session.durationSeconds),
            charactersRead: Value(session.charactersRead),
            chaptersCompleted: Value(session.chaptersCompleted),
          ),
        );

        if (session.durationSeconds > 0) {
          // Increment total seconds in reading progress table if it exists
          final existingProgress = await database.getReadingProgress(
            session.bookId,
          );
          if (existingProgress != null) {
            await database.saveReadingProgress(
              ReadingProgressTableCompanion(
                bookId: Value(session.bookId),
                currentLocation: Value(existingProgress.currentLocation),
                currentChapterId: Value(existingProgress.currentChapterId),
                progressPercentage: Value(existingProgress.progressPercentage),
                totalSecondsRead: Value(
                  existingProgress.totalSecondsRead + session.durationSeconds,
                ),
                updatedAt: Value(DateTime.now().toUtc()),
              ),
            );
          }

          // Update book lastReadAt
          final book = await database.getBookById(session.bookId);
          if (book != null) {
            await database.updateBook(
              book
                  .toCompanion(false)
                  .copyWith(lastReadAt: Value(DateTime.now().toUtc())),
            );
          }
        }
      });

      return const Result.success(null);
    } catch (e, st) {
      logger.error('Failed to record reading session: ${session.id}', e, st);
      return Result.error(
        DatabaseFailure('Could not record reading session: $e'),
      );
    }
  }

  @override
  Future<Result<List<ReadingSessionEntity>>> getAllSessions() async {
    try {
      final rows = await database.getAllReadingSessions();
      return Result.success(rows.map(_mapSession).toList());
    } catch (e, st) {
      logger.error('Failed to fetch all reading sessions', e, st);
      return Result.error(
        DatabaseFailure('Could not fetch reading sessions: $e'),
      );
    }
  }

  @override
  Future<Result<List<ReadingSessionEntity>>> getSessionsForBook(
    String bookId,
  ) async {
    try {
      final rows = await database.getReadingSessionsForBook(bookId);
      return Result.success(rows.map(_mapSession).toList());
    } catch (e, st) {
      logger.error('Failed to fetch sessions for book $bookId', e, st);
      return Result.error(
        DatabaseFailure('Could not fetch sessions for book: $e'),
      );
    }
  }

  @override
  Stream<List<ReadingSessionEntity>> watchAllSessions() {
    return database.watchAllReadingSessions().map(
      (rows) => rows.map(_mapSession).toList(),
    );
  }

  @override
  Future<Result<ReadingStatisticsSummary>> getSummary({
    DateTime? referenceDate,
  }) async {
    try {
      final sessionRows = await database.getAllReadingSessions();
      final goalRows = await database.getAllReadingGoals();
      final sessions = sessionRows.map(_mapSession).toList();
      final goals = goalRows.map(_mapGoal).toList();

      final summary = _computeSummary(
        sessions,
        goals,
        referenceDate ?? DateTime.now(),
      );
      return Result.success(summary);
    } catch (e, st) {
      logger.error('Failed to compute reading statistics summary', e, st);
      return Result.error(
        DatabaseFailure('Could not compute statistics summary: $e'),
      );
    }
  }

  @override
  Stream<ReadingStatisticsSummary> watchSummary({DateTime? referenceDate}) {
    return database.watchAllReadingSessions().asyncMap((sessionRows) async {
      final goalRows = await database.getAllReadingGoals();
      final sessions = sessionRows.map(_mapSession).toList();
      final goals = goalRows.map(_mapGoal).toList();
      return _computeSummary(sessions, goals, referenceDate ?? DateTime.now());
    });
  }

  @override
  Future<Result<void>> saveGoal(ReadingGoalEntity goal) async {
    try {
      await database.insertOrUpdateReadingGoal(
        ReadingGoalsCompanion(
          id: Value(goal.id),
          goalType: Value(goal.goalType.toDbString()),
          targetValue: Value(goal.targetValue),
          isEnabled: Value(goal.isEnabled),
          createdAt: Value(goal.createdAt),
          updatedAt: Value(goal.updatedAt),
        ),
      );
      return const Result.success(null);
    } catch (e, st) {
      logger.error('Failed to save reading goal: ${goal.id}', e, st);
      return Result.error(DatabaseFailure('Could not save reading goal: $e'));
    }
  }

  @override
  Future<Result<List<ReadingGoalEntity>>> getGoals() async {
    try {
      final rows = await database.getAllReadingGoals();
      return Result.success(rows.map(_mapGoal).toList());
    } catch (e, st) {
      logger.error('Failed to fetch reading goals', e, st);
      return Result.error(DatabaseFailure('Could not fetch reading goals: $e'));
    }
  }

  @override
  Stream<List<ReadingGoalEntity>> watchGoals() {
    return database.watchAllReadingGoals().map(
      (rows) => rows.map(_mapGoal).toList(),
    );
  }

  @override
  Future<Result<void>> deleteGoal(String id) async {
    try {
      await database.deleteReadingGoal(id);
      return const Result.success(null);
    } catch (e, st) {
      logger.error('Failed to delete reading goal: $id', e, st);
      return Result.error(DatabaseFailure('Could not delete reading goal: $e'));
    }
  }

  ReadingStatisticsSummary _computeSummary(
    List<ReadingSessionEntity> sessions,
    List<ReadingGoalEntity> goals,
    DateTime refDate,
  ) {
    final todayStart = DateTime(refDate.year, refDate.month, refDate.day);
    final todayEnd = DateTime(
      refDate.year,
      refDate.month,
      refDate.day,
      23,
      59,
      59,
      999,
    );
    final weekStart = todayStart.subtract(const Duration(days: 6));
    final monthStart = DateTime(refDate.year, refDate.month, 1);
    final yearStart = DateTime(refDate.year, 1, 1);

    var totalReadingTimeSeconds = 0;
    var todayReadingTimeSeconds = 0;
    var weekReadingTimeSeconds = 0;
    var monthReadingTimeSeconds = 0;
    var yearReadingTimeSeconds = 0;
    var totalChaptersCompleted = 0;
    var todayChaptersCompleted = 0;
    var totalCharactersRead = 0;

    // Daily bucket map for past 7 days
    final dailyBuckets = <DateTime, int>{};
    for (int i = 6; i >= 0; i--) {
      final d = todayStart.subtract(Duration(days: i));
      dailyBuckets[d] = 0;
    }

    for (final s in sessions) {
      final dur = s.durationSeconds;
      totalReadingTimeSeconds += dur;
      totalChaptersCompleted += s.chaptersCompleted;
      totalCharactersRead += s.charactersRead;

      final sTime = s.startTime.isUtc ? s.startTime.toLocal() : s.startTime;

      if (!sTime.isBefore(todayStart) && !sTime.isAfter(todayEnd)) {
        todayReadingTimeSeconds += dur;
        todayChaptersCompleted += s.chaptersCompleted;
      }

      if (!sTime.isBefore(weekStart) && !sTime.isAfter(todayEnd)) {
        weekReadingTimeSeconds += dur;
      }

      if (!sTime.isBefore(monthStart) && !sTime.isAfter(todayEnd)) {
        monthReadingTimeSeconds += dur;
      }

      if (!sTime.isBefore(yearStart) && !sTime.isAfter(todayEnd)) {
        yearReadingTimeSeconds += dur;
      }

      // Populate daily buckets
      final sessionDay = DateTime(sTime.year, sTime.month, sTime.day);
      if (dailyBuckets.containsKey(sessionDay)) {
        dailyBuckets[sessionDay] = (dailyBuckets[sessionDay] ?? 0) + dur;
      }
    }

    // Compute goal progresses
    final goalProgresses = <ReadingGoalProgress>[];
    for (final goal in goals.where((g) => g.isEnabled)) {
      int currentVal = 0;
      switch (goal.goalType) {
        case ReadingGoalType.timeMinutes:
          currentVal = todayReadingTimeSeconds ~/ 60;
          break;
        case ReadingGoalType.chapters:
          currentVal = todayChaptersCompleted;
          break;
      }
      goalProgresses.add(
        ReadingGoalProgress(
          goal: goal,
          currentValue: currentVal,
          targetValue: goal.targetValue,
        ),
      );
    }

    return ReadingStatisticsSummary(
      totalReadingTimeSeconds: totalReadingTimeSeconds,
      todayReadingTimeSeconds: todayReadingTimeSeconds,
      weekReadingTimeSeconds: weekReadingTimeSeconds,
      monthReadingTimeSeconds: monthReadingTimeSeconds,
      yearReadingTimeSeconds: yearReadingTimeSeconds,
      totalChaptersCompleted: totalChaptersCompleted,
      totalCharactersRead: totalCharactersRead,
      totalSessionsCount: sessions.length,
      dailyReadingSeconds: dailyBuckets,
      recentSessions: sessions.take(20).toList(),
      goalProgresses: goalProgresses,
    );
  }
}
