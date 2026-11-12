import 'dart:io';

import 'package:bloc_test/bloc_test.dart';
import 'package:emotional_novel_reader/core/errors/failures.dart';
import 'package:emotional_novel_reader/features/backup/domain/entities/backup_manifest_entity.dart';
import 'package:emotional_novel_reader/features/backup/domain/services/backup_service.dart';
import 'package:emotional_novel_reader/features/backup/presentation/cubit/backup_cubit.dart';
import 'package:emotional_novel_reader/features/backup/presentation/cubit/backup_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockBackupService extends Mock implements BackupService {}

void main() {
  late MockBackupService mockBackupService;
  late File dummyFile;
  late BackupManifestEntity dummyManifest;
  late BackupRestoreSummary dummySummary;

  setUp(() {
    mockBackupService = MockBackupService();
    dummyFile = File('dummy/path/backup.enrbk');
    dummyManifest = BackupManifestEntity(
      backupVersion: 1,
      appVersion: '1.0.0',
      createdAt: DateTime.utc(2026, 1, 1),
      databaseSchemaVersion: 5,
      bookCount: 3,
      chapterCount: 30,
      bookmarkCount: 5,
      highlightCount: 8,
      noteCount: 2,
      sessionCount: 4,
      totalBytes: 50000,
      checksumSha256: 'mock-sha256',
    );
    dummySummary = const BackupRestoreSummary(
      restoredBooksCount: 3,
      restoredChaptersCount: 30,
      restoredBookmarksCount: 5,
      restoredHighlightsCount: 8,
      restoredNotesCount: 2,
      restoredSessionsCount: 4,
    );
  });

  group('BackupCubit Tests', () {
    blocTest<BackupCubit, BackupState>(
      'emits [BackupLoading, BackupExportSuccess] when exportBackup succeeds',
      build: () {
        when(
          () => mockBackupService.createBackup(
            destinationDir: any(named: 'destinationDir'),
            includeBookFiles: any(named: 'includeBookFiles'),
          ),
        ).thenAnswer((_) async => Result.success(dummyFile));

        when(() => mockBackupService.inspectBackup(dummyFile))
            .thenAnswer((_) async => Result.success(dummyManifest));

        return BackupCubit(backupService: mockBackupService);
      },
      act: (cubit) => cubit.exportBackup(),
      expect: () => [
        isA<BackupLoading>(),
        isA<BackupExportSuccess>().having(
          (s) => s.manifest.bookCount,
          'bookCount',
          3,
        ),
      ],
    );

    blocTest<BackupCubit, BackupState>(
      'emits [BackupLoading, BackupFailureState] when exportBackup fails',
      build: () {
        when(
          () => mockBackupService.createBackup(
            destinationDir: any(named: 'destinationDir'),
            includeBookFiles: any(named: 'includeBookFiles'),
          ),
        ).thenAnswer(
          (_) async => const Result.error(StorageFailure('Disk is full')),
        );

        return BackupCubit(backupService: mockBackupService);
      },
      act: (cubit) => cubit.exportBackup(),
      expect: () => [
        isA<BackupLoading>(),
        isA<BackupFailureState>().having(
          (s) => s.message,
          'message',
          'Disk is full',
        ),
      ],
    );

    blocTest<BackupCubit, BackupState>(
      'emits [BackupLoading, BackupInitial] when pickAndInspectBackup is canceled by user',
      build: () {
        return BackupCubit(
          backupService: mockBackupService,
          filePickerOverride: () async => null,
        );
      },
      act: (cubit) => cubit.pickAndInspectBackup(),
      expect: () => [isA<BackupLoading>(), isA<BackupInitial>()],
    );

    blocTest<BackupCubit, BackupState>(
      'emits [BackupLoading, BackupRestoreSuccess] when restoreBackup succeeds',
      build: () {
        when(
          () => mockBackupService.restoreBackup(
            dummyFile,
            conflictMode: RestoreConflictMode.merge,
          ),
        ).thenAnswer((_) async => Result.success(dummySummary));

        return BackupCubit(backupService: mockBackupService);
      },
      act: (cubit) => cubit.restoreBackup(backupFile: dummyFile),
      expect: () => [
        isA<BackupLoading>(),
        isA<BackupRestoreSuccess>().having(
          (s) => s.summary.restoredBooksCount,
          'restoredBooksCount',
          3,
        ),
      ],
    );
  });
}
