import 'package:drift/native.dart';
import 'package:emotional_novel_reader/app/di/injection.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/security/secure_storage_service.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/cloud_ai_service.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/local_ai_runtime.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/model_manager_service.dart';
import 'package:emotional_novel_reader/features/ai/domain/services/reader_rag_service.dart';
import 'package:emotional_novel_reader/features/ai/presentation/cubit/cloud_ai_cubit.dart';
import 'package:emotional_novel_reader/features/ai/presentation/cubit/model_manager_cubit.dart';
import 'package:emotional_novel_reader/features/backup/domain/services/backup_service.dart';
import 'package:emotional_novel_reader/features/backup/presentation/cubit/backup_cubit.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/tts/data/services/tts_audio_handler.dart';
import 'package:emotional_novel_reader/features/tts/domain/services/tts_service.dart';
import 'package:emotional_novel_reader/features/tts/domain/services/tts_text_parser.dart';
import 'package:emotional_novel_reader/features/tts/presentation/cubit/tts_cubit.dart';
import 'package:emotional_novel_reader/features/library/presentation/cubit/library_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() async {
    if (getIt.isRegistered<AppDatabase>()) {
      await getIt<AppDatabase>().close();
    }
    await getIt.reset();
  });

  group('Dependency Injection composition root tests', () {
    test('Registers all core and feature dependencies cleanly', () async {
      final testDb = AppDatabase(NativeDatabase.memory());
      await configureDependencies(databaseOverride: testDb);

      expect(getIt.isRegistered<AppLogger>(), isTrue);
      expect(getIt.isRegistered<StorageService>(), isTrue);
      expect(getIt.isRegistered<SecureStorageService>(), isTrue);
      expect(getIt.isRegistered<AppDatabase>(), isTrue);
      expect(getIt.isRegistered<BookRepository>(), isTrue);
      expect(getIt.isRegistered<LibraryCubit>(), isTrue);
      expect(getIt.isRegistered<BackupService>(), isTrue);
      expect(getIt.isRegistered<BackupCubit>(), isTrue);
      expect(getIt.isRegistered<TtsTextParser>(), isTrue);
      expect(getIt.isRegistered<TtsService>(), isTrue);
      expect(getIt.isRegistered<TtsAudioHandler>(), isTrue);
      expect(getIt.isRegistered<TtsCubit>(), isTrue);
      expect(getIt.isRegistered<LocalAiRuntime>(), isTrue);
      expect(getIt.isRegistered<ModelManagerService>(), isTrue);
      expect(getIt.isRegistered<ReaderRagService>(), isTrue);
      expect(getIt.isRegistered<ModelManagerCubit>(), isTrue);
      expect(getIt.isRegistered<CloudAiService>(), isTrue);
      expect(getIt.isRegistered<CloudAiCubit>(), isTrue);

      final cubit = getIt<LibraryCubit>();
      expect(cubit, isNotNull);
      await cubit.close();
    });
  });
}
