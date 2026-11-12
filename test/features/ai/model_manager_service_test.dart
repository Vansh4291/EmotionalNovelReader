import 'dart:io';

import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/ai/data/services/model_manager_service_impl.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class AiTestStorageService implements StorageService {
  AiTestStorageService(this.rootDir);
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
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late StorageService storageService;
  late ModelManagerServiceImpl service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('enr_model_test_');
    storageService = AiTestStorageService(tempDir);
    service = ModelManagerServiceImpl(
      storageService: storageService,
      logger: DefaultAppLogger(),
    );
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('ModelManagerService Tests', () {
    test('evaluateDeviceCapability returns valid tier and guidance', () async {
      final capability = await service.evaluateDeviceCapability();
      expect(capability.isSupported, isTrue);
      expect(capability.estimatedRamMb, greaterThan(0));
      expect(capability.guidanceMessage, isNotEmpty);
      expect(capability.recommendedTier, isNotNull);
    });

    test('getCatalogModels returns recommended offline models', () async {
      final catalog = await service.getCatalogModels();
      expect(catalog.length, greaterThanOrEqualTo(3));
      for (final model in catalog) {
        expect(model.id, isNotEmpty);
        expect(model.name, isNotEmpty);
        expect(model.fileSizeBytes, greaterThan(0));
        expect(model.recommendedMinRamGb, greaterThanOrEqualTo(4));
      }
    });

    test('importModelFile rejects files with non-GGUF magic bytes', () async {
      final invalidFile = File(p.join(tempDir.path, 'invalid_model.bin'));
      await invalidFile.writeAsBytes([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

      final result = await service.importModelFile(invalidFile);
      expect(result.isError, isTrue);
      expect(
        result.failureOrNull?.message,
        contains('not a valid GGUF model format'),
      );
    });

    test('importModelFile successfully accepts and registers valid GGUF file', () async {
      final validGguf = File(p.join(tempDir.path, 'test_qwen.gguf'));
      // Magic bytes: 'GGUF' = 0x47, 0x47, 0x55, 0x46 followed by dummy weights
      final dummyGgufBytes = [
        0x47,
        0x47,
        0x55,
        0x46,
        0x01,
        0x00,
        0x00,
        0x00,
        0x42,
      ];
      await validGguf.writeAsBytes(dummyGgufBytes);

      final result = await service.importModelFile(validGguf);
      expect(result.isSuccess, isTrue);

      final model = result.dataOrNull!;
      expect(model.name, equals('test_qwen'));
      expect(model.quantization, equals('GGUF'));
      expect(model.isDownloaded, isTrue);
      expect(model.sha256, isNotEmpty);

      // Verify model is now returned in getInstalledModels
      final installed = await service.getInstalledModels();
      expect(installed.length, equals(1));
      expect(installed.first.id, equals(model.id));
    });

    test('deleteModel removes file and updates metadata', () async {
      final validGguf = File(p.join(tempDir.path, 'model_to_delete.gguf'));
      await validGguf.writeAsBytes([0x47, 0x47, 0x55, 0x46, 0x01]);

      final importRes = await service.importModelFile(validGguf);
      final modelId = importRes.dataOrNull!.id;

      final beforeDelete = await service.getInstalledModels();
      expect(beforeDelete.length, equals(1));

      final deleteRes = await service.deleteModel(modelId);
      expect(deleteRes.isSuccess, isTrue);

      final afterDelete = await service.getInstalledModels();
      expect(afterDelete.isEmpty, isTrue);
    });
  });
}
