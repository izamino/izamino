'use strict';
/* سامانه انبار شباب — single-page client. Hash routes, no build step. */

/* ================================================================ helpers */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { boot: null, user: null, unread: 0 };
/* Settings printed by WordPress (templates/app.php). */
const A = window.ANBAR || { root: '/wp-json/anbar/v1/', nonce: '', assets: '', loggedIn: false };
const LOGO = A.assets + 'logo.svg';
const ORG = A.org || 'مجتمع مسجد محور شباب';
const ORG_SUB = A.orgSub || 'مجموعه تفکر ناب';
/** '/api/items?x=1' → WordPress REST URL (works with pretty and plain permalinks). */
function apiUrl(u, extra = {}) {
  const [p, qs = ''] = u.replace(/^\/api\//, '').split('?');
  const params = new URLSearchParams(qs);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const base = A.root + p;
  const q = params.toString();
  return q ? base + (base.includes('?') ? '&' : '?') + q : base;
}
const downloadUrl = (u) => apiUrl(u, { _wpnonce: A.nonce });

const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 });
const fa = (n) => (n == null || n === '' ? '' : nf.format(Number(n)));
const faDigits = (s) => String(s ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const toEn = (s) => String(s ?? '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/٫/g, '.').replace(/[,٬]/g, '');
const qtyHtml = (n, unit) => `<span class="qty num">${fa(n)}<small>${esc(unit)}</small></span>`;

/* ---------- Jalali calendar (algorithm from jalaali-js, MIT) */
const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;
function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const gy = jy + 621;
  let leapJ = -14, jp = breaks[0], jm, jump = 0, n;
  for (let i = 1; i < breaks.length; i++) {
    jm = breaks[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4); jp = jm;
  }
  n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  return [div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd];
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn)[0];
  let jy = gy - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return [jy, 1 + div(k, 31), mod(k, 31) + 1];
    k -= 186;
  } else {
    jy -= 1; k += 179;
    if (r.leap === 1) k += 1;
  }
  return [jy, 7 + div(k, 30), mod(k, 30) + 1];
}
const pad = (n) => String(n).padStart(2, '0');
/** "2026-10-12" → [1405, 7, 20] */
function isoToJ(iso) { const [y, m, d] = iso.split('-').map(Number); return d2j(g2d(y, m, d)); }
/** "1405/7/20" (any digits) → "2026-10-12" or null */
function jToIso(text) {
  const m = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(toEn(text).trim());
  if (!m) return null;
  const [jy, jm, jd] = m.slice(1).map(Number);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  const [gy, gm, gd] = d2g(j2d(jy, jm, jd));
  const back = d2j(g2d(gy, gm, gd));
  if (back[0] !== jy || back[1] !== jm || back[2] !== jd) return null;
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}
const tehranIso = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(d);
const todayIso = () => tehranIso();
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
/** Date only (YYYY-MM-DD) or SQLite UTC datetime → Jalali text. */
function jdate(v, { long = false, time = false } = {}) {
  if (!v) return '';
  let iso = v;
  let hm = '';
  if (v.length > 10) {
    const d = new Date(v.replace(' ', 'T') + 'Z');
    iso = tehranIso(d);
    hm = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  }
  const [y, m, d] = isoToJ(iso);
  const s = long ? `${faDigits(d)} ${J_MONTHS[m - 1]} ${faDigits(y)}` : faDigits(`${y}/${pad(m)}/${pad(d)}`);
  return time && hm ? `${s}، ساعت ${hm}` : s;
}
const jInput = (iso) => (iso ? faDigits(isoToJ(iso).map((x, i) => (i ? pad(x) : x)).join('/')) : '');
function relDays(iso) {
  const n = daysBetween(todayIso(), iso);
  if (n === 0) return 'امروز';
  if (n === 1) return 'فردا';
  if (n === -1) return 'دیروز';
  return n > 0 ? `${fa(n)} روز دیگر` : `${fa(-n)} روز گذشته`;
}

/* ---------- icons (inline, stroke-based) */
const ICONS = {
  home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
  box: '<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/><path d="m4 8.5 8 4.5 8-4.5M12 13v7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M4 13.5 6.5 6h11l2.5 7.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13.5h5l1 2h4l1-2h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  in: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19h14"/>',
  out: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 19h14"/>',
  loan: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  transfer: '<path d="M4 8h12M12 4l4 4-4 4M20 16H8M12 12l-4 4 4 4"/>',
  adjust: '<path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  archive: '<path d="M4 5h16v4H4zM5.5 9v10h13V9M10 13h4"/>',
  printer: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m9 6 6 6-6 6"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5M16 5.5a3.5 3.5 0 0 1 0 6.5M21 20c-.3-2.5-1.6-4.2-3.5-5"/>',
  warehouse: '<path d="M3 9.5 12 4l9 5.5V20H3z"/><path d="M7 20v-7h10v7M7 16h10"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  megaphone: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
  shield: '<path d="M12 3.5 19 6v6c0 4-3 7.5-7 8.5-4-1-7-4.5-7-8.5V6z"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4.5l3 2"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
  logout: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>',
  alert: '<path d="M12 4 21 19H3z"/><path d="M12 10v4M12 16.5v.5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="m9.5 8.5 5 7"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5l-8.5 8.5a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5 17 4"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- API */
async function api(method, url, body) {
  const res = await fetch(apiUrl(url), {
    method, credentials: 'same-origin',
    headers: { 'X-WP-Nonce': A.nonce, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  const msg = data?.message || data?.error;
  if ((res.status === 401 || data?.code === 'rest_cookie_invalid_nonce') && !url.endsWith('/login')) {
    // Session ended or the security token expired: a reload fetches a fresh one (or shows the login form).
    if (state.user) { location.reload(); }
    else renderLogin();
    throw new Error(msg || 'لطفاً دوباره وارد شوید.');
  }
  if (!res.ok) throw new Error(msg || 'ارتباط با سرور برقرار نشد.');
  return data;
}
const GET = (u) => api('GET', u);
const POST = (u, b) => api('POST', u, b || {});
const PUT = (u, b) => api('PUT', u, b || {});

function toast(msg, { error = false, link = null, linkText = '' } = {}) {
  const el = document.createElement('div');
  el.className = `toast${error ? ' err' : ''}`;
  el.innerHTML = `<span>${esc(msg)}</span>${link ? `<a href="${esc(link)}">${esc(linkText)}</a>` : ''}`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), error ? 6000 : 4500);
}

/** Read a form into an object. Jalali date inputs (data-jdate) become ISO dates. */
function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') {
      if (el.dataset.multi) { (out[el.name] ||= []); if (el.checked) out[el.name].push(el.value); } else out[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; } else if (el.dataset.jdate != null) {
      const v = el.value.trim();
      if (!v) out[el.name] = '';
      else {
        const iso = jToIso(v);
        if (!iso) throw new Error(`تاریخ «${el.dataset.label || ''}» درست نیست. نمونه: ۱۴۰۵/۰۷/۲۰`);
        out[el.name] = iso;
      }
    } else if (el.dataset.num != null) out[el.name] = toEn(el.value).trim();
    else out[el.name] = el.value;
  }
  return out;
}

/** Wire a form: submit handler gets data; errors show inline; button disables while working. */
function onSubmit(form, handler) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    const errBox = $('.form-error', form);
    if (errBox) errBox.hidden = true;
    try {
      if (btn) btn.disabled = true;
      await handler(readForm(form));
    } catch (err) {
      if (errBox) { errBox.textContent = err.message; errBox.hidden = false; errBox.scrollIntoView({ block: 'nearest' }); } else toast(err.message, { error: true });
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

/* ---------- form fragments */
const field = (label, inner, hint = '') => `<div class="field"><label>${label}</label>${inner}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
const input = (name, { value = '', type = 'text', placeholder = '', required = false, attrs = '' } = {}) =>
  `<input class="input" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs}>`;
const numInput = (name, { value = '', placeholder = '', required = true, unit = '' } = {}) => {
  const inp = `<input class="input" name="${name}" inputmode="decimal" autocomplete="off" data-num value="${esc(value === '' ? '' : faDigits(value))}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>`;
  return unit ? `<div class="with-unit">${inp}<span>${esc(unit)}</span></div>` : inp;
};
const dateInput = (name, label, iso = '', { quick = null, required = false } = {}) => {
  const chips = quick ? `<div class="chips" data-quick-for="${name}">${quick.map(([d, t]) => `<button type="button" class="chip" data-days="${d}">${t}</button>`).join('')}</div>` : '';
  return field(label, `<input class="input" name="${name}" data-jdate data-label="${esc(label)}" inputmode="numeric" placeholder="مثلاً ${faDigits(jInput(todayIso()))}" value="${esc(jInput(iso))}" ${required ? 'required' : ''}>${chips}`);
};
const select = (name, options, value, { attrs = '', empty = null } = {}) =>
  `<select class="input" name="${name}" ${attrs}>${empty != null ? `<option value="">${esc(empty)}</option>` : ''}${options.map(([v, t]) =>
    `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
const textarea = (name, { value = '', placeholder = '', required = false } = {}) =>
  `<textarea class="input" name="${name}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>${esc(value)}</textarea>`;
const radioChips = (name, options, value) => `<div class="chips" role="radiogroup">${options.map(([v, t]) =>
  `<label class="chip ${v === value ? 'on' : ''}"><input type="radio" name="${name}" value="${esc(v)}" ${v === value ? 'checked' : ''} hidden>${esc(t)}</label>`).join('')}</div>`;
function wireChips(root) {
  $$('.chips[role=radiogroup]', root).forEach((g) => g.addEventListener('change', () => {
    $$('label.chip', g).forEach((l) => l.classList.toggle('on', $('input', l).checked));
  }));
  $$('[data-quick-for]', root).forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('[data-days]');
    if (!b) return;
    $(`[name="${g.dataset.quickFor}"]`, root).value = jInput(addDays(todayIso(), Number(b.dataset.days)));
  }));
}

