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
const files = fs => (fs && fs.length ? `<div class="row">${fs.map(f => `<span class="att">${ic('clip')}${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>` : esc(f.name)} <small class="code">${fa(Math.ceil(f.size / 1024))}KB</small>${!f.url && !f.data ? ' <small class="hint">فقط مشخصات</small>' : ''}</span>`).join('')}</div>` : '');
const kv = rows => `<dl class="kv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v ?? '—'}</dd>`).join('')}</dl>`;
const tabs = (key, list, cur) => `<div class="tabs" role="tablist">${list.map(([k, l]) => `<button role="tab" aria-selected="${k === cur}" data-a="tab" data-key="${key}" data-v="${k}" class="${k === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const steps = (names, cur, done = false) => `<div class="steps">${names.map((n, i) => `<div class="step ${i < cur || (done && i === cur) ? 'done' : i === cur ? 'cur' : ''}"><i>${i < cur || (done && i === cur) ? '✓' : fa(i + 1)}</i>${esc(n)}</div>`).join('')}</div>`;

function table(cols, rows, opts = {}) {
  if (!rows.length) return empty(opts.empty || 'موردی یافت نشد.');
  return `<div class="tbl-wrap"><table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr ${opts.click ? `class="click" data-a="${opts.click}" data-id="${r.id}"` : ''}>${cols.map(c => `<td data-l="${esc(String(c[0]).replace(/<[^>]+>/g, ''))}">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function filterBar(key, items) {
  const v = vs(key);
  const active = items.filter(it => it.t !== 'search' && v[it.k]).length;
  const extra = items.some(it => it.t !== 'search');
  return `<div class="filters ${v._fopen || active ? 'open' : ''}">${extra ? `<button type="button" class="ftog" data-a="ftog" data-key="${key}">${ic('menu')}فیلترها${active ? ` <b>${fa(active)}</b>` : ''}</button>` : ''}${items.map(it => {
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
let MODAL_OPENER = null;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function modal({ title, body, foot = '', wide = false, locked = false, sheet = false }) {
  const opener = document.activeElement && !document.activeElement.closest('.modal-bg') ? document.activeElement : MODAL_OPENER;
  closeModal(true);
  MODAL_OPENER = opener;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${sheet ? 'sheet' : ''}" role="dialog" aria-modal="true" aria-labelledby="mtitle"><div class="mh"><h2 id="mtitle"></h2>${locked ? '' : `<button class="ibtn" data-a="close" aria-label="بستن">${ic('x')}</button>`}</div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  $('#mtitle', bg).textContent = title; // عنوان همیشه به‌صورت متن درج می‌شود، نه HTML
  if (locked) bg.dataset.locked = '1';
  else bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(); });
  /* فوکوس داخل پنجره محصور می‌ماند */
  bg.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$(FOCUSABLE, bg).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  document.body.appendChild(bg);
  document.querySelector('.app')?.setAttribute('aria-hidden', 'true');
  const f = bg.querySelector('input:not([type=hidden]):not([type=file]),select,textarea') || bg.querySelector(FOCUSABLE);
  if (f) setTimeout(() => f.focus(), 30);
  return bg;
}
function closeModal(keep) {
  const had = !!$('.modal-bg');
  $$('.modal-bg').forEach(m => m.remove());
  document.querySelector('.app')?.removeAttribute('aria-hidden');
  if (!keep) {
    MODAL_REOPEN = null;
    if (had && MODAL_OPENER && document.contains(MODAL_OPENER)) { try { MODAL_OPENER.focus(); } catch (e) {} }
    MODAL_OPENER = null;
    setTimeout(() => { if ($('.modal-bg')) return; if (SERVER) Remote.flush(); else if (typeof Sync !== 'undefined') Sync.flushPending(); }, 0);
  }
}

function fieldHTML(f, v) {
  const id = 'f_' + f.k;
  const lab = `<label for="${id}">${esc(f.l)}${f.req ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>`;
  const full = f.full || ['textarea', 'multi', 'file'].includes(f.t) ? 'full' : '';
  const req = f.req ? 'aria-required="true"' : '';
  let inp;
  const opts = (o, cur) => o.map(x => {
    if (x && x.group) return `<optgroup label="${esc(x.group)}">${opts(x.items, cur)}</optgroup>`;
    const [ov, ol] = Array.isArray(x) ? x : [x, x];
    return `<option value="${esc(ov)}" ${String(cur ?? '') === String(ov) ? 'selected' : ''}>${esc(ol)}</option>`;
  }).join('');
  let hint = f.hint;
  switch (f.t) {
    case 'textarea': inp = `<textarea id="${id}" name="${f.k}" ${req} placeholder="${esc(f.ph || '')}">${esc(v || '')}</textarea>`; break;
    case 'select': inp = `<select id="${id}" name="${f.k}" ${req}>${f.blank !== false ? `<option value="">${esc(f.blank || 'انتخاب کنید')}</option>` : ''}${opts(f.o, v)}</select>`; break;
    case 'multi': inp = `<div class="checks" id="${id}" role="group" aria-label="${esc(f.l)}">${f.o.map(x => { const [ov, ol] = Array.isArray(x) ? x : [x, x]; return `<label><input type="checkbox" name="${f.k}" value="${esc(ov)}" ${(v || []).map(String).includes(String(ov)) ? 'checked' : ''}>${esc(ol)}</label>`; }).join('')}</div>`; break;
    case 'check': inp = `<label class="row" style="font-weight:500;color:var(--fg)"><input type="checkbox" id="${id}" name="${f.k}" ${v ? 'checked' : ''}> ${esc(f.cl || 'بله')}</label>`; break;
    case 'date': inp = `<input type="text" inputmode="numeric" id="${id}" name="${f.k}" ${req} value="${v ? jd(v) : ''}" placeholder="۱۴۰۵/۰۸/۰۸" autocomplete="off">`; break;
    case 'time': inp = `<input type="time" id="${id}" name="${f.k}" ${req} value="${esc(v || '')}">`; break;
    case 'file': inp = `<input type="file" id="${id}" name="${f.k}" ${f.single ? '' : 'multiple'}>`; hint = hint || fileLimitHint(); break;
    case 'number': inp = `<input type="text" inputmode="numeric" id="${id}" name="${f.k}" ${req} value="${v != null && v !== '' ? esc(v) : ''}" placeholder="${esc(f.ph || '')}">`; break;
    default: inp = `<input type="${f.t || 'text'}" id="${id}" name="${f.k}" ${req} value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}" ${f.ro ? 'readonly' : ''}>`;
  }
  return `<div class="fld ${full}">${f.t === 'check' ? `<label>${esc(f.l)}</label>` : lab}${inp}${hint ? `<div class="hint">${esc(hint)}</div>` : ''}<div class="err" data-err="${f.k}" role="alert"></div></div>`;
}
/* پیوست‌ها: سرور ← مخزن فایل سرور؛ پیش‌نمایش claude.ai ← مخزن فایل؛ نسخه مستقل ← حداکثر ۱۵۰ کیلوبایت در مرورگر */
const FILE_MAX = () => (SERVER ? 20 : typeof Sync !== 'undefined' && Sync.assets ? 20 : 0.15) * 1024 * 1024;
const fileLimitHint = () => (SERVER || (typeof Sync !== 'undefined' && Sync.assets) ? 'هر فایل تا ۲۰ مگابایت در مخزن فایل سامانه ذخیره می‌شود.' : 'در نسخه نمایشی هر فایل حداکثر ۱۵۰ کیلوبایت؛ نسخه سروری تا ۲۰ مگابایت.');
async function readFile(file, asText) {
  const meta = { name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
  if (asText) return { ...meta, text: await file.text() };
  if (file.size > FILE_MAX()) throw new Error(`حجم «${file.name}» (${fa(Math.ceil(file.size / 1024))} کیلوبایت) بیشتر از حد مجاز است. ${fileLimitHint()}`);
  if (SERVER) { const r = await Remote.upload(file); if (r.error) throw new Error(`بارگذاری «${file.name}» انجام نشد: ${r.error}`); return r; }
  if (typeof Sync !== 'undefined' && Sync.assets) {
    try { const a = await Sync.assets.upload(file); return { ...meta, url: a.url, aid: a.id }; }
    catch (e) { throw new Error(`بارگذاری «${file.name}» در مخزن فایل انجام نشد (${e && e.code || 'خطا'}). دوباره تلاش کنید.`); }
  }
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ ...meta, data: r.result }); r.onerror = () => rej(new Error(`خواندن «${file.name}» ممکن نشد.`)); r.readAsDataURL(file); });
}
async function readForm(form, fields) {
  const out = {}; const errs = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    if (f.t === 'multi') out[f.k] = $$(`input[name="${f.k}"]:checked`, form).map(x => x.value);
    else if (f.t === 'check') out[f.k] = !!(el && el.checked);
    else if (f.t === 'file') { try { out[f.k] = el && el.files.length ? await Promise.all([...el.files].map(x => readFile(x, f.single))) : []; } catch (e) { errs[f.k] = e.message; } }
    else if (f.t === 'date') { const s = (el.value || '').trim(); if (s) { const iso = jToIso(s); if (!iso) errs[f.k] = 'تاریخ شمسی معتبر نیست (نمونه: ۱۴۰۵/۰۸/۰۸).'; out[f.k] = iso || ''; } else out[f.k] = ''; }
    else if (f.t === 'number') { const s = en(el.value).replace(/[,٬\s]/g, ''); if (s && isNaN(+s)) errs[f.k] = 'عدد معتبر وارد کنید.'; out[f.k] = s === '' ? '' : +s; }
    else out[f.k] = el ? el.value.trim() : '';
    if (f.req && !errs[f.k] && (out[f.k] === '' || out[f.k] == null || (Array.isArray(out[f.k]) && !out[f.k].length))) errs[f.k] = 'این بخش لازم است.';
  }
  return { out, errs };
}
/* پیش‌نویس فرم‌ها: متن تایپ‌شده تا ثبت موفق در همین مرورگر نگه داشته می‌شود */
const DRAFT_KEY = t => 'shabab-draft-' + (ME ? ME.user.id : 'x') + '-' + t;
const draftStore = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: k => { try { sessionStorage.removeItem(k); } catch (e) {} } };
function formModal(title, fields, init, onSave, opts = {}) {
  let draft = null;
  const useDraft = !opts.noDraft && !opts.locked && !fields.some(f => f.t === 'password');
  if (useDraft) { try { draft = JSON.parse(draftStore.get(DRAFT_KEY(title)) || 'null'); } catch (e) {} }
  const vals = draft && draft.v ? { ...init, ...draft.v } : init;
  const bg = modal({
    title, wide: opts.wide, locked: opts.locked,
    body: `${opts.pre || ''}${draft ? `<div class="notice">پیش‌نویس ذخیره‌شده (${jdt(draft.ts)}) بازگردانی شد. <button type="button" class="linkbtn" id="dropdraft">حذف پیش‌نویس</button></div>` : ''}<form class="form" id="mform" novalidate>${fields.map(f => fieldHTML(f, vals[f.k])).join('')}</form><div class="err" id="merr" role="alert"></div>`,
    foot: `<button class="btn" type="submit" form="mform">${esc(opts.submit || 'ثبت')}</button>${opts.locked ? '' : '<button class="btn ghost" data-a="close">انصراف</button>'}`
  });
  const form = $('#mform', bg);
  const saveDraft = () => { if (!useDraft) return; const v = {}; fields.forEach(f => { const el = form.elements[f.k]; if (!el || ['file', 'multi', 'check', 'date'].includes(f.t)) return; v[f.k] = el.value; }); draftStore.set(DRAFT_KEY(title), JSON.stringify({ ts: stamp(), v })); };
  const clearDraft = () => draftStore.del(DRAFT_KEY(title));
  let dt; form.addEventListener('input', () => { clearTimeout(dt); dt = setTimeout(saveDraft, 600); });
  $('#dropdraft', bg)?.addEventListener('click', () => { clearDraft(); closeModal(); formModal(title, fields, init, onSave, opts); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const sb = $('button[type=submit]', bg); if (sb.disabled) return;
    $$('[data-err]', form).forEach(x => (x.textContent = '')); $('#merr', bg).textContent = '';
    sb.disabled = true; sb.setAttribute('aria-busy', 'true');
    try {
      const { out, errs } = await readForm(form, fields);
      if (Object.keys(errs).length) { Object.entries(errs).forEach(([k, m]) => { const x = $(`[data-err="${k}"]`, form); if (x) x.textContent = m; }); form.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus(); return; }
      const res = await onSave(out);
      if (res && res.error) { $('#merr', bg).textContent = res.error; return; }
      clearDraft();
      const reopen = opts.reopen;
      closeModal();
      toast(opts.done || 'ثبت شد.');
      refresh();
      if (reopen) reopen(res || {});
    } finally { sb.disabled = false; sb.removeAttribute('aria-busy'); }
  });
  return bg;
}
/* پنجره اقدام با یادداشت */
function actModal(title, cb, opts = {}) {
  const fields = [...(opts.fields || []), { k: 'note', l: opts.noteLabel || 'توضیح / یادداشت', t: 'textarea', req: !!opts.noteReq }];
  formModal(title, fields, opts.init || {}, v => cb(v), { submit: opts.submit || 'ثبت اقدام', done: opts.done || 'اقدام ثبت شد.', reopen: opts.reopen, noDraft: true });
}

