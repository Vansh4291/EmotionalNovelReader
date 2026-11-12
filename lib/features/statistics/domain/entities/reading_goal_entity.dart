enum ReadingGoalType {
  timeMinutes,
  chapters;

  static ReadingGoalType fromString(String value) {
    switch (value) {
      case 'chapters':
        return ReadingGoalType.chapters;
      case 'time_minutes':
      default:
        return ReadingGoalType.timeMinutes;
    }
  }

  String toDbString() {
    switch (this) {
      case ReadingGoalType.chapters:
        return 'chapters';
      case ReadingGoalType.timeMinutes:
        return 'time_minutes';
    }
  }
}

class ReadingGoalEntity {
  const ReadingGoalEntity({
    required this.id,
    required this.goalType,
    required this.targetValue,
    this.isEnabled = true,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final ReadingGoalType goalType;
  final int targetValue;
  final bool isEnabled;
  final DateTime createdAt;
  final DateTime updatedAt;

  ReadingGoalEntity copyWith({
    String? id,
    ReadingGoalType? goalType,
    int? targetValue,
    bool? isEnabled,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ReadingGoalEntity(
      id: id ?? this.id,
      goalType: goalType ?? this.goalType,
      targetValue: targetValue ?? this.targetValue,
      isEnabled: isEnabled ?? this.isEnabled,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadingGoalEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          goalType == other.goalType &&
          targetValue == other.targetValue &&
          isEnabled == other.isEnabled &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode =>
      id.hashCode ^
      goalType.hashCode ^
      targetValue.hashCode ^
      isEnabled.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode;
}

class ReadingGoalProgress {
  const ReadingGoalProgress({
    required this.goal,
    required this.currentValue,
    required this.targetValue,
  });

  final ReadingGoalEntity goal;
  final int currentValue;
  final int targetValue;

  double get progressPercentage =>
      targetValue > 0 ? (currentValue / targetValue).clamp(0.0, 1.0) : 0.0;

  bool get isCompleted => currentValue >= targetValue;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadingGoalProgress &&
          runtimeType == other.runtimeType &&
          goal == other.goal &&
          currentValue == other.currentValue &&
          targetValue == other.targetValue;

  @override
  int get hashCode =>
      goal.hashCode ^ currentValue.hashCode ^ targetValue.hashCode;
}
