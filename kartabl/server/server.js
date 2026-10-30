#!/usr/bin/env node
'use strict';
/* =====================================================================
   سرور کارتابل اداری مجتمع شباب اهل‌الجنه
   بدون وابستگی خارجی؛ Node.js 22.5 یا بالاتر (SQLite داخلی).
   همه قواعد کسب‌وکار و مجوزها اینجا اجرا می‌شوند؛ مرورگر فقط درخواست می‌فرستد.
   ===================================================================== */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const ARGS = process.argv.slice(2);
const flag = n => { const i = ARGS.indexOf('--' + n); return i < 0 ? undefined : ARGS[i + 1] && !ARGS[i + 1].startsWith('--') ? ARGS[i + 1] : true; };
const CFG = {
  port: +(process.env.PORT || flag('port') || 8080),
  host: process.env.HOST || flag('host') || '127.0.0.1',
  dataDir: path.resolve(process.env.DATA_DIR || flag('data') || path.join(__dirname, 'data')),
  secureCookie: process.env.COOKIE_SECURE === '1',
  trustProxy: process.env.TRUST_PROXY === '1',
  kavenegarBase: process.env.SMS_KAVENEGAR_BASE || 'https://api.kavenegar.com/v1',
  maxUpload: 20 * 1024 * 1024
};
const PUBLIC = path.join(__dirname, 'public');
fs.mkdirSync(path.join(CFG.dataDir, 'files'), { recursive: true });
fs.mkdirSync(path.join(CFG.dataDir, 'backups'), { recursive: true });