/* ---------- اجرای عملیات: سرور (نسخه عملیاتی) یا موتور داخل مرورگر (نسخه نمایشی) ---------- */
const SERVER = typeof window !== 'undefined' && !!window.__KARTABL_SERVER__;
async function run(name, ...args) {
  if (SERVER) return PUBLIC_OPS[name] && !ME ? Remote.signup(args[0]) : Remote.cmd(name, args);
  const fn = OPS[name] || PUBLIC_OPS[name];
  if (!fn) return { error: 'عملیات ناشناخته.' };
  const snap = JSON.stringify(DB);
  let res;
  try { res = fn(...args); } catch (e) { res = { error: e instanceof OpError ? e.message : 'خطای پیش‌بینی‌نشده: ' + e.message }; if (!(e instanceof OpError)) console.error(e); }
  if (res && res.error) { /* هیچ تغییر ناقصی باقی نمی‌ماند */ const me = ME && ME.user.id; DB = JSON.parse(snap); applySettings(); if (me && userById(me)) setMe(userById(me)); return res; }
  Store.save();
  return res || {};
}

let TOAST_T;
function toast(t) {
  let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = t; el.hidden = false; clearTimeout(TOAST_T); TOAST_T = setTimeout(() => (el.hidden = true), 3200);
}

/* ---------- گزینه‌های مشترک فرم ---------- */
const unitOpts = (withImam = false) => [...(withImam ? [[0, 'دفتر امام جماعت']] : []), ...UNITS.filter(u => !u.off).map(u => [u.id, u.name])];
const posOpts = unitId => DB.positions.filter(p => unitId == null || p.unitId === +unitId).map(p => [p.id, posWho(p.id)]);
const allPosOpts = () => [{ group: 'امام جماعت', items: [['P0', posWho('P0')]] }, ...UNITS.map(u => ({ group: u.name, items: posOpts(u.id) }))];
const allPosChecks = () => DB.positions.map(p => [p.id, posLabel(p.id) + ' — ' + ((holderOf(p.id) || {}).name || 'بدون متصدی')]);
const serviceOpts = () => UNITS.filter(u => !u.off).map(u => ({ group: u.name, items: [...SERVICES[u.id].map(s => [`${u.id}|${s}`, s]), [`${u.id}|همکاری میان‌بخشی`, 'درخواست همکاری میان‌بخشی']] }));

