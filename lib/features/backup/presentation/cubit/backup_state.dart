import 'dart:io';

import '../../domain/entities/backup_manifest_entity.dart';

sealed class BackupState {
  const BackupState();
}

final class BackupInitial extends BackupState {
  const BackupInitial();
}

final class BackupLoading extends BackupState {
  const BackupLoading({required this.message});
  final String message;
}

final class BackupExportSuccess extends BackupState {
  const BackupExportSuccess({required this.backupFile, required this.manifest});

  final File backupFile;
  final BackupManifestEntity manifest;
}

final class BackupInspectSuccess extends BackupState {
  const BackupInspectSuccess({
    required this.backupFile,
    required this.manifest,
  });

  final File backupFile;
  final BackupManifestEntity manifest;
}

final class BackupRestoreSuccess extends BackupState {
  const BackupRestoreSuccess({required this.summary});

  final BackupRestoreSummary summary;
}

final class BackupFailureState extends BackupState {
  const BackupFailureState({required this.message});

  final String message;
}