/* ---------- sheet (drawer/dialog) */
function sheet(title, html, mount) {
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="بستن">${icon('x')}</button></div>
    <div class="sheet-body">${html}</div></div>`;
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  wireChips(back);
  mount?.(back, close);
  setTimeout(() => $('input:not([type=hidden]):not([hidden]), select, textarea', back)?.focus({ preventScroll: true }), 50);
  return close;
}

/* ---------- labels */
const CONDITION = { ok: ['سالم', 'ok'], broken: ['خراب', 'bad'], repair: ['نیازمند تعمیر', 'warn'] };
const condPill = (c) => (c && c !== 'ok' ? `<span class="pill ${CONDITION[c][1]}">${CONDITION[c][0]}</span>` : '');
const reasonLabel = (r) => state.boot?.reasons?.[r] || r;
const REQ_STATUS = { pending: ['در انتظار بررسی', 'warn'], approved: ['تأیید شده', 'info'], rejected: ['رد شده', 'bad'], delivered: ['تحویل شد', 'ok'], cancelled: ['لغو شده', ''] };
const REQ_KIND = { use: 'دریافت وسیله', loan: 'امانت', supply: 'تأمین کالا' };
const TR_STATUS = { pending: ['در حال انتقال', 'warn'], received: ['دریافت شد', 'ok'], rejected: ['رد شد', 'bad'], cancelled: ['لغو شد', ''] };
const pill = ([t, c]) => `<span class="pill ${c}">${t}</span>`;
function stockPill(i) {
  if (i.qty <= 0) return '<span class="pill bad">تمام شده</span>';
  if (i.min_qty > 0 && i.qty <= i.min_qty) return '<span class="pill warn">کمبود</span>';
  return '';
}
function expiryPill(iso) {
  if (!iso) return '';
  const d = daysBetween(todayIso(), iso);
  if (d < 0) return `<span class="pill bad">منقضی</span>`;
  if (d <= 30) return `<span class="pill warn">انقضا ${relDays(iso)}</span>`;
  if (d <= 60) return `<span class="pill brass">انقضا ${jdate(iso)}</span>`;
  return '';
}
const whName = (id) => state.boot.warehouses.find((w) => w.id === Number(id))?.name || '';
const canEditWh = (id) => state.user.role === 'admin' || state.user.managed.includes(Number(id));
const editableWarehouses = () => state.boot.warehouses.filter((w) => !w.archived && canEditWh(w.id));
const isManager = () => state.user.role === 'admin' || state.user.managed.length > 0;
const thumb = (url) => (url ? `<img class="thumb" src="${esc(url)}" alt="" loading="lazy">` : `<span class="thumb">${icon('box')}</span>`);

/* ================================================================ shell */
const NAV = [
  ['#/', 'home', 'خانه'],
  ['#/items', 'box', 'کالاها'],
  ['#/requests', 'inbox', 'درخواست‌ها'],
  ['#/loans', 'loan', 'امانت‌ها'],
  ['#/transfers', 'truck', 'انتقال‌ها'],
  ['#/reports', 'chart', 'گزارش‌ها'],
  ['#/announcements', 'megaphone', 'اطلاعیه‌ها'],
  ['#/notifications', 'bell', 'اعلان‌ها'],
];
const ADMIN_NAV = [
  ['#/admin/users', 'users', 'کاربران'],
  ['#/admin/warehouses', 'warehouse', 'انبارها و مدیران'],
  ['#/admin/backup', 'database', 'پشتیبان‌گیری'],
  ['#/admin/audit', 'history', 'سوابق تغییرات'],
];

function renderShell() {
  const admin = state.user.role === 'admin';
  $('#app').innerHTML = `<div class="shell">
    <header class="topbar">
      <a class="brand" href="#/"><img src="${LOGO}" alt=""><span><b>انبار شباب</b><small>${esc(ORG)} · ${esc(ORG_SUB)}</small></span></a>
      <a class="icon-btn" href="#/notifications" aria-label="اعلان‌ها">${icon('bell')}<span class="badge-dot" id="unread" hidden></span></a>
    </header>
    <nav class="sidebar" aria-label="منوی اصلی">
      ${editableWarehouses().length ? `<button class="btn brass cta" data-quick>${icon('plus')} ثبت ورود یا خروج</button>` : ''}
      ${NAV.map(([h, i, t]) => `<a href="${h}" data-nav="${h}">${icon(i)}${t}</a>`).join('')}
      ${admin ? `<div class="sep">مدیریت کل</div>${ADMIN_NAV.map(([h, i, t]) => `<a href="${h}" data-nav="${h}">${icon(i)}${t}</a>`).join('')}` : ''}
      <div class="sep">حساب</div>
      <a href="#/account" data-nav="#/account">${icon('user')}${esc(state.user.full_name)}</a>
    </nav>
    <main class="main" id="main"></main>
    <nav class="bottomnav" aria-label="منوی پایین">
      <a href="#/" data-nav="#/">${icon('home')}<span>خانه</span></a>
      <a href="#/items" data-nav="#/items">${icon('box')}<span>کالاها</span></a>
      ${editableWarehouses().length
    ? `<button class="plus" data-quick><span class="fab">${icon('plus')}</span><span>ثبت</span></button>`
    : `<a href="#/requests?new=1" class="plus"><span class="fab">${icon('plus')}</span><span>درخواست</span></a>`}
      <a href="#/requests" data-nav="#/requests">${icon('inbox')}<span>درخواست‌ها</span></a>
      <a href="#/more" data-nav="#/more">${icon('menu')}<span>بیشتر</span></a>
    </nav>
  </div>`;
  $$('[data-quick]').forEach((b) => b.addEventListener('click', quickOp));
  updateUnread();
}

function updateUnread() {
  const el = $('#unread');
  if (!el) return;
  el.hidden = !state.unread;
  el.textContent = state.unread > 99 ? '۹۹+' : fa(state.unread);
}
async function refreshUnread() {
  if (!state.user) return;
  try { const me = await GET('/api/me'); state.unread = me.unread; updateUnread(); } catch { /* offline */ }
}

/** "+" button: pick an item you manage, then the operation. */
function quickOp() {
  sheet('ثبت سریع', `
    <div class="searchbox">${icon('search')}<input class="input" id="qo-q" placeholder="نام، کد یا سریال کالا…" autocomplete="off"></div>
    <div class="list" id="qo-list" style="margin-top:8px"><p class="empty">نام کالا را بنویسید.</p></div>
    <p class="hint" style="margin-top:10px;color:var(--muted);font-size:.8rem">فقط کالاهای انبارهایی که مدیرشان هستید نمایش داده می‌شود. <a href="#/items/new" data-close>ثبت کالای جدید</a></p>`,
  (root, close) => {
    let timer;
    const search = async () => {
      const q = $('#qo-q', root).value.trim();
      const rows = (await GET(`/api/items?q=${encodeURIComponent(q)}`)).filter((i) => i.can_edit).slice(0, 25);
      $('#qo-list', root).innerHTML = rows.length ? rows.map((i) => `
        <div class="row"><div class="grow"><span class="title">${esc(i.name)}</span><span class="meta">${esc(i.warehouse)} · ${qtyHtml(i.qty, i.unit)}</span></div>
          <div class="btns"><a class="btn sm ghost" href="#/items/${i.id}?do=in" data-close>ورود</a><a class="btn sm ghost" href="#/items/${i.id}?do=out" data-close>خروج</a></div></div>`).join('')
        : '<p class="empty">کالایی پیدا نشد.</p>';
    };
    $('#qo-q', root).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
    search();
  });
}

/* ================================================================ router */
const ROUTES = [
  [/^\/$/, pageDashboard],
  [/^\/items$/, pageItems],
  [/^\/items\/new$/, (p, q) => pageItemForm(null, q)],
  [/^\/items\/(\d+)\/edit$/, (p) => pageItemForm(Number(p[1]))],
  [/^\/items\/(\d+)$/, (p, q, m) => pageItem(Number(p[1]), q, m)],
  [/^\/receipt\/(\d+)$/, (p, q, m) => pageReceipt(Number(p[1]), q, m)],
  [/^\/loans$/, pageLoans],
  [/^\/transfers$/, pageTransfers],
  [/^\/requests$/, pageRequests],
  [/^\/notifications$/, pageNotifications],
  [/^\/announcements$/, pageAnnouncements],
  [/^\/reports$/, pageReports],
  [/^\/more$/, pageMore],
  [/^\/account$/, pageAccount],
  [/^\/admin\/users$/, pageUsers],
  [/^\/admin\/warehouses$/, pageWarehouses],
  [/^\/admin\/backup$/, pageBackup],
  [/^\/admin\/audit$/, pageAudit],
];

function parseHash() {
  const h = location.hash.slice(1) || '/';
  const [path, qs = ''] = h.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}
const setQuery = (path, q) => {
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== '' && v != null)).toString();
  history.replaceState(null, '', `#${path}${qs ? '?' + qs : ''}`);
};

async function route() {
  if (!state.user) return;
  document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
  if (state.user.must_change_pw) return pageForcePassword();
  if (!$('#main')) renderShell();
  const { path, query } = parseHash();
  $$('[data-nav]').forEach((a) => {
    const n = a.dataset.nav;
    a.classList.toggle('on', n === '#/' ? path === '/' : ('#' + path).startsWith(n));
  });
  const main = $('#main');
  const hit = ROUTES.find(([re]) => re.test(path));
  if (!hit) { main.innerHTML = '<p class="empty">صفحه پیدا نشد.</p>'; return; }
  main.innerHTML = '<p class="empty">در حال بارگذاری…</p>';
  try {
    await hit[1](path.match(hit[0]), query, main);
  } catch (e) {
    main.innerHTML = `<div class="card"><p class="form-error">${esc(e.message)}</p></div>`;
  }
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);
const reload = () => route();

/* ================================================================ login */
function renderLogin() {
  $('#app').innerHTML = `<div class="login"><form class="login-card card" id="login" autocomplete="on">
    <div class="login-head"><img src="${LOGO}" alt=""><h1>سامانه انبار</h1>
      <span class="org">${esc(ORG)}<br>${esc(ORG_SUB)}</span></div>
    ${A.wpUser ? `<p class="callout">حساب «${esc(A.wpUser)}» به سامانه انبار دسترسی ندارد. با حساب دیگری وارد شوید یا از مدیر کل دسترسی بگیرید.</p>` : ''}
    <p class="form-error" hidden></p>
    ${field('نام کاربری', input('username', { required: true, attrs: 'autocomplete="username" autocapitalize="off" dir="ltr"' }))}
    ${field('رمز عبور', input('password', { type: 'password', required: true, attrs: 'autocomplete="current-password" dir="ltr"' }))}
    <button class="btn block" type="submit">ورود</button>
    <p class="login-note">ثبت‌نام عمومی وجود ندارد. حساب کاربری را مدیر کل می‌سازد.</p>
  </form></div>`;
  onSubmit($('#login'), async (d) => {
    await POST('/api/login', { username: toEn(d.username), password: d.password });
    location.reload();
  });
}

function pageForcePassword() {
  $('#app').innerHTML = `<div class="login"><form class="login-card card" id="pw">
    <div class="login-head"><img src="${LOGO}" alt=""><h1>تعیین رمز جدید</h1>
      <span class="org">${esc(state.user.full_name)}، برای امنیت حساب، رمز عبور شخصی خودتان را تعیین کنید.</span></div>
    <p class="form-error" hidden></p>
    ${field('رمز فعلی (رمزی که به شما داده شده)', input('current', { type: 'password', required: true, attrs: 'autocomplete="current-password" dir="ltr"' }))}
    ${field('رمز جدید', input('password', { type: 'password', required: true, attrs: 'autocomplete="new-password" dir="ltr" minlength="6"' }), 'حداقل ۶ کاراکتر')}
    ${field('تکرار رمز جدید', input('password2', { type: 'password', required: true, attrs: 'autocomplete="new-password" dir="ltr"' }))}
    <button class="btn block" type="submit">ذخیره و ادامه</button>
    <button class="btn ghost block" type="button" id="lo">خروج</button>
  </form></div>`;
  $('#lo').onclick = logout;
  onSubmit($('#pw'), async (d) => {
    if (d.password !== d.password2) throw new Error('تکرار رمز با رمز جدید یکسان نیست.');
    await POST('/api/me/password', d);
    location.hash = '#/';
    location.reload();
  });
}

async function logout() {
  try { await POST('/api/logout'); } catch { /* ignore */ }
  location.hash = '#/';
  location.reload();
}

