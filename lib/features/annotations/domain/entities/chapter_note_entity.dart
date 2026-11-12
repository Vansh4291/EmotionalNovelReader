class ChapterNoteEntity {
  const ChapterNoteEntity({
    required this.id,
    required this.bookId,
    required this.chapterId,
    this.chapterIndex,
    this.chapterTitle,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String bookId;
  final String chapterId;
  final int? chapterIndex;
  final String? chapterTitle;
  final String content;
  final DateTime createdAt;
  final DateTime updatedAt;

  ChapterNoteEntity copyWith({
    String? id,
    String? bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    String? content,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ChapterNoteEntity(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      chapterId: chapterId ?? this.chapterId,
      chapterIndex: chapterIndex ?? this.chapterIndex,
      chapterTitle: chapterTitle ?? this.chapterTitle,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChapterNoteEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          bookId == other.bookId &&
          chapterId == other.chapterId &&
          content == other.content;

  @override
  int get hashCode => Object.hash(id, bookId, chapterId, content);
}
