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


Object.assign(ICONS, {
  ticket: '<path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  file: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M9.5 12h6M9.5 15.5h6"/>',
  phone: '<path d="M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4z"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/>',
  star: '<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z"/>',
  send: '<path d="M20 4 10 14M20 4l-6 16-4-6-6-4z"/>',
  login: '<path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9"/>',
  clipboard: '<rect x="6" y="5" width="12" height="16" rx="1.5"/><path d="M9 5V3.5h6V5M9 11h6M9 15h4"/>',
});

/* ---------- labels & permission helpers */
const CONDITION = { ok: ['سالم', 'ok'], broken: ['خراب', 'bad'], repair: ['نیازمند تعمیر', 'warn'] };
const condPill = (c) => (c && c !== 'ok' ? `<span class="pill ${CONDITION[c][1]}">${CONDITION[c][0]}</span>` : '');
const reasonLabel = (r) => state.boot?.reasons?.[r] || r;
const EXIT_TONE = { draft: '', pending: 'warn', needs_changes: 'brass', rejected: 'bad', approved: 'info', delivered: 'ok', cancelled: '' };
const exitPill = (s) => `<span class="pill ${EXIT_TONE[s] ?? ''}">${esc(state.boot.exit_statuses[s] || s)}</span>`;
const TICKET_TONE = { new: 'brass', reviewing: 'info', needs_info: 'warn', referred: 'info', accepted: 'brand', ready: 'ok', delivered: 'ok', rejected: 'bad', closed: '' };
const ticketPill = (s) => `<span class="pill ${TICKET_TONE[s] ?? ''}">${esc(state.boot.ticket_statuses[s] || s)}</span>`;
const TR_STATUS = { pending: ['در حال انتقال', 'warn'], received: ['دریافت شد', 'ok'], rejected: ['رد شد', 'bad'], cancelled: ['لغو شد', ''] };
const CARD_TONE = { draft: '', incomplete: 'warn', reviewed: 'ok' };
const cardPill = (s) => `<span class="pill ${CARD_TONE[s] ?? ''}">شناسنامه: ${esc(state.boot.card_statuses[s] || s)}</span>`;
const pill = ([t, c]) => `<span class="pill ${c}">${t}</span>`;
const exitCode = (id) => 'E-' + String(id).padStart(5, '0');
const usable = (i) => Math.round((i.qty - i.broken_qty - (i.reserved_qty || 0)) * 1000) / 1000;
function stockPill(i) {
  const u = i.qty - i.broken_qty;
  if (u <= 0) return '<span class="pill bad">تمام شده</span>';
  if (i.min_qty > 0 && u <= i.min_qty) return '<span class="pill warn">کمبود</span>';
  return '';
}
function expiryPill(iso) {
  if (!iso) return '';
  const d = daysBetween(todayIso(), iso);
  if (d < 0) return '<span class="pill bad">منقضی</span>';
  if (d <= 30) return `<span class="pill warn">انقضا ${relDays(iso)}</span>`;
  if (d <= 60) return `<span class="pill brass">انقضا ${jdate(iso)}</span>`;
  return '';
}
const whName = (id) => state.boot.all_warehouses.find((w) => w.id === Number(id))?.name || state.boot.warehouses.find((w) => w.id === Number(id))?.name || '';
const P = () => state.user.perms;
const canSee = (wh) => P().scope_all || P().warehouses.includes(Number(wh));
const can = (perm, wh = null) => !!P()[perm] && (wh == null || canSee(wh));
const visibleWarehouses = () => state.boot.warehouses.filter((w) => !w.archived);
const whsWith = (perm) => visibleWarehouses().filter((w) => can(perm, w.id));
const ticketsAllowed = () => can('tickets_all') || can('tickets_review') || (!P().scope_all && P().warehouses.length > 0);
const thumb = (url) => (url ? `<img class="thumb" src="${esc(url)}" alt="" loading="lazy">` : `<span class="thumb">${icon('box')}</span>`);
const opKey = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
const telLink = (phone) => phone ? `<a href="tel:${esc(phone)}" dir="ltr" class="num">${esc(faDigits(phone))}</a>` : '';
function copyBtn(text) {
  return `<button type="button" class="btn sm ghost" data-copy="${esc(text)}">${icon('copy')} کپی</button>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('کپی شد.'), () => toast(b.dataset.copy));
});

/* ================================================================ shell */
function navItems() {
  const items = [['#/', 'home', 'خانه'], ['#/items', 'box', 'اموال و کالاها'], ['#/exits', 'file', 'درخواست‌ها و حواله‌های خروج']];
  if (ticketsAllowed()) items.push(['#/tickets', 'ticket', 'تیکت‌های درخواست وسیله']);
  items.push(['#/loans', 'loan', 'امانت‌ها'], ['#/transfers', 'truck', 'انتقال‌ها'], ['#/reports', 'chart', 'گزارش‌ها'],
    ['#/announcements', 'megaphone', 'اطلاعیه‌ها'], ['#/notifications', 'bell', 'اعلان‌ها']);
  return items;
}
const ADMIN_NAV = [
  ['#/admin/users', 'users', 'کاربران و مجوزها'],
  ['#/admin/warehouses', 'warehouse', 'انبارها'],
  ['#/admin/backup', 'database', 'پشتیبان‌گیری'],
  ['#/admin/audit', 'history', 'سوابق تغییرات'],
];

function renderShell() {
  const admin = can('manage_users');
  const quick = can('stock_in') || can('request_out');
  $('#app').innerHTML = `<div class="shell">
    <header class="topbar">
      <a class="brand" href="#/"><img src="${LOGO}" alt=""><span><b>انبار شباب</b><small>${esc(ORG)} · ${esc(ORG_SUB)}</small></span></a>
      <a class="icon-btn" href="#/notifications" aria-label="اعلان‌ها">${icon('bell')}<span class="badge-dot" id="unread" hidden></span></a>
    </header>
    <nav class="sidebar" aria-label="منوی اصلی">
      ${quick ? `<button class="btn brass cta" data-quick>${icon('plus')} ثبت ورود یا درخواست خروج</button>` : ''}
      ${navItems().map(([h, i, t]) => `<a href="${h}" data-nav="${h}">${icon(i)}${t}</a>`).join('')}
      ${admin ? `<div class="sep">مدیریت</div>${ADMIN_NAV.map(([h, i, t]) => `<a href="${h}" data-nav="${h}">${icon(i)}${t}</a>`).join('')}` : ''}
      <div class="sep">حساب</div>
      <a href="#/account" data-nav="#/account">${icon('user')}${esc(state.user.full_name)}</a>
    </nav>
    <main class="main" id="main"></main>
    <nav class="bottomnav" aria-label="منوی پایین">
      <a href="#/" data-nav="#/">${icon('home')}<span>خانه</span></a>
      <a href="#/items" data-nav="#/items">${icon('box')}<span>اموال</span></a>
      ${quick ? `<button class="plus" data-quick><span class="fab">${icon('plus')}</span><span>ثبت</span></button>` : `<a href="#/exits" data-nav="#/exits">${icon('file')}<span>حواله‌ها</span></a>`}
      ${ticketsAllowed() ? `<a href="#/tickets" data-nav="#/tickets">${icon('ticket')}<span>تیکت‌ها</span></a>` : `<a href="#/exits" data-nav="#/exits">${icon('file')}<span>خروج</span></a>`}
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

/** "+" button: entry for an item, or a new exit request. */
function quickOp() {
  sheet('ثبت سریع', `
    ${can('request_out') ? `<a class="btn block" href="#/exits/new" data-close>${icon('file')} درخواست خروج جدید (یک یا چند کالا)</a>` : ''}
    ${can('stock_in') ? `<p class="hint" style="margin:14px 0 6px;color:var(--muted);font-size:.84rem">ثبت ورود: کالا را پیدا کنید</p>
    <div class="searchbox">${icon('search')}<input class="input" id="qo-q" placeholder="نام، کد، مدل یا سریال…" autocomplete="off"></div>
    <div class="list" id="qo-list" style="margin-top:8px"></div>
    ${can('edit') ? '<p style="margin-top:10px;font-size:.84rem"><a href="#/items/new" data-close>کالا ثبت نشده است؟ ثبت شناسنامه جدید</a></p>' : ''}` : ''}`,
  (root) => {
    const box = $('#qo-q', root);
    if (!box) return;
    let timer;
    const search = async () => {
      const rows = (await GET(`/api/items?q=${encodeURIComponent(box.value.trim())}`)).filter((i) => i.can.stock_in).slice(0, 20);
      $('#qo-list', root).innerHTML = rows.map((i) => `
        <div class="row"><div class="grow"><span class="title">${esc(i.name)}</span><span class="meta">${esc(i.warehouse)} · ${qtyHtml(i.qty, i.unit)}</span></div>
          <a class="btn sm ghost" href="#/items/${i.id}?do=in" data-close>ورود</a></div>`).join('') || '<p class="empty">کالایی پیدا نشد.</p>';
    };
    box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
    search();
  });
}

/* ================================================================ router */
const ROUTES = [
  [/^\/$/, pageDashboard],
  [/^\/items$/, pageItems],
  [/^\/items\/new$/, (p, q, m) => pageItemForm(null, q, m)],
  [/^\/items\/(\d+)\/edit$/, (p, q, m) => pageItemForm(Number(p[1]), q, m)],
  [/^\/items\/(\d+)$/, (p, q, m) => pageItem(Number(p[1]), q, m)],
  [/^\/receipt\/(\d+)$/, (p, q, m) => pageReceipt(Number(p[1]), q, m)],
  [/^\/exits$/, pageExits],
  [/^\/exits\/new$/, (p, q, m) => pageExitForm(null, q, m)],
  [/^\/exits\/(\d+)\/edit$/, (p, q, m) => pageExitForm(Number(p[1]), q, m)],
  [/^\/exits\/(\d+)$/, (p, q, m) => pageExit(Number(p[1]), q, m)],
  [/^\/voucher\/(\d+)$/, (p, q, m) => pageVoucher(Number(p[1]), q, m)],
  [/^\/tickets$/, pageTickets],
  [/^\/tickets\/(\d+)$/, (p, q, m) => pageTicket(Number(p[1]), q, m)],
  [/^\/loans$/, pageLoans],
  [/^\/transfers$/, pageTransfers],
  [/^\/notifications$/, pageNotifications],
  [/^\/announcements$/, pageAnnouncements],
  [/^\/reports$/, pageReports],
  [/^\/more$/, pageMore],
  [/^\/account$/, pageAccount],
  [/^\/request$/, (p, q, m) => pagePublicRequest(m)],
  [/^\/track$/, (p, q, m) => pagePublicTrack(m)],
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
  document.querySelectorAll('.sheet-backdrop').forEach((s) => s.remove());
  const { path, query } = parseHash();
  if (!state.user) return renderPublic(path);
  if (state.user.must_change_pw) return pageForcePassword();
  if (!$('#main')) renderShell();
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

/* ================================================================ public pages (no account) */
function publicFrame(inner) {
  $('#app').innerHTML = `<div class="public">
    <header class="public-head"><img src="${LOGO}" alt=""><div><b>${esc(ORG)}</b><small>${esc(ORG_SUB)}</small></div></header>
    <main class="public-main" id="pub">${inner}</main></div>`;
  return $('#pub');
}

function renderPublic(path) {
  if (path === '/request') return pagePublicRequest();
  if (path === '/track') return pagePublicTrack();
  renderLogin();
}

function renderLogin() {
  const root = publicFrame(`
    <section class="gate">
      <form class="card form gate-login" id="login" autocomplete="on">
        <h1>${icon('login')} ورود مسئولان</h1>
        ${A.wpUser ? `<p class="callout">حساب «${esc(A.wpUser)}» به سامانه انبار دسترسی ندارد. با حساب سامانه وارد شوید.</p>` : ''}
        <p class="form-error" hidden></p>
        ${field('نام کاربری', input('username', { required: true, attrs: 'autocomplete="username" autocapitalize="off" dir="ltr"' }))}
        ${field('رمز عبور', input('password', { type: 'password', required: true, attrs: 'autocomplete="current-password" dir="ltr" inputmode="text"' }))}
        <button class="btn block" type="submit">ورود</button>
        <p class="login-note">فقط حساب‌هایی که مدیر سامانه تعریف کرده وارد می‌شوند. ثبت‌نام عمومی وجود ندارد.</p>
      </form>
      <div class="card gate-request">
        <h2>${icon('ticket')} درخواست وسیله</h2>
        <p>اگر برای برنامه یا نیاز خود وسیله‌ای لازم دارید، بدون نیاز به حساب کاربری درخواست خود را بنویسید.
          مسئولان درخواست را بررسی می‌کنند و برای هماهنگی با شما تماس می‌گیرند.</p>
        <a class="btn brass block" href="#/request">${icon('send')} ثبت درخواست وسیله</a>
        <a class="btn ghost block" href="#/track">پیگیری درخواست</a>
      </div>
    </section>`);
  onSubmit($('#login', root), async (d) => {
    await POST('/api/login', { username: toEn(d.username), password: toEn(d.password) });
    location.hash = '#/';
    location.reload();
  });
}

function pagePublicRequest(main) {
  const html = `
    <a class="back" href="#/">${icon('back')} بازگشت</a>
    <form class="card form" id="pubreq" style="max-width:640px;width:100%;margin-inline:auto">
      <h1>درخواست وسیله</h1>
      <p style="color:var(--muted);font-size:.9rem">وسیله موردنیاز و شرایط استفاده را بنویسید. پس از بررسی، مسئولان برای هماهنگی با شما تماس می‌گیرند.</p>
      <p class="form-error" hidden></p>
      <div class="form-row">${field('نام', input('first_name', { required: true, attrs: 'autocomplete="given-name"' }))}${field('نام خانوادگی', input('last_name', { required: true, attrs: 'autocomplete="family-name"' }))}</div>
      <div class="form-row">${field('کد ملی', input('national_id', { required: true, attrs: 'inputmode="numeric" dir="ltr" maxlength="10" autocomplete="off"' }))}
        ${field('شماره تماس', input('phone', { required: true, placeholder: '۰۹۱۲۱۲۳۴۵۶۷', attrs: 'inputmode="tel" dir="ltr" autocomplete="tel"' }))}</div>
      ${field('نحوه آشنایی یا مراجعه', input('referral', { required: true, placeholder: 'مثلاً معرفی آقای … یا از طرف هیئت …' }))}
      ${field('نام وسیله موردنیاز', input('item_text', { required: true, placeholder: 'مثلاً باند و میکروفون برای مراسم' }))}
      <div class="form-row">${field('تعداد یا مقدار', input('qty_text', { placeholder: 'مثلاً ۲ عدد' }))}${field('زمان نیاز و مدت استفاده', input('need_time', { placeholder: 'مثلاً پنجشنبه شب، یک روز' }))}</div>
      ${field('شرح کامل درخواست', textarea('description', { required: true, placeholder: 'برای چه برنامه‌ای، کجا و چه شرایطی لازم است' }))}
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <p style="color:var(--muted);font-size:.8rem">اطلاعات تماس و کد ملی شما فقط در اختیار مسئولان رسیدگی قرار می‌گیرد.</p>
      <button class="btn block" type="submit">${icon('send')} ارسال درخواست</button>
    </form>`;
  const root = main ? (main.innerHTML = html, main) : publicFrame(html);
  onSubmit($('#pubreq', root), async (d) => {
    const r = await POST('/api/public/tickets', { ...d, national_id: toEn(d.national_id), phone: toEn(d.phone) });
    $('#pubreq', root).outerHTML = `<div class="card done-card" style="max-width:640px;width:100%;margin-inline:auto">
      <h1>${icon('check')} درخواست شما ثبت شد</h1>
      <p>شماره پیگیری:</p><p class="tracking num">${faDigits(r.code)}</p>
      <p style="color:var(--muted)">این شماره را نگه دارید. برای پیگیری، شماره پیگیری و کد ملی لازم است. مسئولان برای هماهنگی با شما تماس می‌گیرند.</p>
      <div class="btns">${copyBtn(r.code)}<a class="btn ghost" href="#/">بازگشت</a></div></div>`;
  });
}

function pagePublicTrack(main) {
  const html = `<a class="back" href="#/">${icon('back')} بازگشت</a>
    <form class="card form" id="trk" style="max-width:520px;width:100%;margin-inline:auto">
      <h1>پیگیری درخواست وسیله</h1><p class="form-error" hidden></p>
      ${field('شماره پیگیری', input('code', { required: true, attrs: 'inputmode="numeric" dir="ltr"' }))}
      ${field('کد ملی', input('national_id', { required: true, attrs: 'inputmode="numeric" dir="ltr" maxlength="10"' }))}
      <button class="btn block" type="submit">نمایش وضعیت</button><div id="trk-out"></div></form>`;
  const root = main ? (main.innerHTML = html, main) : publicFrame(html);
  onSubmit($('#trk', root), async (d) => {
    const r = await POST('/api/public/track', { code: toEn(d.code), national_id: toEn(d.national_id) });
    $('#trk-out', root).innerHTML = `<div class="callout info"><b>${esc(r.status)}</b><br><span style="font-size:.82rem">ثبت: ${jdate(r.created_at)} · آخرین به‌روزرسانی: ${jdate(r.updated_at)}</span></div>`;
  });
}

function pageForcePassword() {
  publicFrame(`<form class="card form" id="pw" style="max-width:420px;width:100%;margin-inline:auto">
    <h1>تعیین رمز شخصی</h1>
    <p style="color:var(--muted)">${esc(state.user.full_name)}، برای امنیت حساب، رمز عبور شخصی خودتان را تعیین کنید.</p>
    <p class="form-error" hidden></p>
    ${field('رمز فعلی (رمز اولیه)', input('current', { type: 'password', required: true, attrs: 'autocomplete="current-password" dir="ltr"' }))}
    ${field('رمز جدید', input('password', { type: 'password', required: true, attrs: 'autocomplete="new-password" dir="ltr" minlength="6"' }), 'حداقل ۶ کاراکتر')}
    ${field('تکرار رمز جدید', input('password2', { type: 'password', required: true, attrs: 'autocomplete="new-password" dir="ltr"' }))}
    <button class="btn block" type="submit">ذخیره و ادامه</button>
    <button class="btn ghost block" type="button" id="lo">خروج</button>
  </form>`);
  $('#lo').onclick = logout;
  onSubmit($('#pw'), async (d) => {
    if (d.password !== d.password2) throw new Error('تکرار رمز با رمز جدید یکسان نیست.');
    await POST('/api/me/password', { current: toEn(d.current), password: toEn(d.password) });
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
function exitRow(e) {
  return `<a class="row" href="#/exits/${e.id}"><span class="grow"><span class="title">${exitCode(e.id)} · ${esc(state.boot.exit_types[e.type])}${e.recipient ? ' · ' + esc(e.recipient) : ''}</span>
    <span class="meta">${esc(e.from_name)} · ${fa(e.line_count)} قلم · ${esc(e.requester)} · ${jdate(e.updated_at || e.created_at)}</span></span>${exitPill(e.status)}</a>`;
}

async function pageDashboard(_, __, main) {
  const d = await GET('/api/dashboard');
  const t = todayIso();
  const overdue = d.loans.filter((l) => l.due_date && l.due_date < t);
  const outCount = d.shortages.filter((i) => i.qty - (i.broken_qty || 0) <= 0).length;
  const newTickets = d.tickets.filter((x) => x.status === 'new');
  const stat = (href, n, label, tone) => `<a class="stat ${n ? tone : ''}" href="${href}"><b>${fa(n)}</b><span>${label}</span></a>`;
  main.innerHTML = `
    <div class="page-head"><div><h1>سلام، ${esc(state.user.full_name)}</h1><span class="sub">${jdate(t, { long: true })}${state.user.title ? ' · ' + esc(state.user.title) : ''}</span></div>
      ${can('request_out') ? `<a class="btn" href="#/exits/new">${icon('plus')} درخواست خروج</a>` : ''}</div>
    <div class="stats">
      ${can('approve') ? stat('#/exits?tab=approve', d.to_approve.length, 'منتظر تأیید شما', 'alert') : ''}
      ${can('deliver') ? stat('#/exits?tab=deliver', d.to_deliver.length, 'آماده تحویل', 'warn') : ''}
      ${ticketsAllowed() ? stat('#/tickets', newTickets.length, 'تیکت جدید', 'warn') : ''}
      ${stat('#/items?status=low', d.shortages.length - outCount, 'کمبود', 'warn')}
      ${stat('#/items?status=out', outCount, 'تمام‌شده', 'alert')}
      ${stat('#/loans', d.loans.length, `امانت باز${overdue.length ? ` · ${fa(overdue.length)} با تأخیر` : ''}`, overdue.length ? 'alert' : '')}
      ${stat('#/transfers', d.transfers.length, 'در حال انتقال', 'warn')}
      ${stat('#/items?status=expiring', d.expiring.length, 'نزدیک انقضا', 'alert')}
      ${can('steward') || can('edit') ? stat('#/items?card=incomplete', d.incomplete_cards, 'شناسنامه ناقص', 'warn') : ''}
    </div>
    ${d.announcements.map((a) => `<div class="card announce"><h3>${esc(a.title)}${a.pinned ? ' <span class="pill brass">سنجاق‌شده</span>' : ''}</h3><p class="body">${esc(a.body)}</p>
      <p class="meta">${esc(a.author)} · ${jdate(a.created_at)}</p></div>`).join('')}
    <div class="grid-2">
      ${d.to_approve.length ? `<div class="card"><h2>منتظر تأیید خروج <a href="#/exits?tab=approve">همه</a></h2><div class="list">${d.to_approve.map(exitRow).join('')}</div></div>` : ''}
      ${d.to_deliver.length ? `<div class="card"><h2>تأییدشده، آماده تحویل <a href="#/exits?tab=deliver">همه</a></h2><div class="list">${d.to_deliver.map(exitRow).join('')}</div></div>` : ''}
      ${d.my_exits.length ? `<div class="card"><h2>درخواست‌های خروج من <a href="#/exits?tab=mine">همه</a></h2><div class="list">${d.my_exits.map(exitRow).join('')}</div></div>` : ''}
      ${d.tickets.length ? `<div class="card"><h2>تیکت‌های باز <a href="#/tickets">همه</a></h2><div class="list">${d.tickets.map((x) => `
        <a class="row" href="#/tickets/${x.id}"><span class="grow"><span class="title">${esc(x.item_text)}</span>
          <span class="meta">${esc(x.first_name)} ${esc(x.last_name)} · ${jdate(x.created_at)}</span></span>${ticketPill(x.status)}</a>`).join('')}</div></div>` : ''}
      <div class="card"><h2>کمبودها <a href="#/items?status=low">همه</a></h2><div class="list">
        ${d.shortages.slice(0, 8).map((i) => `<a class="row" href="#/items/${i.id}"><span class="grow"><span class="title">${esc(i.name)}</span>
          <span class="meta">${esc(i.warehouse)} · حداقل ${fa(i.min_qty)} ${esc(i.unit)}</span></span>
          <span class="end">${qtyHtml(i.qty, i.unit)}</span></a>`).join('') || '<p class="empty">کمبودی ثبت نشده است.</p>'}</div></div>
      <div class="card"><h2>امانت‌های باز <a href="#/loans">همه</a></h2><div class="list">
        ${d.loans.slice(0, 8).map((l) => `<a class="row" href="#/loans"><span class="grow"><span class="title">${esc(l.item_name)}</span>
          <span class="meta">${esc(l.borrower)}${l.program ? ` · ${esc(l.program)}` : ''} · ${esc(l.warehouse)}</span></span>
          <span class="end">${qtyHtml(l.qty - l.returned_qty, l.unit)}${loanDuePill(l)}</span></a>`).join('') || '<p class="empty">امانت بازی نیست.</p>'}</div></div>
      ${d.expiring.length ? `<div class="card"><h2>نزدیک به انقضا <a href="#/items?status=expiring">همه</a></h2><div class="list">
        ${d.expiring.slice(0, 8).map((b) => `<a class="row" href="#/items/${b.item_id}"><span class="grow"><span class="title">${esc(b.item_name)}</span>
          <span class="meta">${esc(b.warehouse)} · سری ${esc(b.batch_no)} · ${jdate(b.expiry)}</span></span>
          <span class="end">${qtyHtml(b.qty, b.unit)}${expiryPill(b.expiry)}</span></a>`).join('')}</div></div>` : ''}
      ${d.transfers.length ? `<div class="card"><h2>انتقال‌های در راه <a href="#/transfers">همه</a></h2><div class="list">
        ${d.transfers.map((tr) => `<a class="row" href="#/transfers"><span class="grow"><span class="title">${esc(tr.item_name)}</span>
          <span class="meta">${esc(tr.from_name)} ← ${esc(tr.to_name)} · ${jdate(tr.sent_at)}</span></span>${qtyHtml(tr.qty, tr.unit)}</a>`).join('')}</div></div>` : ''}
    </div>
    <section class="section"><h2>انبارها</h2><div class="wh-grid">
      ${d.warehouses.map((w) => `<a class="wh" href="#/items?warehouse=${w.id}"><b>${esc(w.name)}</b>
        <span class="meta">${fa(w.item_count)} قلم${w.people.length ? ' · مسئول: ' + w.people.map((m) => esc(m.full_name)).join('، ') : ''}</span>
        <span class="pills">${w.out_count ? `<span class="pill bad">${fa(w.out_count)} تمام‌شده</span>` : ''}${w.low_count ? `<span class="pill warn">${fa(w.low_count)} کمبود</span>` : ''}
          ${w.pending_count ? `<span class="pill warn">${fa(w.pending_count)} منتظر تأیید</span>` : ''}${w.loan_count ? `<span class="pill info">${fa(w.loan_count)} امانت</span>` : ''}
          ${w.incomplete_count ? `<span class="pill">${fa(w.incomplete_count)} شناسنامه ناقص</span>` : ''}</span></a>`).join('')}</div></section>
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
  const shown = t.direction === 'st' ? `${fa(t.qty)}` : `${t.delta > 0 ? '+' : '−'}${fa(Math.abs(t.delta))}`;
  return `<a class="row" href="#/receipt/${t.id}"><span class="grow"><span class="title">${esc(t.item_name)} <span class="pill">${esc(reasonLabel(t.reason))}</span>${t.exit_id ? ` <span class="pill info">${exitCode(t.exit_id)}</span>` : ''}</span>
    <span class="meta">${jdate(t.op_date)} · ${esc(t.warehouse)} · ${esc(t.recorder)}${t.party ? ` · طرف: ${esc(t.party)}` : ''}</span></span>
    <span class="end"><span class="qty num ${cls}">${shown}<small>${esc(t.unit)}</small></span><span class="meta">مانده ${fa(t.qty_after)}</span></span></a>`;
}

/* ================================================================ items list */
async function pageItems(_, q, main) {
  const whs = visibleWarehouses();
  const statuses = [['', 'همه'], ['low', 'کمبود'], ['out', 'تمام‌شده'], ['broken', 'خراب / نیازمند تعمیر'], ['loaned', 'در امانت'], ['expiring', 'نزدیک انقضا']];
  const types = Object.entries(state.boot.item_types).map(([k, v]) => [k, v.label]);
  main.innerHTML = `
    <div class="page-head"><h1>اموال و کالاها</h1>
      ${whsWith('edit').length || whsWith('steward').length ? `<a class="btn" href="#/items/new${q.warehouse ? '?warehouse=' + q.warehouse : ''}">${icon('plus')} شناسنامه جدید</a>` : ''}</div>
    <form class="filters" id="f">
      <div class="searchbox">${icon('search')}<input class="input" name="q" value="${esc(q.q || '')}" placeholder="نام، کد، برند، مدل، سریال یا محل نگهداری…" autocomplete="off" type="search"></div>
      <div class="filter-row">
        ${whs.length > 1 ? select('warehouse', whs.map((w) => [w.id, w.name]), q.warehouse, { empty: 'همه انبارها' }) : ''}
        ${select('item_type', types, q.item_type, { empty: 'همه انواع' })}
        ${select('condition', Object.entries(state.boot.conditions), q.condition, { empty: 'هر وضعیتی' })}
        ${select('category', state.boot.categories.map((c) => [c, c]), q.category, { empty: 'همه دسته‌ها' })}
        ${select('location', state.boot.locations.map((c) => [c, c]), q.location, { empty: 'همه محل‌ها' })}
        ${select('card', [['incomplete', 'شناسنامه ناقص'], ['draft', 'پیش‌نویس'], ['reviewed', 'بررسی‌شده']], q.card, { empty: 'هر شناسنامه‌ای' })}
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
          <span class="meta" style="color:var(--muted);font-size:.8rem;display:block">${esc(i.warehouse)}${i.location ? ' · ' + esc(i.location) : ''} · کد ${esc(faDigits(i.code))}${i.model ? ' · ' + esc(i.model) : ''}</span>
          <span class="pills" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${stockPill(i)}${condPill(i.condition)}
            ${i.broken_qty > 0 ? `<span class="pill bad">${fa(i.broken_qty)} خراب</span>` : ''}
            ${i.reserved_qty > 0 ? `<span class="pill brand">${fa(i.reserved_qty)} رزرو</span>` : ''}
            ${i.loaned_qty > 0 ? `<span class="pill info">${fa(i.loaned_qty)} در امانت</span>` : ''}
            ${i.transit_qty > 0 ? `<span class="pill brass">${fa(i.transit_qty)} در حال انتقال</span>` : ''}${expiryPill(i.next_expiry)}
            ${i.card_status !== 'reviewed' && i.missing.length ? `<span class="pill">ناقص: ${esc(i.missing.slice(0, 3).join('، '))}${i.missing.length > 3 ? '…' : ''}</span>` : ''}</span></span>
        <span class="end">${qtyHtml(i.qty, i.unit)}${i.qty !== usable(i) ? `<span class="meta">قابل‌استفاده ${fa(usable(i))}</span>` : ''}</span></a>`).join('')}</div>`
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

/* ================================================================ asset card form */
async function pageItemForm(id, q, main) {
  const item = id ? await GET(`/api/items/${id}`) : null;
  if (item && !item.can.edit) throw new Error('شما اجازه ویرایش شناسنامه این انبار را ندارید.');
  const whs = visibleWarehouses().filter((w) => can('edit', w.id) || can('steward', w.id));
  if (!whs.length) throw new Error('شما اجازه ثبت شناسنامه ندارید.');
  const whId = item?.warehouse_id || Number(q.warehouse) || whs[0].id;
  const wh = state.boot.warehouses.find((w) => w.id === whId);
  const v = item || { unit: 'عدد', condition: 'ok', min_qty: 0, batch_tracked: wh?.tracks_expiry, item_type: 'other', currency: 'toman', card_status: 'draft', details: { specs: {}, custom: [] } };
  const d = v.details || { specs: {}, custom: [] };
  const types = state.boot.item_types;
  const specFields = (type) => (types[type]?.fields || []).map(([k, label, kind]) =>
    field(label, kind === 'long' ? textarea(`d.specs.${k}`, { value: d.specs?.[k] || '' }) : input(`d.specs.${k}`, { value: d.specs?.[k] || '' }))).join('');
  const gen = Object.fromEntries(state.boot.general_fields);
  const g = (k, long = false) => field(gen[k], long ? textarea(`d.${k}`, { value: d[k] || '' }) : input(`d.${k}`, { value: d[k] || '' }));
  const showPrices = !item || 'purchase_price' in item;
  main.innerHTML = `
    <a class="back" href="${item ? `#/items/${item.id}` : '#/items'}">${icon('back')} بازگشت</a>
    <h1>${item ? 'ویرایش شناسنامه' : 'شناسنامه جدید'}</h1>
    <p style="color:var(--muted);font-size:.88rem">همه بخش‌ها اختیاری‌اند جز نام، انبار و واحد. اطلاعات نامعلوم را خالی بگذارید و بعداً تکمیل کنید.</p>
    <form class="form" id="itemf">
      <p class="form-error" hidden></p>
      <fieldset class="card form"><legend>اطلاعات پایه</legend>
        ${item ? `<div class="field"><span class="label">انبار</span><span>${esc(item.warehouse)}</span><span class="hint">برای جابه‌جایی، درخواست خروج از نوع انتقال ثبت کنید.</span></div>`
    : field('انبار', select('warehouse_id', whs.map((w) => [w.id, w.name]), whId))}
        ${field('نام کامل و دقیق', input('name', { value: v.name, required: true, placeholder: 'مثلاً باند اکتیو ۱۲ اینچ JBL مدل EON712' }))}
        <div class="form-row">
          ${field('نوع وسیله', select('item_type', Object.entries(types).map(([k, t]) => [k, t.label]), v.item_type))}
          ${field('کد اموال', input('code', { value: v.code ? faDigits(v.code) : '', placeholder: 'خالی = خودکار', attrs: 'dir="ltr"' }))}
        </div>
        <div class="form-row">
          ${field('دسته‌بندی', input('category', { value: v.category, attrs: 'list="dl-cat"', placeholder: 'مثلاً صوتی، برقی، کتاب' }))}
          ${field('واحد', input('unit', { value: v.unit, required: true, attrs: 'list="dl-unit"' }), 'عدد، دستگاه، متر، کیلوگرم، لیتر، بسته، جلد…')}
        </div>
        <div class="form-row">
          ${field('برند / سازنده', input('brand', { value: v.brand }))}
          ${field('مدل کامل و نسخه', input('model', { value: v.model }))}
        </div>
        <div class="form-row">
          ${field('شماره سریال یا شناسه', input('serial', { value: v.serial, attrs: 'dir="ltr"' }), 'برای وسایل سریال‌دار، هر دستگاه را جدا ثبت کنید.')}
          ${field('حداقل موجودی موردنیاز', numInput('min_qty', { value: v.min_qty || '', required: false, placeholder: '۰' }))}
        </div>
        ${!item ? `<div class="form-row">${field('موجودی اولیه', numInput('opening_qty', { required: false, placeholder: '۰' }), 'به‌صورت رسید «موجودی اولیه» ثبت می‌شود.')}</div>` : ''}
        <label class="check"><input type="checkbox" name="batch_tracked" ${v.batch_tracked ? 'checked' : ''}> موجودی به‌تفکیک سری و تاریخ انقضا (دارو، مواد غذایی)</label>
        ${!item ? `<div class="form-row" id="batch-fields">${field('شماره سری موجودی اولیه', input('batch_no', { attrs: 'dir="ltr"' }))}${dateInput('expiry', 'تاریخ انقضا')}</div>` : ''}
      </fieldset>

      <fieldset class="card form"><legend>مشخصات اختصاصی <span id="type-label">${esc(types[v.item_type]?.label || '')}</span></legend>
        <div class="form-grid" id="spec-fields">${specFields(v.item_type)}</div>
      </fieldset>

      <fieldset class="card form"><legend>مشخصات ظاهری و فنی</legend>
        <div class="form-grid">${g('material')}${g('color')}${g('dimensions')}${g('weight')}</div>
        ${g('appearance', true)}
      </fieldset>

      <fieldset class="card form"><legend>سلامت و وضعیت</legend>
        <div class="field"><span class="label">وضعیت خلاصه</span>${radioChips('condition', Object.entries(state.boot.conditions), v.condition)}</div>
        ${g('function_status', true)}
        ${field('شرح نقص، خرابی یا تعمیر موردنیاز', textarea('condition_notes', { value: v.condition_notes, placeholder: 'مثلاً روشن می‌شود ولی خروجی دوم صدا ندارد؛ بدنه خط‌وخش دارد.' }))}
        ${g('accessories', true)}${g('missing_parts', true)}${g('warranty')}
      </fieldset>

      <fieldset class="card form"><legend>نگهداری</legend>
        <div class="form-row">
          ${field('محل دقیق نگهداری', input('location', { value: v.location, attrs: 'list="dl-loc"', placeholder: 'مثلاً انبار صوت مسجد، کمد دوم، طبقه بالا' }))}
          ${field('تحویل‌دار', input('custodian', { value: v.custodian, placeholder: 'اگر نزد شخص خاصی است' }))}
        </div>
      </fieldset>

      ${showPrices ? `<fieldset class="card form"><legend>منبع و ارزش</legend>
        <div class="form-row">
          <div class="field"><span class="label">منبع دریافت</span>${radioChips('source', Object.entries(state.boot.sources), v.source || '')}</div>
          ${field('فروشنده یا اهداکننده', input('vendor', { value: v.vendor }))}
        </div>
        <div class="form-row">
          ${field('قیمت خرید', input('purchase_price', { value: v.purchase_price ? faDigits(v.purchase_price) : '', attrs: 'inputmode="numeric" data-num', placeholder: 'نامعلوم = خالی' }))}
          ${dateInput('purchase_date', 'تاریخ خرید', v.purchase_date || '')}
        </div>
        <div class="form-row">
          ${field('ارزش تقریبی فعلی', input('current_value', { value: v.current_value ? faDigits(v.current_value) : '', attrs: 'inputmode="numeric" data-num', placeholder: 'نامعلوم = خالی' }))}
          ${dateInput('valuation_date', 'تاریخ برآورد', v.valuation_date || '')}
        </div>
        ${field('واحد پول', radioChips('currency', Object.entries(state.boot.currencies), v.currency || 'toman'))}
        <p class="hint" style="color:var(--muted);font-size:.8rem">صفر به معنی «نامشخص» نیست؛ مبلغ نامعلوم را خالی بگذارید.</p>
      </fieldset>` : ''}

      <fieldset class="card form"><legend>عکس‌ها</legend>
        <div class="gallery" id="gallery">${(item?.photos || []).map((p) => `<figure><img src="${esc(p.url)}" alt=""><figcaption>${esc(p.caption || '')}</figcaption></figure>`).join('')}</div>
        <label class="btn ghost sm" style="justify-self:start">${icon('image')} افزودن عکس<input type="file" accept="image/*" id="img" multiple hidden></label>
        <span class="hint" style="color:var(--muted);font-size:.8rem">نمای کلی، برچسب مدل، سریال، متعلقات و محل آسیب. برای هر عکس توضیح بنویسید.${item ? ' عکس‌های فعلی را در صفحه کالا ویرایش کنید.' : ''}</span>
        <div id="new-photos" class="form"></div>
      </fieldset>

      <fieldset class="card form"><legend>فیلدهای اختصاصی و توضیحات</legend>
        <div id="custom" class="form">${(d.custom || []).map(customRow).join('')}</div>
        <button type="button" class="btn ghost sm" id="add-custom" style="justify-self:start">${icon('plus')} افزودن فیلد</button>
        ${field('توضیحات تکمیلی', textarea('notes', { value: v.notes }))}
        <div class="field"><span class="label">وضعیت شناسنامه</span>${radioChips('card_status', Object.entries(state.boot.card_statuses).filter(([k]) => k !== 'reviewed' || v.card_status === 'reviewed'), v.card_status)}
          <span class="hint">علامت «بررسی‌شده» را مسئول تکمیل شناسنامه اموال می‌زند.</span></div>
      </fieldset>

      <div class="btns sticky-actions"><button class="btn" type="submit">${item ? 'ذخیره تغییرات' : 'ثبت شناسنامه'}</button>
        <a class="btn ghost" href="${item ? `#/items/${item.id}` : '#/items'}">انصراف</a></div>
    </form>
    <datalist id="dl-cat">${state.boot.categories.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    <datalist id="dl-loc">${state.boot.locations.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    <datalist id="dl-unit">${state.boot.units.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`;
  const f = $('#itemf');
  wireChips(f);
  const typeSel = $('[name=item_type]', f);
  typeSel.addEventListener('change', () => {
    $('#spec-fields').innerHTML = specFields(typeSel.value);
    $('#type-label').textContent = types[typeSel.value]?.label || '';
  });
  $('#add-custom').addEventListener('click', () => $('#custom').insertAdjacentHTML('beforeend', customRow({})));
  $('#custom').addEventListener('click', (e) => { if (e.target.closest('[data-rm]')) e.target.closest('.custom-row').remove(); });
  const photos = [];
  $('#img').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      try {
        const data = await resizeImage(file);
        photos.push({ image_data: data });
        const idx = photos.length - 1;
        $('#new-photos').insertAdjacentHTML('beforeend', `<div class="photo-row"><img src="${data}" alt=""><input class="input" data-cap="${idx}" placeholder="توضیح عکس (مثلاً برچسب سریال)"></div>`);
      } catch { toast('یکی از تصاویر قابل خواندن نیست.', { error: true }); }
    }
    e.target.value = '';
  });
  const syncBatch = () => { const bf = $('#batch-fields'); if (bf) bf.hidden = !$('[name=batch_tracked]', f).checked; };
  $('[name=batch_tracked]', f).addEventListener('change', syncBatch);
  $('[name=warehouse_id]', f)?.addEventListener('change', (e) => {
    $('[name=batch_tracked]', f).checked = !!state.boot.warehouses.find((x) => x.id === Number(e.target.value))?.tracks_expiry;
    syncBatch();
  });
  syncBatch();
  const opk = opKey();
  onSubmit(f, async (raw) => {
    const body = { details: { specs: {}, custom: [] } };
    for (const [k, val] of Object.entries(raw)) {
      if (k.startsWith('d.specs.')) body.details.specs[k.slice(8)] = val;
      else if (k.startsWith('d.')) body.details[k.slice(2)] = val;
      else if (!k.startsWith('cf_')) body[k] = val;
    }
    $$('.custom-row', f).forEach((r) => {
      const label = $('[data-cf=label]', r).value.trim();
      const value = $('[data-cf=value]', r).value.trim();
      if (label && value) body.details.custom.push({ label, value });
    });
    body.code = toEn(body.code).trim();
    body.serial = toEn(body.serial);
    $$('[data-cap]', f).forEach((c) => { photos[Number(c.dataset.cap)].caption = c.value; });
    if (item) {
      await PUT(`/api/items/${item.id}`, body);
      for (const ph of photos) await POST(`/api/items/${item.id}/photos`, ph);
      toast('شناسنامه ذخیره شد.');
      location.hash = `#/items/${item.id}`;
    } else {
      const r = await POST('/api/items', { ...body, photos, op_key: opk });
      await loadBoot();
      toast('شناسنامه ثبت شد.');
      location.hash = `#/items/${r.id}`;
    }
  });
}
const customRow = (c) => `<div class="custom-row form-row"><input class="input" data-cf="label" placeholder="عنوان فیلد" value="${esc(c.label || '')}">
  <div style="display:flex;gap:6px"><input class="input" data-cf="value" placeholder="مقدار" value="${esc(c.value || '')}"><button type="button" class="icon-btn" data-rm aria-label="حذف">${icon('x')}</button></div></div>`;

function resizeImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ================================================================ item detail */
async function pageItem(id, q, main) {
  const i = await GET(`/api/items/${id}`);
  const types = state.boot.item_types;
  const d = i.details || { specs: {}, custom: [] };
  const openLoans = i.loans.filter((l) => l.status === 'open');
  const gen = state.boot.general_fields.filter(([k]) => d[k]);
  const specs = (types[i.item_type]?.fields || []).filter(([k]) => d.specs?.[k]);
  const money = (v) => (v == null || v === '' ? '' : `${fa(v)} ${esc(state.boot.currencies[i.currency] || '')}`);
  main.innerHTML = `
    <a class="back" href="#/items?warehouse=${i.warehouse_id}">${icon('back')} ${esc(i.warehouse)}</a>
    <div class="card item-hero">
      ${i.photos.length ? `<img class="item-photo" src="${esc(i.photos[0].url)}" alt="${esc(i.name)}">` : `<div class="item-photo noimg">${icon('box')}</div>`}
      <div style="display:grid;gap:12px;min-width:0">
        <div><h1>${esc(i.name)}</h1>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${i.archived ? '<span class="pill">بایگانی</span>' : ''}${condPill(i.condition) || '<span class="pill ok">سالم</span>'}${stockPill(i)}
            <span class="pill">${esc(types[i.item_type]?.label || '')}</span>${i.batch_tracked ? '<span class="pill brass">تاریخ‌دار</span>' : ''}${cardPill(i.card_status)}</div></div>
        <div class="stock">
          <div class="main-stock"><b>${fa(i.usable_qty)}</b><span>قابل‌استفاده (${esc(i.unit)})</span></div>
          <div><b>${fa(i.qty)}</b><span>داخل انبار</span></div>
          ${i.reserved_qty > 0 ? `<div><b>${fa(i.reserved_qty)}</b><span>رزروشده برای حواله</span></div>` : ''}
          ${i.broken_qty > 0 ? `<div><b>${fa(i.broken_qty)}</b><span>خراب</span></div>` : ''}
          ${i.loaned_qty > 0 ? `<div><b>${fa(i.loaned_qty)}</b><span>در امانت</span></div>` : ''}
          ${i.transit_qty > 0 ? `<div><b>${fa(i.transit_qty)}</b><span>در حال انتقال</span></div>` : ''}
          ${i.min_qty > 0 ? `<div><b>${fa(i.min_qty)}</b><span>حداقل لازم</span></div>` : ''}
        </div>
      </div>
    </div>
    ${!i.archived ? `<div class="actions">
      ${i.can.request_out ? `<a class="action out" href="#/exits/new?warehouse=${i.warehouse_id}&item=${i.id}">${icon('file')}درخواست خروج</a>` : ''}
      ${i.can.stock_in ? `<button class="action in" data-op="in">${icon('in')}ورود</button>` : ''}
      ${i.can.edit ? `<button class="action loan" data-op="damage">${icon('wrench')}ثبت خرابی</button>` : ''}
      ${i.can.edit && i.broken_qty > 0 ? `<button class="action transfer" data-op="repair">${icon('check')}ثبت تعمیر</button>` : ''}
      ${i.can.stock_in || i.can.approve ? `<button class="action adjust" data-op="adjust">${icon('adjust')}اصلاح موجودی</button>` : ''}
      ${i.can.edit ? `<a class="action" href="#/items/${i.id}/edit">${icon('edit')}ویرایش شناسنامه</a>` : ''}
      ${i.can.steward ? `<button class="action" data-op="review">${icon('star')}بررسی شناسنامه</button>` : ''}
    </div>` : ''}
    ${i.card_status !== 'reviewed' && i.missing.length ? `<div class="callout">برای تکمیل شناسنامه: ${esc(i.missing.join('، '))}</div>` : ''}
    ${i.open_exits.length ? `<div class="card"><h2>درخواست‌های خروج باز این کالا</h2><div class="list">${i.open_exits.map((e) => `
      <a class="row" href="#/exits/${e.id}"><span class="grow"><span class="title">${exitCode(e.id)} · ${esc(state.boot.exit_types[e.type])}${e.recipient ? ' · ' + esc(e.recipient) : ''}</span></span>
        <span class="end">${qtyHtml(e.qty, i.unit)}${exitPill(e.status)}</span></a>`).join('')}</div></div>` : ''}
    <div class="card"><h2>شناسنامه</h2>
      <dl class="specs">
        <dt>کد اموال</dt><dd class="num">${esc(faDigits(i.code))}</dd>
        <dt>انبار</dt><dd>${esc(i.warehouse)}</dd>
        ${i.category ? `<dt>دسته‌بندی</dt><dd>${esc(i.category)}</dd>` : ''}
        ${i.brand ? `<dt>برند / سازنده</dt><dd>${esc(i.brand)}</dd>` : ''}
        ${i.model ? `<dt>مدل</dt><dd>${esc(i.model)}</dd>` : ''}
        ${i.serial ? `<dt>سریال</dt><dd dir="ltr" style="text-align:right">${esc(i.serial)}</dd>` : ''}
        ${i.location ? `<dt>محل نگهداری</dt><dd>${esc(i.location)}</dd>` : ''}
        ${i.custodian ? `<dt>تحویل‌دار</dt><dd>${esc(i.custodian)}</dd>` : ''}
        ${specs.map(([k, label]) => `<dt>${esc(label)}</dt><dd style="white-space:pre-line">${esc(d.specs[k])}</dd>`).join('')}
        ${gen.map(([k, label]) => `<dt>${esc(label)}</dt><dd style="white-space:pre-line">${esc(d[k])}</dd>`).join('')}
        ${i.condition_notes ? `<dt>شرح سلامت و نقص</dt><dd style="white-space:pre-line">${esc(i.condition_notes)}</dd>` : ''}
        ${(d.custom || []).map((c) => `<dt>${esc(c.label)}</dt><dd style="white-space:pre-line">${esc(c.value)}</dd>`).join('')}
        ${i.source ? `<dt>منبع</dt><dd>${esc(state.boot.sources[i.source])}${i.vendor ? ' — ' + esc(i.vendor) : ''}</dd>` : (i.vendor ? `<dt>فروشنده / اهداکننده</dt><dd>${esc(i.vendor)}</dd>` : '')}
        ${'purchase_price' in i ? `<dt>قیمت خرید</dt><dd>${money(i.purchase_price) || 'نامشخص'}${i.purchase_date ? ' — ' + jdate(i.purchase_date) : ''}</dd>
          <dt>ارزش فعلی</dt><dd>${money(i.current_value) || 'نامشخص'}${i.valuation_date ? ' — برآورد ' + jdate(i.valuation_date) : ''}</dd>` : ''}
        ${i.notes ? `<dt>توضیحات</dt><dd style="white-space:pre-line">${esc(i.notes)}</dd>` : ''}
        <dt>ثبت‌کننده</dt><dd>${esc(i.creator || '—')} · ${jdate(i.created_at)}</dd>
        ${i.last_review_at ? `<dt>آخرین بررسی</dt><dd>${esc(i.reviewer || '')} · ${jdate(i.last_review_at)}</dd>` : ''}
      </dl>
    </div>
    ${i.photos.length ? `<div class="card"><h2>عکس‌ها</h2><div class="gallery">${i.photos.map((p) => `<figure>
      <a href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" alt="${esc(p.caption || '')}" loading="lazy"></a>
      <figcaption>${esc(p.caption || '')}${i.can.edit ? ` <button class="link-btn" data-ph="${p.id}" data-cap="${esc(p.caption || '')}">ویرایش</button>` : ''}</figcaption></figure>`).join('')}</div></div>` : ''}
    ${i.batch_tracked ? `<div class="card"><h2>سری‌ها و تاریخ انقضا</h2><div class="list">${i.batches.map((b, n) => `
      <div class="row"><span class="grow"><span class="title">سری ${esc(b.batch_no)} ${n === 0 ? '<span class="pill brand">اول مصرف شود</span>' : ''}</span>
        <span class="meta">انقضا: ${b.expiry ? jdate(b.expiry) + ' (' + relDays(b.expiry) + ')' : 'ندارد'}</span></span>
        <span class="end">${qtyHtml(b.qty, i.unit)}${expiryPill(b.expiry)}</span></div>`).join('') || '<p class="empty">سری دارای موجودی ثبت نشده است.</p>'}</div></div>` : ''}
    ${openLoans.length ? `<div class="card"><h2>امانت‌های باز</h2><div class="list">${openLoans.map((l) => loanRow({ ...l, unit: i.unit, item_name: i.name, can_return: i.can.stock_in }, false)).join('')}</div></div>` : ''}
    ${i.transfers.length ? `<div class="card"><h2>انتقال‌ها</h2><div class="list">${i.transfers.slice(0, 6).map((t) => `
      <div class="row"><span class="grow"><span class="title">${esc(t.from_name)} ← ${esc(t.to_name)}</span><span class="meta">${jdate(t.sent_at)}</span></span>
        <span class="end">${qtyHtml(t.qty, i.unit)}${pill(TR_STATUS[t.status])}</span></div>`).join('')}</div></div>` : ''}
    <div class="card"><h2>سابقه عملیات <span style="font-size:.8rem;color:var(--muted);font-weight:500">${fa(i.history.length)} مورد</span></h2>
      <div class="list">${i.history.map((t) => `<div class="row" style="align-items:flex-start">
        <a class="grow" href="#/receipt/${t.id}" style="color:inherit"><span class="title">${esc(reasonLabel(t.reason))}${t.exit_id ? ` <span class="pill info">${exitCode(t.exit_id)}</span>` : ''}${t.corrects_id ? ` <span class="pill info">اصلاح رسید ${fa(t.corrects_id)}</span>` : ''}</span>
          <span class="meta">${jdate(t.op_date)} · ${esc(t.recorder)}${t.party ? ` · طرف: ${esc(t.party)}` : ''}${t.note ? ` · ${esc(t.note)}` : ''}</span></a>
        <span class="end"><span class="qty num ${t.direction === 'st' ? 'delta-adj' : t.delta > 0 ? 'delta-in' : 'delta-out'}">${t.direction === 'st' ? fa(t.qty) : (t.delta > 0 ? '+' : '−') + fa(Math.abs(t.delta))}</span>
          <span class="meta">مانده ${fa(t.qty_after)}</span>
          ${(i.can.stock_in || i.can.approve) && t.reason !== 'adjust' && t.direction !== 'st' ? `<button class="btn sm ghost" data-correct="${t.id}">اصلاح</button>` : ''}</span></div>`).join('') || '<p class="empty">هنوز عملیاتی ثبت نشده است.</p>'}</div></div>
    ${i.can.edit ? `<div class="btns no-print">
      <button class="btn ghost sm" id="arch">${icon('archive')} ${i.archived ? 'خارج‌کردن از بایگانی' : 'بایگانی کالا'}</button>
      ${can('manage_users') ? `<a class="btn ghost sm" href="#/admin/audit?entity=item&entity_id=${i.id}">${icon('history')} سابقه ویرایش</a>` : ''}</div>` : ''}`;

  const ops = { in: opIn, adjust: opAdjust, damage: (x) => opDamage(x, 'damage'), repair: (x) => opDamage(x, 'repair'), review: opReview };
  $$('[data-op]', main).forEach((b) => b.addEventListener('click', () => ops[b.dataset.op](i)));
  $$('[data-correct]', main).forEach((b) => b.addEventListener('click', () => opAdjust(i, Number(b.dataset.correct))));
  $$('[data-return]', main).forEach((b) => b.addEventListener('click', () => opReturn(i.loans.find((l) => l.id === Number(b.dataset.return)), i.unit)));
  $$('[data-ph]', main).forEach((b) => b.addEventListener('click', () => sheet('توضیح عکس', `<form class="form" id="phf"><p class="form-error" hidden></p>
    ${field('توضیح', input('caption', { value: b.dataset.cap }))}
    <div class="btns"><button class="btn" type="submit">ذخیره</button><button class="btn ghost danger-text" type="button" id="phdel">حذف عکس از شناسنامه</button></div></form>`, (root, close) => {
    onSubmit($('#phf', root), async (dd) => { await POST(`/api/photos/${b.dataset.ph}`, dd); close(); reload(); });
    $('#phdel', root).onclick = async () => { await POST(`/api/photos/${b.dataset.ph}`, { delete: 1 }); close(); reload(); };
  })));
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
  if (q.do && ops[q.do]) {
    setQuery(`/items/${i.id}`, {});
    ops[q.do](i);
  }
}

const done = (msg, txId) => toast(msg, txId ? { link: `#/receipt/${txId}`, linkText: 'رسید' } : {});
const opForm = (inner, submit) => `<form class="form" id="opf"><p class="form-error" hidden></p>${inner}<button class="btn block" type="submit">${submit}</button></form>`;
function bindOp(root, close, url, msg, extra = {}) {
  const key = opKey();
  onSubmit($('#opf', root), async (d) => {
    const r = await POST(url, { ...d, ...extra, op_key: key });
    close(); done(msg, r.tx_id); reload();
  });
}

function opIn(i) {
  sheet(`ورود «${i.name}»`, opForm(`
    ${field('مقدار', numInput('qty', { unit: i.unit }))}
    <div class="field"><span class="label">علت ورود</span>${radioChips('reason', [['purchase', 'خرید'], ['gift', 'هدیه'], ['opening', 'موجودی اولیه'], ['return_in', 'بازگشت']], 'purchase')}</div>
    ${i.batch_tracked ? `<div class="form-row">${field('شماره سری', input('batch_no', { required: true, attrs: 'dir="ltr"' }))}${dateInput('expiry', 'تاریخ انقضا', '', { required: true })}</div>` : ''}
    ${field('تحویل‌دهنده', input('party', { placeholder: 'فروشنده، اهداکننده یا شخص' }))}
    <details class="more"><summary>تاریخ و توضیحات</summary><div class="form">${dateInput('op_date', 'تاریخ', todayIso())}${field('توضیحات', textarea('note'))}</div></details>`,
  `${icon('in')} ثبت رسید ورود`), (root, close) => bindOp(root, close, `/api/items/${i.id}/in`, 'رسید ورود ثبت شد.'));
}

function opDamage(i, mode) {
  const max = mode === 'damage' ? i.usable_qty : i.broken_qty - (i.reserved_broken || 0);
  sheet(mode === 'damage' ? `ثبت خرابی «${i.name}»` : `ثبت تعمیر «${i.name}»`, opForm(`
    <div class="callout info">${mode === 'damage' ? 'سالم و آزاد' : 'خراب'}: <b>${fa(max)} ${esc(i.unit)}</b>. این عملیات موجودی کل را تغییر نمی‌دهد؛ فقط وضعیت را جابه‌جا می‌کند.</div>
    ${field('مقدار', numInput('qty', { unit: i.unit, value: max === 1 ? 1 : '' }))}
    ${field(mode === 'damage' ? 'شرح خرابی' : 'شرح تعمیر', textarea('note', { required: true, placeholder: mode === 'damage' ? 'مثلاً خروجی دوم صدا ندارد' : 'مثلاً کابل تعویض شد و سالم است' }))}`,
  mode === 'damage' ? `${icon('wrench')} ثبت خرابی` : `${icon('check')} ثبت تعمیر`), (root, close) => bindOp(root, close, `/api/items/${i.id}/${mode}`, 'ثبت شد.'));
}

function opReview(i) {
  sheet('بررسی شناسنامه', `<form class="form" id="rvf"><p class="form-error" hidden></p>
    ${i.missing.length ? `<div class="callout">موارد ناقص: ${esc(i.missing.join('، '))}</div>` : '<div class="callout info">مورد ناقص مهمی دیده نمی‌شود.</div>'}
    <div class="field"><span class="label">نتیجه</span>${radioChips('status', [['reviewed', 'بررسی‌شده و یکدست'], ['incomplete', 'نیازمند تکمیل']], i.missing.length ? 'incomplete' : 'reviewed')}</div>
    ${field('یادداشت', textarea('note'))}
    <button class="btn block" type="submit">ثبت بررسی</button></form>`, (root, close) => {
    onSubmit($('#rvf', root), async (d) => { await POST(`/api/items/${i.id}/review`, d); close(); toast('بررسی ثبت شد.'); reload(); });
  });
}

function opAdjust(i, correctsId = null) {
  const batchOpts = i.batches.map((b) => [b.id, `سری ${b.batch_no} · ${fa(b.qty)} ${i.unit}`]);
  sheet(correctsId ? `اصلاح رسید ${fa(correctsId)}` : `اصلاح موجودی «${i.name}»`, opForm(`
    <div class="callout">سوابق حذف نمی‌شوند. مقدار درست را وارد کنید تا اختلاف با علت آن ثبت شود.
      ${i.can.approve ? '' : '<br>شما فقط می‌توانید موجودی را افزایش دهید؛ کاهش با تأییدکنندگان خروج است.'}</div>
    ${i.batch_tracked ? field('سری', select('batch_id', batchOpts, '', { empty: 'انتخاب سری', attrs: 'required' })) : ''}
    ${field('مقدار شمارش‌شده (درست)', numInput('new_qty', { unit: i.unit }), `موجودی فعلی در سامانه: ${fa(i.qty)} ${esc(i.unit)}`)}
    ${field('علت اصلاح (الزامی)', textarea('note', { required: true, placeholder: 'مثلاً شمارش پایان ماه' }))}
    ${correctsId ? `<input type="hidden" name="corrects_id" value="${correctsId}">` : ''}`,
  `${icon('adjust')} ثبت اصلاح`), (root, close) => bindOp(root, close, `/api/items/${i.id}/adjust`, 'اصلاح ثبت شد.'));
}

function opReturn(l, unit) {
  const left = Math.round((l.qty - l.returned_qty) * 1000) / 1000;
  sheet(`بازگشت امانت «${l.item_name || ''}»`, opForm(`
    <div class="callout info">${esc(l.borrower)} — باقی‌مانده: <b>${fa(left)} ${esc(unit)}</b></div>
    ${field('مقدار برگشتی', numInput('qty', { unit, value: left }), 'بازگشت جزئی هم ممکن است.')}
    ${field('از این مقدار، چند مورد خراب برگشته؟', numInput('broken', { unit, required: false, placeholder: '۰' }))}
    ${field('بررسی سلامت و توضیحات', textarea('note', { placeholder: 'مثلاً سالم تحویل شد / کابل همراه آن نیست' }))}`,
  `${icon('in')} ثبت بازگشت`), (root, close) => bindOp(root, close, `/api/loans/${l.id}/return`, 'بازگشت ثبت شد.'));
}

/* ================================================================ receipt (single stock operation) */
async function pageReceipt(id, _, main) {
  const t = await GET(`/api/transactions/${id}`);
  const kind = { in: 'رسید ورود کالا', out: 'رسید خروج کالا', adj: 'سند اصلاح موجودی', st: 'سند تغییر وضعیت (خرابی/تعمیر)' }[t.direction];
  const alloc = t.batch_alloc ? JSON.parse(t.batch_alloc) : null;
  main.innerHTML = `
    <div class="btns no-print"><a class="back" href="#/items/${t.item_id}">${icon('back')} بازگشت به کالا</a><span style="flex:1"></span>
      ${t.exit_id ? `<a class="btn ghost" href="#/voucher/${t.exit_id}">حواله ${exitCode(t.exit_id)}</a>` : ''}
      <button class="btn" onclick="window.print()">${icon('printer')} چاپ</button></div>
    <article class="receipt">
      <header><div class="org"><img src="${LOGO}" alt=""><div><b>${esc(ORG)}</b><small>${esc(ORG_SUB)} · ${esc(t.warehouse)}</small></div></div>
        <div style="text-align:left"><h1>${kind}</h1><small>شماره ${fa(t.id)}</small></div></header>
      <table>
        <tr><th>تاریخ</th><td>${jdate(t.op_date, { long: true })}</td></tr>
        <tr><th>کالا</th><td>${esc(t.item_name)} — کد ${esc(faDigits(t.code))}${t.brand || t.model ? ` — ${esc([t.brand, t.model].filter(Boolean).join(' '))}` : ''}${t.serial ? ` — سریال ${esc(t.serial)}` : ''}</td></tr>
        <tr><th>مقدار</th><td><b>${fa(t.direction === 'st' ? t.qty : Math.abs(t.delta))} ${esc(t.unit)}</b></td></tr>
        <tr><th>علت</th><td>${esc(reasonLabel(t.reason))}</td></tr>
        ${alloc ? `<tr><th>سری</th><td>${alloc.map((a) => `${esc(a.batch_no)} (${fa(a.qty)} ${esc(t.unit)}${a.expiry ? '، انقضا ' + jdate(a.expiry) : ''})`).join('، ')}</td></tr>` : ''}
        ${t.party ? `<tr><th>${t.direction === 'in' ? 'تحویل‌دهنده' : 'تحویل‌گیرنده'}</th><td>${esc(t.party)}</td></tr>` : ''}
        ${t.exit_id ? `<tr><th>حواله خروج</th><td>${exitCode(t.exit_id)}</td></tr>` : ''}
        <tr><th>موجودی پس از عملیات</th><td>${fa(t.qty_after)} ${esc(t.unit)}</td></tr>
        ${t.note ? `<tr><th>توضیحات</th><td>${esc(t.note)}</td></tr>` : ''}
        ${t.corrects_id ? `<tr><th>اصلاح سند</th><td>شماره ${fa(t.corrects_id)}</td></tr>` : ''}
        ${t.corrections.length ? `<tr><th>اصلاحیه‌ها</th><td>${t.corrections.map((c) => `سند ${fa(c.id)}: ${c.delta > 0 ? '+' : '−'}${fa(Math.abs(c.delta))} — ${esc(c.note)}`).join('<br>')}</td></tr>` : ''}
        <tr><th>ثبت‌کننده</th><td>${esc(t.recorder)} — ${jdate(t.created_at, { time: true })}</td></tr>
      </table>
      <div class="sign"><div>ثبت‌کننده<br>${esc(t.recorder)}</div><div>${t.direction === 'in' ? 'تحویل‌دهنده' : 'تحویل‌گیرنده'}${t.party ? '<br>' + esc(t.party) : ''}</div><div>مسئول انبار</div></div>
    </article>`;
}

/* ================================================================ exit requests (درخواست خروج → تأیید → تحویل) */
async function pageExits(_, q, main) {
  const tabs = [];
  if (can('approve')) tabs.push(['approve', 'منتظر تأیید']);
  if (can('deliver')) tabs.push(['deliver', 'آماده تحویل']);
  tabs.push(['mine', 'درخواست‌های من'], ['drafts', 'پیش‌نویس / اصلاح'], ['all', 'همه']);
  const tab = q.tab || tabs[0][0];
  const rows = await GET(`/api/exits?tab=${tab}${q.q ? '&q=' + encodeURIComponent(q.q) : ''}`);
  main.innerHTML = `<div class="page-head"><h1>درخواست‌ها و حواله‌های خروج</h1>${can('request_out') ? `<a class="btn" href="#/exits/new">${icon('plus')} درخواست خروج</a>` : ''}</div>
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/exits?tab=${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</div>
    <form id="xs" class="searchbox">${icon('search')}<input class="input" name="q" value="${esc(q.q || '')}" placeholder="شماره پیگیری (مثلاً ۱۲) یا نام تحویل‌گیرنده" type="search"></form>
    <p style="color:var(--muted);font-size:.84rem">خروج سه مرحله دارد: ثبت درخواست، تأیید یکی از تأییدکنندگان، و ثبت تحویل واقعی. موجودی فقط هنگام تحویل کم می‌شود.</p>
    <div class="card"><div class="list">${rows.map((e) => `<a class="row" href="#/exits/${e.id}"><span class="grow">
        <span class="title">${exitCode(e.id)} · ${esc(state.boot.exit_types[e.type])}${e.to_name ? ' به ' + esc(e.to_name) : ''}${e.recipient ? ' · ' + esc(e.recipient) : ''}</span>
        <span class="meta">${esc(e.from_name)} · ${esc(e.item_names || '')}</span>
        <span class="meta">${esc(e.requester)} · ${jdate(e.created_at)}${e.approver ? ` · تصمیم: ${esc(e.approver)}` : ''}${e.ticket_id ? ' · از تیکت' : ''}</span></span>
      ${exitPill(e.status)}</a>`).join('') || '<p class="empty">موردی نیست.</p>'}</div></div>`;
  $('#xs').addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/exits?tab=${tab}&q=${encodeURIComponent(new FormData(e.target).get('q'))}`; });
}

async function pageExitForm(id, q, main) {
  const ex = id ? await GET(`/api/exits/${id}`) : null;
  if (ex && !ex.can.edit) throw new Error('این درخواست قابل ویرایش نیست.');
  const ticket = !ex && q.ticket ? await GET(`/api/tickets/${q.ticket}`) : (ex?.ticket_id ? await GET(`/api/tickets/${ex.ticket_id}`).catch(() => null) : null);
  const whs = whsWith('request_out');
  if (!whs.length) throw new Error('شما اجازه ثبت درخواست خروج ندارید.');
  const v = ex || {
    type: 'consume', from_wh: Number(q.warehouse) || ticket?.referred_wh || whs[0].id, lines: q.item ? [{ item_id: Number(q.item), qty: '' }] : [],
    recipient: ticket ? `${ticket.first_name} ${ticket.last_name}` : '', recipient_phone: ticket?.phone || '', ticket_id: ticket?.id || null,
    reason: ticket ? `درخواست ${ticket.code}: ${ticket.item_text}` : '',
  };
  const sel = new Map((v.lines || []).map((l) => [Number(l.item_id), { qty: l.qty, from_broken: Number(l.from_broken || 0) }]));
  main.innerHTML = `
    <a class="back" href="${ex ? `#/exits/${ex.id}` : ticket ? `#/tickets/${ticket.id}` : '#/exits'}">${icon('back')} بازگشت</a>
    <h1>${ex ? `ویرایش درخواست ${exitCode(ex.id)}` : 'درخواست خروج'}</h1>
    ${ex?.status === 'approved' ? '<div class="callout">این درخواست تأیید شده است. تغییر کالا، مقدار، انبار، تحویل‌گیرنده یا نوع خروج، تأیید را باطل می‌کند و درخواست دوباره بررسی می‌شود.</div>' : ''}
    ${ticket ? `<div class="callout info">${icon('ticket')} برای تیکت ${faDigits(ticket.code)} — ${esc(ticket.first_name)} ${esc(ticket.last_name)}: «${esc(ticket.item_text)}»${ticket.qty_text ? ' — ' + esc(ticket.qty_text) : ''}</div>` : ''}
    <form class="form" id="exf">
      <p class="form-error" hidden></p>
      <fieldset class="card form"><legend>۱. انبار و نوع خروج</legend>
        <div class="form-row">${field('انبار مبدأ', select('from_wh', whs.map((w) => [w.id, w.name]), v.from_wh))}
          <div class="field"><span class="label">نوع خروج</span>${radioChips('type', Object.entries(state.boot.exit_types), v.type)}</div></div>
        <div id="to-wh" ${v.type === 'transfer' ? '' : 'hidden'}>${field('انبار مقصد', select('to_wh', state.boot.all_warehouses.map((w) => [w.id, w.name]), v.to_wh, { empty: 'انتخاب کنید' }))}</div>
      </fieldset>
      <fieldset class="card form"><legend>۲. انتخاب کالاها</legend>
        <div class="searchbox">${icon('search')}<input class="input" id="pick-q" placeholder="جست‌وجو در اموال این انبار…" autocomplete="off" type="search"></div>
        <div id="picked" class="picked"></div>
        <div class="list pick-list" id="pick-list"><p class="empty">در حال بارگذاری…</p></div>
      </fieldset>
      <fieldset class="card form"><legend>۳. تحویل‌گیرنده و جزئیات</legend>
        <div class="form-row">${field('نام تحویل‌گیرنده', input('recipient', { value: v.recipient }))}${field('شماره تماس', input('recipient_phone', { value: v.recipient_phone ? faDigits(v.recipient_phone) : '', attrs: 'inputmode="tel" dir="ltr"' }))}</div>
        ${field('علت خروج', textarea('reason', { value: v.reason, placeholder: 'برای چه کاری لازم است' }))}
        <div class="form-row">${field('برنامه یا محل استفاده', input('program', { value: v.program }))}${field('محل تحویل', input('delivery_place', { value: v.delivery_place, placeholder: 'مثلاً درِ انبار مسجد' }))}</div>
        <div class="form-row">${dateInput('needed_by', 'تاریخ موردنیاز', v.needed_by || '')}
          <div id="due" ${v.type === 'loan' ? '' : 'hidden'}>${dateInput('due_date', 'موعد بازگشت امانت', v.due_date || addDays(todayIso(), 3), { quick: [[1, 'فردا'], [3, '۳ روز'], [7, 'یک هفته'], [30, 'یک ماه']] })}</div></div>
        ${field('توضیحات', textarea('note', { value: v.note }))}
      </fieldset>
      <div class="btns sticky-actions">
        <button class="btn" type="submit" name="go" value="submit">${icon('send')} ${ex && !['draft', 'needs_changes'].includes(ex.status) ? 'ذخیره تغییرات' : 'ارسال برای تأیید'}</button>
        ${!ex || ['draft', 'needs_changes'].includes(ex.status) ? '<button class="btn ghost" type="submit" name="go" value="draft">ذخیره پیش‌نویس</button>' : ''}
      </div>
    </form>`;
  const f = $('#exf');
  wireChips(f);
  let items = [];
  const typeVal = () => $('[name=type]:checked', f)?.value;
  const renderPicked = () => {
    const rows = [...sel.entries()].map(([iid, s]) => {
      const it = items.find((x) => x.id === iid) || (v.lines || []).find((l) => Number(l.item_id) === iid) || {};
      const name = it.name || it.item_name || 'کالا';
      const unitName = it.unit || '';
      const avail = it.id ? (s.from_broken ? it.broken_qty - (it.reserved_broken || 0) : usable(it)) : null;
      return `<div class="picked-row" data-iid="${iid}"><span class="grow"><b>${esc(name)}</b>${avail != null ? `<span class="meta">آزاد: ${fa(avail)} ${esc(unitName)}</span>` : ''}
        ${typeVal() === 'permanent' && it.broken_qty > 0 ? `<label class="check" style="font-size:.8rem"><input type="checkbox" data-broken ${s.from_broken ? 'checked' : ''}> از اقلام خراب (اسقاط)</label>` : ''}</span>
        <div class="with-unit qty-in"><input class="input" data-qty inputmode="decimal" value="${esc(s.qty === '' ? '' : faDigits(s.qty))}" placeholder="مقدار"><span>${esc(unitName)}</span></div>
        <button type="button" class="icon-btn" data-unpick aria-label="حذف">${icon('x')}</button></div>`;
    });
    $('#picked').innerHTML = rows.length ? `<p class="label" style="font-weight:700;font-size:.85rem">انتخاب‌شده (${fa(rows.length)})</p>${rows.join('')}` : '<p class="hint" style="color:var(--muted);font-size:.84rem">کالایی انتخاب نشده است. از فهرست زیر تیک بزنید.</p>';
  };
  const renderList = () => {
    const s = $('#pick-q').value.trim();
    const shown = items.filter((i) => !s || [i.name, i.code, i.brand, i.model, i.serial, i.location].some((x) => x && String(x).includes(s))).slice(0, 80);
    $('#pick-list').innerHTML = shown.map((i) => `<label class="row pick">
      <input type="checkbox" data-pick="${i.id}" ${sel.has(i.id) ? 'checked' : ''}>
      ${thumb(i.image_url)}<span class="grow"><span class="title">${esc(i.name)}</span>
        <span class="meta">کد ${esc(faDigits(i.code))}${i.model ? ' · ' + esc(i.model) : ''}${i.location ? ' · ' + esc(i.location) : ''}</span></span>
      <span class="end">${qtyHtml(usable(i), i.unit)}<span class="meta">قابل‌استفاده</span></span></label>`).join('') || '<p class="empty">کالایی در این انبار پیدا نشد.</p>';
  };
  const loadItems = async () => {
    items = await GET(`/api/items?warehouse=${$('[name=from_wh]', f).value}`);
    renderList(); renderPicked();
  };
  $('#pick-q').addEventListener('input', renderList);
  $('#pick-list').addEventListener('change', (e) => {
    const cb = e.target.closest('[data-pick]');
    if (!cb) return;
    const iid = Number(cb.dataset.pick);
    if (cb.checked) sel.set(iid, { qty: usable(items.find((x) => x.id === iid)) === 1 ? 1 : '', from_broken: 0 }); else sel.delete(iid);
    renderPicked();
  });
  $('#picked').addEventListener('input', (e) => {
    const row = e.target.closest('[data-iid]');
    if (!row) return;
    const s = sel.get(Number(row.dataset.iid));
    if (e.target.matches('[data-qty]')) s.qty = toEn(e.target.value);
  });
  $('#picked').addEventListener('change', (e) => {
    const row = e.target.closest('[data-iid]');
    if (row && e.target.matches('[data-broken]')) { sel.get(Number(row.dataset.iid)).from_broken = e.target.checked ? 1 : 0; renderPicked(); }
  });
  $('#picked').addEventListener('click', (e) => {
    const row = e.target.closest('[data-iid]');
    if (row && e.target.closest('[data-unpick]')) { sel.delete(Number(row.dataset.iid)); renderPicked(); renderList(); }
  });
  $('[name=from_wh]', f).addEventListener('change', () => { sel.clear(); loadItems(); });
  f.addEventListener('change', (e) => {
    if (e.target.name !== 'type') return;
    $('#to-wh').hidden = typeVal() !== 'transfer';
    $('#due').hidden = typeVal() !== 'loan';
    if (typeVal() !== 'permanent') sel.forEach((s) => { s.from_broken = 0; });
    renderPicked();
  });
  let go = 'submit';
  $$('[name=go]', f).forEach((b) => b.addEventListener('click', () => { go = b.value; }));
  onSubmit(f, async (d) => {
    const body = {
      ...d, recipient_phone: toEn(d.recipient_phone), ticket_id: v.ticket_id || null, submit: go === 'submit' ? 1 : 0,
      lines: [...sel.entries()].map(([item_id, s]) => ({ item_id, qty: s.qty, from_broken: s.from_broken })),
    };
    if (!body.lines.length) throw new Error('حداقل یک کالا انتخاب کنید.');
    const r = ex ? await PUT(`/api/exits/${ex.id}`, body) : await POST('/api/exits', body);
    toast(go === 'submit' ? 'درخواست برای تأیید ارسال شد.' : 'پیش‌نویس ذخیره شد.');
    location.hash = `#/exits/${r.id}`;
  });
  await loadItems();
}

const EXIT_ACTION = { exit_create: 'ثبت درخواست', exit_update: 'ویرایش', exit_submit: 'ارسال برای تأیید', exit_approve: 'تأیید خروج', exit_reject: 'رد درخواست',
  exit_changes: 'درخواست اصلاح', exit_reapproval: 'باطل‌شدن تأیید به‌علت تغییر', exit_deliver: 'ثبت تحویل و صدور حواله', exit_cancel: 'لغو' };

async function pageExit(id, _, main) {
  const e = await GET(`/api/exits/${id}`);
  const T = state.boot.exit_types;
  main.innerHTML = `
    <a class="back" href="#/exits">${icon('back')} درخواست‌ها و حواله‌ها</a>
    <div class="page-head"><div><h1>${e.status === 'delivered' ? 'حواله خروج' : 'درخواست خروج'} ${e.code}</h1>
      <span class="sub">${esc(T[e.type])}${e.to_name ? ' به ' + esc(e.to_name) : ''} · از ${esc(e.from_name)}</span></div>${exitPill(e.status)}</div>
    ${e.status === 'needs_changes' || e.status === 'rejected' ? `<div class="callout">${e.status === 'rejected' ? 'علت رد' : 'اصلاح لازم'}: ${esc(e.decision_note || '')} — ${esc(e.approver || '')}</div>` : ''}
    ${e.status === 'approved' ? `<div class="callout info"><b>آماده هماهنگی و تحویل.</b> مقدار تأییدشده برای این حواله رزرو شده است.
      ${e.recipient ? `<br>تحویل‌گیرنده: <b>${esc(e.recipient)}</b> ${e.recipient_phone ? telLink(e.recipient_phone) : ''}` : ''}${e.delivery_place ? `<br>محل تحویل: ${esc(e.delivery_place)}` : ''}</div>` : ''}
    <div class="actions-bar no-print">
      ${e.can.decide ? `<button class="btn" data-decide="approve">${icon('check')} تأیید خروج</button><button class="btn ghost" data-decide="changes">نیازمند اصلاح</button><button class="btn ghost" data-decide="reject">رد</button>` : ''}
      ${e.can.deliver ? `<button class="btn brass" id="deliver">${icon('out')} ثبت تحویل واقعی</button>` : ''}
      ${e.can.submit ? `<button class="btn" id="submit">${icon('send')} ارسال برای تأیید</button>` : ''}
      ${e.can.edit ? `<a class="btn ghost" href="#/exits/${e.id}/edit">${icon('edit')} ویرایش</a>` : ''}
      ${e.status === 'delivered' ? `<a class="btn" href="#/voucher/${e.id}">${icon('printer')} حواله قابل چاپ / PDF</a>` : ''}
      ${e.can.cancel ? '<button class="btn ghost" id="cancel">لغو درخواست</button>' : ''}
    </div>
    <div class="card"><h2>اقلام</h2><div class="list">${e.lines.map((l) => `
      <a class="row" href="#/items/${l.item_id}"><span class="grow"><span class="title">${esc(l.item_name)}${l.from_broken ? ' <span class="pill bad">از اقلام خراب</span>' : ''}</span>
        <span class="meta">کد ${esc(faDigits(l.code))}${['pending', 'approved'].includes(e.status) ? ` · آزاد اکنون: ${fa(l.from_broken ? l.broken_free : l.usable_qty)}` : ''}</span></span>
        <span class="end">${qtyHtml(l.qty, l.unit)}${['pending', 'approved'].includes(e.status) && l.qty > (l.from_broken ? l.broken_free : l.usable_qty) ? '<span class="pill bad">موجودی کافی نیست</span>' : ''}</span></a>`).join('')}</div></div>
    <div class="card"><h2>جزئیات</h2><dl class="specs">
      <dt>شماره پیگیری</dt><dd class="num">${e.code}</dd>
      <dt>درخواست‌کننده</dt><dd>${esc(e.requester)} · ${jdate(e.created_at, { time: true })}</dd>
      ${e.recipient ? `<dt>تحویل‌گیرنده</dt><dd>${esc(e.recipient)} ${e.recipient_phone ? '· ' + telLink(e.recipient_phone) : ''}</dd>` : ''}
      ${e.reason ? `<dt>علت خروج</dt><dd style="white-space:pre-line">${esc(e.reason)}</dd>` : ''}
      ${e.program ? `<dt>برنامه / محل استفاده</dt><dd>${esc(e.program)}</dd>` : ''}
      ${e.delivery_place ? `<dt>محل تحویل</dt><dd>${esc(e.delivery_place)}</dd>` : ''}
      ${e.needed_by ? `<dt>تاریخ موردنیاز</dt><dd>${jdate(e.needed_by)}</dd>` : ''}
      ${e.due_date ? `<dt>موعد بازگشت</dt><dd>${jdate(e.due_date)}</dd>` : ''}
      ${e.note ? `<dt>توضیحات</dt><dd style="white-space:pre-line">${esc(e.note)}</dd>` : ''}
      ${e.approver ? `<dt>${e.status === 'rejected' ? 'ردکننده' : e.status === 'needs_changes' ? 'بررسی‌کننده' : 'تأییدکننده'}</dt><dd>${esc(e.approver)} · ${jdate(e.approved_at, { time: true })}${e.decision_note ? ' — ' + esc(e.decision_note) : ''}${e.approver_id === e.requester_id ? ' <span class="pill">تأیید درخواست خود</span>' : ''}</dd>` : ''}
      ${e.deliverer ? `<dt>تحویل‌دهنده</dt><dd>${esc(e.deliverer)} · ${jdate(e.delivered_at, { time: true })}${e.delivery_note ? ' — ' + esc(e.delivery_note) : ''}</dd>` : ''}
      ${e.ticket ? `<dt>تیکت</dt><dd><a href="#/tickets/${e.ticket.id}">${faDigits(e.ticket.code)} — ${esc(e.ticket.first_name)} ${esc(e.ticket.last_name)}</a></dd>` : ''}
    </dl></div>
    <div class="card"><h2>سابقه</h2><ol class="timeline">${e.history.map((h) => {
      const det = h.details ? JSON.parse(h.details) : {};
      return `<li><b>${EXIT_ACTION[h.action] || esc(h.action)}</b> — ${esc(h.actor || '')}<span class="meta"> ${jdate(h.created_at, { time: true })}</span>${det.note ? `<div class="meta">${esc(det.note)}</div>` : ''}</li>`;
    }).join('')}</ol></div>`;
  $$('[data-decide]', main).forEach((b) => b.addEventListener('click', () => {
    const dec = b.dataset.decide;
    const title = { approve: 'تأیید خروج', changes: 'درخواست اصلاح', reject: 'رد درخواست' }[dec];
    sheet(title, `<form class="form" id="df"><p class="form-error" hidden></p>
      ${dec === 'approve' ? `<div class="callout info">با تأیید، ${fa(e.lines.length)} قلم برای این درخواست رزرو می‌شود. موجودی هنگام ثبت تحویل کم می‌شود.</div>` : ''}
      ${field(dec === 'approve' ? 'توضیح (اختیاری)' : 'توضیح (الزامی)', textarea('note', { required: dec !== 'approve' }))}
      <button class="btn block ${dec === 'reject' ? 'danger' : ''}" type="submit">${title}</button></form>`, (root, close) => {
      onSubmit($('#df', root), async (d) => { await POST(`/api/exits/${e.id}/decide`, { ...d, decision: dec }); close(); toast('ثبت شد.'); reload(); });
    });
  }));
  $('#submit')?.addEventListener('click', async () => { try { await POST(`/api/exits/${e.id}/submit`); toast('برای تأیید ارسال شد.'); reload(); } catch (err) { toast(err.message, { error: true }); } });
  $('#cancel')?.addEventListener('click', () => sheet('لغو درخواست', `<form class="form" id="cf"><p class="form-error" hidden></p>${field('علت لغو', textarea('note'))}
    <button class="btn danger block" type="submit">لغو درخواست</button></form>`, (root, close) => {
    onSubmit($('#cf', root), async (d) => { await POST(`/api/exits/${e.id}/cancel`, d); close(); toast('لغو شد.'); reload(); });
  }));
  $('#deliver')?.addEventListener('click', () => sheet(`ثبت تحویل ${e.code}`, `<form class="form" id="dlf"><p class="form-error" hidden></p>
    <div class="callout">فقط وقتی ثبت کنید که اقلام واقعاً تحویل شده است. با ثبت، موجودی کم و حواله خروج صادر می‌شود.</div>
    <ul class="plain">${e.lines.map((l) => `<li>${esc(l.item_name)} — <b>${fa(l.qty)} ${esc(l.unit)}</b></li>`).join('')}</ul>
    ${e.recipient ? `<p>تحویل‌گیرنده: <b>${esc(e.recipient)}</b></p>` : ''}
    ${dateInput('op_date', 'تاریخ تحویل', todayIso())}
    ${field('توضیح تحویل', textarea('note', { placeholder: 'مثلاً تحویل شد؛ کابل برق همراه آن بود' }))}
    <button class="btn brass block" type="submit">${icon('check')} تحویل انجام شد</button></form>`, (root, close) => {
    onSubmit($('#dlf', root), async (d) => {
      await POST(`/api/exits/${e.id}/deliver`, d);
      close(); toast('تحویل ثبت و حواله صادر شد.', { link: `#/voucher/${e.id}`, linkText: 'حواله' }); reload();
    });
  }));
}

async function pageVoucher(id, _, main) {
  const e = await GET(`/api/exits/${id}`);
  if (e.status !== 'delivered') throw new Error('حواله فقط پس از ثبت تحویل صادر می‌شود.');
  main.innerHTML = `
    <div class="btns no-print"><a class="back" href="#/exits/${e.id}">${icon('back')} بازگشت</a><span style="flex:1"></span>
      <button class="btn" onclick="window.print()">${icon('printer')} چاپ یا ذخیره PDF</button></div>
    <p class="no-print" style="color:var(--muted);font-size:.8rem">برای فایل PDF، در پنجره چاپ گزینه «ذخیره به‌صورت PDF» (Save as PDF) را انتخاب کنید.</p>
    <article class="receipt">
      <header><div class="org"><img src="${LOGO}" alt=""><div><b>${esc(ORG)}</b><small>${esc(ORG_SUB)} · ${esc(e.from_name)}</small></div></div>
        <div style="text-align:left"><h1>حواله خروج کالا</h1><small>شماره ${e.code}</small></div></header>
      <table>
        <tr><th>نوع خروج</th><td>${esc(state.boot.exit_types[e.type])}${e.to_name ? ' به ' + esc(e.to_name) : ''}</td></tr>
        <tr><th>تاریخ تحویل</th><td>${jdate(e.delivered_at, { long: true, time: true })}</td></tr>
        ${e.recipient ? `<tr><th>تحویل‌گیرنده</th><td>${esc(e.recipient)}${e.recipient_phone ? ' — ' + esc(faDigits(e.recipient_phone)) : ''}</td></tr>` : ''}
        ${e.reason ? `<tr><th>علت</th><td>${esc(e.reason)}</td></tr>` : ''}
        ${e.program ? `<tr><th>برنامه / محل استفاده</th><td>${esc(e.program)}</td></tr>` : ''}
        ${e.due_date ? `<tr><th>موعد بازگشت</th><td>${jdate(e.due_date, { long: true })}</td></tr>` : ''}
        <tr><th>درخواست‌کننده</th><td>${esc(e.requester)} — ${jdate(e.created_at)}</td></tr>
        <tr><th>تأییدکننده</th><td>${esc(e.approver)} — ${jdate(e.approved_at, { time: true })}</td></tr>
        <tr><th>تحویل‌دهنده</th><td>${esc(e.deliverer)}</td></tr>
        ${e.ticket ? `<tr><th>تیکت</th><td>${faDigits(e.ticket.code)}</td></tr>` : ''}
      </table>
      <table style="margin-top:14px"><thead><tr><th style="width:auto">ردیف</th><th style="width:auto">کالا</th><th style="width:auto">کد</th><th style="width:auto">مقدار</th></tr></thead>
        <tbody>${e.lines.map((l, n) => `<tr><td>${fa(n + 1)}</td><td>${esc(l.item_name)}${l.from_broken ? ' (اقلام خراب)' : ''}</td><td>${esc(faDigits(l.code))}</td><td>${fa(l.qty)} ${esc(l.unit)}</td></tr>`).join('')}</tbody></table>
      ${e.delivery_note ? `<p style="margin-top:10px">توضیح: ${esc(e.delivery_note)}</p>` : ''}
      <div class="sign"><div>تحویل‌دهنده<br>${esc(e.deliverer)}</div><div>تحویل‌گیرنده${e.recipient ? '<br>' + esc(e.recipient) : ''}</div><div>تأییدکننده<br>${esc(e.approver)}</div></div>
    </article>`;
}

/* ================================================================ tickets */
async function pageTickets(_, q, main) {
  const status = q.status ?? 'open';
  const rows = await GET(`/api/tickets?status=${status}${q.q ? '&q=' + encodeURIComponent(q.q) : ''}`);
  const tabs = [['open', 'باز'], ['new', 'جدید'], ['ready', 'آماده تحویل'], ['', 'همه']];
  main.innerHTML = `<div class="page-head"><h1>تیکت‌های درخواست وسیله</h1><a class="btn ghost" href="#/request">${icon('plus')} ثبت درخواست برای متقاضی</a></div>
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/tickets?status=${k}" class="${k === status ? 'on' : ''}">${l}</a>`).join('')}</div>
    <form id="ts" class="searchbox">${icon('search')}<input class="input" name="q" value="${esc(q.q || '')}" placeholder="شماره پیگیری، نام، شماره تماس یا وسیله" type="search"></form>
    ${!can('tickets_all') && !can('tickets_review') ? '<p style="color:var(--muted);font-size:.84rem">فقط تیکت‌هایی که به انبار شما ارجاع شده‌اند نمایش داده می‌شوند.</p>' : ''}
    <div class="card"><div class="list">${rows.map((t) => `<a class="row" href="#/tickets/${t.id}"><span class="grow">
        <span class="title">${esc(t.item_text)}${t.qty_text ? ' · ' + esc(t.qty_text) : ''}</span>
        <span class="meta">${esc(t.first_name)} ${esc(t.last_name)} · ${faDigits(t.code)} · ${jdate(t.created_at)}${t.referred_name ? ' · ارجاع: ' + esc(t.referred_name) : ''}${t.exit_count ? ` · ${fa(t.exit_count)} حواله` : ''}</span>
        ${t.appointment ? `<span class="meta">${icon('clock')} ${esc(t.appointment)}</span>` : ''}</span>${ticketPill(t.status)}</a>`).join('') || '<p class="empty">تیکتی نیست.</p>'}</div></div>`;
  $('#ts').addEventListener('submit', (e) => { e.preventDefault(); location.hash = `#/tickets?status=${status}&q=${encodeURIComponent(new FormData(e.target).get('q'))}`; });
}

const TEV = { status: ['clipboard', 'info'], note: ['edit', ''], call: ['phone', 'ok'], refer: ['send', 'warn'], link: ['file', 'brand'] };
async function pageTicket(id, _, main) {
  const t = await GET(`/api/tickets/${id}`);
  const S = state.boot.ticket_statuses;
  const approvedItems = t.exits.filter((e) => ['approved', 'delivered'].includes(e.status)).flatMap((e) => e.lines.map((l) => `${l.item_name} (${fa(l.qty)} ${l.unit})`));
  const places = [...new Set(t.exits.filter((e) => e.status === 'approved').map((e) => e.delivery_place).filter(Boolean))];
  const reviewStatuses = Object.entries(S).filter(([k]) => !['ready', 'delivered', 'referred'].includes(k) && (t.can_review || ['reviewing', 'needs_info'].includes(k)));
  main.innerHTML = `
    <a class="back" href="#/tickets">${icon('back')} تیکت‌ها</a>
    <div class="page-head"><div><h1>${esc(t.item_text)}</h1><span class="sub">تیکت ${faDigits(t.code)} · ${jdate(t.created_at, { time: true })}</span></div>${ticketPill(t.status)}</div>
    ${t.status === 'ready' ? `<div class="card ready-card"><h2>${icon('phone')} آماده هماهنگی و تحویل</h2>
      <dl class="specs"><dt>متقاضی</dt><dd>${esc(t.first_name)} ${esc(t.last_name)}</dd><dt>شماره تماس</dt><dd>${telLink(t.phone)} ${copyBtn(t.phone)}</dd>
      <dt>اقلام تأییدشده</dt><dd>${esc(approvedItems.join('، ') || '—')}</dd>${places.length ? `<dt>محل تحویل</dt><dd>${esc(places.join('، '))}</dd>` : ''}
      ${t.appointment ? `<dt>زمان مراجعه</dt><dd>${esc(t.appointment)}</dd>` : ''}</dl>
      <p class="hint" style="font-size:.84rem;color:var(--muted)">با متقاضی تماس بگیرید و نتیجه را با «ثبت تماس» یادداشت کنید. هنگام مراجعه، تحویل را از صفحه حواله ثبت کنید.</p></div>` : ''}
    <div class="grid-2">
      <div class="card"><h2>متقاضی</h2><dl class="specs">
        <dt>نام</dt><dd>${esc(t.first_name)} ${esc(t.last_name)}</dd>
        <dt>شماره تماس</dt><dd>${telLink(t.phone)} ${copyBtn(t.phone)}</dd>
        <dt>کد ملی</dt><dd class="num" dir="ltr" style="text-align:right">${esc(faDigits(t.national_id))}</dd>
        <dt>نحوه آشنایی</dt><dd>${esc(t.referral || '')}</dd>
        ${t.appointment ? `<dt>زمان مراجعه</dt><dd>${esc(t.appointment)}</dd>` : ''}
      </dl></div>
      <div class="card"><h2>درخواست</h2><dl class="specs">
        <dt>وسیله</dt><dd>${esc(t.item_text)}</dd>
        ${t.qty_text ? `<dt>مقدار</dt><dd>${esc(t.qty_text)}</dd>` : ''}
        ${t.need_time ? `<dt>زمان و مدت</dt><dd>${esc(t.need_time)}</dd>` : ''}
        <dt>شرح</dt><dd style="white-space:pre-line">${esc(t.description || '')}</dd>
        ${t.referred_name ? `<dt>ارجاع</dt><dd>${esc(t.referred_name)}</dd>` : ''}
      </dl></div>
    </div>
    <div class="actions-bar no-print">
      ${t.can_create_exit && !['rejected', 'closed', 'delivered'].includes(t.status) ? `<a class="btn" href="#/exits/new?ticket=${t.id}${t.referred_wh ? '&warehouse=' + t.referred_wh : ''}">${icon('file')} انتخاب کالا و درخواست خروج</a>` : ''}
      <button class="btn ghost" id="call">${icon('phone')} ثبت تماس / زمان مراجعه</button>
      <button class="btn ghost" id="note">${icon('edit')} یادداشت داخلی</button>
      ${t.can_follow ? `<button class="btn ghost" id="refer">${icon('send')} ارجاع به انبار</button>` : ''}
      ${reviewStatuses.length ? `<button class="btn ghost" id="status">${icon('clipboard')} تغییر وضعیت</button>` : ''}
    </div>
    <div class="card"><h2>درخواست‌ها و حواله‌های خروج این تیکت</h2><div class="list">${t.exits.map((e) => `
      <a class="row" href="#/exits/${e.id}"><span class="grow"><span class="title">${exitCode(e.id)} · ${esc(state.boot.exit_types[e.type])} · ${esc(e.from_name)}</span>
        <span class="meta">${esc(e.lines.map((l) => `${l.item_name} (${fa(l.qty)} ${l.unit})`).join('، '))}</span>
        ${e.approver ? `<span class="meta">تأیید: ${esc(e.approver)}${e.deliverer ? ' · تحویل: ' + esc(e.deliverer) : ''}</span>` : ''}</span>${exitPill(e.status)}</a>`).join('')
        || '<p class="empty">هنوز کالایی برای این تیکت انتخاب نشده است. تیکت به‌تنهایی کالا رزرو نمی‌کند و موجودی را تغییر نمی‌دهد.</p>'}</div></div>
    <div class="card"><h2>پیگیری‌ها</h2><ol class="timeline">${t.events.map((ev) => {
      const [ic, tone] = TEV[ev.kind] || ['edit', ''];
      return `<li class="${tone}"><span class="ev-ico">${icon(ic)}</span><div><b>${esc(ev.author || 'سامانه')}</b><span class="meta"> ${jdate(ev.created_at, { time: true })}</span>
        <div style="white-space:pre-line">${esc(ev.text || '')}</div>${ev.appointment ? `<div class="pill ok" style="margin-top:4px">${icon('clock')} ${esc(ev.appointment)}</div>` : ''}</div></li>`;
    }).join('')}</ol></div>`;
  const noteSheet = (kind) => sheet(kind === 'call' ? 'ثبت تماس با متقاضی' : 'یادداشت داخلی', `<form class="form" id="nf"><p class="form-error" hidden></p>
    ${kind === 'call' ? `<p>${telLink(t.phone)} ${copyBtn(t.phone)}</p>` : ''}
    ${field(kind === 'call' ? 'نتیجه تماس' : 'یادداشت', textarea('text', { required: true, placeholder: kind === 'call' ? 'مثلاً تماس گرفته شد؛ فردا ساعت ۱۷ برای دریافت مراجعه می‌کند.' : '' }))}
    ${kind === 'call' ? field('زمان مراجعه (اختیاری)', input('appointment', { placeholder: 'مثلاً پنجشنبه ۱۴۰۵/۰۷/۲۴ ساعت ۱۷' })) : ''}
    <button class="btn block" type="submit">ثبت</button></form>`, (root, close) => {
    onSubmit($('#nf', root), async (d) => { await POST(`/api/tickets/${t.id}/note`, { ...d, kind }); close(); toast('ثبت شد.'); reload(); });
  });
  $('#call').onclick = () => noteSheet('call');
  $('#note').onclick = () => noteSheet('note');
  $('#refer')?.addEventListener('click', () => sheet('ارجاع به انبار', `<form class="form" id="rf"><p class="form-error" hidden></p>
    ${field('انبار', select('warehouse_id', state.boot.all_warehouses.map((w) => [w.id, w.name]), t.referred_wh, { empty: 'انتخاب کنید', attrs: 'required' }))}
    ${field('توضیح', textarea('note'))}<p class="hint" style="font-size:.8rem;color:var(--muted)">مسئولان آن انبار تیکت و اطلاعات تماس را می‌بینند.</p>
    <button class="btn block" type="submit">ارجاع</button></form>`, (root, close) => {
    onSubmit($('#rf', root), async (d) => { await POST(`/api/tickets/${t.id}/refer`, d); close(); toast('ارجاع شد.'); reload(); });
  }));
  $('#status')?.addEventListener('click', () => sheet('تغییر وضعیت تیکت', `<form class="form" id="sf"><p class="form-error" hidden></p>
    <div class="field"><span class="label">وضعیت</span>${radioChips('status', reviewStatuses, '')}</div>
    ${field('توضیح', textarea('note', { placeholder: 'برای رد، علت الزامی است' }))}
    <button class="btn block" type="submit">ثبت</button></form>`, (root, close) => {
    onSubmit($('#sf', root), async (d) => { await POST(`/api/tickets/${t.id}/status`, d); close(); toast('وضعیت ثبت شد.'); reload(); });
  }));
}

/* ================================================================ loans */
function loanRow(l, showItem = true) {
  const left = Math.round((l.qty - l.returned_qty) * 1000) / 1000;
  return `<div class="row"><span class="grow">
      <span class="title">${showItem ? `<a href="#/items/${l.item_id}">${esc(l.item_name)}</a> · ` : ''}${esc(l.borrower)}</span>
      <span class="meta">${l.program ? esc(l.program) + ' · ' : ''}${showItem ? esc(l.warehouse) + ' · ' : ''}تحویل ${jdate(l.created_at)}${l.due_date ? ' · موعد ' + jdate(l.due_date) : ''}${l.returned_qty > 0 ? ` · ${fa(l.returned_qty)} برگشته` : ''}${l.returned_broken > 0 ? ` (${fa(l.returned_broken)} خراب)` : ''}${l.exit_id ? ' · ' + exitCode(l.exit_id) : ''}</span>
      ${l.borrower_phone ? `<span class="meta">${telLink(l.borrower_phone)}</span>` : ''}</span>
    <span class="end">${qtyHtml(l.status === 'open' ? left : l.qty, l.unit)}${loanDuePill(l)}
      ${l.can_return && l.status === 'open' ? `<button class="btn sm" data-return="${l.id}">بازگشت</button>` : ''}</span></div>`;
}

async function pageLoans(_, q, main) {
  const status = q.status || 'open';
  const rows = await GET(`/api/loans?status=${status}`);
  const late = rows.filter((l) => l.status === 'open' && l.due_date && l.due_date < todayIso());
  main.innerHTML = `<div class="page-head"><h1>امانت‌ها</h1></div>
    <div class="tabs"><a href="#/loans?status=open" class="${status === 'open' ? 'on' : ''}">امانت‌های باز</a><a href="#/loans?status=all" class="${status === 'all' ? 'on' : ''}">همه</a></div>
    <p style="color:var(--muted);font-size:.84rem">امانت با درخواست خروج از نوع «امانت» و پس از تأیید و تحویل ثبت می‌شود.</p>
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
    <p style="color:var(--muted);font-size:.86rem">انتقال با درخواست خروج از نوع «انتقال» ثبت و پس از تأیید، تحویل می‌شود. تا تأیید دریافت در انبار مقصد، کالا «در حال انتقال» است.</p>
    <div class="card"><div class="list">${rows.map((t) => `<div class="row" style="flex-wrap:wrap">
      <span class="grow"><span class="title"><a href="#/items/${t.item_id}">${esc(t.item_name)}</a></span>
        <span class="meta">${esc(t.from_name)} ← ${esc(t.to_name)} · ${esc(t.sender)} · ${jdate(t.sent_at)}${t.exit_id ? ' · ' + exitCode(t.exit_id) : ''}${t.note ? ' · ' + esc(t.note) : ''}
          ${t.handler ? ` · بررسی: ${esc(t.handler)}${t.handle_note ? ' (' + esc(t.handle_note) + ')' : ''}` : ''}</span></span>
      <span class="end">${qtyHtml(t.qty, t.unit)}${pill(TR_STATUS[t.status])}</span>
      ${t.status === 'pending' && t.can_receive ? `<div class="btns" style="width:100%;justify-content:flex-end">
        <button class="btn sm" data-recv="${t.id}">${icon('check')} تأیید دریافت</button><button class="btn sm ghost" data-rej="${t.id}">رد</button></div>` : ''}
    </div>`).join('') || '<p class="empty">انتقالی وجود ندارد.</p>'}</div></div>`;
  $$('[data-recv]', main).forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { const r = await POST(`/api/transfers/${b.dataset.recv}/receive`); done('دریافت تأیید و به موجودی مقصد اضافه شد.', r.tx_id); reload(); } catch (e) { toast(e.message, { error: true }); b.disabled = false; }
  }));
  $$('[data-rej]', main).forEach((b) => b.addEventListener('click', () => sheet('رد انتقال', `<form class="form" id="nf"><p class="form-error" hidden></p>
    ${field('علت (الزامی)', textarea('note', { required: true }))}<button class="btn block" type="submit">ثبت</button></form>`, (root, close) => {
    onSubmit($('#nf', root), async (d) => { await POST(`/api/transfers/${b.dataset.rej}/reject`, d); close(); toast('رد شد؛ موجودی به انبار مبدأ برگشت.'); reload(); });
  })));
}

