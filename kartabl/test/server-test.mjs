// آزمون امنیت و درستی سرور: هر بند از گزارش بازبینی به یک آزمون تبدیل شده است.
// اجرا: node test/server-test.mjs
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'server');
const DATA = mkdtempSync(join(tmpdir(), 'kartabl-test-'));
const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const NODE = [process.execPath, '--disable-warning=ExperimentalWarning'];
let pass = 0, failN = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log('  ✓ ' + name); } else { failN++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); } };
const section = t => console.log('\n' + t);

/* سرور ساختگی پیامک (کاوه‌نگار و درگاه اختصاصی) */
const smsLog = []; let webhookFail = false;
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', c => (b += c)); req.on('end', () => {
    smsLog.push({ url: req.url, body: b });
    if (req.url.includes('/sms/send.json')) { res.end(JSON.stringify({ return: { status: 200, message: 'تایید شد' }, entries: [{ messageid: 7000 + smsLog.length, status: 1 }] })); return; }
    if (req.url.includes('/sms/status.json')) { const ids = new URL(req.url, 'http://x').searchParams.get('messageid').split(','); res.end(JSON.stringify({ return: { status: 200 }, entries: ids.map(id => ({ messageid: +id, status: 10, statustext: 'رسیده به گیرنده' })) })); return; }
    if (req.url === '/hook') { res.statusCode = webhookFail ? 500 : 200; res.end('{}'); return; }
    res.statusCode = 404; res.end();
  });
});
await new Promise(r => mock.listen(PORT + 1, '127.0.0.1', r));

execFileSync(NODE[0], [NODE[1], join(ROOT, 'server.js'), 'init', '--demo'], { env: { ...process.env, DATA_DIR: DATA } });
const srv = spawn(NODE[0], [NODE[1], join(ROOT, 'server.js')], { env: { ...process.env, DATA_DIR: DATA, PORT: String(PORT), SMS_KAVENEGAR_BASE: `http://127.0.0.1:${PORT + 1}` }, stdio: ['ignore', 'pipe', 'pipe'] });
let srvErr = ''; srv.stderr.on('data', d => (srvErr += d));
await new Promise((res, rej) => { srv.stdout.on('data', d => { if (String(d).includes('در حال اجراست')) res(); }); setTimeout(() => rej(new Error('server did not start: ' + srvErr)), 15000); });

