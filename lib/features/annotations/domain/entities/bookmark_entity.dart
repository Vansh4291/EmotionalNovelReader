class BookmarkEntity {
  const BookmarkEntity({
    required this.id,
    required this.bookId,
    this.chapterId,
    this.chapterIndex,
    this.chapterTitle,
    required this.location,
    this.label,
    required this.createdAt,
  });

  final String id;
  final String bookId;
  final String? chapterId;
  final int? chapterIndex;
  final String? chapterTitle;
  final String location;
  final String? label;
  final DateTime createdAt;

  /// Parses character offset from location string (e.g. 'char:1250' or '1250').
  int? get charOffset {
    if (location.startsWith('char:')) {
      return int.tryParse(location.substring(5));
    }
    return int.tryParse(location);
  }

  /// Builds a canonical stable location anchor from character offset.
  static String formatLocation(int charOffset) => 'char:$charOffset';

  BookmarkEntity copyWith({
    String? id,
    String? bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    String? location,
    String? label,
    DateTime? createdAt,
  }) {
    return BookmarkEntity(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      chapterId: chapterId ?? this.chapterId,
      chapterIndex: chapterIndex ?? this.chapterIndex,
      chapterTitle: chapterTitle ?? this.chapterTitle,
      location: location ?? this.location,
      label: label ?? this.label,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BookmarkEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          bookId == other.bookId &&
          chapterId == other.chapterId &&
          location == other.location &&
          label == other.label;

  @override
  int get hashCode => Object.hash(id, bookId, chapterId, location, label);
}
