import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/database/app_database.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/bookmark_entity.dart';
import '../../domain/entities/chapter_note_entity.dart';
import '../../domain/entities/highlight_entity.dart';
import '../../domain/repositories/annotation_repository.dart';

class AnnotationRepositoryImpl implements AnnotationRepository {
  AnnotationRepositoryImpl({required this.database, Uuid? uuid})
    : _uuid = uuid ?? const Uuid();

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

  ChapterNoteEntity _mapChapterNote(ChapterNote cn, [Chapter? chapter]) {
    return ChapterNoteEntity(
      id: cn.id,
      bookId: cn.bookId,
      chapterId: cn.chapterId,
      chapterIndex: chapter?.chapterIndex,
      chapterTitle: chapter?.title,
      content: cn.content,
      createdAt: cn.createdAt,
      updatedAt: cn.updatedAt,
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
      final existing = await database.getBookmarkForLocation(
        bookId,
        chapterId,
        location,
      );
      if (existing != null) {
        return Result.success(
          _mapBookmark(
            existing,
            chapterIndex != null && chapterTitle != null
                ? Chapter(
                    id: chapterId ?? '',
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
        return Result.error(
          NotFoundFailure('Bookmark "$bookmarkId" not found to delete'),
        );
      }
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to delete bookmark "$bookmarkId"', e, stack),
      );
    }
  }

  @override
  Future<Result<void>> deleteBookmarkAtLocation({
    required String bookId,
    String? chapterId,
    required String location,
  }) async {
    try {
      await database.deleteBookmarkAtLocation(bookId, chapterId, location);
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to delete bookmark at location', e, stack),
      );
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
      return Result.error(
        DatabaseFailure('Failed to delete bookmark for chapter', e, stack),
      );
    }
  }

  @override
  Future<Result<List<BookmarkEntity>>> getBookmarksForBook(
    String bookId,
  ) async {
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
      return Result.error(
        DatabaseFailure('Failed to get bookmarks for book "$bookId"', e, stack),
      );
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
      final bookmarks = await database.getBookmarksForChapter(
        bookId,
        chapterId,
      );
      return Result.success(bookmarks.isNotEmpty);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to check chapter bookmark status', e, stack),
      );
    }
  }

  @override
  Future<Result<bool>> isLocationBookmarked({
    required String bookId,
    String? chapterId,
    required String location,
  }) async {
    try {
      final bookmark = await database.getBookmarkForLocation(
        bookId,
        chapterId,
        location,
      );
      return Result.success(bookmark != null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to check location bookmark status', e, stack),
      );
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
        return const Result.error(
          ValidationFailure('Invalid selection offsets'),
        );
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
      return Result.error(
        DatabaseFailure('Failed to create highlight', e, stack),
      );
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
        return Result.error(
          NotFoundFailure('Highlight "$highlightId" not found'),
        );
      }

      await database.updateHighlightNote(highlightId, note);
      final updated = existing.copyWith(note: Value(note));
      return Result.success(_mapHighlight(updated));
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to update highlight note', e, stack),
      );
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
        return Result.error(
          NotFoundFailure('Highlight "$highlightId" not found'),
        );
      }

      await database.updateHighlightColor(highlightId, colorValue);
      final updated = existing.copyWith(colorValue: colorValue);
      return Result.success(_mapHighlight(updated));
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to update highlight color', e, stack),
      );
    }
  }

  @override
  Future<Result<void>> deleteHighlight(String highlightId) async {
    try {
      final rows = await database.deleteHighlight(highlightId);
      if (rows == 0) {
        return Result.error(
          NotFoundFailure('Highlight "$highlightId" not found to delete'),
        );
      }
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to delete highlight "$highlightId"', e, stack),
      );
    }
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForBook(
    String bookId,
  ) async {
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
      return Result.error(
        DatabaseFailure(
          'Failed to get highlights for book "$bookId"',
          e,
          stack,
        ),
      );
    }
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    try {
      final highlights = await database.getHighlightsForChapter(
        bookId,
        chapterId,
      );
      final chapter = await database.getChapterById(chapterId);
      return Result.success(
        highlights.map((h) => _mapHighlight(h, chapter)).toList(),
      );
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to get highlights for chapter', e, stack),
      );
    }
  }

  @override
  Stream<List<HighlightEntity>> watchHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) {
    return database.watchHighlightsForChapter(bookId, chapterId).asyncMap((
      highlights,
    ) async {
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

  // ==========================================
  // Standalone Chapter Notes Implementation
  // ==========================================

  @override
  Future<Result<ChapterNoteEntity>> createChapterNote({
    required String bookId,
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String content,
  }) async {
    try {
      final id = _uuid.v4();
      final now = DateTime.now().toUtc();

      final companion = ChapterNotesCompanion.insert(
        id: id,
        bookId: bookId,
        chapterId: chapterId,
        content: content,
        createdAt: now,
        updatedAt: now,
      );

      await database.insertChapterNote(companion);

      return Result.success(
        ChapterNoteEntity(
          id: id,
          bookId: bookId,
          chapterId: chapterId,
          chapterIndex: chapterIndex,
          chapterTitle: chapterTitle,
          content: content,
          createdAt: now,
          updatedAt: now,
        ),
      );
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to create chapter note', e, stack),
      );
    }
  }

  @override
  Future<Result<ChapterNoteEntity>> updateChapterNote({
    required String id,
    required String content,
  }) async {
    try {
      final existing = await database.getChapterNoteById(id);
      if (existing == null) {
        return Result.error(NotFoundFailure('Chapter note "$id" not found'));
      }

      await database.updateChapterNoteContent(id, content);
      final updated = existing.copyWith(
        content: content,
        updatedAt: DateTime.now().toUtc(),
      );
      final chapter = await database.getChapterById(existing.chapterId);
      return Result.success(_mapChapterNote(updated, chapter));
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to update chapter note', e, stack),
      );
    }
  }

  @override
  Future<Result<void>> deleteChapterNote(String id) async {
    try {
      final rows = await database.deleteChapterNote(id);
      if (rows == 0) {
        return Result.error(
          NotFoundFailure('Chapter note "$id" not found to delete'),
        );
      }
      return const Result.success(null);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to delete chapter note "$id"', e, stack),
      );
    }
  }

  @override
  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForBook(
    String bookId,
  ) async {
    try {
      final notes = await database.getChapterNotesForBook(bookId);
      final chapters = await database.getChaptersForBook(bookId);
      final chapterMap = {for (final c in chapters) c.id: c};

      final entities = notes.map((cn) {
        final ch = chapterMap[cn.chapterId];
        return _mapChapterNote(cn, ch);
      }).toList();

      return Result.success(entities);
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure(
          'Failed to get chapter notes for book "$bookId"',
          e,
          stack,
        ),
      );
    }
  }

  @override
  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    try {
      final notes = await database.getChapterNotesForChapter(bookId, chapterId);
      final chapter = await database.getChapterById(chapterId);
      return Result.success(
        notes.map((cn) => _mapChapterNote(cn, chapter)).toList(),
      );
    } catch (e, stack) {
      return Result.error(
        DatabaseFailure('Failed to get chapter notes for chapter', e, stack),
      );
    }
  }

  @override
  Stream<List<ChapterNoteEntity>> watchChapterNotesForBook(String bookId) {
    return database.watchChapterNotesForBook(bookId).asyncMap((notes) async {
      final chapters = await database.getChaptersForBook(bookId);
      final chapterMap = {for (final c in chapters) c.id: c};
      return notes.map((cn) {
        final ch = chapterMap[cn.chapterId];
        return _mapChapterNote(cn, ch);
      }).toList();
    });
  }
}
