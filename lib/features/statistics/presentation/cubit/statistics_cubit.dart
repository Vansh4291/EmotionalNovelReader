import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/logging/app_logger.dart';
import '../../domain/entities/reading_goal_entity.dart';
import '../../domain/entities/reading_statistics_summary.dart';
import '../../domain/repositories/statistics_repository.dart';
import 'statistics_state.dart';

class StatisticsCubit extends Cubit<StatisticsState> {
  StatisticsCubit({required this.statisticsRepository, required this.logger})
    : super(const StatisticsInitial());

  final StatisticsRepository statisticsRepository;
  final AppLogger logger;
  StreamSubscription<ReadingStatisticsSummary>? _subscription;

  void loadStatistics({DateTime? referenceDate}) {
    emit(const StatisticsLoading());
    _subscription?.cancel();
    _subscription = statisticsRepository
        .watchSummary(referenceDate: referenceDate)
        .listen(
          (summary) async {
            final goalsResult = await statisticsRepository.getGoals();
            final goals = goalsResult.dataOrNull ?? const [];
            emit(StatisticsLoaded(summary: summary, goals: goals));
          },
          onError: (Object err, StackTrace st) {
            logger.error('Error watching statistics summary', err, st);
            emit(StatisticsError('Failed to load statistics: $err'));
          },
        );
  }

  Future<void> setGoal({
    required ReadingGoalType goalType,
    required int targetValue,
  }) async {
    final goal = ReadingGoalEntity(
      id: goalType.toDbString(),
      goalType: goalType,
      targetValue: targetValue,
      isEnabled: true,
      createdAt: DateTime.now().toUtc(),
      updatedAt: DateTime.now().toUtc(),
    );
    await statisticsRepository.saveGoal(goal);
  }

  Future<void> toggleGoal(String goalId, bool isEnabled) async {
    final goalsRes = await statisticsRepository.getGoals();
    if (goalsRes.isSuccess) {
      final goal = goalsRes.dataOrNull?.firstWhere((g) => g.id == goalId);
      if (goal != null) {
        await statisticsRepository.saveGoal(
          goal.copyWith(
            isEnabled: isEnabled,
            updatedAt: DateTime.now().toUtc(),
          ),
        );
      }
    }
  }

  Future<void> deleteGoal(String id) async {
    await statisticsRepository.deleteGoal(id);
  }

  @override
  Future<void> close() {
    _subscription?.cancel();
    return super.close();
  }
}
