import 'dart:io';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import '../entities/detected_format.dart';

/// Service responsible for sniffing and verifying document format using binary signatures.
class FormatDetector {
  const FormatDetector();

  /// Detects the format of a file from its binary signature and contents.
  Future<FormatDetectionResult> detect(File file) async {
    if (!await file.exists()) {
      return const FormatDetectionResult(
        format: DocumentFormat.unsupported,
        mimeType: 'application/octet-stream',
        isSupported: false,
        description: 'File does not exist.',
      );
    }

    final length = await file.length();
    if (length == 0) {
      return const FormatDetectionResult(
        format: DocumentFormat.unsupported,
        mimeType: 'application/octet-stream',
        isSupported: false,
        description: 'File is empty (0 bytes).',
      );
    }

    // Read header chunk (up to 4KB)
    final sampleSize = length < 4096 ? length : 4096;
    final raf = await file.open(mode: FileMode.read);
    final Uint8List headerBytes;
    try {
      headerBytes = await raf.read(sampleSize);
    } finally {
      await raf.close();
    }

    return detectFromBytes(headerBytes, fileName: file.path, totalLength: length, file: file);
  }

  /// Detects format from header bytes with optional file access for archive structure sniffing.
  Future<FormatDetectionResult> detectFromBytes(
    Uint8List bytes, {
    String? fileName,
    int? totalLength,
    File? file,
  }) async {
    if (bytes.isEmpty) {
      return const FormatDetectionResult(
        format: DocumentFormat.unsupported,
        mimeType: 'application/octet-stream',
        isSupported: false,
        description: 'No data to inspect.',
      );
    }

    // 1. PDF Check: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (_matchesBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2D])) {
      return const FormatDetectionResult(
        format: DocumentFormat.pdf,
        mimeType: 'application/pdf',
        isSupported: true,
        description: 'Adobe Portable Document Format (PDF)',
      );
    }

    // 2. RTF Check: {\rtf (0x7B, 0x5C, 0x72, 0x74, 0x66)
    if (_matchesBytes(bytes, [0x7B, 0x5C, 0x72, 0x74, 0x66])) {
      return const FormatDetectionResult(
        format: DocumentFormat.rtf,
        mimeType: 'application/rtf',
        isSupported: false,
        description: 'Rich Text Format (RTF - Phase 5)',
      );
    }

    // 3. RAR Check (CBR): Rar!\x1A\x07 (0x52, 0x61, 0x72, 0x21, 0x1A, 0x07)
    if (_matchesBytes(bytes, [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07])) {
      return const FormatDetectionResult(
        format: DocumentFormat.cbr,
        mimeType: 'application/x-cbr',
        isSupported: false,
        description: 'Comic Book RAR (CBR - Phase 5)',
      );
    }

    // 4. MOBI / AZW Check: BOOKMOBI at offset 60
    if (bytes.length >= 68) {
      final mobiMagic = [0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49]; // BOOKMOBI
      var isMobi = true;
      for (var i = 0; i < mobiMagic.length; i++) {
        if (bytes[60 + i] != mobiMagic[i]) {
          isMobi = false;
          break;
        }
      }
      if (isMobi) {
        return const FormatDetectionResult(
          format: DocumentFormat.mobi,
          mimeType: 'application/x-mobipocket-ebook',
          isSupported: false,
          description: 'Mobipocket eBook (MOBI - Phase 5)',
        );
      }
    }

    // 5. ZIP Archive Check: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    // Could be EPUB, DOCX, or CBZ
    if (_matchesBytes(bytes, [0x50, 0x4B, 0x03, 0x04])) {
      if (file != null) {
        try {
          final zipResult = await _inspectZipArchive(file);
          if (zipResult != null) return zipResult;
        } catch (_) {
          // If archive is corrupted or partial, fall through
        }
      }

      // Check for EPUB mimetype signature in early header
      final headerString = String.fromCharCodes(bytes);
      if (headerString.contains('mimetypeapplication/epub+zip')) {
        return const FormatDetectionResult(
          format: DocumentFormat.epub,
          mimeType: 'application/epub+zip',
          isSupported: true,
          description: 'Electronic Publication (EPUB)',
        );
      }
      if (headerString.contains('word/')) {
        return const FormatDetectionResult(
          format: DocumentFormat.docx,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          isSupported: true,
          description: 'Microsoft Word Document (DOCX)',
        );
      }

      // If filename suggests CBZ, verify
      final lowerName = (fileName ?? '').toLowerCase();
      if (lowerName.endsWith('.cbz')) {
        return const FormatDetectionResult(
          format: DocumentFormat.cbz,
          mimeType: 'application/vnd.comicbook+zip',
          isSupported: false,
          description: 'Comic Book ZIP (CBZ - Phase 5)',
        );
      }

      return const FormatDetectionResult(
        format: DocumentFormat.unsupported,
        mimeType: 'application/zip',
        isSupported: false,
        description: 'Generic ZIP archive (not recognized as EPUB, DOCX, or CBZ).',
      );
    }

