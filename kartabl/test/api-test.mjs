// آزمون‌های سرور PHP: node test/api-test.mjs http://127.0.0.1:8090/
// پیش از اجرا: php php/cli.php demo <پوشه>  و  php -S 127.0.0.1:8090 -t php
const BASE = process.argv[2] || 'http://127.0.0.1:8090/';
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); console.log('  ✗ ' + m); } };
class U {
  constructor(n) { this.n = n; this.cookie = ''; this.csrf = ''; this.state = null; }
  async req(method, r, body, q = '') {
    const h = { 'X-Kartabl': '1', 'X-CSRF': this.csrf, Cookie: this.cookie };
    if (body !== undefined && !(body instanceof Uint8Array)) h['Content-Type'] = 'application/json';
    const res = await fetch(BASE + 'api.php?r=' + r + q, { method, headers: h, body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body) });
    const sc = res.headers.get('set-cookie'); if (sc) { const m = sc.match(/kt=([^;]*)/); if (m) this.cookie = m[1] ? 'kt=' + m[1] : ''; }
    let j = {}; try { j = await res.json(); } catch (e) {}
    j._status = res.status;
    if (j.state) { this.state = j.state; this.csrf = j.csrf || this.csrf; }
    return j;
  }
  async login(p = '1234') { const r = await this.req('POST', 'login', { username: this.n, password: p }); return r; }
  async cmd(name, ...args) { return this.req('POST', 'cmd', { name, args, idem: Math.random().toString(36).slice(2, 12) }); }
  async cmdIdem(idem, name, ...args) { return this.req('POST', 'cmd', { name, args, idem }); }
  get S() { return this.state; }
}
const T = new Date(); const iso = d => d.toISOString().slice(0, 10); const today = iso(new Date(Date.now() + 3.5 * 3600e3));
const add = n => iso(new Date(Date.now() + 3.5 * 3600e3 + n * 864e5));
const pos = (u, id) => u.S.positions.find(p => p.id === id);

console.log('ورود، خروج و نشست');
const it = new U('it.manager'); let r = await it.login();
ok(r.state && r.csrf, 'ورود مدیر فناوری');
r = await it.req('POST', 'logout', {}); ok(r.ok, 'خروج');
r = await it.login(); ok(r.state, 'ورود دوباره بلافاصله پس از خروج بدون تازه‌سازی (شناسه امنیتی تازه)');
const bad = new U('it.manager'); r = await bad.login('wrong'); ok(r.error && /درست نیست/.test(r.error), 'رمز نادرست رد شد');
for (let i = 0; i < 14; i++) { const x = new U('pr.office'); r = await x.login(); if (!r.state) break; }
ok(r.state, '۱۴ ورود موفق پشت‌سرهم از یک نشانی شبکه مسدود نشد (ورود موفق شمرده نمی‌شود)');
const victim = new U('media.office'); await victim.login();
r = await it.cmd('setPassword', victim.S.users.find(u => u.id === victim.S.me).id, 'newpass99');
ok(!r.error && r.result.ended >= 1, 'تعیین رمز توسط فناوری اطلاعات و بسته‌شدن نشست‌های آن حساب');
r = await victim.req('GET', 'ver'); ok(r.auth === false, 'نشست قطع‌شده: پاسخ «خروج» (نه خطای ارتباط)');
r = await victim.cmd('readAllNotifs'); ok(r._status === 401 && r.ended, 'اقدام با نشست قطع‌شده ← ۴۰۱ و پایان نشست');
r = await victim.req('POST', 'logout', {}); ok(r.ok, 'خروج حتی با نشست نامعتبر موفق است');
r = await victim.login('newpass99'); ok(r.state, 'ورود با رمز جدید');
r = await victim.cmd('changeOwnPassword', '1234', 'x'); ok(r.error, 'کاربر نمی‌تواند رمز خودش را تغییر دهد (فقط فناوری اطلاعات)');
r = await it.cmd('setUsername', victim.S.me, 'media.daftar'); ok(!r.error, 'تغییر نام کاربری توسط فناوری اطلاعات');
const v2 = new U('media.daftar'); r = await v2.login('newpass99'); ok(r.state, 'ورود با نام کاربری جدید');
r = await v2.cmd('setUsername', v2.S.me, 'hack'); ok(r.error, 'متصدی عادی نمی‌تواند نام کاربری را تغییر دهد');
r = await v2.cmd('updateOwnHolder', { first: 'زهرا', last: 'کریمی', phone: '09161112233' }); ok(!r.error && r.result.named, 'متصدی نام خود را ثبت می‌کند');
r = await it.req('POST', 'cmd', { name: 'readAllNotifs', args: [] }); // بدون نشانه امنیتی
const noCsrf = new U('x'); noCsrf.cookie = it.cookie; r = await noCsrf.req('POST', 'cmd', { name: 'readAllNotifs', args: [] }); ok(r._status === 403, 'درخواست بدون نشانه امنیتی رد شد');

