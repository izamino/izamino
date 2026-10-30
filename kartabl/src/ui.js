/* =====================================================================
   رابط کاربری: پوسته، فرم‌ها، جدول‌ها و ورود
   ===================================================================== */
const VIEW = {};
const vs = (k, d = {}) => (VIEW[k] = VIEW[k] || { ...d });
const A = {}; // اقدام‌ها (data-a)
const CAN_PRINT = (() => { try { return window.self === window.top; } catch (e) { return false; } })();
let SESSION_MEM = null;
const sess = {
  get() { try { return sessionStorage.getItem('shabab-session') || SESSION_MEM; } catch (e) { return SESSION_MEM; } },
  set(v) { SESSION_MEM = v; try { v ? sessionStorage.setItem('shabab-session', v) : sessionStorage.removeItem('shabab-session'); } catch (e) {} }
};

/* ---------- قطعات نمایشی ---------- */
const TONES = {
  ok: ['تکمیل‌شده', 'تأییدشده', 'بایگانی', 'پرداخت‌شده', 'انجام‌شده', 'پاسخ داده‌شده', 'سالم', 'فعال', 'موجود', 'جاری‌'],
  bad: ['معوق', 'ردشده', 'خیلی فوری', 'سری', 'خراب', 'اسقاط', 'غیرفعال', 'از کار افتاده', 'مفقود'],
  warn: ['منتظر تأیید', 'فوری', 'محرمانه', 'نیازمند تعمیر', 'تأیید', 'نیازمند سرویس', 'هشدار', 'امانت', 'در انتظار ثبت امور اداری'],
  new: ['جدید', 'ثبت‌شده', 'ثبت درخواست', 'ارجاع به مدیریت مسئول'],
  info: ['در حال انجام', 'در حال بررسی', 'ارجاع‌شده', 'اجرا', 'بررسی و هماهنگی', 'گزارش نهایی', 'در حال پیگیری']
};
const tone = s => { for (const k in TONES) if (TONES[k].includes(s)) return k; return String(s).startsWith('در انتظار') ? 'warn' : ''; };
const pill = (s, t) => `<span class="pill ${t || tone(s)}">${esc(s)}</span>`;
const prio = p => (p && p !== 'عادی' ? pill(p) : '');
const dueTxt = due => {
  if (!due) return '<span class="sub">بدون مهلت</span>';
  const d = daysBetween(todayISO(), due);
  const t = d < 0 ? `${fa(-d)} روز گذشته` : d === 0 ? 'امروز' : `${fa(d)} روز مانده`;
  return `${jd(due)}<span class="sub" style="color:var(${d < 0 ? '--bad' : d <= 2 ? '--warn' : '--muted'})">${t}</span>`;
};
const empty = t => `<div class="empty">${t}</div>`;
const card = (title, body, extra = '', opts = {}) => `<section class="card ${opts.cls || ''}">${title ? `<div class="ch"><h2>${title}</h2>${extra ? `<div class="row">${extra}</div>` : ''}</div>` : ''}<div class="cb ${opts.flush ? 'flush' : ''}">${body}</div></section>`;
const tile = (label, val, sub = '', cls = '', href = '') => `<${href ? `a href="#${href}"` : 'div'} class="tile ${cls}"><span>${label}</span><b>${typeof val === 'number' ? fa(val) : val}</b>${sub ? `<small>${sub}</small>` : ''}</${href ? 'a' : 'div'}>`;
const head = (title, sub = '', actions = '', crumb = '') => `<div class="phead"><div>${crumb ? `<div class="crumb">${crumb}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`;
const btn = (label, a, data = {}, cls = '', icon = '') => `<button class="btn ${cls}" data-a="${a}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${icon ? ic(icon) : ''}${label}</button>`;
const bar = (pct, cls = '') => `<div class="bar ${cls}" title="${fa(Math.round(pct))}٪"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
const files = fs => (fs && fs.length ? `<div class="row">${fs.map(f => `<span class="att">${ic('clip')}${esc(f.name)} <small class="code">${fa(Math.ceil(f.size / 1024))}KB</small></span>`).join('')}</div>` : '');
const kv = rows => `<dl class="kv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;
const tabs = (key, list, cur) => `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" data-a="tab" data-key="${key}" data-v="${k}" class="${k === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const steps = (names, cur, done = false) => `<div class="steps">${names.map((n, i) => `<div class="step ${i < cur || (done && i === cur) ? 'done' : i === cur ? 'cur' : ''}"><i>${i < cur || (done && i === cur) ? '✓' : fa(i + 1)}</i>${esc(n)}</div>`).join('')}</div>`;

function table(cols, rows, opts = {}) {
  if (!rows.length) return empty(opts.empty || 'موردی یافت نشد.');
  return `<div class="tbl-wrap"><table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr ${opts.click ? `class="click" data-a="${opts.click}" data-id="${r.id}"` : ''}>${cols.map(c => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function filterBar(key, items) {
  const v = vs(key);
  return `<div class="filters">${items.map(it => {
    const id = `flt-${key}-${it.k}`;
    if (it.t === 'search') return `<input type="search" id="${id}" data-f="${key}:${it.k}" placeholder="${it.l}" value="${esc(v[it.k] || '')}" aria-label="${it.l}">`;
    if (it.t === 'date') return `<input type="text" id="${id}" data-f="${key}:${it.k}" placeholder="${it.l}" value="${esc(v[it.k] || '')}" aria-label="${it.l}" size="11">`;
    return `<select id="${id}" data-f="${key}:${it.k}" aria-label="${it.l}"><option value="">${it.l}</option>${it.o.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(v[it.k] ?? '') === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  }).join('')}</div>`;
}
const textMatch = (q, ...xs) => !q || xs.join(' ').toLowerCase().includes(en(q).toLowerCase()) || xs.join(' ').includes(q);
const inRange = (iso, f, t) => { const a = f ? jToIso(f) : null, b = t ? jToIso(t) : null; return (!a || iso >= a) && (!b || iso <= b); };

/* ---------- نمودار ستونی ---------- */
function barChart(groups, series) {
  const W = 560, H = 210, P = { t: 14, r: 8, b: 34, l: 34 };
  const max = Math.max(4, ...groups.flatMap(g => series.map(s => g[s.k])));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const gw = (W - P.l - P.r) / groups.length;
  const bw = Math.min(22, (gw - 12) / series.length);
  const y = v => P.t + (H - P.t - P.b) * (1 - v / top);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="نمودار">`;
  for (let i = 0; i <= 4; i++) { const v = step * i; s += `<line class="gl" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${fa(v)}</text>`; }
  groups.forEach((g, i) => {
    const cx = W - P.r - gw * i - gw / 2; // راست به چپ
    series.forEach((se, j) => {
      const x = cx - (series.length * bw) / 2 + j * bw + 1;
      const v = g[se.k];
      s += `<rect class="${se.c}" x="${x}" y="${y(v)}" width="${bw - 2}" height="${Math.max(0, H - P.b - y(v))}" rx="3"><title>${se.l}: ${fa(v)}</title></rect>`;
      if (v) s += `<text x="${x + (bw - 2) / 2}" y="${y(v) - 4}" text-anchor="middle">${fa(v)}</text>`;
    });
    s += `<text x="${cx}" y="${H - 12}" text-anchor="middle">${g.label}</text>`;
  });
  return `<div class="chart">${s}</svg></div><div class="legend">${series.map(se => `<span><i style="background:var(${se.c === 'b1' ? '--teal' : '--accent'});opacity:${se.c === 'b1' ? 1 : .35}"></i>${se.l}</span>`).join('')}</div>`;
}

