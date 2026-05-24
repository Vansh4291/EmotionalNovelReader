const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { LRUCache } = require('lru-cache');

const { parseEpub } = require('../parsers/epubParser');
const { parsePdf } = require('../parsers/pdfParser');
const { parseTxt } = require('../parsers/txtParser');
const { processChapterText } = require('../services/chapterProcessor');
const { uploadDir } = require('../middleware/upload');
const { upload } = require('../middleware/upload');
const { importLimiter } = require('../middleware/rateLimiter');
const { enqueueAnalysis } = require('../utils/analysisQueue');
const { loadMapFromJson, saveMapToJson } = require('../utils/db');

const booksDb = new Map();
const chapterCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 60 });

const DB_PATH = path.join(__dirname, '..', 'books_db.json');
const CACHE_PATH = path.join(__dirname, '..', 'chapter_cache.json');

async function loadDb() {
  await loadMapFromJson(DB_PATH, booksDb);
  try {
    const cacheData = await fs.readFile(CACHE_PATH, 'utf-8');
    const parsedCache = JSON.parse(cacheData);
    parsedCache.forEach(([k, v]) => chapterCache.set(k, v));
  } catch (e) { }
}

loadDb();

router.post('/import', importLimiter, upload.single('book'), async (req, res) => {
  let filePath;
  let fileType;
  let fileName;

  if (!req.file) {
    return res.status(400).json({ error: 'Book file is required' });
  }

  filePath = req.file.path;
  fileName = req.file.originalname;
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  fileType = ext === 'txt' ? 'txt' : ext;

  let bookData;
  try {
    switch (fileType) {
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
        await fs.unlink(filePath).catch(() => {});
        return res.status(400).json({ error: 'Unsupported file type: ' + fileType });
    }
  } catch (parseError) {
    await fs.unlink(filePath).catch(() => {});
    console.error('Parse error:', parseError);
    return res.status(422).json({ error: 'Failed to parse file. Ensure it is a valid ' + fileType.toUpperCase() + ' file.' });
  }

  const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const book = {
    _id: bookId,
    title: bookData.title || fileName || 'Unknown Title',
    author: bookData.author || 'Unknown Author',
    coverImagePath: bookData.coverImagePath || null,
    fileType: fileType.toLowerCase(),
    totalChapters: bookData.chapters?.length || 0,
    chapters: bookData.chapters || [],
    addedAt: new Date().toISOString(),
    isEmotionAnalyzed: false,
  };

  booksDb.set(bookId, book);
  await saveMapToJson(DB_PATH, booksDb);

  await fs.unlink(filePath).catch(() => {});

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
  const { chapters, ...safe } = book;
  res.json(safe);
});

router.delete('/:id', async (req, res) => {
  if (!booksDb.has(req.params.id)) {
    return res.status(404).json({ error: 'Book not found' });
  }
  booksDb.delete(req.params.id);
  await saveMapToJson(DB_PATH, booksDb);
  res.json({ success: true });
});

router.get('/:id/chapters', (req, res) => {
  const book = booksDb.get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const chapters = (book.chapters || []).map((c, i) => ({
    index: i,
    title: c.title || `Chapter ${i + 1}`,
    wordCount: c.wordCount,
    isAnalyzed: c.isAnalyzed || false,
  }));
  res.json(chapters);
});

router.get('/:id/chapters/:chapterIndex', async (req, res) => {
  const book = booksDb.get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const chapterIndex = parseInt(req.params.chapterIndex, 10);
  if (isNaN(chapterIndex) || chapterIndex < 0 || chapterIndex >= (book.chapters || []).length) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  const chapter = book.chapters[chapterIndex];
  const cacheKey = `${req.params.id}_${chapterIndex}`;

  let sentences;
  if (chapterCache.has(cacheKey)) {
    sentences = chapterCache.get(cacheKey);
  } else {
    sentences = await processChapterText(chapter.text);
    chapterCache.set(cacheKey, sentences);
    chapter.isAnalyzed = true;
    booksDb.set(req.params.id, book);
    await saveMapToJson(DB_PATH, booksDb);
  }

  res.json({
    title: chapter.title,
    chapterIndex: chapterIndex,
    wordCount: chapter.wordCount,
    sentences
  });
});

module.exports = router;
