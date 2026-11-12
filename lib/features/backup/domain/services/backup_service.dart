import 'dart:io';

import '../../../../core/errors/failures.dart';
import '../entities/backup_manifest_entity.dart';

abstract interface class BackupService {
  Future<Result<File>> createBackup({
    Directory? destinationDir,
    bool includeBookFiles = true,
  });

  Future<Result<BackupManifestEntity>> inspectBackup(File backupFile);

  Future<Result<BackupRestoreSummary>> restoreBackup(
    File backupFile, {
    RestoreConflictMode conflictMode = RestoreConflictMode.merge,
  });
}