console.log('دبیرخانه: پیش‌نویس، ارجاع، دیده‌شدن، بایگانی شخصی، مختومه');
const cs = new U('culture.secretary'); await cs.login();
r = await cs.cmd('saveDraft', '', { type: 'internal', toUnit: '4', subject: 'پیش‌نویس آزمون', body: '<p>متن <script>alert(1)</script><img src=x onerror=alert(1)><b onclick="x()">درشت</b></p>', due: add(5) });
ok(!r.error && r.result.id, 'ذخیره پیش‌نویس');
const did = r.result.id;
let dr = cs.S.drafts.find(d => d.id === did); ok(dr && dr.data.due === add(5), 'مهلت اقدام در پیش‌نویس ذخیره شد');
ok(dr && !/script|onerror|onclick|<img/i.test(dr.data.body) && /<b>درشت<\/b>/.test(dr.data.body), 'پاک‌سازی HTML نامه (اسکریپت و رویداد حذف، قالب ماند)');
r = await cs.cmd('sendLetter', { ...dr.data, draftId: did });
ok(!r.error && r.result.no, 'ارسال نامه از پیش‌نویس');
ok(!cs.S.drafts.some(d => d.id === did), 'پیش‌نویس پس از ارسال حذف شد');
const L = r.result;
ok(L.snap && L.snap.byName && L.snap.unitName === 'مدیریت امور فرهنگی و هنری', 'مشخصات سربرگ هنگام ارسال ثبت شد');
const mo = new U('media.manager'); await mo.login();
let ml = mo.S.letters.find(x => x.id === L.id); ok(ml, 'گیرنده نامه را می‌بیند');
ok(mo.S.notifs.some(n => n.open && n.open.id === L.id), 'اعلان گیرنده با پیوند مستقیم به نامه');
r = await mo.cmd('markSeen', L.id); ok(!r.error, 'دیده‌شدن');
ok(mo.S.lstate.some(s => s.l === L.id && s.seen), 'وضعیت دیده‌شده شخصی');
r = await cs.cmd('replyLetter', L.id, '<p>پاسخ تازه</p>');
mo.state = (await mo.req('GET', 'state')).state;
const st = mo.S.lstate.find(s => s.l === L.id); ml = mo.S.letters.find(x => x.id === L.id);
ok(ml.updated > st.seen, 'با پاسخ تازه، نامه دوباره «دیده‌نشده» می‌شود');
r = await mo.cmd('referLetter', L.id, 18, 'برای اقدام', add(2)); ok(!r.error, 'ارجاع مجدد');
const cer = new U('ceremony.secretary'); await cer.login();
ok(cer.S.notifs.some(n => n.open && n.open.id === L.id), 'گیرنده جدید ارجاع اعلان اختصاصی گرفت');
r = await mo.cmd('archiveMine', L.id, true); ok(!r.error, 'بایگانی شخصی');
const lm = mo.S.letters.find(x => x.id === L.id); ok(lm.status !== 'مختومه' && lm.status !== 'بایگانی', 'بایگانی شخصی وضعیت مشترک نامه را تغییر نداد');
const meo = new U('ceremony.office'); await meo.login();
r = await meo.cmd('closeLetter', L.id); ok(r.error, 'مسئول دفتر بدون مجوز «مختومه» نمی‌تواند پرونده را ببندد');
const cm = new U('ceremony.manager'); await cm.login();
r = await cm.cmd('setOfficePerm', 'P18-o', 'letters.close', 'allow'); ok(!r.error, 'مدیر مجوز مختومه را به مسئول دفتر داد');
r = await meo.cmd('closeLetter', L.id, 'انجام شد'); ok(!r.error && r.result.status === 'مختومه', 'مسئول دفتر با مجوز واگذارشده مختومه کرد');
r = await cm.cmd('setOfficePerm', 'P18-o', 'letters.refer', 'deny'); r = await meo.cmd('referLetter', L.id, 4, 'x'); ok(r.error, 'پس از سلب مجوز ارجاع، مسئول دفتر نمی‌تواند ارجاع کند');
r = await cm.cmd('setOfficePerm', 'P18-o', 'letters.refer', ''); r = await meo.cmd('reopenLetter', L.id, 'نیاز به اقدام'); ok(!r.error, 'بازگشایی با علت');
r = await meo.cmd('referLetter', L.id, 4, 'هماهنگی'); ok(!r.error, 'مسئول دفتر با مجوز ارجاع (بدون نیاز به مدیر بودن) ارجاع کرد');

