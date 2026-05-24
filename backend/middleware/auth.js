const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';

function authMiddleware(req, res, next) {
  if (req.path === '/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { authMiddleware };
