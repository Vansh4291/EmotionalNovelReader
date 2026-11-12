import 'dart:io';

import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/annotations/data/repositories/annotation_repository_impl.dart';
import 'package:emotional_novel_reader/features/library/data/repositories/book_repository_impl.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/book_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/chapter_entity.dart';
import 'package:emotional_novel_reader/features/library/domain/entities/reading_progress_entity.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_cubit.dart';
import 'package:emotional_novel_reader/features/reader/presentation/cubit/reader_state.dart';
import 'package:emotional_novel_reader/features/search/data/repositories/search_repository_impl.dart';
import 'package:emotional_novel_reader/features/statistics/data/repositories/statistics_repository_impl.dart';
import 'package:emotional_novel_reader/features/statistics/domain/services/reading_session_tracker.dart';
import 'package:flutter_test/flutter_test.dart';

class MemoryStorageService implements StorageService {
  final Map<String, List<int>> storage = {};
  late Directory mockLibraryDir;

  MemoryStorageService() {
    mockLibraryDir = Directory.systemTemp.createTempSync(
      'enr_offline_storage_',
    );
  }

  void dispose() {
    if (mockLibraryDir.existsSync()) {
      mockLibraryDir.deleteSync(recursive: true);
    }
  }

  @override
  Future<Directory> getAppLibraryDirectory() async => mockLibraryDir;

  @override
  Future<Directory> getBookDirectory(String bookId) async {
    final d = Directory('${mockLibraryDir.path}/$bookId');
    if (!d.existsSync()) d.createSync(recursive: true);
    return d;
  }

  @override
  Future<Directory> getTempDirectory() async => mockLibraryDir;

  @override
  Future<Directory> getBackupDirectory() async {
    final d = Directory('${mockLibraryDir.path}/backups');
    if (!d.existsSync()) d.createSync(recursive: true);
    return d;
  }

  @override
  Future<Directory> getModelsDirectory() async {
    final d = Directory('${mockLibraryDir.path}/ai_models');
    if (!d.existsSync()) d.createSync(recursive: true);
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
    final path = '${mockLibraryDir.path}/$bookId/$originalFileName';
    final f = File(path);
    f.parent.createSync(recursive: true);
    f.writeAsBytesSync(bytes);
    storage[path] = bytes;
    return path;
  }

  @override
  Future<String> copyBookFile({
    required String bookId,
    required String originalFileName,
    required File sourceFile,
  }) async {
    return saveBookFile(
      bookId: bookId,
      originalFileName: originalFileName,
      bytes: sourceFile.readAsBytesSync(),
    );
  }

  @override
  Future<String> calculateSha256(File file) async => 'mock-sha-256';

  @override
  Future<String> saveCoverImage({
    required String bookId,
    required List<int> bytes,
  }) async => '${mockLibraryDir.path}/$bookId/cover.jpg';

  @override
  Future<void> deleteBookDirectory(String bookId) async {
    final d = Directory('${mockLibraryDir.path}/$bookId');
    if (d.existsSync()) {
      d.deleteSync(recursive: true);
    }
  }

  @override
  void assertSafeRelativePath(String basePath, String relativePath) {}
}

