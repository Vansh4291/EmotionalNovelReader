class ReadingSessionEntity {
  const ReadingSessionEntity({
    required this.id,
    required this.bookId,
    this.chapterId,
    required this.startTime,
    required this.endTime,
    required this.durationSeconds,
    this.charactersRead = 0,
    this.chaptersCompleted = 0,
  });

  final String id;
  final String bookId;
  final String? chapterId;
  final DateTime startTime;
  final DateTime endTime;
  final int durationSeconds;
  final int charactersRead;
  final int chaptersCompleted;

  ReadingSessionEntity copyWith({
    String? id,
    String? bookId,
    String? chapterId,
    DateTime? startTime,
    DateTime? endTime,
    int? durationSeconds,
    int? charactersRead,
    int? chaptersCompleted,
  }) {
    return ReadingSessionEntity(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      chapterId: chapterId ?? this.chapterId,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      charactersRead: charactersRead ?? this.charactersRead,
      chaptersCompleted: chaptersCompleted ?? this.chaptersCompleted,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadingSessionEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          bookId == other.bookId &&
          chapterId == other.chapterId &&
          startTime == other.startTime &&
          endTime == other.endTime &&
          durationSeconds == other.durationSeconds &&
          charactersRead == other.charactersRead &&
          chaptersCompleted == other.chaptersCompleted;

  @override
  int get hashCode =>
      id.hashCode ^
      bookId.hashCode ^
      chapterId.hashCode ^
      startTime.hashCode ^
      endTime.hashCode ^
      durationSeconds.hashCode ^
      charactersRead.hashCode ^
      chaptersCompleted.hashCode;
}
