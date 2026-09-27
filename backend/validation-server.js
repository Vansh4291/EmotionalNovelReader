/**
 * Static server for the validation harness (dev tooling only).
 *
 * Serves frontend/validation/* and proxies /api -> backend (port 3000) so the
 * harness's same-origin API_BASE_URL (http://<host>/api) reaches the real
 * backend. Not part of the production application.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_ROOT = path.resolve(__dirname, '..', 'frontend', 'validation');
const PORT = parseInt(process.env.VALIDATION_PORT || '8088', 10);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '3000', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.map': 'application/json',
};

function proxy(req, res) {
  const opts = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` },
  };
  const upstream = http.request(opts, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', (e) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'backend_unreachable', detail: e.message }));
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  // Same-origin, loopback-only injection point: the harness fetches the API
  // key it was started with so the app's getApiKey() picks it up. Dev
  // tooling only — never exposed outside 127.0.0.1.
  if (req.url === '/validation-config') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ apiKey: process.env.API_KEY || 'dev-key-change-in-production' }));
    return;
  }

  if (req.url.startsWith('/api/')) return proxy(req, res);

  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(STATIC_ROOT, path.normalize(urlPath).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found: ' + urlPath);
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[validation-server] http://127.0.0.1:${PORT} (api -> 127.0.0.1:${BACKEND_PORT})`);
});
