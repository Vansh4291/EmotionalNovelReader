const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many analysis requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const importLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many import requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, analysisLimiter, importLimiter };
