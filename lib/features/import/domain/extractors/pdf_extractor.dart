import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as p;

import '../../../../core/errors/failures.dart';
import 'document_extractor.dart';
import 'extracted_book_data.dart';

/// Extractor for PDF documents supporting both uncompressed and FlateDecode compressed text streams.
///
/// Scanned and image-only PDFs containing no extractable text streams fail safely with an explicit
/// [DocumentParsingFailure], maintaining truthful capability reporting without claiming OCR support.
class PdfExtractor implements DocumentExtractor {
  const PdfExtractor();

  @override
  Future<Result<ExtractedBookData>> extract(
    File file, {
    void Function(double progress, String status)? onProgress,
  }) async {
    try {
      onProgress?.call(0.1, 'Validating PDF structure...');
      final bytes = await file.readAsBytes();

      if (bytes.length < 5 ||
          bytes[0] != 0x25 ||
          bytes[1] != 0x50 ||
          bytes[2] != 0x44 ||
          bytes[3] != 0x46 ||
          bytes[4] != 0x2D) {
        return const Result.error(
          DocumentParsingFailure(
            'Invalid PDF header signature: Missing "%PDF-"',
          ),
        );
      }

      onProgress?.call(0.3, 'Extracting content streams...');
      final decompressedStreams = _extractContentStreams(bytes);
      final cmap = _extractCMapTables(decompressedStreams);

      onProgress?.call(0.6, 'Parsing text streams...');
      final textBlocks = <String>[];

      for (final streamContent in decompressedStreams) {
        final extractedFromStream = _extractTextFromStream(streamContent, cmap);
        if (extractedFromStream.isNotEmpty) {
          textBlocks.add(extractedFromStream);
        }
      }

      // If no text streams were found in object streams, fallback to inspecting raw document
      if (textBlocks.isEmpty) {
        final rawFallback = _extractTextFromStream(latin1.decode(bytes), cmap);
        if (rawFallback.isNotEmpty) {
          textBlocks.add(rawFallback);
        }
      }

      final title = p.basenameWithoutExtension(file.path);

      if (textBlocks.isEmpty) {
        return const Result.error(
          DocumentParsingFailure(
            'Scanned or image-only PDF has no extractable text. OCR extraction is currently unsupported in offline MVP.',
          ),
        );
      }

      onProgress?.call(0.8, 'Assembling PDF pages...');
      final chapters = <ExtractedChapterData>[];
      var pageIndex = 0;
      final buffer = StringBuffer();
      var wordCount = 0;

      for (final block in textBlocks) {
        final words = block.split(RegExp(r'\s+')).length;
        if (wordCount + words > 500 && buffer.isNotEmpty) {
          final content = buffer.toString().trim();
          chapters.add(
            ExtractedChapterData(
              index: pageIndex,
              title: 'Page ${pageIndex + 1}',
              content: content,
              wordCount: wordCount,
              characterCount: content.length,
            ),
          );
          pageIndex++;
          buffer.clear();
          wordCount = 0;
        }

        if (buffer.isNotEmpty) buffer.write('\n\n');
        buffer.write(block);
        wordCount += words;
      }

      if (buffer.isNotEmpty) {
        final content = buffer.toString().trim();
        chapters.add(
          ExtractedChapterData(
            index: pageIndex,
            title: 'Page ${pageIndex + 1}',
            content: content,
            wordCount: wordCount,
            characterCount: content.length,
          ),
        );
      }

      onProgress?.call(1.0, 'PDF extraction complete.');
      return Result.success(
        ExtractedBookData(title: title, format: 'pdf', chapters: chapters),
      );
    } catch (e, stack) {
      return Result.error(
        DocumentParsingFailure(
          'Failed to extract PDF file: ${e.toString()}',
          e,
          stack,
        ),
      );
    }
  }

