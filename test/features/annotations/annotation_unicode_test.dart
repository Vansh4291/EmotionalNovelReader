import 'package:emotional_novel_reader/features/annotations/domain/entities/highlight_entity.dart';
import 'package:emotional_novel_reader/features/reader/presentation/screens/reader_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Annotation Unicode & Anchor Reconciliation Tests', () {
    test('Hindi (Devanagari) offsets and reconciliation', () {
      const chapterContent = 'नमस्ते दुनिया! यह एक भावनात्मक उपन्यास पाठक है।';
      // "भावनात्मक" is at UTF-16 offset 22 to 31
      const targetWord = 'भावनात्मक';
      final start = chapterContent.indexOf(targetWord);
      final end = start + targetWord.length;

      final highlight = HighlightEntity(
        id: 'hl-hindi',
        bookId: 'b1',
        startOffset: start,
        endOffset: end,
        selectedText: targetWord,
        createdAt: DateTime.now(),
      );

      // Verify exact slice matching
      expect(chapterContent.substring(highlight.startOffset, highlight.endOffset), targetWord);
      expect(highlight.isValidIn(chapterContent), isTrue);

      // Simulate chapter text shift (prepended text)
      const shiftedContent = 'अध्याय १: नमस्ते दुनिया! यह एक भावनात्मक उपन्यास पाठक है।';
      expect(highlight.isValidIn(shiftedContent), isFalse);

      // Reconcile
      final reconciled = highlight.reconcileIn(shiftedContent);
      expect(reconciled.isResolved, isTrue);
      expect(shiftedContent.substring(reconciled.startOffset, reconciled.endOffset), targetWord);
    });

    test('Gujarati offsets and reconciliation', () {
      const chapterContent = 'નમસ્તે દુનિયા! આ એક સરસ પુસ્તક છે.';
      const targetWord = 'પુસ્તક';
      final start = chapterContent.indexOf(targetWord);
      final end = start + targetWord.length;

      final highlight = HighlightEntity(
        id: 'hl-gujarati',
        bookId: 'b1',
        startOffset: start,
        endOffset: end,
        selectedText: targetWord,
        createdAt: DateTime.now(),
      );

      expect(chapterContent.substring(highlight.startOffset, highlight.endOffset), targetWord);
      expect(highlight.isValidIn(chapterContent), isTrue);

      const shiftedContent = 'પ્રકરણ ૧: નમસ્તે દુનિયા! આ એક સરસ પુસ્તક છે.';
      final reconciled = highlight.reconcileIn(shiftedContent);
      expect(reconciled.isResolved, isTrue);
      expect(shiftedContent.substring(reconciled.startOffset, reconciled.endOffset), targetWord);
    });

    test('Japanese (Kanji and Kana) offsets and reconciliation', () {
      const chapterContent = '吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。';
      const targetWord = '名前はまだ無い';
      final start = chapterContent.indexOf(targetWord);
      final end = start + targetWord.length;

      final highlight = HighlightEntity(
        id: 'hl-japanese',
        bookId: 'b1',
        startOffset: start,
        endOffset: end,
        selectedText: targetWord,
        createdAt: DateTime.now(),
      );

      expect(chapterContent.substring(highlight.startOffset, highlight.endOffset), targetWord);
      expect(highlight.isValidIn(chapterContent), isTrue);

      const shiftedContent = '【第一章】吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。';
      final reconciled = highlight.reconcileIn(shiftedContent);
      expect(reconciled.isResolved, isTrue);
      expect(shiftedContent.substring(reconciled.startOffset, reconciled.endOffset), targetWord);
    });

    test('Chinese (Simplified) offsets and reconciliation', () {
      const chapterContent = '道可道，非常道；名可名，非常名。無名天地之始，有名萬物之母。';
      const targetWord = '無名天地之始';
      final start = chapterContent.indexOf(targetWord);
      final end = start + targetWord.length;

      final highlight = HighlightEntity(
        id: 'hl-chinese',
        bookId: 'b1',
        startOffset: start,
        endOffset: end,
        selectedText: targetWord,
        createdAt: DateTime.now(),
      );

      expect(chapterContent.substring(highlight.startOffset, highlight.endOffset), targetWord);
      expect(highlight.isValidIn(chapterContent), isTrue);

      const modifiedContent = '老子曰：道可道，非常道；名可名，非常名。無名天地之始，有名萬物之母。';
      final reconciled = highlight.reconcileIn(modifiedContent);
      expect(reconciled.isResolved, isTrue);
      expect(modifiedContent.substring(reconciled.startOffset, reconciled.endOffset), targetWord);
    });

    test('Emoji and Surrogate pairs offset integrity', () {
      // Emojis like 📖 (U+1F4D6) are surrogate pairs in UTF-16 (2 code units)
      const chapterContent = 'Chapter Title 📖✨ A Tale of Magic 🔥 and Wonder';
      const targetWord = 'A Tale of Magic 🔥';
      final start = chapterContent.indexOf(targetWord);
      final end = start + targetWord.length;

      final highlight = HighlightEntity(
        id: 'hl-emoji',
        bookId: 'b1',
        startOffset: start,
        endOffset: end,
        selectedText: targetWord,
        createdAt: DateTime.now(),
      );

      expect(chapterContent.substring(highlight.startOffset, highlight.endOffset), targetWord);
      expect(highlight.isValidIn(chapterContent), isTrue);
    });

    test('buildHighlightedSpans correctly partitions text into styled spans', () {
      const content = 'The quick brown fox jumps over the lazy dog.';
      // Highlight "brown fox" (10..19) and "lazy dog" (35..43)
      final h1 = HighlightEntity(
        id: 'h1',
        bookId: 'b1',
        startOffset: 10,
        endOffset: 19,
        selectedText: 'brown fox',
        colorValue: 0xFFFFF59D,
        createdAt: DateTime.now(),
      );
      final h2 = HighlightEntity(
        id: 'h2',
        bookId: 'b1',
        startOffset: 35,
        endOffset: 43,
        selectedText: 'lazy dog',
        colorValue: 0xFFA5D6A7,
        note: 'Favorite quote',
        createdAt: DateTime.now(),
      );

      const baseStyle = TextStyle(fontSize: 16, color: Colors.black);
      final spans = ReaderScreen.buildHighlightedSpans(
        content: content,
        highlights: [h1, h2],
        baseStyle: baseStyle,
      );

      // Expected spans:
      // 1. "The quick " (0..10, normal)
      // 2. "brown fox" (10..19, highlighted yellow)
      // 3. " jumps over the " (19..35, normal)
      // 4. "lazy dog" (35..43, highlighted green with note decoration)
      // 5. "." (43..44, normal)
      expect(spans.length, 5);

      expect((spans[0] as TextSpan).text, 'The quick ');
      expect((spans[0] as TextSpan).style?.backgroundColor, isNull);

      expect((spans[1] as TextSpan).text, 'brown fox');
      expect((spans[1] as TextSpan).style?.backgroundColor, isNotNull);

      expect((spans[2] as TextSpan).text, ' jumps over the ');
      expect((spans[2] as TextSpan).style?.backgroundColor, isNull);

      expect((spans[3] as TextSpan).text, 'lazy dog');
      expect((spans[3] as TextSpan).style?.decoration, TextDecoration.underline);

      expect((spans[4] as TextSpan).text, '.');
    });

    test('buildHighlightedSpans gracefully handles overlapping and inverted highlights', () {
      const content = 'ABCDEFGHIJ';
      // Overlapping: h1 is 2..6, h2 is 4..8
      final h1 = HighlightEntity(
        id: 'h1',
        bookId: 'b1',
        startOffset: 2,
        endOffset: 6,
        selectedText: 'CDEF',
        createdAt: DateTime.now(),
      );
      final h2 = HighlightEntity(
        id: 'h2',
        bookId: 'b1',
        startOffset: 4,
        endOffset: 8,
        selectedText: 'EFGH',
        createdAt: DateTime.now(),
      );
      // Inverted / invalid: startOffset >= endOffset
      final hInvalid = HighlightEntity(
        id: 'h3',
        bookId: 'b1',
        startOffset: 9,
        endOffset: 5,
        selectedText: '',
        createdAt: DateTime.now(),
      );

      const baseStyle = TextStyle(fontSize: 16);
      final spans = ReaderScreen.buildHighlightedSpans(
        content: content,
        highlights: [h1, h2, hInvalid],
        baseStyle: baseStyle,
      );

      // Reconstructed text should match content exactly
      final reconstructed = spans.map((s) => (s as TextSpan).text).join('');
      expect(reconstructed, content);
    });
  });
}
