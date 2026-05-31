import RNFS from 'react-native-fs';
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
    let uploadPath = filePath;

    if (filePath.startsWith('content://')) {
      const tempPath = `${RNFS.CachesDirectoryPath}/upload_${Date.now()}.${fileType}`;
      try {
        await RNFS.copyFile(filePath, tempPath);
        uploadPath = `file://${tempPath}`;
      } catch (copyError) {
        console.log('Copy failed, trying RNFS.readFile:', copyError.message);
        const base64 = await RNFS.readFile(filePath, 'base64');
        await RNFS.writeFile(tempPath, base64, 'base64');
        uploadPath = `file://${tempPath}`;
      }
    } else if (!filePath.startsWith('file://')) {
      uploadPath = `file://${filePath}`;
    }

    const fileName = decodeURIComponent(filePath.split('/').pop()) || `book.${fileType}`;
    const mimeType = fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip';

    const formData = new FormData();
    formData.append('book', {
      uri: uploadPath,
      name: fileName,
      type: mimeType,
    });

    console.log('[UPLOAD] Starting upload to:', `/books/import`, 'file:', fileName, 'uri:', uploadPath);

    const uploadUrl = `${API_BASE_URL}/books/import`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'x-api-key': 'dev-key-change-in-production',
      },
    });

    console.log('[UPLOAD] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[UPLOAD] Error response:', errorText);
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[UPLOAD] Response data:', data);

    if (!data.success) {
      throw new Error(data.error || 'Import failed');
    }

    const importedBook = data.book;

    const fullBookResponse = await fetch(`${API_BASE_URL}/books/${importedBook._id}`, {
      headers: {
        'x-api-key': 'dev-key-change-in-production',
      },
    });
    const fullBook = await fullBookResponse.json();

const FRONTMATTER_PATTERNS = [
  /copyright/i, /all rights reserved/i, /isbn/i, /published by/i,
  /library of congress/i, /printed in/i, /manufactured in/i,
  /no part of (this|this book|this publication)/i,
  /reproduced in any form/i, /written permission/i,
  /acknowledgements/i, /acknowledgments/i, /foreword/i,
  /introduction/i, /preface/i, /prologue/i,
  /table of contents/i, /contents/i,
  /this (is|book is|novel is) (a work of )?fiction/i,
  /the characters and events/i, /incidental/i,
  /edition notice/i, /first (published|edition|printing)/i,
  /10 9 8 7 6 5 4 3 2 1/i, /^[ivxlcdm]+\.\s/i,
];

function isFrontmatter(chapter) {
  const text = (chapter.text || chapter.title || '').trim().slice(0, 200);
  if (!text) return false;
  const matchCount = FRONTMATTER_PATTERNS.reduce((count, re) => {
    return count + (re.test(text) ? 1 : 0);
  }, 0);
  return matchCount >= 2;
}

function detectNarrativeStart(chapters) {
  const firstNarrativeIdx = chapters.findIndex((ch) => {
    if (isFrontmatter(ch)) return false;
    const text = (ch.text || '').trim().slice(0, 500);
    if (!text || text.length < 100) return false;
    const hasDialogue = /["\u201C\u201D]/.test(text);
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = (text.match(/[.!?]/g) || []).length;
    const density = wordCount / Math.max(sentenceCount, 1);
    return hasDialogue || (density > 5 && wordCount > 50);
  }, -1);
  return firstNarrativeIdx >= 0 ? firstNarrativeIdx : 0;
}

    const narrativeStartIdx = detectNarrativeStart(fullBook.chapters || []);
    const formattedChapters = (fullBook.chapters || []).slice(narrativeStartIdx).map((ch, i) => {
      const text = ch.text || '';
      const sentences = processChapterText(text);
      return {
        index: i,
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
    console.error(`Remote ${fileType.toUpperCase()} parse error:`, error.message);
    throw new Error(error.message || `Failed to parse ${fileType.toUpperCase()}`);
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