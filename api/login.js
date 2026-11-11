'use strict';
const A = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return A.send(res, 405, { ok: false, error: 'Method not allowed.' }); }
  if (!A.sameOrigin(req)) return A.send(res, 403, { ok: false, error: 'Request blocked.' });
  const ip = A.clientIp(req);
  const wait = A.blockedFor(ip);
  if (wait) return A.send(res, 429, { ok: false, error: 'Too many attempts. Please wait ' + Math.ceil(wait / 60) + ' minute(s) and try again.' });
  const body = await A.readJson(req, 4096);
  if (!body) return A.send(res, 400, { ok: false, error: 'Enter your username and password.' });
  const u = String(body.u || '').trim().toLowerCase().slice(0, 64);
  const p = String(body.p || '').slice(0, 200);
  if (!u || !p) return A.send(res, 400, { ok: false, error: 'Enter your username and password.' });
  let acc = null;
  try { acc = A.checkPassword(u, p); } catch (e) { return A.send(res, 500, { ok: false, error: 'Login is not configured on the server.' }); }
  if (!acc) {
    A.failed(ip);
    await new Promise(r => setTimeout(r, 600));
    return A.send(res, 401, { ok: false, error: 'Incorrect username or password.' });
  }
  A.cleared(ip);
  const exp = Math.floor(Date.now() / 1000) + A.MAX_AGE;
  const token = A.sign({ u, n: acc.name || u, exp });
  res.setHeader('Set-Cookie', A.setCookie(req, token, A.MAX_AGE));
  return A.send(res, 200, { ok: true, u, n: acc.name || u });
};
