import { splitBySentenceDelimiters } from './sentenceSplitter';
import { analyzeChapter } from './emotionAnalyzer';

export function processChapterText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sentences = splitBySentenceDelimiters(text);
  const analyzedSentences = analyzeChapter(sentences);

  return analyzedSentences.map((result, index) => ({
    index,
    text: result.text,
    emotion: result.emotion,
    confidence: result.confidence,
    startChar: 0,
    endChar: result.text.length,
  }));
}

export default { processChapterText };