/* ابزار */
async function call(method, path, body, sess, extra = {}) {
  const headers = { 'X-Kartabl': '1', ...(sess ? { Cookie: sess.cookie, 'X-CSRF': sess.csrf } : {}), ...extra };
  if (body !== undefined && !(body instanceof Buffer)) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : body instanceof Buffer ? body : JSON.stringify(body) });
  const text = await r.text(); let json = {}; try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
  return { status: r.status, json, headers: r.headers, raw: text };
}
async function login(username, password = '1234') {
  const r = await fetch(BASE + '/api/login', { method: 'POST', headers: { 'X-Kartabl': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const json = await r.json();
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  return { status: r.status, json, cookie, csrf: json.csrf, state: json.state, me: json.me };
}
const cmd = (s, name, ...args) => call('POST', '/api/cmd', { name, args }, s);
const state = async s => (await call('GET', '/api/state', undefined, s)).json.state;

try {
  const it = await login('m16'), imam = await login('imam'), s3 = await login('s3'), o15 = await login('o15'), m14 = await login('m14'), k = await login('k1-1'), m3 = await login('m3');
  ok([it, imam, s3, o15, m14, k, m3].every(x => x.status === 200), 'ورود حساب‌های آزمایشی');

  section('۴ و ۵ — رمزها و داده‌های تحویلی به مرورگر');
  const dbf = new DatabaseSync(join(DATA, 'kartabl.db'));
  const users = JSON.parse(dbf.prepare("SELECT v FROM kv WHERE k='users'").get().v);
  ok(users.every(u => u.pass.startsWith('scrypt$')), 'همه رمزها روی سرور با scrypt و نمک جداگانه ذخیره شده‌اند');
  ok(new Set(users.map(u => u.pass)).size === users.length, 'هش رمزهای یکسان، به دلیل نمک جداگانه، متفاوت است');
  const sv = s3.state;
  ok(!JSON.stringify(sv).includes('scrypt$'), 'هیچ هش رمزی به مرورگر فرستاده نمی‌شود');
  ok(sv.users.every(u => u.id === s3.me || (u.username === undefined && u.phone === undefined)), 'منشی نام کاربری و تلفن دیگران را دریافت نمی‌کند');
  ok(sv.tx.length === 0 && o15.state.tx.length > 0, 'اسناد مالی فقط به امور مالی تحویل می‌شود', `s3=${sv.tx.length} o15=${o15.state.tx.length}`);
  ok(sv.tasks.every(t => t.unitId === 3), 'منشی فقط وظایف مدیریت خودش را دریافت می‌کند');
  ok(sv.sessions.every(x => x.uid === s3.me) && sv.logins.every(l => l.uid === s3.me), 'نشست‌ها و ورودهای دیگران تحویل نمی‌شود');
  ok(!JSON.stringify(it.state.sessions).includes('"th"') && !JSON.stringify(it.state.sessions).includes('"csrf"'), 'توکن نشست حتی به مدیر سامانه تحویل نمی‌شود');
  ok(sv.contracts.length === 0 && sv.decrees.every(d => d.uid === s3.me), 'قراردادها و احکام دیگران به منشی تحویل نمی‌شود');
  const kr = k.state.reservations;
  ok(kr.length > 0 && kr.every(r => r.applicant === undefined && r.phone === undefined), 'مشخصات متقاضی و تلفن رزروها به کارشناسی که متولی یا ثبت‌کننده نیست تحویل نمی‌شود');
  ok(s3.state.reservations.some(r => r.applicant !== undefined), 'ثبت‌کننده رزرو مشخصات رزرو خودش را می‌بیند');
  ok(!JSON.stringify(it.state.settings).includes('"apiKey":"x') , 'کلید پیامک به مرورگر فرستاده نمی‌شود');
  const pub = (await call('GET', '/api/state')).json;
  ok(pub.public && pub.public.users.length === 0 && !pub.state, 'پیش از ورود هیچ داده‌ای جز تنظیمات عمومی تحویل نمی‌شود');

  section('۲ — جلوگیری از ارتقای دسترسی');
  let r = await cmd(m14, 'assignHolder', 'P0', m14.me);
  ok(r.status === 400 && /خودتان|حساس/.test(r.json.error), 'مدیر امور اداری نمی‌تواند خودش را امام جماعت کند', r.json.error);
  r = await cmd(m14, 'assignHolder', 'P0', s3.me);
  ok(r.status === 400 && /حساس/.test(r.json.error), 'مدیر امور اداری نمی‌تواند دیگری را به جایگاه امام منصوب کند', r.json.error);
  r = await cmd(it, 'assignHolder', 'P16-m', k.me);
  ok(r.status === 400, 'مدیر فناوری نمی‌تواند متصدی جایگاه خودش را عوض کند', r.json.error);
  r = await cmd(it, 'setPosPerm', 'P16-m', 'admin.data', 'deny');
  ok(r.status === 400 && /خودتان/.test(r.json.error), 'تغییر دسترسی جایگاه خود مجاز نیست', r.json.error);
  r = await cmd(it, 'setPosPerm', 'P14-s', 'view.all', 'allow');
  ok(r.status === 400 && /حساس/.test(r.json.error), 'اعطای مجوز حساس فقط با امام جماعت', r.json.error);
  r = await cmd(it, 'setRolePerm', 'manager', 'finance.view', 'allow');
  ok(r.status === 400, 'اعطای مجوز حساس به یک نقش فقط با امام جماعت', r.json.error);
  r = await cmd(it, 'setPassword', imam.me, 'abcdef1234', false);
  ok(r.status === 400 && /حساس/.test(r.json.error), 'مدیر فناوری نمی‌تواند رمز امام جماعت را تغییر دهد', r.json.error);
  r = await cmd(it, 'setPosPerm', 'P14-s', 'reports.view', 'allow');
  ok(r.status === 200, 'اعطای مجوز غیرحساس به دیگران توسط مدیر فناوری ممکن است');
  r = await cmd(imam, 'setPosPerm', 'P14-s', 'finance.view', 'allow');
  ok(r.status === 200, 'امام جماعت می‌تواند مجوز حساس اعطا کند');
  r = await cmd(it, 'dataSave', 'users', it.me, { id: it.me });
  ok(r.status === 400 && /محافظت/.test(r.json.error), 'ویرایش مستقیم کاربران و جایگاه‌ها ممکن نیست', r.json.error);

  section('۳ — بررسی مجوز در سرور برای تک‌تک عملیات');
  for (const [name, args] of [['saveSettings', ['maintenance', { on: true }]], ['toggleUser', [k.me]], ['setPassword', [k.me, 'abcdef123', false]], ['dataDelete', ['letters', 'x']], ['overrideDecision', ['X', true, '']], ['kickAll', []], ['saveUnit', [0, { name: 'x', short: 'x', services: 'x' }]], ['setBudget', [3, 1]], ['addTx', [{ kind: 'درآمد', amount: 5 }]], ['createOrder', [{ title: 't', units: ['3'] }]]]) {
    r = await cmd(s3, name, ...args);
    ok(r.status === 400 && r.json.error, `منشی نمی‌تواند «${name}» را اجرا کند`, JSON.stringify(r.json.error));
  }
  r = await call('POST', '/api/backups', {}, s3);
  ok(r.status === 403, 'منشی نمی‌تواند نسخه پشتیبان بگیرد');
  r = await cmd(s3, 'createLetter', { type: 'in', subject: 'نامه', unitId: 15, sender: 'x', receiver: 'y', date: '2026-10-30' });
  const ls = (await state(o15)).letters.find(l => l.subject === 'نامه' && l.unitId === 15);
  ok(!ls, 'منشی نمی‌تواند به نام مدیریت دیگری نامه ثبت کند');

  section('امنیت درخواست‌ها');
  let raw = await fetch(BASE + '/api/cmd', { method: 'POST', headers: { Cookie: s3.cookie, 'Content-Type': 'application/json' }, body: '{"name":"readAllNotifs","args":[]}' });
  ok(raw.status === 403, 'درخواست بدون سرآیند ویژه سامانه رد می‌شود');
  r = await call('POST', '/api/cmd', { name: 'readAllNotifs', args: [] }, { cookie: s3.cookie, csrf: 'wrong' });
  ok(r.status === 403, 'درخواست با نشانه امنیتی نادرست رد می‌شود');
  r = await call('POST', '/api/cmd', { name: 'readAllNotifs', args: [] }, s3, { Origin: 'https://evil.example' });
  ok(r.status === 403, 'درخواست از مبدأ دیگر رد می‌شود');
  const hd = (await fetch(BASE + '/')).headers;
  ok(/script-src 'self'/.test(hd.get('content-security-policy') || '') && hd.get('x-frame-options') === 'DENY', 'سیاست امنیت محتوا و منع قاب فعال است');

  section('۸ و ۹ — اعتبارسنجی و تداخل رزرو');
  const day = '2027-01-10';
  const resv = v => cmd(s3, 'createReservation', { program: 'general', space: 'meeting', kind: 'آزمون', applicant: 'الف', phone: '09120000000', date: day, start: '10:00', end: '11:00', people: 5, ...v });
  for (const [v, why] of [[{ people: -5 }, 'منفی'], [{ people: 2.5 }, 'اعشاری'], [{ people: 0 }, 'صفر'], [{ people: 25 }, 'بیش از ظرفیت ۲۴'], [{ end: '09:00' }, 'پایان پیش از شروع']]) {
    r = await resv(v); ok(r.status === 400, `رزرو با تعداد/زمان نامعتبر (${why}) رد می‌شود`, r.json.error);
  }
  const resA = await cmd(m3, 'createReservation', { program: 'religious', space: 'hosseinieh', kind: 'مراسم مذهبی آزمون', applicant: 'الف', phone: '09120000000', date: day, start: '18:00', end: '20:00', people: 100 });
  const resB = await cmd(m3, 'createReservation', { program: 'fateheh', space: 'hosseinieh', kind: 'فاتحه آزمون', applicant: 'ب', phone: '09120000000', date: day, start: '19:00', end: '21:00', people: 100 });
  const m2 = await login('m2');
  r = await cmd(m2, 'resDecide', resA.json.result.id, 'تأییدشده', '');
  ok(r.status === 200, 'تأیید مراسم مذهبی در حسینیه');
  r = await cmd(m2, 'resDecide', resB.json.result.id, 'تأییدشده', '');
  ok(r.status === 400 && /تداخل/.test(r.json.error), 'فاتحه هم‌زمان در همان حسینیه به دلیل تداخل تأیید نمی‌شود', r.json.error);
  r = await cmd(m3, 'editRecord', 'res', resB.json.result.id, { kind: 'x', date: day, start: '19:00', end: '21:00', people: 900 });
  ok(r.status === 400 && /ظرفیت/.test(r.json.error), 'ویرایش رزرو به بیش از ظرفیت رد می‌شود', r.json.error);

  section('۱۰ — اعتبارسنجی مشترک ثبت و ویرایش جلسه');
  const mt = await cmd(s3, 'createMeeting', { title: 'جلسه آزمون', date: day, start: '10:00', end: '11:00', invitees: ['P3-m'] });
  r = await cmd(s3, 'editRecord', 'meet', mt.json.result.id, { title: 'جلسه آزمون', date: day, start: '12:00', end: '11:00', place: '', agenda: '' });
  ok(r.status === 400 && /پایان/.test(r.json.error), 'ویرایش جلسه با پایان پیش از شروع رد می‌شود', r.json.error);

  section('۱۱ — نسخه‌گذاری، تعارض و تراکنش');
  const o3 = await login('o3');
  const tk = await cmd(m3, 'createTask', { unitId: 3, title: 'وظیفه تعارض', assignee: 'P3-s', start: day, due: day, priority: 'عادی' });
  const tid = tk.json.result.id;
  const v0 = (await state(o3)).tasks.find(t => t.id === tid)._v;
  await cmd(m3, 'editRecord', 'task', tid, { title: 'ویرایش مدیر', desc: '', priority: 'فوری', due: day });
  r = await call('POST', '/api/cmd', { name: 'editRecord', args: ['task', tid, { title: 'ویرایش مسئول دفتر', desc: '', priority: 'عادی', due: day }], ver: { col: 'tasks', id: tid, v: v0 } }, o3);
  ok(r.status === 409 && r.json.conflict, 'ویرایش هم‌زمان: تغییر نفر دوم با نسخه قدیمی رد می‌شود و بازنویسی رخ نمی‌دهد', r.status);
  ok((await state(m3)).tasks.find(t => t.id === tid).title === 'ویرایش مدیر', 'تغییر نفر اول حفظ شده است');
  const nUsers = (await state(it)).users.length;
  r = await cmd(it, 'createUser', { name: 'کاربر ناتمام', username: 'half.user', pass: 'abcdef1234', posId: 'P0' });
  ok(r.status === 400 && (await state(it)).users.length === nUsers, 'عملیات ناموفق هیچ تغییر ناقصی باقی نمی‌گذارد (کاربر نیمه‌ساخته ثبت نمی‌شود)', r.json.error);
  const pay = (await state(o15)).payreqs.find(p => p.status === 'جاری' && !p.needImam && p.stage === 2);
  const m15 = await login('m15');
  const txBefore = (await state(m15)).tx.length;
  r = await cmd(m15, 'payAct', pay.id, true, '', 'سند-آزمون');
  const after = await state(m15);
  ok(r.status === 200 && after.tx.length === txBefore + 1 && after.payreqs.find(p => p.id === pay.id).status === 'پرداخت‌شده', 'پرداخت و ثبت سند هزینه در یک تراکنش ثبت می‌شوند');

  section('۷ — پیوست‌ها');
  const up = await call('PUT', '/api/files?name=' + encodeURIComponent('صورت‌جلسه.pdf'), Buffer.from('%PDF-1.4 test'), s3, { 'Content-Type': 'application/pdf' });
  ok(up.status === 200 && up.json.id, 'بارگذاری فایل روی سرور');
  const fileRef = { id: up.json.id, name: up.json.name, size: up.json.size, type: up.json.type, url: '/api/files/' + up.json.id };
  r = await call('GET', '/api/files/' + up.json.id, undefined, k);
  ok(r.status === 403, 'فایل گره‌نخورده فقط برای بارگذاری‌کننده قابل دریافت است');
  const lt = await cmd(s3, 'createLetter', { type: 'internal', subject: 'نامه با پیوست', toUnit: 4, unitId: 3, sender: 'روابط عمومی', receiver: 'رسانه', date: day, files: [fileRef] });
  r = await call('GET', '/api/files/' + up.json.id, undefined, s3);
  ok(r.status === 200 && r.raw.startsWith('%PDF') && /inline/.test(r.headers.get('content-disposition')), 'ثبت‌کننده نامه پیوست را باز می‌کند');
  r = await call('GET', '/api/files/' + up.json.id, undefined, await login('o4'));
  ok(r.status === 200, 'گیرنده ارجاع (رسانه) پیوست را باز می‌کند');
  r = await call('GET', '/api/files/' + up.json.id, undefined, k);
  ok(r.status === 403, 'کاربری که نامه را نمی‌بیند پیوست را هم دریافت نمی‌کند');
  r = await call('PUT', '/api/files?name=x.exe', Buffer.from('MZ'), s3);
  ok(r.status === 415 && r.json.error, 'نوع فایل خطرناک با پیام صریح رد می‌شود', r.json.error);
  r = await call('PUT', '/api/files?name=big.pdf', Buffer.alloc(21 * 1024 * 1024), s3);
  ok(r.status === 413 && /۲۰/.test(r.json.error), 'فایل بزرگ‌تر از ۲۰ مگابایت با پیام صریح رد می‌شود', r.json.error);

  section('۶ — پیامک واقعی و وضعیت‌های تحویل');
  r = await cmd(it, 'saveSettings', 'sms', { enabled: true, provider: 'kavenegar', apiKey: 'test-key-1234', sender: '1000', events: ['request', 'letter', 'decision'], roles: ['imam', 'manager', 'office'] });
  ok(r.status === 200 && !JSON.stringify(r.json.state.settings).includes('test-key-1234') && r.json.state.settings.sms.apiKeySet, 'کلید پیامک ذخیره می‌شود ولی به مرورگر برنمی‌گردد');
  r = await call('POST', '/api/sms/test', { to: '09121112233' }, it);
  ok(r.status === 200 && ['ارسال‌شده', 'تحویل‌شده'].includes(r.json.status), 'پیامک آزمایشی واقعاً به درگاه فرستاده می‌شود', JSON.stringify(r.json.status) + ' ' + (r.json.error || ''));
  ok(smsLog.some(x => x.url.includes('/test-key-1234/sms/send.json') && x.body.includes('receptor=09121112233')), 'درخواست ارسال با کلید و گیرنده درست به کاوه‌نگار رسیده است');
  await cmd(s3, 'createRequest', { title: 'درخواست با پیامک', toUnit: 4, cat: 'عکاسی', desc: '', priority: 'عادی' });
  await new Promise(res => setTimeout(res, 11500));
  let smsState = (await state(it)).sms;
  ok(smsState.some(m => m.status === 'ارسال‌شده' || m.status === 'تحویل‌شده'), 'پیامک رویداد «درخواست جدید» از صف خارج و ارسال شده است', smsState.slice(-3).map(m => m.status).join(','));
  ok(smsState.every(m => !/درخواست با پیامک/.test(m.text)), 'متن پیامک جزئیات (عنوان درخواست) را ندارد');
  await new Promise(res => setTimeout(res, 10500));
  smsState = (await state(it)).sms;
  ok(smsState.some(m => m.status === 'تحویل‌شده'), 'وضعیت «تحویل‌شده» از کاوه‌نگار پیگیری و ثبت می‌شود');
  webhookFail = true;
  await cmd(it, 'saveSettings', 'sms', { enabled: true, provider: 'webhook', webhook: `http://127.0.0.1:${PORT + 1}/hook`, sender: '', events: ['request'], roles: ['manager', 'office'] });
  r = await call('POST', '/api/sms/test', { to: '09121112233' }, it);
  ok(r.json.status === 'در صف ارسال' && /۵۰۰|500/.test(r.json.error), 'خطای درگاه ثبت می‌شود و پیامک برای تلاش دوباره در صف می‌ماند', r.json.status + ' ' + r.json.error);
  await cmd(it, 'saveSettings', 'sms', { enabled: false, provider: 'none', events: [], roles: [] });

  section('۱۲ — پشتیبان‌گیری و بازیابی');
  r = await call('POST', '/api/backups', {}, it);
  ok(r.status === 200 && r.json.name, 'تهیه نسخه پشتیبان روی سرور');
  const bk = await call('GET', '/api/backups/' + r.json.name, undefined, it);
  const good = JSON.parse(bk.raw);
  r = await call('POST', '/api/backups/restore', { data: { ver: 1, users: 'x' } }, it);
  ok(r.status === 400 && /پذیرفته نشد/.test(r.json.error), 'فایل ناقص پذیرفته نمی‌شود و داده جاری دست‌نخورده می‌ماند', r.json.error);
  const esc1 = JSON.parse(bk.raw); esc1.positions.find(p => p.id === 'P16-m').perms = { 'admin.passwords': 'allow', 'orders.issue': 'allow' };
  r = await call('POST', '/api/backups/restore', { data: esc1 }, it);
  ok(r.status === 400 && /دسترسی بیشتری/.test(r.json.error), 'نسخه پشتیبانی که دسترسی بازیابی‌کننده را افزایش دهد رد می‌شود', r.json.error);
  const tam = JSON.parse(bk.raw); tam.audit[3].note = 'دست‌کاری';
  r = await call('POST', '/api/backups/restore', { data: tam }, it);
  ok(r.status === 400 && /زنجیره/.test(r.json.error), 'نسخه پشتیبان با رویدادهای دست‌کاری‌شده رد می‌شود', r.json.error);
  const lettersBefore = (await state(it)).letters.length;
  good.letters = good.letters.slice(0, 2);
  r = await call('POST', '/api/backups/restore', { data: good }, it);
  ok(r.status === 200 && r.json.pre && readdirSync(join(DATA, 'backups')).includes(r.json.pre), 'بازیابی معتبر انجام و پیش از آن نسخه خودکار گرفته شد');
  ok((await state(it)).letters.length < lettersBefore, 'داده‌ها به نسخه پشتیبان برگشت');

  section('۱۳ — رویدادهای سیستمی');
  let blocked = false; try { dbf.exec("UPDATE audit SET json='x' WHERE seq=1"); } catch (e) { blocked = true; }
  ok(blocked, 'ویرایش رویداد حتی مستقیم در پایگاه داده مسدود است');
  blocked = false; try { dbf.exec('DELETE FROM audit WHERE seq=1'); } catch (e) { blocked = true; }
  ok(blocked, 'حذف رویداد حتی مستقیم در پایگاه داده مسدود است');
  r = await cmd(it, 'dataDelete', 'audit', '0');
  ok(r.status === 400, 'رویدادها از ویرایشگر داده‌ها قابل حذف نیستند');
  const va = execFileSync(NODE[0], [NODE[1], join(ROOT, 'server.js'), 'verify-audit'], { env: { ...process.env, DATA_DIR: DATA } }).toString();
  ok(/سالم/.test(va), 'زنجیره رویدادها پس از همه آزمون‌ها سالم است', va.trim());

  section('نشست‌ها، قفل حساب و حالت به‌روزرسانی');
  r = await cmd(it, 'kickUser', k.me);
  r = await call('GET', '/api/state', undefined, k);
  ok(!r.json.state, 'کاربری که مدیر از سامانه خارج کرد دیگر داده دریافت نمی‌کند');
  for (let i = 0; i < 5; i++) await login('s9', 'wrong');
  r = await login('s9');
  ok(r.status === 401 && /قفل/.test(r.json.error), 'پس از ۵ تلاش ناموفق، حساب حتی با رمز درست قفل است', r.json.error);
  await cmd(it, 'saveSettings', 'maintenance', { on: true });
  r = await call('GET', '/api/state', undefined, s3);
  ok(!r.json.state, 'با فعال‌شدن حالت به‌روزرسانی، کاربران عادی خارج می‌شوند');
  ok((await state(it)) && true, 'مدیر سامانه در حالت به‌روزرسانی وارد می‌ماند');
  await cmd(it, 'saveSettings', 'maintenance', { on: false });

  section('۲۰ — نسخه عملیاتی بدون داده نمونه');
  const D2 = mkdtempSync(join(tmpdir(), 'kartabl-prod-'));
  execFileSync(NODE[0], [NODE[1], join(ROOT, 'server.js'), 'init'], { env: { ...process.env, DATA_DIR: D2 } });
  const pdb = new DatabaseSync(join(D2, 'kartabl.db'));
  const get = k2 => JSON.parse(pdb.prepare('SELECT v FROM kv WHERE k=?').get(k2).v);
  ok(get('users').length === 0 && get('letters').length === 0 && get('payreqs').length === 0 && get('positions').length === 52, 'پایگاه عملیاتی: ۵۲ جایگاه، بدون کاربر و بدون داده نمونه');
  ok(get('settings').clock.city === 'آبادان', 'شهر پیش‌فرض اوقات شرعی آبادان است');
  const cu = execFileSync(NODE[0], [NODE[1], join(ROOT, 'server.js'), 'create-user', '--pos', 'P0', '--username', 'imam', '--name', 'امام جماعت'], { env: { ...process.env, DATA_DIR: D2 } }).toString();
  ok(/رمز موقت/.test(cu) && get('users')[0].mustChange === true && get('users')[0].pass.startsWith('scrypt$'), 'نخستین کاربر با رمز موقت اختصاصی و الزام تغییر رمز ساخته می‌شود');
} catch (e) { failN++; console.error('خطای آزمون:', e); }
finally {
  srv.kill(); mock.close();
  if (srvErr.trim()) console.log('\nخروجی خطای سرور:\n' + srvErr.slice(0, 2000));
  console.log(`\n${pass} آزمون موفق، ${failN} ناموفق`);
  process.exit(failN ? 1 : 0);
}
