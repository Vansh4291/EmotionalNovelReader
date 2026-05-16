const express = require('express');
const router = express.Router();
const { analyzeChapter } = require('../emotion/emotionAnalyzer');

const analysisCache = new Map();

router.post('/analyze', async (req, res) => {
  try {
    const { sentences, chapterId } = req.body;
    
    if (!sentences || !Array.isArray(sentences)) {
      return res.status(400).json({ error: 'sentences array required' });
    }

    const cacheKey = chapterId || `ch_${Date.now()}`;
    if (analysisCache.has(cacheKey)) {
      return res.json({ success: true, results: analysisCache.get(cacheKey) });
    }

    const results = analyzeChapter(sentences);
    
    if (chapterId) {
      analysisCache.set(chapterId, results);
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Emotion analysis error:', error);
    res.status(500).json({ error: error.message });
  }
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