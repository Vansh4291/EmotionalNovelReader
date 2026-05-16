const express = require('express');
const router = express.Router();

const progressDb = new Map();
const bookmarksDb = new Map();

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

router.post('/:bookId', (req, res) => {
  try {
    const { bookId } = req.params;
    const { currentChapterIndex, currentSentenceIndex, currentCharPosition, listeningTimeSeconds, completionPercent } = req.body;

    const progress = {
      bookId,
      currentChapterIndex: currentChapterIndex ?? 0,
      currentSentenceIndex: currentSentenceIndex ?? 0,
      currentCharPosition: currentCharPosition ?? 0,
      listeningTimeSeconds: listeningTimeSeconds ?? 0,
      completionPercent: completionPercent ?? 0.0,
      lastUpdatedAt: new Date().toISOString()
    };

    progressDb.set(bookId, progress);
    res.json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:bookId/bookmarks', (req, res) => {
  const { bookId } = req.params;
  const bookmarks = Array.from(bookmarksDb.values()).filter(b => b.bookId === bookId);
  res.json(bookmarks);
});

router.post('/:bookId/bookmarks', (req, res) => {
  try {
    const { bookId } = req.params;
    const { chapterIndex, sentenceIndex, note } = req.body;

    const bookmark = {
      _id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookId,
      chapterIndex: chapterIndex ?? 0,
      sentenceIndex: sentenceIndex ?? 0,
      note: note || null,
      createdAt: new Date().toISOString()
    };

    bookmarksDb.set(bookmark._id, bookmark);
    res.json({ success: true, bookmark });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/bookmarks/:bookmarkId', (req, res) => {
  const { bookmarkId } = req.params;
  if (!bookmarksDb.has(bookmarkId)) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  bookmarksDb.delete(bookmarkId);
  res.json({ success: true });
});

module.exports = router;