/* ---------- قواعد کسب‌وکار مشترک در یک محیط جدا ---------- */
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'shared.js'), 'utf8'), ctx, { filename: 'shared.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'view.js'), 'utf8'), ctx, { filename: 'view.js' });
const S = ctx.__srv;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
S.setHash(s => sha(s).slice(0, 16)); // زنجیره رویدادها با SHA-256
/* رمز عبور: scrypt با نمک جداگانه برای هر کاربر */
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const pwHashSrv = p => { const salt = crypto.randomBytes(16); const h = crypto.scryptSync(String(p).normalize('NFKC'), salt, 32, SCRYPT); return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${h.toString('base64')}`; };
const pwCheckSrv = (stored, p) => {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, N, r, pp, salt, hash] = stored.split('$');
  const h = crypto.scryptSync(String(p).normalize('NFKC'), Buffer.from(salt, 'base64'), 32, { N: +N, r: +r, p: +pp, maxmem: SCRYPT.maxmem });
  const want = Buffer.from(hash, 'base64');
  return want.length === h.length && crypto.timingSafeEqual(want, h);
};
S.setPw(pwHashSrv, pwCheckSrv);
const DUMMY_HASH = pwHashSrv(crypto.randomBytes(8).toString('hex'));

/* ---------- پایگاه داده ---------- */
const db = new DatabaseSync(path.join(CFG.dataDir, 'kartabl.db'));
db.exec(`PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, json TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, owner TEXT NOT NULL, created TEXT NOT NULL, ref_col TEXT, ref_id TEXT);`);
const qKV = db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v');
const qAudit = db.prepare('INSERT INTO audit (json) VALUES (?)');

function loadState() {
  const rows = db.prepare('SELECT k, v FROM kv').all();
  if (!rows.length) return false;
  const D = {};
  rows.forEach(r => (D[r.k] = JSON.parse(r.v)));
  D.audit = db.prepare('SELECT json FROM audit ORDER BY seq').all().map(r => JSON.parse(r.json));
  S.setDB(S.migrate(D));
  S.applySettings();
  return true;
}
function persistAll() {
  const D = S.getDB();
  db.exec('BEGIN IMMEDIATE');
  try {
    Object.keys(D).forEach(k => { if (k !== 'audit') qKV.run(k, JSON.stringify(D[k])); });
    const have = db.prepare('SELECT COUNT(*) AS n FROM audit').get().n;
    D.audit.slice(have).forEach(a => qAudit.run(JSON.stringify(a)));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
function initState(demo) {
  S.setME(null);
  const D = demo ? S.seed() : S.baseDB();
  S.setDB(D);
  if (demo) { D.users.forEach(u => { u.pass = pwHashSrv('1234'); }); D.settings.showDemo = false; D.settings.demoServer = true; D.settings.sms.enabled = false; D.sms = []; }
  S.applySettings();
  persistAll();
}

/* ---------- اجرای یک عملیات به‌صورت تراکنش ---------- */
function bumpVersions(arr, oldArr) {
  const old = new Map(oldArr.filter(x => x && x.id).map(x => [x.id, x]));
  arr.forEach(r => {
    if (!r || typeof r !== 'object' || !r.id) return;
    const o = old.get(r.id);
    if (!o) { r._v = 1; return; }
    const { _v: a, ...ra } = r; const { _v: b, ...rb } = o;
    if (JSON.stringify(ra) !== JSON.stringify(rb)) r._v = (o._v || 0) + 1; else r._v = o._v || 0;
  });
}
function exec(actor, fn) {
  const D = S.getDB();
  const keys = Object.keys(D);
  const before = {};
  keys.forEach(k => { if (k !== 'audit') before[k] = JSON.stringify(D[k]); });
  const auditLen = D.audit.length;
  const activeBefore = new Set(D.sessions.filter(s => s.active).map(s => s.id));
  S.setME(actor ? { user: actor.user, pos: actor.pos } : null);
  let res, err;
  try { res = fn(); if (res && res.error) err = res.error; }
  catch (e) { err = e instanceof S.OpError ? e.message : null; if (!err) { console.error(e); err = 'خطای داخلی سرور؛ هیچ تغییری ثبت نشد.'; } }
  finally { S.setME(null); }
  const rollback = () => { const nd = {}; keys.forEach(k => (nd[k] = k === 'audit' ? D.audit.slice(0, auditLen) : JSON.parse(before[k]))); S.setDB(nd); S.applySettings(); };
  if (err) { rollback(); return { error: err }; }
  const changed = [];
  Object.keys(D).forEach(k => {
    if (k === 'audit') return;
    const now = JSON.stringify(D[k]);
    if (now === before[k]) return;
    if (Array.isArray(D[k]) && before[k]) { bumpVersions(D[k], JSON.parse(before[k])); }
    changed.push(k);
  });
  const newAudit = D.audit.slice(auditLen);
  try {
    db.exec('BEGIN IMMEDIATE');
    changed.forEach(k => qKV.run(k, JSON.stringify(D[k])));
    newAudit.forEach(a => qAudit.run(JSON.stringify(a)));
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (x) {}
    console.error('persist failed', e);
    rollback();
    return { error: 'ذخیره در پایگاه داده انجام نشد؛ هیچ تغییری ثبت نشد.' };
  }
  if (actor) bindFiles(actor.user.id, changed);
  const ended = [...activeBefore].filter(id => !S.getDB().sessions.some(s => s.id === id && s.active));
  if (ended.length) ended.forEach(id => sendEnded(id, 'نشست شما توسط مدیر سامانه پایان یافت.'));
  if (changed.length) broadcast();
  return { result: res, changed };
}
const plain = r => (r && typeof r === 'object' ? { id: r.id, no: r.no, n: r.n, active: r.active, error: r.error } : {});

/* ---------- نشست‌ها ---------- */
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const ipOf = req => (CFG.trustProxy && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress || '');
const agentOf = req => String(req.headers['user-agent'] || '').replace(/\(.*?\)/g, '').slice(0, 60);
function sessionCookie(token, maxAge) { return `kt=${token}; HttpOnly; SameSite=Strict; Path=/;${CFG.secureCookie ? ' Secure;' : ''} Max-Age=${maxAge}`; }
function canEnter(u) {
  if (!u || u.deleted) return 'نام کاربری یا رمز عبور درست نیست.';
  if (!u.active) return 'این حساب کاربری غیرفعال شده است. با مدیریت فناوری اطلاعات تماس بگیرید.';
  if (!u.posId || !S.posById(u.posId)) return 'برای این حساب جایگاه سازمانی تعریف نشده است.';
  if (S.getDB().settings.maintenance && !S.permOf(S.posById(u.posId), 'admin.settings')) return 'سامانه در حالت به‌روزرسانی است و فعلاً فقط مدیران سامانه وارد می‌شوند.';
  return '';
}
function auth(req) {
  const tok = cookies(req).kt; if (!tok || tok.length > 100) return null;
  const th = sha(tok);
  const D = S.getDB();
  const s = D.sessions.find(x => x.th === th && x.active);
  if (!s) return null;
  const u = D.users.find(x => x.id === s.uid);
  const why = canEnter(u);
  const idleMin = D.settings.security.sessionMin;
  const idle = Date.now() - new Date(s.last).getTime() > idleMin * 60000;
  if (why || idle) { exec(null, () => { s.active = false; s.end = S.stamp(); s.endReason = why || 'بی‌فعالیتی'; return {}; }); return { ended: idle ? `به دلیل ${S.fa(idleMin)} دقیقه بی‌فعالیتی، از سامانه خارج شدید.` : why }; }
  return { s, user: u, pos: S.posById(u.posId) };
}
function touch(a) {
  if (Date.now() - new Date(a.s.last).getTime() < 30000) return;
  exec(null, () => { a.s.last = S.stamp(); return {}; });
}
function enforceSessions() {
  const D = S.getDB();
  const bad = D.sessions.filter(s => s.active && (canEnter(D.users.find(u => u.id === s.uid)) || Date.now() - new Date(s.last).getTime() > D.settings.security.sessionMin * 60000));
  if (bad.length) exec(null, () => { bad.forEach(s => { s.active = false; s.end = S.stamp(); }); return {}; });
  if (D.sessions.length > 600) exec(null, () => { const keep = D.sessions.filter(s => s.active); const old = D.sessions.filter(s => !s.active).slice(-400); S.getDB().sessions = old.concat(keep); return {}; });
}

/* ---------- محدودیت تعداد درخواست ---------- */
const RL = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(); const r = RL.get(key) || { n: 0, reset: now + windowMs };
  if (now > r.reset) { r.n = 0; r.reset = now + windowMs; }
  r.n++; RL.set(key, r);
  return r.n > max;
}
setInterval(() => { const now = Date.now(); RL.forEach((v, k) => { if (now > v.reset) RL.delete(k); }); }, 60000).unref();

/* ---------- پاسخ‌ها ---------- */
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
};
function send(res, code, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { ...SEC_HEADERS, 'Cache-Control': 'no-store', 'Content-Type': typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', ...headers });
  res.end(data);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const tooBig = () => Object.assign(new Error('حجم درخواست بیش از حد مجاز است.'), { code: 413 });
    if (+req.headers['content-length'] > limit) { req.resume(); return reject(tooBig()); }
    let size = 0, over = false; const chunks = [];
    req.on('data', c => { if (over) return; size += c.length; if (size > limit) { over = true; chunks.length = 0; reject(tooBig()); } else chunks.push(c); });
    req.on('end', () => { if (!over) resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}
async function readJSON(req, limit = 1024 * 1024) { const b = await readBody(req, limit); if (!b.length) return {}; try { return JSON.parse(b.toString('utf8')); } catch (e) { throw Object.assign(new Error('بدنه درخواست JSON معتبر نیست.'), { code: 400 }); } }
const stateOf = a => { S.setME({ user: a.user, pos: a.pos }); try { return { state: S.viewFor(), me: a.user.id, session: { id: a.s.id, start: a.s.start }, csrf: a.s.csrf }; } finally { S.setME(null); } };

/* ---------- رویدادهای زنده (SSE) ---------- */
const STREAMS = new Map(); // sid -> Set(res)
let BT = null;
function broadcast() { clearTimeout(BT); BT = setTimeout(() => STREAMS.forEach(set => set.forEach(r => r.write('event: changed\ndata: {}\n\n'))), 150); }
function sendEnded(sid, msg) { const set = STREAMS.get(sid); if (!set) return; set.forEach(r => { r.write(`event: ended\ndata: ${JSON.stringify({ msg })}\n\n`); r.end(); }); STREAMS.delete(sid); }
setInterval(() => STREAMS.forEach(set => set.forEach(r => r.write(': keep-alive\n\n'))), 25000).unref();

/* ---------- فایل‌ها ---------- */
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'txt', 'csv', 'zip', 'rar', '7z', 'mp3', 'm4a', 'mp4'];
const INLINE = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const qFileIns = db.prepare('INSERT INTO files (id, name, type, size, owner, created) VALUES (?, ?, ?, ?, ?, ?)');
const qFileGet = db.prepare('SELECT * FROM files WHERE id = ?');
const qFileBind = db.prepare('UPDATE files SET ref_col = ?, ref_id = ? WHERE id = ? AND ref_col IS NULL AND owner = ?');
const qFileUnbound = db.prepare('SELECT id FROM files WHERE ref_col IS NULL AND owner = ?');
function bindFiles(owner, changed) {
  const ids = new Set(qFileUnbound.all(owner).map(r => r.id)); if (!ids.size) return;
  const D = S.getDB();
  changed.forEach(col => { if (!Array.isArray(D[col])) return; D[col].forEach(rec => S.fileRefsIn(col, rec).forEach(fid => { if (ids.has(fid)) { qFileBind.run(col, rec.id, fid, owner); ids.delete(fid); } })); });
}

/* ---------- پشتیبان‌گیری ---------- */
const BK_DIR = path.join(CFG.dataDir, 'backups');
const BK_RE = /^kartabl-[0-9TZ-]+-(auto|manual|pre-restore|cli)\.json$/;
function createBackup(kind, byName) {
  const D = S.getDB();
  const name = `kartabl-${new Date().toISOString().replace(/[:.]/g, '-')}-${kind}.json`;
  const json = JSON.stringify(D);
  fs.writeFileSync(path.join(BK_DIR, name + '.tmp'), json); fs.renameSync(path.join(BK_DIR, name + '.tmp'), path.join(BK_DIR, name));
  const files = fs.readdirSync(BK_DIR).filter(f => BK_RE.test(f)).sort();
  files.slice(0, Math.max(0, files.length - 60)).forEach(f => fs.unlinkSync(path.join(BK_DIR, f)));
  exec(null, () => { S.getDB().settings.backups.push({ ts: S.stamp(), by: byName || 'سامانه (خودکار)', size: json.length, n: D.letters.length + D.tasks.length + D.requests.length + D.orders.length, name }); S.getDB().settings.backups = S.getDB().settings.backups.slice(-60); return {}; });
  return name;
}
function autoBackup() { const b = S.getDB().settings.backups.filter(x => (x.name || '').includes('-auto')).slice(-1)[0]; if (!b || Date.now() - new Date(b.ts).getTime() > 23 * 3600000) createBackup('auto'); }

/* ---------- پیامک ---------- */
const SMS_Q = 'در صف ارسال';
async function smsSend(cfg, m) {
  if (cfg.provider === 'kavenegar') {
    const body = new URLSearchParams({ receptor: m.to, message: m.text, ...(cfg.sender ? { sender: cfg.sender } : {}) });
    const r = await fetch(`${CFG.kavenegarBase}/${encodeURIComponent(cfg.apiKey)}/sms/send.json`, { method: 'POST', body, signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.return && j.return.status === 200 && j.entries && j.entries[0]) return { ok: true, pid: String(j.entries[0].messageid) };
    return { ok: false, error: (j.return && j.return.message) || 'پاسخ ' + r.status };
  }
  if (cfg.provider === 'webhook') {
    const r = await fetch(cfg.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: m.to, text: m.text, id: m.id }), signal: AbortSignal.timeout(15000) });
    return r.ok ? { ok: true, pid: '' } : { ok: false, error: 'پاسخ ' + r.status };
  }
  return { ok: false, error: 'سرویس پیامک تنظیم نشده است', fatal: true };
}
let SMS_BUSY = false;
async function smsTick() {
  if (SMS_BUSY) return; SMS_BUSY = true;
  try {
    const D = S.getDB(); const cfg = D.settings.sms;
    const ready = cfg.enabled && ((cfg.provider === 'kavenegar' && cfg.apiKey) || (cfg.provider === 'webhook' && cfg.webhook));
    const due = D.sms.filter(m => m.status === SMS_Q && (!m.next || m.next <= Date.now())).slice(0, 25);
    for (const m of due) {
      let r;
      if (!ready) r = { ok: false, error: 'سرویس پیامک فعال یا تنظیم نشده است', fatal: true };
      else { try { r = await smsSend(cfg, m); } catch (e) { r = { ok: false, error: e.name === 'TimeoutError' ? 'پایان مهلت اتصال' : 'خطای شبکه' }; } }
      exec(null, () => {
        const x = S.getDB().sms.find(y => y.id === m.id); if (!x) return {};
        x.tries = (x.tries || 0) + 1; x.lastTry = S.stamp();
        if (r.ok) { x.status = 'ارسال‌شده'; x.pid = r.pid; x.sentAt = S.stamp(); x.lastError = ''; }
        else if (r.fatal || x.tries >= 3) { x.status = 'ناموفق'; x.lastError = r.error; }
        else { x.next = Date.now() + 30000 * 2 ** x.tries; x.lastError = r.error; }
        return {};
      });
    }
    /* پیگیری تحویل در کاوه‌نگار */
    if (ready && cfg.provider === 'kavenegar') {
      const chk = S.getDB().sms.filter(m => m.status === 'ارسال‌شده' && m.pid && Date.now() - new Date(m.sentAt).getTime() < 2 * 86400000 && (!m.checked || Date.now() - m.checked > 120000)).slice(0, 50);
      if (chk.length) {
        try {
          const r = await fetch(`${CFG.kavenegarBase}/${encodeURIComponent(cfg.apiKey)}/sms/status.json?messageid=${chk.map(m => m.pid).join(',')}`, { signal: AbortSignal.timeout(15000) });
          const j = await r.json();
          exec(null, () => { (j.entries || []).forEach(e => { const x = S.getDB().sms.find(y => y.pid === String(e.messageid)); if (!x) return; x.checked = Date.now(); if (e.status === 10) x.status = 'تحویل‌شده'; else if ([6, 11, 14, 100].includes(e.status)) { x.status = 'تحویل نشد'; x.lastError = e.statustext || ''; } }); chk.forEach(m => { const x = S.getDB().sms.find(y => y.id === m.id); if (x) x.checked = Date.now(); }); return {}; });
        } catch (e) { /* در دور بعد دوباره بررسی می‌شود */ }
      }
    }
    if (S.getDB().sms.length > 3000) exec(null, () => { S.getDB().sms = S.getDB().sms.slice(-2000); return {}; });
  } finally { SMS_BUSY = false; }
}

/* ---------- مسیرها ---------- */
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const ip = ipOf(req);
  /* فایل‌های ایستا */
  if (req.method === 'GET' && !p.startsWith('/api/')) {
    const map = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/app.css': 'app.css', '/qrcode.min.js': '../vendor/qrcode-generator.js' };
    const f = map[p];
    if (!f) return send(res, 404, 'یافت نشد');
    const type = f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
    return send(res, 200, fs.readFileSync(path.join(PUBLIC, f)), { 'Content-Type': type, 'Cache-Control': f.endsWith('.html') ? 'no-store' : 'no-cache' });
  }
  /* محافظت در برابر درخواست جعلی بین‌سایتی */
  const mutating = req.method !== 'GET';
  if (mutating) {
    if (req.headers['x-kartabl'] !== '1') return send(res, 403, { error: 'درخواست نامعتبر است.' });
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'درخواست از مبدأ دیگر پذیرفته نمی‌شود.' });
  }
  if (p === '/api/login' && req.method === 'POST') return login(req, res, ip);
  if (p === '/api/signup' && req.method === 'POST') {
    if (limited('signup:' + ip, 5, 3600000)) return send(res, 429, { error: 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.' });
    const b = await readJSON(req);
    const r = exec(null, () => S.PUBLIC_OPS.createSignup(b.v || {}));
    return r.error ? send(res, 400, { error: r.error }) : send(res, 200, { result: plain(r.result) });
  }
  const a = auth(req);
  if (p === '/api/state' && req.method === 'GET') {
    if (!a || a.ended) return send(res, 200, { public: S.publicView(), message: a && a.ended ? a.ended : '' }, a && a.ended ? { 'Set-Cookie': sessionCookie('', 0) } : {});
    return send(res, 200, stateOf(a));
  }
  if (!a || a.ended) return send(res, 401, { error: a && a.ended ? a.ended : 'نشست شما پایان یافته است؛ دوباره وارد شوید.' }, { 'Set-Cookie': sessionCookie('', 0) });
  if (mutating && req.headers['x-csrf'] !== a.s.csrf) return send(res, 403, { error: 'نشانه امنیتی درخواست نامعتبر است؛ صفحه را دوباره بارگذاری کنید.' });
  if (limited('u:' + a.user.id, 240, 60000)) return send(res, 429, { error: 'تعداد درخواست‌ها زیاد است؛ چند لحظه صبر کنید.' });

  if (p === '/api/ping' && req.method === 'POST') { exec(null, () => { a.s.last = S.stamp(); return {}; }); return send(res, 200, { ok: true }); }
  if (p === '/api/logout' && req.method === 'POST') {
    exec({ user: a.user, pos: a.pos }, () => { a.s.active = false; a.s.end = S.stamp(); S.audit('خروج از سامانه', 'session', a.user.id, ''); return {}; });
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }
  if (p === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write(': ok\n\n');
    if (!STREAMS.has(a.s.id)) STREAMS.set(a.s.id, new Set());
    STREAMS.get(a.s.id).add(res);
    req.on('close', () => { const set = STREAMS.get(a.s.id); if (set) { set.delete(res); if (!set.size) STREAMS.delete(a.s.id); } });
    return;
  }
  if (p === '/api/cmd' && req.method === 'POST') {
    const b = await readJSON(req);
    const fn = S.OPS[b.name];
    if (!fn || !Array.isArray(b.args)) return send(res, 400, { error: 'عملیات ناشناخته است.' });
    /* کنترل تعارض: اگر رکوردی که کاربر دیده در این فاصله تغییر کرده باشد، عملیات اجرا نمی‌شود */
    if (b.ver && b.ver.col && b.ver.id) {
      const cur = (S.getDB()[b.ver.col] || []).find(x => x.id === b.ver.id);
      if (cur && (cur._v || 0) !== +b.ver.v) return send(res, 409, { conflict: true, error: 'این مورد در این فاصله توسط کاربر دیگری تغییر کرده است. آخرین نسخه نمایش داده شد؛ دوباره بررسی و اقدام کنید.', ...stateOf(a) });
    }
    const args = b.name === 'kickAll' ? [a.s.id] : b.args;
    const r = exec({ user: a.user, pos: a.pos }, () => fn(...args));
    touch(a);
    const a2 = auth(req);
    const out = a2 && !a2.ended ? stateOf(a2) : {};
    return send(res, r.error ? 400 : 200, r.error ? { error: r.error, ...out } : { result: plain(r.result), ...out });
  }
  if (p === '/api/files' && req.method === 'PUT') {
    const name = String(url.searchParams.get('name') || '').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 180);
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (!name || !ALLOWED_EXT.includes(ext)) return send(res, 415, { error: `نوع فایل «${ext || 'نامشخص'}» مجاز نیست. انواع مجاز: ${ALLOWED_EXT.join('، ')}` });
    let buf; try { buf = await readBody(req, CFG.maxUpload); } catch (e) { return send(res, e.code || 400, { error: 'حجم فایل بیشتر از ۲۰ مگابایت است.' }); }
    if (!buf.length) return send(res, 400, { error: 'فایل خالی است.' });
    const id = crypto.randomBytes(12).toString('hex');
    fs.writeFileSync(path.join(CFG.dataDir, 'files', id), buf);
    const type = INLINE[ext] || 'application/octet-stream';
    qFileIns.run(id, name, type, buf.length, a.user.id, new Date().toISOString());
    exec({ user: a.user, pos: a.pos }, () => { S.audit('بارگذاری فایل', 'file', id, name); return {}; });
    return send(res, 200, { id, name, size: buf.length, type });
  }
  const fm = p.match(/^\/api\/files\/([a-f0-9]{24})$/);
  if (fm && req.method === 'GET') {
    const f = qFileGet.get(fm[1]);
    if (!f) return send(res, 404, { error: 'فایل یافت نشد.' });
    S.setME({ user: a.user, pos: a.pos });
    let ok; try { ok = S.fileVisible({ owner: f.owner, ref: f.ref_col ? { col: f.ref_col, id: f.ref_id } : null }); } finally { S.setME(null); }
    if (!ok) return send(res, 403, { error: 'اجازه مشاهده این فایل را ندارید.' });
    const inline = f.type !== 'application/octet-stream';
    res.writeHead(200, { ...SEC_HEADERS, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Type': f.type, 'Content-Length': f.size, 'Cache-Control': 'private, no-store', 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}` });
    return fs.createReadStream(path.join(CFG.dataDir, 'files', f.id)).pipe(res);
  }
  const canBk = () => { S.setME({ user: a.user, pos: a.pos }); try { return S.can('admin.backup'); } finally { S.setME(null); } };
  if (p === '/api/backups' && req.method === 'GET') { if (!canBk()) return send(res, 403, { error: 'مجاز نیست.' }); return send(res, 200, { list: fs.readdirSync(BK_DIR).filter(f => BK_RE.test(f)).sort().reverse().map(f => ({ name: f, size: fs.statSync(path.join(BK_DIR, f)).size })) }); }
  if (p === '/api/backups' && req.method === 'POST') { if (!canBk()) return send(res, 403, { error: 'پشتیبان‌گیری برای جایگاه شما مجاز نیست.' }); const name = createBackup('manual', a.user.name); exec({ user: a.user, pos: a.pos }, () => { S.audit('تهیه نسخه پشتیبان', 'backup', name, ''); return {}; }); return send(res, 200, { name, ...stateOf(a) }); }
  const bm = p.match(/^\/api\/backups\/([^/]+)$/);
  if (bm && req.method === 'GET' && bm[1] !== 'restore') {
    if (!canBk()) return send(res, 403, { error: 'مجاز نیست.' });
    if (!BK_RE.test(bm[1])) return send(res, 400, { error: 'نام فایل نامعتبر است.' });
    exec({ user: a.user, pos: a.pos }, () => { S.audit('دریافت نسخه پشتیبان', 'backup', bm[1], ''); return {}; });
    return send(res, 200, fs.readFileSync(path.join(BK_DIR, bm[1])), { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${bm[1]}"` });
  }
  if (p === '/api/backups/restore' && req.method === 'POST') {
    if (!canBk()) return send(res, 403, { error: 'بازیابی برای جایگاه شما مجاز نیست.' });
    const b = await readJSON(req, 200 * 1024 * 1024);
    return restore(a, b.data, res);
  }
  if (p === '/api/sms/test' && req.method === 'POST') {
    const b = await readJSON(req);
    const r = exec({ user: a.user, pos: a.pos }, () => {
      if (!S.can('admin.settings')) throw new S.OpError('مجاز نیست.');
      const to = String(b.to || '').replace(/\D/g, ''); if (!/^0?9\d{9}$/.test(to)) throw new S.OpError('شماره همراه معتبر نیست.');
      const m = { id: S.uid(), to, name: 'آزمایش', text: S.getDB().settings.orgName + ': پیامک آزمایشی کارتابل', ts: S.stamp(), status: SMS_Q };
      S.getDB().sms.push(m); S.audit('ارسال پیامک آزمایشی', 'sms', m.id, ''); return m;
    });
    if (r.error) return send(res, 400, { error: r.error });
    await smsTick();
    const m = S.getDB().sms.find(x => x.id === r.result.id);
    return send(res, 200, { status: m.status, error: m.lastError || '', ...stateOf(a) });
  }
  return send(res, 404, { error: 'یافت نشد.' });
}

async function login(req, res, ip) {
  if (limited('login:' + ip, 20, 60000)) return send(res, 429, { error: 'تعداد تلاش‌ها زیاد است؛ یک دقیقه صبر کنید.' });
  const b = await readJSON(req);
  const username = String(b.username || '').trim().slice(0, 64), pass = String(b.password || '').slice(0, 256);
  const D = S.getDB(); const sec = D.settings.security;
  const u = D.users.find(x => x.username === username && !x.deleted);
  const pub = S.publicView();
  const log = (ok, reason) => exec(null, () => { S.getDB().logins.push({ id: S.uid(), ts: S.stamp(), username, uid: u ? u.id : '', ok, reason, agent: agentOf(req), ip }); if (S.getDB().logins.length > 5000) S.getDB().logins = S.getDB().logins.slice(-4000); return {}; });
  if (!u) { pwCheckSrv(DUMMY_HASH, pass); log(false, 'نام کاربری ناموجود'); return send(res, 401, { error: 'نام کاربری یا رمز عبور درست نیست.', public: pub }); }
  if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) { log(false, 'حساب قفل'); return send(res, 401, { error: 'حساب به دلیل تلاش‌های ناموفق موقتاً قفل است. مدیر فناوری اطلاعات می‌تواند آن را باز کند.', public: pub }); }
  if (!pwCheckSrv(u.pass, pass)) {
    let locked = false;
    exec(null, () => { u.fails = (u.fails || 0) + 1; if (u.fails >= sec.maxFails) { u.lockedUntil = new Date(Date.now() + sec.lockMin * 60000).toISOString(); u.fails = 0; locked = true; S.notify(S.getDB().positions.filter(p => p.role !== 'imam' && S.permOf(p, 'admin.signups')).map(p => p.id), 'request', `حساب ${u.name} پس از ${S.fa(sec.maxFails)} تلاش ناموفق قفل شد.`, 'admin', u.username); } return {}; });
    log(false, locked ? 'قفل‌شدن حساب' : 'رمز نادرست');
    return send(res, 401, { error: locked ? `به دلیل ${S.fa(sec.maxFails)} تلاش ناموفق، حساب برای ${S.fa(sec.lockMin)} دقیقه قفل شد.` : 'نام کاربری یا رمز عبور درست نیست.', public: pub });
  }
  const why = canEnter(u);
  if (why) { log(false, why); return send(res, 401, { error: why, public: pub }); }
  const token = crypto.randomBytes(32).toString('base64url');
  const s = { id: S.uid(), uid: u.id, start: S.stamp(), last: S.stamp(), active: true, agent: agentOf(req), ip, th: sha(token), csrf: crypto.randomBytes(18).toString('base64url') };
  exec({ user: u, pos: S.posById(u.posId) }, () => { u.fails = 0; u.lockedUntil = ''; u.lastLogin = S.stamp(); S.getDB().sessions.push(s); S.audit('ورود به سامانه', 'session', u.id, ip); return {}; });
  log(true, 'ورود موفق');
  return send(res, 200, stateOf({ s, user: u, pos: S.posById(u.posId) }), { 'Set-Cookie': sessionCookie(token, 12 * 3600) });
}

