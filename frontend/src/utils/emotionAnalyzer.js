import { EMOTION_KEYWORDS } from '../../../shared/emotionKeywords';

const makeRegExp = (keyword) => new RegExp(`\\b${keyword}\\b`, 'i');

const EMOTION_REGEXES = {};
for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
  EMOTION_REGEXES[emotion] = keywords.map(makeRegExp);
}

export function analyzeSentence(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { emotion: 'neutral', confidence: 1.0 };
  }

  const lower = text.toLowerCase();
  const scores = {};

  for (const [emotion, regexes] of Object.entries(EMOTION_REGEXES)) {
    let score = 0;
    for (const regex of regexes) {
      if (regex.test(lower)) {
        score += 1;
      }
    }
    scores[emotion] = score;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { emotion: 'neutral', confidence: 1.0 };
  }

  const topEmotion = Object.keys(scores).find(k => scores[k] === maxScore);
  const confidence = Math.min(maxScore / 3, 1.0);

  return { emotion: topEmotion, confidence };
}

export function analyzeChapter(sentences) {
  if (!Array.isArray(sentences)) {
    console.warn('analyzeChapter received non-array:', sentences);
    return [];
  }

  return sentences.map((text, index) => {
    if (typeof text !== 'string') {
      return { index, text: String(text), emotion: 'neutral', confidence: 1.0 };
    }
    return {
      index,
      text,
      ...analyzeSentence(text),
    };
  });
}