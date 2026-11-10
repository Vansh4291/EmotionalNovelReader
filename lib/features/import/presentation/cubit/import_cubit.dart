import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path/path.dart' as p;
import '../../domain/services/import_service.dart';
import 'import_state.dart';

typedef FilePickerFn = Future<String?> Function();

/// Cubit managing document selection via SAF and the end-to-end import pipeline.
class ImportCubit extends Cubit<ImportState> {
  ImportCubit({
    required this.importService,
    this.filePickerOverride,
  }) : super(const ImportInitial());

  final ImportService importService;
  final FilePickerFn? filePickerOverride;

  static const List<String> supportedExtensions = [
    'epub',
    'pdf',
    'txt',
    'docx',
    'html',
    'htm',
    'rtf',
    'md',
    'markdown',
    'cbz',
    'cbr',
    'mobi',
    'azw',
    'azw3',
  ];

  Future<void> pickAndImport() async {
    emit(const ImportSelecting());

    try {
      String? filePath;

      if (filePickerOverride != null) {
        filePath = await filePickerOverride!();
      } else {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: supportedExtensions,
        );
        if (result != null && result.files.isNotEmpty) {
          filePath = result.files.single.path;
        }
      }

      if (filePath == null) {
        // User cancelled selection
        emit(const ImportInitial());
        return;
      }

      final file = File(filePath);
      await importFile(file);
    } catch (e) {
      emit(ImportError('Failed to pick document: ${e.toString()}'));
    }
  }

  Future<void> importFile(File file) async {
    final fileName = p.basename(file.path);
    emit(ImportInProgress(fileName: fileName, progress: 0.05, status: 'Starting import...'));

    final result = await importService.importDocument(
      file,
      onProgress: (progress, status) {
        emit(ImportInProgress(fileName: fileName, progress: progress, status: status));
      },
    );

    result.fold(
      onSuccess: (book) {
        emit(ImportSuccess(book));
      },
      onError: (failure) {
        emit(ImportError(failure.message));
      },
    );
  }

  void reset() {
    emit(const ImportInitial());
  }
}