/* ---------- مودال و فرم ---------- */
let MODAL_REOPEN = null;
function modal({ title, body, foot = '', wide = false }) {
  closeModal(true);
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${title}</h2><button class="ibtn" data-a="close" aria-label="بستن">${ic('x')}</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
  const f = bg.querySelector('input:not([type=hidden]),select,textarea');
  if (f) setTimeout(() => f.focus(), 30);
  return bg;
}
function closeModal(keep) { $$('.modal-bg').forEach(m => m.remove()); if (!keep) MODAL_REOPEN = null; }

function fieldHTML(f, v) {
  const id = 'f_' + f.k;
  const lab = `<label for="${id}">${f.l}${f.req ? ' <span class="req">*</span>' : ''}</label>`;
  const full = f.full || ['textarea', 'multi', 'file'].includes(f.t) ? 'full' : '';
  let inp;
  const opts = (o, cur) => o.map(x => {
    if (x && x.group) return `<optgroup label="${esc(x.group)}">${opts(x.items, cur)}</optgroup>`;
    const [ov, ol] = Array.isArray(x) ? x : [x, x];
    return `<option value="${esc(ov)}" ${String(cur ?? '') === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`;
  }).join('');
  switch (f.t) {
    case 'textarea': inp = `<textarea id="${id}" name="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v || '')}</textarea>`; break;
    case 'select': inp = `<select id="${id}" name="${f.k}">${f.blank !== false ? `<option value="">${f.blank || 'انتخاب کنید'}</option>` : ''}${opts(f.o, v)}</select>`; break;
    case 'multi': inp = `<div class="checks" id="${id}">${f.o.map(x => { const [ov, ol] = Array.isArray(x) ? x : [x, x]; return `<label><input type="checkbox" name="${f.k}" value="${esc(ov)}" ${(v || []).map(String).includes(String(ov)) ? 'checked' : ''}>${esc(ol)}</label>`; }).join('')}</div>`; break;
    case 'check': inp = `<label class="row" style="font-weight:500;color:var(--fg)"><input type="checkbox" id="${id}" name="${f.k}" ${v ? 'checked' : ''}> ${esc(f.cl || 'بله')}</label>`; break;
    case 'date': inp = `<input type="text" inputmode="numeric" id="${id}" name="${f.k}" value="${v ? jd(v) : ''}" placeholder="۱۴۰۵/۰۸/۰۸" autocomplete="off">`; break;
    case 'time': inp = `<input type="time" id="${id}" name="${f.k}" value="${esc(v || '')}">`; break;
    case 'file': inp = `<input type="file" id="${id}" name="${f.k}" multiple>`; break;
    case 'number': inp = `<input type="text" inputmode="numeric" id="${id}" name="${f.k}" value="${v != null && v !== '' ? esc(v) : ''}" placeholder="${esc(f.ph || '')}">`; break;
    default: inp = `<input type="${f.t || 'text'}" id="${id}" name="${f.k}" value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}" ${f.ro ? 'readonly' : ''}>`;
  }
  return `<div class="fld ${full}">${f.t === 'check' ? `<label>${f.l}</label>` : lab}${inp}${f.hint ? `<div class="hint">${f.hint}</div>` : ''}<div class="err" data-err="${f.k}"></div></div>`;
}
const readFile = file => new Promise(res => {
  const meta = { name: file.name, size: file.size, type: file.type };
  if (file.size > 400 * 1024) return res(meta); // فایل بزرگ: فقط مشخصات (در نسخه سروری به مخزن فایل می‌رود)
  const r = new FileReader(); r.onload = () => res({ ...meta, data: r.result }); r.onerror = () => res(meta); r.readAsDataURL(file);
});
async function readForm(form, fields) {
  const out = {}; const errs = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    if (f.t === 'multi') out[f.k] = $$(`input[name="${f.k}"]:checked`, form).map(x => x.value);
    else if (f.t === 'check') out[f.k] = !!(el && el.checked);
    else if (f.t === 'file') out[f.k] = el && el.files.length ? await Promise.all([...el.files].map(readFile)) : [];
    else if (f.t === 'date') { const s = (el.value || '').trim(); if (s) { const iso = jToIso(s); if (!iso) errs[f.k] = 'تاریخ شمسی معتبر نیست (نمونه: ۱۴۰۵/۰۸/۰۸).'; out[f.k] = iso || ''; } else out[f.k] = ''; }
    else if (f.t === 'number') { const s = en(el.value).replace(/[,٬\s]/g, ''); if (s && isNaN(+s)) errs[f.k] = 'عدد معتبر وارد کنید.'; out[f.k] = s === '' ? '' : +s; }
    else out[f.k] = el ? el.value.trim() : '';
    if (f.req && !errs[f.k] && (out[f.k] === '' || out[f.k] == null || (Array.isArray(out[f.k]) && !out[f.k].length))) errs[f.k] = 'این بخش لازم است.';
  }
  return { out, errs };
}
function formModal(title, fields, init, onSave, opts = {}) {
  const bg = modal({
    title, wide: opts.wide,
    body: `${opts.pre || ''}<form class="form" id="mform" novalidate>${fields.map(f => fieldHTML(f, init[f.k])).join('')}</form><div class="err" id="merr" role="alert"></div>`,
    foot: `<button class="btn" type="submit" form="mform">${opts.submit || 'ثبت'}</button><button class="btn ghost" data-a="close">انصراف</button>`
  });
  const form = $('#mform', bg);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    $$('[data-err]', form).forEach(x => (x.textContent = ''));
    const { out, errs } = await readForm(form, fields);
    if (Object.keys(errs).length) { Object.entries(errs).forEach(([k, m]) => { const x = $(`[data-err="${k}"]`, form); if (x) x.textContent = m; }); return; }
    const res = onSave(out);
    if (res && res.error) { $('#merr', bg).textContent = res.error; return; }
    const reopen = opts.reopen;
    closeModal();
    toast(opts.done || 'ثبت شد.');
    refresh();
    if (reopen) reopen(res);
  });
  return bg;
}
/* پنجره اقدام با یادداشت */
function actModal(title, cb, opts = {}) {
  const fields = [...(opts.fields || []), { k: 'note', l: opts.noteLabel || 'توضیح / یادداشت', t: 'textarea', req: !!opts.noteReq }];
  formModal(title, fields, opts.init || {}, v => cb(v), { submit: opts.submit || 'ثبت اقدام', done: opts.done || 'اقدام ثبت شد.', reopen: opts.reopen });
}

