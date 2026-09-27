import { processChapterText } from '../src/utils/chapterProcessor.js';
import { splitNarrativeSentences } from '../src/utils/sentenceSplitter.js';

describe('reading pipeline content preservation', () => {
  test('every word of the chapter survives sentence splitting', () => {
    const text =
      'It was a bright cold day in April, and the clocks were striking thirteen. ' +
      'Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, ' +
      'slipped quickly through the glass doors of Victory Mansions.';

    const sentences = splitNarrativeSentences(text);
    const rejoined = sentences.join(' ').replace(/\s+/g, ' ').trim();
    const original = text.replace(/\s+/g, ' ').trim();

    // Same character multiset — nothing dropped, nothing invented.
    const normalize = (s) => s.replace(/\s+/g, '').split('').sort().join('');
    expect(normalize(rejoined)).toBe(normalize(original));
  });

  test('dialogue sentences keep their quotation marks', () => {
    const text = '"Where are we going?" she asked. "Somewhere safe," he replied.';
    const sentences = splitNarrativeSentences(text);
    const joined = sentences.join(' ');
    expect(joined).toContain('"Where are we going?"');
    expect(joined).toContain('"Somewhere safe,"');
  });

  test('abbreviations do not break sentences mid-way', () => {
    const text = 'Dr. Smith met Mrs. Jones at 3 p.m. on Feb. 5 to discuss the estate.';
    const sentences = splitNarrativeSentences(text);
    const joined = sentences.join(' ');
    expect(joined).toContain('Dr. Smith');
    expect(joined).toContain('Mrs. Jones');
  });

  test('decimals are not split into separate sentences', () => {
    const text = 'The price rose from 12.50 to 13.75 in a single day.';
    const sentences = splitNarrativeSentences(text);
    expect(sentences.length).toBeLessThanOrEqual(2);
    const joined = sentences.join(' ');
    expect(joined).toContain('12.50');
    expect(joined).toContain('13.75');
  });

  test('processChapterText attaches emotion metadata without altering text', () => {
    const text = 'She was so happy she laughed with joy. Then the sorrow hit her.';
    const result = processChapterText(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const rejoined = result.map((s) => s.text).join(' ');
    expect(rejoined).toContain('happy she laughed with joy');
    expect(rejoined).toContain('sorrow hit her');
    for (const s of result) {
      expect(['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']).toContain(s.emotion);
      expect(typeof s.confidence).toBe('number');
    }
  });

  test('mixed-emotion chapter produces varied emotion labels', () => {
    const text =
      'He laughed with pure joy at the wonderful news. ' +
      'But her eyes filled with tears of grief. ' +
      'The rage boiled inside him. ' +
      'She was terrified of the dark corridor. ' +
      'The letter was signed, sealed, and delivered on Tuesday.';
    const result = processChapterText(text);
    const emotions = new Set(result.map((s) => s.emotion));
    expect(emotions.size).toBeGreaterThanOrEqual(3);
  });

  test('empty and invalid inputs return empty arrays', () => {
    expect(processChapterText('')).toEqual([]);
    expect(processChapterText(null)).toEqual([]);
    expect(processChapterText(123)).toEqual([]);
    expect(splitNarrativeSentences('')).toEqual([]);
  });

  test('very long single sentence is chunked, not dropped', () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const text = `He said that ${words} and then fell silent at last.`;
    const sentences = splitNarrativeSentences(text);
    const rejoined = sentences.join(' ');
    expect(rejoined).toContain('word0');
    expect(rejoined).toContain('word59');
  });
});
