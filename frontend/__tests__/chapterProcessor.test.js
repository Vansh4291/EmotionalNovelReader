import { processChapterText } from '../src/utils/chapterProcessor.js';

describe('processChapterText', () => {
  test('processes text with sentences', () => {
    const result = processChapterText('I am happy. This is sad.');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('text');
    expect(result[0]).toHaveProperty('emotion');
    expect(result[0]).toHaveProperty('confidence');
    expect(result[0]).toHaveProperty('index');
  });

  test('detects joy emotion', () => {
    const result = processChapterText('I am so happy and excited!');
    expect(result[0].emotion).toBe('joy');
  });

  test('returns empty array for empty string', () => {
    const result = processChapterText('');
    expect(result).toEqual([]);
  });

  test('returns empty array for null', () => {
    const result = processChapterText(null);
    expect(result).toEqual([]);
  });

  test('returns empty array for non-string', () => {
    const result = processChapterText(123);
    expect(result).toEqual([]);
  });
});
