/* const fs = require('fs');
const http = require('http');
const path = require('path');
const Module = require('module');

const { createTestEnvironment } = require('./test-data');

const environment = createTestEnvironment();

function shouldMockConfig(request) {
  return request === '../config/supabase' || request.endsWith('/config/supabase');
}

function shouldMockAuthService(request) {
  return request === '../services/auth.service' || request.endsWith('/services/auth.service');
}

function shouldMockKeyService(request) {
  return request === '../services/key.service' || request.endsWith('/services/key.service');
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (shouldMockConfig(request)) {
    return environment.modules.supabase;
  }

  if (shouldMockAuthService(request)) {
    return environment.modules.authService;
  }

  if (shouldMockKeyService(request)) {
    return environment.modules.keyService;
  }

  return originalLoad(request, parent, isMain);
};

const { app } = require('../../backend/src/app');

const webRoot = path.join(__dirname, '..', '..', 'web');
const port = Number(process.env.TEST_PORT || 4173);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }[ext] || 'application/octet-stream';

  res.writeHead(200, { 'content-type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(webRoot, safePath);

  if (!filePath.startsWith(webRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  serveFile(res, filePath);
}

const server = http.createServer((req, res) => {
  if (req.url === '/__health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.url === '/__tests/reset' && req.method === 'POST') {
    environment.reset();
    sendJson(res, 204, {});
    return;
  }

  if ((req.url || '').startsWith('/api/')) {
    app(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`FleetKeys test server running on http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown); */