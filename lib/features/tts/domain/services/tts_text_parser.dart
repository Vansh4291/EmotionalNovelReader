import '../entities/tts_entities.dart';

class TtsTextParser {
  const TtsTextParser();

  /// Segments chapter text into ordered, playable sentences with character offsets.
  List<TtsSentence> parseSentences(String text) {
    if (text.isEmpty) return const [];

    // Strip HTML markup if present
    final cleanText = text.replaceAll(RegExp(r'<[^>]*>'), ' ');
    final sentences = <TtsSentence>[];

    // Regex matching sentence terminators in Western and CJK scripts
    final pattern = RegExp(r'[^.!?\n。！？]+([.!?\n。！？]+|$)');
    final matches = pattern.allMatches(cleanText);

    int index = 0;
    for (final match in matches) {
      final sentenceRaw = match.group(0)?.trim() ?? '';
      if (sentenceRaw.isNotEmpty) {
        sentences.add(
          TtsSentence(
            index: index++,
            text: sentenceRaw,
            charStart: match.start,
            charEnd: match.end,
          ),
        );
      }
    }

    if (sentences.isEmpty && cleanText.trim().isNotEmpty) {
      sentences.add(
        TtsSentence(
          index: 0,
          text: cleanText.trim(),
          charStart: 0,
          charEnd: cleanText.length,
        ),
      );
    }

    return sentences;
  }
}
