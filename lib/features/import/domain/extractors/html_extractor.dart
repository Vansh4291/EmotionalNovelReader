import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as p;
import '../../../../core/errors/failures.dart';
import 'document_extractor.dart';
import 'extracted_book_data.dart';

/// Extractor for standalone HTML documents, sanitizing scripts and extracting readable chapter sections.
class HtmlExtractor implements DocumentExtractor {
  const HtmlExtractor();

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    try {
      onProgress?.call(0.2, 'Reading HTML file...');
      final bytes = await file.readAsBytes();
      final rawHtml = utf8.decode(bytes, allowMalformed: true);

      if (rawHtml.trim().isEmpty) {
        return const Result.error(DocumentParsingFailure('HTML document is empty'));
      }

      onProgress?.call(0.5, 'Sanitizing and parsing headings...');
      // Strip script and style tags completely
      final sanitizedHtml = rawHtml
          .replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>', caseSensitive: false), '')
          .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false), '');

      // Extract title
      final titleMatch = RegExp(r'<title[^>]*>(.*?)</title>', caseSensitive: false).firstMatch(sanitizedHtml);
      final title = titleMatch?.group(1)?.trim().isNotEmpty == true
          ? titleMatch!.group(1)!.trim()
          : p.basenameWithoutExtension(file.path);

      // Look for H1/H2 tags for chapters
      final headingMatches = RegExp(r'<h[12][^>]*>(.*?)</h[12]>', caseSensitive: false)
          .allMatches(sanitizedHtml)
          .toList();

      final chapters = <ExtractedChapterData>[];

      if (headingMatches.length >= 2) {
        for (var i = 0; i < headingMatches.length; i++) {
          final heading = headingMatches[i];
          final chapterTitle = _stripTags(heading.group(1)!).trim();
          final start = heading.start;
          final end = i + 1 < headingMatches.length ? headingMatches[i + 1].start : sanitizedHtml.length;
          final sectionHtml = sanitizedHtml.substring(start, end);
          final text = _cleanHtmlText(sectionHtml);

          if (text.isNotEmpty) {
            chapters.add(
              ExtractedChapterData(
                index: chapters.length,
                title: chapterTitle.isNotEmpty ? chapterTitle : 'Chapter ${chapters.length + 1}',
                content: text,
                wordCount: _calculateWordCount(text),
                characterCount: text.length,
              ),
            );
          }
        }
      }

      if (chapters.isEmpty) {
        final text = _cleanHtmlText(sanitizedHtml);
        chapters.add(
          ExtractedChapterData(
            index: 0,
            title: title,
            content: text,
            wordCount: _calculateWordCount(text),
            characterCount: text.length,
          ),
        );
      }

      onProgress?.call(1.0, 'HTML extraction complete.');
      return Result.success(
        ExtractedBookData(
          title: title,
          format: 'html',
          chapters: chapters,
        ),
      );
    } catch (e, stack) {
      return Result.error(
        DocumentParsingFailure('Failed to extract HTML file: ${e.toString()}', e, stack),
      );
    }
  }

  String _cleanHtmlText(String html) {
    return html
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'</div>', caseSensitive: false), '\n\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll(RegExp(r'\n{3,}'), '\n\n')
        .trim();
  }

  String _stripTags(String html) {
    return html.replaceAll(RegExp(r'<[^>]+>'), '').trim();
  }

  int _calculateWordCount(String text) {
    if (text.trim().isEmpty) return 0;
    return text.trim().split(RegExp(r'\s+')).length;
  }
}