/* ================================================================ dashboard */
async function pageDashboard(_, __, main) {
  const d = await GET('/api/dashboard');
  const t = todayIso();
  const overdue = d.loans.filter((l) => l.due_date && l.due_date < t);
  const myIncoming = d.transfers.filter((tr) => canEditWh(tr.to_wh));
  const pendingReq = d.requests.filter((r) => r.status === 'pending');
  const outCount = d.shortages.filter((i) => i.qty <= 0).length;
  const expSoon = d.expiring.filter((b) => daysBetween(t, b.expiry) <= 30);
  main.innerHTML = `
    <div class="page-head"><div><h1>سلام، ${esc(state.user.full_name)}</h1><span class="sub">${jdate(t, { long: true })}</span></div>
      ${isManager() ? '' : `<a class="btn" href="#/requests?new=1">${icon('plus')} ثبت درخواست</a>`}</div>
    <div class="stats">
      <a class="stat ${d.shortages.length - outCount ? 'warn' : ''}" href="#/items?status=low"><b>${fa(d.shortages.length - outCount)}</b><span>کمبود</span></a>
      <a class="stat ${outCount ? 'alert' : ''}" href="#/items?status=out"><b>${fa(outCount)}</b><span>تمام‌شده</span></a>
      <a class="stat ${pendingReq.length ? 'warn' : ''}" href="#/requests"><b>${fa(pendingReq.length)}</b><span>درخواست در انتظار</span></a>
      <a class="stat ${overdue.length ? 'alert' : ''}" href="#/loans"><b>${fa(d.loans.length)}</b><span>امانت باز${overdue.length ? ` · ${fa(overdue.length)} با تأخیر` : ''}</span></a>
      <a class="stat ${myIncoming.length ? 'warn' : ''}" href="#/transfers"><b>${fa(d.transfers.length)}</b><span>در حال انتقال</span></a>
      <a class="stat ${expSoon.length ? 'alert' : ''}" href="#/items?status=expiring"><b>${fa(d.expiring.length)}</b><span>نزدیک انقضا</span></a>
    </div>
    ${d.announcements.map((a) => `<div class="card announce"><h3>${esc(a.title)}${a.pinned ? ' <span class="pill brass">سنجاق‌شده</span>' : ''}</h3><p class="body">${esc(a.body)}</p>
      <p class="meta">${esc(a.author)} · ${jdate(a.created_at)}</p></div>`).join('')}
    ${myIncoming.length ? `<div class="card"><h2>منتظر تأیید دریافت شما <a href="#/transfers">همه</a></h2><div class="list">
      ${myIncoming.map((tr) => `<a class="row" href="#/transfers"><span class="grow"><span class="title">${esc(tr.item_name)}</span>
        <span class="meta">از ${esc(tr.from_name)} به ${esc(tr.to_name)} · ${jdate(tr.sent_at)}</span></span>${qtyHtml(tr.qty, tr.unit)}</a>`).join('')}</div></div>` : ''}
    <div class="grid-2">
      <div class="card"><h2>کمبودها <a href="#/items?status=low">همه</a></h2><div class="list">
        ${d.shortages.slice(0, 8).map((i) => `<a class="row" href="#/items/${i.id}"><span class="grow"><span class="title">${esc(i.name)}</span>
          <span class="meta">${esc(i.warehouse)} · حداقل ${fa(i.min_qty)} ${esc(i.unit)}</span></span>
          <span class="end">${qtyHtml(i.qty, i.unit)}${stockPill(i)}</span></a>`).join('') || '<p class="empty">کمبودی ثبت نشده است.</p>'}</div></div>
      <div class="card"><h2>درخواست‌های باز <a href="#/requests">همه</a></h2><div class="list">
        ${d.requests.slice(0, 8).map((r) => `<a class="row" href="#/requests"><span class="grow"><span class="title">${esc(r.item_name)} · ${fa(r.qty)} ${esc(r.unit || '')}</span>
          <span class="meta">${esc(r.requester)} · ${esc(r.warehouse)}${r.needed_by ? ` · تا ${jdate(r.needed_by)}` : ''}</span></span>${pill(REQ_STATUS[r.status])}</a>`).join('') || '<p class="empty">درخواست بازی نیست.</p>'}</div></div>
      <div class="card"><h2>امانت‌های باز <a href="#/loans">همه</a></h2><div class="list">
        ${d.loans.slice(0, 8).map((l) => `<a class="row" href="#/loans"><span class="grow"><span class="title">${esc(l.item_name)}</span>
          <span class="meta">${esc(l.borrower)}${l.program ? ` · ${esc(l.program)}` : ''} · ${esc(l.warehouse)}</span></span>
          <span class="end">${qtyHtml(l.qty - l.returned_qty, l.unit)}${loanDuePill(l)}</span></a>`).join('') || '<p class="empty">امانت بازی نیست.</p>'}</div></div>
      <div class="card"><h2>نزدیک به انقضا <a href="#/items?status=expiring">همه</a></h2><div class="list">
        ${d.expiring.slice(0, 8).map((b) => `<a class="row" href="#/items/${b.item_id}"><span class="grow"><span class="title">${esc(b.item_name)}</span>
          <span class="meta">${esc(b.warehouse)} · سری ${esc(b.batch_no)} · ${jdate(b.expiry)}</span></span>
          <span class="end">${qtyHtml(b.qty, b.unit)}${expiryPill(b.expiry)}</span></a>`).join('') || '<p class="empty">قلم نزدیک به انقضا نیست.</p>'}</div></div>
    </div>
    <section class="section"><h2>انبارها</h2><div class="wh-grid">
      ${d.warehouses.map((w) => `<a class="wh" href="#/items?warehouse=${w.id}"><b>${esc(w.name)}</b>
        <span class="meta">${fa(w.item_count)} قلم · ${w.managers.length ? 'مدیر: ' + w.managers.map((m) => esc(m.full_name)).join('، ') : 'بدون مدیر'}</span>
        <span class="pills">${w.out_count ? `<span class="pill bad">${fa(w.out_count)} تمام‌شده</span>` : ''}${w.low_count ? `<span class="pill warn">${fa(w.low_count)} کمبود</span>` : ''}
          ${w.loan_count ? `<span class="pill info">${fa(w.loan_count)} امانت</span>` : ''}${w.incoming_count ? `<span class="pill brass">${fa(w.incoming_count)} انتقال ورودی</span>` : ''}
          ${canEditWh(w.id) ? '<span class="pill brand">مدیر هستید</span>' : ''}</span></a>`).join('')}</div></section>
    <div class="card"><h2>آخرین عملیات <a href="#/reports?kind=transactions">گزارش کامل</a></h2><div class="list">${d.recent.map(txRow).join('') || '<p class="empty">هنوز عملیاتی ثبت نشده است.</p>'}</div></div>`;
}

function loanDuePill(l) {
  if (l.status === 'closed') return '<span class="pill">بسته</span>';
  if (!l.due_date) return '';
  const n = daysBetween(todayIso(), l.due_date);
  if (n < 0) return `<span class="pill bad">${fa(-n)} روز تأخیر</span>`;
  if (n <= 2) return `<span class="pill warn">موعد ${relDays(l.due_date)}</span>`;
  return `<span class="pill">تا ${jdate(l.due_date)}</span>`;
}

function txRow(t) {
  const cls = t.direction === 'in' ? 'delta-in' : t.direction === 'out' ? 'delta-out' : 'delta-adj';
  const sign = t.delta > 0 ? '+' : '−';
  return `<a class="row" href="#/receipt/${t.id}"><span class="grow"><span class="title">${esc(t.item_name)} <span class="pill">${esc(reasonLabel(t.reason))}</span></span>
    <span class="meta">${jdate(t.op_date)} · ${esc(t.warehouse)} · ${esc(t.recorder)}${t.party ? ` · طرف: ${esc(t.party)}` : ''}</span></span>
    <span class="end"><span class="qty num ${cls}">${sign}${fa(Math.abs(t.delta))}<small>${esc(t.unit)}</small></span><span class="meta">مانده ${fa(t.qty_after)}</span></span></a>`;
}

/* ================================================================ items list */
async function pageItems(_, q, main) {
  const whs = state.boot.warehouses.filter((w) => !w.archived);
  const statuses = [['', 'همه'], ['low', 'کمبود'], ['out', 'تمام‌شده'], ['loaned', 'در امانت'], ['expiring', 'نزدیک انقضا']];
  main.innerHTML = `
    <div class="page-head"><h1>کالاها و تجهیزات</h1>
      ${editableWarehouses().length ? `<a class="btn" href="#/items/new${q.warehouse && canEditWh(q.warehouse) ? '?warehouse=' + q.warehouse : ''}">${icon('plus')} کالای جدید</a>` : ''}</div>
    <form class="filters" id="f">
      <div class="searchbox">${icon('search')}<input class="input" name="q" value="${esc(q.q || '')}" placeholder="جست‌وجوی نام، کد، برند، سریال یا محل…" autocomplete="off" type="search"></div>
      <div class="filter-row">
        ${select('warehouse', whs.map((w) => [w.id, w.name]), q.warehouse, { empty: 'همه انبارها' })}
        ${select('condition', Object.entries(state.boot.conditions), q.condition, { empty: 'هر وضعیتی' })}
        ${select('category', state.boot.categories.map((c) => [c, c]), q.category, { empty: 'همه دسته‌ها' })}
        ${select('location', state.boot.locations.map((c) => [c, c]), q.location, { empty: 'همه محل‌ها' })}
        ${select('archived', [['1', 'بایگانی‌شده‌ها']], q.archived, { empty: 'کالاهای فعال' })}
      </div>
      <div class="filter-row">${statuses.map(([v, t]) => `<button type="button" class="chip ${String(q.status || '') === v ? 'on' : ''}" data-status="${v}">${t}</button>`).join('')}</div>
    </form>
    <div id="results"><p class="empty">در حال جست‌وجو…</p></div>`;
  const f = $('#f');
  let status = q.status || '';
  let timer;
  const load = async () => {
    const d = Object.fromEntries(new FormData(f));
    d.status = status;
    setQuery('/items', d);
    const rows = await GET('/api/items?' + new URLSearchParams(d));
    $('#results').innerHTML = rows.length ? `<p class="sub" style="color:var(--muted);font-size:.84rem;margin-bottom:8px">${fa(rows.length)} قلم</p><div class="items">${rows.map((i) => `
      <a class="item-card" href="#/items/${i.id}">${thumb(i.image_url)}
        <span class="grow" style="flex:1;min-width:0"><span class="title" style="font-weight:700;display:block">${esc(i.name)}</span>
          <span class="meta" style="color:var(--muted);font-size:.8rem;display:block">${esc(i.warehouse)}${i.location ? ' · ' + esc(i.location) : ''} · کد ${esc(faDigits(i.code))}</span>
          <span class="pills" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${stockPill(i)}${condPill(i.condition)}
            ${i.loaned_qty > 0 ? `<span class="pill info">${fa(i.loaned_qty)} در امانت</span>` : ''}
            ${i.transit_qty > 0 ? `<span class="pill brass">${fa(i.transit_qty)} در حال انتقال</span>` : ''}${expiryPill(i.next_expiry)}</span></span>
        <span class="end">${qtyHtml(i.qty, i.unit)}</span></a>`).join('')}</div>`
      : '<div class="card"><p class="empty">کالایی با این مشخصات پیدا نشد.</p></div>';
  };
  f.addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(load, e.target.name === 'q' ? 300 : 0); });
  f.addEventListener('submit', (e) => { e.preventDefault(); load(); });
  $$('[data-status]', f).forEach((b) => b.addEventListener('click', () => {
    status = b.dataset.status;
    $$('[data-status]', f).forEach((x) => x.classList.toggle('on', x === b));
    load();
  }));
  await load();
}

