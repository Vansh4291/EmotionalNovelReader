import '../../../../core/errors/failures.dart';
import '../entities/reading_goal_entity.dart';
import '../entities/reading_session_entity.dart';
import '../entities/reading_statistics_summary.dart';

abstract class StatisticsRepository {
  Future<Result<void>> recordSession(ReadingSessionEntity session);
  Future<Result<List<ReadingSessionEntity>>> getAllSessions();
  Future<Result<List<ReadingSessionEntity>>> getSessionsForBook(String bookId);
  Stream<List<ReadingSessionEntity>> watchAllSessions();

  Future<Result<ReadingStatisticsSummary>> getSummary({
    DateTime? referenceDate,
  });
  Stream<ReadingStatisticsSummary> watchSummary({DateTime? referenceDate});

  Future<Result<void>> saveGoal(ReadingGoalEntity goal);
  Future<Result<List<ReadingGoalEntity>>> getGoals();
  Stream<List<ReadingGoalEntity>> watchGoals();
  Future<Result<void>> deleteGoal(String id);
}