/* ---------- ورود ---------- */
const SEC = () => DB.settings.security;
function renderLogin(err = '', mode = 'login') {
  const st = DB.settings;
  const groups = [['P0']].concat(UNITS.map(u => unitPositions(u.id).map(p => p.id)));
  const pane = mode === 'signup' ? `<form id="signf" novalidate>
      <div><h1>درخواست ایجاد حساب کاربری</h1><p class="muted">درخواست شما پس از بررسی مدیر فناوری اطلاعات فعال می‌شود.</p></div>
      <div class="form">${fieldHTML({ k: 'name', l: 'نام و نام خانوادگی', req: true }, '')}${fieldHTML({ k: 'username', l: 'نام کاربری دلخواه', req: true, hint: 'حروف انگلیسی و عدد' }, '')}
      ${fieldHTML({ k: 'phone', l: 'تلفن همراه', t: 'tel', req: true }, '')}${fieldHTML({ k: 'unitId', l: 'مدیریت محل خدمت', t: 'select', o: unitOpts(), req: true }, '')}
      ${fieldHTML({ k: 'title', l: 'سمت درخواستی', req: true, ph: 'مثلاً: منشی، کارشناس، معاون' }, '')}${fieldHTML({ k: 'pass', l: 'رمز عبور', t: 'password', req: true, hint: 'دست‌کم ' + fa(SEC().minLen) + ' نویسه' }, '')}
      ${fieldHTML({ k: 'note', l: 'توضیح', t: 'textarea' }, '')}</div>
      <div class="err" id="serr" role="alert"></div>
      <button class="btn lg" type="submit">${ic('send')}ارسال درخواست</button>
      <button class="btn ghost" type="button" data-a="loginMode" data-m="login">بازگشت به ورود</button>
    </form>` : `<form id="loginf" novalidate>
      <div><h1>ورود به سامانه</h1><p class="muted">دسترسی شما بر اساس جایگاه سازمانی تعیین می‌شود.</p></div>
      ${st.maintenance ? `<div class="notice warn">${ic('alert')} سامانه در حال به‌روزرسانی است؛ فقط مدیران سامانه امکان ورود دارند.</div>` : ''}
      <div class="fld"><label for="lu">نام کاربری</label><input id="lu" name="u" autocomplete="username" dir="ltr"></div>
      <div class="fld"><label for="lp">رمز عبور</label><div class="pw"><input id="lp" name="p" type="password" autocomplete="current-password" dir="ltr"><button type="button" class="ibtn sm" data-a="pwShow" data-t="lp" aria-label="نمایش رمز">${ic('eye')}</button></div></div>
      ${err ? `<div class="notice warn" role="alert">${err}</div>` : ''}
      <button class="btn lg" type="submit">${ic('lock')}ورود امن</button>
      <button class="btn ghost" type="button" data-a="loginMode" data-m="signup">${ic('user')}درخواست ایجاد حساب کاربری</button>
      ${!SERVER && st.showDemo ? `<details class="demo-wrap"><summary>حساب‌های نسخه نمایشی (رمز همه <b class="code">1234</b>؛ در نسخه سروری وجود ندارد)</summary><div class="demo">${groups.flat().map(pid => { const u = holderOf(pid); if (!u) return ''; return `<button type="button" data-a="quick" data-u="${esc(u.username)}"><span>${esc(u.name)}</span><small>${esc(posLabel(pid))} · <span class="code">${esc(u.username)}</span></small></button>`; }).join('')}</div></details>` : ''}
    </form>`;
  $('#root').innerHTML = `
  <div class="login">
    <div class="art"><canvas id="geo" aria-hidden="true"></canvas>
      <div><div class="bs">بسم الله الرحمن الرحیم</div><h1>${esc(st.loginTitle)}<br>${esc(st.orgName)}</h1><p>${esc(st.loginText)}</p></div>
      <div class="login-clock"><b id="lclock">${fa(nowHMS())}</b><span>${jdLong(todayISO())}</span></div>
      <div class="facts"><div><b>${fa(UNITS.length)}</b><span>مدیریت مستقل</span></div><div><b>${fa(DB.positions.length)}</b><span>جایگاه سازمانی</span></div><div><b>${fa(DB.publicActive ?? DB.users.filter(u => u.active && !u.deleted).length)}</b><span>کاربر فعال</span></div></div>
    </div>
    <div class="pane">${pane}</div>
  </div>`;
  if (mode === 'login') $('#loginf').addEventListener('submit', e => { e.preventDefault(); doLogin($('#lu').value.trim(), $('#lp').value); });
  else $('#signf').addEventListener('submit', async e => {
    e.preventDefault();
    const F = [{ k: 'name', req: 1 }, { k: 'username', req: 1 }, { k: 'phone', req: 1 }, { k: 'unitId', req: 1 }, { k: 'title', req: 1 }, { k: 'pass', req: 1 }, { k: 'note' }];
    const { out } = await readForm(e.target, F);
    const r = await run('createSignup', out);
    if (r.error) { $('#serr').textContent = r.error; return; }
    renderLogin('درخواست شما با کد ' + fa(r.no) + ' ثبت شد. پس از تأیید مدیر سامانه، با همان نام کاربری و رمز وارد شوید.');
  });
  drawGeo();
}
A.loginMode = d => renderLogin('', d.m);
A.pwShow = d => { const i = document.getElementById(d.t); if (i) i.type = i.type === 'password' ? 'text' : 'password'; };
function logLogin(username, u, ok, reason) {
  DB.logins.push({ id: uid(), ts: stamp(), username, uid: u ? u.id : '', ok, reason, agent: navigator.userAgent.replace(/\(.*?\)/g, '').slice(0, 60) });
  if (DB.logins.length > 3000) DB.logins = DB.logins.slice(-3000);
}
async function doLogin(username, pass) {
  username = en(username);
  if (SERVER) {
    const r = await Remote.login(username, pass);
    if (r.error) return renderLogin(r.error);
    afterLogin(); return;
  }
  /* نسخه نمایشی: همان قواعد سرور، در مرورگر */
  const u = DB.users.find(x => x.username === username && !x.deleted);
  const deny = (msg, reason) => { logLogin(username, u, false, reason); Store.save(); renderLogin(msg); };
  if (!u) return deny('نام کاربری یا رمز عبور درست نیست.', 'نام کاربری ناموجود');
  if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) return deny(`حساب به دلیل تلاش‌های ناموفق تا ساعت ${fa(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(u.lockedUntil)))} قفل است. مدیر فناوری اطلاعات می‌تواند آن را باز کند.`, 'حساب قفل');
  if (!pwCheck(u.pass, pass)) {
    u.fails = (u.fails || 0) + 1;
    if (u.fails >= SEC().maxFails) { u.lockedUntil = new Date(Date.now() + SEC().lockMin * 60000).toISOString(); u.fails = 0; notify(adminPositions(), 'request', `حساب ${u.name} پس از ${fa(SEC().maxFails)} تلاش ناموفق قفل شد.`, 'admin', u.username); return deny(`به دلیل ${fa(SEC().maxFails)} تلاش ناموفق، حساب برای ${fa(SEC().lockMin)} دقیقه قفل شد. مدیر فناوری اطلاعات می‌تواند قفل را زودتر باز کند.`, 'قفل‌شدن حساب'); }
    return deny('نام کاربری یا رمز عبور درست نیست.' + (u.fails ? ` (${fa(SEC().maxFails - u.fails)} تلاش دیگر تا قفل‌شدن حساب)` : ''), 'رمز نادرست');
  }
  if (!u.active) return deny('این حساب کاربری غیرفعال شده است. با مدیریت فناوری اطلاعات تماس بگیرید.', 'حساب غیرفعال');
  if (!u.posId) return deny('برای این حساب جایگاه سازمانی تعریف نشده است.', 'بدون جایگاه');
  if (DB.settings.maintenance && !permOf(posById(u.posId), 'admin.settings')) return deny('سامانه در حالت به‌روزرسانی است و فعلاً فقط مدیران سامانه وارد می‌شوند.', 'حالت به‌روزرسانی');
  u.fails = 0; u.lockedUntil = ''; u.lastLogin = stamp();
  logLogin(username, u, true, 'ورود موفق');
  setMe(u);
  const ses = { id: uid(), uid: u.id, start: stamp(), last: stamp(), active: true, agent: navigator.userAgent.replace(/\(.*?\)/g, '').slice(0, 60) };
  DB.sessions.push(ses); if (DB.sessions.length > 500) DB.sessions = DB.sessions.slice(-500);
  sess.set(u.id + '|' + ses.id);
  audit('ورود به سامانه', 'session', u.id, '');
  Store.save();
  afterLogin();
}
function afterLogin() { LAST_ACT = Date.now(); renderShell(); if (ME.user.mustChange) forcePassChange(); }
function setMe(u) { ME = { user: u, pos: posById(u.posId) }; }
const mySession = () => { if (SERVER) return Remote.session; const s = (sess.get() || '').split('|')[1]; return DB.sessions.find(x => x.id === s); };
/* فعالیت کاربر: کلیک، تایپ، لمس و پیمایش همه فعالیت حساب می‌شوند */
let LAST_ACT = Date.now(), LAST_SENT = 0;
function noteActivity() {
  LAST_ACT = Date.now();
  const w = $('#idlewarn'); if (w) w.remove();
  if (Date.now() - LAST_SENT < 60000 || !ME) return;
  LAST_SENT = Date.now();
  if (SERVER) Remote.ping(); else { const s = mySession(); if (s) { s.last = stamp(); Store.save(); } }
}
function touchSession() { noteActivity(); }
['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, noteActivity, { passive: true, capture: true }));
A.quick = d => doLogin(d.u, '1234');
async function endSession(msg) {
  if (SERVER) await Remote.logout(msg);
  else { const s = mySession(); if (s) { s.active = false; s.end = stamp(); } if (ME) audit('خروج از سامانه', 'session', ME.user.id, msg || ''); Store.save(); }
  ME = null; sess.set(null); closeModal(); location.hash = ''; renderLogin(msg || '');
}
A.logout = () => endSession();
A.stayIn = () => noteActivity();
function forcePassChange() {
  formModal('تغییر رمز عبور الزامی است', [{ k: 'p1', l: 'رمز جدید', t: 'password', req: true, hint: 'دست‌کم ' + fa(SEC().minLen) + ' نویسه' }, { k: 'p2', l: 'تکرار رمز جدید', t: 'password', req: true }], {}, v => {
    if (v.p1 !== v.p2) return fail('رمز و تکرار آن یکسان نیست.');
    return run('forcedPassChange', v.p1);
  }, { submit: 'ذخیره رمز', done: 'رمز عبور تغییر کرد.', locked: true, pre: '<div class="notice">مدیر سامانه برای حساب شما تغییر رمز را الزامی کرده است.</div>' });
}

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
    ['dashboard', 'داشبورد', 'home', true],
    ['inbox', 'کارتابل من', 'inbox', true, q],
    ['imam', 'کارتابل امام جماعت', 'dome', isAll()],
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
    ['reports', 'گزارش‌گیری و نظارت', 'chart', can('reports.view')],
    ['notifications', 'اعلان‌ها', 'bell', true, unread],
    ['admin', 'پنل مدیریت سامانه', 'shield', canAdminPanel(), adminAlerts()],
    ['profile', 'حساب کاربری من', 'user', true],
    ['system', 'تنظیمات و آرشیو', 'gear', true]
  ];
}
function renderShell() {
  $('#root').innerHTML = `
  <div class="app" id="app">
    <aside class="side" id="side" aria-label="منوی اصلی">
      <div class="brand"><div class="mark">${ic('dome')}</div><div><b>${esc(DB.settings.loginTitle)}</b><small>${esc(DB.settings.subtitle)} · ${esc(DB.settings.orgName.replace(/^مجتمع مسجدمحور\s*/, ''))}</small></div></div>
      <nav class="nav" id="nav"></nav>
      <div class="foot"><span id="syncst" class="syncst"></span><br>نسخه ۲٫۱ · زمان رسمی: تهران</div>
    </aside>
    <div class="scrim" data-a="menu"></div>
    <div class="mainwrap">
      <header class="top">
        <button class="ibtn menu" data-a="menu" aria-label="منو">${ic('menu')}</button>
        <div class="search">${ic('search')}<input id="gsearch" type="search" placeholder="جست‌وجوی سراسری: شماره، عنوان، نام…" autocomplete="off" aria-label="جست‌وجوی سراسری"><div class="res" id="gres" hidden></div></div>
        <div class="spacer"></div>
        <div class="clock" id="clock" aria-live="off"></div>
        <button class="ibtn" data-a="theme" aria-label="تغییر حالت روشن و تاریک" id="themebtn"></button>
        <a class="ibtn" href="#notifications" aria-label="اعلان‌ها" id="bell">${ic('bell')}</a>
        <a class="who" href="#profile" title="حساب کاربری من">${av(ME.user.name)}<div><b>${esc(ME.user.name)}</b><small>${esc(posLabel(ME.pos.id))}</small></div></a>
        <button class="ibtn" data-a="logout" aria-label="خروج">${ic('logout')}</button>
      </header>
      ${SERVER ? '' : `<div class="demobar" role="note">${ic('alert')}<span>نسخه نمایشی: داده‌ها نمونه‌اند و در همین مرورگر ${typeof Sync !== 'undefined' && Sync.mode === 'shared' ? 'و پایگاه پیش‌نمایش' : ''} نگهداری می‌شوند. برای اطلاعات واقعی از نسخه سروری استفاده کنید.</span></div>`}
      <main id="main"></main>
    </div>
    <nav class="tabbar" id="tabbar" aria-label="ناوبری پایین صفحه"></nav>
  </div>`;
  const gs = $('#gsearch');
  gs.addEventListener('input', () => globalSearch(gs.value));
  gs.addEventListener('blur', () => setTimeout(() => ($('#gres').hidden = true), 200));
  tick();
  route();
  showSync();
}
function renderChrome() {
  const h = location.hash.slice(1) || 'dashboard';
  $('#nav').innerHTML = navItems().map(n => n[0] === 'grp' ? `<div class="grp">${n[1]}</div>` : n[3] ? `<a href="#${n[0]}" class="${h === n[0] ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span>${n[4] ? `<span class="cnt">${fa(n[4])}</span>` : ''}</a>` : '').join('');
  const unread = DB.notifs.filter(n => n.pos === ME.pos.id && !n.read).length;
  $('#bell').innerHTML = ic('bell') + (unread ? `<span class="dot">${fa(unread > 99 ? '99+' : unread)}</span>` : '');
  $('#themebtn').innerHTML = ic(curTheme() === 'dark' ? 'sun' : 'moon');
  const q = myQueue().length;
  const tb = (href, icon, label, n) => `<a href="#${href}" class="${h === href ? 'on' : ''}">${ic(icon)}<span>${label}</span>${n ? `<i>${fa(n > 99 ? '99+' : n)}</i>` : ''}</a>`;
  $('#tabbar').innerHTML = tb('dashboard', 'home', 'خانه') + tb('inbox', 'inbox', 'کارتابل', q)
    + `<button class="fab" data-a="quickAdd" aria-label="ثبت سریع">${ic('plus')}</button>`
    + tb('notifications', 'bell', 'اعلان‌ها', unread) + `<button data-a="menu" class="${$('#app').classList.contains('open') ? 'on' : ''}">${ic('menu')}<span>منو</span></button>`;
}
function tick() {
  const lc = $('#lclock'); if (lc) lc.textContent = fa(nowHMS());
  if (!ME) return;
  const c = $('#clock');
  if (c) c.innerHTML = `<b>${fa(nowHMS())}</b>${jdLong(todayISO())}`;
  liveWidgets();
  if (Date.now() - (tick.sweep || 0) > 60000) { tick.sweep = Date.now(); const n = DB.notifs.length; sweepDeadlines(); if (DB.notifs.length !== n) { Store.save(); renderChrome(); } }
  if (tick.day && tick.day !== todayISO() && !$('.modal-bg')) route();
  tick.day = todayISO();
  /* کنترل نشست: خروج اجباری توسط مدیر یا پایان مهلت بی‌فعالیتی (با هشدار دو دقیقه پیش از خروج) */
  if (!SERVER) {
    const s = mySession();
    if (s && !s.active) return endSession('نشست شما توسط مدیر سامانه پایان یافت.');
    if (!ME.user.active || ME.user.deleted) return endSession('حساب شما غیرفعال شد.');
  }
  const to = SEC().sessionMin * 60000;
  const idle = Date.now() - LAST_ACT;
  if (to && idle > to) return endSession('به دلیل ' + fa(SEC().sessionMin) + ' دقیقه بی‌فعالیتی، از سامانه خارج شدید. متن فرم‌های نیمه‌کاره به‌صورت پیش‌نویس حفظ شده است.');
  if (to && idle > to - 120000 && !$('#idlewarn')) {
    const w = document.createElement('div'); w.id = 'idlewarn'; w.className = 'idlewarn'; w.setAttribute('role', 'alertdialog'); w.setAttribute('aria-live', 'assertive');
    w.innerHTML = `<span>به دلیل بی‌فعالیتی، کمتر از دو دقیقه دیگر از سامانه خارج می‌شوید.</span><button class="btn sm" data-a="stayIn">ادامه کار</button>`;
    document.body.appendChild(w);
  }
}
const curTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
A.theme = () => { const t = curTheme() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; pref.set('theme', t); renderChrome(); };
A.ftog = d => { const v = vs(d.key); v._fopen = !v._fopen; route(); };
A.menu = () => { $('#app').classList.toggle('open'); renderChrome(); };
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
  liveWidgets();
  touchSession();
  $('#app').classList.remove('open');
  renderChrome();
  if (active && active.startsWith('flt-')) { const el = document.getElementById(active); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
}
let LAST_HASH = '';
function refresh() { const ss = ME && mySession(); if (ss) ss.last = stamp(); Store.save(); if (ME) { const h = location.hash; if (h !== LAST_HASH) { LAST_HASH = h; window.scrollTo(0, 0); } route(); } }

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
document.addEventListener('keydown', e => { const m = $('.modal-bg'); if (e.key === 'Escape' && m && !m.dataset.locked) closeModal(); });

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
    ...DB.reservations.filter(r => m(r.no, r.applicant || '', r.kind, resPlace(r))).map(r => ['res', r.id, 'رزرو', r.no, resPlace(r) + ' — ' + r.kind]),
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