function restore(a, d, res) {
  const cur = S.getDB();
  S.setME({ user: a.user, pos: a.pos });
  let errs;
  try { errs = S.validateBackup(d, a.user.id); } finally { S.setME(null); }
  if (!errs.length) {
    /* زنجیره رویدادهای نسخه پشتیبان باید سالم باشد */
    S.setDB(d); let bad; try { bad = S.verifyAudit(); } finally { S.setDB(cur); }
    if (bad >= 0) errs = [`زنجیره رویدادهای نسخه پشتیبان از ردیف ${S.fa(bad + 1)} سالم نیست؛ این فایل دست‌کاری شده یا از نسخه نمایشی است.`];
  }
  if (errs.length) return send(res, 400, { error: 'نسخه پشتیبان پذیرفته نشد:\n• ' + errs.join('\n• ') });
  const pre = createBackup('pre-restore', a.user.name);
  const next = S.migrate(JSON.parse(JSON.stringify(d)));
  /* رویدادها، ورودها و نشست‌ها هرگز به عقب برنمی‌گردند */
  next.audit = cur.audit; next.logins = cur.logins; next.sessions = cur.sessions; next.settings.backups = cur.settings.backups;
  const me = next.users.find(u => u.id === a.user.id);
  if (!me || !me.posId || !next.positions.some(p => p.id === me.posId)) return send(res, 400, { error: 'حساب شما در نسخه پشتیبان جایگاه ندارد؛ بازیابی انجام نشد.' });
  S.setDB(next); S.applySettings();
  try {
    S.setME({ user: me, pos: next.positions.find(p => p.id === me.posId) });
    S.audit('بازیابی نسخه پشتیبان', 'backup', '', 'نسخه پیش از بازیابی: ' + pre);
    S.setME(null);
    persistAll();
  } catch (e) { S.setME(null); S.setDB(cur); S.applySettings(); console.error(e); return send(res, 500, { error: 'ذخیره بازیابی انجام نشد؛ داده‌های قبلی دست‌نخورده باقی ماند.' }); }
  broadcast();
  const a2 = { s: a.s, user: me, pos: S.posById(me.posId) };
  return send(res, 200, { ok: true, pre, ...stateOf(a2) });
}

