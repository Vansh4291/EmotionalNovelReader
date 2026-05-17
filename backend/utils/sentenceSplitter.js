function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sentences = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  let dotCount = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '.') {
      dotCount++;
      current += char;
      if (nextChar === '.') {
        continue;
      }
      if (dotCount >= 3) {
        dotCount = 0;
        continue;
      }
      dotCount = 0;
      if (!inQuote && (nextChar === ' ' || nextChar === '\n' || nextChar === '"' || nextChar === "'" || nextChar === '\u201D' || nextChar === '\u2019')) {
        const trimmed = current.replace(/\.+$/g, '').trim();
        if (trimmed.length > 5) {
          sentences.push(trimmed);
        }
        current = '';
        if (nextChar === '"' || nextChar === "'") {
          inQuote = false;
          quoteChar = '';
        }
        continue;
      }
      continue;
    }

    if (char === '!' || char === '?') {
      current += char;
      if (!inQuote && (nextChar === ' ' || nextChar === '\n' || nextChar === '"' || nextChar === "'" || nextChar === '\u201D' || nextChar === '\u2019' || nextChar === undefined)) {
        const trimmed = current.trim();
        if (trimmed.length > 3) {
          sentences.push(trimmed);
        }
        current = '';
        if (nextChar === '"' || nextChar === "'") {
          i++;
          inQuote = false;
          quoteChar = '';
        }
        continue;
      }
      continue;
    }

    const quoteCandidates = ['"', "'", '\u201C', '\u201D', '\u2018', '\u2019'];
    if (quoteCandidates.includes(char)) {
      const prevChar = i > 0 ? text[i - 1] : ' ';
      if (!inQuote && (prevChar === ' ' || prevChar === '\n')) {
        inQuote = true;
        quoteChar = char;
        current += char;
        continue;
      } else if (inQuote && char === quoteChar) {
        inQuote = false;
        quoteChar = '';
        current += char;
        if (nextChar === ' ' || nextChar === '\n' || nextChar === undefined) {
          const trimmed = current.trim();
          if (trimmed.length > 3) {
            sentences.push(trimmed);
          }
          current = '';
          if (nextChar === ' ' || nextChar === '\n') {
            i++;
          }
        }
        continue;
      }
    }

    if (char === '\n' && current.trim().length > 0) {
      const trimmed = current.trim();
      if (trimmed.length > 5) {
        sentences.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed.length > 5) {
    sentences.push(trimmed);
  }

  return sentences;
}

function splitBySentenceDelimiters(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"])/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

module.exports = { splitIntoSentences, splitBySentenceDelimiters };
