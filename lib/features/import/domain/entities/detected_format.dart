/// Enum representing all recognized document formats in EmotionalNovelReader.
enum DocumentFormat {
  epub,
  pdf,
  txt,
  docx,
  html,
  rtf,
  markdown,
  cbz,
  cbr,
  mobi,
  azw,
  azw3,
  unsupported;

  String get displayName => switch (this) {
    DocumentFormat.epub => 'EPUB',
    DocumentFormat.pdf => 'PDF',
    DocumentFormat.txt => 'Plain Text',
    DocumentFormat.docx => 'Microsoft Word (DOCX)',
    DocumentFormat.html => 'HTML Document',
    DocumentFormat.rtf => 'Rich Text (RTF)',
    DocumentFormat.markdown => 'Markdown',
    DocumentFormat.cbz => 'Comic Book ZIP (CBZ)',
    DocumentFormat.cbr => 'Comic Book RAR (CBR)',
    DocumentFormat.mobi => 'Mobipocket (MOBI)',
    DocumentFormat.azw => 'Kindle (AZW)',
    DocumentFormat.azw3 => 'Kindle Format 8 (AZW3)',
    DocumentFormat.unsupported => 'Unsupported Format',
  };

  bool get isExtractableInPhase4 => switch (this) {
    DocumentFormat.epub => true,
    DocumentFormat.txt => true,
    DocumentFormat.docx => true,
    DocumentFormat.markdown => true,
    DocumentFormat.html => true,
    _ => false,
  };
}

/// Result of sniffing and validating file signatures.
class FormatDetectionResult {
  const FormatDetectionResult({
    required this.format,
    required this.mimeType,
    required this.isSupported,
    required this.description,
  });

  final DocumentFormat format;
  final String mimeType;
  final bool isSupported;
  final String description;
}
