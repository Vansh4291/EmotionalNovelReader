function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sentences = [];
  
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if ((char === '"' || char === "'" || char === '"' || char === '"') && 
        (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\n')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      }
    }
    
    if (!inQuote) {
      if (char === '.' || char === '!' || char === '?') {
        if (nextChar === ' ' || nextChar === '\n' || nextChar === '"' || nextChar === "'") {
          const trimmed = current.trim();
          if (trimmed.length > 5) {
            sentences.push(trimmed);
          }
          current = '';
          continue;
        }
      }
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