import 'dart:io';
import '../../../../core/errors/failures.dart';
import '../entities/detected_format.dart';
import 'document_extractor.dart';
import 'docx_extractor.dart';
import 'epub_extractor.dart';
import 'extracted_book_data.dart';
import 'html_extractor.dart';
import 'markdown_extractor.dart';
import 'pdf_extractor.dart';
import 'txt_extractor.dart';

/// Factory and dispatcher for document extractors based on detected format.
class ExtractorFactory {
  const ExtractorFactory();

  DocumentExtractor getExtractor(DocumentFormat format) {
    return switch (format) {
      DocumentFormat.epub => const EpubExtractor(),
      DocumentFormat.txt => const TxtExtractor(),
      DocumentFormat.markdown => const MarkdownExtractor(),
      DocumentFormat.html => const HtmlExtractor(),
      DocumentFormat.docx => const DocxExtractor(),
      DocumentFormat.pdf => const PdfExtractor(),
      _ => _DeferredOrUnsupportedExtractor(format),
    };
  }
}

class _DeferredOrUnsupportedExtractor implements DocumentExtractor {
  const _DeferredOrUnsupportedExtractor(this.format);
  final DocumentFormat format;

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    return Result.error(
      ValidationFailure(
        'Format "${format.displayName}" is not supported for extraction in the Phase 4 MVP. Extraction is deferred to future roadmap phases.',
      ),
    );
  }
}