let TOAST_T;
function toast(t) {
  let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = t; el.hidden = false; clearTimeout(TOAST_T); TOAST_T = setTimeout(() => (el.hidden = true), 3200);
}

/* ---------- گزینه‌های مشترک فرم ---------- */
const unitOpts = (withImam = false) => [...(withImam ? [[0, 'دفتر امام جماعت']] : []), ...UNITS.map(u => [u.id, u.name])];
const posOpts = unitId => DB.positions.filter(p => unitId == null || p.unitId === +unitId).map(p => [p.id, posWho(p.id)]);
const allPosOpts = () => [{ group: 'امام جماعت', items: [['P0', posWho('P0')]] }, ...UNITS.map(u => ({ group: u.name, items: posOpts(u.id) }))];
const allPosChecks = () => DB.positions.map(p => [p.id, posLabel(p.id) + ' — ' + ((holderOf(p.id) || {}).name || 'بدون متصدی')]);
const serviceOpts = () => UNITS.map(u => ({ group: u.name, items: [...SERVICES[u.id].map(s => [`${u.id}|${s}`, s]), [`${u.id}|همکاری میان‌بخشی`, 'درخواست همکاری میان‌بخشی']] }));

/* ---------- ورود ---------- */
function renderLogin(err = '') {
  const groups = [['P0']].concat(UNITS.map(u => unitPositions(u.id).map(p => p.id)));
  $('#root').innerHTML = `
  <div class="login">
    <div class="art"><canvas id="geo" aria-hidden="true"></canvas>
      <div><div class="bs">بسم الله الرحمن الرحیم</div><h1>کارتابل اداری<br>${esc(DB.settings.orgName)}</h1>
      <p>سامانه یکپارچه مکاتبات، دستورات، ارجاع وظایف، درخواست‌ها، رزروها، اموال، امور مالی و منابع انسانی ۱۷ مدیریت مستقل زیر نظر امام جماعت.</p></div>
      <div class="facts"><div><b>${fa(17)}</b><span>مدیریت مستقل</span></div><div><b>${fa(DB.positions.length)}</b><span>جایگاه سازمانی</span></div><div><b>${jd(todayISO())}</b><span>${J_WEEK[weekday(todayISO())]}</span></div></div>
    </div>
    <div class="pane"><form id="loginf" novalidate>
      <div><h1>ورود به سامانه</h1><p style="color:var(--muted);margin:4px 0 0">دسترسی شما بر اساس جایگاه سازمانی تعیین می‌شود.</p></div>
      <div class="fld"><label for="lu">نام کاربری</label><input id="lu" name="u" autocomplete="username" dir="ltr" value=""></div>
      <div class="fld"><label for="lp">رمز عبور</label><input id="lp" name="p" type="password" autocomplete="current-password" dir="ltr"></div>
      ${err ? `<div class="notice warn" role="alert">${err}</div>` : ''}
      <button class="btn" type="submit" style="justify-content:center;padding:10px">${ic('lock')}ورود امن</button>
      <div class="notice">نسخه نمونه: هر جایگاه را از فهرست زیر انتخاب کنید (رمز همه حساب‌ها <b class="code">1234</b>). امام جماعت: <b class="code">imam</b> · مدیران: <b class="code">m1…m17</b> · مسئولان دفتر: <b class="code">o1…o17</b> · منشی‌ها: <b class="code">s1…s17</b></div>
      <div class="demo">${groups.flat().map(pid => { const u = holderOf(pid); if (!u) return ''; return `<button type="button" data-a="quick" data-u="${esc(u.username)}"><span>${esc(u.name)}</span><small>${esc(posLabel(pid))} · <span class="code">${esc(u.username)}</span></small></button>`; }).join('')}</div>
    </form></div>
  </div>`;
  $('#loginf').addEventListener('submit', e => { e.preventDefault(); doLogin($('#lu').value.trim(), $('#lp').value); });
  drawGeo();
}
function doLogin(username, pass) {
  const u = DB.users.find(x => x.username === en(username));
  if (!u || u.pass !== hash('shabab:' + en(pass))) { DB.loginFails = (DB.loginFails || 0) + 1; Store.save(); return renderLogin('نام کاربری یا رمز عبور درست نیست.'); }
  if (!u.active) return renderLogin('این حساب کاربری غیرفعال شده است. با مدیریت فناوری اطلاعات تماس بگیرید.');
  if (!u.posId) return renderLogin('برای این حساب جایگاه سازمانی تعریف نشده است.');
  setMe(u);
  audit('ورود به سامانه', 'session', u.id, '');
  Store.save();
  sess.set(u.id);
  renderShell();
}
function setMe(u) { ME = { user: u, pos: posById(u.posId) }; }
A.quick = d => doLogin(d.u, '1234');
A.logout = () => { audit('خروج از سامانه', 'session', ME.user.id, ''); Store.save(); ME = null; sess.set(null); location.hash = ''; renderLogin(); };

