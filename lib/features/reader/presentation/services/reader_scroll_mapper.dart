import 'package:flutter/material.dart';

/// Structured parsed location representation distinguishing character offsets
/// from legacy pixel scroll offsets.
class ParsedLocation {
  const ParsedLocation({required this.isCharOffset, required this.value});

  final bool isCharOffset;
  final double value;

  int get charOffset => value.toInt();
  double get pixelOffset => value;
}

/// Utility for accurately converting between text character offsets and rendered pixel
/// scroll offsets, and determining visible reading positions.
class ReaderScrollMapper {
  const ReaderScrollMapper._();

  /// Parses a location string into a structured ParsedLocation.
  /// Formats handled:
  /// - 'char:1250' -> Character offset 1250
  /// - '1250' -> Integer character offset 1250
  /// - '1250.5' -> Legacy float pixel offset 1250.5
  static ParsedLocation parseLocation(String? location) {
    if (location == null || location.isEmpty) {
      return const ParsedLocation(isCharOffset: true, value: 0.0);
    }

    if (location.startsWith('char:')) {
      final parsed = double.tryParse(location.substring(5)) ?? 0.0;
      return ParsedLocation(isCharOffset: true, value: parsed);
    }

    // If it contains a decimal point, it was stored as a raw scroll offset in earlier versions
    if (location.contains('.')) {
      final parsed = double.tryParse(location) ?? 0.0;
      return ParsedLocation(isCharOffset: false, value: parsed);
    }

    // Default integer is treated as character offset
    final parsed = double.tryParse(location) ?? 0.0;
    return ParsedLocation(isCharOffset: true, value: parsed);
  }

  /// Calculates vertical scroll pixel offset for a character offset in chapter content.
  static double calculatePixelOffset({
    required String content,
    required int charOffset,
    required TextStyle textStyle,
    required double contentWidth,
    double headerHeight = 0.0,
  }) {
    if (content.isEmpty || charOffset <= 0 || contentWidth <= 0) {
      return headerHeight;
    }

    final clamped = charOffset.clamp(0, content.length);
    final textPainter = TextPainter(
      text: TextSpan(text: content, style: textStyle),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout(maxWidth: contentWidth);

    final caret = textPainter.getOffsetForCaret(
      TextPosition(offset: clamped),
      Rect.zero,
    );
    textPainter.dispose();

    return (headerHeight + caret.dy).clamp(0.0, double.infinity);
  }

  /// Calculates the visible character offset from a vertical scroll pixel offset.
  static int calculateCharOffset({
    required String content,
    required double scrollOffset,
    required TextStyle textStyle,
    required double contentWidth,
    double headerHeight = 0.0,
  }) {
    if (content.isEmpty || contentWidth <= 0) {
      return 0;
    }

    final relativeY = (scrollOffset - headerHeight).clamp(0.0, double.infinity);
    final textPainter = TextPainter(
      text: TextSpan(text: content, style: textStyle),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout(maxWidth: contentWidth);

    final textPosition = textPainter.getPositionForOffset(Offset(0, relativeY));
    textPainter.dispose();

    return textPosition.offset.clamp(0, content.length);
  }
}