void main() {
  late Directory tempDir;
  late File persistentDbFile;
  late MemoryStorageService storageService;
  late AppLogger logger;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('enr_offline_test_');
    persistentDbFile = File('${tempDir.path}/enr_persistent.db');
    storageService = MemoryStorageService();
    logger = DefaultAppLogger();
  });

  tearDown(() {
    storageService.dispose();
    try {
      if (tempDir.existsSync()) {
        tempDir.deleteSync(recursive: true);
      }
    } catch (_) {}
  });

  group('ENR-0053: Offline Reliability & Interruption Recovery Tests', () {
    test('ENR-0053-S01 & S03: Full offline workflows (Import -> Read -> Bookmark -> Highlight -> Note -> Search -> Stats)', () async {
      // 1. Open persistent SQLite database
      final db = AppDatabase(NativeDatabase(persistentDbFile));
      final bookRepo = BookRepositoryImpl(
        database: db,
        storageService: storageService,
      );
      final searchRepo = SearchRepositoryImpl(database: db);
      final annotationRepo = AnnotationRepositoryImpl(database: db);
      final statsRepo = StatisticsRepositoryImpl(database: db, logger: logger);
      final tracker = ReadingSessionTracker(
        statisticsRepository: statsRepo,
        minimumSessionDurationSeconds: 1,
      );

      // Save a book with chapters
      final now = DateTime.now().toUtc();
      final book = BookEntity(
        id: 'book-offline-1',
        title: 'Re:Zero Volume 1',
        author: 'Tappei Nagatsuki',
        originalFileName: 'rezero.epub',
        filePath: '/data/rezero.epub',
        format: 'epub',
        sha256: 'sha-rezero-1',
        fileSizeBytes: 4096,
        createdAt: now,
      );
      await bookRepo.saveBook(book);

      const chapters = [
        ChapterEntity(
          id: 'chap-rz-1',
          bookId: 'book-offline-1',
          chapterIndex: 0,
          title: 'The End of the Beginning and the Beginning of the End',
          content: 'Subaru Natsuki found himself transported into a bustling fantasy world.',
          wordCount: 10,
          characterCount: 68,
        ),
        ChapterEntity(
          id: 'chap-rz-2',
          bookId: 'book-offline-1',
          chapterIndex: 1,
          title: 'A Struggle in the Alleyway',
          content: 'Three thugs cornered Subaru in the shadows of the royal capital.',
          wordCount: 11,
          characterCount: 65,
        ),
      ];
      await bookRepo.saveChapters(chapters);

      // 2. Perform reading session & navigation
      final cubit = ReaderCubit(
        bookRepository: bookRepo,
        logger: logger,
        annotationRepository: annotationRepo,
        sessionTracker: tracker,
      );

      await cubit.loadBook('book-offline-1');
      expect(cubit.state, isA<ReaderLoaded>());

      // Add a bookmark
      await cubit.toggleBookmark(location: 'char:15', label: 'First spawn');

      // Add a highlight
      await cubit.addHighlight(
        startOffset: 0,
        endOffset: 14,
        selectedText: 'Subaru Natsuki',
        colorValue: 0xFFFFEB3B,
        note: 'Protagonist introduction',
      );

      // Add a standalone chapter note
      await annotationRepo.createChapterNote(
        bookId: 'book-offline-1',
        chapterId: 'chap-rz-1',
        content: 'Crucial starting checkpoint.',
      );

      // Navigate to Chapter 2
      await cubit.goToChapter(1, targetLocation: 'char:0');
      await Future<void>.delayed(const Duration(milliseconds: 1100));

      // Close reader (flushes session and progress)
      await cubit.close();

      // 3. Search works 100% offline via SQLite FTS5
      final searchRes = await searchRepo.searchContent('Subaru');
      expect(searchRes.isSuccess, isTrue);
      expect(searchRes.dataOrNull!.length, equals(2));
      expect(
        searchRes.dataOrNull!.any((r) => r.chapterTitle.contains('Beginning')),
        isTrue,
      );
      expect(
        searchRes.dataOrNull!.any((r) => r.chapterTitle.contains('Alleyway')),
        isTrue,
      );

      // 4. Statistics accurately recorded
      final stats = (await statsRepo.getSummary()).dataOrNull!;
      expect(stats.totalSessionsCount, equals(1));
      expect(stats.totalChaptersCompleted, equals(1));
      expect(stats.totalReadingTimeSeconds, greaterThanOrEqualTo(1));

      // Close database to simulate app termination
      await db.close();
    });

    test('ENR-0053-S02: Process termination and device restart preserves data integrity', () async {
      // 1. Initial process session
      final db = AppDatabase(NativeDatabase(persistentDbFile));
      final bookRepo = BookRepositoryImpl(
        database: db,
        storageService: storageService,
      );
      final annotationRepo = AnnotationRepositoryImpl(database: db);

      final now = DateTime.now().toUtc();
      await bookRepo.saveBook(
        BookEntity(
          id: 'book-restart',
          title: 'Steins;Gate',
          author: 'Chiyomaru Shikura',
          originalFileName: 'sg.txt',
          filePath: '/data/sg.txt',
          format: 'txt',
          sha256: 'sha-sg',
          fileSizeBytes: 2048,
          createdAt: now,
        ),
      );

      await bookRepo.saveChapters(const [
        ChapterEntity(
          id: 'chap-sg-1',
          bookId: 'book-restart',
          chapterIndex: 0,
          title: 'Turning Point',
          content: 'El Psy Kongroo.',
          wordCount: 3,
          characterCount: 15,
        ),
      ]);

      await bookRepo.saveReadingProgress(
        ReadingProgressEntity(
          bookId: 'book-restart',
          currentLocation: 'char:10',
          currentChapterId: 'chap-sg-1',
          progressPercentage: 0.75,
          totalSecondsRead: 450,
          updatedAt: now,
        ),
      );

      await annotationRepo.addBookmark(
        bookId: 'book-restart',
        chapterId: 'chap-sg-1',
        location: 'char:10',
        label: 'Timeline shift',
      );

      // Simulate abrupt process termination
      await db.close();

      // 2. Simulate fresh app start (reopen persistent file)
      final restoredDb = AppDatabase(NativeDatabase(persistentDbFile));
      final restoredBookRepo = BookRepositoryImpl(
        database: restoredDb,
        storageService: storageService,
      );
      final restoredAnnotationRepo = AnnotationRepositoryImpl(
        database: restoredDb,
      );

      // Verify book
      final book = (await restoredBookRepo.getBookById('book-restart'))
          .dataOrNull;
      expect(book, isNotNull);
      expect(book!.title, equals('Steins;Gate'));

      // Verify reading progress survived intact
      final progress = (await restoredBookRepo.getReadingProgress(
        'book-restart',
      )).dataOrNull;
      expect(progress, isNotNull);
      expect(progress!.currentLocation, equals('char:10'));
      expect(progress.progressPercentage, equals(0.75));
      expect(progress.totalSecondsRead, equals(450));

      // Verify bookmark survived intact
      final bookmarks = (await restoredAnnotationRepo.getBookmarksForBook(
        'book-restart',
      )).dataOrNull;
      expect(bookmarks, isNotNull);
      expect(bookmarks!.length, equals(1));
      expect(bookmarks.first.label, equals('Timeline shift'));

      await restoredDb.close();
    });

    test(
      'ENR-0053-S04: Missing source files handled gracefully without crashing',
      () async {
        final db = AppDatabase(NativeDatabase(persistentDbFile));
        final bookRepo = BookRepositoryImpl(
          database: db,
          storageService: storageService,
        );

        // Save a book pointing to a nonexistent file path
        await bookRepo.saveBook(
          BookEntity(
            id: 'book-missing-file',
            title: 'Ghost Book',
            originalFileName: 'vanished.epub',
            filePath: '/data/nonexistent/vanished.epub',
            format: 'epub',
            sha256: 'sha-vanished',
            fileSizeBytes: 1024,
            createdAt: DateTime.now().toUtc(),
          ),
        );

        // Deleting a book whose file is already missing on disk completes cleanly without crash
        final deleteRes = await bookRepo.deleteBook('book-missing-file');
        expect(deleteRes.isSuccess, isTrue);

        // Book record removed from database
        final checkRes = await bookRepo.getBookById('book-missing-file');
        expect(checkRes.isError, isTrue);
        expect(checkRes.failureOrNull, isA<NotFoundFailure>());

        await db.close();
      },
    );

    test('ENR-0053-S05: Large library volume and bulk chapters maintain query consistency', () async {
      final db = AppDatabase(NativeDatabase(persistentDbFile));
      final bookRepo = BookRepositoryImpl(
        database: db,
        storageService: storageService,
      );
      final searchRepo = SearchRepositoryImpl(database: db);

      // Bulk insert 20 books each with 10 chapters (200 chapters total)
      final now = DateTime.now().toUtc();
      for (int b = 0; b < 20; b++) {
        final bId = 'bulk-book-$b';
        await bookRepo.saveBook(
          BookEntity(
            id: bId,
            title: 'Volume $b: The Epic Tale',
            author: 'Master Author',
            originalFileName: 'book_$b.epub',
            filePath: '/data/book_$b.epub',
            format: 'epub',
            sha256: 'sha-bulk-$b',
            fileSizeBytes: 5000,
            createdAt: now.add(Duration(minutes: b)),
          ),
        );

        final chList = List.generate(
          10,
          (c) => ChapterEntity(
            id: 'chap-$b-$c',
            bookId: bId,
            chapterIndex: c,
            title: 'Chapter $c of Vol $b',
            content:
                'Content paragraph with keyword magical_sword in chapter $c of book $b.',
            wordCount: 11,
            characterCount: 65,
          ),
        );
        await bookRepo.saveChapters(chList);
      }

      // Query all books
      final allBooks = (await bookRepo.getAllBooks()).dataOrNull!;
      expect(allBooks.length, equals(20));

      // Full-text search across 200 chapters
      final searchRes = await searchRepo.searchContent('magical_sword');
      expect(searchRes.isSuccess, isTrue);
      // Returns top results up to limit
      expect(searchRes.dataOrNull!.length, greaterThanOrEqualTo(20));

      await db.close();
    });
  });
}