console.log('واگذاری اختیار و سقف مدیر');
const imam = new U('imam'); await imam.login();
r = await imam.cmd('setPosPerm', 'P2-m', 'reservations.create', 'deny'); ok(!r.error, 'امام سقف مدیر فرهنگی را محدود کرد');
const cmg = new U('culture.manager'); await cmg.login();
r = await cmg.cmd('setOfficePerm', 'P2-s', 'reservations.create', 'allow'); ok(r.error, 'مدیر نمی‌تواند بیش از سقف خودش اختیار بدهد');
cs.state = (await cs.req('GET', 'state')).state;
r = await cs.cmd('createReservation', { program: 'general', space: 'amphi', kind: 'آزمون', applicant: 'x', phone: '09161234567', date: add(3), start: '10:00', end: '11:00', people: 10 });
ok(r.error, 'با محدودشدن سقف مدیر، منشی هم مجوز رزرو ندارد (کنترل سروری)');
r = await imam.cmd('setPosPerm', 'P2-m', 'reservations.create', '');
r = await cmg.cmd('setOfficePerm', 'P2-s', 'reservations.create', 'deny'); ok(!r.error, 'مدیر مجوز رزرو منشی را گرفت');
r = await cs.cmd('createReservation', { program: 'general', space: 'amphi', kind: 'آزمون', applicant: 'x', phone: '09161234567', date: add(3), start: '10:00', end: '11:00', people: 10 });
ok(r.error, 'منشی بدون مجوز رزرو نمی‌تواند رزرو ثبت کند');
r = await cmg.cmd('setOfficePerm', 'P2-s', 'reservations.create', '');
r = await cmg.cmd('setOfficePerm', 'P2-s', 'tasks.create', 'allow'); ok(!r.error, 'مدیر به منشی اجازه تعریف وظیفه داد');
cs.state = (await cs.req('GET', 'state')).state;
r = await cs.cmd('createTask', { unitId: 2, title: 'وظیفه از منشی', assignee: 'P2-s', due: add(2) }); ok(!r.error, 'منشی با اختیار واگذارشده وظیفه تعریف کرد');
r = await cmg.cmd('setOfficePerm', 'P2-s', 'tasks.view', 'deny'); cs.state = (await cs.req('GET', 'state')).state;
const pS = pos(cs, 'P2-s'); ok(pS.eff && !pS.eff['tasks.create'], 'با گرفتن مجوز پایه، زیرمجوز وابسته هم غیرفعال شد');
r = await cmg.cmd('setOfficePerm', 'P2-s', 'tasks.view', '');
r = await cmg.cmd('setOfficePerm', 'P15-o', 'finance.view', 'allow'); ok(r.error, 'مدیر نمی‌تواند دسترسی دفتر مدیریت دیگر را تغییر دهد');

console.log('وظایف: قفل پس از تأیید');
const t = (await cmg.cmd('createTask', { unitId: 2, title: 'وظیفه قفل', assignee: 'P2-s', due: add(3) })).result;
cs.state = (await cs.req('GET', 'state')).state;
await cs.cmd('taskAct', t.id, 'start'); await cs.cmd('taskAct', t.id, 'submit');
r = await cmg.cmd('taskAct', t.id, 'approve', 'خوب'); ok(r.result && r.result.status === 'تکمیل‌شده', 'تأیید مدیر');
r = await cs.cmd('editRecord', 'task', t.id, { title: 'تغییر', start: today, due: add(3), priority: 'عادی' }); ok(r.error, 'منشی نمی‌تواند وظیفه تأییدشده را ویرایش کند');
r = await cs.cmd('taskAct', t.id, 'start'); ok(r.error, 'منشی نمی‌تواند وظیفه تأییدشده را دوباره باز کند');
r = await cmg.cmd('taskAct', t.id, 'reopen', ''); ok(r.error, 'بازگشایی بدون علت رد شد');
r = await cmg.cmd('taskAct', t.id, 'reopen', 'نیاز به اصلاح'); ok(!r.error && r.result.status === 'در حال انجام', 'بازگشایی با علت توسط مدیر');
r = await cmg.cmd('editRecord', 'task', t.id, { title: 'عنوان تازه', desc: '', start: today, due: add(4), priority: 'فوری', _note: 'اصلاح' });
const hh = r.result.history.slice(-1)[0]; ok(hh.diff && hh.diff.some(d => d.f === 'title' && d.a === 'وظیفه قفل' && d.b === 'عنوان تازه'), 'سابقه ویرایش مقدار قبل و بعد را دارد');

