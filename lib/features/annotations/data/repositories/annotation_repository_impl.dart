import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/database/app_database.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/bookmark_entity.dart';
import '../../domain/entities/highlight_entity.dart';
import '../../domain/repositories/annotation_repository.dart';

class AnnotationRepositoryImpl implements AnnotationRepository {
  AnnotationRepositoryImpl({
    required this.database,
    Uuid? uuid,
  }) : _uuid = uuid ?? const Uuid();

  final AppDatabase database;
  final Uuid _uuid;

  BookmarkEntity _mapBookmark(Bookmark b, [Chapter? chapter]) {
    return BookmarkEntity(
      id: b.id,
      bookId: b.bookId,
      chapterId: b.chapterId,
      chapterIndex: chapter?.chapterIndex,
      chapterTitle: chapter?.title,
      location: b.location,
      label: b.label,
      createdAt: b.createdAt,
    );
  }

  HighlightEntity _mapHighlight(Highlight h, [Chapter? chapter]) {
    return HighlightEntity(
      id: h.id,
      bookId: h.bookId,
      chapterId: h.chapterId,
      chapterIndex: chapter?.chapterIndex,
      chapterTitle: chapter?.title,
      startOffset: int.tryParse(h.startLocation) ?? 0,
      endOffset: int.tryParse(h.endLocation) ?? 0,
      selectedText: h.selectedText,
      note: h.note,
      colorValue: h.colorValue,
      createdAt: h.createdAt,
    );
  }

  // ==========================================
  // Bookmarks Implementation
  // ==========================================

  @override
  Future<Result<BookmarkEntity>> addBookmark({
    required String bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String location,
    String? label,
  }) async {
    try {
      // Prevent duplicate bookmark for the same chapter & location
      if (chapterId != null) {
        final existing = await database.getBookmarkForChapter(bookId, chapterId);
        if (existing != null) {
          return Result.success(
            _mapBookmark(
              existing,
              chapterIndex != null && chapterTitle != null
                  ? Chapter(
                      id: chapterId,
                      bookId: bookId,
                      chapterIndex: chapterIndex,
                      title: chapterTitle,
                      content: '',
                      wordCount: 0,
                      characterCount: 0,
                    )
                  : null,
            ),
          );
        }
      }

      final id = _uuid.v4();
      final now = DateTime.now().toUtc();

      final companion = BookmarksCompanion.insert(
        id: id,
        bookId: bookId,
        chapterId: Value(chapterId),
        location: location,
        label: Value(label ?? chapterTitle),
        createdAt: now,
      );

      await database.insertBookmark(companion);

      return Result.success(
        BookmarkEntity(
          id: id,
          bookId: bookId,
          chapterId: chapterId,
          chapterIndex: chapterIndex,
          chapterTitle: chapterTitle,
          location: location,
          label: label ?? chapterTitle,
          createdAt: now,
        ),
      );
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to add bookmark', e, stack));
    }
  }

  @override
  Future<Result<void>> deleteBookmark(String bookmarkId) async {
    try {
      final rows = await database.deleteBookmark(bookmarkId);
      if (rows == 0) {
        return Result.error(NotFoundFailure('Bookmark "$bookmarkId" not found to delete'));
      }
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to delete bookmark "$bookmarkId"', e, stack));
    }
  }