/* ---------- فرمان‌های خط فرمان ---------- */
function tempPass() { return crypto.randomBytes(9).toString('base64url'); }
function cli(cmd) {
  const exists = loadState();
  if (cmd === 'init') {
    if (exists) { console.error('پایگاه داده از قبل وجود دارد: ' + CFG.dataDir); process.exit(1); }
    initState(!!flag('demo'));
    console.log(flag('demo') ? 'پایگاه داده آزمایشی با داده نمونه ساخته شد (رمز همه حساب‌ها ۱۲۳۴). برای بهره‌برداری واقعی از آن استفاده نکنید.' : 'پایگاه داده خالی ساخته شد. اکنون با create-user متصدی جایگاه‌های امام جماعت و مدیر فناوری اطلاعات را تعریف کنید.');
    return;
  }
  if (!exists) { console.error('ابتدا «node server.js init» را اجرا کنید.'); process.exit(1); }
  if (cmd === 'create-user') {
    const pos = flag('pos'), username = flag('username'), name = flag('name'), phone = flag('phone') || '';
    if (!pos || !username || !name) { console.error('نمونه: node server.js create-user --pos P16-m --username it.admin --name "نام و نام خانوادگی" [--phone 0912...]'); process.exit(1); }
    const D = S.getDB();
    if (!S.posById(pos)) { console.error('جایگاه ناموجود است. شناسه‌ها: ' + D.positions.map(p => p.id).join(' ')); process.exit(1); }
    if (D.users.some(u => u.username === username && !u.deleted)) { console.error('این نام کاربری وجود دارد.'); process.exit(1); }
    const pw = tempPass();
    const r = exec(null, () => {
      const u = { id: 'u' + S.uid(), name, username, pass: pwHashSrv(pw), posId: '', active: true, phone, hired: S.todayISO(), mustChange: true, created: S.stamp() };
      D.users.push(u);
      const prev = D.users.find(x => x.posId === pos && x.active && x !== u); if (prev) prev.posId = '';
      const h = D.posHistory.find(x => x.posId === pos && !x.to); if (h) h.to = S.todayISO();
      u.posId = pos; D.posHistory.push({ posId: pos, userId: u.id, from: S.todayISO(), to: '' });
      S.audit('ایجاد کاربر از خط فرمان سرور', 'user', u.id, username + ' ← ' + pos);
      return u;
    });
    if (r.error) { console.error(r.error); process.exit(1); }
    console.log(`کاربر ساخته شد.\n  نام کاربری: ${username}\n  رمز موقت:   ${pw}\nدر اولین ورود، تعیین رمز جدید الزامی است.`);
    return;
  }
  if (cmd === 'reset-password') {
    const username = flag('username'); const u = S.getDB().users.find(x => x.username === username && !x.deleted);
    if (!u) { console.error('کاربر یافت نشد.'); process.exit(1); }
    const pw = tempPass();
    exec(null, () => { u.pass = pwHashSrv(pw); u.mustChange = true; u.fails = 0; u.lockedUntil = ''; S.getDB().sessions.forEach(s => { if (s.uid === u.id) s.active = false; }); S.audit('بازنشانی رمز از خط فرمان سرور', 'user', u.id, username); return {}; });
    console.log(`رمز موقت ${username}: ${pw}\nدر ورود بعدی، تعیین رمز جدید الزامی است.`);
    return;
  }
  if (cmd === 'backup') { console.log('نسخه پشتیبان: ' + createBackup('cli', 'خط فرمان')); return; }
  if (cmd === 'verify-audit') { const bad = S.verifyAudit(); console.log(bad < 0 ? `زنجیره ${S.getDB().audit.length} رویداد سالم است.` : `زنجیره از ردیف ${bad + 1} آسیب دیده است.`); process.exit(bad < 0 ? 0 : 2); }
  console.error('فرمان ناشناخته. فرمان‌ها: init [--demo] | create-user | reset-password | backup | verify-audit');
  process.exit(1);
}

