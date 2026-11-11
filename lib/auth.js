'use strict';
/* Shared helpers: signed session cookie, password check, request guards. */
const crypto = require('crypto');

const COOKIE = 'ptb_s';
const MAX_AGE = 7 * 24 * 3600;           /* session length in seconds */
const SCRYPT = { N: 16384, r: 8, p: 1 };  /* must match scripts/hash-password.js */

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters');
  return s;
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + sig;
}
function verify(token) {
  if (typeof token !== 'string') return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1);
  const want = crypto.createHmac('sha256', secret()).update(body).digest();
  let got;
  try { got = Buffer.from(sig, 'base64url'); } catch (e) { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!p || typeof p.u !== 'string' || !(p.exp > Date.now() / 1000)) return null;
  return p;
}
function cookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}
function getSession(req) {
  return verify(cookies(req.headers.cookie)[COOKIE]);
}
function accounts() {
  try { return JSON.parse(process.env.ACCOUNTS || '{}'); } catch (e) { return {}; }
}
/* Always runs scrypt so the response time does not reveal whether a username exists. */
function checkPassword(user, password) {
  const acc = Object.prototype.hasOwnProperty.call(accounts(), user) ? accounts()[user] : null;
  const salt = Buffer.from(acc && acc.salt ? acc.salt : '00'.repeat(16), 'hex');
  const dk = crypto.scryptSync(password, salt, 64, SCRYPT);
  if (!acc || !acc.hash) return null;
  const want = Buffer.from(acc.hash, 'hex');
  return want.length === dk.length && crypto.timingSafeEqual(want, dk) ? acc : null;
}
function isLocal(req) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(String(req.headers.host || ''));
}
function setCookie(req, token, maxAge) {
  const flags = 'Path=/; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (isLocal(req) ? '' : '; Secure');
  return COOKIE + '=' + token + '; ' + flags;
}
function baseHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
function send(res, status, obj) {
  baseHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}
/* Blocks cross-site form posts: the Origin (when sent) must match this host. */
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}
async function readJson(req, limit) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > (limit || 4096)) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return null; }
}
/* Best-effort throttle per IP (memory is per server instance, so this slows guessing but is not absolute). */
const tries = new Map();
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x').split(',')[0].trim();
}
function blockedFor(ip) {
  const t = tries.get(ip);
  return t && t.until > Date.now() ? Math.ceil((t.until - Date.now()) / 1000) : 0;
}
function failed(ip) {
  const t = tries.get(ip) || { n: 0, until: 0 };
  if (t.until && t.until < Date.now()) { t.n = 0; t.until = 0; }
  t.n += 1;
  if (t.n >= 5) { t.until = Date.now() + 15 * 60 * 1000; t.n = 0; }
  tries.set(ip, t);
  if (tries.size > 5000) tries.clear();
}
function cleared(ip) { tries.delete(ip); }

module.exports = { COOKIE, MAX_AGE, SCRYPT, sign, verify, getSession, checkPassword, setCookie, send, baseHeaders, sameOrigin, readJson, clientIp, blockedFor, failed, cleared };
