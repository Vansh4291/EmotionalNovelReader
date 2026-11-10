import '../../../../core/errors/failures.dart';
import '../entities/bookmark_entity.dart';
import '../entities/chapter_note_entity.dart';
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

  Future<Result<void>> deleteBookmarkAtLocation({
    required String bookId,
    String? chapterId,
    required String location,
  });

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

  Future<Result<bool>> isLocationBookmarked({
    required String bookId,
    String? chapterId,
    required String location,
  });

  // Highlight & Passage-Note Operations
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

  // Standalone Chapter Note Operations
  Future<Result<ChapterNoteEntity>> createChapterNote({
    required String bookId,
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String content,
  });

  Future<Result<ChapterNoteEntity>> updateChapterNote({
    required String id,
    required String content,
  });

  Future<Result<void>> deleteChapterNote(String id);

  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForBook(String bookId);

  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForChapter({
    required String bookId,
    required String chapterId,
  });

  Stream<List<ChapterNoteEntity>> watchChapterNotesForBook(String bookId);
}