/* ================================================================ notifications & announcements */
const NOTIF_ICON = {
  out_of_stock: ['alert', 'bad'], low_stock: ['alert', 'warn'], ticket_new: ['ticket', 'info'], exit_pending: ['file', 'warn'], exit_result: ['check', 'ok'],
  exit_ready: ['out', 'info'], stock_in: ['in', 'ok'], transfer_in: ['truck', 'warn'], transfer_done: ['truck', 'info'], loan_due: ['clock', 'warn'],
  loan_overdue: ['clock', 'bad'], damage: ['wrench', 'bad'], expiry: ['pill', 'warn'], card_incomplete: ['clipboard', 'warn'], announcement: ['megaphone', 'info'],
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
  $$('[data-id]', main).forEach((a) => a.addEventListener('click', () => { POST('/api/notifications/read', { ids: [a.dataset.id] }).then(refreshUnread); }));
}

async function pageAnnouncements(_, __, main) {
  const rows = await GET('/api/announcements');
  const mayPost = can('manage_users') || can('approve');
  main.innerHTML = `<div class="page-head"><h1>اطلاعیه‌ها</h1>${mayPost ? `<button class="btn" id="newann">${icon('plus')} اطلاعیه جدید</button>` : ''}</div>
    ${rows.map((a) => `<div class="card announce"><h3>${esc(a.title)}${a.pinned ? ' <span class="pill brass">سنجاق‌شده</span>' : ''}</h3><p class="body">${esc(a.body)}</p>
      <p class="meta">${esc(a.author)} · ${jdate(a.created_at, { time: true })}
      ${a.user_id === state.user.id || can('manage_users') ? ` · <a href="#" data-arch="${a.id}">برداشتن</a>` : ''}</p></div>`).join('') || '<div class="card"><p class="empty">اطلاعیه‌ای منتشر نشده است.</p></div>'}`;
  $('#newann')?.addEventListener('click', () => sheet('اطلاعیه عمومی', `<form class="form" id="af"><p class="form-error" hidden></p>
    ${field('عنوان', input('title', { required: true }))}${field('متن', textarea('body', { required: true }))}
    <label class="check"><input type="checkbox" name="pinned"> سنجاق در صفحه اصلی</label>
    <button class="btn block" type="submit">انتشار برای همه کاربران</button></form>`, (root, close) => {
    onSubmit($('#af', root), async (d) => { await POST('/api/announcements', d); close(); toast('اطلاعیه منتشر شد.'); reload(); });
  }));
  $$('[data-arch]', main).forEach((a) => a.addEventListener('click', async (e) => { e.preventDefault(); await POST(`/api/announcements/${a.dataset.arch}/archive`); reload(); }));
}