  /// Locates and extracts all content streams in the PDF bytes, decompressing FlateDecode streams.
  List<String> _extractContentStreams(Uint8List bytes) {
    final streams = <String>[];
    final streamKeyword = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6D]; // "stream"
    final endstreamKeyword = [
      0x65,
      0x6E,
      0x64,
      0x73,
      0x74,
      0x72,
      0x65,
      0x61,
      0x6D,
    ]; // "endstream"

    var searchIndex = 0;
    while (searchIndex < bytes.length) {
      final streamPos = _indexOfBytes(bytes, streamKeyword, searchIndex);
      if (streamPos == -1) break;

      // Ensure "stream" is a delimiter
      var dataStart = streamPos + 6;
      if (dataStart < bytes.length && bytes[dataStart] == 0x0D) dataStart++;
      if (dataStart < bytes.length && bytes[dataStart] == 0x0A) dataStart++;

      final endstreamPos = _indexOfBytes(bytes, endstreamKeyword, dataStart);
      if (endstreamPos == -1) break;

      var dataEnd = endstreamPos;
      // Strip trailing \r or \n before endstream
      if (dataEnd > dataStart && bytes[dataEnd - 1] == 0x0A) dataEnd--;
      if (dataEnd > dataStart && bytes[dataEnd - 1] == 0x0D) dataEnd--;

      // Inspect preceding dictionary for /FlateDecode filter
      final dictStart = streamPos > 400 ? streamPos - 400 : 0;
      final dictString = latin1.decode(bytes.sublist(dictStart, streamPos));
      final isFlate = dictString.contains('/FlateDecode');

      final rawStreamBytes = bytes.sublist(dataStart, dataEnd);

      if (isFlate && rawStreamBytes.isNotEmpty) {
        try {
          final decompressed = zlib.decode(rawStreamBytes);
          streams.add(latin1.decode(decompressed));
        } catch (_) {
          try {
            final decompressed = Inflate(rawStreamBytes).getBytes();
            streams.add(latin1.decode(decompressed));
          } catch (_) {
            // If decompression fails, attempt to read raw
            streams.add(latin1.decode(rawStreamBytes));
          }
        }
      } else if (rawStreamBytes.isNotEmpty) {
        streams.add(latin1.decode(rawStreamBytes));
      }

      searchIndex = endstreamPos + 9;
    }

