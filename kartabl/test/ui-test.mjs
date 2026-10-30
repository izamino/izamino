// آزمون رابط کاربری روی سرور واقعی (Playwright): پیمایش همه صفحه‌ها، دکمه‌ها و فرم‌ها با چند نقش،
// آزمون تزریق HTML، مدیریت فوکوس و صفحه‌کلید، و بررسی گوشی و آیپد.
// اجرا: node test/ui-test.mjs [پوشه تصاویر]
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'server');
const SHOTS = process.argv[2] || mkdtempSync(join(tmpdir(), 'kartabl-shots-'));
mkdirSync(SHOTS, { recursive: true });
const DATA = mkdtempSync(join(tmpdir(), 'kartabl-ui-'));
const PORT = 19000 + Math.floor(Math.random() * 900);
const BASE = `http://127.0.0.1:${PORT}`;
const NODE = [process.execPath, '--disable-warning=ExperimentalWarning'];
let pass = 0, failN = 0;
const ok = (c, n, x = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { failN++; console.log('  ✗ ' + n + (x ? ' — ' + x : '')); } };

execFileSync(NODE[0], [NODE[1], join(ROOT, 'server.js'), 'init', '--demo'], { env: { ...process.env, DATA_DIR: DATA } });
const srv = spawn(NODE[0], [NODE[1], join(ROOT, 'server.js')], { env: { ...process.env, DATA_DIR: DATA, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
let srvErr = ''; srv.stderr.on('data', d => (srvErr += d));
await new Promise((res, rej) => { srv.stdout.on('data', d => { if (String(d).includes('در حال اجراست')) res(); }); setTimeout(() => rej(new Error(srvErr)), 15000); });

const XSS = '<img src=x onerror="window.__xss=1"><b id=xssb>B</b>';
const SKIP = /^(logout|resetGo|resetDemo|admDel|admKickAll|admForceAll|admKick|admToggle|admEndSes|admRecDel|admDelPos|admSpaceDel|admOrgReset|admUnitToggle|restore|menu|theme|quick|loginMode|calNav|wkNav|dayNav|close|print|copyBk|copyTxt|admMaint|notif|readAll|admPal|admScale|pwShow|stayIn|backup|smsTest)$/;
const b = await chromium.launch();
try {
  /* داده‌های آلوده برای آزمون تزریق، از مسیر عادی برنامه */
  const api = await (await b.newContext()).newPage();
  await api.goto(BASE);
  const apiCall = (u, list) => api.evaluate(async ([u, list]) => {
    const l = await fetch('/api/login', { method: 'POST', headers: { 'X-Kartabl': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: '1234' }) }).then(r => r.json());
    const out = [];
    for (const [name, args] of list) out.push(await fetch('/api/cmd', { method: 'POST', headers: { 'X-Kartabl': '1', 'X-CSRF': l.csrf, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, args }) }).then(r => r.json()).then(j => j.error || 'ok'));
    await fetch('/api/logout', { method: 'POST', headers: { 'X-Kartabl': '1', 'X-CSRF': l.csrf, 'Content-Type': 'application/json' }, body: '{}' });
    return out;
  }, [u, list]);
  const day = '2026-11-02';
  const r1 = await apiCall('imam', [
    ['addPosition', [{ unitId: 4, title: 'جایگاه ' + XSS }]],
    ['saveUnit', [4, { name: 'مدیریت رسانه ' + XSS, short: 'رسانه' + XSS, services: 'عکاسی\n' + XSS }]],
    ['createOrder', [{ title: 'دستور ' + XSS, desc: XSS, units: ['4'], respPos: 'P4-m', priority: 'فوری', issued: day, due: day, needReport: false }]],
    ['saveSettings', ['announcement', { on: true, tone: 'info', text: 'اطلاعیه ' + XSS }]]
  ]);
  const r2 = await apiCall('s3', [
    ['createLetter', [{ type: 'internal', subject: 'نامه ' + XSS, toUnit: 4, unitId: 3, sender: XSS, receiver: XSS, body: XSS, date: day }]],
    ['createRequest', [{ title: 'درخواست ' + XSS, toUnit: 4, cat: XSS, desc: XSS, priority: 'عادی' }]],
    ['createMeeting', [{ title: 'جلسه ' + XSS, date: day, start: '10:00', end: '11:00', place: XSS, invitees: ['P4-m', 'P16-m'], agenda: XSS }]],
    ['createReservation', [{ program: 'general', space: 'amphi', kind: 'برنامه ' + XSS, applicant: XSS, phone: '09120000000', date: day, start: '10:00', end: '11:00', people: 10, equip: XSS, desc: XSS }]]
  ]);
  const r3 = await apiCall('m4', [['createTask', [{ unitId: 4, title: 'وظیفه ' + XSS, desc: XSS, assignee: 'P4-o', start: day, due: day, priority: 'فوری' }]], ['addRecord', [4, 'media', { title: XSS, kind: 'عکس', date: day, event: XSS, place: XSS }]]]);
  await api.evaluate(x => fetch('/api/signup', { method: 'POST', headers: { 'X-Kartabl': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ v: { name: 'متقاضی ' + x, username: 'xss.user', phone: '09121234567', unitId: 4, title: x, pass: 'abcdef1234', note: x } }) }), XSS);
  console.log('آماده‌سازی داده آلوده:', [...r1, ...r2, ...r3].every(x => x === 'ok') ? 'انجام شد' : JSON.stringify([...r1, ...r2, ...r3]));

  /* پیمایش کامل با چند نقش روی سرور */
  const crawl = async (label, ctxOpts, users) => {
    const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
    const errs = new Set(); let leaks = 0, injected = 0, clicks = 0, submits = 0;
    p.on('pageerror', e => errs.add(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource|ERR_/.test(m.text())) errs.add(m.text()); });
    await p.goto(BASE);
    const check = async ctxName => {
      const r = await p.evaluate(() => ({ x: !!window.__xss || !!document.querySelector('img[src="x"], #xssb, [onerror]'), t: document.body.innerText.match(/.{0,25}(undefined|NaN|\[object|Invalid Date).{0,25}/) }));
      if (r.x) { injected++; errs.add('HTML injected @' + ctxName); }
      if (r.t) { leaks++; errs.add('leak @' + ctxName + ': ' + r.t[0]); }
    };
    for (const u of users) {
      await p.evaluate(u => doLogin(u, '1234'), u); await p.waitForTimeout(250);
      const pages = await p.evaluate(() => navItems().filter(n => n[0] !== 'grp' && n[3]).map(n => n[0]).concat(['units', 'unit-4', 'unit-17', 'profile']));
      for (const pg of pages) {
        await p.evaluate(h => { closeModal(); location.hash = h; route(); }, pg);
        const tabs = await p.$$eval('main [data-a="tab"]', els => els.map(e => [e.dataset.key, e.dataset.v]));
        for (const [k, v] of tabs.length ? tabs : [[null, null]]) {
          if (k) await p.evaluate(([k, v, h]) => { closeModal(); vs(k).tab = v; if (k === 'cal') vs('cal').mode = v; location.hash = h; route(); }, [k, v, pg]);
          await check(`${u}/${pg}/${v}`);
          const n = await p.$$eval('main [data-a]', els => els.length);
          for (let i = 0; i < Math.min(n, 30); i++) {
            const a = await p.evaluate(i => { const el = document.querySelectorAll('main [data-a]')[i]; return el ? el.dataset.a : null; }, i);
            if (!a || SKIP.test(a) || a === 'tab') continue;
            await p.evaluate(i => document.querySelectorAll('main [data-a]')[i]?.click(), i); clicks++;
            await p.waitForTimeout(30);
            if (await p.$('.modal')) {
              await check(`${u}/${pg}/${v} modal:${a}`);
              if (await p.$('#mform') && !/admNewUser|admPass|admSignOk|admOk|admNo|newUser/.test(a)) { await p.evaluate(() => document.querySelector('button[form="mform"]').click()); submits++; await p.waitForTimeout(120); await check(`${u}/${pg} submit:${a}`); }
              await p.evaluate(() => closeModal());
            }
            await p.evaluate(h => { if (location.hash.slice(1) !== h) location.hash = h; route(); }, pg);
          }
        }
      }
      await p.evaluate(() => { closeModal(); return endSession(); }); await p.waitForTimeout(150);
    }
    ok(errs.size === 0, `${label}: پیمایش ${clicks} کلیک و ${submits} فرم بدون خطا`, [...errs].slice(0, 6).join(' | '));
    ok(injected === 0, `${label}: هیچ متن واردشده‌ای به HTML اجرایی تبدیل نشد`);
    await ctx.close();
  };
  console.log('\nپیمایش رایانه');
  await crawl('رایانه', { viewport: { width: 1360, height: 900 } }, ['m16', 'imam', 's3', 'm4', 'k4-3']);
  console.log('\nپیمایش گوشی');
  await crawl('گوشی', { ...devices['iPhone 13'] }, ['m16', 'o4']);

  /* فوکوس و صفحه‌کلید */
  console.log('\nفوکوس و صفحه‌کلید');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const p = await ctx.newPage();
  await p.goto(BASE); await p.evaluate(() => doLogin('m4', '1234')); await p.waitForTimeout(300);
  await p.evaluate(() => { location.hash = 'tasks'; route(); });
  const row = await p.$('tr.click');
  await row.focus();
  ok(await p.evaluate(() => document.activeElement.matches('tr.click[role="button"][tabindex="0"]')), 'ردیف‌های قابل کلیک با Tab در دسترس‌اند');
  await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  ok(!!(await p.$('.modal')), 'Enter روی ردیف، جزئیات را باز می‌کند');
  let inside = true;
  for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); inside = inside && await p.evaluate(() => !!document.activeElement.closest('.modal')); }
  ok(inside, 'فوکوس با ۲۵ بار Tab از پنجره بیرون نمی‌رود');
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Shift+Tab'); inside = inside && await p.evaluate(() => !!document.activeElement.closest('.modal')); }
  ok(inside, 'Shift+Tab نیز داخل پنجره می‌ماند');
  await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  ok(await p.evaluate(() => !document.querySelector('.modal') && document.activeElement.matches('tr.click')), 'Esc پنجره را می‌بندد و فوکوس به ردیف قبلی برمی‌گردد');
  ok(await p.evaluate(() => document.documentElement.lang === 'fa' && document.documentElement.dir === 'rtl'), 'زبان و جهت سند: fa و rtl');
  ok(await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].every(t => t.hasAttribute('aria-selected'))), 'تب‌ها وضعیت انتخاب (aria-selected) دارند');
  /* پیش‌نویس و هشدار بی‌فعالیتی */
  await p.evaluate(() => A.newTask({ u: 4 })); await p.fill('#f_title', 'پیش‌نویس مهم'); await p.waitForTimeout(800);
  await p.evaluate(() => closeModal()); await p.evaluate(() => A.newTask({ u: 4 }));
  ok(await p.inputValue('#f_title') === 'پیش‌نویس مهم', 'متن فرم نیمه‌کاره پس از بستن پنجره به‌صورت پیش‌نویس برمی‌گردد');
  await p.evaluate(() => { closeModal(); LAST_ACT = Date.now() - (SEC().sessionMin * 60000 - 60000); tick(); });
  ok(!!(await p.$('#idlewarn')), 'دو دقیقه پیش از خروج خودکار، هشدار بی‌فعالیتی نمایش داده می‌شود');
  await p.keyboard.type('a');
  ok(!(await p.$('#idlewarn')), 'تایپ کردن هم فعالیت حساب می‌شود و هشدار را برمی‌دارد');
  await ctx.close();

  /* تصاویر گوشی و آیپد */
  console.log('\nگوشی و آیپد');
  for (const [name, dev] of [['iphone', devices['iPhone 13']], ['ipad', devices['iPad (gen 7)']], ['ipad-land', devices['iPad (gen 7) landscape']]]) {
    const c = await b.newContext({ ...dev }); const q = await c.newPage();
    await q.goto(BASE); await q.evaluate(() => doLogin('m16', '1234')); await q.waitForTimeout(300);
    let over = [];
    for (const [h, tab] of [['dashboard'], ['tasks'], ['letters'], ['reservations'], ['finance'], ['admin', 'perms'], ['admin', 'users'], ['admin', 'sms'], ['calendar'], ['reports']]) {
      await q.evaluate(([h, tab]) => { if (tab) vs('adm').tab = tab; location.hash = h; route(); }, [h, tab]);
      await q.waitForTimeout(60);
      const sw = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sw > 1) over.push(h + (tab ? '/' + tab : '') + ':' + sw);
      if (['dashboard', 'tasks'].includes(h) || tab === 'perms') await q.screenshot({ path: join(SHOTS, `${name}-${h}${tab ? '-' + tab : ''}.png`) });
    }
    ok(!over.length, `${name}: هیچ صفحه‌ای از عرض صفحه‌نمایش بیرون نمی‌زند`, over.join(' '));
    if (name === 'iphone') {
      await q.evaluate(() => { vs('adm').tab = 'perms'; location.hash = 'admin'; route(); });
      const m = await q.evaluate(() => { const w = document.querySelector('.matrix-wrap'); return { scroll: w.scrollWidth > w.clientWidth, style: getComputedStyle(w).overflowX }; });
      ok(m.scroll && m.style === 'auto', 'ماتریس دسترسی در گوشی اسکرول افقی مستقل دارد و بریده نمی‌شود', JSON.stringify(m));
    }
    await c.close();
  }
} catch (e) { failN++; console.error(e); }
finally {
  await b.close(); srv.kill();
  console.log(`\nتصاویر: ${SHOTS}\n${pass} آزمون موفق، ${failN} ناموفق`);
  process.exit(failN ? 1 : 0);
}
