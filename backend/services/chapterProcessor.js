const { splitBySentenceDelimiters } = require('../utils/sentenceSplitter');
const { analyzeChapterAsync } = require('../emotion/emotionAnalyzer');

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