/* نقش هندسی گره اسلامی در پس‌زمینه صفحه ورود */
function drawGeo() {
  const c = $('#geo'); if (!c) return;
  const r = c.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
  c.width = r.width * dpr; c.height = r.height * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  g.strokeStyle = 'rgba(140, 215, 195, .22)'; g.lineWidth = 1;
  const s = 64;
  for (let y = -s; y < r.height + s; y += s) for (let x = -s; x < r.width + s; x += s) {
    const cx = x + ((y / s) % 2 ? s / 2 : 0), cy = y;
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (Math.PI / 8) * i, rr = i % 2 ? s * 0.22 : s * 0.42; g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    g.closePath(); g.stroke();
    g.beginPath(); g.arc(cx, cy, s * 0.1, 0, Math.PI * 2); g.stroke();
  }
}

/* ---------- پوسته ---------- */
function navItems() {
  const q = myQueue().length;
  const unread = DB.notifs.filter(n => n.pos === ME.pos.id && !n.read).length;
  const u = myUnit();
  return [
    ['grp', 'کارتابل'],
    ['dashboard', 'داشبورد', 'home', true, q],
    ['imam', 'کارتابل امام جماعت', 'dome', isImam()],
    ['units', 'فهرست ۱۷ مدیریت', 'building', true],
    [`unit-${u}`, 'کارتابل ' + unitShort(u), UNITS.find(x => x.id === u)?.ic || 'building', u > 0],
    ['grp', 'مکاتبات و گردش کار'],
    ['letters', 'دبیرخانه و مکاتبات', 'mail', true],
    ['orders', 'دستورات امام جماعت', 'flag', true, DB.orders.filter(o => canSeeOrder(o) && o.status !== 'تکمیل‌شده').length],
    ['tasks', 'ارجاع وظایف', 'check', true],
    ['requests', 'درخواست‌های داخلی', 'inbox', true],
    ['grp', 'منابع و خدمات'],
    ['reservations', 'رزرو فضاها', 'door', true],
    ['calendar', 'تقویم و جلسات', 'cal', true],
    ['assets', 'اموال و انبار', 'box', canAssets()],
    ['finance', 'امور مالی', 'wallet', canFinance() || myRole() !== 'staff'],
    ['hr', 'منابع انسانی و امور اداری', 'users', true],
    ['grp', 'نظارت و سامانه'],
    ['reports', 'گزارش‌گیری و نظارت', 'chart', isImam() || ['manager', 'office'].includes(myRole())],
    ['notifications', 'اعلان‌ها', 'bell', true, unread],
    ['users', 'کاربران و دسترسی‌ها', 'lock', canAdminUsers()],
    ['system', 'تنظیمات و آرشیو', 'gear', true]
  ];
}
function renderShell() {
  $('#root').innerHTML = `
  <div class="app" id="app">
    <aside class="side" id="side" aria-label="منوی اصلی">
      <div class="brand"><div class="mark">${ic('dome')}</div><div><b>کارتابل شباب اهل‌الجنه</b><small>مجتمع مسجدمحور</small></div></div>
      <nav class="nav" id="nav"></nav>
      <div class="foot">${MEMORY_ONLY ? 'ذخیره‌سازی مرورگر در دسترس نیست؛ داده‌ها پس از بستن صفحه حفظ نمی‌شوند.' : 'داده‌ها در این مرورگر ذخیره می‌شوند.'}<br>نسخه ۱٫۰ · ${fa(DB.audit.length)} رویداد ثبت‌شده</div>
    </aside>
    <div class="scrim" data-a="menu"></div>
    <div class="mainwrap">
      <header class="top">
        <button class="ibtn menu" data-a="menu" aria-label="منو">${ic('menu')}</button>
        <div class="search">${ic('search')}<input id="gsearch" type="search" placeholder="جست‌وجوی سراسری: شماره، عنوان، نام…" autocomplete="off" aria-label="جست‌وجوی سراسری"><div class="res" id="gres" hidden></div></div>
        <div class="spacer"></div>
        <div class="clock" id="clock"></div>
        <button class="ibtn" data-a="theme" aria-label="تغییر حالت روشن و تاریک" id="themebtn"></button>
        <a class="ibtn" href="#notifications" aria-label="اعلان‌ها" id="bell">${ic('bell')}</a>
        <div class="who"><div class="av">${esc(ME.user.name.replace('حجت‌الاسلام ', '').replace('سید ', '').trim()[0])}</div><div><b>${esc(ME.user.name)}</b><small>${esc(posLabel(ME.pos.id))}</small></div></div>
        <button class="ibtn" data-a="logout" aria-label="خروج">${ic('logout')}</button>
      </header>
      <main id="main"></main>
    </div>
  </div>`;
  const gs = $('#gsearch');
  gs.addEventListener('input', () => globalSearch(gs.value));
  gs.addEventListener('blur', () => setTimeout(() => ($('#gres').hidden = true), 200));
  tick();
  route();
}
function renderChrome() {
  const h = location.hash.slice(1) || 'dashboard';
  $('#nav').innerHTML = navItems().map(n => n[0] === 'grp' ? `<div class="grp">${n[1]}</div>` : n[3] ? `<a href="#${n[0]}" class="${h === n[0] ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span>${n[4] ? `<span class="cnt">${fa(n[4])}</span>` : ''}</a>` : '').join('');
  const unread = DB.notifs.filter(n => n.pos === ME.pos.id && !n.read).length;
  $('#bell').innerHTML = ic('bell') + (unread ? `<span class="dot">${fa(unread > 99 ? '99+' : unread)}</span>` : '');
  $('#themebtn').innerHTML = ic(curTheme() === 'dark' ? 'sun' : 'moon');
}
function tick() {
  const c = $('#clock'); if (!c) return;
  const t = todayISO();
  c.innerHTML = `<b>${fa(nowHM())}</b>${jdLong(t)}`;
}
const curTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
A.theme = () => { const t = curTheme() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; pref.set('theme', t); renderChrome(); };
A.menu = () => $('#app').classList.toggle('open');
A.close = () => closeModal();
A.tab = d => { vs(d.key).tab = d.v; refresh(); };
A.go = d => { location.hash = d.h; };

