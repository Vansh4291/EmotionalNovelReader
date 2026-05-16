const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const { parseEpub } = require('../parsers/epubParser');
const { parsePdf } = require('../parsers/pdfParser');
const { parseTxt } = require('../parsers/txtParser');
const { processChapterText } = require('../services/chapterProcessor');

const booksDb = new Map();
const chapterCache = new Map();

router.post('/import', async (req, res) => {
  try {
    let filePath;
    let fileType;
    let fileName;

    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
      const ext = path.extname(fileName).toLowerCase().replace('.', '');
      fileType = ext === 'txt' ? 'txt' : ext;
    } else if (req.body.filePath && req.body.fileType) {
      filePath = req.body.filePath;
      fileType = req.body.fileType;
      fileName = req.body.fileName;
    } else {
      return res.status(400).json({ error: 'File or filePath required' });
    }

    if (!filePath || !fileType) {
      return res.status(400).json({ error: 'filePath and fileType required' });
    }

    let bookData;
    switch (fileType.toLowerCase()) {
      case 'epub':
        bookData = await parseEpub(filePath);
        break;
      case 'pdf':
        bookData = await parsePdf(filePath);
        break;
      case 'txt':
      case 'text':
        bookData = await parseTxt(filePath);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type: ' + fileType });
    }

    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const book = {
      _id: bookId,
      title: bookData.title || fileName || 'Unknown Title',
      author: bookData.author || 'Unknown Author',
      coverImagePath: bookData.coverImagePath || null,
      filePath,
      fileType: fileType.toLowerCase(),
      totalChapters: bookData.chapters?.length || 0,
      chapters: bookData.chapters || [],
      addedAt: new Date().toISOString(),
      isEmotionAnalyzed: false,
    };

    booksDb.set(bookId, book);

    res.json({
      success: true,
      book: {
        _id: book._id,
        title: book.title,
        author: book.author,
        coverImagePath: book.coverImagePath,
        fileType: book.fileType,
        totalChapters: book.totalChapters,
        addedAt: book.addedAt,
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  const books = Array.from(booksDb.values()).map(b => ({
    _id: b._id,
    title: b.title,
    author: b.author,
    coverImagePath: b.coverImagePath,
    fileType: b.fileType,
    totalChapters: b.totalChapters,
    addedAt: b.addedAt,
    lastOpenedAt: b.lastOpenedAt,
    isEmotionAnalyzed: b.isEmotionAnalyzed,
  }));
  res.json(books);
});

router.get('/:id', (req, res) => {
  const book = booksDb.get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

router.delete('/:id', (req, res) => {
  if (!booksDb.has(req.params.id)) {
    return res.status(404).json({ error: 'Book not found' });
  }
  booksDb.delete(req.params.id);
  res.json({ success: true });
});

router.get('/:id/chapters', (req, res) => {
  const book = booksDb.get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const chapters = book.chapters.map((c, i) => ({
    index: i,
    title: c.title || `Chapter ${i + 1}`,
    wordCount: c.wordCount,
    isAnalyzed: c.isAnalyzed || false,
  }));
  res.json(chapters);
});

router.get('/:id/chapters/:chapterIndex', (req, res) => {
  const book = booksDb.get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const chapterIndex = parseInt(req.params.chapterIndex, 10);
  if (chapterIndex < 0 || chapterIndex >= book.chapters.length) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  const chapter = book.chapters[chapterIndex];
  const cacheKey = `${req.params.id}_${chapterIndex}`;

  let sentences;
  if (chapterCache.has(cacheKey)) {
    sentences = chapterCache.get(cacheKey);
  } else {
    sentences = processChapterText(chapter.text);
    chapterCache.set(cacheKey, sentences);
    chapter.isAnalyzed = true;
  }

  res.json({
    ...chapter,
    sentences
  });
});

module.exports = router;