/* ================================================================ reports */
async function pageReports(_, q, main) {
  const kinds = [['inventory', 'موجودی'], ['cards', 'شناسنامه اموال'], ['transactions', 'گردش کالا'], ['exits', 'درخواست‌ها و حواله‌ها'],
    ['loans', 'امانت‌ها'], ['transfers', 'انتقال‌ها'], ['repairs', 'خرابی و تعمیر']];
  if (can('tickets_all') || can('tickets_review')) kinds.push(['tickets', 'تیکت‌ها']);
  const kind = q.kind || 'inventory';
  const t = todayIso();
  const [jy, jm] = isoToJ(t);
  const monthStart = jToIso(`${jy}/${jm}/1`);
  const noRange = ['inventory', 'cards'].includes(kind);
  main.innerHTML = `<div class="page-head no-print"><h1>گزارش‌ها</h1></div>
    <div class="tabs no-print">${kinds.map(([k, l]) => `<a href="#/reports?kind=${k}" class="${k === kind ? 'on' : ''}">${l}</a>`).join('')}</div>
    <form class="card form no-print" id="rf">
      <div class="form-row">${kind !== 'tickets' ? field('انبار', select('warehouse', visibleWarehouses().map((w) => [w.id, w.name]), q.warehouse, { empty: P().scope_all ? 'همه انبارها' : 'همه انبارهای من' })) : '<span></span>'}
        ${noRange ? '' : `<div class="form-row">${dateInput('from', 'از تاریخ', q.from || monthStart)}${dateInput('to', 'تا تاریخ', q.to || t)}</div>`}</div>
      <div class="btns"><button class="btn" type="submit">${icon('search')} نمایش</button>
        <button class="btn ghost" type="button" id="xlsx">${icon('download')} خروجی اکسل</button>
        <button class="btn ghost" type="button" onclick="window.print()">${icon('printer')} چاپ</button></div>
      <p class="form-error" hidden></p>
    </form>
    <div id="rep"></div>`;
  const f = $('#rf');
  const params = () => new URLSearchParams(Object.entries(readForm(f)).filter(([, v]) => v));
  const show = async () => {
    const p = params();
    setQuery('/reports', { kind, ...Object.fromEntries(p) });
    const r = await GET(`/api/reports/${kind}?${p}`);
    const whLabel = p.get('warehouse') ? whName(p.get('warehouse')) : (P().scope_all ? 'همه انبارها' : 'انبارهای من');
    const range = noRange ? `تا ${jdate(t)}` : `${jdate(p.get('from'))} تا ${jdate(p.get('to'))}`;
    $('#rep').innerHTML = `<div class="print-title"><h2>${esc(r.title)} — ${esc(whLabel)}</h2><p>${esc(ORG)} · ${range}</p></div>
      <p class="no-print" style="color:var(--muted);font-size:.86rem;margin-bottom:8px">${esc(r.title)} · ${esc(whLabel)} · ${range} · ${fa(r.rows.length)} ردیف</p>
      ${r.rows.length ? `<div class="table-wrap"><table><thead><tr>${r.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${r.rows.map((row) => `<tr>${row.map((c) => `<td>${typeof c === 'number' ? fa(c) : esc(faDigits(c ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<div class="card"><p class="empty">موردی نیست.</p></div>'}`;
  };
  f.addEventListener('submit', (e) => { e.preventDefault(); show().catch((err) => toast(err.message, { error: true })); });
  $('#xlsx').addEventListener('click', () => {
    try { location.href = downloadUrl(`/api/reports/${kind}?format=xlsx&${params()}`); } catch (e) { toast(e.message, { error: true }); }
  });
  await show();
}

/* ================================================================ more / account */
function pageMore(_, __, main) {
  const link = ([h, i, t]) => `<a href="${h}">${icon(i)}${t}</a>`;
  main.innerHTML = `<h1>بیشتر</h1>
    <div class="card more-menu">${navItems().slice(1).map(link).join('')}${can('steward') || can('edit') ? link(['#/items?card=incomplete', 'clipboard', 'شناسنامه‌های ناقص']) : ''}</div>
    ${can('manage_users') ? `<div class="card more-menu"><h2 style="padding:4px 10px">مدیریت</h2>${ADMIN_NAV.map(link).join('')}</div>` : ''}
    <div class="card more-menu">${link(['#/account', 'user', 'حساب من و تغییر رمز'])}<button id="lo">${icon('logout')}خروج از حساب</button></div>`;
  $('#lo').onclick = logout;
}

const PERM_LABELS = {
  edit: 'ثبت و ویرایش شناسنامه اموال، ثبت خرابی و تعمیر',
  stock_in: 'ثبت ورود کالا، بازگشت امانت و دریافت انتقال',
  request_out: 'ثبت درخواست خروج',
  approve: 'تأیید یا رد خروج',
  deliver: 'ثبت تحویل و خروج واقعی',
  manage_users: 'مدیریت کاربران، مجوزها و انبارها',
  tickets_review: 'بررسی و تصمیم درباره تیکت‌ها',
  tickets_all: 'مشاهده و پیگیری همه تیکت‌ها (ارجاع، یادداشت)',
  steward: 'مسئول تکمیل و یکدست‌سازی شناسنامه اموال',
};
function permSummary(p) {
  const scope = p.scope_all ? 'همه انبارها' : (p.warehouses.map(whName).filter(Boolean).join('، ') || 'بدون انبار');
  const list = Object.keys(PERM_LABELS).filter((k) => p[k]);
  return { scope, list };
}

function pageAccount(_, __, main) {
  const u = state.user;
  const s = permSummary(u.perms);
  main.innerHTML = `<h1>حساب من</h1>
    <div class="card"><dl class="specs"><dt>نام</dt><dd>${esc(u.full_name)}</dd>${u.title ? `<dt>عنوان</dt><dd>${esc(u.title)}</dd>` : ''}
      <dt>نام کاربری</dt><dd dir="ltr" style="text-align:right">${esc(u.username)}</dd><dt>محدوده</dt><dd>${esc(s.scope)}</dd>
      <dt>مجوزها</dt><dd>${s.list.map((k) => `<span class="pill" style="margin:2px">${esc(PERM_LABELS[k])}</span>`).join('') || 'فقط مشاهده'}</dd></dl></div>
    <form class="card form" id="pf"><h2>اطلاع‌رسانی بیرونی</h2><p class="form-error" hidden></p>
      <p style="color:var(--muted);font-size:.86rem">اگر پیامک یا ربات پیام‌رسان روی سامانه فعال باشد، اعلان‌های مهم به این شماره یا شناسه هم فرستاده می‌شود.</p>
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
    await POST('/api/me/password', { current: toEn(d.current), password: toEn(d.password) });
    toast('رمز عبور تغییر کرد.'); setTimeout(() => location.reload(), 800);
  });
}

/* ================================================================ admin: users & permissions */
async function pageUsers(_, __, main) {
  const users = await GET('/api/users');
  users.sort((a, b) => (b.active - a.active) || a.full_name.localeCompare(b.full_name, 'fa'));
  const whs = state.boot.warehouses;
  main.innerHTML = `<div class="page-head"><h1>کاربران و مجوزها</h1><button class="btn" id="nu">${icon('plus')} کاربر جدید</button></div>
    <p style="color:var(--muted);font-size:.86rem">هر نفر حساب جداگانه دارد تا هر عملیات به نام خودش ثبت شود. مجوزها مستقل از هم‌اند؛ دسترسی به همه انبارها به معنی اختیار تأیید خروج نیست.</p>
    <div class="card"><div class="list">${users.map((u) => {
    const s = permSummary(u.perms);
    return `<div class="row" style="align-items:flex-start">
      <span class="grow"><span class="title">${esc(u.full_name)} ${u.active ? '' : '<span class="pill bad">غیرفعال</span>'}${u.must_change_pw ? ' <span class="pill">رمز اولیه</span>' : ''}</span>
        <span class="meta"><span dir="ltr">${esc(u.username)}</span>${u.title ? ' · ' + esc(u.title) : ''} · ${esc(s.scope)}</span>
        <span class="pills" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${u.perms.approve ? '<span class="pill ok">تأیید خروج</span>' : ''}${u.perms.manage_users ? '<span class="pill brand">مدیریت کاربران</span>' : ''}
          ${u.perms.deliver ? '<span class="pill">تحویل</span>' : ''}${u.perms.tickets_review ? '<span class="pill info">بررسی تیکت</span>' : u.perms.tickets_all ? '<span class="pill info">پیگیری تیکت</span>' : ''}${u.perms.steward ? '<span class="pill brass">مسئول شناسنامه</span>' : ''}</span></span>
      <span class="btns" style="flex-direction:column;align-items:stretch"><button class="btn sm ghost" data-edit="${u.id}">ویرایش</button><button class="btn sm ghost" data-pw="${u.id}">بازنشانی رمز</button></span></div>`;
  }).join('')}</div></div>`;
  const form = (u) => {
    const p = u?.perms || { scope_all: false, warehouses: [] };
    return `<form class="form" id="uf"><p class="form-error" hidden></p>
    <div class="form-row">${field('نام و نام خانوادگی', input('full_name', { value: u?.full_name, required: true }))}${field('عنوان / سمت', input('title', { value: u?.title }))}</div>
    ${u ? '' : `<div class="form-row">${field('نام کاربری (انگلیسی)', input('username', { required: true, attrs: 'dir="ltr" autocapitalize="off" autocomplete="off"' }))}
      ${field('رمز اولیه', input('password', { required: true, attrs: 'dir="ltr" autocomplete="new-password" minlength="6"', value: genPassword() }), 'کاربر در اولین ورود رمز را عوض می‌کند.')}</div>`}
    <div class="form-row">${field('شماره همراه', input('phone', { value: u?.phone, attrs: 'dir="ltr" inputmode="tel"' }))}${field('شناسه بله/تلگرام', input('chat_id', { value: u?.chat_id, attrs: 'dir="ltr"' }))}</div>
    <fieldset class="form perm-box"><legend>محدوده انبارها</legend>
      ${radioChips('scope', [['all', 'همه انبارها و اموال'], ['some', 'فقط انبارهای انتخاب‌شده']], p.scope_all ? 'all' : 'some')}
      <div class="checks" id="wh-checks" ${p.scope_all ? 'hidden' : ''}>${whs.map((w) => `<label class="check"><input type="checkbox" name="warehouses" data-multi value="${w.id}" ${p.warehouses.includes(w.id) ? 'checked' : ''}>${esc(w.name)}</label>`).join('')}</div>
    </fieldset>
    <fieldset class="form perm-box"><legend>مجوزها</legend>
      <p class="hint" style="font-size:.8rem;color:var(--muted)">مشاهده اموال در محدوده بالا برای همه حساب‌ها برقرار است.</p>
      <div class="checks" style="grid-template-columns:1fr">${Object.entries(PERM_LABELS).map(([k, l]) => `<label class="check"><input type="checkbox" name="perm_${k}" ${p[k] ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>
    </fieldset>
    ${u ? `<label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> حساب فعال است</label>` : ''}
    <button class="btn block" type="submit">${u ? 'ذخیره' : 'ساخت حساب'}</button></form>`;
  };
  const toBody = (d) => {
    const perms = { scope_all: d.scope === 'all', warehouses: (d.warehouses || []).map(Number) };
    for (const k of Object.keys(PERM_LABELS)) perms[k] = !!d[`perm_${k}`];
    return { full_name: d.full_name, title: d.title, username: toEn(d.username || ''), password: d.password, phone: toEn(d.phone), chat_id: d.chat_id, active: d.active, perms };
  };
  const mount = (root) => {
    root.addEventListener('change', (e) => { if (e.target.name === 'scope') $('#wh-checks', root).hidden = e.target.value === 'all'; });
  };
  $('#nu').onclick = () => sheet('کاربر جدید', form(null), (root, close) => {
    mount(root);
    onSubmit($('#uf', root), async (d) => {
      const b = toBody(d);
      await POST('/api/users', b);
      close(); toast(`حساب ساخته شد. رمز اولیه: ${b.password}`); await loadBoot(); reload();
    });
  });
  $$('[data-edit]', main).forEach((btn) => btn.addEventListener('click', () => {
    const u = users.find((x) => x.id === Number(btn.dataset.edit));
    sheet(`ویرایش ${u.full_name}`, form(u), (root, close) => {
      mount(root);
      onSubmit($('#uf', root), async (d) => { await PUT(`/api/users/${u.id}`, toBody(d)); close(); toast('ذخیره شد.'); await loadBoot(); reload(); });
    });
  }));
  $$('[data-pw]', main).forEach((btn) => btn.addEventListener('click', () => {
    const u = users.find((x) => x.id === Number(btn.dataset.pw));
    sheet(`رمز جدید برای ${u.full_name}`, `<form class="form" id="rp"><p class="form-error" hidden></p>
      ${field('رمز موقت', input('password', { value: genPassword(), required: true, attrs: 'dir="ltr" minlength="6"' }), 'این رمز را فقط به خود این فرد بدهید؛ در ورود بعدی باید آن را عوض کند.')}
      <button class="btn block" type="submit">بازنشانی</button></form>`, (root, close) => onSubmit($('#rp', root), async (d) => {
      await POST(`/api/users/${u.id}/reset-password`, { password: toEn(d.password) }); close(); toast(`رمز موقت: ${toEn(d.password)}`);
    }));
  }));
}
function genPassword() {
  const r = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(10000000 + (r % 90000000));
}

async function pageWarehouses(_, __, main) {
  const users = (await GET('/api/users')).filter((u) => u.active && !u.perms.scope_all);
  const whs = state.boot.warehouses;
  main.innerHTML = `<div class="page-head"><h1>انبارها</h1><button class="btn" id="nw">${icon('plus')} انبار جدید</button></div>
    <p style="color:var(--muted);font-size:.86rem">مسئولان دارای دسترسی سراسری به همه انبارها دسترسی دارند. اینجا مسئولانِ محدود هر انبار را تعیین کنید.</p>
    <div class="card"><div class="list">${whs.map((w) => `<div class="row"><span class="grow">
      <span class="title">${esc(w.name)} ${w.archived ? '<span class="pill">بایگانی</span>' : ''}${w.tracks_expiry ? '<span class="pill brass">تاریخ‌دار</span>' : ''}</span>
      <span class="meta">${fa(w.item_count)} قلم · ${w.people.length ? 'مسئول: ' + w.people.map((m) => esc(m.full_name)).join('، ') : 'فقط مسئولان سراسری'}</span></span>
      <button class="btn sm ghost" data-w="${w.id}">ویرایش</button></div>`).join('')}</div></div>`;
  const form = (w) => `<form class="form" id="wf"><p class="form-error" hidden></p>
    ${field('نام انبار', input('name', { value: w?.name, required: true }))}
    ${field('توضیحات', input('description', { value: w?.description }))}
    <label class="check"><input type="checkbox" name="tracks_expiry" ${w?.tracks_expiry ? 'checked' : ''}> اقلام این انبار معمولاً تاریخ‌دار هستند</label>
    <div class="field"><span class="label">مسئولان محدود این انبار</span><div class="checks">${users.map((u) => `<label class="check"><input type="checkbox" name="people" data-multi value="${u.id}" ${w?.people.some((m) => m.id === u.id) ? 'checked' : ''}>${esc(u.full_name)}</label>`).join('') || '<span class="hint">کاربر محدودی تعریف نشده است.</span>'}</div>
      <span class="hint">مجوزهای هر فرد از صفحه «کاربران و مجوزها» تعیین می‌شود.</span></div>
    ${w ? `<label class="check"><input type="checkbox" name="archived" ${w.archived ? 'checked' : ''}> بایگانی انبار</label>` : ''}
    <button class="btn block" type="submit">ذخیره</button></form>`;
  const after = async (close) => { close(); toast('ذخیره شد.'); await loadBoot(); renderShell(); route(); };
  $('#nw').onclick = () => sheet('انبار جدید', form(null), (root, close) => onSubmit($('#wf', root), async (d) => { await POST('/api/warehouses', { ...d, people: d.people || [] }); await after(close); }));
  $$('[data-w]', main).forEach((b) => b.addEventListener('click', () => {
    const w = whs.find((x) => x.id === Number(b.dataset.w));
    sheet(`ویرایش ${w.name}`, form(w), (root, close) => onSubmit($('#wf', root), async (d) => { await PUT(`/api/warehouses/${w.id}`, { ...d, people: d.people || [] }); await after(close); }));
  }));
}

async function pageBackup(_, __, main) {
  const rows = await GET('/api/backups');
  main.innerHTML = `<div class="page-head"><h1>پشتیبان‌گیری</h1><button class="btn" id="bk">${icon('database')} تهیه نسخه پشتیبان الان</button></div>
    <div class="callout info">سامانه هر روز به‌طور خودکار از اطلاعات انبار پشتیبان می‌گیرد و ۳۰ نسخه آخر را نگه می‌دارد. این نسخه‌ها جای پشتیبان کامل سایت را نمی‌گیرند؛ هر چند وقت یک نسخه را دانلود و جای دیگری نگه دارید.</div>
    <div class="card"><div class="list">${rows.map((b) => `<div class="row"><span class="grow"><span class="title" dir="ltr" style="text-align:right">${esc(b.name)}</span>
      <span class="meta">${jdate(new Date(b.created_at).toISOString().replace('T', ' ').slice(0, 19), { time: true })} · ${fa(Math.round(b.size / 1024))} کیلوبایت</span></span>
      <a class="btn sm ghost" href="${esc(b.url)}">${icon('download')} دانلود</a></div>`).join('') || '<p class="empty">هنوز نسخه‌ای نیست.</p>'}</div></div>`;
  $('#bk').onclick = async () => { try { await POST('/api/backups'); toast('نسخه پشتیبان ساخته شد.'); reload(); } catch (e) { toast(e.message, { error: true }); } };
}

const AUDIT_LABEL = {
  login: 'ورود به سامانه', change_password: 'تغییر رمز', item_create: 'ثبت شناسنامه', item_update: 'ویرایش شناسنامه', item_archive: 'بایگانی کالا',
  item_unarchive: 'خروج از بایگانی', item_review: 'بررسی شناسنامه', photo_remove: 'حذف عکس', user_create: 'ساخت کاربر', user_update: 'ویرایش کاربر و مجوزها',
  password_reset: 'بازنشانی رمز', warehouse_create: 'ساخت انبار', warehouse_update: 'ویرایش انبار', backup: 'پشتیبان‌گیری', ...EXIT_ACTION,
};
async function pageAudit(_, q, main) {
  const rows = await GET(`/api/audit?${new URLSearchParams(q)}`);
  main.innerHTML = `<div class="page-head"><h1>سوابق تغییرات</h1></div>
    <p style="color:var(--muted);font-size:.86rem">ورود و خروج کالا در «گزارش گردش کالا» است. اینجا تغییرات شناسنامه‌ها، حساب‌ها، مجوزها و مراحل درخواست‌های خروج ثبت می‌شود.</p>
    <div class="card"><div class="list">${rows.map((a) => {
    const det = a.details ? JSON.parse(a.details) : null;
    const link = a.entity === 'item' ? ` · <a href="#/items/${a.entity_id}">کالای ${fa(a.entity_id)}</a>` : a.entity === 'exit' ? ` · <a href="#/exits/${a.entity_id}">${exitCode(a.entity_id)}</a>` : '';
    return `<div class="row"><span class="grow"><span class="title">${AUDIT_LABEL[a.action] || esc(a.action)}${link}</span>
      <span class="meta">${esc(a.actor || '—')} · ${jdate(a.created_at, { time: true })}</span>
      ${det && a.action === 'item_update' ? `<span class="meta">${Object.entries(det).map(([k, [o, n]]) => `${esc(k)}: ${esc(o ?? '—')} ← ${esc(n ?? '—')}`).join(' · ')}</span>` : ''}
      ${det && det.note ? `<span class="meta">${esc(det.note)}</span>` : ''}</span></div>`;
  }).join('') || '<p class="empty">موردی نیست.</p>'}</div></div>`;
}

/* ================================================================ start */
async function loadBoot() {
  state.boot = await GET('/api/bootstrap');
  state.user = state.boot.user;
  state.unread = state.boot.unread;
}
async function start() {
  if (A.loggedIn) {
    try { await loadBoot(); } catch { state.user = null; }
  }
  if (state.user) $('#app').innerHTML = '';
  route();
}
start();
setInterval(refreshUnread, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
