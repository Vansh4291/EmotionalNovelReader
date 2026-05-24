const EMOTION_KEYWORDS = {
  joy: [
    'laugh', 'smile', 'happy', 'joy', 'excited', 'wonderful', 'amazing',
    'love', 'beautiful', 'celebrate', 'cheer', 'delight', 'glad', 'thrilled',
    'giggle', 'haha', 'yay', 'hooray', 'bliss', 'elated', 'grin',
    'delighted', 'ecstatic', 'euphoric', 'content', 'pleased', 'grateful',
    'optimistic', 'hopeful', 'bright', 'cheerful', 'merry', 'jolly'
  ],
  sadness: [
    'cry', 'sob', 'tears', 'sad', 'grief', 'sorrow', 'mourn', 'weep',
    'lonely', 'miss', 'lost', 'pain', 'hurt', 'heartbreak', 'despair',
    'hollow', 'empty', 'silent tears', 'trembling lips', 'couldn\'t stop crying',
    'gloomy', 'depressed', 'miserable', 'unfortunate', 'tragic', 'devastated',
    'anguish', 'melancholy', 'weeping', 'heartache', 'loveless', 'abandoned'
  ],
  anger: [
    'angry', 'rage', 'furious', 'shout', 'yell', 'scream', 'hate',
    'frustrat', 'annoy', 'slam', 'clench', 'growl', 'roar', 'explode',
    'damn', 'stupid', 'idiot', 'crush', 'smash', 'glare', 'bitter',
    'enraged', 'irritated', 'infuriated', 'livid', 'hostile', 'wrath',
    'scold', 'rebuke', 'resent', 'bitterly', 'outraged'
  ],
  fear: [
    'afraid', 'fear', 'terrif', 'horror', 'dread', 'panic', 'tremble',
    'shake', 'shiver', 'cower', 'flee', 'nightmare', 'monster', 'danger',
    'heart pounding', 'cold sweat', 'frozen', 'paralyzed', 'gulp',
    'terrified', 'scared', 'frightened', 'petrified', 'anxious', 'worried',
    'nervous', 'apprehensive', 'uneasy', 'worst', 'threat', 'suspicious'
  ],
  surprise: [
    'surprise', 'shock', 'sudden', 'unexpected', 'gasp', 'unbelievable',
    'impossible', 'what?!', 'no way', 'suddenly', 'out of nowhere',
    'eyes wide', 'jaw dropped', 'couldn\'t believe', 'astonished', 'stunned',
    'startled', 'bewildered', 'amazed', 'astounded', 'incredible', 'unexpectedly'
  ],
};

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

export default { analyzeChapter, analyzeSentence };