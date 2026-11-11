#!/usr/bin/env node
/* Local test server that mimics Vercel: node scripts/dev-server.js  (then open http://localhost:3000)
   Reads ACCOUNTS and SESSION_SECRET from a .env.local file (see README). Not used in production. */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
try {
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^'|'$/g, '');
  });
} catch (e) { console.warn('No .env.local found; login will not work.'); }
const routes = { '/api/login': 'login', '/api/session': 'session', '/api/logout': 'logout', '/api/private': 'private' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (routes[url.pathname]) return require('../api/' + routes[url.pathname] + '.js')(req, res);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(fs.readFileSync(path.join(root, 'public', 'index.html')));
  }
  res.statusCode = 404; res.end('Not found');
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
