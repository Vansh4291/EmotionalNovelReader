enum TtsPlaybackStatus { stopped, playing, paused }

class TtsVoiceEntity {
  const TtsVoiceEntity({required this.name, required this.locale});

  final String name;
  final String locale;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TtsVoiceEntity &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          locale == other.locale;

  @override
  int get hashCode => name.hashCode ^ locale.hashCode;
}

class TtsSentence {
  const TtsSentence({
    required this.index,
    required this.text,
    required this.charStart,
    required this.charEnd,
  });

  final int index;
  final String text;
  final int charStart;
  final int charEnd;
}
