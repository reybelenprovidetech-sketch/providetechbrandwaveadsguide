'use strict';
/* Delivers the locked sections (code and content) only to logged-in users. */
const A = require('../lib/auth');

module.exports = (req, res) => {
  let s = null;
  try { s = A.getSession(req); } catch (e) { return A.send(res, 500, { ok: false }); }
  if (!s) return A.send(res, 401, { ok: false, error: 'Login required.' });
  if (req.headers['sec-fetch-site'] === 'cross-site') return A.send(res, 403, { ok: false });
  A.baseHeaders(res);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.statusCode = 200;
  res.end(require('../lib/private-bundle.js'));
};
