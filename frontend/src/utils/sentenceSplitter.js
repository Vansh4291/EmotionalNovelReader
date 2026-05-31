const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd', 'rd',
  'etc', 'vs', 'viz', 'dept', 'est', 'govt', 'approx', 'appt', 'apt',
  'capt', 'col', 'gen', 'lt', 'maj', 'sgt', 'sen', 'rep', 'gov', 'pres',
  'univ', 'co', 'corp', 'inc', 'ltd',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'i.e', 'e.g', 'p.s', 'a.m', 'p.m',
]);

const OPENING_QUOTES = new Set(['"', '\u201C', '\u201E', '\u2018', '\u300C', '\u300E']);
const CLOSING_QUOTES = new Set(['"', '\u201D', '\u2019', '\u300D', '\u300F']);

function isAbbreviation(word) {
  const clean = word.replace(/[^a-z.]/g, '').toLowerCase();
  if (ABBREVIATIONS.has(clean)) return true;
  if (/^[a-z]\.$/i.test(clean)) return true;
  return false;
}

export function splitNarrativeSentences(text) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  let processed = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const placeholders = [];

  function protect(pattern, prefix) {
    processed = processed.replace(pattern, (match) => {
      const key = `\x00${prefix}${placeholders.length}\x00`;
      placeholders.push(match);
      return key;
    });
  }

  protect(/\.{3,}/g, 'E');
  protect(/\b(\d+)\.(\d+)\b/g, 'D');
  protect(/([A-Z])\.(?=\s[A-Z])/g, 'I');
  protect(/([A-Za-z]\.)(?=\s[a-z])/g, 'L');

  const raw = processed.split(/(?<=[.!?])\s+(?=["\u201C\u201D\u2018\u2019A-Z])/);
  let sentences = raw.map(s => s.trim()).filter(s => s.length > 0);

  sentences = sentences.map(s => {
    return s.replace(/\x00[EDIL]\d+\x00/g, (match) => {
      const idx = parseInt(match.replace(/\x00[EDIL]/, '').replace(/\x00/, ''));
      return placeholders[idx] || match;
    });
  });

  const result = [];
  for (const sentence of sentences) {
    if (sentence.length <= 2) continue;
    if (/^[^a-zA-Z0-9]+$/.test(sentence)) continue;

    const words = sentence.split(/\s+/);
    if (words.length > 25) {
      const chunks = softChunk(sentence);
      result.push(...chunks);
    } else {
      result.push(sentence);
    }
  }

  return result.length > 0 ? result : fallbackSplit(trimmed);
}

function softChunk(text) {
  const PAUSES = /[;—–](?=\s)|\)(?=\s)|,(?=\s[^\s]{1,15}\s[^\s]{1,15})/g;
  const words = text.split(/\s+/);
  if (words.length <= 25) return [text];

  const pauses = [];
  let match;
  while ((match = PAUSES.exec(text)) !== null) {
    pauses.push(match.index);
  }
  if (pauses.length === 0) return [text];

  const midpoint = words.length / 2;
  const midChar = Math.floor((midpoint / words.length) * text.length);
  let best = pauses[0];
  let bestDist = Math.abs(best - midChar);
  for (let i = 1; i < pauses.length; i++) {
    const dist = Math.abs(pauses[i] - midChar);
    if (dist < bestDist) {
      bestDist = dist;
      best = pauses[i];
    }
  }

  const before = text.slice(0, best + 1).trim();
  const after = text.slice(best + 1).trim();
  if (before.length < 20 || after.length < 20) return [text];

  return [before, ...softChunk(after)];
}

function fallbackSplit(text) {
  const basic = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 3);
  if (basic.length > 0) return basic;
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += 20) {
    chunks.push(words.slice(i, i + 20).join(' '));
  }
  return chunks;
}

export function splitBySentenceDelimiters(text) {
  return splitNarrativeSentences(text);
}

export function splitIntoSentences(text) {
  return splitNarrativeSentences(text);
}

export default { splitNarrativeSentences, splitBySentenceDelimiters, splitIntoSentences };