console.log('مالی و حسابداری');
const fo = new U('finance.office'), fm = new U('finance.manager'); await fo.login(); await fm.login();
r = await fo.cmd('voucherSave', '', { date: 'not-a-date', desc: 'x', lines: [{ acc: '1101', dr: 10, cr: 0 }, { acc: '4901', dr: 0, cr: 10 }] }); ok(r.error, 'تاریخ نامعتبر سند رد شد');
r = await fo.cmd('voucherSave', '', { date: '2026-02-30', desc: 'x', lines: [{ acc: '1101', dr: 10, cr: 0 }, { acc: '4901', dr: 0, cr: 10 }] }); ok(r.error, 'تاریخ ناموجود (۳۰ فوریه) رد شد');
r = await fo.cmd('voucherSave', '', { date: today, desc: 'ناتراز', lines: [{ acc: '1101', dr: 10, cr: 0 }, { acc: '4901', dr: 0, cr: 9 }] }); ok(r.error && /تراز/.test(r.error), 'سند ناتراز رد شد');
r = await fo.cmd('voucherSave', '', { date: today, desc: 'حساب کل', lines: [{ acc: '11', dr: 10, cr: 0 }, { acc: '4901', dr: 0, cr: 10 }] }); ok(r.error, 'ثبت روی حساب کل رد شد');
const idem = 'dupkey' + Date.now();
const V = { date: today, desc: 'دریافت آزمون', ref: 'REF-77', lines: [{ acc: '1101', dr: 5000000, cr: 0 }, { acc: '4101', dr: 0, cr: 5000000 }] };
const a1 = await fo.cmdIdem(idem, 'voucherSave', '', V); const a2 = await fo.cmdIdem(idem, 'voucherSave', '', V);
ok(!a1.error && a2.repeat && a1.result.id === a2.result.id, 'ارسال تکراری با همان شناسه، فقط یک سند ثبت کرد');
r = await fo.cmd('voucherSave', '', V); ok(r.error && /مرجع/.test(r.error), 'شماره مرجع تکراری در همان دوره رد شد');
r = await fo.cmd('voucherPost', a1.result.id); ok(r.error, 'مسئول دفتر بدون مجوز قطعی‌کردن نمی‌تواند سند را قطعی کند');
r = await fm.cmd('voucherPost', a1.result.id); ok(!r.error && r.result.status === 'قطعی', 'مدیر مالی سند را قطعی کرد');
r = await fo.cmd('voucherSave', a1.result.id, V); ok(r.error, 'سند قطعی قابل ویرایش نیست');
r = await fm.cmd('voucherReverse', a1.result.id, ''); ok(r.error, 'برگشت بدون علت رد شد');
r = await fm.cmd('voucherReverse', a1.result.id, 'اشتباه در حساب'); ok(!r.error && r.result.reverseOf === a1.result.id, 'سند برگشت ثبت شد');
fm.state = (await fm.req('GET', 'state')).state;
const orig = fm.S.vouchers.find(v => v.id === a1.result.id); ok(orig.status === 'برگشت‌خورده' && orig.reverseNo, 'سند اصلی «برگشت‌خورده» با شماره سند برگشت');
r = await fm.cmd('periodClose', fm.S.periods[0].id, true); ok(r.error && /پیش‌نویس/.test(r.error), 'بستن دوره با سند پیش‌نویس ممکن نیست');
const inv = (await fo.cmd('invoiceSave', '', { kind: 'فروش', party: 'آزمون', date: today, items: [{ desc: 'خدمت', qty: '2.5', price: 1000000, disc: 0 }], taxPct: 9 })).result;
ok(inv && inv.total === 2725000, 'محاسبه فاکتور با تعداد اعشاری و مالیات');
r = await fm.cmd('invoiceIssue', inv.id, { post: true, acc: '4201', cash: '1102' }); ok(!r.error && r.result.voucherNo, 'صدور فاکتور با سند حسابداری');
r = await fm.cmd('invoiceVoid', inv.id, 'اشتباه در نام خریدار'); ok(!r.error && r.result.status === 'باطل‌شده' && r.result.reverseNo, 'ابطال فاکتور و برگشت خودکار سند');
r = await fm.cmd('setOfficePerm', 'P15-o', 'finance.view', 'deny'); ok(!r.error, 'مدیر مالی دسترسی حسابداری مسئول دفتر را گرفت');
fo.state = (await fo.req('GET', 'state')).state;
ok(fo.S.vouchers.length === 0 && fo.S.invoices.length === 0, 'پس از قطع مجوز، مسئول دفتر هیچ سند و فاکتوری دریافت نمی‌کند');
r = await fo.cmd('voucherSave', '', { ...V, ref: 'R2' }); ok(r.error, 'پس از قطع مجوز پایه، ثبت سند هم رد شد');
await fm.cmd('setOfficePerm', 'P15-o', 'finance.view', '');
ok(cs.S.vouchers.length === 0 && cs.S.accounts.length === 0, 'منشی واحد دیگر هیچ داده حسابداری دریافت نمی‌کند');
const pay = (await cmg.cmd('createPay', { title: 'خرید لوازم', amount: 3000000, payee: 'فروشگاه' })).result;
await fo.cmd('payAct', pay.id, true, 'بررسی شد');
r = await fm.cmd('payAct', pay.id, true, 'پرداخت', { exp: '5302', cash: '1101', date: today });
ok(!r.error && r.result.voucherId, 'پرداخت نهایی خودکار سند حسابداری قطعی ساخت');

