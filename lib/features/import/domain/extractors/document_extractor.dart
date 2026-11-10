import 'dart:io';
import '../../../../core/errors/failures.dart';
import 'extracted_book_data.dart';

/// Contract for format-specific document extractors.
abstract interface class DocumentExtractor {
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  });
}

