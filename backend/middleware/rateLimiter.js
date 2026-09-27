const { rateLimit, MemoryStore } = require('express-rate-limit');
const env = require('../config/env');

// Explicit stores so the test suite can reset counters deterministically.
const generalStore = new MemoryStore(60 * 1000);
const analysisStore = new MemoryStore(60 * 1000);
const importStore = new MemoryStore(60 * 1000);

// General API limiter. Keyed by client IP (proxy-aware via TRUST_PROXY).
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: generalStore,
  message: { error: 'Too many requests, try again later' },
});

// Emotion analysis is CPU-bound (Python child process) — strict limit.
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: analysisStore,
  message: { error: 'Too many analysis requests, try again later' },
});

// File import: heavy parse work + disk I/O — strict limit.
const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: importStore,
  message: { error: 'Too many import requests, try again later' },
});

/**
 * Reset all limiter counters. Used by the test suite so rate-limit state does
 * not leak between suites running in the same worker process.
 */
function resetAllLimiters() {
  for (const store of [generalStore, analysisStore, importStore]) {
    if (store && typeof store.resetAll === 'function') {
      store.resetAll();
    }
  }
}

module.exports = { generalLimiter, analysisLimiter, importLimiter, resetAllLimiters };
