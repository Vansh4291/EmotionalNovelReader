import 'package:get_it/get_it.dart';
import '../../core/database/app_database.dart';
import '../../core/logging/app_logger.dart';
import '../../core/security/secure_storage_service.dart';
import '../../core/storage/storage_service.dart';
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

final GetIt getIt = GetIt.instance;

/// Central composition root configuring all dependencies for the UI isolate.
Future<void> configureDependencies({
  AppDatabase? databaseOverride,
  StorageService? storageOverride,
  SecureStorageService? secureStorageOverride,
  AppLogger? loggerOverride,
  FilePickerFn? filePickerOverride,
  SearchRepository? searchRepositoryOverride,
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
    () => LibraryCubit(
      bookRepository: getIt<BookRepository>(),
    ),
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

  // Feature: Reader dependencies
  getIt.registerFactory<ReaderCubit>(
    () => ReaderCubit(
      bookRepository: getIt<BookRepository>(),
      logger: getIt<AppLogger>(),
    ),
  );

  // Feature: Search dependencies
  final searchRepo = searchRepositoryOverride ??
      SearchRepositoryImpl(
        database: getIt<AppDatabase>(),
      );
  getIt.registerLazySingleton<SearchRepository>(() => searchRepo);

  getIt.registerFactoryParam<SearchCubit, String?, void>(
    (scopedBookId, _) => SearchCubit(
      searchRepository: getIt<SearchRepository>(),
      scopedBookId: scopedBookId,
    ),
  );

  logger.info('Dependency injection composition root initialized successfully.');
}

