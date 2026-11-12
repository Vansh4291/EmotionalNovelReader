import 'dart:io';

import 'package:drift/native.dart';
import 'package:emotional_novel_reader/app/router/app_router.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/library/data/repositories/book_repository_impl.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/book_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/chapter_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/search/data/repositories/search_repository_impl.dart';
import 'package:emotional_novel_reader/features/search/domain/repositories/search_repository.dart';
import 'package:emotional_novel_reader/app/di/injection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class IntegrationTestStorageService implements StorageService {
  IntegrationTestStorageService(this.rootDir);
  final Directory rootDir;

  @override
  Future<Directory> getAppLibraryDirectory() async {
    final d = Directory(p.join(rootDir.path, 'books'));
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  @override
  Future<Directory> getBookDirectory(String bookId) async {
    final d = Directory(p.join(rootDir.path, 'books', bookId));
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  @override
  Future<Directory> getTempDirectory() async => rootDir;

  @override
  Future<Directory> getBackupDirectory() async {
    final d = Directory(p.join(rootDir.path, 'backups'));
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  @override
  Future<Directory> getModelsDirectory() async {
    final d = Directory(p.join(rootDir.path, 'ai_models'));
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  @override
  Future<void> cleanupTempDirectory() async {}

  @override
  Future<String> saveBookFile({
    required String bookId,
    required String originalFileName,
    required List<int> bytes,
  }) async {
    final bDir = await getBookDirectory(bookId);
    final file = File(p.join(bDir.path, originalFileName));
    await file.writeAsBytes(bytes);
    return file.path;
  }

  @override
  Future<String> copyBookFile({
    required String bookId,
    required String originalFileName,
    required File sourceFile,
  }) async {
    final bDir = await getBookDirectory(bookId);
    final file = File(p.join(bDir.path, originalFileName));
    final reader = sourceFile.openRead();
    final writer = file.openWrite();
    await reader.pipe(writer);
    return file.path;
  }

  @override
  Future<String> saveCoverImage({
    required String bookId,
    required List<int> bytes,
  }) async {
    final bDir = await getBookDirectory(bookId);
    final file = File(p.join(bDir.path, 'cover.jpg'));
    await file.writeAsBytes(bytes);
    return file.path;
  }

  @override
  Future<String> calculateSha256(File file) async =>
      'dummy-sha-${file.path.hashCode}';

  @override
  Future<void> deleteBookDirectory(String bookId) async {}

  @override
  void assertSafeRelativePath(String basePath, String relativePath) {}
}

void main() {
  late Directory tempDir;
  late AppDatabase db;
  late BookRepository bookRepo;
  late SearchRepository searchRepo;

  setUp(() async {
    tempDir = Directory.systemTemp.createTempSync('enr_search_int_test_');
    db = AppDatabase(NativeDatabase.memory());
    final storageService = IntegrationTestStorageService(tempDir);
    bookRepo = BookRepositoryImpl(database: db, storageService: storageService);
    searchRepo = SearchRepositoryImpl(database: db);

    // Initialize DI for integration routing
    await configureDependencies(
      databaseOverride: db,
      storageOverride: storageService,
      searchRepositoryOverride: searchRepo,
    );
  });

  tearDown(() async {
    await db.close();
    await getIt.reset();
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  group('Search End-to-End Integration Tests', () {
    test('Import book -> Index into FTS -> Search content & metadata -> Delete book -> Purge FTS', () async {
      final now = DateTime.now().toUtc();

      // 1. Create and save Book
      final book = BookEntity(
        id: 'integration-book-1',
        title: 'Brave New World',
        author: 'Aldous Huxley',
        originalFileName: 'brave.epub',
        filePath: '/mock/storage/books/integration-book-1/original.epub',
        format: 'epub',
        sha256: 'sha-integration-xyz',
        fileSizeBytes: 5000,
        createdAt: now,
      );
      final saveBookResult = await bookRepo.saveBook(book);
      expect(saveBookResult.isSuccess, isTrue);

      // 2. Save Chapters with content (which automatically indexes into chapter_fts)
      final chapters = [
        const ChapterEntity(
          id: 'int-ch-1',
          bookId: 'integration-book-1',
          chapterIndex: 0,
          title: 'Chapter One',
          content: 'A squat grey building of only thirty-four storeys. Over the main entrance the words, CENTRAL LONDON HATCHERY AND CONDITIONING CENTRE.',
          wordCount: 19,
          characterCount: 130,
        ),
        const ChapterEntity(
          id: 'int-ch-2',
          bookId: 'integration-book-1',
          chapterIndex: 1,
          title: 'Chapter Two',
          content: 'Mr. Foster was left in the Decanting Room. The D.H.C. and his students stepped into the nearest lift and were carried up to the fifth floor.',
          wordCount: 26,
          characterCount: 145,
        ),
      ];
      final saveChaptersResult = await bookRepo.saveChapters(chapters);
      expect(saveChaptersResult.isSuccess, isTrue);

      // 3. Search book metadata
      final bookSearch = await searchRepo.searchBooks('Huxley');
      expect(bookSearch.isSuccess, isTrue);
      expect(bookSearch.dataOrNull!.length, 1);
      expect(bookSearch.dataOrNull!.first.title, 'Brave New World');

      // 4. Search chapter content using FTS
      final contentSearch = await searchRepo.searchContent('CENTRAL LONDON');
      expect(contentSearch.isSuccess, isTrue);
      expect(contentSearch.dataOrNull!.length, 1);
      expect(contentSearch.dataOrNull!.first.bookTitle, 'Brave New World');
      expect(contentSearch.dataOrNull!.first.chapterTitle, 'Chapter One');
      expect(contentSearch.dataOrNull!.first.snippet, contains('<mark>'));

      // 5. Scoped book content search
      final scopedMatch = await searchRepo.searchContent(
        'Decanting Room',
        bookId: 'integration-book-1',
      );
      expect(scopedMatch.isSuccess, isTrue);
      expect(scopedMatch.dataOrNull!.length, 1);
      expect(scopedMatch.dataOrNull!.first.chapterTitle, 'Chapter Two');

      // 6. Delete book (which must cascade delete chapters and delete chapter_fts entries)
      final deleteResult = await bookRepo.deleteBook('integration-book-1');
      expect(deleteResult.isSuccess, isTrue);

      // 7. Verify search returns zero results after deletion
      final postDeleteBookSearch = await searchRepo.searchBooks('Huxley');
      expect(postDeleteBookSearch.dataOrNull!, isEmpty);

      final postDeleteContentSearch = await searchRepo.searchContent(
        'CENTRAL LONDON',
      );
      expect(postDeleteContentSearch.dataOrNull!, isEmpty);
    });

    testWidgets(
      'Full UI Search & Navigation: Tapping content result navigates to Reader with initialChapterIndex',
      (tester) async {
        final now = DateTime.now().toUtc();

        // Seed book and chapter
        await bookRepo.saveBook(
          BookEntity(
            id: 'nav-book-1',
            title: 'Solaris',
            author: 'Stanislaw Lem',
            originalFileName: 'solaris.epub',
            filePath: '/mock/storage/books/nav-book-1/original.epub',
            format: 'epub',
            sha256: 'sha-nav-1',
            fileSizeBytes: 4000,
            createdAt: now,
          ),
        );
        await bookRepo.saveChapters([
          const ChapterEntity(
            id: 'sol-ch-1',
            bookId: 'nav-book-1',
            chapterIndex: 0,
            title: 'The Cosmonauts',
            content: 'At 19:00 hours, Kelvin entered the shuttle preparing for descent toward Solaris station.',
            wordCount: 13,
            characterCount: 88,
          ),
          const ChapterEntity(
            id: 'sol-ch-2',
            bookId: 'nav-book-1',
            chapterIndex: 1,
            title: 'The Oceanic Living Brain',
            content: 'The living cytoplasmic colloidal ocean stretched thousands of miles across the planetary surface.',
            wordCount: 13,
            characterCount: 100,
          ),
        ]);

        final router = createAppRouter(initialLocation: '/search');

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));
        await tester.pumpAndSettle();

        // Verify we are on SearchScreen
        expect(find.byType(TextField), findsOneWidget);

        // Enter search query targeting Chapter 2
        await tester.enterText(find.byType(TextField), 'colloidal ocean');
        // Wait for debounce 300ms
        await tester.pump(const Duration(milliseconds: 350));
        await tester.pumpAndSettle();

        // Verify result found
        expect(find.textContaining('The Oceanic Living Brain'), findsOneWidget);
        expect(find.textContaining('colloidal'), findsOneWidget);

        // Tap the content search result
        await tester.tap(find.textContaining('The Oceanic Living Brain'));
        await tester.pumpAndSettle();

        // Verify navigated to ReaderScreen with Chapter 2 loaded!
        expect(find.text('The Oceanic Living Brain'), findsWidgets);
        expect(
          find.textContaining('living cytoplasmic colloidal ocean'),
          findsOneWidget,
        );
      },
    );
  });
}
