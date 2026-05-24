import { splitBySentenceDelimiters } from '../src/utils/sentenceSplitter.js';

describe('splitBySentenceDelimiters', () => {
  test('splits simple sentences', () => {
    const result = splitBySentenceDelimiters('Hello world. This is a test.');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Hello world.');
    expect(result[1]).toBe('This is a test.');
  });

  test('handles empty text', () => {
    expect(splitBySentenceDelimiters('')).toEqual([]);
  });

  test('handles null input', () => {
    expect(splitBySentenceDelimiters(null)).toEqual([]);
  });

  test('handles non-string input', () => {
    expect(splitBySentenceDelimiters(123)).toEqual([]);
  });
});