  @override
  Future<Result<void>> deleteBookmarkForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    try {
      await database.deleteBookmarkForChapter(bookId, chapterId);
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to delete bookmark for chapter', e, stack));
    }
  }

  @override
  Future<Result<List<BookmarkEntity>>> getBookmarksForBook(String bookId) async {
    try {
      final bookmarks = await database.getBookmarksForBook(bookId);
      final chapters = await database.getChaptersForBook(bookId);
      final chapterMap = {for (final c in chapters) c.id: c};

      final entities = bookmarks.map((b) {
        final ch = b.chapterId != null ? chapterMap[b.chapterId!] : null;
        return _mapBookmark(b, ch);
      }).toList();

      return Result.success(entities);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to get bookmarks for book "$bookId"', e, stack));
    }
  }

  @override
  Stream<List<BookmarkEntity>> watchBookmarksForBook(String bookId) {
    return database.watchBookmarksForBook(bookId).asyncMap((bookmarks) async {
      final chapters = await database.getChaptersForBook(bookId);
      final chapterMap = {for (final c in chapters) c.id: c};
      return bookmarks.map((b) {
        final ch = b.chapterId != null ? chapterMap[b.chapterId!] : null;
        return _mapBookmark(b, ch);
      }).toList();
    });
  }

  @override
  Future<Result<bool>> isChapterBookmarked({
    required String bookId,
    required String chapterId,
  }) async {
    try {
      final bookmark = await database.getBookmarkForChapter(bookId, chapterId);
      return Result.success(bookmark != null);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to check chapter bookmark status', e, stack));
    }
  }

  // ==========================================
  // Highlights & Notes Implementation
  // ==========================================

  @override
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
  }) async {
    try {
      if (startOffset < 0 || endOffset < startOffset) {
        return const Result.error(ValidationFailure('Invalid selection offsets'));
      }

      final id = _uuid.v4();
      final now = DateTime.now().toUtc();

      final companion = HighlightsCompanion.insert(
        id: id,
        bookId: bookId,
        chapterId: Value(chapterId),
        startLocation: startOffset.toString(),
        endLocation: endOffset.toString(),
        selectedText: selectedText,
        note: Value(note),
        colorValue: Value(colorValue),
        createdAt: now,
      );

      await database.insertHighlight(companion);

      return Result.success(
        HighlightEntity(
          id: id,
          bookId: bookId,
          chapterId: chapterId,
          chapterIndex: chapterIndex,
          chapterTitle: chapterTitle,
          startOffset: startOffset,
          endOffset: endOffset,
          selectedText: selectedText,
          note: note,
          colorValue: colorValue,
          createdAt: now,
        ),
      );
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to create highlight', e, stack));
    }
  }

  @override
  Future<Result<HighlightEntity>> updateHighlightNote({
    required String highlightId,
    required String? note,
  }) async {
    try {
      final existing = await database.getHighlightById(highlightId);
      if (existing == null) {
        return Result.error(NotFoundFailure('Highlight "$highlightId" not found'));
      }

      await database.updateHighlightNote(highlightId, note);
      final updated = existing.copyWith(note: Value(note));
      return Result.success(_mapHighlight(updated));
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to update highlight note', e, stack));
    }
  }

  @override
  Future<Result<HighlightEntity>> updateHighlightColor({
    required String highlightId,
    required int colorValue,
  }) async {
    try {
      final existing = await database.getHighlightById(highlightId);
      if (existing == null) {
        return Result.error(NotFoundFailure('Highlight "$highlightId" not found'));
      }

      await database.updateHighlightColor(highlightId, colorValue);
      final updated = existing.copyWith(colorValue: colorValue);
      return Result.success(_mapHighlight(updated));
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to update highlight color', e, stack));
    }
  }

  @override
  Future<Result<void>> deleteHighlight(String highlightId) async {
    try {
      final rows = await database.deleteHighlight(highlightId);
      if (rows == 0) {
        return Result.error(NotFoundFailure('Highlight "$highlightId" not found to delete'));
      }
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to delete highlight "$highlightId"', e, stack));
    }
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForBook(String bookId) async {
    try {
      final highlights = await database.getHighlightsForBook(bookId);
      final chapters = await database.getChaptersForBook(bookId);
      final chapterMap = {for (final c in chapters) c.id: c};

      final entities = highlights.map((h) {
        final ch = h.chapterId != null ? chapterMap[h.chapterId!] : null;
        return _mapHighlight(h, ch);
      }).toList();

      return Result.success(entities);
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to get highlights for book "$bookId"', e, stack));
    }
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    try {
      final highlights = await database.getHighlightsForChapter(bookId, chapterId);
      final chapter = await database.getChapterById(chapterId);
      return Result.success(highlights.map((h) => _mapHighlight(h, chapter)).toList());
    } catch (e, stack) {
      return Result.error(DatabaseFailure('Failed to get highlights for chapter', e, stack));
    }
  }

  @override
  Stream<List<HighlightEntity>> watchHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) {
    return database.watchHighlightsForChapter(bookId, chapterId).asyncMap((highlights) async {
      final chapter = await database.getChapterById(chapterId);
      return highlights.map((h) => _mapHighlight(h, chapter)).toList();
    });
  }

  @override
  Stream<List<HighlightEntity>> watchHighlightsForBook(String bookId) {
    return database.watchHighlightsForBook(bookId).asyncMap((highlights) async {
      final chapters = await database.getChaptersForBook(bookId);
      final chapterMap = {for (final c in chapters) c.id: c};
      return highlights.map((h) {
        final ch = h.chapterId != null ? chapterMap[h.chapterId!] : null;
        return _mapHighlight(h, ch);
      }).toList();
    });
  }
}