/* ---------- اجرا ---------- */
const cmd = ARGS[0] && !ARGS[0].startsWith('--') ? ARGS[0] : null;
if (cmd) { cli(cmd); }
else {
  if (!loadState()) { initState(false); console.log('پایگاه داده خالی ساخته شد. با «node server.js create-user --pos P16-m ...» نخستین کاربر را تعریف کنید.'); }
  if (!S.getDB().users.some(u => u.active && !u.deleted)) console.log('هشدار: هیچ کاربر فعالی وجود ندارد. با فرمان create-user کاربر تعریف کنید.');
  const server = http.createServer((req, res) => {
    handle(req, res).catch(e => { if (!res.headersSent) send(res, e.code && e.code < 600 ? e.code : 500, { error: e.code ? e.message : 'خطای داخلی سرور.' }); if (!e.code) console.error(e); });
  });
  server.requestTimeout = 120000;
  server.listen(CFG.port, CFG.host, () => console.log(`کارتابل روی http://${CFG.host}:${CFG.port} در حال اجراست · داده‌ها: ${CFG.dataDir}`));
  autoBackup();
  setInterval(autoBackup, 3600000).unref();
  setInterval(enforceSessions, 30000).unref();
  setInterval(() => { exec(null, () => { S.sweepDeadlines(); return {}; }); }, 300000).unref();
  setInterval(() => smsTick().catch(e => console.error('sms', e)), 10000).unref();
  const stop = () => { server.close(); db.close(); process.exit(0); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
module.exports = { CFG };
