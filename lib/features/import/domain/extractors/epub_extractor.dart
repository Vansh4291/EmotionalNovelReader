import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import 'package:path/path.dart' as p;
import 'package:xml/xml.dart';
import '../../../../core/errors/failures.dart';
import 'document_extractor.dart';
import 'extracted_book_data.dart';

/// Secure extractor for EPUB documents parsing container, OPF package, and spine XHTML chapters.
class EpubExtractor implements DocumentExtractor {
  const EpubExtractor();

  /// Resource-safety limits to protect against ZIP bomb attacks and unbounded extraction
  static const int maxArchiveEntries = 5000;
  static const int maxUncompressedArchiveBytes = 250 * 1024 * 1024; // 250 MB
  static const double maxCompressionRatio = 100.0;
  static const int maxChapterFileBytes = 20 * 1024 * 1024; // 20 MB per XHTML file

  static bool _isSafeArchivePath(String path) {
    if (path.contains('\x00')) return false;
    final normalized = p.posix.normalize(path.trim());
    if (normalized.startsWith('../') ||
        normalized == '..' ||
        normalized.startsWith('/') ||
        normalized.contains(':') ||
        normalized.contains(r'\')) {
      return false;
    }
    return true;
  }

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    try {
      onProgress?.call(0.1, 'Reading EPUB archive...');
      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes, verify: false);

      // ZIP bomb protection: entry count and cumulative uncompressed size
      if (archive.length > maxArchiveEntries) {
        return Result.error(
          SecurityFailure('Archive contains too many entries (${archive.length}) - potential ZIP bomb.'),
        );
      }

      var totalUncompressedBytes = 0;
      for (final archiveFile in archive) {
        if (archiveFile.size < 0) {
          return const Result.error(
            SecurityFailure('Archive contains entry with invalid or negative size.'),
          );
        }
        totalUncompressedBytes += archiveFile.size;
        if (totalUncompressedBytes > maxUncompressedArchiveBytes) {
          return const Result.error(
            SecurityFailure('Archive uncompressed size exceeds resource safety threshold (250 MB).'),
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

      // 1. Locate and parse META-INF/container.xml
      onProgress?.call(0.2, 'Parsing container metadata...');
      final containerFile = archive.findFile('META-INF/container.xml');
      if (containerFile == null) {
        return const Result.error(
          DocumentParsingFailure('Invalid EPUB: Missing META-INF/container.xml'),
        );
      }

      final containerXml = utf8.decode(containerFile.content as List<int>);
      final containerDoc = XmlDocument.parse(containerXml);
      final rootfileElement = containerDoc.findAllElements('rootfile').firstOrNull;
      final opfPath = rootfileElement?.getAttribute('full-path');

      if (opfPath == null || opfPath.isEmpty) {
        return const Result.error(
          DocumentParsingFailure('Invalid EPUB: Missing rootfile full-path attribute in container.xml'),
        );
      }

      if (!_isSafeArchivePath(opfPath)) {
        return Result.error(
          SecurityFailure('Path traversal detected in container.xml full-path: "$opfPath"'),
        );
      }

      // 2. Locate and parse OPF package file
      onProgress?.call(0.3, 'Reading package manifest and spine...');
      final opfFile = archive.findFile(opfPath);
      if (opfFile == null) {
        return Result.error(
          DocumentParsingFailure('Invalid EPUB: Package file not found at "$opfPath"'),
        );
      }

      final opfXml = utf8.decode(opfFile.content as List<int>);
      final opfDoc = XmlDocument.parse(opfXml);
      final opfDir = p.posix.dirname(opfPath);

      // Extract metadata
      final titleElement = opfDoc.findAllElements('dc:title').firstOrNull;
      final title = titleElement?.innerText.trim().isNotEmpty == true
          ? titleElement!.innerText.trim()
          : p.basenameWithoutExtension(file.path);

      final creatorElement = opfDoc.findAllElements('dc:creator').firstOrNull;
      final author = creatorElement?.innerText.trim();

      // Extract manifest (id -> href)
      final manifestMap = <String, String>{};
      String? coverItemId;

      for (final item in opfDoc.findAllElements('item')) {
        final id = item.getAttribute('id');
        final href = item.getAttribute('href');
        final properties = item.getAttribute('properties');
        if (id != null && href != null) {
          manifestMap[id] = href;
          if (properties?.contains('cover-image') == true || id.toLowerCase().contains('cover')) {
            coverItemId ??= id;
          }
        }
      }

      // Extract cover image bytes if available
      Uint8List? coverBytes;
      if (coverItemId != null && manifestMap.containsKey(coverItemId)) {
        final coverHref = manifestMap[coverItemId]!;
        final fullCoverPath = opfDir == '.' ? coverHref : p.posix.normalize('$opfDir/$coverHref');
        if (_isSafeArchivePath(fullCoverPath)) {
          final coverFile = archive.findFile(fullCoverPath);
          if (coverFile != null && coverFile.size <= maxChapterFileBytes) {
            coverBytes = Uint8List.fromList(coverFile.content as List<int>);
          }
        }
      }

      // 3. Resolve spine order and extract chapters
      onProgress?.call(0.5, 'Extracting chapters in reading order...');
      final itemrefs = opfDoc.findAllElements('itemref').toList();
      if (itemrefs.isEmpty) {
        return const Result.error(
          DocumentParsingFailure('Invalid EPUB: Spine contains no readable chapter items'),
        );
      }

      final chapters = <ExtractedChapterData>[];
      var chapterIndex = 0;
      var cumulativeExtractedBytes = 0;

      for (var i = 0; i < itemrefs.length; i++) {
        final idref = itemrefs[i].getAttribute('idref');
        if (idref == null || !manifestMap.containsKey(idref)) continue;

        final href = manifestMap[idref]!;
        final fullChapterPath = opfDir == '.' ? href : p.posix.normalize('$opfDir/$href');

        // Prevent archive path traversal using robust canonical path verification
        if (!_isSafeArchivePath(fullChapterPath)) continue;

        final chapterFile = archive.findFile(fullChapterPath);
        if (chapterFile == null || chapterFile.size < 0 || chapterFile.size > maxChapterFileBytes) continue;

        final contentBytes = chapterFile.content as List<int>;
        if (contentBytes.length > maxChapterFileBytes) continue;
        cumulativeExtractedBytes += contentBytes.length;
        if (cumulativeExtractedBytes > maxUncompressedArchiveBytes) {
          return const Result.error(
            SecurityFailure('Actual extracted bytes exceed uncompressed budget (250 MB).'),
          );
        }

        final rawXhtml = utf8.decode(contentBytes, allowMalformed: true);
        final (extractedTitle, textContent) = _parseXhtmlChapter(rawXhtml, chapterIndex + 1);

        if (textContent.trim().isEmpty) continue;

        final wordCount = _calculateWordCount(textContent);
        final charCount = textContent.length;

        chapters.add(
          ExtractedChapterData(
            index: chapterIndex,
            title: extractedTitle,
            content: textContent,
            href: fullChapterPath,
            wordCount: wordCount,
            characterCount: charCount,
          ),
        );
        chapterIndex++;

        final progressPercent = 0.5 + (0.4 * ((i + 1) / itemrefs.length));
        onProgress?.call(progressPercent, 'Extracted chapter $chapterIndex...');
      }

      if (chapters.isEmpty) {
        return const Result.error(
          DocumentParsingFailure('EPUB extraction produced no readable chapter content'),
        );
      }

      onProgress?.call(1.0, 'EPUB extraction complete.');
      return Result.success(
        ExtractedBookData(
          title: title,
          author: author,
          format: 'epub',
          coverImageBytes: coverBytes,
          chapters: chapters,
        ),
      );
    } catch (e, stack) {
      return Result.error(
        DocumentParsingFailure('Failed to extract EPUB file: ${e.toString()}', e, stack),
      );
    }
  }

  /// Parses XHTML chapter content, stripping HTML tags while preserving paragraph spacing.
  (String, String) _parseXhtmlChapter(String rawXhtml, int defaultChapterNumber) {
    String chapterTitle = 'Chapter $defaultChapterNumber';
    String textContent = '';

    try {
      final doc = XmlDocument.parse(rawXhtml);

      // Check title or heading tags
      final titleTag = doc.findAllElements('title').firstOrNull?.innerText.trim();
      final h1Tag = doc.findAllElements('h1').firstOrNull?.innerText.trim();
      final h2Tag = doc.findAllElements('h2').firstOrNull?.innerText.trim();

      if (h1Tag != null && h1Tag.isNotEmpty) {
        chapterTitle = h1Tag;
      } else if (titleTag != null && titleTag.isNotEmpty) {
        chapterTitle = titleTag;
      } else if (h2Tag != null && h2Tag.isNotEmpty) {
        chapterTitle = h2Tag;
      }

      // Convert body paragraphs
      final paragraphs = <String>[];
      final body = doc.findAllElements('body').firstOrNull;
      if (body != null) {
        for (final node in body.descendants) {
          if (node is XmlElement) {
            final name = node.name.local.toLowerCase();
            if (name == 'p' || name == 'div' || name == 'blockquote') {
              final text = node.innerText.trim();
              if (text.isNotEmpty && !paragraphs.contains(text)) {
                paragraphs.add(text);
              }
            }
          }
        }
      }

      if (paragraphs.isNotEmpty) {
        textContent = paragraphs.join('\n\n');
      } else {
        textContent = _stripHtmlRegex(rawXhtml);
      }
    } catch (_) {
      // Fallback regex cleaning if XML parsing fails due to non-strict XHTML
      textContent = _stripHtmlRegex(rawXhtml);
    }

    return (chapterTitle, textContent);
  }

  String _stripHtmlRegex(String html) {
    return html
        .replaceAll(RegExp(r'<script[^>]*>[\s\S]*?</script>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?</style>', caseSensitive: false), '')
        .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
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

  int _calculateWordCount(String text) {
    if (text.trim().isEmpty) return 0;
    return text.trim().split(RegExp(r'\s+')).length;
  }
}