    return streams;
  }

  /// Extracts textual content from BT ... ET blocks inside a decoded stream.
  String _extractTextFromStream(String content, [Map<int, String>? cmap]) {
    final buffer = StringBuffer();
    final btMatches = RegExp(r'BT([\s\S]*?)ET').allMatches(content);

    for (final match in btMatches) {
      final block = match.group(1)!;

      // 1. Literal strings: (Text) Tj, ', "
      final tjMatches = RegExp(r'\(((?:[^\\)]|\\.)*)\)\s*(?:Tj|[\x27\x22])')
          .allMatches(block);
      for (final tj in tjMatches) {
        final unescaped = _unescapePdfString(tj.group(1)!);
        final decoded = _applyCMapToString(unescaped, cmap);
        if (decoded.trim().isNotEmpty) {
          buffer.write(decoded.trim());
          buffer.write(' ');
        }
      }

      // 2. Text array kerning: [(Part 1) -150 (Part 2)] TJ
      final tjArrayMatches = RegExp(r'\[([\s\S]*?)\]\s*TJ').allMatches(block);
      for (final arrMatch in tjArrayMatches) {
        final inner = arrMatch.group(1)!;
        _extractFromArray(inner, buffer, cmap);
        buffer.write(' ');
      }

      // 3. Hexadecimal strings: <48656C6C6F> Tj, ', "
      final hexMatches = RegExp(r'<([0-9a-fA-F]+)>\s*(?:Tj|[\x27\x22])')
          .allMatches(block);
      for (final hex in hexMatches) {
        final hexStr = hex.group(1)!;
        final decoded = _decodeHexString(hexStr, cmap);
        if (decoded.trim().isNotEmpty) {
          buffer.write(decoded.trim());
          buffer.write(' ');
        }
      }
    }

    return buffer.toString().trim();
  }

  /// Extracts text and preserves word boundaries from elements inside a TJ array.
  static void _extractFromArray(
    String inner,
    StringBuffer buffer, [
    Map<int, String>? cmap,
  ]) {
    final tokenRegex = RegExp(
      r'\(((?:[^\\)]|\\.)*)\)|<([0-9a-fA-F]+)>|(-?\d+(?:\.\d+)?)',
    );
    final matches = tokenRegex.allMatches(inner);

    for (final m in matches) {
      if (m.group(1) != null) {
        // Literal string ( ... )
        final unescaped = _unescapePdfString(m.group(1)!);
        buffer.write(_applyCMapToString(unescaped, cmap));
      } else if (m.group(2) != null) {
        // Hex string < ... >
        buffer.write(_decodeHexString(m.group(2)!, cmap));
      } else if (m.group(3) != null) {
        // Kerning displacement number
        final num = double.tryParse(m.group(3)!);
        if (num != null && num <= -120) {
          // Negative kerning represents a space in PDF layout
          if (buffer.isNotEmpty && !buffer.toString().endsWith(' ')) {
            buffer.write(' ');
          }
        }
      }
    }
  }

  /// Maps character codes in a literal string through the CMap dictionary if defined.
  static String _applyCMapToString(String text, [Map<int, String>? cmap]) {
    if (cmap == null || cmap.isEmpty) return text;
    final buffer = StringBuffer();
    for (var i = 0; i < text.length; i++) {
      final code = text.codeUnitAt(i);
      buffer.write(cmap[code] ?? text[i]);
    }
    return buffer.toString();
  }

  /// Parses all /ToUnicode CMap tables found in PDF stream definitions.
  static Map<int, String> _extractCMapTables(List<String> streams) {
    final cmap = <int, String>{};
    for (final s in streams) {
      if (!s.contains('begincmap')) continue;

      // 1. Parse beginbfchar ... endbfchar
      final bfcharBlocks = RegExp(r'beginbfchar([\s\S]*?)endbfchar')
          .allMatches(s);
      for (final block in bfcharBlocks) {
        final matches = RegExp(r'<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>')
            .allMatches(block.group(1)!);
        for (final m in matches) {
          final srcCode = int.tryParse(m.group(1)!, radix: 16);
          if (srcCode == null) continue;
          final dstHex = m.group(2)!;
          final dstBuf = StringBuffer();
          for (var j = 0; j < dstHex.length; j += 4) {
            if (j + 4 <= dstHex.length) {
              final codeUnit = int.tryParse(
                dstHex.substring(j, j + 4),
                radix: 16,
              );
              if (codeUnit != null) dstBuf.writeCharCode(codeUnit);
            } else if (j + 2 <= dstHex.length) {
              final codeUnit = int.tryParse(
                dstHex.substring(j, j + 2),
                radix: 16,
              );
              if (codeUnit != null) dstBuf.writeCharCode(codeUnit);
            }
          }
          cmap[srcCode] = dstBuf.toString();
        }
      }

      // 2. Parse beginbfrange ... endbfrange
      final bfrangeBlocks = RegExp(r'beginbfrange([\s\S]*?)endbfrange')
          .allMatches(s);
      for (final block in bfrangeBlocks) {
        final inner = block.group(1)!;

        // Form 1: <srcLo> <srcHi> <dstLo>
        final rangeMatches = RegExp(
          r'<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>',
        ).allMatches(inner);
        for (final m in rangeMatches) {
          final srcLo = int.tryParse(m.group(1)!, radix: 16);
          final srcHi = int.tryParse(m.group(2)!, radix: 16);
          final dstLo = int.tryParse(m.group(3)!, radix: 16);
          if (srcLo != null && srcHi != null && dstLo != null) {
            for (var code = srcLo; code <= srcHi; code++) {
              cmap[code] = String.fromCharCode(dstLo + (code - srcLo));
            }
          }
        }

        // Form 2: <srcLo> <srcHi> [ <dst1> <dst2> ... ]
        final arrayMatches = RegExp(
          r'<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]',
        ).allMatches(inner);
        for (final m in arrayMatches) {
          final srcLo = int.tryParse(m.group(1)!, radix: 16);
          final srcHi = int.tryParse(m.group(2)!, radix: 16);
          if (srcLo == null || srcHi == null) continue;
          final arrayContent = m.group(3)!;
          final dstItems = RegExp(r'<([0-9a-fA-F]+)>')
              .allMatches(arrayContent)
              .map((item) {
                final hex = item.group(1)!;
                final buf = StringBuffer();
                for (var j = 0; j < hex.length; j += 4) {
                  if (j + 4 <= hex.length) {
                    final codeUnit = int.tryParse(
                      hex.substring(j, j + 4),
                      radix: 16,
                    );
                    if (codeUnit != null) buf.writeCharCode(codeUnit);
                  } else if (j + 2 <= hex.length) {
                    final codeUnit = int.tryParse(
                      hex.substring(j, j + 2),
                      radix: 16,
                    );
                    if (codeUnit != null) buf.writeCharCode(codeUnit);
                  }
                }
                return buf.toString();
              })
              .toList();
          for (
            var code = srcLo;
            code <= srcHi && (code - srcLo) < dstItems.length;
            code++
          ) {
            cmap[code] = dstItems[code - srcLo];
          }
        }
      }
    }
    return cmap;
  }

  static String _unescapePdfString(String input) {
    // 1. Temporarily protect literal escaped backslashes
    var result = input.replaceAll(r'\\', '\u0000');

    // 2. Standard single-character escapes
    result = result
        .replaceAll(r'\(', '(')
        .replaceAll(r'\)', ')')
        .replaceAll(r'\n', '\n')
        .replaceAll(r'\r', '\r')
        .replaceAll(r'\t', '\t')
        .replaceAll(r'\b', '\b')
        .replaceAll(r'\f', '\f');

    // 3. Octal character escapes: \d, \dd, or \ddd (base 8)
    result = result.replaceAllMapped(RegExp(r'\\([0-7]{1,3})'), (m) {
      final code = int.parse(m.group(1)!, radix: 8);
      return String.fromCharCode(code);
    });

    // 4. Restore literal backslashes
    return result.replaceAll('\u0000', r'\');
  }

  static String _decodeHexString(String hex, [Map<int, String>? cmap]) {
    final buffer = StringBuffer();
    // 2-byte font (CID/Type0) if length is a multiple of 4
    if (hex.length >= 4 && hex.length % 4 == 0) {
      for (var i = 0; i < hex.length; i += 4) {
        final code = int.tryParse(hex.substring(i, i + 4), radix: 16);
        if (code != null) {
          if (cmap != null && cmap.containsKey(code)) {
            buffer.write(cmap[code]!);
          } else if (code >= 32 && code <= 126) {
            buffer.writeCharCode(code);
          }
        }
      }
    } else {
      // 1-byte font
      for (var i = 0; i + 1 < hex.length; i += 2) {
        final code = int.tryParse(hex.substring(i, i + 2), radix: 16);
        if (code != null) {
          if (cmap != null && cmap.containsKey(code)) {
            buffer.write(cmap[code]!);
          } else if (code >= 32 && code <= 126) {
            buffer.writeCharCode(code);
          }
        }
      }
    }
    return buffer.toString();
  }

  static int _indexOfBytes(Uint8List source, List<int> pattern, int start) {
    if (pattern.isEmpty || start >= source.length) return -1;
    for (var i = start; i <= source.length - pattern.length; i++) {
      var match = true;
      for (var j = 0; j < pattern.length; j++) {
        if (source[i + j] != pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }
}
