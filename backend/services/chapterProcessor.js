const { splitBySentenceDelimiters } = require('../utils/sentenceSplitter');
const { analyzeChapterAsync } = require('../emotion/emotionAnalyzer');

/**
 * Convert raw chapter text into narration-ready sentences with emotion
 * metadata. Emotion data is metadata only — the sentence text is never
 * rewritten or annotated inline.
 */
async function processChapterText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sentences = splitBySentenceDelimiters(text);
  const analyzedSentences = await analyzeChapterAsync(sentences);

  return analyzedSentences.map((result, index) => ({
    index,
    text: result.text,
    emotion: result.emotion,
    confidence: result.confidence,
    startChar: 0,
    endChar: result.text.length,
  }));
}

module.exports = { processChapterText };