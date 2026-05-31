const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
require('express-async-errors');

const { authMiddleware } = require('./middleware/auth');
const { generalLimiter } = require('./middleware/rateLimiter');
const { uploadDir } = require('./middleware/upload');

const bookRoutes = require('./routes/books');
const emotionRoutes = require('./routes/emotion');
const ttsRoutes = require('./routes/tts');
const progressRoutes = require('./routes/progress');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : true;

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

app.use('/api/books', authMiddleware, bookRoutes);
app.use('/api/emotion', authMiddleware, emotionRoutes);
app.use('/api/tts', authMiddleware, ttsRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);

app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
    },
    env: process.env.NODE_ENV || 'development',
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 50MB)' });
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
