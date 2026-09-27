import { splitNarrativeSentences } from './sentenceSplitter';
import { analyzeChapter } from './emotionAnalyzer';

const EMPHASIS_WORDS = new Set([
  'never', 'always', 'forever', 'nothing', 'everything', 'gone',
  'death', 'love', 'hate', 'fear', 'terror', 'horror',
  'please', 'help', 'stop', 'wait', 'listen', 'silence',
  'impossible', 'unforgivable', 'devastating', 'unbearable',
  'goodbye', 'remember', 'promise', 'swear', 'beg',
  'screamed', 'whispered', 'cried', 'sobbed', 'laughed',
  'alone', 'empty', 'dark', 'cold', 'burning', 'shattered',
  'final', 'last', 'never again', 'no more', 'enough',
]);

function detectEmphasisWords(text) {
  const lower = text.toLowerCase();
  const words = lower.match(/\b\w+(?: \w+)?\b/g) || [];
  return words.filter(w => EMPHASIS_WORDS.has(w));
}

function isDialogue(text) {
  const t = text.trim();
  return /^["\u201C\u201E]/.test(t) || /["\u201D\u201C]$/.test(t);
}

function isQuestion(text) {
  return /[?]\s*$/.test(text.trim());
}

export function processChapterText(text) {
  if (!text || typeof text !== 'string') return [];

  const sentences = splitNarrativeSentences(text);
  const analyzedSentences = analyzeChapter(sentences);

  return analyzedSentences.map((result, index) => ({
    index,
    text: result.text,
    emotion: result.emotion,
    confidence: result.confidence,
    isDialogue: isDialogue(result.text),
    isQuestion: isQuestion(result.text),
    isParagraphStart: index === 0 || isParagraphStart(result.text),
    emphasisWords: detectEmphasisWords(result.text),
    wordCount: result.text.split(/\s+/).length,
    startChar: 0,
    endChar: result.text.length,
  }));
}

/**
 * Sentences beginning a fresh paragraph typically start with an indent
 * marker or opening quote directly after a paragraph break in the source
 * text. The splitter preserves double newlines as '\n' markers inside a
 * sentence chunk — detect a leading quote or dialogue dash as a strong
 * paragraph-start signal (conservative: preserves content either way).
 */
function isParagraphStart(text) {
  return /^["'\u201C\u2018\u2014\u2013]/.test((text || '').trim());
}

export default { processChapterText };
