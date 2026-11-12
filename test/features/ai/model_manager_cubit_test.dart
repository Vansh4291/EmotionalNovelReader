import 'dart:io';

import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/ai/data/services/local_ai_runtime_impl.dart';
import 'package:emotional_novel_reader/features/ai/data/services/model_manager_service_impl.dart';
import 'package:emotional_novel_reader/features/ai/domain/entities/ai_model_entity.dart';
import 'package:emotional_novel_reader/features/ai/presentation/cubit/model_manager_cubit.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;

class CubitTestAiStorageService implements StorageService {
  CubitTestAiStorageService(this.rootDir);
  final Directory rootDir;

  @override
  Future<Directory> getAppLibraryDirectory() async =>
      Directory(p.join(rootDir.path, 'books'))..createSync(recursive: true);

  @override
  Future<Directory> getBookDirectory(String bookId) async =>
      Directory(p.join(rootDir.path, 'books', bookId))
        ..createSync(recursive: true);

  @override
  Future<Directory> getTempDirectory() async => rootDir;

  @override
  Future<Directory> getBackupDirectory() async =>
      Directory(p.join(rootDir.path, 'backups'))..createSync(recursive: true);

  @override
  Future<Directory> getModelsDirectory() async =>
      Directory(p.join(rootDir.path, 'ai_models'))..createSync(recursive: true);

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
  late LocalAiRuntimeImpl runtime;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('enr_cubit_test_');
    storageService = CubitTestAiStorageService(tempDir);
    service = ModelManagerServiceImpl(
      storageService: storageService,
      logger: DefaultAppLogger(),
    );
    runtime = LocalAiRuntimeImpl(logger: DefaultAppLogger());
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('ModelManagerCubit Tests', () {
    test('Initial state is clean and not loading', () {
      final cubit = ModelManagerCubit(
        modelManagerService: service,
        aiRuntime: runtime,
      );
      expect(cubit.state.isLoading, isFalse);
      expect(cubit.state.installedModels, isEmpty);
      expect(cubit.state.loadedModel, isNull);
    });

    test(
      'loadModelsAndCapability loads catalog, installed models and capability',
      () async {
        final cubit = ModelManagerCubit(
          modelManagerService: service,
          aiRuntime: runtime,
        );

        await cubit.loadModelsAndCapability();

        expect(cubit.state.isLoading, isFalse);
        expect(cubit.state.catalogModels, isNotEmpty);
        expect(cubit.state.capability, isNotNull);
        expect(cubit.state.capability!.isSupported, isTrue);
      },
    );

    test(
      'pickAndImportModel does nothing when user cancels file picker',
      () async {
        final cubit = ModelManagerCubit(
          modelManagerService: service,
          aiRuntime: runtime,
          filePickerOverride: () async => null,
        );

        await cubit.pickAndImportModel();

        expect(cubit.state.isLoading, isFalse);
        expect(cubit.state.errorMessage, isNull);
      },
    );

    test('pickAndImportModel emits error on invalid model file', () async {
      final invalidFile = File(p.join(tempDir.path, 'bad.bin'));
      await invalidFile.writeAsBytes([0x00, 0x11, 0x22, 0x33]);

      final cubit = ModelManagerCubit(
        modelManagerService: service,
        aiRuntime: runtime,
        filePickerOverride: () async => invalidFile.path,
      );

      await cubit.pickAndImportModel();

      expect(cubit.state.isLoading, isFalse);
      expect(cubit.state.errorMessage, isNotNull);
      expect(cubit.state.errorMessage, contains('GGUF'));
    });

    test(
      'pickAndImportModel imports valid GGUF file and emits success',
      () async {
        final validFile = File(p.join(tempDir.path, 'valid.gguf'));
        await validFile.writeAsBytes([0x47, 0x47, 0x55, 0x46, 0x01, 0x02]);

        final cubit = ModelManagerCubit(
          modelManagerService: service,
          aiRuntime: runtime,
          filePickerOverride: () async => validFile.path,
        );

        await cubit.pickAndImportModel();

        expect(cubit.state.isLoading, isFalse);
        expect(cubit.state.errorMessage, isNull);
        expect(cubit.state.installedModels.length, equals(1));
        expect(cubit.state.statusMessage, contains('Successfully imported'));
      },
    );

    test(
      'loadModelIntoRuntime and unloadCurrentModel manage runtime lifecycle',
      () async {
        final validFile = File(p.join(tempDir.path, 'test.gguf'));
        await validFile.writeAsBytes([0x47, 0x47, 0x55, 0x46, 0x01]);

        final model = AiModelEntity(
          id: 'test-model',
          name: 'Test Model',
          version: '1.0',
          parameterSize: '1B',
          quantization: 'Q4',
          fileSizeBytes: 100,
          filePath: validFile.path,
          sha256: 'abc',
          license: 'MIT',
          isDownloaded: true,
        );

        final cubit = ModelManagerCubit(
          modelManagerService: service,
          aiRuntime: runtime,
        );

        await cubit.loadModelIntoRuntime(model);
        expect(cubit.state.loadedModel, isNotNull);
        expect(cubit.state.loadedModel!.id, equals('test-model'));
        expect(runtime.isModelLoaded, isTrue);

        await cubit.unloadCurrentModel();
        expect(cubit.state.loadedModel, isNull);
        expect(runtime.isModelLoaded, isFalse);
      },
    );
  });
}
