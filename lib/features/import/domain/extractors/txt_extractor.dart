import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as p;
import '../../../../core/errors/failures.dart';
import 'document_extractor.dart';
import 'extracted_book_data.dart';

/// Extractor for plain text files with smart chapter pattern recognition and paragraph chunking.
class TxtExtractor implements DocumentExtractor {
  const TxtExtractor();

  static final RegExp _chapterPattern = RegExp(
    r'^(?:(?:Chapter|CHAPTER|Volume|VOLUME|Book|BOOK|Act|ACT|Prologue|PROLOGUE|Epilogue|EPILOGUE)\s+(?:[\dIVXLCDM]+|[A-Za-z]+).*|第\s*[0-9一二三四五六七八九十百千]+\s*[章回卷节].*)$',
    multiLine: true,
  );

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    try {
      onProgress?.call(0.1, 'Reading text file...');
      final bytes = await file.readAsBytes();

      String rawText;
      try {
        rawText = utf8.decode(bytes);
      } catch (_) {
        // Fallback to latin1 if not strict UTF-8
        rawText = latin1.decode(bytes);
      }

      final normalizedText = rawText.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
      if (normalizedText.isEmpty) {
        return const Result.error(DocumentParsingFailure('Text file is empty'));
      }

      final title = p.basenameWithoutExtension(file.path);
      onProgress?.call(0.3, 'Analyzing text structure and chapters...');

      final chapters = <ExtractedChapterData>[];
      final matches = _chapterPattern.allMatches(normalizedText).toList();

      if (matches.length >= 2) {
        // Explicit chapters found
        for (var i = 0; i < matches.length; i++) {
          final match = matches[i];
          final chapterTitle = match.group(0)!.trim();
          final startIndex = match.start;
          final endIndex = i + 1 < matches.length ? matches[i + 1].start : normalizedText.length;

          final chapterBody = normalizedText.substring(startIndex, endIndex).trim();
          final wordCount = _calculateWordCount(chapterBody);

          chapters.add(
            ExtractedChapterData(
              index: i,
              title: chapterTitle,
              content: chapterBody,
              wordCount: wordCount,
              characterCount: chapterBody.length,
            ),
          );

          final progress = 0.3 + (0.6 * ((i + 1) / matches.length));
          onProgress?.call(progress, 'Indexed chapter ${i + 1} of ${matches.length}');
        }
      } else {
        // No explicit chapter markers; chunk into ~2,500 word sections on paragraph breaks
        onProgress?.call(0.5, 'Partitioning sections...');
        final paragraphs = normalizedText.split('\n\n');
        var currentSectionIndex = 0;
        final buffer = StringBuffer();
        var currentWordCount = 0;

        for (final para in paragraphs) {
          final wordsInPara = _calculateWordCount(para);
          if (currentWordCount + wordsInPara > 2500 && buffer.isNotEmpty) {
            final content = buffer.toString().trim();
            chapters.add(
              ExtractedChapterData(
                index: currentSectionIndex,
                title: 'Section ${currentSectionIndex + 1}',
                content: content,
                wordCount: currentWordCount,
                characterCount: content.length,
              ),
            );
            currentSectionIndex++;
            buffer.clear();
            currentWordCount = 0;
          }

          if (buffer.isNotEmpty) buffer.write('\n\n');
          buffer.write(para.trim());
          currentWordCount += wordsInPara;
        }

        if (buffer.isNotEmpty) {
          final content = buffer.toString().trim();
          chapters.add(
            ExtractedChapterData(
              index: currentSectionIndex,
              title: chapters.isEmpty ? 'Full Text' : 'Section ${currentSectionIndex + 1}',
              content: content,
              wordCount: currentWordCount,
              characterCount: content.length,
            ),
          );
        }
      }

      onProgress?.call(1.0, 'Text extraction complete.');
      return Result.success(
        ExtractedBookData(
          title: title,
          format: 'txt',
          chapters: chapters,
        ),
      );
    } catch (e, stack) {
      return Result.error(
        DocumentParsingFailure('Failed to extract text file: ${e.toString()}', e, stack),
      );
    }
  }

  int _calculateWordCount(String text) {
    if (text.trim().isEmpty) return 0;
    return text.trim().split(RegExp(r'\s+')).length;
  }
}

