import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/extractor_factory.dart';
import 'package:emotional_novel_reader/features/import/domain/services/format_detector.dart';
import 'package:emotional_novel_reader/features/import/domain/services/import_service.dart';
import 'package:emotional_novel_reader/features/library/data/repositories/book_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class TestStorageService implements StorageService {
  TestStorageService(this.rootDir);

  final Directory rootDir;

  @override
  Future<Directory> getAppLibraryDirectory() async {
    final dir = Directory(p.join(rootDir.path, 'books'));
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  @override
  Future<Directory> getBookDirectory(String bookId) async {
    final dir = Directory(p.join(rootDir.path, 'books', bookId));
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  @override
  Future<Directory> getTempDirectory() async {
    final dir = Directory(p.join(rootDir.path, 'temp'));
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  @override
  Future<void> cleanupTempDirectory() async {
    final dir = Directory(p.join(rootDir.path, 'temp'));
    if (await dir.exists()) await dir.delete(recursive: true);
  }

  @override
  Future<String> saveBookFile({
    required String bookId,
    required String originalFileName,
    required List<int> bytes,
  }) async {
    final bookDir = await getBookDirectory(bookId);
    final target = File(p.join(bookDir.path, originalFileName));
    await target.writeAsBytes(bytes);
    return target.path;
  }

  @override
  Future<String> copyBookFile({
    required String bookId,
    required String originalFileName,
    required File sourceFile,
  }) async {
    final bookDir = await getBookDirectory(bookId);
    final target = File(p.join(bookDir.path, originalFileName));
    final reader = sourceFile.openRead();
    final writer = target.openWrite();
    await reader.pipe(writer);
    return target.path;
  }

  @override
  Future<String> saveCoverImage({
    required String bookId,
    required List<int> bytes,
  }) async {
    final bookDir = await getBookDirectory(bookId);
    final target = File(p.join(bookDir.path, 'cover.jpg'));
    await target.writeAsBytes(bytes);
    return target.path;
  }

  @override
  Future<String> calculateSha256(File file) async {
    final bytes = await file.readAsBytes();
    return sha256.convert(bytes).toString();
  }

  @override
  Future<void> deleteBookDirectory(String bookId) async {
    final bookDir = Directory(p.join(rootDir.path, 'books', bookId));
    if (await bookDir.exists()) await bookDir.delete(recursive: true);
  }

  @override
  void assertSafeRelativePath(String basePath, String relativePath) {
    final canonicalBase = p.canonicalize(basePath);
    final canonicalTarget = p.canonicalize(p.join(basePath, relativePath));
    if (!canonicalTarget.startsWith(canonicalBase)) {
      throw const SecurityFailure('Path traversal attempt detected');
    }
  }
}

class TestLogger implements AppLogger {
  const TestLogger();

  @override
  void debug(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void info(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void warning(String message, [Object? error, StackTrace? stackTrace]) {}
  @override
  void error(String message, [Object? error, StackTrace? stackTrace]) {}
}

void main() {
  late Directory tempDir;
  late AppDatabase db;
  late StorageService storageService;
  late BookRepositoryImpl bookRepository;
  late FormatDetector formatDetector;
  late ExtractorFactory extractorFactory;
  late ImportService importService;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('enr_import_test_');
    db = AppDatabase(NativeDatabase.memory());
    storageService = TestStorageService(tempDir);

    bookRepository = BookRepositoryImpl(
      database: db,
      storageService: storageService,
    );
    formatDetector = const FormatDetector();
    extractorFactory = const ExtractorFactory();
    importService = ImportService(
      storageService: storageService,
      bookRepository: bookRepository,
      formatDetector: formatDetector,
      extractorFactory: extractorFactory,
      logger: const TestLogger(),
    );
  });

  tearDown(() async {
    await db.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('ImportService Pipeline tests', () {
    test('Successfully imports a TXT novel with chapters and initial progress', () async {
      final sampleTxt = File('${tempDir.path}/sample_novel.txt');
      await sampleTxt.writeAsString('''Chapter 1: The Awakening
The morning sun beamed across the quiet valley.

Chapter 2: The Departure
He picked up his pack and stepped outside into the unknown.
''');

      final progressEvents = <double>[];
      final result = await importService.importDocument(
        sampleTxt,
        onProgress: (p, status) => progressEvents.add(p),
      );

      expect(result.isSuccess, isTrue);
      final book = result.dataOrNull!;
      expect(book.title, 'sample_novel');
      expect(book.format, 'txt');
      expect(book.sha256, isNotEmpty);
      expect(progressEvents, isNotEmpty);

      // Verify stored book in repository
      final allBooksResult = await bookRepository.getAllBooks();
      expect(allBooksResult.isSuccess, isTrue);
      final allBooks = allBooksResult.dataOrNull!;
      expect(allBooks.length, 1);
      expect(allBooks.first.id, book.id);

      // Verify chapters in repository
      final chaptersResult = await bookRepository.getChapters(book.id);
      expect(chaptersResult.isSuccess, isTrue);
      final chapters = chaptersResult.dataOrNull!;
      expect(chapters.length, 2);
      expect(chapters[0].title, 'Chapter 1: The Awakening');
      expect(chapters[0].content, contains('The morning sun beamed'));
      expect(chapters[1].title, 'Chapter 2: The Departure');

      // Verify initial reading progress in repository
      final progressResult = await bookRepository.getReadingProgress(book.id);
      expect(progressResult.isSuccess, isTrue);
      final progress = progressResult.dataOrNull;
      expect(progress, isNotNull);
      expect(progress!.currentLocation, '0');
      expect(progress.progressPercentage, 0.0);

      // Verify original file exists in storage sandbox
      final storedFile = File(book.filePath);
      expect(await storedFile.exists(), isTrue);
    });

    test('Rejects duplicate book import with matching SHA-256', () async {
      final sampleTxt = File('${tempDir.path}/dup_test.txt');
      await sampleTxt.writeAsString('Unique story content that should not be duplicated.');

      final firstResult = await importService.importDocument(sampleTxt);
      expect(firstResult.isSuccess, isTrue);

      // Attempt importing the exact same file
      final secondResult = await importService.importDocument(sampleTxt);
      expect(secondResult.isSuccess, isFalse);
      expect(secondResult.failureOrNull?.message, contains('already been imported into your library'));

      // Ensure library still has only 1 book
      final allBooksResult = await bookRepository.getAllBooks();
      expect(allBooksResult.dataOrNull!.length, 1);
    });

    test('Rejects non-existent file cleanly', () async {
      final ghostFile = File('${tempDir.path}/ghost.txt');
      final result = await importService.importDocument(ghostFile);

      expect(result.isSuccess, isFalse);
      expect(result.failureOrNull?.message, contains('does not exist'));
    });

    test('Rejects empty 0-byte file', () async {
      final emptyFile = File('${tempDir.path}/empty.txt');
      await emptyFile.writeAsString('');

      final result = await importService.importDocument(emptyFile);
      expect(result.isSuccess, isFalse);
      expect(result.failureOrNull?.message, contains('empty (0 bytes)'));
    });

    test('Cleans up storage directory on extraction failure leaving no orphaned files', () async {
      // Create a corrupted or unsupported file with txt extension containing null bytes
      final corruptedFile = File('${tempDir.path}/corrupt.txt');
      await corruptedFile.writeAsBytes([0x00, 0x01, 0x02, 0x00, 0xFF]);

      final result = await importService.importDocument(corruptedFile);
      expect(result.isSuccess, isFalse);

      // Check that books directory in storage has no orphaned directories
      final booksDir = Directory('${tempDir.path}/books');
      if (await booksDir.exists()) {
        final subDirs = await booksDir.list().toList();
        expect(subDirs, isEmpty);
      }
    });
  });
}