console.log('ابزارهای اختصاصی');
const pm = new U('planning.manager'), po = new U('planning.office'), ps = new U('planning.secretary'); await pm.login(); await po.login(); await ps.login();
r = await po.cmd('toolSave', 17, 'projects', '', { title: 'پروژه اعشار', progress: '32.36', budget: 100 });
ok(!r.error && r.result.data.progress === 32.36, 'درصد پیشرفت اعشاری ۳۲٫۳۶ پذیرفته شد');
const tr = r.result;
r = await po.cmd('toolSave', 17, 'projects', '', { title: 'خارج از بازه', progress: '120' }); ok(r.error, 'درصد بیش از ۱۰۰ رد شد');
r = await po.cmd('toolStatus', tr.id, 'تکمیل‌شده', 'پایان کار'); ok(!r.error && r.result.pending === 'تکمیل‌شده' && r.result.status !== 'تکمیل‌شده', 'نهایی‌شدن ابزار تأییدی منتظر تأیید مدیر ماند');
r = await pm.cmd('toolApprove', tr.id, true, 'تأیید'); ok(!r.error && r.result.status === 'تکمیل‌شده', 'تأیید مدیر');
r = await po.cmd('toolSave', 17, 'projects', tr.id, { title: 'تغییر بعد از قفل', progress: 50 }); ok(r.error, 'مورد نهایی قفل است');
r = await pm.cmd('toolReopen', tr.id, 'اصلاح گزارش'); ok(!r.error, 'بازگشایی با علت توسط مدیر');
r = await po.cmd('toolSave', 17, 'projects', tr.id, { title: 'پروژه اعشار', progress: '40.5', budget: 100, _note: 'به‌روزرسانی' });
ok(!r.error && r.result.history.slice(-1)[0].diff.some(d => d.f === 'progress'), 'سابقه ابزار مقدار قبل و بعد را دارد');
const sRec = (await ps.cmd('toolSave', 17, 'inspect', '', { title: 'بازدید منشی', date: today })).result;
ok(sRec, 'منشی (سطح «کارهای خود») ثبت کرد');
ps.state = (await ps.req('GET', 'state')).state;
ok(!ps.S.toolrecs.some(x => x.id === tr.id) && ps.S.toolrecs.some(x => x.id === sRec.id), 'منشی فقط کارهای خود/ارجاع‌شده را می‌بیند');
r = await pm.cmd('setToolLevel', 'P17-s', 'projects', 'view'); ps.state = (await ps.req('GET', 'state')).state;
ok(ps.S.toolrecs.some(x => x.id === tr.id), 'پس از سطح «مشاهده»، منشی همه پروژه‌ها را می‌بیند');
r = await ps.cmd('toolSave', 17, 'projects', '', { title: 'x' }); ok(r.error, 'با سطح «مشاهده» ثبت ممکن نیست');
const chs = new U('charity.secretary'); await chs.login();
ok(!chs.S.toolrecs.some(x => x.tool === 'needs'), 'ابزار محرمانه برای منشی پیش‌فرض بسته است');
r = await chs.cmd('toolSave', 12, 'needs', '', { title: 'x', need: 'معیشتی' }); ok(r.error, 'منشی بدون سطح دسترسی در ابزار محرمانه ثبت نمی‌کند');
r = await cs.cmd('toolSave', 17, 'projects', '', { title: 'نفوذ' }); ok(r.error, 'کاربر مدیریت دیگر نمی‌تواند در ابزار این مدیریت ثبت کند');