    // 6. HTML Check: <!DOCTYPE html or <html
    final headerAscii = String.fromCharCodes(bytes.where((b) => b >= 32 && b <= 126));
    final trimmedAscii = headerAscii.trim().toLowerCase();
    if (trimmedAscii.startsWith('<!doctype html') ||
        trimmedAscii.startsWith('<html') ||
        (trimmedAscii.contains('<head') && trimmedAscii.contains('<body'))) {
      return const FormatDetectionResult(
        format: DocumentFormat.html,
        mimeType: 'text/html',
        isSupported: true,
        description: 'HTML Document',
      );
    }

    // 7. Check if file is text or binary (check for null bytes 0x00)
    final hasNullBytes = bytes.any((b) => b == 0x00);
    if (!hasNullBytes) {
      final lowerName = (fileName ?? '').toLowerCase();
      if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
        return const FormatDetectionResult(
          format: DocumentFormat.markdown,
          mimeType: 'text/markdown',
          isSupported: true,
          description: 'Markdown Document',
        );
      }

      return const FormatDetectionResult(
        format: DocumentFormat.txt,
        mimeType: 'text/plain',
        isSupported: true,
        description: 'Plain Text Novel (TXT)',
      );
    }

    return const FormatDetectionResult(
      format: DocumentFormat.unsupported,
      mimeType: 'application/octet-stream',
      isSupported: false,
      description: 'Unknown binary file format.',
    );
  }

  bool _matchesBytes(Uint8List source, List<int> magic) {
    if (source.length < magic.length) return false;
    for (var i = 0; i < magic.length; i++) {
      if (source[i] != magic[i]) return false;
    }
    return true;
  }

  Future<FormatDetectionResult?> _inspectZipArchive(File file) async {
    final bytes = await file.readAsBytes();
    final archive = ZipDecoder().decodeBytes(bytes, verify: false);

    // Check for EPUB
    for (final entry in archive.files) {
      if (entry.name == 'mimetype') {
        final content = String.fromCharCodes(entry.content as List<int>).trim();
        if (content.contains('application/epub+zip')) {
          return const FormatDetectionResult(
            format: DocumentFormat.epub,
            mimeType: 'application/epub+zip',
            isSupported: true,
            description: 'Electronic Publication (EPUB)',
          );
        }
      }
      if (entry.name == 'META-INF/container.xml') {
        return const FormatDetectionResult(
          format: DocumentFormat.epub,
          mimeType: 'application/epub+zip',
          isSupported: true,
          description: 'Electronic Publication (EPUB)',
        );
      }
    }

    // Check for DOCX
    final hasWordDocument = archive.files.any((f) => f.name == 'word/document.xml');
    if (hasWordDocument) {
      return const FormatDetectionResult(
        format: DocumentFormat.docx,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        isSupported: true,
        description: 'Microsoft Word Document (DOCX)',
      );
    }

    // Check for CBZ (contains image files: jpg, png, webp)
    final hasImages = archive.files.any((f) {
      final name = f.name.toLowerCase();
      return name.endsWith('.jpg') ||
          name.endsWith('.jpeg') ||
          name.endsWith('.png') ||
          name.endsWith('.webp');
    });
    if (hasImages) {
      return const FormatDetectionResult(
        format: DocumentFormat.cbz,
        mimeType: 'application/vnd.comicbook+zip',
        isSupported: false,
        description: 'Comic Book ZIP (CBZ - Phase 5)',
      );
    }

    return null;
  }
}

