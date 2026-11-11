'use strict';
const A = require('../lib/auth');

module.exports = (req, res) => {
  let s = null;
  try { s = A.getSession(req); } catch (e) { return A.send(res, 500, { ok: false }); }
  if (!s) return A.send(res, 401, { ok: false });
  return A.send(res, 200, { ok: true, u: s.u, n: s.n });
};