console.log('پیام، رزرو، اعلان');
r = await cs.cmd('sendMessage', 'P18-m', 'سلام آزمون'); ok(!r.error, 'ارسال پیام');
cm.state = (await cm.req('GET', 'state')).state; ok(cm.S.messages.some(m => m.text === 'سلام آزمون' && !m.read), 'گیرنده پیام را دید');
await cm.cmd('readThread', 'P2-s'); ok(cm.S.messages.filter(m => m.from === 'P2-s').every(m => m.read), 'خواندن گفت‌وگو');
ok(!it.S.messages.some(m => m.text === 'سلام آزمون'), 'پیام برای دیگران ارسال نمی‌شود');
const res = (await cs.cmd('createReservation', { program: 'general', space: 'meeting', kind: 'جلسه آزمون', applicant: 'x', phone: '09161234567', date: add(6), start: '10:00', end: '11:00', people: 10 })).result;
const prm = new U('pr.manager'); await prm.login();
await prm.cmd('resDecide', res.id, 'تأییدشده', '');
r = await prm.cmd('resReschedule', res.id, { date: add(7), start: '12:00', end: '13:00', note: 'تغییر برنامه' }); ok(!r.error && r.result.status === 'تأییدشده' && r.result.date === add(7), 'جابه‌جایی رزرو تأییدشده توسط متولی');
r = await cs.cmd('resDecide', res.id, 'لغوشده', ''); ok(r.error, 'لغو رزرو تأییدشده بدون علت رد شد');
r = await cs.cmd('resDecide', res.id, 'لغوشده', 'منتفی شد'); ok(!r.error, 'لغو رزرو با علت');

console.log('تحویل جایگاه و سابقه متصدیان');
const p2s = it.S.users.find(u => u.posId === 'P4-s');
r = await it.cmd('handover', 'P4-s', { first: 'مهدی', last: 'نوری', phone: '09160000000', start: today, note: 'تحویل پرونده‌ها' }); ok(!r.error, 'تحویل جایگاه');
it.state = (await it.req('GET', 'state')).state;
const hs = it.S.posHistory.filter(h => h.posId === 'P4-s');
ok(hs.length >= 2 && hs.some(h => h.to && h.closeNote === 'تحویل پرونده‌ها') && hs.some(h => !h.to && h.name === 'مهدی نوری'), 'سابقه متصدی قبلی بسته و متصدی جدید ثبت شد');
r = await imam.cmd('handover', 'P0', { first: 'x', last: 'y' }); ok(r.error, 'تحویل جایگاه خود ممکن نیست');

console.log('پشتیبان‌گیری');
r = await it.req('POST', 'backup', {}); ok(r.entry && r.entry.ok, 'تهیه نسخه پشتیبان');
r = await it.req('POST', 'backupcheck', {}, '&name=' + encodeURIComponent(r.entry.name)); ok(r.ok, 'آزمون بازیابی موفق');
r = await cs.req('POST', 'backup', {}); ok(r._status === 403, 'منشی نمی‌تواند پشتیبان بگیرد');
r = await fetch(BASE + 'data/kartabl.sqlite'); ok(r.status !== 200 || !(await r.text()).startsWith('SQLite'), 'پوشه data از وب در دسترس نیست (روی آپاچی با .htaccess)');

console.log(`\nنتیجه: ${pass} موفق، ${fail} ناموفق`);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
