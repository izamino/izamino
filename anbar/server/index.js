'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { get, run, UPLOAD_DIR } = require('./db');
const A = require('./auth');
const { HttpError } = require('./util');
const { routes, backupNow } = require('./routes');
const { runScheduledChecks } = require('./notify');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SECURE_COOKIE = process.env.ANBAR_SECURE_COOKIE === '1';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 8 * 1024 * 1024) { reject(new HttpError(413, 'حجم اطلاعات ارسالی زیاد است.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'اطلاعات ارسالی نامعتبر است.')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', ...headers });
  res.end(body);
}
const sendJson = (res, status, data) => send(res, status, JSON.stringify(data), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });

function serveFile(res, file, extraHeaders = {}) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': st.size, 'x-content-type-options': 'nosniff', ...extraHeaders,
    });
    fs.createReadStream(file).pipe(res);
  });
}

async function handleApi(req, res, url) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.sid;
  const cookieHeaders = [];
  const setCookie = (value, maxAge = 30 * 86400) => cookieHeaders.push(
    `sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`);
  try {
    // State-changing requests must come from our own page (custom header cannot be sent cross-site without CORS).
    if (req.method !== 'GET' && req.headers['x-anbar'] !== '1') throw new HttpError(403, 'درخواست نامعتبر است.');
    let match = null;
    let rt = null;
    for (const r of routes) {
      if (r.method !== req.method) continue;
      match = r.re.exec(url.pathname);
      if (match) { rt = r; break; }
    }
    if (!rt) throw new HttpError(404, 'مسیر پیدا نشد.');
    const user = A.userFromToken(token);
    if (!rt.public && !user) throw new HttpError(401, 'لطفاً دوباره وارد شوید.');
    if (user) user.token = token;
    const params = Object.fromEntries(rt.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
    const body = req.method === 'GET' ? {} : await readBody(req);
    const query = Object.fromEntries(url.searchParams);
    const out = await rt.handler({ req, user, params, body, query, token, setCookie });
    const headers = cookieHeaders.length ? { 'set-cookie': cookieHeaders } : {};
    if (out && out.$file) {
      return send(res, 200, out.$file.body, {
        ...headers, 'content-type': out.$file.type, 'cache-control': 'no-store',
        'content-disposition': `attachment; filename="${out.$file.name}"`,
      });
    }
    res.setHeader('set-cookie', cookieHeaders);
    sendJson(res, 200, out ?? { ok: true });
  } catch (e) {
    if (!(e instanceof HttpError)) {
      console.error(e);
      const msg = /UNIQUE constraint/.test(e.message) ? 'این مورد تکراری است.' : 'خطای داخلی سامانه. دوباره تلاش کنید.';
      return sendJson(res, 500, { error: msg });
    }
    sendJson(res, e.status, { error: e.message });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (url.pathname.startsWith('/uploads/')) {
    const user = A.userFromToken(parseCookies(req.headers.cookie).sid);
    const name = path.basename(url.pathname);
    if (!user || !/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(name)) return send(res, 404, 'Not found');
    return serveFile(res, path.join(UPLOAD_DIR, name), { 'cache-control': 'private, max-age=31536000, immutable' });
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || !path.extname(rel)) rel = '/index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  serveFile(res, file, { 'cache-control': rel === '/index.html' ? 'no-cache' : 'public, max-age=3600' });
});

/* ------------------------------------------------------------- first run & CLI */

function ensureAdmin() {
  if (get('SELECT COUNT(*) AS n FROM users').n > 0) return;
  const password = process.env.ANBAR_ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
  run(`INSERT INTO users (username, full_name, password_hash, role, must_change_pw) VALUES ('admin', 'مدیر کل', ?, 'admin', 1)`,
    A.hashPassword(password));
  console.log('\n================================================');
  console.log(' اولین مدیر کل ساخته شد');
  console.log(' نام کاربری: admin');
  console.log(` رمز عبور:   ${password}`);
  console.log(' پس از ورود، رمز را تغییر دهید.');
  console.log('================================================\n');
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'reset-password') {
  const [username, password] = args;
  const u = username && get('SELECT * FROM users WHERE username = ?', username);
  if (!u || !password || password.length < 6) {
    console.error('Usage: npm run reset-password -- <username> <new-password (min 6 chars)>');
    process.exit(1);
  }
  run('UPDATE users SET password_hash = ?, must_change_pw = 1, active = 1 WHERE id = ?', A.hashPassword(password), u.id);
  run('DELETE FROM sessions WHERE user_id = ?', u.id);
  console.log(`Password for ${u.username} was reset.`);
  process.exit(0);
} else if (cmd === 'backup') {
  console.log('Backup written:', backupNow());
  process.exit(0);
} else {
  ensureAdmin();
  server.listen(PORT, () => console.log(`سامانه انبار روی http://localhost:${PORT} اجرا شد`));
  const hourly = () => {
    try {
      runScheduledChecks();
      run("DELETE FROM sessions WHERE expires_at < datetime('now')");
    } catch (e) { console.error('scheduled checks failed', e); }
  };
  hourly();
  setInterval(hourly, 60 * 60 * 1000);
  // Daily automatic backup (checks every hour, writes at most one per day).
  const dailyBackup = () => {
    try {
      const todayStamp = new Date().toISOString().slice(0, 10);
      const dir = path.join(path.dirname(UPLOAD_DIR), 'backups');
      if (!fs.readdirSync(dir).some((f) => f.startsWith(`anbar-${todayStamp}`))) console.log('Auto backup:', backupNow());
    } catch (e) { console.error('auto backup failed', e); }
  };
  dailyBackup();
  setInterval(dailyBackup, 60 * 60 * 1000);
}
