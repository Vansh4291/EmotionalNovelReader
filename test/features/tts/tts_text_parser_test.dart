import 'package:emotional_novel_reader/features/tts/domain/services/tts_text_parser.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const parser = TtsTextParser();

  group('TtsTextParser Tests', () {
    test('Empty text produces empty sentence list', () {
      expect(parser.parseSentences(''), isEmpty);
      expect(parser.parseSentences('   '), isEmpty);
    });

    test('Parses English paragraph into distinct sentences with correct offsets', () {
      const text =
          'The protagonist woke up in a quiet room. Where was she? Nobody answered! Finally, she stepped outside.';
      final sentences = parser.parseSentences(text);

      expect(sentences.length, 4);
      expect(sentences[0].text, 'The protagonist woke up in a quiet room.');
      expect(sentences[0].index, 0);
      expect(sentences[0].charStart, 0);

      expect(sentences[1].text, 'Where was she?');
      expect(sentences[1].index, 1);

      expect(sentences[2].text, 'Nobody answered!');
      expect(sentences[2].index, 2);

      expect(sentences[3].text, 'Finally, she stepped outside.');
      expect(sentences[3].index, 3);
    });

    test('Parses Japanese / CJK text with full-width punctuation', () {
      const text = '本好きの下剋上。司書になるためには手段を選んでいられません！本当に？';
      final sentences = parser.parseSentences(text);

      expect(sentences.length, 3);
      expect(sentences[0].text, '本好きの下剋上。');
      expect(sentences[1].text, '司書になるためには手段を選んでいられません！');
      expect(sentences[2].text, '本当に？');
    });

    test('Strips HTML tags safely before sentence tokenization', () {
      const htmlText = '<p>Hello world. <b>This is bold text!</b></p><br/>';
      final sentences = parser.parseSentences(htmlText);

      expect(sentences.length, 2);
      expect(sentences[0].text, 'Hello world.');
      expect(sentences[1].text, 'This is bold text!');
    });
  });
}
