import 'dart:convert';
import 'dart:io';

import 'package:path/path.dart' as p;

import '../../../../core/errors/failures.dart';
import 'document_extractor.dart';
import 'extracted_book_data.dart';

/// Extractor for Markdown documents splitting chapters on headings.
class MarkdownExtractor implements DocumentExtractor {
  const MarkdownExtractor();

  static final RegExp _headingPattern = RegExp(
    r'^(#{1,3})\s+(.+)$',
    multiLine: true,
  );

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    try {
      onProgress?.call(0.1, 'Reading Markdown file...');
      final bytes = await file.readAsBytes();
      final rawText = utf8
          .decode(bytes, allowMalformed: true)
          .replaceAll('\r\n', '\n');

      if (rawText.trim().isEmpty) {
        return const Result.error(
          DocumentParsingFailure('Markdown file is empty'),
        );
      }

      final matches = _headingPattern.allMatches(rawText).toList();
      String title = p.basenameWithoutExtension(file.path);

      final chapters = <ExtractedChapterData>[];

      if (matches.isNotEmpty) {
        // First top heading might be the title
        var startIndexOffset = 0;
        if (matches.first.group(1) == '#') {
          title = matches.first.group(2)!.trim();
          startIndexOffset = 1;
        }

        final chapterMatches = matches.sublist(startIndexOffset);
        if (chapterMatches.isNotEmpty) {
          for (var i = 0; i < chapterMatches.length; i++) {
            final match = chapterMatches[i];
            final chapterTitle = match.group(2)!.trim();
            final start = match.start;
            final end = i + 1 < chapterMatches.length
                ? chapterMatches[i + 1].start
                : rawText.length;
            final body = rawText.substring(start, end).trim();

            chapters.add(
              ExtractedChapterData(
                index: i,
                title: chapterTitle,
                content: body,
                wordCount: _calculateWordCount(body),
                characterCount: body.length,
              ),
            );
          }
        }
      }

      if (chapters.isEmpty) {
        // Whole file as single chapter or sections
        chapters.add(
          ExtractedChapterData(
            index: 0,
            title: title,
            content: rawText.trim(),
            wordCount: _calculateWordCount(rawText),
            characterCount: rawText.length,
          ),
        );
      }

      onProgress?.call(1.0, 'Markdown extraction complete.');
      return Result.success(
        ExtractedBookData(title: title, format: 'markdown', chapters: chapters),
      );
    } catch (e, stack) {
      return Result.error(
        DocumentParsingFailure(
          'Failed to extract Markdown file: ${e.toString()}',
          e,
          stack,
        ),
      );
    }
  }

  int _calculateWordCount(String text) {
    if (text.trim().isEmpty) return 0;
    return text.trim().split(RegExp(r'\s+')).length;
  }
}
