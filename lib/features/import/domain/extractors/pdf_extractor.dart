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
/// Implements page-aware, font-scoped CMap resolution to eliminate cross-font character code collisions
/// in multi-subset PDF documents, with graceful fallback to content stream scanning.
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

      onProgress?.call(
        0.3,
        'Extracting content streams and page structures...',
      );
      // Strategy 1: Page-aware extraction with font-scoped CMaps (eliminates cross-font collisions)
      final textBlocks = List<String>.from(_extractPdfPages(bytes));

      // Strategy 2: Content stream fallback for object-stream / cross-reference stream PDFs
      if (textBlocks.isEmpty) {
        onProgress?.call(0.5, 'Parsing content streams via fallback...');
        final decompressedStreams = _extractContentStreams(bytes);
        final cmap = _extractCMapTables(decompressedStreams);

        for (final streamContent in decompressedStreams) {
          final extractedFromStream = _extractTextFromStream(
            streamContent,
            cmap,
          );
          if (extractedFromStream.isNotEmpty) {
            textBlocks.add(extractedFromStream);
          }
        }

        // Strategy 3: Inspect raw uncompressed document if no streams found
        if (textBlocks.isEmpty) {
          final rawFallback = _extractTextFromStream(
            latin1.decode(bytes),
            cmap,
          );
          if (rawFallback.isNotEmpty) {
            textBlocks.add(rawFallback);
          }
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

  /// Extracts text page-by-page while scoping CMap character mappings to their respective fonts.
  List<String> _extractPdfPages(Uint8List bytes) {
    final text = latin1.decode(bytes);

    if (!text.contains('/Type/Page') && !text.contains('/Type /Page')) {
      return <String>[];
    }

    // Build object start offset index
    final objStarts = <int, int>{};
    final startRegex = RegExp(r'(\d+)\s+0\s+obj');
    for (final m in startRegex.allMatches(text)) {
      final num = int.parse(m.group(1)!);
      if (!objStarts.containsKey(num)) {
        objStarts[num] = m.start;
      }
    }

    String getHeader(int objNum) {
      final offset = objStarts[objNum];
      if (offset == null) return '';
      final end = text.indexOf('endobj', offset);
      if (end == -1) return '';
      return text.substring(offset, end + 6);
    }

    Uint8List? getStream(int objNum) {
      final offset = objStarts[objNum];
      if (offset == null) return null;
      final streamWord = [0x73, 0x74, 0x72, 0x65, 0x61, 0x6D];
      var sIdx = -1;
      for (var i = offset; i < offset + 2000 && i <= bytes.length - 6; i++) {
        if (bytes[i] == streamWord[0] &&
            bytes[i + 1] == streamWord[1] &&
            bytes[i + 2] == streamWord[2] &&
            bytes[i + 3] == streamWord[3] &&
            bytes[i + 4] == streamWord[4] &&
            bytes[i + 5] == streamWord[5]) {
          sIdx = i;
          break;
        }
      }
      if (sIdx == -1) return null;

      var dataStart = sIdx + 6;
      if (dataStart < bytes.length && bytes[dataStart] == 0x0D) dataStart++;
      if (dataStart < bytes.length && bytes[dataStart] == 0x0A) dataStart++;

      final endWord = [0x65, 0x6E, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D];
      var eIdx = -1;
      for (var i = dataStart; i <= bytes.length - endWord.length; i++) {
        var match = true;
        for (var j = 0; j < endWord.length; j++) {
          if (bytes[i + j] != endWord[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          eIdx = i;
          break;
        }
      }
      if (eIdx == -1) return null;

      var dataEnd = eIdx;
      if (dataEnd > dataStart && bytes[dataEnd - 1] == 0x0A) dataEnd--;
      if (dataEnd > dataStart && bytes[dataEnd - 1] == 0x0D) dataEnd--;

      final header = latin1.decode(bytes.sublist(offset, sIdx));
      final raw = bytes.sublist(dataStart, dataEnd);
      if (header.contains('/FlateDecode')) {
        try {
          return Uint8List.fromList(zlib.decode(raw));
        } catch (_) {
          try {
            return Uint8List.fromList(Inflate(raw).getBytes());
          } catch (_) {
            return raw;
          }
        }
      }
      return raw;
    }

    // Collect Page objects in sequential order
    final pageNums = <int>[];
    for (final entry in objStarts.entries) {
      final num = entry.key;
      final header = getHeader(num);
      if (header.contains('/Type/Page') || header.contains('/Type /Page')) {
        if (!header.contains('/Type/Pages') &&
            !header.contains('/Type /Pages')) {
          pageNums.add(num);
        }
      }
    }

    final extractedPages = <String>[];

    for (final pNum in pageNums) {
      final header = getHeader(pNum);

      // Collect fonts available to this page
      var resText = header;
      final resIndirect = RegExp(r'/Resources\s+(\d+)\s+0\s+R')
          .firstMatch(header);
      if (resIndirect != null) {
        final rNum = int.parse(resIndirect.group(1)!);
        resText += ' ${getHeader(rNum)}';
      }

      final fontMap = <String, Map<int, String>>{};
      final fMatches = RegExp(r'/([A-Za-z0-9_]+)\s+(\d+)\s+0\s+R')
          .allMatches(resText);
      for (final fm in fMatches) {
        final tag = fm.group(1)!;
        final fNum = int.parse(fm.group(2)!);
        final fHeader = getHeader(fNum);
        if (!fHeader.contains('/Font')) continue;
        final toUni = RegExp(r'/ToUnicode\s+(\d+)\s+0\s+R').firstMatch(fHeader);
        if (toUni != null) {
          final uNum = int.parse(toUni.group(1)!);
          final uStream = getStream(uNum);
          if (uStream != null) {
            fontMap[tag] = _parseSingleCMap(latin1.decode(uStream));
          }
        }
      }

      // Collect /Contents streams
      final contentObjNums = <int>[];
      final cArray = RegExp(r'/Contents\s*\[([^\]]*)\]').firstMatch(header);
      if (cArray != null) {
        for (final cm in RegExp(
          r'(\d+)\s+0\s+R',
        ).allMatches(cArray.group(1)!)) {
          contentObjNums.add(int.parse(cm.group(1)!));
        }
      } else {
        final cSingle = RegExp(r'/Contents\s+(\d+)\s+0\s+R').firstMatch(header);
        if (cSingle != null) {
          contentObjNums.add(int.parse(cSingle.group(1)!));
        }
      }

      final pageBuffer = StringBuffer();
      for (final cNum in contentObjNums) {
        final stream = getStream(cNum);
        if (stream == null) continue;
        final content = latin1.decode(stream);
        final textFromStream = _decodeStreamWithFontMap(content, fontMap);
        if (textFromStream.isNotEmpty) {
          if (pageBuffer.isNotEmpty) pageBuffer.write('\n\n');
          pageBuffer.write(textFromStream);
        }
      }

      final pageText = pageBuffer.toString().trim();
      if (pageText.isNotEmpty) {
        extractedPages.add(pageText);
      }
    }

    return extractedPages;
  }

  /// Decodes text from a content stream while tracking active font changes (/FontTag size Tf).
  String _decodeStreamWithFontMap(
    String content,
    Map<String, Map<int, String>> fontMap,
  ) {
    final buffer = StringBuffer();
    final btMatches = RegExp(r'BT([\s\S]*?)ET').allMatches(content);

    for (final match in btMatches) {
      final block = match.group(1)!;
      Map<int, String>? currentCmap;

      final cmdRegex = RegExp(
        r'/([A-Za-z0-9_]+)\s+[\d\.]+\s+Tf|\(((?:[^\\)]|\\.)*)\)\s*(?:Tj|[\x27\x22])|\[([\s\S]*?)\]\s*TJ|<([0-9a-fA-F]+)>\s*(?:Tj|[\x27\x22])',
      );
      for (final cmd in cmdRegex.allMatches(block)) {
        if (cmd.group(1) != null) {
          currentCmap = fontMap[cmd.group(1)!];
        } else if (cmd.group(2) != null) {
          final unescaped = _unescapePdfString(cmd.group(2)!);
          final decoded = _applyCMapToString(unescaped, currentCmap);
          _appendDecodedText(buffer, decoded);
        } else if (cmd.group(3) != null) {
          _extractFromArray(cmd.group(3)!, buffer, currentCmap);
        } else if (cmd.group(4) != null) {
          final decoded = _decodeHexString(cmd.group(4)!, currentCmap);
          _appendDecodedText(buffer, decoded);
        }
      }

      if (buffer.isNotEmpty &&
          !buffer.toString().endsWith(' ') &&
          !buffer.toString().endsWith('\n')) {
        buffer.write(' ');
      }
    }
    return buffer.toString().trim();
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

      // Inspect preceding dictionary for /FlateDecode filter and Image subtype
      final dictStart = streamPos > 400 ? streamPos - 400 : 0;
      final dictString = latin1.decode(bytes.sublist(dictStart, streamPos));
      final isImage =
          dictString.contains('/Subtype /Image') ||
          dictString.contains('/Subtype/Image');
      if (isImage) {
        searchIndex = endstreamPos + 9;
        continue;
      }
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
        _appendDecodedText(buffer, decoded);
      }

      // 2. Text array kerning: [(Part 1) -150 (Part 2)] TJ
      final tjArrayMatches = RegExp(r'\[([\s\S]*?)\]\s*TJ').allMatches(block);
      for (final arrMatch in tjArrayMatches) {
        final inner = arrMatch.group(1)!;
        _extractFromArray(inner, buffer, cmap);
      }

      // 3. Hexadecimal strings: <48656C6C6F> Tj, ', "
      final hexMatches = RegExp(r'<([0-9a-fA-F]+)>\s*(?:Tj|[\x27\x22])')
          .allMatches(block);
      for (final hex in hexMatches) {
        final hexStr = hex.group(1)!;
        final decoded = _decodeHexString(hexStr, cmap);
        _appendDecodedText(buffer, decoded);
      }

      if (buffer.isNotEmpty &&
          !buffer.toString().endsWith(' ') &&
          !buffer.toString().endsWith('\n')) {
        buffer.write(' ');
      }
    }

    return buffer.toString().trim();
  }

  /// Appends decoded text tokens while preserving word-spacing and discarding binary NUL bytes.
  static void _appendDecodedText(StringBuffer buffer, String text) {
    if (text.isEmpty) return;
    for (var i = 0; i < text.length; i++) {
      final char = text[i];
      if (char == ' ' || char == '\t') {
        if (buffer.isNotEmpty &&
            !buffer.toString().endsWith(' ') &&
            !buffer.toString().endsWith('\n')) {
          buffer.write(' ');
        }
      } else if (char != '\u0000') {
        buffer.write(char);
      }
    }
  }

  /// Normalizes Private Use Area and presentation form ligature glyphs into standard ASCII characters.
  static String _normalizeLigatures(String text) {
    return text
        .replaceAll('\uE062', 'Th')
        .replaceAll('\uE09D', 'ft')
        .replaceAll('\uE0BB', 'fl')
        .replaceAll('\uE117', 'fi')
        .replaceAll('\uFB00', 'ff')
        .replaceAll('\uFB01', 'fi')
        .replaceAll('\uFB02', 'fl')
        .replaceAll('\uFB03', 'ffi')
        .replaceAll('\uFB04', 'ffl');
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
        final decoded = _applyCMapToString(unescaped, cmap);
        _appendDecodedText(buffer, decoded);
      } else if (m.group(2) != null) {
        // Hex string < ... >
        final decoded = _decodeHexString(m.group(2)!, cmap);
        _appendDecodedText(buffer, decoded);
      } else if (m.group(3) != null) {
        // Kerning displacement number
        final num = double.tryParse(m.group(3)!);
        if (num != null && num <= -120) {
          // Negative kerning represents a space in PDF layout
          if (buffer.isNotEmpty &&
              !buffer.toString().endsWith(' ') &&
              !buffer.toString().endsWith('\n')) {
            buffer.write(' ');
          }
        }
      }
    }
  }

  /// Maps character codes in a literal string through the CMap dictionary if defined.
  static String _applyCMapToString(String text, [Map<int, String>? cmap]) {
    if (cmap == null || cmap.isEmpty) return _normalizeLigatures(text);
    final buffer = StringBuffer();
    for (var i = 0; i < text.length; i++) {
      final code = text.codeUnitAt(i);
      var mapped = cmap[code] ?? text[i];
      if (mapped == '\u0000') {
        if (code == 0x16) {
          mapped = 'fi';
        } else if (code == 0x19) {
          mapped = 'fl';
        } else {
          mapped = '';
        }
      }
      buffer.write(_normalizeLigatures(mapped));
    }
    return buffer.toString();
  }

  /// Parses all /ToUnicode CMap tables found in PDF stream definitions.
  static Map<int, String> _extractCMapTables(List<String> streams) {
    final cmap = <int, String>{};
    for (final s in streams) {
      if (!s.contains('begincmap')) continue;
      cmap.addAll(_parseSingleCMap(s));
    }
    return cmap;
  }

  /// Parses a single /ToUnicode CMap stream.
  static Map<int, String> _parseSingleCMap(String s) {
    final cmap = <int, String>{};

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

    return cmap;
  }

  /// Unescapes PDF literal string escape sequences (\n, \r, \t, octal escapes).
  static String _unescapePdfString(String input) {
    var result = input.replaceAll(r'\\', '\u0000');
    result = result
        .replaceAll(r'\(', '(')
        .replaceAll(r'\)', ')')
        .replaceAll(r'\n', '\n')
        .replaceAll(r'\r', '\r')
        .replaceAll(r'\t', '\t')
        .replaceAll(r'\b', '\b')
        .replaceAll(r'\f', '\f');
    result = result.replaceAllMapped(RegExp(r'\\([0-7]{1,3})'), (m) {
      final code = int.parse(m.group(1)!, radix: 8);
      return String.fromCharCode(code);
    });
    return result.replaceAll('\u0000', r'\');
  }

  /// Decodes hexadecimal character string (<48656C6C6F> or <00240031...>).
  static String _decodeHexString(String hex, [Map<int, String>? cmap]) {
    final buffer = StringBuffer();
    final isTwoByte =
        hex.length >= 4 &&
        (hex.startsWith('00') ||
            (cmap != null && cmap.keys.any((k) => k > 255)));

    final step = isTwoByte ? 4 : 2;
    final len = (hex.length ~/ step) * step;
    for (var i = 0; i < len; i += step) {
      final code = int.tryParse(hex.substring(i, i + step), radix: 16);
      if (code != null) {
        var mapped = cmap?[code];
        if (mapped != null) {
          if (mapped == '\u0000') {
            if (code == 0x16) {
              mapped = 'fi';
            } else if (code == 0x19) {
              mapped = 'fl';
            } else {
              mapped = '';
            }
          }
          buffer.write(_normalizeLigatures(mapped));
        } else if (code >= 32 && code <= 126) {
          buffer.writeCharCode(code);
        }
      }
    }
    return buffer.toString();
  }

  /// Finds the index of a byte pattern within source bytes.
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
