/// Domain entity representing a chapter of a book.
class ChapterEntity {
  const ChapterEntity({
    required this.id,
    required this.bookId,
    required this.chapterIndex,
    required this.title,
    required this.content,
    this.href,
    this.wordCount = 0,
    this.characterCount = 0,
  });

  final String id;
  final String bookId;
  final int chapterIndex;
  final String title;
  final String content;
  final String? href;
  final int wordCount;
  final int characterCount;

  ChapterEntity copyWith({
    String? id,
    String? bookId,
    int? chapterIndex,
    String? title,
    String? content,
    String? href,
    int? wordCount,
    int? characterCount,
  }) {
    return ChapterEntity(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      chapterIndex: chapterIndex ?? this.chapterIndex,
      title: title ?? this.title,
      content: content ?? this.content,
      href: href ?? this.href,
      wordCount: wordCount ?? this.wordCount,
      characterCount: characterCount ?? this.characterCount,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChapterEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          bookId == other.bookId &&
          chapterIndex == other.chapterIndex &&
          title == other.title;

  @override
  int get hashCode => Object.hash(id, bookId, chapterIndex, title);
}