/* ================================================================ item form */
async function pageItemForm(id, q = {}) {
  const main = $('#main');
  const item = id ? await GET(`/api/items/${id}`) : null;
  if (item && !item.can_edit) throw new Error('فقط مدیر این انبار می‌تواند کالا را ویرایش کند.');
  const whs = editableWarehouses();
  if (!whs.length) throw new Error('شما مدیر هیچ انباری نیستید.');
  const whId = item?.warehouse_id || Number(q.warehouse) || whs[0].id;
  const wh = state.boot.warehouses.find((w) => w.id === whId);
  const v = item || { unit: 'عدد', condition: 'ok', min_qty: 0, batch_tracked: wh?.tracks_expiry };
  main.innerHTML = `
    <a class="back" href="${item ? `#/items/${item.id}` : '#/items'}">${icon('back')} بازگشت</a>
    <h1>${item ? 'ویرایش کالا' : 'ثبت کالای جدید'}</h1>
    <form class="card form" id="itemf">
      <p class="form-error" hidden></p>
      ${item ? `<div class="field"><span class="label">انبار</span><span>${esc(item.warehouse)}</span><span class="hint">برای جابه‌جایی بین انبارها از «انتقال» استفاده کنید.</span></div>`
    : field('انبار', select('warehouse_id', whs.map((w) => [w.id, w.name]), whId))}
      ${field('نام کالا', input('name', { value: v.name, required: true, placeholder: 'مثلاً کابل برق ۲.۵ یا دوربین کانن' }))}
      <div class="form-row">
        ${field('کد کالا', input('code', { value: v.code ? faDigits(v.code) : '', placeholder: 'خالی بگذارید تا خودکار ساخته شود', attrs: 'dir="ltr"' }))}
        ${field('دسته‌بندی', input('category', { value: v.category, attrs: 'list="dl-cat"', placeholder: 'مثلاً صوتی، برقی، خوراکی' }))}
      </div>
      <div class="form-row">
        ${field('محل دقیق نگهداری', input('location', { value: v.location, attrs: 'list="dl-loc"', placeholder: 'مثلاً قفسه ۳، طبقه دوم' }))}
        ${field('واحد', input('unit', { value: v.unit, required: true, attrs: 'list="dl-unit"' }), 'عدد، متر، کیلوگرم، لیتر، بسته، جلد…')}
      </div>
      <div class="form-row">
        ${field('حداقل موجودی موردنیاز', numInput('min_qty', { value: v.min_qty || '', required: false, placeholder: '۰', unit: '' }), 'وقتی موجودی به این مقدار برسد، اعلان کمبود ارسال می‌شود.')}
        <div class="field"><span class="label">وضعیت</span>${radioChips('condition', Object.entries(state.boot.conditions), v.condition)}</div>
      </div>
      ${!item ? `<div class="form-row">${field('موجودی اولیه', numInput('opening_qty', { required: false, placeholder: '۰' }), 'به‌صورت یک «ورود» در سابقه ثبت می‌شود. اعشار مجاز است، مثل ۱۲٫۵')}</div>` : ''}
      <label class="check"><input type="checkbox" name="batch_tracked" ${v.batch_tracked ? 'checked' : ''}> ثبت موجودی به‌تفکیک سری و تاریخ انقضا (دارو، مواد غذایی)</label>
      ${!item ? `<div class="form-row" id="batch-fields">${field('شماره سری موجودی اولیه', input('batch_no', { attrs: 'dir="ltr"' }))}
        ${dateInput('expiry', 'تاریخ انقضا')}</div>` : ''}
      <details class="more" ${v.brand || v.model || v.serial ? 'open' : ''}><summary>برند، مدل و شماره سریال</summary>
        <div class="form-row">${field('برند', input('brand', { value: v.brand }))}${field('مدل', input('model', { value: v.model }))}</div>
        <div style="margin-top:14px">${field('شماره سریال', input('serial', { value: v.serial, attrs: 'dir="ltr"' }))}</div>
      </details>
      <div class="field"><span class="label">تصویر</span>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <span id="img-prev">${item?.image_url ? `<img class="thumb" style="width:72px;height:72px" src="${esc(item.image_url)}" alt="">` : `<span class="thumb" style="width:72px;height:72px">${icon('image')}</span>`}</span>
          <label class="btn ghost sm">${icon('image')} انتخاب یا گرفتن عکس<input type="file" accept="image/*" capture="environment" id="img" hidden></label>
          ${item?.image_url ? '<label class="check"><input type="checkbox" name="remove_image"> حذف تصویر</label>' : ''}
        </div></div>
      ${field('توضیحات تکمیلی', textarea('notes', { value: v.notes }))}
      <div class="btns"><button class="btn" type="submit">${item ? 'ذخیره تغییرات' : 'ثبت کالا'}</button>
        <a class="btn ghost" href="${item ? `#/items/${item.id}` : '#/items'}">انصراف</a></div>
    </form>
    <datalist id="dl-cat">${state.boot.categories.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    <datalist id="dl-loc">${state.boot.locations.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    <datalist id="dl-unit">${state.boot.units.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`;
  const f = $('#itemf');
  wireChips(f);
  let imageData = null;
  $('#img').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      imageData = await resizeImage(file);
      $('#img-prev').innerHTML = `<img class="thumb" style="width:72px;height:72px" src="${imageData}" alt="">`;
    } catch { toast('این تصویر قابل خواندن نیست.', { error: true }); }
  });
  const syncBatch = () => {
    const on = $('[name=batch_tracked]', f).checked;
    const bf = $('#batch-fields');
    if (bf) bf.hidden = !on;
  };
  $('[name=batch_tracked]', f).addEventListener('change', syncBatch);
  const whSel = $('[name=warehouse_id]', f);
  whSel?.addEventListener('change', () => {
    const w = state.boot.warehouses.find((x) => x.id === Number(whSel.value));
    $('[name=batch_tracked]', f).checked = !!w?.tracks_expiry;
    syncBatch();
  });
  syncBatch();
  onSubmit(f, async (d) => {
    d.code = toEn(d.code).trim();
    d.serial = toEn(d.serial);
    if (imageData) d.image_data = imageData;
    if (item) {
      await PUT(`/api/items/${item.id}`, d);
      toast('تغییرات ذخیره شد.');
      location.hash = `#/items/${item.id}`;
    } else {
      const r = await POST('/api/items', d);
      await loadBoot();
      toast('کالا ثبت شد.');
      location.hash = `#/items/${r.id}`;
    }
  });
}

function resizeImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ================================================================ item detail */
async function pageItem(id, q, main) {
  const i = await GET(`/api/items/${id}`);
  const openLoans = i.loans.filter((l) => l.status === 'open');
  main.innerHTML = `
    <a class="back" href="#/items?warehouse=${i.warehouse_id}">${icon('back')} ${esc(i.warehouse)}</a>
    <div class="card item-hero">
      ${i.image_url ? `<img class="item-photo" src="${esc(i.image_url)}" alt="${esc(i.name)}">` : `<div class="item-photo noimg">${icon('box')}</div>`}
      <div style="display:grid;gap:12px;min-width:0">
        <div><h1>${esc(i.name)}</h1>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${i.archived ? '<span class="pill">بایگانی</span>' : ''}${condPill(i.condition) || '<span class="pill ok">سالم</span>'}${stockPill(i)}
            ${i.batch_tracked ? '<span class="pill brass">تاریخ‌دار</span>' : ''}${i.category ? `<span class="pill">${esc(i.category)}</span>` : ''}</div></div>
        <div class="stock">
          <div class="main-stock"><b>${fa(i.qty)}</b><span>در انبار (${esc(i.unit)})</span></div>
          <div><b>${fa(i.loaned_qty)}</b><span>در امانت</span></div>
          ${i.transit_qty > 0 ? `<div><b>${fa(i.transit_qty)}</b><span>در حال انتقال</span></div>` : ''}
          <div><b>${fa(i.min_qty)}</b><span>حداقل لازم</span></div>
        </div>
        <dl class="specs">
          <dt>کد</dt><dd class="num">${esc(faDigits(i.code))}</dd>
          <dt>انبار</dt><dd>${esc(i.warehouse)}</dd>
          ${i.location ? `<dt>محل</dt><dd>${esc(i.location)}</dd>` : ''}
          ${i.brand ? `<dt>برند</dt><dd>${esc(i.brand)}</dd>` : ''}
          ${i.model ? `<dt>مدل</dt><dd>${esc(i.model)}</dd>` : ''}
          ${i.serial ? `<dt>سریال</dt><dd dir="ltr" style="text-align:right">${esc(i.serial)}</dd>` : ''}
          ${i.notes ? `<dt>توضیحات</dt><dd style="white-space:pre-line">${esc(i.notes)}</dd>` : ''}
        </dl>
      </div>
    </div>
    ${i.can_edit && !i.archived ? `<div class="actions">
      <button class="action in" data-op="in">${icon('in')}ورود</button>
      <button class="action out" data-op="out">${icon('out')}خروج</button>
      ${i.batch_tracked ? '' : `<button class="action loan" data-op="loan">${icon('loan')}امانت</button>`}
      <button class="action transfer" data-op="transfer">${icon('transfer')}انتقال</button>
      <button class="action adjust" data-op="adjust">${icon('adjust')}اصلاح موجودی</button>
      <a class="action" href="#/items/${i.id}/edit">${icon('edit')}ویرایش</a>
    </div>` : ''}
    ${!i.can_edit && !i.archived ? `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="color:var(--muted);font-size:.9rem">ثبت تغییرات این کالا با مدیر ${esc(i.warehouse)} است.</span>
      <a class="btn" href="#/requests?new=1&item=${i.id}">${icon('inbox')} درخواست این وسیله</a></div>` : ''}
    ${i.open_requests.length && i.can_edit ? `<div class="card"><h2>درخواست‌های باز این کالا</h2><div class="list">${i.open_requests.map((r) => `
      <div class="row"><span class="grow"><span class="title">${esc(r.requester)} · ${fa(r.qty)} ${esc(i.unit)} · ${REQ_KIND[r.kind]}</span><span class="meta">${esc(r.reason)}</span></span>
        ${pill(REQ_STATUS[r.status])}${r.kind !== 'supply' ? `<button class="btn sm" data-deliver="${r.id}" data-kind="${r.kind}" data-qty="${r.qty}" data-party="${esc(r.requester)}">تحویل</button>` : ''}</div>`).join('')}</div></div>` : ''}
    ${i.batch_tracked ? `<div class="card"><h2>سری‌ها و تاریخ انقضا</h2><div class="list">${i.batches.map((b, n) => `
      <div class="row"><span class="grow"><span class="title">سری ${esc(b.batch_no)} ${n === 0 ? '<span class="pill brand">اول مصرف شود</span>' : ''}</span>
        <span class="meta">انقضا: ${b.expiry ? jdate(b.expiry) + ' (' + relDays(b.expiry) + ')' : 'ندارد'}</span></span>
        <span class="end">${qtyHtml(b.qty, i.unit)}${expiryPill(b.expiry)}</span></div>`).join('') || '<p class="empty">سری دارای موجودی ثبت نشده است.</p>'}</div></div>` : ''}
    ${openLoans.length ? `<div class="card"><h2>امانت‌های باز</h2><div class="list">${openLoans.map((l) => loanRow({ ...l, unit: i.unit, item_name: i.name, can_edit: i.can_edit }, false)).join('')}</div></div>` : ''}
    ${i.transfers.length ? `<div class="card"><h2>انتقال‌ها</h2><div class="list">${i.transfers.slice(0, 6).map((t) => `
      <div class="row"><span class="grow"><span class="title">${esc(t.from_name)} ← ${esc(t.to_name)}</span><span class="meta">${jdate(t.sent_at)}</span></span>
        <span class="end">${qtyHtml(t.qty, i.unit)}${pill(TR_STATUS[t.status])}</span></div>`).join('')}</div></div>` : ''}
    <div class="card"><h2>سابقه عملیات <span style="font-size:.8rem;color:var(--muted);font-weight:500">${fa(i.history.length)} مورد</span></h2>
      <div class="list">${i.history.map((t) => `<div class="row" style="align-items:flex-start">
        <a class="grow" href="#/receipt/${t.id}" style="color:inherit"><span class="title">${esc(reasonLabel(t.reason))}${t.batch_alloc ? ` <span class="pill">سری ${JSON.parse(t.batch_alloc).map((a) => esc(a.batch_no)).join('، ')}</span>` : ''}${t.corrects_id ? ` <span class="pill info">اصلاح رسید ${fa(t.corrects_id)}</span>` : ''}</span>
          <span class="meta">${jdate(t.op_date)} · ${esc(t.recorder)}${t.party ? ` · طرف: ${esc(t.party)}` : ''}${t.note ? ` · ${esc(t.note)}` : ''}</span></a>
        <span class="end"><span class="qty num ${t.delta > 0 ? 'delta-in' : 'delta-out'}">${t.delta > 0 ? '+' : '−'}${fa(Math.abs(t.delta))}</span>
          <span class="meta">مانده ${fa(t.qty_after)}</span>
          ${i.can_edit && t.reason !== 'adjust' ? `<button class="btn sm ghost" data-correct="${t.id}">اصلاح</button>` : ''}</span></div>`).join('') || '<p class="empty">هنوز عملیاتی ثبت نشده است.</p>'}</div></div>
    ${i.can_edit ? `<div class="btns no-print">
      <button class="btn ghost sm" id="arch">${icon('archive')} ${i.archived ? 'خارج‌کردن از بایگانی' : 'بایگانی کالا'}</button>
      ${state.user.role === 'admin' ? `<a class="btn ghost sm" href="#/admin/audit?entity=item&entity_id=${i.id}">${icon('history')} سابقه ویرایش</a>` : ''}</div>` : ''}`;

  const ops = { in: opIn, out: opOut, loan: opLoan, transfer: opTransfer, adjust: opAdjust };
  $$('[data-op]', main).forEach((b) => b.addEventListener('click', () => ops[b.dataset.op](i)));
  $$('[data-correct]', main).forEach((b) => b.addEventListener('click', () => opAdjust(i, Number(b.dataset.correct))));
  $$('[data-return]', main).forEach((b) => b.addEventListener('click', () => opReturn(i.loans.find((l) => l.id === Number(b.dataset.return)), i.unit)));
  $$('[data-deliver]', main).forEach((b) => b.addEventListener('click', () => {
    const pre = { request_id: b.dataset.deliver, qty: b.dataset.qty, party: b.dataset.party };
    (b.dataset.kind === 'loan' ? opLoan : opOut)(i, pre);
  }));
  $('#arch')?.addEventListener('click', async () => {
    const want = !i.archived;
    if (want && !$('#arch').dataset.confirm) {
      $('#arch').dataset.confirm = '1';
      $('#arch').innerHTML = `${icon('archive')} برای بایگانی دوباره بزنید`;
      return;
    }
    try {
      await POST(`/api/items/${i.id}/archive`, { archived: want });
      toast(want ? 'کالا بایگانی شد؛ سابقه آن حفظ می‌شود.' : 'کالا دوباره فعال شد.');
      reload();
    } catch (e) { toast(e.message, { error: true }); }
  });
  if (q.do && ops[q.do] && i.can_edit) {
    setQuery(`/items/${i.id}`, {});
    const pre = q.req ? { request_id: q.req, qty: q.qty, party: q.party } : {};
    ops[q.do](i, pre);
  }
}

