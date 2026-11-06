// آزمون رابط کاربری در مرورگر واقعی: node test/ui-e2e.cjs http://127.0.0.1:8090/
const { chromium, devices } = require('playwright');
const B = process.argv[2] || 'http://127.0.0.1:8090/';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const login = async (p, u, pw = '1234') => { await p.waitForSelector('#loginf'); await p.fill('#lu', u); await p.fill('#lp', pw); await p.click('#loginbtn'); await p.waitForSelector('#main', { timeout: 8000 }); await p.waitForTimeout(300); };
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1366, height: 860 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B);
  console.log('ورود و خروج');
  await login(p, 'culture.secretary');
  ok(await p.$('#main'), 'ورود منشی');
  await p.click('[data-a="logout"]'); await p.waitForSelector('#loginf');
  await login(p, 'culture.secretary');
  ok(await p.$('#main'), 'ورود دوباره پس از خروج بدون تازه‌سازی صفحه');

  console.log('نوشتن نامه، ذخیره خودکار و تغییر صفحه');
  await p.evaluate(() => { location.hash = 'letters'; }); await p.waitForTimeout(300);
  await p.click('[data-a="newLetter"]'); await p.waitForSelector('#lform');
  await p.selectOption('#f_toUnit', '4');
  await p.fill('#f_subject', 'نامه آزمون رابط');
  await p.fill('#f_due', '1405/09/10');
  await p.click('#lbody'); await p.keyboard.type('متن آزمایشی نامه که باید در پیش‌نویس بماند');
  await p.click('[data-ed="bold"]'); await p.keyboard.type(' درشت');
  await p.evaluate(() => { location.hash = 'tasks'; }); await p.waitForTimeout(1500);
  ok(!(await p.$('#lform')), 'با رفتن به صفحه دیگر پنجره بسته شد');
  await p.evaluate(() => { location.hash = 'letters'; }); await p.waitForTimeout(400);
  await p.evaluate(() => { vs('letters').tab = 'drafts'; route(); }); await p.waitForTimeout(300);
  const dtxt = await p.$eval('#main', m => m.innerText);
  ok(/نامه آزمون رابط/.test(dtxt), 'پیش‌نویس پس از ترک صفحه ذخیره شده است');
  ok(/مهلت اقدام/.test(dtxt), 'مهلت اقدام در پیش‌نویس حفظ شد');
  await p.click('[data-a="openDraft"]'); await p.waitForSelector('#lform');
  ok((await p.$eval('#lbody', e => e.innerHTML)).includes('<b>'), 'قالب متن (درشت) در پیش‌نویس حفظ شد');
  ok(await p.$eval('#f_due', e => e.value) !== '', 'مهلت اقدام هنگام بازکردن پیش‌نویس برگشت');
  await p.click('#lsend'); await p.waitForTimeout(900);
  const title = await p.$eval('#mtitle', e => e.textContent).catch(() => '');
  ok(/نامه داخلی/.test(title), 'نامه ارسال و صفحه نامه با شماره باز شد');
  ok(await p.$('.lsheet .lh2'), 'نامه روی سربرگ رسمی نمایش داده می‌شود');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => { vs('letters').tab = 'drafts'; route(); }); await p.waitForTimeout(300);
  ok(!/نامه آزمون رابط/.test(await p.$eval('#main', m => m.innerText)), 'پیش‌نویس پس از ارسال از پوشه پیش‌نویس‌ها حذف شد');

  console.log('پایان نشست از سوی مدیر سامانه');
  const ctx2 = await br.newContext(); const it = await ctx2.newPage(); await it.goto(B); await login(it, 'it.manager');
  const uid = await p.evaluate(() => ME.user.id);
  await it.evaluate(async id => run('kickUser', id), uid);
  await p.evaluate(() => { vs('letters').tab = 'all'; }); await p.click('[data-a="newLetter"]').catch(() => {}); await p.waitForTimeout(400);
  await p.evaluate(() => run('readAllNotifs')); await p.waitForTimeout(1500);
  ok(await p.$('#loginf'), 'پس از قطع نشست، کاربر به صفحه ورود برگشت (نه «اتصال برقرار نشد»)');
  await login(p, 'culture.secretary');
  ok(await p.$('#main'), 'ورود دوباره پس از قطع نشست');

  console.log('ثبت تکراری سند مالی');
  const ctx3 = await br.newContext(); const f = await ctx3.newPage(); await f.goto(B); await login(f, 'finance.office');
  await f.evaluate(() => { location.hash = 'finance'; }); await f.waitForTimeout(300);
  await f.click('[data-a="newVoucher"]'); await f.waitForSelector('#vform');
  await f.fill('#vform [name="desc"]', 'سند آزمون دوبار زدن');
  const rows = await f.$$('#vlines tr');
  await rows[0].$eval('[data-l="acc"]', s => { s.value = '1101'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await (await rows[0].$('[data-l="dr"]')).fill('1000000');
  await rows[1].$eval('[data-l="acc"]', s => { s.value = '4101'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await (await rows[1].$('[data-l="cr"]')).fill('1000000');
  const before = await f.evaluate(() => DB.vouchers.length);
  await f.$eval('#vsave', b => { b.click(); b.click(); b.click(); });
  await f.waitForTimeout(1500);
  const after = await f.evaluate(() => DB.vouchers.filter(v => v.desc === 'سند آزمون دوبار زدن').length);
  ok(after === 1, 'سه بار زدن دکمه ذخیره فقط یک سند ثبت کرد');

  console.log('اولین ورود: ثبت نام متصدی');
  await it.evaluate(async () => run('createAccount', 'P9-s', 'clinic.secretary2', 'pass1234')).catch(() => {});
  const ctx4 = await br.newContext(); const n = await ctx4.newPage(); await n.goto(B);
  const has = await it.evaluate(() => !!DB.users.find(u => u.posId === 'P9-s'));
  if (has) {
    const u = await it.evaluate(() => DB.users.find(u => u.posId === 'P9-s'));
    await it.evaluate(async id => run('setPassword', id, 'pass1234'), u.id);
    await login(n, u.username, 'pass1234');
    ok(true, 'ورود با رمز تعیین‌شده توسط فناوری اطلاعات');
  }

  console.log('اعلان و رفتن مستقیم به موضوع');
  const ctx5 = await br.newContext(); const m = await ctx5.newPage(); await m.goto(B); await login(m, 'media.manager');
  await m.evaluate(() => { location.hash = 'notifications'; }); await m.waitForTimeout(300);
  const nb = await m.$('#main [data-a="notif"]');
  if (nb) { await nb.click(); await m.waitForTimeout(500); ok(await m.$('.modal-bg'), 'دکمه «مشاهده و اقدام» همان مورد را باز کرد'); } else ok(false, 'اعلانی برای آزمون نبود');

  console.log('گوشی: نبود پیمایش افقی');
  const ph = await br.newContext({ ...devices['iPhone 13'] }); const q = await ph.newPage(); await q.goto(B); await login(q, 'culture.manager');
  let wide = [];
  for (const h of ['dashboard', 'letters', 'messages', 'unit-2', 'tasks', 'requests', 'reservations', 'calendar', 'finance', 'notifications', 'profile']) {
    await q.evaluate(h => { location.hash = h; }, h); await q.waitForTimeout(250);
    const w = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (w > 2) wide.push(h + ':' + w);
  }
  ok(!wide.length, 'هیچ صفحه‌ای در گوشی پیمایش افقی ندارد ' + wide.join(' '));
  await q.click('[data-a="quickAdd"]'); await q.waitForTimeout(200); await q.click('[data-go="newLetter"]'); await q.waitForSelector('#lform');
  const mw = await q.evaluate(() => document.querySelector('.modal').getBoundingClientRect().width <= window.innerWidth + 1);
  ok(mw, 'پنجره نوشتن نامه در گوشی در عرض صفحه جا می‌شود');

  ok(!errs.length, 'بدون خطای جاوااسکریپت ' + errs.join(' | '));
  console.log(`\nنتیجه: ${pass} موفق، ${fail} ناموفق`);
  await br.close(); process.exit(fail ? 1 : 0);
})();
