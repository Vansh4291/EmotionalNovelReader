const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
require('dotenv').config();

const env = require('./config/env');
const logger = require('./utils/logger');

logger.configure({ level: env.logLevel, isProd: env.isProduction });

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

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

// Request logging (method, path, status, duration). Never logs headers or
// bodies, so the API key can never leak through this middleware.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.debug(`[REQ] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

const corsOptions = {
  origin: env.corsOrigins === null ? true : env.corsOrigins,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
};

app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
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
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
    },
    env: env.nodeEnv,
  });
});

// API 404 handler: unknown /api routes get a clean JSON 404 instead of
// falling through to the HTML-ish error middleware.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler: production responses never include stack traces; logs keep
// stacks only in non-production. Unexpected errors are logged with request
// method/path only (no headers/bodies).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large (max ${Math.round(env.maxUploadBytes / (1024 * 1024))}MB)` });
  }
  // body-parser emits PayloadTooLargeError (entity.too.large) for JSON/urlencoded
  // bodies over the configured limit — a client fault, so map it to 413.
  if (err.type === 'entity.too.large' || err.code === 'PAYLOAD_TOO_LARGE' || err instanceof RangeError) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err.status === 429) {
    return res.status(429).json({ error: 'Too many requests, try again later' });
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
