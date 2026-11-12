import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/backup_manifest_entity.dart';
import '../../domain/services/backup_service.dart';
import 'backup_state.dart';

typedef BackupPickerFn = Future<String?> Function();

class BackupCubit extends Cubit<BackupState> {
  BackupCubit({required this.backupService, this.filePickerOverride})
    : super(const BackupInitial());

  final BackupService backupService;
  final BackupPickerFn? filePickerOverride;

  Future<void> exportBackup({
    Directory? destinationDir,
    bool includeBookFiles = true,
  }) async {
    emit(const BackupLoading(message: 'Generating backup archive...'));

    final res = await backupService.createBackup(
      destinationDir: destinationDir,
      includeBookFiles: includeBookFiles,
    );

    if (res.isError) {
      emit(
        BackupFailureState(
          message: res.failureOrNull?.message ?? 'Failed to export backup',
        ),
      );
      return;
    }

    final backupFile = res.dataOrNull!;
    final inspectRes = await backupService.inspectBackup(backupFile);
    if (inspectRes.isError) {
      emit(
        BackupFailureState(
          message:
              inspectRes.failureOrNull?.message ??
              'Integrity validation failed',
        ),
      );
      return;
    }

    emit(
      BackupExportSuccess(
        backupFile: backupFile,
        manifest: inspectRes.dataOrNull!,
      ),
    );
  }

  Future<void> pickAndInspectBackup() async {
    emit(const BackupLoading(message: 'Selecting backup file...'));

    try {
      String? selectedPath;
      if (filePickerOverride != null) {
        selectedPath = await filePickerOverride!();
      } else {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['enrbk', 'zip'],
        );
        selectedPath = result?.files.single.path;
      }

      if (selectedPath == null) {
        emit(const BackupInitial());
        return;
      }

      final file = File(selectedPath);
      if (!await file.exists()) {
        emit(
          const BackupFailureState(
            message: 'Selected file does not exist on disk',
          ),
        );
        return;
      }

      emit(
        const BackupLoading(
          message: 'Verifying archive integrity and manifest...',
        ),
      );
      final inspectRes = await backupService.inspectBackup(file);

      if (inspectRes.isError) {
        emit(
          BackupFailureState(
            message: inspectRes.failureOrNull?.message ?? 'Invalid backup',
          ),
        );
        return;
      }

      emit(
        BackupInspectSuccess(
          backupFile: file,
          manifest: inspectRes.dataOrNull!,
        ),
      );
    } catch (e) {
      emit(BackupFailureState(message: 'Failed to inspect backup file: $e'));
    }
  }

  Future<void> restoreBackup({
    required File backupFile,
    RestoreConflictMode conflictMode = RestoreConflictMode.merge,
  }) async {
    emit(
      const BackupLoading(
        message: 'Restoring library, progress, and annotations...',
      ),
    );

    final res = await backupService.restoreBackup(
      backupFile,
      conflictMode: conflictMode,
    );

    if (res.isError) {
      emit(
        BackupFailureState(
          message: res.failureOrNull?.message ?? 'Restore operation failed',
        ),
      );
      return;
    }

    emit(BackupRestoreSuccess(summary: res.dataOrNull!));
  }

  void resetState() {
    emit(const BackupInitial());
  }
}
