/**
 * Emotion → voice parameter mapping. Single source of truth for narration
 * delivery across the app (imported by the reader playback hook and by unit
 * tests).
 *
 * Design rules:
 * - Base speed/pitch from the user's settings are MULTIPLIED by the emotion
 *   profile — 1.0x user speed means what the user expects. The old
 *   `perceptualSpeed` table (which turned 1.0x into 0.40 device rate) was a
 *   bug and is intentionally gone.
 * - Emotion data is metadata attached to sentences; this module only reads
 *   it. Sentence text is never modified or annotated here.
 * - When emotion effects are disabled, delivery stays at the user's base
 *   settings (graceful fallback).
 */

export const EMOTION_PROFILES = {
  joy:      { speed: 1.15, pitch: 1.10, volume: 1.00 },
  sadness:  { speed: 0.80, pitch: 0.90, volume: 0.85 },
  anger:    { speed: 1.10, pitch: 1.05, volume: 1.10 },
  fear:     { speed: 0.92, pitch: 1.06, volume: 0.90 },
  surprise: { speed: 1.05, pitch: 1.15, volume: 1.05 },
  neutral:  { speed: 1.00, pitch: 1.00, volume: 1.00 },
};

/**
 * Inter-sentence pause after a sentence with the given emotion (ms).
 * Paragraph-final sentences (next sentence starts a new paragraph or the
 * chapter/section ends) get PARAGRAPH_PAUSE_MS added on top.
 */
export const EMOTION_PAUSE_MS = {
  sadness: 700,
  fear: 600,
  joy: 250,
  anger: 150,
  surprise: 350,
  neutral: 220,
};

export const PARAGRAPH_PAUSE_MS = 450;
export const DIALOGUE_SPEED_FACTOR = 0.92;
export const DIALOGUE_PITCH_FACTOR = 1.04;
export const QUESTION_PITCH_FACTOR = 1.06;
export const EMPHASIS_SPEED_FACTOR = 0.85;
export const EMPHASIS_PAUSE_BEFORE_MS = 250;
export const EMPHASIS_EXTRA_PAUSE_MS = 350;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Compute delivery parameters for one sentence.
 *
 * @param {object} args
 * @param {object} args.sentence           Sentence metadata (isDialogue, isQuestion, emphasisWords, …)
 * @param {string} args.emotion            Emotion label for this sentence
 * @param {number} args.baseSpeed          User base speed (0.5–2.0)
 * @param {number} [args.basePitch]        User base pitch (0.5–2.0)
 * @param {boolean} [args.isParagraphEnd]  True when the next sentence starts a new paragraph
 * @param {boolean} [args.emotionEffectsEnabled] When false, emotion shaping is skipped
 * @returns {{speed:number, pitch:number, pauseBefore:number, pauseAfter:number, volume:number}}
 */
export function computeDelivery({
  sentence,
  emotion,
  baseSpeed,
  basePitch = 1.0,
  isParagraphEnd = false,
  emotionEffectsEnabled = true,
}) {
  const profile = emotionEffectsEnabled
    ? (EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral)
    : EMOTION_PROFILES.neutral;

  let speed = (baseSpeed || 1.0) * profile.speed;
  let pitch = (basePitch || 1.0) * profile.pitch;
  let volume = clamp((1.0) * (profile.volume ?? 1.0), 0.0, 1.0);

  let pauseBefore = 0;
  let pauseAfter = emotionEffectsEnabled
    ? (EMOTION_PAUSE_MS[emotion] ?? EMOTION_PAUSE_MS.neutral)
    : EMOTION_PAUSE_MS.neutral;

  const s = sentence || {};

  if (emotionEffectsEnabled) {
    if (s.isDialogue) {
      speed *= DIALOGUE_SPEED_FACTOR;
      pitch *= DIALOGUE_PITCH_FACTOR;
    }
    if (s.isQuestion) {
      pitch *= QUESTION_PITCH_FACTOR;
    }
    if (Array.isArray(s.emphasisWords) && s.emphasisWords.length > 0) {
      speed *= EMPHASIS_SPEED_FACTOR;
      pauseBefore += EMPHASIS_PAUSE_BEFORE_MS;
      pauseAfter += EMPHASIS_EXTRA_PAUSE_MS;
    }
  }

  if (isParagraphEnd) {
    pauseAfter += PARAGRAPH_PAUSE_MS;
  }

  return {
    speed: clamp(speed, 0.5, 2.0),
    pitch: clamp(pitch, 0.5, 2.0),
    volume,
    pauseBefore,
    pauseAfter,
  };
}

export const PAUSE = {
  paragraph: PARAGRAPH_PAUSE_MS,
  emotion: EMOTION_PAUSE_MS,
};

export default {
  EMOTION_PROFILES,
  EMOTION_PAUSE_MS,
  computeDelivery,
  PAUSE,
};