function route() {
  if (!ME) return;
  const h = location.hash.slice(1) || 'dashboard';
  const m = h.match(/^unit-(\d+)$/);
  const fn = m ? () => pgUnit(+m[1]) : PAGES[h] || PAGES.dashboard;
  const active = document.activeElement && document.activeElement.id;
  const pos = active && document.activeElement.selectionStart;
  $('#main').innerHTML = fn();
  renderChrome();
  $('#app').classList.remove('open');
  if (active && active.startsWith('flt-')) { const el = document.getElementById(active); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
}
let LAST_HASH = '';
function refresh() { Store.save(); if (ME) { const h = location.hash; if (h !== LAST_HASH) { LAST_HASH = h; window.scrollTo(0, 0); } route(); } }

/* فیلترها */
let FT;
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.f; if (!k || e.target.tagName === 'SELECT') return;
  const [p, f] = k.split(':'); vs(p)[f] = e.target.value;
  clearTimeout(FT); FT = setTimeout(route, e.target.tagName === 'SELECT' ? 0 : 220);
});
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.f; if (k && e.target.tagName === 'SELECT') { const [p, f] = k.split(':'); vs(p)[f] = e.target.value; route(); } });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  e.preventDefault(); fn(el.dataset, el);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.modal-bg')) closeModal(); });

