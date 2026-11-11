# ProvideTech Ads Guide: secure version (Vercel, free plan)

Only **Dashboard** and **Simulator** are public. Every other section (Benchmarks, Diagnose, Reports,
Ads Manager, Ads packages, Playbook, Tools, AI Assistant) is **not in the public page at all**. It is
sent by the server (`/api/private`) only after a valid login.

```
public/index.html        the public page (Dashboard, Simulator, login screen)
api/login.js             checks username + password, sets a signed HttpOnly cookie
api/session.js           tells the page who is logged in
api/logout.js            clears the cookie
api/private.js           returns the locked sections (code + content) to logged-in users only
lib/auth.js              cookie signing, password check, throttling
lib/private-bundle.js    the locked sections (never served as a static file)
scripts/hash-password.js create a hashed password for a new account
scripts/dev-server.js    run it locally
vercel.json              security headers + serves only /public
```

## 1. Deploy on Vercel (free Hobby plan)
1. Replace the files in your GitHub repo with this folder's contents (keep `.gitignore`), or deploy with the Vercel CLI (`vercel --prod`).
2. In Vercel: **Project > Settings > Environment Variables**, add the two values from `VERCEL-ENV-VALUES.txt` (`SESSION_SECRET` and `ACCOUNTS`) for **Production** (and Preview if you use it).
3. In **Project > Settings > General**: Framework Preset **Other**, leave Build Command empty, Output Directory `public` (vercel.json already sets this). Node 18 or newer.
4. **Redeploy**. Open the site, try a locked section, log in.
5. Turn on **Deployment Protection** for preview URLs and 2-step verification on GitHub and Vercel.

Never commit `.env.local` or `VERCEL-ENV-VALUES.txt`.

## 2. Change a password or add a user
```
node scripts/hash-password.js newuser "a long random passphrase" "Display Name"
```
It prints one JSON entry. Merge it into the `ACCOUNTS` value in Vercel (a JSON object with one entry per user), then redeploy. To remove someone, delete their entry and redeploy. To log everyone out at once, change `SESSION_SECRET`.

The two starting passwords were shared in a chat, so **change both** before real use.

## 3. Run locally
Create `.env.local` with `ACCOUNTS=...` and `SESSION_SECRET=...`, then `node scripts/dev-server.js` and open http://localhost:3000.

## 4. If you edit the app
`public/index.html` and `lib/private-bundle.js` are generated from one source file. Keep the original single-file `index.html` and ask for the split to be rebuilt after each change, otherwise edits to locked sections will not appear.

## What this does and does not protect
* Locked content is never downloaded by visitors who are not logged in, and cannot be unlocked from the browser console.
* Passwords are stored only as salted scrypt hashes in Vercel settings, never in the page.
* Sessions last 7 days in an HttpOnly, Secure, SameSite=Strict cookie; logins are throttled (5 wrong tries, then a 15-minute pause per IP, best effort on the free plan).
* A logged-in person can still copy what they can see. Use one account per person and remove leavers.
* The public Dashboard and Simulator, and the benchmark numbers they use, remain visible to everyone.
