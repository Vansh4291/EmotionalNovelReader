const chapterPatterns = [
  /^chapter\s+(\d+|[ivxlcdm]+)/i,
  /^ch\.\s*(\d+)/i,
  /^ch\s+(\d+)/i,
  /^第(\d+)[章卷]/,
  /^第[一二三四五六七八九十百千万\d]+[章卷卷]/,
  /^section\s+(\d+)/i,
  /^part\s+(\d+)/i,
  /^book\s+(\d+)/i,
  /^episode\s+(\d+)/i,
  /^volume\s+(\d+)/i,
  /^#\s*(\d+)/,
  /^\d+\.\s+/,
  /^[\[\(]\d+[\]\)]\s*/,
  /^Chapter\s+(\d+|[IVXLCDM]+)\s*[:\-]/,
  /^第\s*(\d+)\s*章/,
];

function detectChapterHeading(line) {
  const trimmed = line.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) {
    return null;
  }

  for (const pattern of chapterPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        isChapter: true,
        number: match[1] || '1',
        title: trimmed,
      };
    }
  }

  return null;
}

function splitIntoChapters(text) {
  const lines = text.split('\n');
  const chapters = [];
  let currentChapter = {
    title: 'Chapter 1',
    content: '',
    startLine: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const chapterInfo = detectChapterHeading(line);

    if (chapterInfo && currentChapter.content.trim().length > 0) {
      chapters.push(currentChapter);
      currentChapter = {
        title: line.trim(),
        content: '',
        startLine: i,
      };
    } else if (chapters.length === 0 && i > 0 && currentChapter.content.trim().length === 0) {
      currentChapter.content = line;
    } else {
      currentChapter.content += (currentChapter.content ? '\n' : '') + line;
    }
  }

  if (currentChapter.content.trim().length > 0) {
    chapters.push(currentChapter);
  }

  if (chapters.length === 0 && text.trim().length > 0) {
    chapters.push({
      title: 'Chapter 1',
      content: text.trim(),
      startLine: 0,
    });
  }

  return chapters.map((chapter, index) => ({
    index,
    title: chapter.title,
    text: chapter.content.trim(),
  }));
}

function estimateChapterCount(text) {
  const lines = text.split('\n');
  let count = 0;
  
  for (const line of lines) {
    if (detectChapterHeading(line)) {
      count++;
    }
  }

  return count > 0 ? count : 1;
}

module.exports = {
  detectChapterHeading,
  splitIntoChapters,
  estimateChapterCount,
};