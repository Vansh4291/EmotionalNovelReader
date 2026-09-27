import { computeDelivery, EMOTION_PROFILES, EMOTION_PAUSE_MS } from '../src/services/narration/emotionDelivery.js';

describe('emotionDelivery.computeDelivery', () => {
  test('user speed 1.0 stays 1.0 for neutral sentences (no perceptualSpeed hack)', () => {
    const p = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0, basePitch: 1.0 });
    expect(p.speed).toBeCloseTo(1.0, 5);
    expect(p.pitch).toBeCloseTo(1.0, 5);
  });

  test('sad sentences are slower and lower pitched than neutral', () => {
    const sad = computeDelivery({ sentence: {}, emotion: 'sadness', baseSpeed: 1.0, basePitch: 1.0 });
    const neutral = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0, basePitch: 1.0 });
    expect(sad.speed).toBeLessThan(neutral.speed);
    expect(sad.pitch).toBeLessThan(neutral.pitch);
    expect(sad.pauseAfter).toBeGreaterThan(neutral.pauseAfter);
  });

  test('angry dialogue is faster, higher, louder than base', () => {
    const p = computeDelivery({
      sentence: { isDialogue: true },
      emotion: 'anger',
      baseSpeed: 1.0,
      basePitch: 1.0,
    });
    const neutral = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0, basePitch: 1.0 });
    expect(p.speed).toBeGreaterThan(neutral.speed);
    expect(p.pitch).toBeGreaterThan(neutral.pitch);
  });

  test('fearful text is slower and softer than neutral', () => {
    const fear = computeDelivery({ sentence: {}, emotion: 'fear', baseSpeed: 1.0, basePitch: 1.0 });
    const neutral = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0, basePitch: 1.0 });
    expect(fear.speed).toBeLessThan(neutral.speed);
    expect(fear.pauseAfter).toBeGreaterThan(neutral.pauseAfter);
  });

  test('emphasis words slow delivery and add pauses', () => {
    const plain = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0 });
    const emphatic = computeDelivery({
      sentence: { emphasisWords: ['never', 'forever'] },
      emotion: 'neutral',
      baseSpeed: 1.0,
    });
    expect(emphatic.speed).toBeLessThan(plain.speed);
    expect(emphatic.pauseBefore).toBeGreaterThan(plain.pauseBefore);
    expect(emphatic.pauseAfter).toBeGreaterThan(plain.pauseAfter);
  });

  test('paragraph end adds a pause on top of emotion pause', () => {
    const mid = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0, isParagraphEnd: false });
    const end = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0, isParagraphEnd: true });
    expect(end.pauseAfter).toBe(mid.pauseAfter + 450);
  });

  test('emotion effects disabled falls back to base settings with neutral pacing', () => {
    const p = computeDelivery({
      sentence: { isDialogue: true, emphasisWords: ['love'] },
      emotion: 'sadness',
      baseSpeed: 1.0,
      basePitch: 1.0,
      emotionEffectsEnabled: false,
    });
    expect(p.speed).toBeCloseTo(1.0, 5);
    expect(p.pitch).toBeCloseTo(1.0, 5);
    expect(p.pauseAfter).toBe(EMOTION_PAUSE_MS.neutral);
  });

  test('all results are clamped to valid ranges', () => {
    const extreme = computeDelivery({ sentence: {}, emotion: 'anger', baseSpeed: 2.0, basePitch: 2.0 });
    expect(extreme.speed).toBeLessThanOrEqual(2.0);
    expect(extreme.pitch).toBeLessThanOrEqual(2.0);
    const slow = computeDelivery({ sentence: {}, emotion: 'sadness', baseSpeed: 0.5, basePitch: 0.5 });
    expect(slow.speed).toBeGreaterThanOrEqual(0.5);
    expect(slow.pitch).toBeGreaterThanOrEqual(0.5);
  });

  test('unknown emotion falls back to neutral profile', () => {
    const unknown = computeDelivery({ sentence: {}, emotion: 'mystery', baseSpeed: 1.0 });
    const neutral = computeDelivery({ sentence: {}, emotion: 'neutral', baseSpeed: 1.0 });
    expect(unknown.speed).toBeCloseTo(neutral.speed, 5);
  });

  test('every emotion profile has speed, pitch and volume', () => {
    for (const [emotion, profile] of Object.entries(EMOTION_PROFILES)) {
      expect(typeof profile.speed).toBe('number');
      expect(typeof profile.pitch).toBe('number');
      expect(typeof profile.volume).toBe('number');
      expect(EMOTION_PAUSE_MS[emotion]).toBeDefined();
    }
  });
});