/* جست‌وجوی سراسری در محدوده مجاز کاربر */
function globalSearch(q) {
  const box = $('#gres');
  q = q.trim();
  if (q.length < 2) { box.hidden = true; return; }
  const m = (...xs) => textMatch(q, ...xs);
  const res = [
    ...DB.letters.filter(l => canSeeLetter(l) && m(l.no, fa(l.no), l.subject, l.sender, l.receiver)).map(l => ['letter', l.id, 'نامه ' + LETTER_TYPES[l.type], fa(l.no), l.conf === 'سری' && myRole() !== 'manager' && !isImam() ? 'محرمانه' : l.subject]),
    ...DB.orders.filter(o => canSeeOrder(o) && m(o.no, o.title)).map(o => ['order', o.id, 'دستور', o.no, o.title]),
    ...DB.tasks.filter(t => canSeeTask(t) && m(t.no, t.title)).map(t => ['task', t.id, 'وظیفه', t.no, t.title]),
    ...DB.requests.filter(r => canSeeReq(r) && m(r.no, r.title)).map(r => ['req', r.id, 'درخواست', r.no, r.title]),
    ...DB.meetings.filter(x => canSeeMeeting(x) && m(x.no, x.title)).map(x => ['meet', x.id, x.kind, x.no, x.title]),
    ...DB.reservations.filter(r => m(r.no, r.applicant, r.kind, spaceOf(r.space).name)).map(r => ['res', r.id, 'رزرو', r.no, spaceOf(r.space).name + ' — ' + r.kind]),
    ...DB.assets.filter(a => canSeeAsset(a) && m(a.code, a.name, a.serial)).map(a => ['asset', a.id, 'اموال', a.code, a.name]),
    ...(canHR() ? DB.users.filter(u => m(u.name, u.username)).map(u => ['person', u.id, 'پرونده اداری', u.username, u.name]) : [])
  ].slice(0, 14);
  box.innerHTML = res.length ? res.map(([k, id, t, no, title]) => `<a href="#" data-a="open" data-k="${k}" data-id="${id}"><small>${t} · <span class="${k === 'letter' ? 'lno' : 'code'}">${esc(no)}</span></small><br>${esc(title)}</a>`).join('') : '<div class="empty">نتیجه‌ای در محدوده دسترسی شما یافت نشد.</div>';
  box.hidden = false;
}
A.open = d => {
  $('#gres').hidden = true;
  ({ letter: showLetter, order: showOrder, task: showTask, req: showReq, meet: showMeeting, res: showRes, asset: showAsset, person: showPerson, pay: showPay })[d.k](d.id);
};