const done = (msg, txId) => toast(msg, txId ? { link: `#/receipt/${txId}`, linkText: 'رسید' } : {});

function opIn(i) {
  sheet(`ورود «${i.name}»`, `<form class="form" id="opf"><p class="form-error" hidden></p>
    ${field('مقدار', numInput('qty', { unit: i.unit }))}
    <div class="field"><span class="label">علت</span>${radioChips('reason', [['purchase', 'خرید'], ['receive', 'دریافت / اهدا']], 'purchase')}</div>
    ${i.batch_tracked ? `<div class="form-row">${field('شماره سری', input('batch_no', { required: true, attrs: 'dir="ltr"' }))}${dateInput('expiry', 'تاریخ انقضا', '', { required: true })}</div>` : ''}
    ${field('تحویل‌دهنده / فروشنده', input('party', { placeholder: 'اختیاری' }))}
    <details class="more"><summary>تاریخ و توضیحات</summary><div class="form">${dateInput('op_date', 'تاریخ عملیات', todayIso())}${field('توضیحات', textarea('note'))}</div></details>
    <button class="btn block" type="submit">${icon('in')} ثبت ورود</button></form>`, (root, close) => {
    onSubmit($('#opf', root), async (d) => {
      const r = await POST(`/api/items/${i.id}/in`, d);
      close(); done('ورود ثبت شد.', r.tx_id); reload();
    });
  });
}

function opOut(i, pre = {}) {
  const batchOpts = i.batches.map((b) => [b.id, `سری ${b.batch_no} · ${fa(b.qty)} ${i.unit} · انقضا ${jdate(b.expiry) || '—'}`]);
  sheet(`خروج «${i.name}»`, `<form class="form" id="opf"><p class="form-error" hidden></p>
    <div class="callout info">موجودی قابل‌استفاده: <b>${fa(i.qty)} ${esc(i.unit)}</b></div>
    ${field('مقدار', numInput('qty', { unit: i.unit, value: pre.qty || '' }))}
    <div class="field"><span class="label">علت</span>${radioChips('reason', [['consume', 'مصرف / تحویل'], ['damage', 'خرابی / ازبین‌رفتن']], 'consume')}</div>
    ${i.batch_tracked ? field('سری', select('batch_id', batchOpts, '', { empty: 'خودکار — اول سری‌هایی که زودتر منقضی می‌شوند' }),
    i.batches[0] ? `پیشنهاد: سری ${esc(i.batches[0].batch_no)} با انقضای ${jdate(i.batches[0].expiry)}` : '') : ''}
    ${field('تحویل‌گیرنده', input('party', { value: pre.party || '', placeholder: 'نام شخص یا برنامه' }))}
    ${pre.request_id ? `<input type="hidden" name="request_id" value="${esc(pre.request_id)}"><div class="callout">این خروج، درخواست شماره ${fa(pre.request_id)} را «تحویل شد» می‌کند.</div>` : ''}
    <details class="more"><summary>تاریخ و توضیحات</summary><div class="form">${dateInput('op_date', 'تاریخ عملیات', todayIso())}${field('توضیحات', textarea('note'))}</div></details>
    <button class="btn block" type="submit">${icon('out')} ثبت خروج</button></form>`, (root, close) => {
    onSubmit($('#opf', root), async (d) => {
      const r = await POST(`/api/items/${i.id}/out`, d);
      close(); done('خروج ثبت شد.', r.tx_id); reload();
    });
  });
}

function opLoan(i, pre = {}) {
  sheet(`امانت «${i.name}»`, `<form class="form" id="opf"><p class="form-error" hidden></p>
    <div class="callout info">موجودی قابل‌استفاده: <b>${fa(i.qty)} ${esc(i.unit)}</b></div>
    ${field('مقدار', numInput('qty', { unit: i.unit, value: pre.qty || '' }))}
    ${field('نام تحویل‌گیرنده', input('borrower', { required: true, value: pre.party || '' }))}
    ${field('برنامه مربوط', input('program', { placeholder: 'مثلاً مراسم دهه فجر، اردوی مشهد' }))}
    ${dateInput('due_date', 'موعد بازگشت', addDays(todayIso(), 3), { quick: [[1, 'فردا'], [3, '۳ روز'], [7, 'یک هفته'], [30, 'یک ماه']] })}
    ${pre.request_id ? `<input type="hidden" name="request_id" value="${esc(pre.request_id)}">` : ''}
    ${field('توضیحات', textarea('note', { placeholder: 'اختیاری' }))}
    <button class="btn block" type="submit">${icon('loan')} ثبت امانت</button></form>`, (root, close) => {
    onSubmit($('#opf', root), async (d) => {
      const r = await POST(`/api/items/${i.id}/loan`, d);
      close(); done('امانت ثبت شد.', r.tx_id); reload();
    });
  });
}

function opTransfer(i) {
  const dests = state.boot.warehouses.filter((w) => !w.archived && w.id !== i.warehouse_id);
  sheet(`انتقال «${i.name}»`, `<form class="form" id="opf"><p class="form-error" hidden></p>
    <div class="callout info">کالا تا تأیید مدیر انبار مقصد در وضعیت «در حال انتقال» می‌ماند.</div>
    ${field('انبار مقصد', select('to_wh', dests.map((w) => [w.id, w.name]), '', { empty: 'انتخاب کنید', attrs: 'required' }))}
    ${field('مقدار', numInput('qty', { unit: i.unit }), `موجودی: ${fa(i.qty)} ${esc(i.unit)}`)}
    ${field('توضیحات', textarea('note', { placeholder: 'اختیاری' }))}
    <button class="btn block" type="submit">${icon('transfer')} ارسال</button></form>`, (root, close) => {
    onSubmit($('#opf', root), async (d) => {
      const r = await POST(`/api/items/${i.id}/transfer`, d);
      close(); done('انتقال ارسال شد و منتظر تأیید مقصد است.', r.tx_id); reload();
    });
  });
}

function opAdjust(i, correctsId = null) {
  const batchOpts = i.batches.map((b) => [b.id, `سری ${b.batch_no} · ${fa(b.qty)} ${i.unit}`]);
  sheet(correctsId ? `اصلاح رسید ${fa(correctsId)}` : `اصلاح موجودی «${i.name}»`, `<form class="form" id="opf"><p class="form-error" hidden></p>
    <div class="callout">سوابق حذف نمی‌شوند. مقدار درست را وارد کنید تا اختلاف با علت آن ثبت شود.</div>
    ${i.batch_tracked ? field('سری', select('batch_id', batchOpts, '', { empty: 'انتخاب سری', attrs: 'required' })) : ''}
    ${field('مقدار شمارش‌شده (درست)', numInput('new_qty', { unit: i.unit }), `موجودی فعلی در سامانه: ${fa(i.qty)} ${esc(i.unit)}`)}
    ${field('علت اصلاح (الزامی)', textarea('note', { required: true, placeholder: 'مثلاً شمارش پایان ماه، اشتباه در ثبت رسید …' }))}
    ${correctsId ? `<input type="hidden" name="corrects_id" value="${correctsId}">` : ''}
    <button class="btn block" type="submit">${icon('adjust')} ثبت اصلاح</button></form>`, (root, close) => {
    onSubmit($('#opf', root), async (d) => {
      const r = await POST(`/api/items/${i.id}/adjust`, d);
      close(); done('اصلاح موجودی ثبت شد.', r.tx_id); reload();
    });
  });
}

function opReturn(l, unit) {
  const left = Math.round((l.qty - l.returned_qty) * 1000) / 1000;
  sheet(`بازگشت امانت «${l.item_name || ''}»`, `<form class="form" id="opf"><p class="form-error" hidden></p>
    <div class="callout info">${esc(l.borrower)} — باقی‌مانده: <b>${fa(left)} ${esc(unit)}</b></div>
    ${field('مقدار برگشتی', numInput('qty', { unit, value: left }), 'بازگشت جزئی هم ممکن است.')}
    ${field('توضیحات', textarea('note', { placeholder: 'مثلاً سالم تحویل شد' }))}
    <button class="btn block" type="submit">${icon('in')} ثبت بازگشت</button></form>`, (root, close) => {
    onSubmit($('#opf', root), async (d) => {
      const r = await POST(`/api/loans/${l.id}/return`, d);
      close(); done('بازگشت ثبت شد.', r.tx_id); reload();
    });
  });
}

/* ================================================================ receipt */
async function pageReceipt(id, _, main) {
  const t = await GET(`/api/transactions/${id}`);
  const kind = t.direction === 'in' ? 'رسید ورود کالا' : t.direction === 'out' ? (t.reason === 'loan' ? 'رسید تحویل امانی' : 'حواله خروج کالا') : 'سند اصلاح موجودی';
  const alloc = t.batch_alloc ? JSON.parse(t.batch_alloc) : null;
  main.innerHTML = `
    <div class="btns no-print"><a class="back" href="#/items/${t.item_id}">${icon('back')} بازگشت به کالا</a><span style="flex:1"></span>
      <button class="btn" onclick="window.print()">${icon('printer')} چاپ رسید</button></div>
    <article class="receipt">
      <header><div class="org"><img src="${LOGO}" alt=""><div><b>${esc(ORG)}</b><small>${esc(ORG_SUB)} · ${esc(t.warehouse)}</small></div></div>
        <div style="text-align:left"><h1>${kind}</h1><small>شماره ${fa(t.id)}</small></div></header>
      <table>
        <tr><th>تاریخ عملیات</th><td>${jdate(t.op_date, { long: true })}</td></tr>
        <tr><th>کالا</th><td>${esc(t.item_name)} — کد ${esc(faDigits(t.code))}${t.brand || t.model ? ` — ${esc([t.brand, t.model].filter(Boolean).join(' '))}` : ''}${t.serial ? ` — سریال ${esc(t.serial)}` : ''}</td></tr>
        <tr><th>مقدار</th><td><b>${fa(Math.abs(t.delta))} ${esc(t.unit)}</b> ${t.direction === 'adj' ? (t.delta > 0 ? '(افزایش)' : '(کاهش)') : ''}</td></tr>
        <tr><th>علت</th><td>${esc(reasonLabel(t.reason))}</td></tr>
        ${alloc ? `<tr><th>سری</th><td>${alloc.map((a) => `${esc(a.batch_no)} (${fa(a.qty)} ${esc(t.unit)}${a.expiry ? '، انقضا ' + jdate(a.expiry) : ''})`).join('، ')}</td></tr>` : ''}
        ${t.party ? `<tr><th>${t.direction === 'in' ? 'تحویل‌دهنده' : 'تحویل‌گیرنده'}</th><td>${esc(t.party)}</td></tr>` : ''}
        ${t.program ? `<tr><th>برنامه</th><td>${esc(t.program)}</td></tr>` : ''}
        ${t.due_date && t.reason === 'loan' ? `<tr><th>موعد بازگشت</th><td>${jdate(t.due_date, { long: true })}</td></tr>` : ''}
        <tr><th>موجودی پس از عملیات</th><td>${fa(t.qty_after)} ${esc(t.unit)}</td></tr>
        ${t.note ? `<tr><th>توضیحات</th><td>${esc(t.note)}</td></tr>` : ''}
        ${t.corrects_id ? `<tr><th>اصلاح سند</th><td>شماره ${fa(t.corrects_id)}</td></tr>` : ''}
        ${t.corrections.length ? `<tr><th>اصلاحیه‌ها</th><td>${t.corrections.map((c) => `سند ${fa(c.id)}: ${c.delta > 0 ? '+' : '−'}${fa(Math.abs(c.delta))} — ${esc(c.note)}`).join('<br>')}</td></tr>` : ''}
        <tr><th>ثبت‌کننده</th><td>${esc(t.recorder)} — ${jdate(t.created_at, { time: true })}</td></tr>
      </table>
      <div class="sign"><div>ثبت‌کننده<br>${esc(t.recorder)}</div><div>${t.direction === 'in' ? 'تحویل‌دهنده' : 'تحویل‌گیرنده'}${t.party ? '<br>' + esc(t.party) : ''}</div><div>مدیر انبار</div></div>
    </article>`;
}

