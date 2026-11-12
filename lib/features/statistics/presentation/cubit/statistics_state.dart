import '../../domain/entities/reading_goal_entity.dart';
import '../../domain/entities/reading_statistics_summary.dart';

abstract class StatisticsState {
  const StatisticsState();
}

class StatisticsInitial extends StatisticsState {
  const StatisticsInitial();
}

class StatisticsLoading extends StatisticsState {
  const StatisticsLoading();
}

class StatisticsLoaded extends StatisticsState {
  const StatisticsLoaded({required this.summary, required this.goals});

  final ReadingStatisticsSummary summary;
  final List<ReadingGoalEntity> goals;
}

class StatisticsError extends StatisticsState {
  const StatisticsError(this.message);
  final String message;
}
