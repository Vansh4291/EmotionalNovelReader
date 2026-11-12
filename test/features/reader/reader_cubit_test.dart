import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/book_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/chapter_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/reading_progress_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/reader/domain/entities/reader_preferences.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_cubit.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_state.dart';
import 'package:flutter_test/flutter_test.dart';

class SilentTestLogger implements AppLogger {
  const SilentTestLogger();
  @override
  void debug(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void info(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void warning(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void error(String message, [Object? error, StackTrace? stackTrace]) {}
}

class MockReaderBookRepository implements BookRepository {
  BookEntity? book;
  List<ChapterEntity> chapters = [];
  ReadingProgressEntity? savedProgress;

  @override
  Future<Result<BookEntity>> getBookById(String id) async {
    if (book != null && book!.id == id) {
      return Result.success(book!);
    }
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
    return Result.success(savedProgress);
  }

  @override
  Future<Result<void>> saveReadingProgress(
    ReadingProgressEntity progress,
  ) async {
    savedProgress = progress;
    return const Result.success(null);
  }

  @override
  Stream<List<BookEntity>> watchAllBooks() => const Stream.empty();
  @override
  Future<Result<List<BookEntity>>> getAllBooks() async =>
      const Result.success([]);
  @override
  Future<Result<bool>> isDuplicateBook(String sha256) async =>
      const Result.success(false);
  @override
  Future<Result<void>> saveBook(BookEntity book) async =>
      const Result.success(null);
  @override
  Future<Result<void>> deleteBook(String id) async =>
      const Result.success(null);
  @override
  Future<Result<void>> saveChapters(List<ChapterEntity> chapters) async =>
      const Result.success(null);
  @override
  Stream<ReadingProgressEntity?> watchReadingProgress(String bookId) =>
      const Stream.empty();
}

void main() {
  late MockReaderBookRepository repository;
  late ReaderCubit cubit;

  final testBook = BookEntity(
    id: 'book-100',
    title: 'Sword Art Online',
    author: 'Reki Kawahara',
    originalFileName: 'sao.epub',
    filePath: '/path/sao.epub',
    format: 'epub',
    sha256: 'sha-sao',
    fileSizeBytes: 5000,
    createdAt: DateTime.utc(2026, 1, 1),
  );

  const chapter1 = ChapterEntity(
    id: 'ch-1',
    bookId: 'book-100',
    chapterIndex: 0,
    title: 'Chapter 1: The Trap',
    content: 'A game where death is real.',
    wordCount: 6,
    characterCount: 27,
  );

  const chapter2 = ChapterEntity(
    id: 'ch-2',
    bookId: 'book-100',
    chapterIndex: 1,
    title: 'Chapter 2: The Beater',
    content: 'He fought alone on the front lines.',
    wordCount: 7,
    characterCount: 35,
  );

  setUp(() {
    repository = MockReaderBookRepository();
    cubit = ReaderCubit(
      bookRepository: repository,
      logger: const SilentTestLogger(),
    );
  });

  tearDown(() {
    cubit.close();
  });

  group('ReaderCubit State Management tests', () {
    test('Initial state is ReaderInitial', () {
      expect(cubit.state, isA<ReaderInitial>());
    });

    test(
      'loadBook successfully loads book and chapters into ReaderLoaded',
      () async {
        repository.book = testBook;
        repository.chapters = [chapter1, chapter2];

        await cubit.loadBook('book-100');

        expect(cubit.state, isA<ReaderLoaded>());
        final loaded = cubit.state as ReaderLoaded;
        expect(loaded.book.title, 'Sword Art Online');
        expect(loaded.chapters.length, 2);
        expect(loaded.currentChapterIndex, 0);
        expect(loaded.currentChapter.id, 'ch-1');
        expect(loaded.hasNextChapter, isTrue);
        expect(loaded.hasPreviousChapter, isFalse);
      },
    );

    test('loadBook fails with ReaderError when book is missing', () async {
      repository.book = null;
      await cubit.loadBook('missing-id');

      expect(cubit.state, isA<ReaderError>());
      final err = cubit.state as ReaderError;
      expect(err.message, contains('Book not found'));
    });

    test(
      'loadBook fails with ReaderError when chapters list is empty',
      () async {
        repository.book = testBook;
        repository.chapters = [];

        await cubit.loadBook('book-100');

        expect(cubit.state, isA<ReaderError>());
        final err = cubit.state as ReaderError;
        expect(err.message, contains('no readable chapters'));
      },
    );

    test('Chapter navigation works with boundary checks', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      await cubit.loadBook('book-100');

      // Attempt previous when at index 0 (should do nothing)
      await cubit.previousChapter();
      var loaded = cubit.state as ReaderLoaded;
      expect(loaded.currentChapterIndex, 0);

      // Next chapter to index 1
      await cubit.nextChapter();
      loaded = cubit.state as ReaderLoaded;
      expect(loaded.currentChapterIndex, 1);
      expect(loaded.currentChapter.id, 'ch-2');
      expect(loaded.hasNextChapter, isFalse);
      expect(loaded.hasPreviousChapter, isTrue);

      // Attempt next when at last index (should do nothing)
      await cubit.nextChapter();
      loaded = cubit.state as ReaderLoaded;
      expect(loaded.currentChapterIndex, 1);

      // Go back to chapter 0
      await cubit.previousChapter();
      loaded = cubit.state as ReaderLoaded;
      expect(loaded.currentChapterIndex, 0);
    });

    test('goToChapter jumps directly to specified chapter index', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      await cubit.loadBook('book-100');

      await cubit.goToChapter(1);
      final loaded = cubit.state as ReaderLoaded;
      expect(loaded.currentChapterIndex, 1);
      expect(loaded.currentChapter.id, 'ch-2');
      expect(repository.savedProgress?.currentChapterId, 'ch-2');
    });

    test('Controls visibility toggle works', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      await cubit.loadBook('book-100');

      var loaded = cubit.state as ReaderLoaded;
      expect(loaded.isControlsVisible, isFalse);

      cubit.toggleControls();
      loaded = cubit.state as ReaderLoaded;
      expect(loaded.isControlsVisible, isTrue);

      cubit.setControlsVisible(false);
      loaded = cubit.state as ReaderLoaded;
      expect(loaded.isControlsVisible, isFalse);
    });

    test('updatePreferences modifies reader styling preferences', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      await cubit.loadBook('book-100');

      const customPrefs = ReaderPreferences(
        fontSize: 22.0,
        lineHeight: 1.8,
        themeMode: ReaderThemeMode.sepia,
      );

      cubit.updatePreferences(customPrefs);
      final loaded = cubit.state as ReaderLoaded;
      expect(loaded.preferences.fontSize, 22.0);
      expect(loaded.preferences.lineHeight, 1.8);
      expect(loaded.preferences.themeMode, ReaderThemeMode.sepia);
    });

    test('updateScrollPosition debounces persistence until flushed or closed', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      await cubit.loadBook('book-100');

      // Reset saved progress tracking
      repository.savedProgress = null;

      // Fast scrolling updates scroll position
      cubit.updateScrollPosition(150.0);
      cubit.updateScrollPosition(250.0);
      cubit.updateScrollPosition(350.0);

      // Immediately after, progress has NOT been persisted yet due to debounce
      expect(repository.savedProgress, isNull);

      // Closing cubit immediately flushes pending save to SQLite
      await cubit.close();
      expect(repository.savedProgress, isNotNull);
      expect(repository.savedProgress!.currentLocation, '350.0');
    });

    test('flushProgress flushes pending scroll progress immediately without waiting for debounce', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      await cubit.loadBook('book-100');

      repository.savedProgress = null;
      cubit.updateScrollPosition(420.5);

      expect(repository.savedProgress, isNull);

      await cubit.flushProgress();

      expect(repository.savedProgress, isNotNull);
      expect(repository.savedProgress!.currentLocation, '420.5');
    });

    test('loadBook restores chapter index matching saved progress', () async {
      repository.book = testBook;
      repository.chapters = [chapter1, chapter2];
      repository.savedProgress = ReadingProgressEntity(
        bookId: 'book-100',
        currentLocation: '500.0',
        currentChapterId: 'ch-2',
        progressPercentage: 1.0,
        totalSecondsRead: 600,
        updatedAt: DateTime.now().toUtc(),
      );

      await cubit.loadBook('book-100');

      expect(cubit.state, isA<ReaderLoaded>());
      final loaded = cubit.state as ReaderLoaded;
      expect(loaded.currentChapterIndex, 1);
      expect(loaded.currentChapter.id, 'ch-2');
      expect(loaded.progress?.currentLocation, '500.0');
    });
  });
}
