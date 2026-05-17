import RNFS from 'react-native-fs';
import axios from 'axios';
import { processChapterText } from './chapterProcessor';
import { API_BASE_URL } from '../config/api';

const CHAPTER_PATTERNS = [
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

export async function parseLocalTxt(filePath) {
  try {
    const content = await RNFS.readFile(filePath, 'utf8');
    
    const cleanedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const chapters = detectLocalChapters(cleanedContent);

    return {
      title: extractTitle(filePath, content),
      author: 'Unknown Author',
      coverImagePath: null,
      filePath,
      fileType: 'txt',
      chapters
    };
  } catch (error) {
    console.error('Local TXT parse error:', error);
    throw error;
  }
}

function detectLocalChapters(text) {
  const lines = text.split('\n');
  const chapters = [];
  let currentChapter = null;
  let chapterText = [];
  let chapterIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    const isChapterHeader = CHAPTER_PATTERNS.some(pattern => pattern.test(line)) && line.length < 50;
    
    if (isChapterHeader) {
      if (currentChapter && chapterText.length > 0) {
        currentChapter.text = cleanChapterText(chapterText.join(' '));
        currentChapter.wordCount = currentChapter.text.split(/\s+/).length;
        currentChapter.sentences = processChapterText(currentChapter.text);
        currentChapter.isAnalyzed = true;
        chapters.push(currentChapter);
        chapterIndex++;
      }

      currentChapter = {
        index: chapterIndex,
        title: line,
        text: '',
        wordCount: 0,
        sentences: [],
        isAnalyzed: false
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
    currentChapter.sentences = processChapterText(currentChapter.text);
    currentChapter.isAnalyzed = true;
    chapters.push(currentChapter);
  }

  if (chapters.length === 0 && text.length > 0) {
    const cleanedText = cleanChapterText(text);
    const sentences = processChapterText(cleanedText);
    chapters.push({
      index: 0,
      title: 'Chapter 1',
      text: cleanedText,
      wordCount: cleanedText.split(/\s+/).length,
      sentences,
      isAnalyzed: true
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
  const pathParts = filePath.split('/');
  const basename = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, '');
  
  const titleMatch = content.match(/^Title:\s*(.+)$/mi);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  return basename || 'Unknown Title';
}

async function parseRemoteBook(filePath, fileType) {
  try {
    const fileName = decodeURIComponent(filePath.split('/').pop()) || `book.${fileType}`;
    const mimeType = fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip';

    const formData = new FormData();
    formData.append('book', {
      uri: filePath,
      name: fileName,
      type: mimeType,
    });

    // 1. Upload and parse file on the backend
    const response = await axios.post(`${API_BASE_URL}/books/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Import failed');
    }

    const importedBook = response.data.book;

    // 2. Fetch the full book with chapters
    const fullBookResponse = await axios.get(`${API_BASE_URL}/books/${importedBook._id}`);
    const fullBook = fullBookResponse.data;

    // 3. Format the chapters with emotion analysis for each chapter
    const formattedChapters = (fullBook.chapters || []).map((ch, i) => {
      const text = ch.text || '';
      const sentences = processChapterText(text);
      return {
        index: ch.index !== undefined ? ch.index : i,
        title: ch.title || `Chapter ${i + 1}`,
        text,
        wordCount: ch.wordCount || text.split(/\s+/).length,
        sentences,
        isAnalyzed: true,
      };
    });

    return {
      title: fullBook.title || fileName.replace(/\.[^/.]+$/, ''),
      author: fullBook.author || 'Unknown Author',
      coverImagePath: fullBook.coverImagePath || null,
      filePath,
      fileType,
      chapters: formattedChapters,
    };
  } catch (error) {
    console.error(`Remote ${fileType.toUpperCase()} parse error:`, error);
    throw new Error(error.response?.data?.error || error.message || `Failed to parse ${fileType.toUpperCase()}`);
  }
}

export async function parseLocalBook(filePath, fileType) {
  const normalizedType = fileType.toLowerCase();
  switch (normalizedType) {
    case 'txt':
    case 'text':
      return parseLocalTxt(filePath);
    case 'pdf':
    case 'epub':
      return parseRemoteBook(filePath, normalizedType);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

export default { parseLocalTxt, parseLocalBook };