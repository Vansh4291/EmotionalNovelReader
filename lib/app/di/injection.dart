import 'package:get_it/get_it.dart';

import '../../core/database/app_database.dart';
import '../../core/logging/app_logger.dart';
import '../../core/security/secure_storage_service.dart';
import '../../core/storage/storage_service.dart';
import '../../features/annotations/data/repositories/annotation_repository_impl.dart';
import '../../features/annotations/domain/repositories/annotation_repository.dart';
import '../../features/annotations/presentation/cubit/annotation_cubit.dart';
import '../../features/backup/data/services/backup_service_impl.dart';
import '../../features/backup/domain/services/backup_service.dart';
import '../../features/backup/presentation/cubit/backup_cubit.dart';
import '../../features/import/domain/extractors/extractor_factory.dart';
import '../../features/import/domain/services/format_detector.dart';
import '../../features/import/domain/services/import_service.dart';
import '../../features/import/presentation/cubit/import_cubit.dart';
import '../../features/library/data/repositories/book_repository_impl.dart';
import '../../features/library/domain/repositories/book_repository.dart';
import '../../features/library/presentation/cubit/library_cubit.dart';
import '../../features/reader/presentation/cubit/reader_cubit.dart';
import '../../features/search/data/repositories/search_repository_impl.dart';
import '../../features/search/domain/repositories/search_repository.dart';
import '../../features/search/presentation/cubit/search_cubit.dart';
import '../../features/statistics/data/repositories/statistics_repository_impl.dart';
import '../../features/statistics/domain/repositories/statistics_repository.dart';
import '../../features/statistics/domain/services/reading_session_tracker.dart';
import '../../features/statistics/presentation/cubit/statistics_cubit.dart';
import '../../features/ai/data/services/cloud_ai_service_impl.dart';
import '../../features/ai/data/services/local_ai_runtime_impl.dart';
import '../../features/ai/data/services/model_manager_service_impl.dart';
import '../../features/ai/data/services/reader_rag_service_impl.dart';
import '../../features/ai/domain/services/cloud_ai_service.dart';
import '../../features/ai/domain/services/local_ai_runtime.dart';
import '../../features/ai/domain/services/model_manager_service.dart';
import '../../features/ai/domain/services/reader_rag_service.dart';
import '../../features/ai/presentation/cubit/ai_chat_cubit.dart';
import '../../features/ai/presentation/cubit/cloud_ai_cubit.dart';
import '../../features/ai/presentation/cubit/model_manager_cubit.dart';
import '../../features/tts/data/services/flutter_tts_service_impl.dart';
import '../../features/tts/domain/services/tts_service.dart';
import '../../features/tts/domain/services/tts_text_parser.dart';
import '../../features/tts/presentation/cubit/tts_cubit.dart';

final GetIt getIt = GetIt.instance;

