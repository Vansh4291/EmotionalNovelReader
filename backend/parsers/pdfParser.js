const fs = require('fs').promises;
const pdf = require('pdf-parse');

async function parsePdf(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    
    const fullText = data.text;
    const chapters = detectChapters(fullText);
    
    return {
      title: data.info?.Title || 'Unknown Title',
      author: data.info?.Author || 'Unknown Author',
      coverImagePath: null,
      chapters
    };
  } catch (error) {
    console.error('PDF parse error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

function detectChapters(text) {
  const chapterPatterns = [
    /^chapter\s+(\d+)/i,
    /^ch\.\s*(\d+)/i,
    /^第(\d+)章/i,
    /^CHAPTER\s+(\d+)/i,
    /^Part\s+(\d+)/i,
    /^Section\s+(\d+)/i
  ];

  const lines = text.split('\n');
  const chapters = [];
  let currentChapter = {
    title: 'Chapter 1',
    text: '',
    startLine: 0
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    let isChapterStart = false;

    for (const pattern of chapterPatterns) {
      if (pattern.test(line) && line.length < 50) {
        isChapterStart = true;
        break;
      }
    }

    if (isChapterStart && chapters.length > 0) {
      currentChapter.text = cleanText(currentChapter.text);
      if (currentChapter.text.length > 100) {
        chapters.push({
          index: chapters.length,
          title: currentChapter.title,
          text: currentChapter.text,
          wordCount: currentChapter.text.split(/\s+/).length
        });
      }
      currentChapter = {
        title: line,
        text: '',
        startLine: i
      };
    } else {
      currentChapter.text += ' ' + line;
    }
  }

  if (currentChapter.text.length > 100) {
    currentChapter.text = cleanText(currentChapter.text);
    chapters.push({
      index: chapters.length,
      title: currentChapter.title,
      text: currentChapter.text,
      wordCount: currentChapter.text.split(/\s+/).length
    });
  }

  if (chapters.length === 0) {
    const cleaned = cleanText(text);
    chapters.push({
      index: 0,
      title: 'Full Text',
      text: cleaned,
      wordCount: cleaned.split(/\s+/).length
    });
  }

  return chapters;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
    .trim();
}

module.exports = { parsePdf };