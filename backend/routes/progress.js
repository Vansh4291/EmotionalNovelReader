const express = require('express');
const router = express.Router();
const path = require('path');

const { loadMapFromJson, saveMapToJson } = require('../utils/db');

const progressDb = new Map();
const bookmarksDb = new Map();

const PROGRESS_PATH = path.join(__dirname, '..', 'progress_db.json');
const BOOKMARKS_PATH = path.join(__dirname, '..', 'bookmarks_db.json');

async function loadDbs() {
  await loadMapFromJson(PROGRESS_PATH, progressDb);
  await loadMapFromJson(BOOKMARKS_PATH, bookmarksDb);
}
loadDbs();

router.get('/:bookId', (req, res) => {
  const { bookId } = req.params;
  const progress = progressDb.get(bookId) || {
    bookId,
    currentChapterIndex: 0,
    currentSentenceIndex: 0,
    currentCharPosition: 0,
    listeningTimeSeconds: 0,
    completionPercent: 0.0,
    lastUpdatedAt: new Date().toISOString()
  };
  res.json(progress);
});

router.post('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const { currentChapterIndex, currentSentenceIndex, currentCharPosition, listeningTimeSeconds, completionPercent } = req.body;

  if (currentChapterIndex != null && (!Number.isInteger(currentChapterIndex) || currentChapterIndex < 0)) {
    return res.status(400).json({ error: 'Invalid chapterIndex' });
  }
  if (currentSentenceIndex != null && (!Number.isInteger(currentSentenceIndex) || currentSentenceIndex < 0)) {
    return res.status(400).json({ error: 'Invalid sentenceIndex' });
  }

  const existing = progressDb.get(bookId) || {};
  const progress = {
    bookId,
    currentChapterIndex: currentChapterIndex ?? existing.currentChapterIndex ?? 0,
    currentSentenceIndex: currentSentenceIndex ?? existing.currentSentenceIndex ?? 0,
    currentCharPosition: currentCharPosition ?? existing.currentCharPosition ?? 0,
    listeningTimeSeconds: listeningTimeSeconds ?? existing.listeningTimeSeconds ?? 0,
    completionPercent: completionPercent ?? existing.completionPercent ?? 0.0,
    lastUpdatedAt: new Date().toISOString()
  };

  progressDb.set(bookId, progress);
  await saveMapToJson(PROGRESS_PATH, progressDb);
  res.json({ success: true, progress });
});

router.get('/:bookId/bookmarks', (req, res) => {
  const { bookId } = req.params;
  const bookmarks = Array.from(bookmarksDb.values()).filter(b => b.bookId === bookId);
  res.json(bookmarks);
});

router.post('/:bookId/bookmarks', async (req, res) => {
  const { bookId } = req.params;
  const { chapterIndex, sentenceIndex, note } = req.body;

  if (chapterIndex != null && (!Number.isInteger(chapterIndex) || chapterIndex < 0)) {
    return res.status(400).json({ error: 'Invalid chapterIndex' });
  }

  const bookmark = {
    _id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    bookId,
    chapterIndex: chapterIndex ?? 0,
    sentenceIndex: sentenceIndex ?? 0,
    note: note ? String(note).slice(0, 500) : null,
    createdAt: new Date().toISOString()
  };

  bookmarksDb.set(bookmark._id, bookmark);
  await saveMapToJson(BOOKMARKS_PATH, bookmarksDb);
  res.json({ success: true, bookmark });
});

router.delete('/bookmarks/:bookmarkId', async (req, res) => {
  const { bookmarkId } = req.params;
  if (!bookmarksDb.has(bookmarkId)) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  bookmarksDb.delete(bookmarkId);
  await saveMapToJson(BOOKMARKS_PATH, bookmarksDb);
  res.json({ success: true });
});

module.exports = router;
