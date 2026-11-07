/* =====================================================================
   کارتابل اداری — هسته رابط کاربری: ابزارها، تاریخ شمسی، ساختار سازمانی، آیکون‌ها، مجوزها
   داده‌ها و قواعد اصلی روی سرور است؛ این بخش فقط برای نمایش و پنهان‌کردن دکمه‌های غیرمجاز است.
   ===================================================================== */
/* ---------- ابزارهای عمومی ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const FA_D = '۰۱۲۳۴۵۶۷۸۹';
const fa = s => String(s ?? '').replace(/\d/g, d => FA_D[d]);
const en = s => String(s ?? '').replace(/[۰-۹]/g, d => FA_D.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const money = n => fa(Math.round(Number(n) || 0).toLocaleString('en-US')).replace(/,/g, '٬') + ' ریال';
const numFa = n => fa(Math.round(Number(n) || 0).toLocaleString('en-US')).replace(/,/g, '٬');
const sum = (a, f = x => x) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0);

/* ---------- تاریخ شمسی (الگوریتم jalaali) ---------- */
function g2j(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + ~~((gy2 + 3) / 4) - ~~((gy2 + 99) / 100) + ~~((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * ~~(days / 12053); days %= 12053;
  jy += 4 * ~~(days / 1461); days %= 1461;
  if (days > 365) { jy += ~~((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + ~~(days / 31) : 7 + ~~((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}
function j2g(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + ~~(jy / 33) * 8 + ~~(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * ~~(days / 146097); days %= 146097;
  if (days > 36524) { gy += 100 * ~~(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * ~~(days / 1461); days %= 1461;
  if (days > 365) { gy += ~~((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const ml = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm; for (gm = 0; gm < 13 && gd > ml[gm]; gm++) gd -= ml[gm];
  return [gy, gm, gd];
}
const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const J_WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const TZ = 'Asia/Tehran';
const isJLeap = y => { const g = j2g(y, 12, 30); const b = g2j(...g); return b[1] === 12 && b[2] === 30; };
const jMonthLen = (y, m) => (m <= 6 ? 31 : m <= 11 ? 30 : isJLeap(y) ? 30 : 29);
const isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const isoToJ = iso => { const [y, m, d] = iso.split('-').map(Number); return g2j(y, m, d); };
const jToIsoN = (y, m, d) => isoOf(...j2g(y, m, d));
function jd(iso) { if (!iso) return '—'; const [a, b, c] = isoToJ(iso.slice(0, 10)); return fa(`${a}/${pad(b)}/${pad(c)}`); }
function jdLong(iso) { const [a, b, c] = isoToJ(iso); return `${J_WEEK[weekday(iso)]} ${fa(c)} ${J_MONTHS[b - 1]} ${fa(a)}`; }
function jToIso(str) {
  const p = en(str).trim().split(/[\/\-.]/).map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  let [y, m, d] = p; if (y < 100) y += 1400;
  if (y < 1300 || y > 1500 || m < 1 || m > 12 || d < 1 || d > jMonthLen(y, m)) return null;
  return jToIsoN(y, m, d);
}
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const nowHMS = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
const nowHM = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const jdt = t => { if (!t) return '—'; const d = new Date(t); const iso = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d); return `${jd(iso)} ساعت ${fa(hm)}`; };
const isoOfStamp = t => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(t));
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
const weekday = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 1) % 7; // شنبه = ۰
const jYearNow = () => isoToJ(todayISO())[0];
const tm = t => (t ? fa(t) : '—');
const stamp = () => new Date().toISOString();

/* ---------- ساختار سازمانی (از پیکربندی مشترک، با تغییرات پنل مدیریت) ---------- */
const UNITS = ORG.UNITS.map(u => ({ ...u }));
const SERVICES = JSON.parse(JSON.stringify(ORG.SERVICES));
const SPACES = ORG.SPACES.map(s => ({ ...s }));
const PROGRAMS = ORG.PROGRAMS;
const TOOLS = ORG.TOOLS;
const ROLES = ORG.ROLES;
const LETTER_CATS = ORG.LETTER_CATS.slice();
const LEAVE_TYPES = ORG.LEAVE_TYPES.slice();
const PRIORITIES = ORG.PRIORITIES, CONF = ORG.CONF;
const PERMS = ORG.PERMS;
const U_INTERNAL = 1, U_CULTURE = 2, U_PR = 3, U_ADMIN = 14, U_FIN = 15, U_IT = 16, U_CIVIL = 17, U_CEREMONY = 18, U_REST = 19;
const unitName = id => (+id === 0 ? 'دفتر امام جماعت' : (UNITS.find(u => u.id === +id) || {}).name || '—');
const unitShort = id => (+id === 0 ? 'دفتر امام جماعت' : (UNITS.find(u => u.id === +id) || {}).short || '—');
const spaceOf = id => SPACES.find(s => s.id === id) || { id: '', name: 'خارج از مجتمع', unit: 0, cap: 0, excl: false };
const programOf = id => PROGRAMS.find(p => p.id === id) || PROGRAMS[0];
const resUnit = r => (r.space ? spaceOf(r.space).unit : programOf(r.program).unit || U_CEREMONY);
const resCap = r => (r.space ? spaceOf(r.space).cap : programOf(r.program).cap || 0);
const resPlace = r => (r.space ? spaceOf(r.space).name : 'خارج از مجتمع');
function applySettings() {
  const s = DB.settings || {};
  UNITS.splice(0, UNITS.length, ...ORG.UNITS.map(x => ({ ...x })), ...(s.extraUnits || []).map(x => ({ ...x })));
  UNITS.forEach(u => { Object.assign(u, (s.units || {})[u.id] || {}); u.off = (s.unitsOff || []).includes(u.id); SERVICES[u.id] = (s.services && s.services[u.id]) || ORG.SERVICES[u.id] || ['امور عمومی']; });
  SPACES.splice(0, SPACES.length, ...(s.spaces || ORG.SPACES).map(x => ({ ...x })));
  LETTER_CATS.splice(0, LETTER_CATS.length, ...(s.letterCats || ORG.LETTER_CATS));
  LEAVE_TYPES.splice(0, LEAVE_TYPES.length, ...(s.leaveTypes || ORG.LEAVE_TYPES));
  applyTheme();
}
const PALETTES = {
  zomorrod: { name: 'زمردی', l: ['#0f4b3a', '#0f4b3a', '#0d3a2e', '#12493a', '#2f8f88', '#e1f1ef', '#8fd9c6'], d: ['#6cc9ad', '#3c9e82', '#07110e', '#10241e', '#62c3ba', '#163532', '#6cc9ad'] },
  firouzeh: { name: 'فیروزه‌ای', l: ['#0b5e66', '#0b6670', '#0a3f45', '#0f525a', '#1f9aa3', '#dff2f3', '#8fe0e4'], d: ['#6fd0d6', '#3aa9b1', '#061214', '#0d2628', '#5ccad2', '#12333a', '#6fd0d6'] },
  lajvard: { name: 'لاجوردی', l: ['#1d3f7a', '#1f4688', '#142b55', '#1c3a6e', '#3a78c2', '#e3ecf8', '#a9c6f2'], d: ['#8fb4ee', '#5585cf', '#070d18', '#101d33', '#7aa6e8', '#15243d', '#8fb4ee'] },
  kahroba: { name: 'کهربایی', l: ['#6b4a12', '#7a5414', '#3d2c10', '#523b16', '#b07d2a', '#f6ecd9', '#f0cf8e'], d: ['#e7c27a', '#c49a4a', '#120d05', '#251b0c', '#d9b067', '#33270f', '#e7c27a'] },
  anar: { name: 'اناری', l: ['#7a1f2b', '#86222f', '#4a131b', '#621a24', '#b8434f', '#f8e4e6', '#f2a7af'], d: ['#ef9aa3', '#c55a66', '#14070a', '#2a1014', '#e3808b', '#3a171c', '#ef9aa3'] }
};
function applyTheme() {
  const t = (DB.settings && DB.settings.theme) || { palette: 'zomorrod', scale: 14 }; const p = PALETTES[t.palette] || PALETTES.zomorrod;
  const v = a => `--accent:${a[0]};--btn:${a[1]};--side:${a[2]};--side-2:${a[3]};--teal:${a[4]};--teal-soft:${a[5]};--glow:${a[6]};`;
  let el = document.getElementById('theme-vars');
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
  el.textContent = `:root{${v(p.l)}font-size:${t.scale}px}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${v(p.d)}}}:root[data-theme="dark"]{${v(p.d)}}`;
}

/* ---------- آیکون‌ها ---------- */
const IC = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  check: 'M4 4h16v16H4zM8 12l3 3 5-6',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  cal: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  door: 'M5 21V3h11v18M16 5h3v16M12 12v1M3 21h18',
  building: 'M4 21V6l8-3 8 3v15M9 21v-5h6v5M8 9h2M14 9h2M8 13h2M14 13h2',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  wallet: 'M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H3zM3 7V5h13v2M16 13h2',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3a4 4 0 010 8M22 21c0-3-2-5-4-6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6',
  bell: 'M6 16v-5a6 6 0 1112 0v5l2 2H4zM10 21a2 2 0 004 0',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 118 0v4',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M1 12h2M21 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  logout: 'M9 4H5v16h4M14 8l4 4-4 4M18 12H8',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  dome: 'M3 21h18M5 21v-6a7 7 0 0114 0v6M12 3v5M10.5 4.5h3M10 21v-3a2 2 0 014 0v3M19 21V10M21 21V9',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  print: 'M7 9V3h10v6M6 17H4v-7h16v7h-2M7 14h10v7H7z',
  clip: 'M21 11l-9 9a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  megaphone: 'M3 10v4h3l7 4V6L6 10zM16 8a5 5 0 010 8M6 14l1 6h3',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 100-8 4 4 0 000 8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  school: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
  medical: 'M4 4h16v16H4zM12 8v8M8 12h8',
  pill: 'M10 21a6 6 0 01-4.2-10.2l5-5a6 6 0 018.4 8.4l-5 5A6 6 0 0110 21zM8 8l8 8',
  book: 'M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z',
  kid: 'M12 8a3 3 0 100-6 3 3 0 000 6zM6 11h12M12 11v5M9 22l3-6 3 6',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  crane: 'M4 21h8M7 21V4l12 3M7 4l-3 4h3M17 7v6M15 13h4v3h-4z',
  sms: 'M4 4h16v12H8l-4 4zM8 9h8M8 12h5',
  history: 'M3 12a9 9 0 103-6.7L3 8M3 3v5h5M12 7v5l3 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  key: 'M15 7a4 4 0 11-3.9 5H9v2H7v2H4v-3l6.1-6A4 4 0 0115 7zM16 7h.01',
  palette: 'M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-2 0-3 2-1 3-1a4 4 0 004-4c0-4-4-8-9-8zM7.5 11h.01M10 7h.01M15 7h.01',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 017.5-2',
  cup: 'M4 8h13v5a6 6 0 01-6 6H10a6 6 0 01-6-6zM17 9h2a2 2 0 010 4h-2M8 3v2M12 3v2',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM6 6h1M17 6h1M6 17h1'
};
Object.assign(IC, {
  chat: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5', calc: 'M5 3h14v18H5zM8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h4',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4', tool: 'M14 6a4 4 0 01-5 5L4 16l4 4 5-5a4 4 0 015-5l-3-3 2-2-3-1z',
  bold: 'M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z', italic: 'M10 5h8M6 19h8M14 5l-4 14', underline: 'M7 4v7a5 5 0 0010 0V4M5 20h14',
  alr: 'M4 6h16M8 10h12M4 14h16M8 18h12', alc: 'M4 6h16M7 10h10M4 14h16M7 18h10', all: 'M4 6h16M4 10h12M4 14h16M4 18h12', alj: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  ol: 'M10 6h10M10 12h10M10 18h10M4 5h1v3M4 11h2l-2 3h2M4 17h2v3H4', ul: 'M10 6h10M10 12h10M10 18h10M5 6h.01M5 12h.01M5 18h.01', table: 'M3 4h18v16H3zM3 10h18M3 15h18M9 4v16M15 4v16',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3', copy: 'M8 8h12v12H8zM4 16V4h12'
});
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.file}"/></svg>`;

/* ---------- داده‌ها ----------
   DB همان داده‌ای است که سرور برای جایگاه کاربر فرستاده است؛ در مرورگر چیزی ذخیره نمی‌شود */
let DB = { settings: {}, positions: [], users: [], notifs: [] };
const pref = {
  get(k, d) { try { const v = localStorage.getItem('kartabl-pref-' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kartabl-pref-' + k, v); } catch (e) {} }
};

/* ---------- کاربر جاری و دسترسی‌ها ---------- */
let ME = null; // { user, pos }
const posById = id => DB.positions.find(p => p.id === id);
const userById = id => DB.users.find(u => u.id === id);
const accountOf = posId => DB.users.find(u => u.posId === posId && !u.deleted);
const holderOf = posId => DB.users.find(u => u.posId === posId && u.active && !u.deleted);
const posLabel = id => { const p = posById(id); if (!p) return '—'; return p.role === 'imam' ? 'امام جماعت' : `${p.title} ${unitShort(p.unitId)}`; };
function panelName(p) {
  if (!p) return '';
  if (p.role === 'imam') return 'پنل امام جماعت';
  return { manager: 'پنل ', office: 'پنل مسئول دفتر ', secretary: 'پنل منشی ' }[p.role] + unitName(p.unitId);
}
const posUsername = p => (p.role === 'imam' ? 'imam' : ((UNITS.find(u => u.id === p.unitId) || {}).slug || 'unit' + p.unitId) + '.' + p.role);
const who = (uid, nm) => nm || (uid === 'system' ? 'سامانه' : (userById(uid) || {}).name || '—');
const holderSince = posId => { const h = (DB.posHistory || []).filter(x => x.posId === posId && !x.to).slice(-1)[0]; return h ? h.from : ''; };
const posWho = id => { const h = holderOf(id); return h ? `${h.name} (${posLabel(id)})` : `${posLabel(id)} (بدون متصدی)`; };
const unitPos = (unitId, role) => DB.positions.find(p => p.unitId === +unitId && p.role === role);
const unitPositions = unitId => DB.positions.filter(p => p.unitId === +unitId);
const unitHeads = u => [unitPos(u, 'manager'), unitPos(u, 'office')].filter(Boolean).map(p => p.id);
const imamPos = () => (DB.positions.find(p => p.role === 'imam') || {}).id || 'P0';

const isImam = () => !!ME && ME.pos.role === 'imam';
const myUnit = () => (ME ? ME.pos.unitId : -1);
const myRole = () => (ME ? ME.pos.role : '');
const inUnit = u => myUnit() === +u;
const isMgr = u => isImam() || (inUnit(u) && myRole() === 'manager');
const isMgrOrOffice = u => isImam() || (inUnit(u) && ['manager', 'office'].includes(myRole()));
const isClerk = u => isImam() || inUnit(u);
/* مجوز مؤثر هر جایگاه را سرور محاسبه می‌کند (پیش‌فرض نقش، استثناها، تعیین مدیر بخش، سقف و وابستگی) */
const permDef = k => PERMS.find(p => p.k === k);
const permLabel = k => (permDef(k) || { l: k }).l;
const permOf = (pos, k) => !!pos && (pos.role === 'imam' || !!(pos.eff && pos.eff[k]));
const can = k => !!ME && permOf(ME.pos, k);
const isAll = () => isImam() || can('view.all');
const canSeeUnit = u => isAll() || inUnit(u);
const canFinance = () => can('finance.view');
const canHR = () => can('hr.view');
const canAssets = () => can('assets.view') || isAll();
const canAdminPanel = () => ['admin.panel', 'admin.users', 'admin.settings', 'admin.logs', 'admin.perms', 'admin.backup'].some(can);
const toolLevel = (unit, key) => { if (!ME) return 'none'; if (isImam()) return 'all'; if (+unit !== myUnit()) { const t = toolDef(unit, key); return can('view.all') && t && !t.conf ? 'view' : 'none'; } return (ME.pos.toolLv || {})[key] || 'none'; };
const toolDef = (unit, key) => (TOOLS[unit] || []).find(t => t.k === key);
const canApproveTool = unit => isImam() || (inUnit(unit) && myRole() === 'manager');

/* ---------- نمایش سابقه با مقدار قبل و بعد ---------- */
const histHTML = h => (h && h.length ? `<div class="hist">${h.slice().reverse().map(x => `<div><b>${esc(x.action)}</b>${x.note ? ` — ${esc(x.note)}` : ''}${x.diff && x.diff.length ? `<ul class="diff">${x.diff.map(d => `<li><span>${esc(d.l || d.f)}:</span> <del>${esc(d.a || '—')}</del> ← <ins>${esc(d.b || '—')}</ins></li>`).join('')}</ul>` : ''}<small>${jdt(x.ts)} · ${esc(who(x.uid, x.nm))}${x.pos ? ' · ' + esc(posLabel(x.pos)) : ''}</small></div>`).join('')}</div>` : '<div class="empty">سابقه‌ای ثبت نشده است.</div>');
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
const SMS_EVENTS = { request: 'ثبت درخواست جدید', letter: 'ارجاع نامه', order: 'صدور دستور', decision: 'تأیید یا رد', due: 'نزدیک‌شدن مهلت', overdue: 'معوق‌شدن کار', meeting: 'دعوت به جلسه', reservation: 'تغییر وضعیت رزرو', message: 'پیام جدید' };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- اوقات شرعی (روش ژئوفیزیک دانشگاه تهران) ---------- */
function prayerTimes(iso, lat, lng, tz = 3.5) {
  const rad = d => (d * Math.PI) / 180, deg = r => (r * 180) / Math.PI;
  const fix = (a, b) => a - b * Math.floor(a / b);
  let [y, m, d] = iso.split('-').map(Number);
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  const jdate = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 - lng / (15 * 24);
  const sun = t => {
    const D = jdate + t - 2451545, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360), e = 23.439 - 0.00000036 * D;
    const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
    return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - fix(RA, 24) };
  };
  const mid = t => fix(12 - sun(t).eqt, 24);
  const angT = (ang, t, ccw) => { const dc = sun(t).decl, n = mid(t); const T = deg(Math.acos((-Math.sin(rad(ang)) - Math.sin(rad(dc)) * Math.sin(rad(lat))) / (Math.cos(rad(dc)) * Math.cos(rad(lat))))) / 15; return n + (ccw ? -T : T); };
  const adj = h => h + tz - lng / 15;
  const t = { fajr: adj(angT(17.7, 5 / 24, true)), sunrise: adj(angT(0.833, 6 / 24, true)), dhuhr: adj(mid(0.5)), sunset: adj(angT(0.833, 0.75)), maghrib: adj(angT(4.5, 0.75)), isha: adj(angT(14, 0.75)) };
  t.midnight = t.sunset + (t.fajr + 24 - t.sunset) / 2;
  return t;
}
const PRAYER_NAMES = [['fajr', 'اذان صبح'], ['sunrise', 'طلوع آفتاب'], ['dhuhr', 'اذان ظهر'], ['sunset', 'غروب آفتاب'], ['maghrib', 'اذان مغرب'], ['midnight', 'نیمه‌شب شرعی']];
const hToHM = h => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return pad(H) + ':' + pad(M); };
const hmToMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
function todayPrayers() {
  const c = DB.settings.clock || { lat: 30.3392, lng: 48.3043 };
  const t = prayerTimes(todayISO(), +c.lat, +c.lng);
  return PRAYER_NAMES.map(([k, l]) => ({ k, l, t: hToHM(t[k]) }));
}
const hijri = () => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; } };
const greg = () => new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
