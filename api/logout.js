'use strict';
const A = require('../lib/auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return A.send(res, 405, { ok: false }); }
  if (!A.sameOrigin(req)) return A.send(res, 403, { ok: false });
  res.setHeader('Set-Cookie', A.setCookie(req, '', 0));
  return A.send(res, 200, { ok: true });
};
