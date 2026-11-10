import 'dart:typed_data';

/// DTO representing extracted chapter content from an imported document.
class ExtractedChapterData {
  const ExtractedChapterData({
    required this.index,
    required this.title,
    required this.content,
    this.href,
    required this.wordCount,
    required this.characterCount,
  });

  final int index;
  final String title;
  final String content;
  final String? href;
  final int wordCount;
  final int characterCount;
}

/// DTO representing complete extracted book metadata and content from an imported document.
class ExtractedBookData {
  const ExtractedBookData({
    required this.title,
    this.author,
    required this.format,
    this.coverImageBytes,
    required this.chapters,
  });

  final String title;
  final String? author;
  final String format;
  final Uint8List? coverImageBytes;
  final List<ExtractedChapterData> chapters;
}