/* ================================================================ loans */
function loanRow(l, showItem = true) {
  const left = Math.round((l.qty - l.returned_qty) * 1000) / 1000;
  return `<div class="row"><span class="grow">
      <span class="title">${showItem ? `<a href="#/items/${l.item_id}">${esc(l.item_name)}</a> · ` : ''}${esc(l.borrower)}</span>
      <span class="meta">${l.program ? esc(l.program) + ' · ' : ''}${showItem ? esc(l.warehouse) + ' · ' : ''}تحویل ${jdate(l.created_at)}${l.due_date ? ' · موعد ' + jdate(l.due_date) : ''}${l.returned_qty > 0 ? ` · ${fa(l.returned_qty)} برگشته` : ''}</span></span>
    <span class="end">${qtyHtml(l.status === 'open' ? left : l.qty, l.unit)}${loanDuePill(l)}
      ${l.can_edit && l.status === 'open' ? `<button class="btn sm" data-return="${l.id}">بازگشت</button>` : ''}</span></div>`;
}

async function pageLoans(_, q, main) {
  const status = q.status || 'open';
  const rows = await GET(`/api/loans?status=${status}&warehouse=${q.warehouse || ''}`);
  const t = todayIso();
  const late = rows.filter((l) => l.status === 'open' && l.due_date && l.due_date < t);
  main.innerHTML = `<div class="page-head"><h1>امانت‌ها</h1></div>
    <div class="tabs"><a href="#/loans?status=open" class="${status === 'open' ? 'on' : ''}">امانت‌های باز</a><a href="#/loans?status=all" class="${status === 'all' ? 'on' : ''}">همه</a></div>
    ${late.length ? `<div class="callout">${fa(late.length)} امانت از موعد بازگشت گذشته است.</div>` : ''}
    <div class="card"><div class="list">${rows.map((l) => loanRow(l)).join('') || '<p class="empty">امانتی ثبت نشده است.</p>'}</div></div>`;
  $$('[data-return]', main).forEach((b) => b.addEventListener('click', () => {
    const l = rows.find((x) => x.id === Number(b.dataset.return));
    opReturn(l, l.unit);
  }));
}

/* ================================================================ transfers */
async function pageTransfers(_, q, main) {
  const status = q.status || 'pending';
  const rows = await GET(`/api/transfers?status=${status}`);
  main.innerHTML = `<div class="page-head"><h1>انتقال بین انبارها</h1></div>
    <div class="tabs"><a href="#/transfers?status=pending" class="${status === 'pending' ? 'on' : ''}">در حال انتقال</a><a href="#/transfers?status=all" class="${status === 'all' ? 'on' : ''}">همه</a></div>
    <p style="color:var(--muted);font-size:.86rem">برای انتقال، از صفحه کالا دکمه «انتقال» را بزنید. مدیر انبار مقصد باید دریافت را تأیید کند.</p>
    <div class="card"><div class="list">${rows.map((t) => `<div class="row" style="flex-wrap:wrap">
      <span class="grow"><span class="title"><a href="#/items/${t.item_id}">${esc(t.item_name)}</a></span>
        <span class="meta">${esc(t.from_name)} ← ${esc(t.to_name)} · ${esc(t.sender)} · ${jdate(t.sent_at)}${t.note ? ' · ' + esc(t.note) : ''}
          ${t.handler ? ` · بررسی: ${esc(t.handler)}${t.handle_note ? ' (' + esc(t.handle_note) + ')' : ''}` : ''}</span></span>
      <span class="end">${qtyHtml(t.qty, t.unit)}${pill(TR_STATUS[t.status])}</span>
      ${t.status === 'pending' && (t.can_receive || t.can_cancel) ? `<div class="btns" style="width:100%;justify-content:flex-end">
        ${t.can_receive ? `<button class="btn sm" data-recv="${t.id}">${icon('check')} تأیید دریافت</button><button class="btn sm ghost" data-rej="${t.id}">رد</button>` : ''}
        ${t.can_cancel && !t.can_receive ? `<button class="btn sm ghost" data-cancel="${t.id}">لغو انتقال</button>` : ''}</div>` : ''}
    </div>`).join('') || '<p class="empty">انتقالی وجود ندارد.</p>'}</div></div>`;
  $$('[data-recv]', main).forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { const r = await POST(`/api/transfers/${b.dataset.recv}/receive`); done('دریافت تأیید و به موجودی اضافه شد.', r.tx_id); reload(); } catch (e) { toast(e.message, { error: true }); b.disabled = false; }
  }));
  const withNote = (title, url, required) => sheet(title, `<form class="form" id="nf"><p class="form-error" hidden></p>
    ${field(required ? 'علت (الزامی)' : 'توضیحات', textarea('note', { required }))}<button class="btn block" type="submit">ثبت</button></form>`, (root, close) => {
    onSubmit($('#nf', root), async (d) => { await POST(url, d); close(); toast('ثبت شد؛ موجودی به انبار مبدأ برگشت.'); reload(); });
  });
  $$('[data-rej]', main).forEach((b) => b.addEventListener('click', () => withNote('رد انتقال', `/api/transfers/${b.dataset.rej}/reject`, true)));
  $$('[data-cancel]', main).forEach((b) => b.addEventListener('click', () => withNote('لغو انتقال', `/api/transfers/${b.dataset.cancel}/cancel`, false)));
}

/* ================================================================ requests */
async function pageRequests(_, q, main) {
  const manager = isManager();
  const scope = q.scope || (manager ? 'review' : 'mine');
  const rows = await GET(`/api/requests?scope=${scope}`);
  main.innerHTML = `<div class="page-head"><h1>درخواست‌ها</h1><button class="btn" id="newreq">${icon('plus')} درخواست جدید</button></div>
    <div class="tabs">${manager ? `<a href="#/requests?scope=review" class="${scope === 'review' ? 'on' : ''}">برای بررسی من</a>` : ''}
      <a href="#/requests?scope=mine" class="${scope === 'mine' ? 'on' : ''}">درخواست‌های من</a>
      <a href="#/requests?scope=all" class="${scope === 'all' ? 'on' : ''}">همه</a></div>
    <div class="card"><div class="list">${rows.map((r) => `<div class="row" style="flex-wrap:wrap;align-items:flex-start">
      <span class="grow"><span class="title">${r.item_id ? `<a href="#/items/${r.item_id}">${esc(r.item_name)}</a>` : esc(r.item_name)} · ${fa(r.qty)} ${esc(r.unit || '')}
        <span class="pill">${REQ_KIND[r.kind]}</span></span>
        <span class="meta">${esc(r.requester)} · ${esc(r.warehouse)} · ${jdate(r.created_at)}${r.needed_by ? ` · موردنیاز تا ${jdate(r.needed_by)}` : ''}</span>
        <span class="meta">علت: ${esc(r.reason)}</span>
        ${r.reviewer ? `<span class="meta">بررسی: ${esc(r.reviewer)}${r.review_note ? ' — ' + esc(r.review_note) : ''}</span>` : ''}</span>
      <span class="end">${pill(REQ_STATUS[r.status])}${r.item_id && r.item_qty != null && ['pending', 'approved'].includes(r.status) ? `<span class="meta">موجودی ${fa(r.item_qty)}</span>` : ''}</span>
      ${requestActions(r)}</div>`).join('') || '<p class="empty">درخواستی نیست.</p>'}</div></div>`;
  $('#newreq').onclick = () => newRequest();
  if (q.new) { setQuery('/requests', { scope }); newRequest(q.item ? Number(q.item) : null); }
  $$('[data-review]', main).forEach((b) => b.addEventListener('click', () => {
    const [id, decision] = b.dataset.review.split(':');
    if (decision === 'approve') return POST(`/api/requests/${id}/review`, { decision }).then(() => { toast('درخواست تأیید شد.'); reload(); }, (e) => toast(e.message, { error: true }));
    const title = decision === 'reject' ? 'رد درخواست' : 'ثبت انجام درخواست';
    sheet(title, `<form class="form" id="rf"><p class="form-error" hidden></p>
      ${field(decision === 'reject' ? 'علت رد (الزامی)' : 'توضیحات', textarea('note', { required: decision === 'reject' }))}
      <button class="btn block ${decision === 'reject' ? 'danger' : ''}" type="submit">${title}</button></form>`, (root, close) => {
      onSubmit($('#rf', root), async (d) => { await POST(`/api/requests/${id}/review`, { ...d, decision }); close(); toast('ثبت شد.'); reload(); });
    });
  }));
  $$('[data-cancelreq]', main).forEach((b) => b.addEventListener('click', async () => {
    try { await POST(`/api/requests/${b.dataset.cancelreq}/cancel`); toast('درخواست لغو شد.'); reload(); } catch (e) { toast(e.message, { error: true }); }
  }));
}

function requestActions(r) {
  const btns = [];
  if (r.can_review && ['pending', 'approved'].includes(r.status)) {
    if (r.status === 'pending') btns.push(`<button class="btn sm" data-review="${r.id}:approve">${icon('check')} تأیید</button>`);
    if (r.item_id && r.kind !== 'supply') {
      btns.push(`<a class="btn sm ${r.status === 'approved' ? '' : 'ghost'}" href="#/items/${r.item_id}?do=${r.kind === 'loan' ? 'loan' : 'out'}&req=${r.id}&qty=${r.qty}&party=${encodeURIComponent(r.requester)}">تحویل</a>`);
    } else btns.push(`<button class="btn sm ghost" data-review="${r.id}:deliver">انجام شد</button>`);
    btns.push(`<button class="btn sm ghost" data-review="${r.id}:reject">رد</button>`);
  }
  if (r.is_mine && r.status === 'pending') btns.push(`<button class="btn sm ghost" data-cancelreq="${r.id}">لغو</button>`);
  return btns.length ? `<div class="btns" style="width:100%;justify-content:flex-end">${btns.join('')}</div>` : '';
}

