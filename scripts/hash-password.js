#!/usr/bin/env node
/* Usage: node scripts/hash-password.js <username> "<password>" [Display Name]
   Prints a JSON entry to merge into the ACCOUNTS environment variable. */
const crypto = require('crypto');
const [, , user, password, name] = process.argv;
if (!user || !password) { console.error('Usage: node scripts/hash-password.js <username> "<password>" [Display Name]'); process.exit(1); }
if (password.length < 12) console.error('Warning: use at least 12 characters (a long random phrase is best).');
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const entry = { [user.toLowerCase()]: { name: name || user, salt: salt.toString('hex'), hash: hash.toString('hex') } };
console.log(JSON.stringify(entry));
