/// Themes available in the reader.
enum ReaderThemeMode {
  system,
  light,
  dark,
  sepia,
}

/// User preferences for the reader display and typography.
class ReaderPreferences {
  const ReaderPreferences({
    this.fontSize = 18.0,
    this.lineHeight = 1.6,
    this.horizontalMargin = 20.0,
    this.themeMode = ReaderThemeMode.system,
  });

  final double fontSize;
  final double lineHeight;
  final double horizontalMargin;
  final ReaderThemeMode themeMode;

  ReaderPreferences copyWith({
    double? fontSize,
    double? lineHeight,
    double? horizontalMargin,
    ReaderThemeMode? themeMode,
  }) {
    return ReaderPreferences(
      fontSize: fontSize ?? this.fontSize,
      lineHeight: lineHeight ?? this.lineHeight,
      horizontalMargin: horizontalMargin ?? this.horizontalMargin,
      themeMode: themeMode ?? this.themeMode,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReaderPreferences &&
          runtimeType == other.runtimeType &&
          fontSize == other.fontSize &&
          lineHeight == other.lineHeight &&
          horizontalMargin == other.horizontalMargin &&
          themeMode == other.themeMode;

  @override
  int get hashCode => Object.hash(fontSize, lineHeight, horizontalMargin, themeMode);
}

