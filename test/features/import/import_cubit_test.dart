import 'dart:io';

import 'package:drift/native.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/import/domain/extractors/extractor_factory.dart';
import 'package:emotional_novel_reader/features/import/domain/services/format_detector.dart';
import 'package:emotional_novel_reader/features/import/domain/services/import_service.dart';
import 'package:emotional_novel_reader/features/import/presentation/cubit/import_cubit.dart';
import 'package:emotional_novel_reader/features/import/presentation/cubit/import_state.dart';
import 'package:emotional_novel_reader/features/library/data/repositories/book_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class CubitTestStorageService implements StorageService {
  CubitTestStorageService(this.rootDir);
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

void main() {
  late Directory tempDir;
  late AppDatabase db;
  late ImportService importService;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('enr_cubit_test_');
    db = AppDatabase(NativeDatabase.memory());
    final storage = CubitTestStorageService(tempDir);
    final repo = BookRepositoryImpl(database: db, storageService: storage);
    importService = ImportService(
      storageService: storage,
      bookRepository: repo,
      formatDetector: const FormatDetector(),
      extractorFactory: const ExtractorFactory(),
      logger: const SilentTestLogger(),
    );
  });

  tearDown(() async {
    await db.close();
    if (await tempDir.exists()) await tempDir.delete(recursive: true);
  });

  group('ImportCubit State Machine tests', () {
    test('Initial state is ImportInitial', () {
      final cubit = ImportCubit(importService: importService);
      expect(cubit.state, isA<ImportInitial>());
      cubit.close();
    });

    test('pickAndImport returns to ImportInitial when picker returns null (user cancel)', () async {
      final cubit = ImportCubit(
        importService: importService,
        filePickerOverride: () async => null,
      );

      final states = <ImportState>[];
      final subscription = cubit.stream.listen(states.add);

      await cubit.pickAndImport();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(states, [isA<ImportSelecting>(), isA<ImportInitial>()]);

      await subscription.cancel();
      await cubit.close();
    });

    test('pickAndImport transitions to ImportSuccess on valid file', () async {
      final novelFile = File('${tempDir.path}/valid_novel.txt');
      await novelFile.writeAsString('Chapter 1\nA wondrous story starts.');

      final cubit = ImportCubit(
        importService: importService,
        filePickerOverride: () async => novelFile.path,
      );

      final states = <ImportState>[];
      final subscription = cubit.stream.listen(states.add);

      await cubit.pickAndImport();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(states.any((s) => s is ImportSelecting), isTrue);
      expect(states.any((s) => s is ImportInProgress), isTrue);
      expect(states.last, isA<ImportSuccess>());

      final successState = states.last as ImportSuccess;
      expect(successState.book.title, 'valid_novel');

      await subscription.cancel();
      await cubit.close();
    });

    test(
      'pickAndImport transitions to ImportError on invalid empty file',
      () async {
        final emptyFile = File('${tempDir.path}/empty.txt');
        await emptyFile.writeAsString('');

        final cubit = ImportCubit(
          importService: importService,
          filePickerOverride: () async => emptyFile.path,
        );

        final states = <ImportState>[];
        final subscription = cubit.stream.listen(states.add);

        await cubit.pickAndImport();
        await Future<void>.delayed(const Duration(milliseconds: 50));

        expect(states.last, isA<ImportError>());
        final errorState = states.last as ImportError;
        expect(errorState.message, contains('empty (0 bytes)'));

        cubit.reset();
        expect(cubit.state, isA<ImportInitial>());

        await subscription.cancel();
        await cubit.close();
      },
    );
  });
}
