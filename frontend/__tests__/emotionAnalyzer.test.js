import { analyzeSentence, analyzeChapter } from '../src/utils/emotionAnalyzer.js';

describe('analyzeSentence', () => {
  test('returns joy for happy text', () => {
    const result = analyzeSentence('I am so happy and excited!');
    expect(result.emotion).toBe('joy');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('returns sadness for sad text', () => {
    const result = analyzeSentence('She cried and wept with sorrow.');
    expect(result.emotion).toBe('sadness');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('returns anger for angry text', () => {
    const result = analyzeSentence('He was furious and enraged!');
    expect(result.emotion).toBe('anger');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('returns fear for fearful text', () => {
    const result = analyzeSentence('She was terrified and shaking with fear.');
    expect(result.emotion).toBe('fear');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('returns surprise for surprising text', () => {
    const result = analyzeSentence('What?! I am astonished and stunned!');
    expect(result.emotion).toBe('surprise');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('returns neutral for empty text', () => {
    const result = analyzeSentence('');
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(1.0);
  });

  test('returns neutral for non-emotional text', () => {
    const result = analyzeSentence('The cat sat on the mat.');
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(1.0);
  });

  test('handles null input', () => {
    const result = analyzeSentence(null);
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(1.0);
  });

  test('handles undefined input', () => {
    const result = analyzeSentence(undefined);
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(1.0);
  });
});

describe('analyzeChapter', () => {
  test('returns analyzed sentences for an array', () => {
    const sentences = [
      'I am happy and joyful!',
      'This is a sad and tragic story.',
    ];
    const results = analyzeChapter(sentences);
    expect(results).toHaveLength(2);
    expect(results[0].emotion).toBe('joy');
    expect(results[1].emotion).toBe('sadness');
    expect(results[0].index).toBe(0);
    expect(results[1].index).toBe(1);
  });

  test('returns empty array for empty input', () => {
    const results = analyzeChapter([]);
    expect(results).toHaveLength(0);
  });

  test('handles non-array input gracefully', () => {
    const results = analyzeChapter(null);
    expect(results).toHaveLength(0);
  });
});
