const { EMOTION_KEYWORDS } = require('../../shared/emotionKeywords');
const { enqueueAnalysis } = require('../utils/analysisQueue');
const logger = require('../utils/logger');

/**
 * Keyword-based emotion analysis. Results are metadata consumed by the
 * narration engine; sentence text is never rewritten.
 */
function analyzeSentence(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { emotion: 'neutral', confidence: 1.0 };
  }

  const lower = text.toLowerCase();
  const scores = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
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

function analyzeChapter(sentences) {
  if (!Array.isArray(sentences)) {
    logger.warn('analyzeChapter received non-array');
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

async function analyzeChapterAsync(sentences) {
  if (!Array.isArray(sentences) || sentences.length === 0) return [];

  // All async analysis funnels through the bounded queue (max 2 concurrent
  // Python processes, capped depth) so chapter processing cannot spawn
  // unbounded child processes under load. Falls back to the heuristic.
  try {
    const results = await enqueueAnalysis(sentences);
    if (Array.isArray(results) && results.length === sentences.length) {
      return results;
    }
  } catch (e) {
    logger.debug('Queued analysis unavailable, using heuristic:', e.message);
  }

  return analyzeChapter(sentences);
}

module.exports = { analyzeChapter, analyzeChapterAsync, analyzeSentence, emotionKeywords: EMOTION_KEYWORDS };