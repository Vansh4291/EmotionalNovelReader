import 'dart:io';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import 'package:emotional_novel_reader/features/import/domain/entities/detected_format.dart';
import 'package:emotional_novel_reader/features/import/domain/services/format_detector.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const detector = FormatDetector();

  group('FormatDetector signature sniffing tests', () {
    test('Detects PDF from %PDF- magic bytes', () async {
      final bytes = Uint8List.fromList([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);
      final result = await detector.detectFromBytes(bytes);

      expect(result.format, DocumentFormat.pdf);
      expect(result.mimeType, 'application/pdf');
      expect(result.isSupported, isTrue);
    });

    test('Detects RTF from {\\rtf magic bytes', () async {
      final bytes = Uint8List.fromList([0x7B, 0x5C, 0x72, 0x74, 0x66, 0x31]);
      final result = await detector.detectFromBytes(bytes);

      expect(result.format, DocumentFormat.rtf);
      expect(result.mimeType, 'application/rtf');
      expect(result.isSupported, isFalse); // Deferred to Phase 5
    });

    test('Detects CBR from Rar! magic bytes', () async {
      final bytes = Uint8List.fromList([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]);
      final result = await detector.detectFromBytes(bytes);

      expect(result.format, DocumentFormat.cbr);
      expect(result.mimeType, 'application/x-cbr');
      expect(result.isSupported, isFalse); // Deferred to Phase 5
    });

    test('Detects MOBI from BOOKMOBI at offset 60', () async {
      final bytes = Uint8List(80);
      final mobiMagic = [0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49];
      for (var i = 0; i < mobiMagic.length; i++) {
        bytes[60 + i] = mobiMagic[i];
      }

      final result = await detector.detectFromBytes(bytes);
      expect(result.format, DocumentFormat.mobi);
      expect(result.isSupported, isFalse); // Deferred to Phase 5
    });

    test('Detects EPUB from ZIP archive containing mimetype', () async {
      final archive = Archive();
      archive.addFile(
        ArchiveFile('mimetype', 20, 'application/epub+zip'.codeUnits),
      );
      archive.addFile(
        ArchiveFile('META-INF/container.xml', 20, '<xml></xml>'.codeUnits),
      );
      final zipBytes = Uint8List.fromList(ZipEncoder().encode(archive));

      final tempDir = Directory.systemTemp.createTempSync('epub_test_');
      final epubFile = File('${tempDir.path}/test.epub')..writeAsBytesSync(zipBytes);

      try {
        final result = await detector.detect(epubFile);
        expect(result.format, DocumentFormat.epub);
        expect(result.mimeType, 'application/epub+zip');
        expect(result.isSupported, isTrue);
      } finally {
        tempDir.deleteSync(recursive: true);
      }
    });

    test('Detects DOCX from ZIP archive containing word/document.xml', () async {
      final archive = Archive();
      archive.addFile(
        ArchiveFile('word/document.xml', 20, '<w:document></w:document>'.codeUnits),
      );
      final zipBytes = Uint8List.fromList(ZipEncoder().encode(archive));

      final tempDir = Directory.systemTemp.createTempSync('docx_test_');
      final docxFile = File('${tempDir.path}/test.docx')..writeAsBytesSync(zipBytes);

      try {
        final result = await detector.detect(docxFile);
        expect(result.format, DocumentFormat.docx);
        expect(result.isSupported, isTrue);
      } finally {
        tempDir.deleteSync(recursive: true);
      }
    });

    test('Detects HTML from <!DOCTYPE html or <html> tag', () async {
      final bytes = Uint8List.fromList('<!DOCTYPE html><html><body>Novel</body></html>'.codeUnits);
      final result = await detector.detectFromBytes(bytes);

      expect(result.format, DocumentFormat.html);
      expect(result.mimeType, 'text/html');
      expect(result.isSupported, isTrue);
    });

    test('Detects Markdown from file extension and valid text', () async {
      final bytes = Uint8List.fromList('# Chapter 1: The Rebirth\n\nIt was a quiet night.'.codeUnits);
      final result = await detector.detectFromBytes(bytes, fileName: 'novel.md');

      expect(result.format, DocumentFormat.markdown);
      expect(result.isSupported, isTrue);
    });

    test('Detects Plain Text from valid UTF-8 without binary null bytes', () async {
      final bytes = Uint8List.fromList('Chapter 1\nOnce upon a time in a fantasy world.'.codeUnits);
      final result = await detector.detectFromBytes(bytes, fileName: 'novel.txt');

      expect(result.format, DocumentFormat.txt);
      expect(result.isSupported, isTrue);
    });

    test('Returns unsupported for unknown binary files containing null bytes', () async {
      final bytes = Uint8List.fromList([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
      final result = await detector.detectFromBytes(bytes);

      expect(result.format, DocumentFormat.unsupported);
      expect(result.isSupported, isFalse);
    });
  });
}

