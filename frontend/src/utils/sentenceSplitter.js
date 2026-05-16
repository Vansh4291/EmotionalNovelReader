function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sentences = text
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1|')
    .replace(/(\.\.\.)\s+(?=[A-Z])/g, '$1|')
    .replace(/"\s*(?=[A-Z])/g, '"|')
    .replace(/"\s*$/g, '"')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  return sentences;
}

function splitIntoSentencesWithPositions(text) {
  const sentences = splitIntoSentences(text);
  let currentPosition = 0;
  
  return sentences.map((sentence, index) => {
    const startChar = text.indexOf(sentence, currentPosition);
    const endChar = startChar + sentence.length;
    currentPosition = endChar;
    
    return {
      index,
      text: sentence,
      startChar,
      endChar,
    };
  });
}

module.exports = {
  splitIntoSentences,
  splitIntoSentencesWithPositions,
};