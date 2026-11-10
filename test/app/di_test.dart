import 'package:drift/native.dart';
import 'package:emotional_novel_reader/app/di/injection.dart';
import 'package:emotional_novel_reader/core/database/app_database.dart';
import 'package:emotional_novel_reader/core/logging/app_logger.dart';
import 'package:emotional_novel_reader/core/security/secure_storage_service.dart';
import 'package:emotional_novel_reader/core/storage/storage_service.dart';
import 'package:emotional_novel_reader/features/library/domain/repositories/book_repository.dart';
import 'package:emotional_novel_reader/features/library/presentation/cubit/library_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
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

      final cubit = getIt<LibraryCubit>();
      expect(cubit, isNotNull);
      await cubit.close();
    });
  });
}

