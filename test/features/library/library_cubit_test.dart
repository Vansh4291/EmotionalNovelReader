import 'dart:async';
import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/book_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/chapter_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/reading_progress_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/library/presentation/cubit/library_cubit.dart';
import 'package:emotional_novel_reader/features/library/presentation/cubit/library_state.dart';
import 'package:flutter_test/flutter_test.dart';

class MockBookRepository implements BookRepository {
  final _controller = StreamController<List<BookEntity>>.broadcast();
  List<BookEntity> _currentBooks = [];

  void emitBooks(List<BookEntity> books) {
    _currentBooks = books;
    _controller.add(books);
  }

  @override
  Stream<List<BookEntity>> watchAllBooks() async* {
    yield _currentBooks;
    yield* _controller.stream;
  }

  @override
  Future<Result<List<BookEntity>>> getAllBooks() async =>
      Result.success(_currentBooks);

  @override
  Future<Result<BookEntity>> getBookById(String id) async {
    final book = _currentBooks.firstWhere((b) => b.id == id);
    return Result.success(book);
  }

  @override
  Future<Result<bool>> isDuplicateBook(String sha256) async => const Result.success(false);

  @override
  Future<Result<void>> saveBook(BookEntity book) async {
    final current = List<BookEntity>.from(_currentBooks);
    current.removeWhere((b) => b.id == book.id);
    current.add(book);
    emitBooks(current);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> deleteBook(String id) async {
    final current = List<BookEntity>.from(_currentBooks);
    current.removeWhere((b) => b.id == id);
    emitBooks(current);
    return const Result.success(null);
  }

  @override
  Future<Result<void>> saveChapters(List<ChapterEntity> chapters) async =>
      const Result.success(null);

  @override
  Future<Result<List<ChapterEntity>>> getChapters(String bookId) async =>
      const Result.success([]);

  @override
  Future<Result<ChapterEntity>> getChapter(String chapterId) async =>
      const Result.error(NotFoundFailure('Not found'));

  @override
  Future<Result<int>> getChapterCount(String bookId) async => const Result.success(0);

  @override
  Future<Result<ReadingProgressEntity?>> getReadingProgress(String bookId) async =>
      const Result.success(null);

  @override
  Future<Result<void>> saveReadingProgress(ReadingProgressEntity progress) async =>
      const Result.success(null);

  @override
  Stream<ReadingProgressEntity?> watchReadingProgress(String bookId) =>
      Stream.value(null);

  void dispose() {
    _controller.close();
  }
}

void main() {
  late MockBookRepository repository;
  late LibraryCubit cubit;

  final bookA = BookEntity(
    id: '1',
    title: 'Ascendance of a Bookworm',
    author: 'Miya Kazuki',
    originalFileName: 'bookworm.epub',
    filePath: '/path/bookworm.epub',
    format: 'epub',
    sha256: 'sha1',
    fileSizeBytes: 1000,
    createdAt: DateTime.utc(2026, 1, 1),
  );

  final bookB = BookEntity(
    id: '2',
    title: 'Zaregoto Series',
    author: 'Nisio Isin',
    originalFileName: 'zaregoto.txt',
    filePath: '/path/zaregoto.txt',
    format: 'txt',
    sha256: 'sha2',
    fileSizeBytes: 2000,
    createdAt: DateTime.utc(2026, 2, 1),
  );

  final bookC = BookEntity(
    id: '3',
    title: 'Monogatari',
    author: 'Nisio Isin',
    originalFileName: 'monogatari.epub',
    filePath: '/path/monogatari.epub',
    format: 'epub',
    sha256: 'sha3',
    fileSizeBytes: 3000,
    createdAt: DateTime.utc(2026, 3, 1),
  );

  setUp(() {
    repository = MockBookRepository();
    cubit = LibraryCubit(bookRepository: repository);
  });

  tearDown(() {
    cubit.close();
    repository.dispose();
  });

  group('LibraryCubit Presentation tests', () {
    test('Initial state is LibraryInitial', () {
      expect(cubit.state, isA<LibraryInitial>());
    });

    test('loadBooks emits LibraryLoaded with repository books reactively', () async {
      repository.emitBooks([bookA, bookB]);
      cubit.loadBooks();

      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(cubit.state, isA<LibraryLoaded>());
      final loaded = cubit.state as LibraryLoaded;
      expect(loaded.allBooks.length, 2);
    });

    test('Filtering by format filters books appropriately', () async {
      repository.emitBooks([bookA, bookB, bookC]);
      cubit.loadBooks();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      cubit.setFilterOption(LibraryFilterOption.epub);
      final loadedEpub = cubit.state as LibraryLoaded;
      expect(loadedEpub.displayedBooks.length, 2);
      expect(loadedEpub.displayedBooks.every((b) => b.format == 'epub'), isTrue);

      cubit.setFilterOption(LibraryFilterOption.txt);
      final loadedTxt = cubit.state as LibraryLoaded;
      expect(loadedTxt.displayedBooks.length, 1);
      expect(loadedTxt.displayedBooks.first.title, 'Zaregoto Series');
    });

    test('Search query matches title or author case-insensitively', () async {
      repository.emitBooks([bookA, bookB, bookC]);
      cubit.loadBooks();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      cubit.setSearchQuery('nisio');
      var loaded = cubit.state as LibraryLoaded;
      expect(loaded.displayedBooks.length, 2);

      cubit.setSearchQuery('bookworm');
      loaded = cubit.state as LibraryLoaded;
      expect(loaded.displayedBooks.length, 1);
      expect(loaded.displayedBooks.first.id, '1');

      cubit.setSearchQuery('non-existent');
      loaded = cubit.state as LibraryLoaded;
      expect(loaded.displayedBooks, isEmpty);
    });

    test('Sorting orders displayed books correctly', () async {
      repository.emitBooks([bookA, bookB, bookC]);
      cubit.loadBooks();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      // Default: dateAddedDesc (Book C (March), Book B (Feb), Book A (Jan))
      var loaded = cubit.state as LibraryLoaded;
      expect(loaded.displayedBooks.map((b) => b.id).toList(), ['3', '2', '1']);

      // Sort titleAsc
      cubit.setSortOption(LibrarySortOption.titleAsc);
      loaded = cubit.state as LibraryLoaded;
      expect(loaded.displayedBooks.map((b) => b.title).toList(), [
        'Ascendance of a Bookworm',
        'Monogatari',
        'Zaregoto Series',
      ]);

      // Sort titleDesc
      cubit.setSortOption(LibrarySortOption.titleDesc);
      loaded = cubit.state as LibraryLoaded;
      expect(loaded.displayedBooks.map((b) => b.title).toList(), [
        'Zaregoto Series',
        'Monogatari',
        'Ascendance of a Bookworm',
      ]);
    });

    test('toggleViewMode toggles between list and grid', () async {
      repository.emitBooks([bookA]);
      cubit.loadBooks();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      var loaded = cubit.state as LibraryLoaded;
      expect(loaded.viewMode, LibraryViewMode.list);

      cubit.toggleViewMode();
      loaded = cubit.state as LibraryLoaded;
      expect(loaded.viewMode, LibraryViewMode.grid);

      cubit.toggleViewMode();
      loaded = cubit.state as LibraryLoaded;
      expect(loaded.viewMode, LibraryViewMode.list);
    });

    test('deleteBook removes book from repository', () async {
      repository.emitBooks([bookA, bookB]);
      cubit.loadBooks();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      await cubit.deleteBook('1');
      await Future<void>.delayed(const Duration(milliseconds: 50));

      final loaded = cubit.state as LibraryLoaded;
      expect(loaded.allBooks.length, 1);
      expect(loaded.allBooks.first.id, '2');
    });
  });
}
