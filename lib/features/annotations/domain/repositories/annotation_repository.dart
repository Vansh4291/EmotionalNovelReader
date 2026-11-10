import '../../../../core/errors/failures.dart';
import '../entities/bookmark_entity.dart';
import '../entities/highlight_entity.dart';

abstract interface class AnnotationRepository {
  // Bookmark Operations
  Future<Result<BookmarkEntity>> addBookmark({
    required String bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String location,
    String? label,
  });

  Future<Result<void>> deleteBookmark(String bookmarkId);

  Future<Result<void>> deleteBookmarkForChapter({
    required String bookId,
    required String chapterId,
  });

  Future<Result<List<BookmarkEntity>>> getBookmarksForBook(String bookId);

  Stream<List<BookmarkEntity>> watchBookmarksForBook(String bookId);

  Future<Result<bool>> isChapterBookmarked({
    required String bookId,
    required String chapterId,
  });

  // Highlight & Note Operations
  Future<Result<HighlightEntity>> createHighlight({
    required String bookId,
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required int startOffset,
    required int endOffset,
    required String selectedText,
    String? note,
    int colorValue = HighlightEntity.defaultHighlightColor,
  });

  Future<Result<HighlightEntity>> updateHighlightNote({
    required String highlightId,
    required String? note,
  });

  Future<Result<HighlightEntity>> updateHighlightColor({
    required String highlightId,
    required int colorValue,
  });

  Future<Result<void>> deleteHighlight(String highlightId);

  Future<Result<List<HighlightEntity>>> getHighlightsForBook(String bookId);

  Future<Result<List<HighlightEntity>>> getHighlightsForChapter({
    required String bookId,
    required String chapterId,
  });

  Stream<List<HighlightEntity>> watchHighlightsForChapter({
    required String bookId,
    required String chapterId,
  });

  Stream<List<HighlightEntity>> watchHighlightsForBook(String bookId);
}

