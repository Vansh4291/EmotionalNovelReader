enum SearchScope {
  all('All'),
  books('Books'),
  content('Chapter Content');

  const SearchScope(this.displayName);
  final String displayName;
}

class BookSearchResult {
  const BookSearchResult({
    required this.id,
    required this.title,
    required this.author,
    required this.format,
    this.coverImagePath,
  });

  final String id;
  final String title;
  final String? author;
  final String format;
  final String? coverImagePath;
}

class ContentSearchResult {
  const ContentSearchResult({
    required this.chapterId,
    required this.bookId,
    required this.chapterIndex,
    required this.bookTitle,
    required this.chapterTitle,
    required this.snippet,
    this.matchPosition,
    this.rank = 0.0,
  });

  final String chapterId;
  final String bookId;
  final int chapterIndex;
  final String bookTitle;
  final String chapterTitle;
  final String snippet;
  final int? matchPosition;
  final double rank;
}
