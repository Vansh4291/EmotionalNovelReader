import 'dart:convert';
import 'dart:io';
import 'package:archive/archive.dart';
import 'package:path/path.dart' as p;
import 'package:xml/xml.dart';
import '../../../../core/errors/failures.dart';
import 'document_extractor.dart';
import 'extracted_book_data.dart';

/// Extractor for DOCX documents by parsing word/document.xml paragraph trees.
class DocxExtractor implements DocumentExtractor {
  const DocxExtractor();

  static const int maxArchiveEntries = 5000;
  static const int maxUncompressedArchiveBytes = 150 * 1024 * 1024; // 150 MB
  static const double maxCompressionRatio = 100.0;

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    try {
      onProgress?.call(0.1, 'Reading DOCX archive...');
      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes, verify: false);

      if (archive.length > maxArchiveEntries) {
        return Result.error(
          SecurityFailure('Archive contains too many entries (${archive.length}) - potential ZIP bomb.'),
        );
      }

      var totalUncompressedBytes = 0;
      for (final f in archive) {
        if (f.size < 0) {
          return const Result.error(
            SecurityFailure('Archive contains entry with invalid or negative size.'),
          );
        }
        totalUncompressedBytes += f.size;
        if (totalUncompressedBytes > maxUncompressedArchiveBytes) {
          return const Result.error(
            SecurityFailure('Archive uncompressed size exceeds resource safety threshold (150 MB).'),
          );
        }
      }

      if (bytes.isNotEmpty &&
          totalUncompressedBytes > 10 * 1024 * 1024 &&
          (totalUncompressedBytes / bytes.length > maxCompressionRatio)) {
        return const Result.error(
          SecurityFailure('Suspicious archive compression ratio exceeding 100:1 - potential ZIP bomb.'),
        );
      }

      final docXmlFile = archive.findFile('word/document.xml');
      if (docXmlFile == null) {
        return const Result.error(
          DocumentParsingFailure('Invalid DOCX: Missing word/document.xml'),
        );
      }

      final docXmlBytes = docXmlFile.content as List<int>;
      if (docXmlBytes.length > maxUncompressedArchiveBytes) {
        return const Result.error(
          SecurityFailure('Actual extracted XML size exceeds uncompressed threshold (150 MB).'),
        );
      }

      onProgress?.call(0.4, 'Parsing document XML structure...');
      final docXml = utf8.decode(docXmlBytes);
      final xmlDoc = XmlDocument.parse(docXml);

      final title = p.basenameWithoutExtension(file.path);
      final chapters = <ExtractedChapterData>[];

      // Parse paragraphs
      final paragraphs = <(bool isHeading, String text)>[];
      for (final pElement in xmlDoc.findAllElements('w:p')) {
        // Check if paragraph style is Heading
        final style = pElement.findAllElements('w:pStyle').firstOrNull?.getAttribute('w:val');
        final isHeading = style?.toLowerCase().contains('heading') == true;

        final textRuns = pElement.findAllElements('w:t').map((e) => e.innerText).join();
        if (textRuns.trim().isNotEmpty) {
          paragraphs.add((isHeading, textRuns.trim()));
        }
      }

      if (paragraphs.isEmpty) {
        return const Result.error(DocumentParsingFailure('DOCX document contains no text'));
      }

      onProgress?.call(0.7, 'Assembling chapters...');
      // Group by headings or chunk
      var currentChapterTitle = 'Chapter 1';
      final buffer = StringBuffer();
      var chapterIndex = 0;

      for (final (isHeading, text) in paragraphs) {
        if (isHeading && buffer.isNotEmpty) {
          final content = buffer.toString().trim();
          chapters.add(
            ExtractedChapterData(
              index: chapterIndex,
              title: currentChapterTitle,
              content: content,
              wordCount: _calculateWordCount(content),
              characterCount: content.length,
            ),
          );
          chapterIndex++;
          buffer.clear();
          currentChapterTitle = text;
        } else if (isHeading && buffer.isEmpty) {
          currentChapterTitle = text;
        } else {
          if (buffer.isNotEmpty) buffer.write('\n\n');
          buffer.write(text);
        }
      }

      if (buffer.isNotEmpty) {
        final content = buffer.toString().trim();
        chapters.add(
          ExtractedChapterData(
            index: chapterIndex,
            title: currentChapterTitle,
            content: content,
            wordCount: _calculateWordCount(content),
            characterCount: content.length,
          ),
        );
      }

      onProgress?.call(1.0, 'DOCX extraction complete.');
      return Result.success(
        ExtractedBookData(
          title: title,
          format: 'docx',
          chapters: chapters,
        ),
      );
    } catch (e, stack) {
      return Result.error(
        DocumentParsingFailure('Failed to extract DOCX file: ${e.toString()}', e, stack),
      );
    }
  }

  int _calculateWordCount(String text) {
    if (text.trim().isEmpty) return 0;
    return text.trim().split(RegExp(r'\s+')).length;
  }
}

