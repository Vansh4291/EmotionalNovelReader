class HighlightEntity {
  const HighlightEntity({
    required this.id,
    required this.bookId,
    this.chapterId,
    this.chapterIndex,
    this.chapterTitle,
    required this.startOffset,
    required this.endOffset,
    required this.selectedText,
    this.note,
    this.colorValue = defaultHighlightColor,
    required this.createdAt,
  });

  /// Standard Material 3 reader highlight colors
  static const int defaultHighlightColor = 0xFFFFF59D; // Soft Yellow
  static const int greenHighlightColor = 0xFFA5D6A7;   // Soft Green
  static const int blueHighlightColor = 0xFF90CAF9;    // Soft Blue
  static const int pinkHighlightColor = 0xFFF48FB1;    // Soft Pink
  static const int orangeHighlightColor = 0xFFFFCC80;  // Soft Orange

  static const List<int> availableColors = [
    defaultHighlightColor,
    greenHighlightColor,
    blueHighlightColor,
    pinkHighlightColor,
    orangeHighlightColor,
  ];

  static const List<int> standardColors = availableColors;

  final String id;
  final String bookId;
  final String? chapterId;
  final int? chapterIndex;
  final String? chapterTitle;

  /// Start offset in UTF-16 code units within the chapter content.
  final int startOffset;

  /// End offset in UTF-16 code units within the chapter content.
  final int endOffset;

  /// Exact excerpt of the selected text at creation time.
  final String selectedText;

  /// Optional personal note or annotation attached to this highlight.
  final String? note;

  /// ARGB integer color value.
  final int colorValue;

  final DateTime createdAt;

  bool get hasNote => note != null && note!.trim().isNotEmpty;

  /// Verifies if this anchor precisely matches the chapter content.
  bool isValidIn(String chapterContent) {
    if (startOffset < 0 || endOffset > chapterContent.length || startOffset > endOffset) {
      return false;
    }
    return chapterContent.substring(startOffset, endOffset) == selectedText;
  }

  /// Attempts to reconcile the anchor in modified chapter content by finding the nearest occurrence.
  HighlightEntity? reconcileIn(String chapterContent) {
    if (isValidIn(chapterContent)) return this;
    if (selectedText.isEmpty) return null;

    final index = chapterContent.indexOf(selectedText);
    if (index != -1) {
      return copyWith(
        startOffset: index,
        endOffset: index + selectedText.length,
      );
    }
    return null;
  }

  HighlightEntity copyWith({
    String? id,
    String? bookId,
    String? chapterId,
    int? chapterIndex,
    String? chapterTitle,
    int? startOffset,
    int? endOffset,
    String? selectedText,
    String? note,
    int? colorValue,
    DateTime? createdAt,
  }) {
    return HighlightEntity(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      chapterId: chapterId ?? this.chapterId,
      chapterIndex: chapterIndex ?? this.chapterIndex,
      chapterTitle: chapterTitle ?? this.chapterTitle,
      startOffset: startOffset ?? this.startOffset,
      endOffset: endOffset ?? this.endOffset,
      selectedText: selectedText ?? this.selectedText,
      note: note ?? this.note,
      colorValue: colorValue ?? this.colorValue,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HighlightEntity &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          bookId == other.bookId &&
          chapterId == other.chapterId &&
          startOffset == other.startOffset &&
          endOffset == other.endOffset &&
          selectedText == other.selectedText &&
          note == other.note &&
          colorValue == other.colorValue;

  @override
  int get hashCode => Object.hash(
        id,
        bookId,
        chapterId,
        startOffset,
        endOffset,
        selectedText,
        note,
        colorValue,
      );
}