async function newRequest(itemId = null) {
  const pre = itemId ? await GET(`/api/items/${itemId}`) : null;
  const whs = state.boot.warehouses.filter((w) => !w.archived);
  sheet('درخواست جدید', `<form class="form" id="rq"><p class="form-error" hidden></p>
    <div class="field"><span class="label">نوع درخواست</span>${radioChips('kind', Object.entries(REQ_KIND), 'use')}</div>
    ${field('از کدام انبار؟', select('warehouse_id', whs.map((w) => [w.id, w.name]), pre?.warehouse_id || '', { empty: 'انتخاب کنید', attrs: 'required' }))}
    <div class="field"><label>کالا</label>
      <input class="input" name="item_name" list="rq-items" value="${esc(pre?.name || '')}" required placeholder="نام کالا را بنویسید یا از فهرست انتخاب کنید" autocomplete="off">
      <datalist id="rq-items"></datalist><input type="hidden" name="item_id" value="${pre?.id || ''}">
      <span class="hint" id="rq-hint">${pre ? `موجودی فعلی: ${fa(pre.qty)} ${esc(pre.unit)}` : 'اگر کالا در انبار نیست، نامش را بنویسید (برای تأمین).'}</span></div>
    <div class="form-row">${field('مقدار', numInput('qty'))}${field('واحد', input('unit', { value: pre?.unit || 'عدد', attrs: 'list="dl-unit2"' }))}</div>
    ${field('علت نیاز', textarea('reason', { required: true, placeholder: 'مثلاً برای مراسم شب جمعه' }))}
    ${dateInput('needed_by', 'زمان موردنیاز', '', { quick: [[0, 'امروز'], [1, 'فردا'], [7, 'هفته بعد']] })}
    <p class="hint" style="color:var(--muted);font-size:.8rem">ثبت درخواست موجودی را تغییر نمی‌دهد؛ کاهش موجودی هنگام تحویل ثبت می‌شود.</p>
    <button class="btn block" type="submit">ارسال درخواست</button></form>
    <datalist id="dl-unit2">${state.boot.units.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`, (root, close) => {
    const f = $('#rq', root);
    let items = [];
    const loadItems = async () => {
      const wh = $('[name=warehouse_id]', f).value;
      items = wh ? await GET(`/api/items?warehouse=${wh}`) : [];
      $('#rq-items', root).innerHTML = items.map((i) => `<option value="${esc(i.name)}">`).join('');
    };
    const match = () => {
      const it = items.find((i) => i.name === $('[name=item_name]', f).value.trim());
      $('[name=item_id]', f).value = it ? it.id : '';
      if (it) $('[name=unit]', f).value = it.unit;
      $('#rq-hint', root).textContent = it ? `موجودی فعلی: ${fa(it.qty)} ${it.unit}` : 'کالای جدید یا خارج از فهرست — برای تأمین ثبت می‌شود.';
    };
    $('[name=warehouse_id]', f).addEventListener('change', () => { loadItems().then(match); });
    $('[name=item_name]', f).addEventListener('input', match);
    if (pre) loadItems();
    onSubmit(f, async (d) => {
      await POST('/api/requests', d);
      close(); toast('درخواست ثبت شد و برای مدیر انبار ارسال شد.');
      location.hash = '#/requests?scope=mine';
    });
  });
}

/* ================================================================ notifications & announcements */
const NOTIF_ICON = {
  out_of_stock: ['alert', 'bad'], low_stock: ['alert', 'warn'], request_new: ['inbox', 'info'], request_result: ['check', 'ok'],
  transfer_in: ['truck', 'warn'], transfer_done: ['truck', 'info'], loan_due: ['clock', 'warn'], loan_overdue: ['clock', 'bad'],
  damage: ['wrench', 'bad'], expiry: ['pill', 'warn'], announcement: ['megaphone', 'info'],
};
async function pageNotifications(_, __, main) {
  const rows = await GET('/api/notifications');
  main.innerHTML = `<div class="page-head"><h1>اعلان‌ها</h1>${rows.some((n) => !n.is_read) ? '<button class="btn ghost sm" id="readall">همه خوانده شد</button>' : ''}</div>
    <div class="card" style="padding:6px"><div class="list">${rows.map((n) => {
    const [ic, tone] = NOTIF_ICON[n.kind] || ['bell', ''];
    return `<a class="notif ${n.is_read ? '' : 'unread'}" href="${esc(n.link || '#/notifications')}" data-id="${n.id}">
      <span class="ico ${tone}">${icon(ic)}</span><span style="min-width:0"><b>${esc(n.title)}</b>
      ${n.body ? `<span style="display:block;font-size:.86rem;color:var(--muted)">${esc(n.body)}</span>` : ''}
      <span class="when">${jdate(n.created_at, { time: true })}</span></span></a>`;
  }).join('') || '<p class="empty">اعلانی ندارید.</p>'}</div></div>`;
  $('#readall')?.addEventListener('click', async () => { await POST('/api/notifications/read', { all: true }); state.unread = 0; updateUnread(); reload(); });
  $$('[data-id]', main).forEach((a) => a.addEventListener('click', () => {
    POST('/api/notifications/read', { ids: [a.dataset.id] }).then(refreshUnread);
  }));
}

async function pageAnnouncements(_, __, main) {
  const rows = await GET('/api/announcements');
  main.innerHTML = `<div class="page-head"><h1>اطلاعیه‌ها</h1>${isManager() ? `<button class="btn" id="newann">${icon('plus')} اطلاعیه جدید</button>` : ''}</div>
    ${rows.map((a) => `<div class="card announce"><h3>${esc(a.title)}${a.pinned ? ' <span class="pill brass">سنجاق‌شده</span>' : ''}</h3><p class="body">${esc(a.body)}</p>
      <p class="meta">${esc(a.author)} · ${jdate(a.created_at, { time: true })}
      ${a.user_id === state.user.id || state.user.role === 'admin' ? ` · <a href="#" data-arch="${a.id}">برداشتن</a>` : ''}</p></div>`).join('') || '<div class="card"><p class="empty">اطلاعیه‌ای منتشر نشده است.</p></div>'}`;
  $('#newann')?.addEventListener('click', () => sheet('اطلاعیه عمومی', `<form class="form" id="af"><p class="form-error" hidden></p>
    ${field('عنوان', input('title', { required: true }))}${field('متن', textarea('body', { required: true }))}
    <label class="check"><input type="checkbox" name="pinned"> سنجاق در صفحه اصلی</label>
    <p class="hint" style="color:var(--muted);font-size:.8rem">برای همه کاربران اعلان ارسال می‌شود.</p>
    <button class="btn block" type="submit">انتشار</button></form>`, (root, close) => {
    onSubmit($('#af', root), async (d) => { await POST('/api/announcements', d); close(); toast('اطلاعیه منتشر شد.'); reload(); });
  }));
  $$('[data-arch]', main).forEach((a) => a.addEventListener('click', async (e) => {
    e.preventDefault();
    await POST(`/api/announcements/${a.dataset.arch}/archive`); reload();
  }));
}

