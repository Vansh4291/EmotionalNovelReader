/// Domain entity representing reading progress for a book.
class ReadingProgressEntity {
  const ReadingProgressEntity({
    required this.bookId,
    required this.currentLocation,
    this.currentChapterId,
    this.progressPercentage = 0.0,
    this.totalSecondsRead = 0,
    required this.updatedAt,
  });

  final String bookId;
  final String currentLocation;
  final String? currentChapterId;
  final double progressPercentage;
  final int totalSecondsRead;
  final DateTime updatedAt;

  ReadingProgressEntity copyWith({
    String? bookId,
    String? currentLocation,
    String? currentChapterId,
    double? progressPercentage,
    int? totalSecondsRead,
    DateTime? updatedAt,
  }) {
    return ReadingProgressEntity(
      bookId: bookId ?? this.bookId,
      currentLocation: currentLocation ?? this.currentLocation,
      currentChapterId: currentChapterId ?? this.currentChapterId,
      progressPercentage: progressPercentage ?? this.progressPercentage,
      totalSecondsRead: totalSecondsRead ?? this.totalSecondsRead,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReadingProgressEntity &&
          runtimeType == other.runtimeType &&
          bookId == other.bookId &&
          currentLocation == other.currentLocation &&
          currentChapterId == other.currentChapterId &&
          progressPercentage == other.progressPercentage;

  @override
  int get hashCode => Object.hash(
    bookId,
    currentLocation,
    currentChapterId,
    progressPercentage,
  );
}
