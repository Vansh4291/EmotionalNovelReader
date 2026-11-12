import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/bookmark_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/chapter_note_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:emotional_novel_reader/features/annotations/domain/repositories/annotation_repository.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/book_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/chapter_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/reading_progress_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_cubit.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_state.dart';
import 'package:flutter_test/flutter_test.dart';

class MockLogger implements AppLogger {
  @override
  void debug(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void info(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void warning(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void error(String message, [Object? error, StackTrace? stackTrace]) {}
}

class FakeBookRepository implements BookRepository {
  BookEntity? book;
  List<ChapterEntity> chapters = [];
  ReadingProgressEntity? progress;

  @override
  Future<Result<BookEntity>> getBookById(String id) async {
    if (book != null) return Result.success(book!);
    return const Result.error(NotFoundFailure('Book not found'));
  }

  @override
  Future<Result<List<ChapterEntity>>> getChapters(String bookId) async {
    return Result.success(chapters);
  }

  @override
  Future<Result<ChapterEntity>> getChapter(String chapterId) async {
    final ch = chapters.firstWhere((c) => c.id == chapterId);
    return Result.success(ch);
  }

  @override
  Future<Result<int>> getChapterCount(String bookId) async =>
      Result.success(chapters.length);

  @override
  Future<Result<ReadingProgressEntity?>> getReadingProgress(
    String bookId,
  ) async {
    return Result.success(progress);
  }

  @override
  Future<Result<void>> saveReadingProgress(ReadingProgressEntity p) async {
    progress = p;
    return const Result.success(null);
  }

  @override
  Future<Result<void>> deleteBook(String id) async =>
      const Result.success(null);
  @override
  Future<Result<List<BookEntity>>> getAllBooks() async =>
      Result.success(book != null ? [book!] : []);
  @override
  Future<Result<bool>> isDuplicateBook(String sha256) async =>
      const Result.success(false);
  @override
  Future<Result<void>> saveBook(BookEntity book) async =>
      const Result.success(null);
  @override
  Future<Result<void>> saveChapters(List<ChapterEntity> chapters) async =>
      const Result.success(null);
  @override
  Stream<List<BookEntity>> watchAllBooks() =>
      Stream.value(book != null ? [book!] : []);
  @override
  Stream<ReadingProgressEntity?> watchReadingProgress(String bookId) =>
      const Stream.empty();
}

class FakeAnnotationRepository implements AnnotationRepository {
  List<BookmarkEntity> bookmarks = [];
  List<HighlightEntity> highlights = [];

  @override
  Future<Result<BookmarkEntity>> addBookmark({
    required String bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String location,
    String? label,
  }) async {
    final b = BookmarkEntity(
      id: 'bm-test-${bookmarks.length + 1}',
      bookId: bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      location: location,
      label: label,
      createdAt: DateTime.now(),
    );
    bookmarks.add(b);
    return Result.success(b);
  }

  @override
  Future<Result<void>> deleteBookmark(String bookmarkId) async {
    bookmarks.removeWhere((b) => b.id == bookmarkId);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> deleteBookmarkForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    bookmarks.removeWhere(
      (b) => b.bookId == bookId && b.chapterId == chapterId,
    );
    return const Result.success(null);
  }

  @override
  Future<Result<List<BookmarkEntity>>> getBookmarksForBook(
    String bookId,
  ) async {
    return Result.success(bookmarks.where((b) => b.bookId == bookId).toList());
  }

  @override
  Future<Result<bool>> isChapterBookmarked({
    required String bookId,
    required String chapterId,
  }) async {
    return Result.success(
      bookmarks.any((b) => b.bookId == bookId && b.chapterId == chapterId),
    );
  }

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
    final h = HighlightEntity(
      id: 'hl-test-${highlights.length + 1}',
      bookId: bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      startOffset: startOffset,
      endOffset: endOffset,
      selectedText: selectedText,
      note: note,
      colorValue: colorValue,
      createdAt: DateTime.now(),
    );
    highlights.add(h);
    return Result.success(h);
  }

  @override
  Future<Result<void>> deleteHighlight(String highlightId) async {
    highlights.removeWhere((h) => h.id == highlightId);
    return const Result.success(null);
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForBook(
    String bookId,
  ) async {
    return Result.success(highlights.where((h) => h.bookId == bookId).toList());
  }

  @override
  Future<Result<List<HighlightEntity>>> getHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    return Result.success(
      highlights
          .where((h) => h.bookId == bookId && h.chapterId == chapterId)
          .toList(),
    );
  }

  @override
  Future<Result<HighlightEntity>> updateHighlightColor({
    required String highlightId,
    required int colorValue,
  }) async {
    final idx = highlights.indexWhere((h) => h.id == highlightId);
    final updated = highlights[idx].copyWith(colorValue: colorValue);
    highlights[idx] = updated;
    return Result.success(updated);
  }

  @override
  Future<Result<HighlightEntity>> updateHighlightNote({
    required String highlightId,
    required String? note,
  }) async {
    final idx = highlights.indexWhere((h) => h.id == highlightId);
    final updated = highlights[idx].copyWith(note: note);
    highlights[idx] = updated;
    return Result.success(updated);
  }

  @override
  Stream<List<BookmarkEntity>> watchBookmarksForBook(String bookId) =>
      Stream.value(bookmarks);

  @override
  Stream<List<HighlightEntity>> watchHighlightsForBook(String bookId) =>
      Stream.value(highlights);

  @override
  Stream<List<HighlightEntity>> watchHighlightsForChapter({
    required String bookId,
    required String chapterId,
  }) =>
      Stream.value(highlights.where((h) => h.chapterId == chapterId).toList());

  @override
  Future<Result<void>> deleteBookmarkAtLocation({
    required String bookId,
    String? chapterId,
    required String location,
  }) async {
    bookmarks.removeWhere(
      (b) =>
          b.bookId == bookId &&
          (chapterId == null || b.chapterId == chapterId) &&
          b.location == location,
    );
    return const Result.success(null);
  }

  @override
  Future<Result<bool>> isLocationBookmarked({
    required String bookId,
    String? chapterId,
    required String location,
  }) async {
    return Result.success(
      bookmarks.any(
        (b) =>
            b.bookId == bookId &&
            (chapterId == null || b.chapterId == chapterId) &&
            b.location == location,
      ),
    );
  }

  @override
  Future<Result<ChapterNoteEntity>> createChapterNote({
    required String bookId,
    required String chapterId,
    int? chapterIndex,
    String? chapterTitle,
    required String content,
  }) async {
    final now = DateTime.now();
    final cn = ChapterNoteEntity(
      id: 'cn-test-${now.millisecondsSinceEpoch}',
      bookId: bookId,
      chapterId: chapterId,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      content: content,
      createdAt: now,
      updatedAt: now,
    );
    return Result.success(cn);
  }

  @override
  Future<Result<ChapterNoteEntity>> updateChapterNote({
    required String id,
    required String content,
  }) async {
    return Result.success(
      ChapterNoteEntity(
        id: id,
        bookId: 'book-rdr-ann',
        chapterId: 'ch-ann-1',
        content: content,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
  }

  @override
  Future<Result<void>> deleteChapterNote(String id) async {
    return const Result.success(null);
  }

  @override
  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForBook(
    String bookId,
  ) async {
    return const Result.success([]);
  }

  @override
  Future<Result<List<ChapterNoteEntity>>> getChapterNotesForChapter({
    required String bookId,
    required String chapterId,
  }) async {
    return const Result.success([]);
  }

  @override
  Stream<List<ChapterNoteEntity>> watchChapterNotesForBook(String bookId) =>
      const Stream.empty();
}

void main() {
  late FakeBookRepository bookRepo;
  late FakeAnnotationRepository annotationRepo;
  late ReaderCubit cubit;

  final testBook = BookEntity(
    id: 'book-rdr-ann',
    title: 'The Great Odyssey',
    originalFileName: 'odyssey.txt',
    filePath: '/tmp/odyssey.txt',
    format: 'txt',
    sha256: 'sha-odyssey-12345',
    fileSizeBytes: 1024,
    createdAt: DateTime.now(),
  );

  final testChapters = [
    const ChapterEntity(
      id: 'ch-1',
      bookId: 'book-rdr-ann',
      chapterIndex: 0,
      title: 'Chapter 1: Departure',
      content: 'The journey began on a misty morning with high spirits.',
      wordCount: 10,
      characterCount: 56,
    ),
    const ChapterEntity(
      id: 'ch-2',
      bookId: 'book-rdr-ann',
      chapterIndex: 1,
      title: 'Chapter 2: The Storm',
      content: 'Waves crashed violently against the wooden bow of the ship.',
      wordCount: 10,
      characterCount: 60,
    ),
  ];

  setUp(() {
    bookRepo = FakeBookRepository()
      ..book = testBook
      ..chapters = testChapters;
    annotationRepo = FakeAnnotationRepository();

    cubit = ReaderCubit(
      bookRepository: bookRepo,
      logger: MockLogger(),
      annotationRepository: annotationRepo,
    );
  });

  tearDown(() {
    cubit.close();
  });

  group('ReaderCubit Annotation Integration Tests', () {
    test(
      'loadBook initializes bookmarks and current chapter highlights',
      () async {
        annotationRepo.bookmarks = [
          BookmarkEntity(
            id: 'b1',
            bookId: 'book-rdr-ann',
            chapterId: 'ch-1',
            chapterIndex: 0,
            chapterTitle: 'Chapter 1: Departure',
            location: '0',
            createdAt: DateTime.now(),
          ),
        ];
        annotationRepo.highlights = [
          HighlightEntity(
            id: 'h1',
            bookId: 'book-rdr-ann',
            chapterId: 'ch-1',
            chapterIndex: 0,
            chapterTitle: 'Chapter 1: Departure',
            startOffset: 0,
            endOffset: 11,
            selectedText: 'The journey',
            createdAt: DateTime.now(),
          ),
        ];

        await cubit.loadBook('book-rdr-ann');

        expect(cubit.state, isA<ReaderLoaded>());
        final state = cubit.state as ReaderLoaded;
        expect(state.bookmarks.length, 1);
        expect(state.highlights.length, 1);
        expect(state.isCurrentChapterBookmarked, isTrue);
      },
    );

    test('toggleBookmark toggles chapter bookmark status accurately', () async {
      await cubit.loadBook('book-rdr-ann');
      var state = cubit.state as ReaderLoaded;
      expect(state.isCurrentChapterBookmarked, isFalse);

      // Add bookmark
      await cubit.toggleBookmark();
      state = cubit.state as ReaderLoaded;
      expect(state.isCurrentChapterBookmarked, isTrue);
      expect(state.bookmarks.length, 1);
      expect(annotationRepo.bookmarks.length, 1);

      // Toggle off bookmark
      await cubit.toggleBookmark();
      state = cubit.state as ReaderLoaded;
      expect(state.isCurrentChapterBookmarked, isFalse);
      expect(state.bookmarks.isEmpty, isTrue);
      expect(annotationRepo.bookmarks.isEmpty, isTrue);
    });

    test('addHighlight, updateHighlightNote, updateHighlightColor, and deleteHighlight manage chapter highlights', () async {
      await cubit.loadBook('book-rdr-ann');

      // Add highlight
      final created = await cubit.addHighlight(
        startOffset: 4,
        endOffset: 11,
        selectedText: 'journey',
        colorValue: HighlightEntity.defaultHighlightColor,
      );
      expect(created, isNotNull);
      var state = cubit.state as ReaderLoaded;
      expect(state.highlights.length, 1);
      expect(state.highlights.first.selectedText, 'journey');

      // Update note
      await cubit.updateHighlightNote(
        highlightId: created!.id,
        note: 'Metaphorical voyage',
      );
      state = cubit.state as ReaderLoaded;
      expect(state.highlights.first.note, 'Metaphorical voyage');
      expect(state.highlights.first.hasNote, isTrue);

      // Update color
      await cubit.updateHighlightColor(
        highlightId: created.id,
        colorValue: 0xFFA5D6A7,
      );
      state = cubit.state as ReaderLoaded;
      expect(state.highlights.first.colorValue, 0xFFA5D6A7);

      // Delete highlight
      await cubit.deleteHighlight(created.id);
      state = cubit.state as ReaderLoaded;
      expect(state.highlights.isEmpty, isTrue);
    });

    test('goToChapter updates highlights and target location', () async {
      annotationRepo.highlights = [
        HighlightEntity(
          id: 'h2',
          bookId: 'book-rdr-ann',
          chapterId: 'ch-2',
          chapterIndex: 1,
          chapterTitle: 'Chapter 2: The Storm',
          startOffset: 0,
          endOffset: 5,
          selectedText: 'Waves',
          createdAt: DateTime.now(),
        ),
      ];

      await cubit.loadBook('book-rdr-ann');
      var state = cubit.state as ReaderLoaded;
      expect(state.highlights.isEmpty, isTrue);

      // Switch to Chapter 2 with target location
      await cubit.goToChapter(1, targetLocation: 'char:25');
      state = cubit.state as ReaderLoaded;
      expect(state.currentChapterIndex, 1);
      expect(state.progress?.currentLocation, 'char:25');
      expect(state.highlights.length, 1);
      expect(state.highlights.first.selectedText, 'Waves');
      expect(state.navigationRequest, isNotNull);
      expect(state.navigationRequest!.targetLocation, 'char:25');

      // Clear navigation request
      cubit.clearNavigationRequest();
      state = cubit.state as ReaderLoaded;
      expect(state.navigationRequest, isNull);
    });

    test('R13: Highlight reconciliation is automatically executed during loadBook and goToChapter', () async {
      // Highlight with slightly shifted offset for Chapter 1
      // ch-1 content: 'The journey began on a misty morning with high spirits.'
      // 'misty' is at index 23. Let's create highlight with startOffset: 20
      annotationRepo.highlights = [
        HighlightEntity(
          id: 'hl-shift',
          bookId: 'book-rdr-ann',
          chapterId: 'ch-1',
          startOffset: 20, // Shifted from true index 23
          endOffset: 25,
          selectedText: 'misty',
          createdAt: DateTime.now(),
        ),
      ];

      await cubit.loadBook('book-rdr-ann');
      final state = cubit.state as ReaderLoaded;
      expect(state.highlights.length, 1);
      expect(state.highlights.first.anchorStatus, AnchorStatus.reconciled);
      expect(state.highlights.first.startOffset, 23);
      expect(state.highlights.first.endOffset, 28);
    });

    test(
      'R01 & R05: Multiple bookmarks per chapter toggle at distinct locations',
      () async {
        await cubit.loadBook('book-rdr-ann');

        // Add first bookmark at char:10
        await cubit.toggleBookmark(location: 'char:10');
        var state = cubit.state as ReaderLoaded;
        expect(state.bookmarks.length, 1);
        expect(state.isLocationBookmarked('char:10'), isTrue);
        expect(state.isLocationBookmarked('char:40'), isFalse);

        // Add second bookmark at char:40 in same chapter (R01)
        await cubit.toggleBookmark(location: 'char:40');
        state = cubit.state as ReaderLoaded;
        expect(state.bookmarks.length, 2);
        expect(state.isLocationBookmarked('char:10'), isTrue);
        expect(state.isLocationBookmarked('char:40'), isTrue);

        // Toggle off only the bookmark at char:10 (R03 & R05)
        await cubit.toggleBookmark(location: 'char:10');
        state = cubit.state as ReaderLoaded;
        expect(state.bookmarks.length, 1);
        expect(state.isLocationBookmarked('char:10'), isFalse);
        expect(state.isLocationBookmarked('char:40'), isTrue);
      },
    );
  });
}