/* ================================================================ reports */
async function pageReports(_, q, main) {
  const kinds = [['inventory', 'موجودی'], ['transactions', 'ورود و خروج'], ['loans', 'امانت‌ها'], ['transfers', 'انتقال‌ها']];
  const kind = q.kind || 'inventory';
  const t = todayIso();
  const [jy, jm] = isoToJ(t);
  const monthStart = jToIso(`${jy}/${jm}/1`);
  main.innerHTML = `<div class="page-head no-print"><h1>گزارش‌ها</h1></div>
    <div class="tabs no-print">${kinds.map(([k, l]) => `<a href="#/reports?kind=${k}" class="${k === kind ? 'on' : ''}">${l}</a>`).join('')}</div>
    <form class="card form no-print" id="rf">
      <div class="form-row">${field('انبار', select('warehouse', state.boot.warehouses.map((w) => [w.id, w.name]), q.warehouse, { empty: 'همه انبارها' }))}
        ${kind === 'inventory' ? '' : `<div class="form-row">${dateInput('from', 'از تاریخ', q.from || monthStart)}${dateInput('to', 'تا تاریخ', q.to || t)}</div>`}</div>
      <div class="btns"><button class="btn" type="submit">${icon('search')} نمایش</button>
        <button class="btn ghost" type="button" id="xlsx">${icon('download')} خروجی اکسل</button>
        <button class="btn ghost" type="button" onclick="window.print()">${icon('printer')} چاپ</button></div>
      <p class="form-error" hidden></p>
    </form>
    <div id="rep"></div>`;
  const f = $('#rf');
  const params = () => {
    const d = readForm(f);
    return new URLSearchParams(Object.entries(d).filter(([, v]) => v));
  };
  const show = async () => {
    const p = params();
    setQuery('/reports', { kind, ...Object.fromEntries(p) });
    const r = await GET(`/api/reports/${kind}?${p}`);
    const whLabel = p.get('warehouse') ? whName(p.get('warehouse')) : 'همه انبارها';
    const range = kind === 'inventory' ? `تا ${jdate(t)}` : `${jdate(p.get('from'))} تا ${jdate(p.get('to'))}`;
    $('#rep').innerHTML = `<div class="print-title"><h2>${esc(r.title)} — ${esc(whLabel)}</h2><p>${esc(ORG)} · ${range}</p></div>
      <p class="no-print" style="color:var(--muted);font-size:.86rem;margin-bottom:8px">${esc(r.title)} · ${esc(whLabel)} · ${range} · ${fa(r.rows.length)} ردیف</p>
      ${r.rows.length ? `<div class="table-wrap"><table><thead><tr>${r.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${r.rows.map((row) => `<tr>${row.map((c) => `<td>${typeof c === 'number' ? fa(c) : esc(faDigits(c ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<div class="card"><p class="empty">برای این بازه موردی نیست.</p></div>'}`;
  };
  f.addEventListener('submit', (e) => { e.preventDefault(); show().catch((err) => toast(err.message, { error: true })); });
  $('#xlsx').addEventListener('click', () => {
    try { location.href = downloadUrl(`/api/reports/${kind}?format=xlsx&${params()}`); } catch (e) { toast(e.message, { error: true }); }
  });
  await show();
}

/* ================================================================ more / account */
function pageMore(_, __, main) {
  const admin = state.user.role === 'admin';
  const link = ([h, i, t]) => `<a href="${h}">${icon(i)}${t}</a>`;
  main.innerHTML = `<h1>بیشتر</h1>
    <div class="card more-menu">${NAV.slice(3).map(link).join('')}</div>
    ${admin ? `<div class="card more-menu"><h2 style="padding:4px 10px">مدیریت کل</h2>${ADMIN_NAV.map(link).join('')}</div>` : ''}
    ${A.wpAdmin ? `<div class="card more-menu"><a href="${esc(A.wpAdmin)}">${icon('shield')}تنظیمات افزونه در پیشخوان وردپرس</a></div>` : ''}
    <div class="card more-menu">${link(['#/account', 'user', 'حساب من و تغییر رمز'])}<button id="lo">${icon('logout')}خروج از حساب</button></div>`;
  $('#lo').onclick = logout;
}

function pageAccount(_, __, main) {
  const u = state.user;
  const managed = u.managed.map(whName).filter(Boolean);
  main.innerHTML = `<h1>حساب من</h1>
    <div class="card"><dl class="specs"><dt>نام</dt><dd>${esc(u.full_name)}</dd><dt>نام کاربری</dt><dd dir="ltr" style="text-align:right">${esc(u.username)}</dd>
      <dt>نقش</dt><dd>${u.role === 'admin' ? 'مدیر کل' : managed.length ? 'مدیر انبار' : 'کاربر عادی'}</dd>
      ${managed.length ? `<dt>انبارهای من</dt><dd>${managed.map(esc).join('، ')}</dd>` : ''}</dl></div>
    <form class="card form" id="pf"><h2>اطلاع‌رسانی بیرونی</h2><p class="form-error" hidden></p>
      <p style="color:var(--muted);font-size:.86rem">اگر پیامک یا ربات پیام‌رسان روی سامانه فعال شده باشد، اعلان‌های مهم به این شماره یا شناسه هم فرستاده می‌شود.</p>
      <div class="form-row">${field('شماره همراه', input('phone', { value: u.phone || '', attrs: 'dir="ltr" inputmode="tel"', placeholder: '09xxxxxxxxx' }))}
        ${field('شناسه گفت‌وگو در بله/تلگرام', input('chat_id', { value: u.chat_id || '', attrs: 'dir="ltr"' }))}</div>
      <button class="btn" type="submit">ذخیره</button></form>
    <form class="card form" id="cpw"><h2>تغییر رمز عبور</h2><p class="form-error" hidden></p>
      ${field('رمز فعلی', input('current', { type: 'password', required: true, attrs: 'autocomplete="current-password" dir="ltr"' }))}
      <div class="form-row">${field('رمز جدید', input('password', { type: 'password', required: true, attrs: 'autocomplete="new-password" dir="ltr" minlength="6"' }))}
        ${field('تکرار رمز جدید', input('password2', { type: 'password', required: true, attrs: 'autocomplete="new-password" dir="ltr"' }))}</div>
      <button class="btn" type="submit">تغییر رمز</button></form>
    <button class="btn ghost" id="lo">${icon('logout')} خروج از حساب</button>`;
  $('#lo').onclick = logout;
  onSubmit($('#pf'), async (d) => { await PUT('/api/me', { phone: toEn(d.phone), chat_id: toEn(d.chat_id) }); Object.assign(state.user, d); toast('ذخیره شد.'); });
  onSubmit($('#cpw'), async (d) => {
    if (d.password !== d.password2) throw new Error('تکرار رمز با رمز جدید یکسان نیست.');
    await POST('/api/me/password', d); toast('رمز عبور تغییر کرد.'); setTimeout(() => location.reload(), 800);
  });
}

/* ================================================================ admin */
async function pageUsers(_, __, main) {
  const users = await GET('/api/users');
  const whs = state.boot.warehouses;
  main.innerHTML = `<div class="page-head"><h1>کاربران</h1><button class="btn" id="nu">${icon('plus')} کاربر جدید</button></div>
    <p style="color:var(--muted);font-size:.86rem">ثبت‌نام عمومی وجود ندارد؛ هر نفر باید اینجا حساب جداگانه داشته باشد تا هر عملیات به نام خودش ثبت شود.</p>
    <div class="card"><div class="list">${users.map((u) => `<div class="row">
      <span class="grow"><span class="title">${esc(u.full_name)} ${u.active ? '' : '<span class="pill bad">غیرفعال</span>'}</span>
        <span class="meta"><span dir="ltr">${esc(u.username)}</span> · ${u.role === 'admin' ? 'مدیر کل' : u.managed.length ? 'مدیر: ' + u.managed.map(whName).map(esc).join('، ') : 'کاربر عادی'}</span></span>
      <span class="btns"><button class="btn sm ghost" data-edit="${u.id}">ویرایش</button><button class="btn sm ghost" data-pw="${u.id}">بازنشانی رمز</button></span></div>`).join('')}</div></div>`;
  const form = (u) => `<form class="form" id="uf"><p class="form-error" hidden></p>
    ${field('نام و نام خانوادگی', input('full_name', { value: u?.full_name, required: true }))}
    ${u ? '' : `<div class="form-row">${field('نام کاربری (انگلیسی)', input('username', { required: true, attrs: 'dir="ltr" autocapitalize="off" autocomplete="off"' }))}
      ${field('رمز اولیه', input('password', { required: true, attrs: 'dir="ltr" autocomplete="new-password" minlength="6"', value: genPassword() }), 'کاربر در اولین ورود رمز را عوض می‌کند.')}</div>`}
    <div class="form-row">${field('شماره همراه', input('phone', { value: u?.phone, attrs: 'dir="ltr" inputmode="tel"' }))}${field('شناسه بله/تلگرام', input('chat_id', { value: u?.chat_id, attrs: 'dir="ltr"' }))}</div>
    <div class="field"><span class="label">نقش</span>${radioChips('role', [['user', 'کاربر / مدیر انبار'], ['admin', 'مدیر کل']], u?.role || 'user')}</div>
    <div class="field"><span class="label">مدیر این انبارها</span><div class="checks">${whs.map((w) => `<label class="check"><input type="checkbox" name="managed" data-multi value="${w.id}" ${u?.managed.includes(w.id) ? 'checked' : ''}>${esc(w.name)}</label>`).join('')}</div>
      <span class="hint">یک نفر می‌تواند مدیر چند انبار باشد. کاربری که مدیر هیچ انباری نیست فقط مشاهده و درخواست دارد.</span></div>
    ${u ? `<label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> حساب فعال است</label>` : ''}
    <button class="btn block" type="submit">${u ? 'ذخیره' : 'ساخت حساب'}</button></form>`;
  $('#nu').onclick = () => sheet('کاربر جدید', form(null), (root, close) => onSubmit($('#uf', root), async (d) => {
    await POST('/api/users', { ...d, username: toEn(d.username), phone: toEn(d.phone) });
    close(); toast(`حساب ساخته شد. رمز اولیه: ${d.password}`); await loadBoot(); reload();
  }));
  $$('[data-edit]', main).forEach((b) => b.addEventListener('click', () => {
    const u = users.find((x) => x.id === Number(b.dataset.edit));
    sheet(`ویرایش ${u.full_name}`, form(u), (root, close) => onSubmit($('#uf', root), async (d) => {
      await PUT(`/api/users/${u.id}`, { ...d, phone: toEn(d.phone) });
      close(); toast('ذخیره شد.'); await loadBoot(); reload();
    }));
  }));
  $$('[data-pw]', main).forEach((b) => b.addEventListener('click', () => {
    const u = users.find((x) => x.id === Number(b.dataset.pw));
    sheet(`رمز جدید برای ${u.full_name}`, `<form class="form" id="rp"><p class="form-error" hidden></p>
      ${field('رمز موقت', input('password', { value: genPassword(), required: true, attrs: 'dir="ltr" minlength="6"' }), 'این رمز را به کاربر بدهید؛ در ورود بعدی باید آن را عوض کند.')}
      <button class="btn block" type="submit">بازنشانی</button></form>`, (root, close) => onSubmit($('#rp', root), async (d) => {
      await POST(`/api/users/${u.id}/reset-password`, d); close(); toast(`رمز موقت: ${d.password}`);
    }));
  }));
}
function genPassword() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint32Array(8));
  return [...r].map((x) => a[x % a.length]).join('');
}

async function pageWarehouses(_, __, main) {
  const users = await GET('/api/users');
  const whs = state.boot.warehouses;
  main.innerHTML = `<div class="page-head"><h1>انبارها و مدیران</h1><button class="btn" id="nw">${icon('plus')} انبار جدید</button></div>
    <div class="card"><div class="list">${whs.map((w) => `<div class="row"><span class="grow">
      <span class="title">${esc(w.name)} ${w.archived ? '<span class="pill">بایگانی</span>' : ''}${w.tracks_expiry ? '<span class="pill brass">تاریخ‌دار</span>' : ''}</span>
      <span class="meta">${fa(w.item_count)} قلم · ${w.managers.length ? 'مدیر: ' + w.managers.map((m) => esc(m.full_name)).join('، ') : 'مدیری تعیین نشده'}</span></span>
      <button class="btn sm ghost" data-w="${w.id}">ویرایش</button></div>`).join('')}</div></div>`;
  const form = (w) => `<form class="form" id="wf"><p class="form-error" hidden></p>
    ${field('نام انبار', input('name', { value: w?.name, required: true }))}
    ${field('توضیحات', input('description', { value: w?.description }))}
    <label class="check"><input type="checkbox" name="tracks_expiry" ${w?.tracks_expiry ? 'checked' : ''}> اقلام این انبار معمولاً تاریخ‌دار هستند (ثبت سری و انقضا)</label>
    <div class="field"><span class="label">مدیران این انبار</span><div class="checks">${users.filter((u) => u.active).map((u) => `<label class="check"><input type="checkbox" name="managers" data-multi value="${u.id}" ${w?.managers.some((m) => m.id === u.id) ? 'checked' : ''}>${esc(u.full_name)}</label>`).join('')}</div></div>
    ${w ? `<label class="check"><input type="checkbox" name="archived" ${w.archived ? 'checked' : ''}> بایگانی انبار (در فهرست‌ها نمایش داده نمی‌شود)</label>` : ''}
    <button class="btn block" type="submit">ذخیره</button></form>`;
  const after = async (close) => { close(); toast('ذخیره شد.'); await loadBoot(); renderShell(); route(); };
  $('#nw').onclick = () => sheet('انبار جدید', form(null), (root, close) => onSubmit($('#wf', root), async (d) => { await POST('/api/warehouses', d); await after(close); }));
  $$('[data-w]', main).forEach((b) => b.addEventListener('click', () => {
    const w = whs.find((x) => x.id === Number(b.dataset.w));
    sheet(`ویرایش ${w.name}`, form(w), (root, close) => onSubmit($('#wf', root), async (d) => { await PUT(`/api/warehouses/${w.id}`, d); await after(close); }));
  }));
}

async function pageBackup(_, __, main) {
  const rows = await GET('/api/backups');
  main.innerHTML = `<div class="page-head"><h1>پشتیبان‌گیری</h1><button class="btn" id="bk">${icon('database')} تهیه نسخه پشتیبان الان</button></div>
    <div class="callout info">سامانه هر روز به‌طور خودکار از اطلاعات انبار یک نسخه پشتیبان می‌گیرد و ۳۰ نسخه آخر را نگه می‌دارد. این نسخه‌ها جایگزین پشتیبان کامل سایت وردپرس (که میزبان یا افزونه پشتیبان‌گیری می‌گیرد) نیستند؛ هر چند وقت یک نسخه را دانلود و جای دیگری نگه دارید.</div>
    <div class="card"><div class="list">${rows.map((b) => `<div class="row"><span class="grow"><span class="title" dir="ltr" style="text-align:right">${esc(b.name)}</span>
      <span class="meta">${jdate(new Date(b.created_at).toISOString().replace('T', ' ').slice(0, 19), { time: true })} · ${fa(Math.round(b.size / 1024))} کیلوبایت</span></span>
      <a class="btn sm ghost" href="${esc(b.url)}">${icon('download')} دانلود</a></div>`).join('') || '<p class="empty">هنوز نسخه‌ای نیست.</p>'}</div></div>`;
  $('#bk').onclick = async () => { try { await POST('/api/backups'); toast('نسخه پشتیبان ساخته شد.'); reload(); } catch (e) { toast(e.message, { error: true }); } };
}

const AUDIT_LABEL = {
  login: 'ورود به سامانه', change_password: 'تغییر رمز', item_create: 'ثبت کالا', item_update: 'ویرایش کالا', item_archive: 'بایگانی کالا',
  item_unarchive: 'خروج از بایگانی', user_create: 'ساخت کاربر', user_update: 'ویرایش کاربر', password_reset: 'بازنشانی رمز',
  warehouse_create: 'ساخت انبار', warehouse_update: 'ویرایش انبار', backup: 'پشتیبان‌گیری',
};
async function pageAudit(_, q, main) {
  const rows = await GET(`/api/audit?${new URLSearchParams(q)}`);
  main.innerHTML = `<div class="page-head"><h1>سوابق تغییرات</h1></div>
    <p style="color:var(--muted);font-size:.86rem">ورود و خروج کالا در «گزارش ورود و خروج» است. اینجا تغییرات اطلاعات پایه و حساب‌ها ثبت می‌شود.</p>
    <div class="card"><div class="list">${rows.map((a) => `<div class="row"><span class="grow"><span class="title">${AUDIT_LABEL[a.action] || esc(a.action)}${a.entity === 'item' ? ` · <a href="#/items/${a.entity_id}">کالای ${fa(a.entity_id)}</a>` : ''}</span>
      <span class="meta">${esc(a.actor || '—')} · ${jdate(a.created_at, { time: true })}</span>
      ${a.details && a.action === 'item_update' ? `<span class="meta">${Object.entries(JSON.parse(a.details)).map(([k, [o, n]]) => `${esc(k)}: ${esc(o ?? '—')} ← ${esc(n ?? '—')}`).join(' · ')}</span>` : ''}</span></div>`).join('') || '<p class="empty">موردی نیست.</p>'}</div></div>`;
}

/* ================================================================ start */
async function loadBoot() {
  state.boot = await GET('/api/bootstrap');
  state.user = state.boot.user;
  state.unread = state.boot.unread;
}
async function start() {
  if (!A.loggedIn) { renderLogin(); return; }
  try {
    await loadBoot();
  } catch (e) {
    if (!state.user) renderLogin();
    return;
  }
  $('#app').innerHTML = '';
  route();
}
start();
setInterval(refreshUnread, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
