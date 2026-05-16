const fs = require('fs').promises;
const path = require('path');

async function parseTxt(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  const cleanedContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const chapters = detectChapters(cleanedContent);

  return {
    title: extractTitle(filePath, content),
    author: 'Unknown Author',
    coverImagePath: null,
    chapters
  };
}

function detectChapters(text) {
  const chapterPatterns = [
    /^Chapter\s+(\d+)/i,
    /^Ch\.\s*(\d+)/i,
    /^CHAPTER\s+(\d+)/i,
    /^第([一二三四五六七八九十百千\d]+)章/i,
    /^第[一二三四五六七八九十百千\d]+章/i,
    /^Episode\s+(\d+)/i,
    /^Section\s+(\d+)/i,
    /^Part\s+(\d+)/i,
    /^BOOK\s+(\d+)/i,
  ];

  const lines = text.split('\n');
  const chapters = [];
  let currentChapter = null;
  let chapterText = [];
  let chapterIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const isChapterHeader = chapterPatterns.some(pattern => pattern.test(line)) && line.length < 50;
    
    if (isChapterHeader) {
      if (currentChapter && chapterText.length > 0) {
        currentChapter.text = cleanChapterText(chapterText.join(' '));
        currentChapter.wordCount = currentChapter.text.split(/\s+/).length;
        chapters.push(currentChapter);
        chapterIndex++;
      }

      currentChapter = {
        index: chapterIndex,
        title: line,
        text: '',
        wordCount: 0
      };
      chapterText = [];
    } else if (currentChapter) {
      if (line.length > 0) {
        chapterText.push(line);
      }
    }
  }

  if (currentChapter && chapterText.length > 0) {
    currentChapter.text = cleanChapterText(chapterText.join(' '));
    currentChapter.wordCount = currentChapter.text.split(/\s+/).length;
    chapters.push(currentChapter);
  }

  if (chapters.length === 0 && text.length > 0) {
    const cleanedText = cleanChapterText(text);
    chapters.push({
      index: 0,
      title: 'Chapter 1',
      text: cleanedText,
      wordCount: cleanedText.split(/\s+/).length
    });
  }

  return chapters;
}

function cleanChapterText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
    .trim();
}

function extractTitle(filePath, content) {
  const basename = path.basename(filePath, path.extname(filePath));
  
  const titleMatch = content.match(/^Title:\s*(.+)$/mi);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  return basename || 'Unknown Title';
}

module.exports = { parseTxt };