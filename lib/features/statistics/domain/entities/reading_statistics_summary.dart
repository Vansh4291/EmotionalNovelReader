import 'reading_goal_entity.dart';
import 'reading_session_entity.dart';

class ReadingStatisticsSummary {
  const ReadingStatisticsSummary({
    required this.totalReadingTimeSeconds,
    required this.todayReadingTimeSeconds,
    required this.weekReadingTimeSeconds,
    required this.monthReadingTimeSeconds,
    required this.yearReadingTimeSeconds,
    required this.totalChaptersCompleted,
    required this.totalCharactersRead,
    required this.totalSessionsCount,
    required this.dailyReadingSeconds,
    required this.recentSessions,
    required this.goalProgresses,
  });

  final int totalReadingTimeSeconds;
  final int todayReadingTimeSeconds;
  final int weekReadingTimeSeconds;
  final int monthReadingTimeSeconds;
  final int yearReadingTimeSeconds;
  final int totalChaptersCompleted;
  final int totalCharactersRead;
  final int totalSessionsCount;
  final Map<DateTime, int> dailyReadingSeconds;
  final List<ReadingSessionEntity> recentSessions;
  final List<ReadingGoalProgress> goalProgresses;

  String get formattedTotalTime => _formatDuration(totalReadingTimeSeconds);
  String get formattedTodayTime => _formatDuration(todayReadingTimeSeconds);
  String get formattedWeekTime => _formatDuration(weekReadingTimeSeconds);
  String get formattedMonthTime => _formatDuration(monthReadingTimeSeconds);
  String get formattedYearTime => _formatDuration(yearReadingTimeSeconds);

  static String _formatDuration(int totalSeconds) {
    if (totalSeconds < 60) {
      return '$totalSeconds s';
    }
    final minutes = totalSeconds ~/ 60;
    if (minutes < 60) {
      return '$minutes min';
    }
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    if (remainingMinutes == 0) {
      return '$hours h';
    }
    return '$hours h $remainingMinutes min';
  }
}
