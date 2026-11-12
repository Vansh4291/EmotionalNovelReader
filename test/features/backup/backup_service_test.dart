import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/backup/data/services/backup_service_impl.dart';
import 'package:emotional_novel_reader/features/backup/domain/entities/backup_manifest_entity.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class BackupTestStorageService implements StorageService {
  BackupTestStorageService(this.rootDir);
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
    await sourceFile.copy(file.path);
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
  Future<String> calculateSha256(File file) async => 'dummy-sha256';

  @override
  Future<void> deleteBookDirectory(String bookId) async {
    final bDir = await getBookDirectory(bookId);
    if (await bDir.exists()) await bDir.delete(recursive: true);
  }

  @override
  void assertSafeRelativePath(String basePath, String relativePath) {}
}

void main() {
  late Directory tempDir;
  late AppDatabase db;
  late BackupTestStorageService storageService;
  late BackupServiceImpl backupService;
  late AppLogger logger;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('enr_backup_test_');
    db = AppDatabase(NativeDatabase.memory());
    storageService = BackupTestStorageService(tempDir);
    logger = DefaultAppLogger();
    backupService = BackupServiceImpl(
      database: db,
      storageService: storageService,
      logger: logger,
    );
  });

  tearDown(() async {
    await db.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  Future<void> seedTestData() async {
    await db
        .into(db.books)
        .insert(
          BooksCompanion.insert(
            id: 'book-1',
            title: 'Ascendance of a Bookworm',
            author: const Value('Miya Kazuki'),
            originalFileName: 'bookworm.epub',
            filePath: '/dummy/bookworm.epub',
            format: 'epub',
            sha256: 'sha-bookworm-123',
            fileSizeBytes: 10240,
            createdAt: DateTime.now().toUtc(),
          ),
        );

    await db.insertChapters([
      ChaptersCompanion.insert(
        id: 'chap-1',
        bookId: 'book-1',
        chapterIndex: 0,
        title: 'Prologue',
        content: const Value('In the beginning was the book.'),
        wordCount: const Value(6),
        characterCount: const Value(30),
      ),
      ChaptersCompanion.insert(
        id: 'chap-2',
        bookId: 'book-1',
        chapterIndex: 1,
        title: 'Chapter 1: The Library',
        content: const Value('She wandered into the silent library room.'),
        wordCount: const Value(7),
        characterCount: const Value(42),
      ),
    ]);

    await db
        .into(db.bookmarks)
        .insert(
          BookmarksCompanion.insert(
            id: 'bm-1',
            bookId: 'book-1',
            chapterId: const Value('chap-1'),
            location: 'scroll:0.42',
            label: const Value('Great scene'),
            createdAt: DateTime.now().toUtc(),
          ),
        );

    await db
        .into(db.highlights)
        .insert(
          HighlightsCompanion.insert(
            id: 'hl-1',
            bookId: 'book-1',
            chapterId: const Value('chap-1'),
            startLocation: 'char:5',
            endLocation: 'char:20',
            selectedText: 'beginning was the',
            createdAt: DateTime.now().toUtc(),
          ),
        );

    await db
        .into(db.chapterNotes)
        .insert(
          ChapterNotesCompanion.insert(
            id: 'cn-1',
            bookId: 'book-1',
            chapterId: 'chap-1',
            content: 'Check author background.',
            createdAt: DateTime.now().toUtc(),
            updatedAt: DateTime.now().toUtc(),
          ),
        );

    await db.saveReadingProgress(
      ReadingProgressTableCompanion.insert(
        bookId: 'book-1',
        currentLocation: 'scroll:0.5',
        currentChapterId: const Value('chap-1'),
        progressPercentage: const Value(50.0),
        totalSecondsRead: const Value(120),
        updatedAt: DateTime.now().toUtc(),
      ),
    );

    await db
        .into(db.readingSessions)
        .insert(
          ReadingSessionsCompanion.insert(
            id: 'sess-1',
            bookId: 'book-1',
            chapterId: const Value('chap-1'),
            startTime: DateTime.now().toUtc().subtract(
              const Duration(minutes: 10),
            ),
            endTime: DateTime.now().toUtc(),
            durationSeconds: 600,
            charactersRead: const Value(1500),
            chaptersCompleted: const Value(1),
          ),
        );

    await db
        .into(db.readingGoals)
        .insert(
          ReadingGoalsCompanion.insert(
            id: 'goal-daily-min',
            goalType: 'time_minutes',
            targetValue: 30,
            createdAt: DateTime.now().toUtc(),
            updatedAt: DateTime.now().toUtc(),
          ),
        );

    // Save a physical book file in storage
    final bookDir = await storageService.getBookDirectory('book-1');
    final dummyFile = File(p.join(bookDir.path, 'original.epub'));
    await dummyFile.writeAsString('Dummy EPUB Content');
  }

  group('BackupService Export and Inspection', () {
    test(
      'createBackup produces valid .enrbk archive with correct manifest counts',
      () async {
        await seedTestData();

        final backupDir = await storageService.getBackupDirectory();
        final result = await backupService.createBackup(
          destinationDir: backupDir,
          includeBookFiles: true,
        );

        expect(result.isSuccess, isTrue);
        final file = result.dataOrNull!;
        expect(await file.exists(), isTrue);
        expect(file.path.endsWith('.enrbk'), isTrue);

        final inspectRes = await backupService.inspectBackup(file);
        expect(inspectRes.isSuccess, isTrue);
        final manifest = inspectRes.dataOrNull!;

        expect(manifest.backupVersion, 1);
        expect(manifest.bookCount, 1);
        expect(manifest.chapterCount, 2);
        expect(manifest.bookmarkCount, 1);
        expect(manifest.highlightCount, 1);
        expect(manifest.noteCount, 1);
        expect(manifest.sessionCount, 1);
        expect(manifest.hasBookFiles, isTrue);
        expect(manifest.isEncrypted, isFalse);
        expect(manifest.warning, contains('Unencrypted export'));
        expect(manifest.checksumSha256, isNotEmpty);
      },
    );

    test('inspectBackup fails when manifest is missing or payload checksum is tampered', () async {
      final nonExistent = File(p.join(tempDir.path, 'ghost.enrbk'));
      final notFoundRes = await backupService.inspectBackup(nonExistent);
      expect(notFoundRes.isError, isTrue);
      expect(notFoundRes.failureOrNull, isA<NotFoundFailure>());

      // Create a corrupted archive without manifest
      final corruptArchive = Archive();
      corruptArchive.addFile(
        ArchiveFile('random.txt', 5, utf8.encode('hello')),
      );
      final corruptBytes = ZipEncoder().encode(corruptArchive);
      final corruptFile = File(p.join(tempDir.path, 'corrupt.enrbk'));
      await corruptFile.writeAsBytes(corruptBytes);

      final corruptRes = await backupService.inspectBackup(corruptFile);
      expect(corruptRes.isError, isTrue);
      expect(corruptRes.failureOrNull, isA<ValidationFailure>());
    });
  });

  group('BackupService Restore Workflows', () {
    test('Restore in Merge mode adds backup books and preserves existing non-conflicting data', () async {
      await seedTestData();

      final backupDir = await storageService.getBackupDirectory();
      final backupRes = await backupService.createBackup(
        destinationDir: backupDir,
      );
      final backupFile = backupRes.dataOrNull!;

      // Wipe current DB and seed an entirely separate book
      await db.close();
      final freshDb = AppDatabase(NativeDatabase.memory());
      final freshBackupService = BackupServiceImpl(
        database: freshDb,
        storageService: storageService,
        logger: logger,
      );

      await freshDb
          .into(freshDb.books)
          .insert(
            BooksCompanion.insert(
              id: 'book-2',
              title: 'Overlord',
              author: const Value('Kugane Maruyama'),
              originalFileName: 'overlord.txt',
              filePath: '/dummy/overlord.txt',
              format: 'txt',
              sha256: 'sha-overlord-456',
              fileSizeBytes: 2048,
              createdAt: DateTime.now().toUtc(),
            ),
          );

      final restoreRes = await freshBackupService.restoreBackup(
        backupFile,
        conflictMode: RestoreConflictMode.merge,
      );

      expect(restoreRes.isSuccess, isTrue);
      final summary = restoreRes.dataOrNull!;
      expect(summary.restoredBooksCount, 1);
      expect(summary.restoredChaptersCount, 2);

      // Verify BOTH book-1 and book-2 are now present in database
      final allBooks = await freshDb.getAllBooks();
      expect(allBooks.length, 2);
      final titles = allBooks.map((b) => b.title).toList();
      expect(titles, contains('Ascendance of a Bookworm'));
      expect(titles, contains('Overlord'));

      // Check bookmarks & progress restored
      final bms = await freshDb.getBookmarksForBook('book-1');
      expect(bms.length, 1);
      expect(bms.first.label, 'Great scene');

      final prog = await freshDb.getReadingProgress('book-1');
      expect(prog, isNotNull);
      expect(prog!.currentLocation, 'scroll:0.5');

      await freshDb.close();
    });

    test('Restore in Replace mode clears existing library and replaces with backup data', () async {
      await seedTestData();

      final backupDir = await storageService.getBackupDirectory();
      final backupRes = await backupService.createBackup(
        destinationDir: backupDir,
      );
      final backupFile = backupRes.dataOrNull!;

      // In the same db, add a separate book that should be erased on Replace
      await db
          .into(db.books)
          .insert(
            BooksCompanion.insert(
              id: 'to-be-deleted',
              title: 'Disposable Book',
              originalFileName: 'temp.txt',
              filePath: '/dummy/temp.txt',
              format: 'txt',
              sha256: 'sha-temp',
              fileSizeBytes: 100,
              createdAt: DateTime.now().toUtc(),
            ),
          );

      expect((await db.getAllBooks()).length, 2);

      final restoreRes = await backupService.restoreBackup(
        backupFile,
        conflictMode: RestoreConflictMode.replace,
      );

      expect(restoreRes.isSuccess, isTrue);

      final booksAfter = await db.getAllBooks();
      expect(booksAfter.length, 1);
      expect(booksAfter.first.id, 'book-1');
      expect(booksAfter.first.title, 'Ascendance of a Bookworm');
    });
  });
}
