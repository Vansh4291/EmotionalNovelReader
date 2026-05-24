const express = require('express');
const router = express.Router();
const { LRUCache } = require('lru-cache');
const { analyzeChapter } = require('../emotion/emotionAnalyzer');
const { enqueueAnalysis } = require('../utils/analysisQueue');
const { analysisLimiter } = require('../middleware/rateLimiter');

const analysisCache = new LRUCache({ max: 200, ttl: 1000 * 60 * 30 });

router.post('/analyze', analysisLimiter, async (req, res) => {
  const { sentences, chapterId } = req.body;

  if (!sentences || !Array.isArray(sentences)) {
    return res.status(400).json({ error: 'sentences array required' });
  }

  if (sentences.length > 5000) {
    return res.status(400).json({ error: 'Too many sentences (max 5000)' });
  }

  const cacheKey = chapterId || `ch_${Date.now()}`;
  if (analysisCache.has(cacheKey)) {
    return res.json({ success: true, results: analysisCache.get(cacheKey) });
  }

  const results = await enqueueAnalysis(sentences);

  if (chapterId) {
    analysisCache.set(chapterId, results);
  }

  res.json({ success: true, results });
});

router.get('/status/:chapterId', (req, res) => {
  const { chapterId } = req.params;
  const isAnalyzed = analysisCache.has(chapterId);
  res.json({ chapterId, isAnalyzed });
});

router.post('/clear-cache', (req, res) => {
  analysisCache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;
