enum AnchorStatus { exact, reconciled, ambiguous, unresolved }

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
    this.anchorStatus = AnchorStatus.exact,
    required this.createdAt,
  });

  /// Standard Material 3 reader highlight colors
  static const int defaultHighlightColor = 0xFFFFF59D; // Soft Yellow
  static const int greenHighlightColor = 0xFFA5D6A7; // Soft Green
  static const int blueHighlightColor = 0xFF90CAF9; // Soft Blue
  static const int pinkHighlightColor = 0xFFF48FB1; // Soft Pink
  static const int orangeHighlightColor = 0xFFFFCC80; // Soft Orange

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

  /// Current anchor resolution status against the loaded chapter text.
  final AnchorStatus anchorStatus;

  final DateTime createdAt;

  bool get hasNote => note != null && note!.trim().isNotEmpty;
  bool get isResolved =>
      anchorStatus == AnchorStatus.exact ||
      anchorStatus == AnchorStatus.reconciled;
  bool get isAmbiguous => anchorStatus == AnchorStatus.ambiguous;
  bool get isUnresolved => anchorStatus == AnchorStatus.unresolved;

  /// Verifies if this anchor precisely matches the chapter content.
  bool isValidIn(String chapterContent) {
    if (startOffset < 0 ||
        endOffset > chapterContent.length ||
        startOffset > endOffset) {
      return false;
    }
    return chapterContent.substring(startOffset, endOffset) == selectedText;
  }

  /// Attempts to reconcile the anchor in modified chapter content by finding the nearest occurrence.
  HighlightEntity reconcileIn(String chapterContent) {
    if (isValidIn(chapterContent)) {
      return copyWith(anchorStatus: AnchorStatus.exact);
    }
    if (selectedText.isEmpty) {
      return copyWith(anchorStatus: AnchorStatus.unresolved);
    }

    final matches = <int>[];
    int searchFrom = 0;
    while (searchFrom < chapterContent.length) {
      final idx = chapterContent.indexOf(selectedText, searchFrom);
      if (idx == -1) break;
      matches.add(idx);
      searchFrom = idx + 1;
    }

    if (matches.isEmpty) {
      return copyWith(anchorStatus: AnchorStatus.unresolved);
    }

    if (matches.length == 1) {
      final unique = matches.first;
      return copyWith(
        startOffset: unique,
        endOffset: unique + selectedText.length,
        anchorStatus: AnchorStatus.reconciled,
      );
    }

    // Multiple matches: sort by proximity to the original startOffset
    matches.sort(
      (a, b) => (a - startOffset).abs().compareTo((b - startOffset).abs()),
    );
    final bestMatch = matches[0];
    final bestDist = (bestMatch - startOffset).abs();
    final secondBestDist = (matches[1] - startOffset).abs();

    if (bestDist < secondBestDist) {
      return copyWith(
        startOffset: bestMatch,
        endOffset: bestMatch + selectedText.length,
        anchorStatus: AnchorStatus.reconciled,
      );
    } else {
      // Equidistant matches cannot be determined safely without ambiguity
      return copyWith(anchorStatus: AnchorStatus.ambiguous);
    }
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
    AnchorStatus? anchorStatus,
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
      anchorStatus: anchorStatus ?? this.anchorStatus,
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
          colorValue == other.colorValue &&
          anchorStatus == other.anchorStatus;

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
    anchorStatus,
  );
}