/// Central composition root configuring all dependencies for the UI isolate.
Future<void> configureDependencies({
  AppDatabase? databaseOverride,
  StorageService? storageOverride,
  SecureStorageService? secureStorageOverride,
  AppLogger? loggerOverride,
  FilePickerFn? filePickerOverride,
  SearchRepository? searchRepositoryOverride,
  AnnotationRepository? annotationRepositoryOverride,
  StatisticsRepository? statisticsRepositoryOverride,
  BackupService? backupServiceOverride,
  BackupPickerFn? backupPickerOverride,
  TtsService? ttsServiceOverride,
  LocalAiRuntime? aiRuntimeOverride,
  ModelManagerService? modelManagerOverride,
  ReaderRagService? ragServiceOverride,
  ModelPickerFn? modelPickerOverride,
  CloudAiService? cloudAiServiceOverride,
}) async {
  // Clear any existing registrations (useful during tests)
  if (getIt.isRegistered<AppLogger>()) {
    await getIt.reset();
  }

  // Core logging
  final logger = loggerOverride ?? DefaultAppLogger();
  getIt.registerSingleton<AppLogger>(logger);

  // Core storage
  final storageService = storageOverride ?? const DefaultStorageService();
  getIt.registerSingleton<StorageService>(storageService);

  // Core secure credentials storage
  final secureStorage = secureStorageOverride ?? DefaultSecureStorageService();
  getIt.registerSingleton<SecureStorageService>(secureStorage);

  // Core SQLite database (Drift)
  final database = databaseOverride ?? AppDatabase();
  getIt.registerSingleton<AppDatabase>(database);

  // Feature: Library dependencies
  getIt.registerLazySingleton<BookRepository>(
    () => BookRepositoryImpl(
      database: getIt<AppDatabase>(),
      storageService: getIt<StorageService>(),
    ),
  );

  getIt.registerFactory<LibraryCubit>(
    () => LibraryCubit(bookRepository: getIt<BookRepository>()),
  );

  // Feature: Import dependencies
  getIt.registerSingleton<FormatDetector>(const FormatDetector());
  getIt.registerSingleton<ExtractorFactory>(const ExtractorFactory());

  getIt.registerLazySingleton<ImportService>(
    () => ImportService(
      storageService: getIt<StorageService>(),
      bookRepository: getIt<BookRepository>(),
      formatDetector: getIt<FormatDetector>(),
      extractorFactory: getIt<ExtractorFactory>(),
      logger: getIt<AppLogger>(),
    ),
  );

  getIt.registerFactory<ImportCubit>(
    () => ImportCubit(
      importService: getIt<ImportService>(),
      filePickerOverride: filePickerOverride,
    ),
  );

  // Feature: Annotations dependencies
  final annotationRepo =
      annotationRepositoryOverride ??
      AnnotationRepositoryImpl(database: getIt<AppDatabase>());
  getIt.registerLazySingleton<AnnotationRepository>(() => annotationRepo);

  getIt.registerFactory<AnnotationCubit>(
    () => AnnotationCubit(repository: getIt<AnnotationRepository>()),
  );

  // Feature: Statistics dependencies
  final statsRepo =
      statisticsRepositoryOverride ??
      StatisticsRepositoryImpl(
        database: getIt<AppDatabase>(),
        logger: getIt<AppLogger>(),
      );
  getIt.registerLazySingleton<StatisticsRepository>(() => statsRepo);

  getIt.registerLazySingleton<ReadingSessionTracker>(
    () => ReadingSessionTracker(
      statisticsRepository: getIt<StatisticsRepository>(),
    ),
  );

  getIt.registerFactory<StatisticsCubit>(
    () => StatisticsCubit(
      statisticsRepository: getIt<StatisticsRepository>(),
      logger: getIt<AppLogger>(),
    ),
  );

  // Feature: Reader dependencies
  getIt.registerFactory<ReaderCubit>(
    () => ReaderCubit(
      bookRepository: getIt<BookRepository>(),
      logger: getIt<AppLogger>(),
      annotationRepository: getIt<AnnotationRepository>(),
      sessionTracker: getIt<ReadingSessionTracker>(),
    ),
  );

  // Feature: Search dependencies
  final searchRepo =
      searchRepositoryOverride ??
      SearchRepositoryImpl(database: getIt<AppDatabase>());
  getIt.registerLazySingleton<SearchRepository>(() => searchRepo);

  getIt.registerFactoryParam<SearchCubit, String?, void>(
    (scopedBookId, _) => SearchCubit(
      searchRepository: getIt<SearchRepository>(),
      scopedBookId: scopedBookId,
    ),
  );

  // Feature: Backup & Restore dependencies
  final backupSvc =
      backupServiceOverride ??
      BackupServiceImpl(
        database: getIt<AppDatabase>(),
        storageService: getIt<StorageService>(),
        logger: getIt<AppLogger>(),
      );
  getIt.registerLazySingleton<BackupService>(() => backupSvc);

  getIt.registerFactory<BackupCubit>(
    () => BackupCubit(
      backupService: getIt<BackupService>(),
      filePickerOverride: backupPickerOverride,
    ),
  );

  // Feature: TTS & Audio Narration dependencies
  getIt.registerSingleton<TtsTextParser>(const TtsTextParser());
  final ttsSvc =
      ttsServiceOverride ?? FlutterTtsServiceImpl(logger: getIt<AppLogger>());
  getIt.registerLazySingleton<TtsService>(() => ttsSvc);

  getIt.registerFactory<TtsCubit>(
    () => TtsCubit(
      ttsService: getIt<TtsService>(),
      textParser: getIt<TtsTextParser>(),
      logger: getIt<AppLogger>(),
    ),
  );

  // Feature: Local AI & RAG dependencies
  final runtime =
      aiRuntimeOverride ?? LocalAiRuntimeImpl(logger: getIt<AppLogger>());
  getIt.registerLazySingleton<LocalAiRuntime>(() => runtime);

  final modelMgr =
      modelManagerOverride ??
      ModelManagerServiceImpl(
        storageService: getIt<StorageService>(),
        logger: getIt<AppLogger>(),
      );
  getIt.registerLazySingleton<ModelManagerService>(() => modelMgr);

  final ragSvc =
      ragServiceOverride ??
      ReaderRagServiceImpl(searchRepository: getIt<SearchRepository>());
  getIt.registerLazySingleton<ReaderRagService>(() => ragSvc);

  getIt.registerFactory<ModelManagerCubit>(
    () => ModelManagerCubit(
      modelManagerService: getIt<ModelManagerService>(),
      aiRuntime: getIt<LocalAiRuntime>(),
      filePickerOverride: modelPickerOverride,
    ),
  );

  // Feature: Optional Cloud AI
  final cloudSvc =
      cloudAiServiceOverride ??
      CloudAiServiceImpl(
        storageService: getIt<StorageService>(),
        secureStorage: getIt<SecureStorageService>(),
        logger: getIt<AppLogger>(),
      );
  getIt.registerLazySingleton<CloudAiService>(() => cloudSvc);

  getIt.registerFactory<CloudAiCubit>(
    () => CloudAiCubit(cloudAiService: getIt<CloudAiService>()),
  );

  getIt.registerFactoryParam<
    AiChatCubit,
    ({String bookId, String bookTitle, int currentChapterIndex}),
    void
  >(
    (param, _) => AiChatCubit(
      bookId: param.bookId,
      bookTitle: param.bookTitle,
      currentChapterIndex: param.currentChapterIndex,
      ragService: getIt<ReaderRagService>(),
      aiRuntime: getIt<LocalAiRuntime>(),
      cloudAiService: getIt<CloudAiService>(),
    ),
  );

  logger.info(
    'Dependency injection composition root initialized successfully.',
  );
}
