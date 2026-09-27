const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Constant-time comparison prevents timing side-channels on key matching.
  const a = Buffer.from(apiKey);
  const b = Buffer.from(env.apiKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { authMiddleware };
