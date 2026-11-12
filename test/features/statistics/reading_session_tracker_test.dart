import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_goal_entity.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_session_entity.dart';
import 'package:emotional_novel_reader/features/statistics/domain/entities/reading_statistics_summary.dart';
import 'package:emotional_novel_reader/features/statistics/domain/repositories/statistics_repository.dart';
import 'package:emotional_novel_reader/features/statistics/domain/services/reading_session_tracker.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeStatisticsRepository implements StatisticsRepository {
  final List<ReadingSessionEntity> recordedSessions = [];

  @override
  Future<Result<void>> recordSession(ReadingSessionEntity session) async {
    recordedSessions.add(session);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> deleteGoal(String id) async =>
      const Result.success(null);

  @override
  Future<Result<List<ReadingSessionEntity>>> getAllSessions() async =>
      Result.success(recordedSessions);

  @override
  Future<Result<List<ReadingGoalEntity>>> getGoals() async =>
      const Result.success([]);

  @override
  Future<Result<List<ReadingSessionEntity>>> getSessionsForBook(
    String bookId,
  ) async => Result.success(
    recordedSessions.where((s) => s.bookId == bookId).toList(),
  );

  @override
  Future<Result<ReadingStatisticsSummary>> getSummary({
    DateTime? referenceDate,
  }) async => throw UnimplementedError();

  @override
  Future<Result<void>> saveGoal(ReadingGoalEntity goal) async =>
      const Result.success(null);

  @override
  Stream<List<ReadingSessionEntity>> watchAllSessions() =>
      Stream.value(recordedSessions);

  @override
  Stream<List<ReadingGoalEntity>> watchGoals() => Stream.value([]);

  @override
  Stream<ReadingStatisticsSummary> watchSummary({DateTime? referenceDate}) =>
      throw UnimplementedError();
}

void main() {
  late FakeStatisticsRepository fakeRepo;
  late ReadingSessionTracker tracker;

  setUp(() {
    fakeRepo = FakeStatisticsRepository();
    tracker = ReadingSessionTracker(
      statisticsRepository: fakeRepo,
      minimumSessionDurationSeconds: 1, // 1 sec for fast test execution
    );
  });

  group('ReadingSessionTracker Tests', () {
    test('Starts session, tracks chapters and characters, and records session on end', () async {
      expect(tracker.isTracking, isFalse);

      tracker.startSession(bookId: 'book-1', chapterId: 'chap-1');
      expect(tracker.isTracking, isTrue);
      expect(tracker.isPaused, isFalse);

      tracker.addCharactersRead(500);
      tracker.updateChapter('chap-2', chapterCompleted: true);

      await Future<void>.delayed(const Duration(milliseconds: 1100));

      final saved = await tracker.endSession();
      expect(saved, isNotNull);
      expect(saved!.bookId, equals('book-1'));
      expect(saved.chapterId, equals('chap-2'));
      expect(saved.charactersRead, equals(500));
      expect(saved.chaptersCompleted, equals(1));
      expect(saved.durationSeconds, greaterThanOrEqualTo(1));

      expect(fakeRepo.recordedSessions.length, equals(1));
      expect(tracker.isTracking, isFalse);
    });

    test('Discards momentary bounces under minimum duration', () async {
      tracker.startSession(bookId: 'book-quick', chapterId: 'chap-quick');
      // End immediately (< 1s)
      final saved = await tracker.endSession();
      expect(saved, isNull);
      expect(fakeRepo.recordedSessions.isEmpty, isTrue);
    });

    test('Pausing stops time accumulation', () async {
      tracker.startSession(bookId: 'book-pause', chapterId: 'chap-1');
      await Future<void>.delayed(const Duration(milliseconds: 1100));
      tracker.pauseSession();
      expect(tracker.isPaused, isTrue);

      final elapsedAtPause = tracker.currentElapsedSeconds;
      await Future<void>.delayed(const Duration(milliseconds: 1000));
      // Elapsed should remain the same while paused
      expect(tracker.currentElapsedSeconds, equals(elapsedAtPause));

      tracker.resumeSession();
      expect(tracker.isPaused, isFalse);
      await tracker.endSession();
    });
  });
}
