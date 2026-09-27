const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { LRUCache } = require('lru-cache');

const { parseEpub } = require('../parsers/epubParser');
const { parsePdf, getPdfIntegrity } = require('../parsers/pdfParser');
const { parseTxt } = require('../parsers/txtParser');
const { processChapterText } = require('../services/chapterProcessor');
const { uploadDir, upload } = require('../middleware/upload');
const { importLimiter } = require('../middleware/rateLimiter');
const { loadMapFromJson, saveMapToJson } = require('../utils/db');
const logger = require('../utils/logger');

const booksDb = new Map();
const chapterCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 60 });

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'books_db.json')
  : path.join(__dirname, '..', 'books_db.json');
const CACHE_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'chapter_cache.json')
  : path.join(__dirname, '..', 'chapter_cache.json');

async function loadDb() {
  await loadMapFromJson(DB_PATH, booksDb);
  try {
    const cacheData = await fs.readFile(CACHE_PATH, 'utf-8');
    const parsedCache = JSON.parse(cacheData);
    parsedCache.forEach(([k, v]) => chapterCache.set(k, v));
  } catch (e) { /* cache file may not exist yet */ }
}


router.post('/import', importLimiter, upload.single('book'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Book file is required' });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  const fileType = ext === 'txt' ? 'txt' : ext;

  // Capture the original file bytes' digest + size BEFORE parsing so we can
  // verify the source document stayed immutable throughout the import.
  let originalHash = null;
  let originalSize = null;
  try {
    const buf = await fs.readFile(filePath);
    originalHash = crypto.createHash('sha256').update(buf).digest('hex');
    originalSize = buf.length;
  } catch (hashError) {
    logger.error('Failed to hash uploaded file:', hashError.message);
  }

  let bookData;
  let integrity = null;
  try {
    switch (fileType) {
      case 'epub':
        bookData = await parseEpub(filePath);
        break;
      case 'pdf':
        bookData = await parsePdf(filePath);
        integrity = await getPdfIntegrity(filePath);
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
    logger.error('Parse error:', parseError.message);
    return res.status(422).json({ error: 'Failed to parse file. Ensure it is a valid ' + fileType.toUpperCase() + ' file.' });
  }

  // PDF integrity verification: source must be unchanged, and the extraction
  // must have produced at least one non-empty chapter when the source has text.
  if (fileType === 'pdf' && integrity) {
    let integrityOk = true;
    let integrityDetail = null;

    const verifyHash = await fs.readFile(filePath).then(
      (buf) => crypto.createHash('sha256').update(buf).digest('hex'),
      () => null
    );
    if (originalHash && verifyHash && verifyHash !== originalHash) {
      integrityOk = false;
      integrityDetail = 'source document changed during processing';
    }
    if (integrity.pageCount > 0 && (!bookData.chapters || bookData.chapters.length === 0)) {
      integrityOk = false;
      integrityDetail = 'extraction produced no chapters from a non-empty PDF';
    }

    if (!integrityOk) {
      await fs.unlink(filePath).catch(() => {});
      logger.error('PDF integrity check failed:', integrityDetail);
      return res.status(422).json({ error: 'PDF integrity verification failed: ' + integrityDetail });
    }
  }

  const bookId = `book_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  // Prefer embedded metadata, then the filename (sans extension) — a bare
  // "Unknown Title" makes the library unusable when PDFs lack metadata.
  const fallbackTitle = path.basename(fileName, path.extname(fileName)).trim() || 'Unknown Title';
  const metadataTitle = (bookData.title || '').trim();
  const title = metadataTitle && !/^(unknown title|untitled)$/i.test(metadataTitle)
    ? metadataTitle
    : fallbackTitle;
  const book = {
    _id: bookId,
    title,
    author: bookData.author || 'Unknown Author',
    coverImagePath: bookData.coverImagePath || null,
    fileType: fileType.toLowerCase(),
    totalChapters: bookData.chapters?.length || 0,
    chapters: bookData.chapters || [],
    addedAt: new Date().toISOString(),
    isEmotionAnalyzed: false,
    // Integrity metadata (PDF only; null for other types)
    integrity: fileType === 'pdf' && integrity
      ? {
          sourceSha256: originalHash,
          sourceSizeBytes: originalSize,
          pageCount: integrity.pageCount,
          extraction: {
            chapterCount: (bookData.chapters || []).length,
            totalChars: (bookData.chapters || []).reduce((sum, c) => sum + (c.text || '').length, 0),
          },
        }
      : null,
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
      integrity: book.integrity,
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
  res.json({
    _id: book._id,
    title: book.title,
    author: book.author,
    coverImagePath: book.coverImagePath,
    fileType: book.fileType,
    totalChapters: book.totalChapters,
    addedAt: book.addedAt,
    integrity: book.integrity || null,
    chapters: (book.chapters || []).map((c, i) => ({
      index: i,
      title: c.title || `Chapter ${i + 1}`,
      text: c.text,
      wordCount: c.wordCount,
    })),
  });
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
  if (Number.isNaN(chapterIndex) || chapterIndex < 0 || chapterIndex >= (book.chapters || []).length) {
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

// chapter cache for introspection/testing
router.get('/meta/chapter-cache-size', (req, res) => {
  res.json({ size: chapterCache.size });
});

loadDb();

module.exports = router;
