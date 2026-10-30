window.__KARTABL_SERVER__ = true;
'use strict';
/* =====================================================================
   کارتابل اداری مجتمع مسجدمحور شباب اهل‌الجنه — هسته
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
let SEED_TS = null;
const stamp = () => SEED_TS || new Date().toISOString();
const jdt = t => { if (!t) return '—'; const d = new Date(t); const iso = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d); return `${jd(iso)} ساعت ${fa(hm)}`; };
const isoOfStamp = t => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(t));
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
const weekday = iso => (new Date(iso + 'T12:00:00Z').getUTCDay() + 1) % 7; // شنبه = ۰
const jYearNow = () => isoToJ(todayISO())[0];
const tm = t => (t ? fa(t) : '—');

/* ---------- ساختار سازمانی ---------- */
const UNITS = [
  { id: 1, name: 'مدیریت داخلی مجتمع', short: 'داخلی', ic: 'building' },
  { id: 2, name: 'مدیریت امور فرهنگی و مراسمات مسجد', short: 'فرهنگی و مراسمات', ic: 'dome' },
  { id: 3, name: 'مدیریت روابط عمومی', short: 'روابط عمومی', ic: 'megaphone' },
  { id: 4, name: 'مدیریت رسانه', short: 'رسانه', ic: 'camera' },
  { id: 5, name: 'مدیریت پایگاه بسیج خادم‌الشهدا حاج احمد یلالی', short: 'پایگاه بسیج', ic: 'shield' },
  { id: 6, name: 'مدیریت دبستان (پایه اول تا ششم)', short: 'دبستان', ic: 'school' },
  { id: 7, name: 'مدیریت متوسطه اول (پایه هفتم تا نهم)', short: 'متوسطه اول', ic: 'school' },
  { id: 8, name: 'مدیریت متوسطه دوم (پایه دهم تا دوازدهم)', short: 'متوسطه دوم', ic: 'school' },
  { id: 9, name: 'مدیریت درمانگاه', short: 'درمانگاه', ic: 'medical' },
  { id: 10, name: 'مدیریت داروخانه', short: 'داروخانه', ic: 'pill' },
  { id: 11, name: 'مدیریت کتابخانه', short: 'کتابخانه', ic: 'book' },
  { id: 12, name: 'مدیریت خیریه', short: 'خیریه', ic: 'heart' },
  { id: 13, name: 'مدیریت خانه بازی کودک', short: 'خانه بازی کودک', ic: 'kid' },
  { id: 14, name: 'مدیریت امور اداری', short: 'امور اداری', ic: 'users' },
  { id: 15, name: 'مدیریت امور مالی', short: 'امور مالی', ic: 'wallet' },
  { id: 16, name: 'مدیریت فناوری اطلاعات', short: 'فناوری اطلاعات', ic: 'server' },
  { id: 17, name: 'مدیریت عمران و توسعه', short: 'عمران و توسعه', ic: 'crane' }
];
const U_INTERNAL = 1, U_CULTURE = 2, U_PR = 3, U_ADMIN = 14, U_FIN = 15, U_IT = 16, U_CIVIL = 17;
const unitName = id => (id === 0 ? 'دفتر امام جماعت' : (UNITS.find(u => u.id === +id) || {}).name || '—');
const unitShort = id => (id === 0 ? 'دفتر امام جماعت' : (UNITS.find(u => u.id === +id) || {}).short || '—');
const ROLES = { imam: 'امام جماعت', manager: 'مدیر بخش', office: 'مسئول دفتر', secretary: 'منشی', staff: 'کارشناس' };

/* خدمات قابل درخواست هر مدیریت (حوزه‌های کارتابل اختصاصی) */
const SERVICES = {
  1: ['مهمانسرا و زائرسرا', 'آشپزخانه مرکزی', 'پذیرایی', 'انبار مرکزی', 'اموال', 'تأسیسات', 'تعمیرات و نگهداری', 'پارکینگ', 'محوطه و خدمات', 'خرید و تدارکات'],
  2: ['مراسم مذهبی', 'مراسم فاتحه و ترحیم', 'راهیان نور', 'اردوی زیارتی', 'برنامه فرهنگی'],
  3: ['اطلاع‌رسانی عمومی', 'هماهنگی مهمانان', 'فرهنگسرا', 'سالن آمفی‌تئاتر', 'سینما', 'سالن جلسات'],
  4: ['عکاسی', 'فیلم‌برداری', 'طراحی پوستر', 'تدوین', 'پوشش مراسم', 'پشتیبانی صوت و تصویر', 'آرشیو رسانه'],
  5: ['برنامه پایگاه', 'فعالیت فرهنگی', 'فعالیت جهادی', 'آموزش', 'نگهبانی و شیفت شب'],
  6: ['برنامه آموزشی', 'فعالیت تربیتی', 'امور اجرایی', 'ارتباط با خانواده‌ها'],
  7: ['برنامه آموزشی', 'فعالیت تربیتی', 'امور اجرایی', 'ارتباط با خانواده‌ها'],
  8: ['برنامه آموزشی', 'فعالیت تربیتی', 'امور اجرایی', 'ارتباط با خانواده‌ها'],
  9: ['امور اجرایی', 'هماهنگی کارکنان', 'تجهیزات', 'خدمات'],
  10: ['امور اجرایی', 'تأمین دارو و اقلام', 'گزارش موجودی'],
  11: ['امانت منابع', 'سالن مطالعه', 'عضویت', 'برنامه کتابخوانی'],
  12: ['نیازسنجی', 'توزیع کمک', 'ارتباط با خیرین'],
  13: ['پذیرش', 'برنامه بازی', 'ایمنی', 'هماهنگی مربیان'],
  14: ['صدور حکم و ابلاغ', 'مرخصی', 'مأموریت', 'قرارداد', 'امور اداری عمومی'],
  15: ['درخواست پرداخت', 'تخصیص بودجه', 'ثبت سند'],
  16: ['پشتیبانی رایانه', 'ایجاد کاربر', 'شبکه و اینترنت', 'امنیت', 'پشتیبان‌گیری'],
  17: ['پروژه ساختمانی', 'بازدید فنی', 'تهیه نقشه', 'تعمیرات اساسی']
};

/* دفاتر ثبت اختصاصی هر مدیریت */
const REGISTRIES = {
  4: [{ key: 'media', title: 'آرشیو رسانه', fields: [['title', 'عنوان'], ['kind', 'نوع', ['عکس', 'فیلم', 'پوستر', 'صوت']], ['date', 'تاریخ', 'date'], ['event', 'مراسم / رویداد'], ['place', 'محل نگهداری فایل']] }],
  5: [{ key: 'guard', title: 'نگهبانی و شیفت شب', fields: [['date', 'تاریخ', 'date'], ['person', 'نام بسیجی'], ['shift', 'شیفت', ['۲۰ تا ۲۴', '۲۴ تا ۴', '۴ تا ۸']], ['post', 'محل پست'], ['note', 'گزارش شیفت']] },
      { key: 'prog', title: 'برنامه‌ها و آموزش‌ها', fields: [['title', 'عنوان برنامه'], ['kind', 'نوع', ['فرهنگی', 'جهادی', 'آموزشی', 'ورزشی']], ['date', 'تاریخ', 'date'], ['count', 'تعداد شرکت‌کننده', 'number'], ['note', 'توضیح']] }],
  6: [{ key: 'edu', title: 'برنامه‌های آموزشی و تربیتی', fields: [['title', 'عنوان'], ['grade', 'پایه', ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم']], ['kind', 'نوع', ['آموزشی', 'تربیتی', 'اجرایی', 'جلسه اولیا']], ['date', 'تاریخ', 'date'], ['note', 'گزارش']] }],
  7: [{ key: 'edu', title: 'برنامه‌های آموزشی و تربیتی', fields: [['title', 'عنوان'], ['grade', 'پایه', ['هفتم', 'هشتم', 'نهم']], ['kind', 'نوع', ['آموزشی', 'تربیتی', 'اجرایی', 'جلسه اولیا']], ['date', 'تاریخ', 'date'], ['note', 'گزارش']] }],
  8: [{ key: 'edu', title: 'برنامه‌های آموزشی و تربیتی', fields: [['title', 'عنوان'], ['grade', 'پایه', ['دهم', 'یازدهم', 'دوازدهم']], ['kind', 'نوع', ['آموزشی', 'تربیتی', 'اجرایی', 'جلسه اولیا']], ['date', 'تاریخ', 'date'], ['note', 'گزارش']] }],
  9: [{ key: 'equip', title: 'تجهیزات و خدمات درمانگاه', fields: [['title', 'تجهیز / خدمت'], ['state', 'وضعیت', ['فعال', 'نیازمند سرویس', 'غیرفعال']], ['date', 'آخرین بازدید', 'date'], ['note', 'توضیح (بدون اطلاعات بیمار)']] }],
  10: [{ key: 'stock', title: 'موجودی اقلام', fields: [['title', 'نام قلم'], ['qty', 'موجودی', 'number'], ['min', 'حداقل مجاز', 'number'], ['supplier', 'تأمین‌کننده'], ['date', 'تاریخ انقضا', 'date']] }],
  11: [{ key: 'books', title: 'فهرست منابع', fields: [['title', 'عنوان کتاب'], ['author', 'نویسنده'], ['code', 'شماره ثبت'], ['state', 'وضعیت', ['موجود', 'امانت', 'مفقود']], ['member', 'امانت‌گیرنده']] },
       { key: 'events', title: 'فعالیت‌های کتابخوانی', fields: [['title', 'عنوان'], ['date', 'تاریخ', 'date'], ['count', 'شرکت‌کننده', 'number'], ['note', 'توضیح']] }],
  12: [{ key: 'aid', title: 'ثبت کمک‌ها (محرمانه)', conf: true, fields: [['donor', 'خیّر / منبع'], ['kind', 'نوع', ['نقدی', 'غیرنقدی', 'خدمات']], ['amount', 'مبلغ / ارزش (ریال)', 'number'], ['date', 'تاریخ', 'date'], ['use', 'مصرف / توزیع']] }],
  13: [{ key: 'admit', title: 'پذیرش و ظرفیت', fields: [['date', 'تاریخ', 'date'], ['session', 'سانس', ['صبح', 'عصر']], ['count', 'تعداد کودک', 'number'], ['cap', 'ظرفیت', 'number'], ['coach', 'مربی'], ['note', 'گزارش ایمنی']] }],
  16: [{ key: 'systems', title: 'سامانه‌ها و پشتیبان‌گیری', fields: [['title', 'سامانه / تجهیز'], ['kind', 'نوع', ['سامانه', 'شبکه', 'امنیت', 'پشتیبان‌گیری']], ['date', 'تاریخ آخرین بررسی', 'date'], ['state', 'وضعیت', ['سالم', 'هشدار', 'از کار افتاده']], ['note', 'توضیح']] }],
  17: [{ key: 'projects', title: 'پروژه‌های عمرانی', fields: [['title', 'نام پروژه'], ['contractor', 'پیمانکار'], ['start', 'شروع', 'date'], ['end', 'پایان برنامه', 'date'], ['progress', 'پیشرفت فیزیکی (٪)', 'number'], ['budget', 'بودجه (ریال)', 'number'], ['spent', 'هزینه‌شده (ریال)', 'number']] }]
};

/* فضاهای فیزیکی قابل رزرو و مدیریت تأییدکننده هر فضا (کنترل تداخل بر اساس سالن واقعی) */
const SPACES = [
  { id: 'hosseinieh', name: 'حسینیه', unit: 2, cap: 600, excl: true },
  { id: 'farhangsara', name: 'فرهنگسرا', unit: 3, cap: 80, excl: true },
  { id: 'amphi', name: 'سالن آمفی‌تئاتر ۱۴۴ نفره', unit: 3, cap: 144, excl: true },
  { id: 'cinema', name: 'سینما', unit: 3, cap: 60, excl: true },
  { id: 'meeting', name: 'سالن جلسات', unit: 3, cap: 24, excl: true },
  { id: 'zaersara', name: 'زائرسرا', unit: 1, cap: 40, excl: true },
  { id: 'guest', name: 'مهمانسرا و خدمات اسکان', unit: 1, cap: 16, excl: true }
];
/* نوع برنامه جدا از فضا: مراسم در یک سالن واقعی برگزار می‌شود؛ برنامه‌های بیرون از مجتمع فضا ندارند */
const PROGRAMS = [
  { id: 'general', name: 'برنامه عمومی', unit: 0 },
  { id: 'religious', name: 'مراسم مذهبی', unit: 2 },
  { id: 'fateheh', name: 'مراسم فاتحه و ترحیم', unit: 2 },
  { id: 'rahian', name: 'راهیان نور', unit: 2, offsite: true, cap: 120 },
  { id: 'ziarat', name: 'اردوی زیارتی', unit: 2, offsite: true, cap: 90 },
  { id: 'lodging', name: 'اسکان', unit: 1 }
];
const spaceOf = id => SPACES.find(s => s.id === id) || { id: '', name: 'خارج از مجتمع', unit: 0, cap: 0, excl: false };
const programOf = id => PROGRAMS.find(p => p.id === id) || PROGRAMS[0];
/* مدیریت تأییدکننده: مالک سالن؛ برای برنامه بیرون از مجتمع، متولی همان برنامه */
const resUnit = r => (r.space ? spaceOf(r.space).unit : programOf(r.program).unit || U_CULTURE);
const resCap = r => (r.space ? spaceOf(r.space).cap : programOf(r.program).cap || 0);
const resPlace = r => (r.space ? spaceOf(r.space).name : 'خارج از مجتمع');

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
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM6 6h1M17 6h1M6 17h1'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.file}"/></svg>`;

/* ---------- ذخیره‌سازی ---------- */
/* لایه داده: در این نسخه روی حافظه مرورگر؛ برای استقرار، همین رابط به API سرور متصل می‌شود (kartabl/README.md) */
const STORE_KEY = 'shabab-kartabl-v1';
let DB = null;
let MEMORY_ONLY = false;
const Store = {
  load() {
    try { const s = localStorage.getItem(STORE_KEY); if (s) { DB = JSON.parse(s); if (DB && DB.ver === 1) return; } } catch (e) { MEMORY_ONLY = true; }
    DB = seed(); this.save();
  },
  save() { if (typeof SERVER !== 'undefined' && SERVER) return; /* نسخه سروری: هیچ داده‌ای در مرورگر نمی‌ماند */ try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) { MEMORY_ONLY = true; } if (typeof Sync !== 'undefined') Sync.schedule(); },
  reset() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} DB = seed(); this.save(); }
};
const pref = {
  get(k, d) { try { const v = localStorage.getItem('shabab-pref-' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('shabab-pref-' + k, v); } catch (e) {} }
};

/* شماره‌گذاری خودکار */
function nextNo(kind) {
  const y = jYearNow();
  const key = kind + '-' + y;
  DB.seq[key] = (DB.seq[key] || 0) + 1;
  const n = DB.seq[key];
  const P = { in: 'و', out: 'ص', internal: 'د' };
  if (P[kind]) return `${y}/${P[kind]}/${pad(n, 4)}`;
  const L = { task: 'T', req: 'R', order: 'D', pay: 'P', res: 'B', meet: 'M', fin: 'F', mov: 'A', leave: 'L' };
  return `${L[kind] || 'X'}-${y}-${pad(n, 4)}`;
}

/* ---------- کاربر جاری و دسترسی‌ها ---------- */
let ME = null; // { user, pos }
const posById = id => DB.positions.find(p => p.id === id);
const userById = id => DB.users.find(u => u.id === id);
const holderOf = posId => DB.users.find(u => u.posId === posId && u.active);
const posLabel = id => { const p = posById(id); if (!p) return '—'; return p.unitId === 0 ? p.title : `${p.title} ${unitShort(p.unitId)}`; };
const posWho = id => { const h = holderOf(id); return h ? `${h.name} (${posLabel(id)})` : `${posLabel(id)} (بدون متصدی)`; };
const unitPos = (unitId, role) => DB.positions.find(p => p.unitId === unitId && p.role === role);
const unitPositions = unitId => DB.positions.filter(p => p.unitId === unitId);

const isImam = () => ME && ME.pos.role === 'imam';
const myUnit = () => (ME ? ME.pos.unitId : -1);
const myRole = () => (ME ? ME.pos.role : '');
const inUnit = u => myUnit() === +u;
const isMgr = u => isImam() || (inUnit(u) && myRole() === 'manager');
const isMgrOrOffice = u => isImam() || (inUnit(u) && ['manager', 'office'].includes(myRole()));
const isClerk = u => isImam() || (inUnit(u) && ['manager', 'office', 'secretary'].includes(myRole()));

/* ---------- مجوزها: پیش‌فرض نقش ← ماتریس قابل ویرایش نقش‌ها ← استثنای هر جایگاه ---------- */
const PERMS = [
  ['view.all', 'مشاهده و بازبینی همه بخش‌ها و همه مدیریت‌ها', 'نظارت'],
  ['reports.view', 'گزارش‌گیری و داشبورد نظارتی', 'نظارت'],
  ['orders.issue', 'صدور دستور در بخش دستورات امام جماعت', 'گردش کار'],
  ['tasks.create', 'تعریف و ارجاع وظیفه در واحد خود', 'گردش کار'],
  ['letters.create', 'ثبت نامه وارده، صادره و داخلی', 'دبیرخانه'],
  ['letters.secret', 'مشاهده نامه‌های «سری» واحد خود', 'دبیرخانه'],
  ['meetings.create', 'ثبت جلسه و ملاقات', 'تقویم'],
  ['assets.view', 'دسترسی به سامانه اموال و انبار', 'اموال'],
  ['finance.view', 'مشاهده کامل امور مالی همه واحدها', 'مالی'],
  ['finance.request', 'ثبت درخواست پرداخت', 'مالی'],
  ['hr.view', 'مشاهده پرونده‌های پرسنلی و قراردادها', 'منابع انسانی'],
  ['admin.panel', 'ورود به پنل مدیریت سامانه', 'مدیریت سامانه'],
  ['admin.users', 'افزودن، حذف و ویرایش کاربران و جایگاه‌ها', 'مدیریت سامانه'],
  ['admin.passwords', 'تعیین و بازنشانی رمز عبور کاربران', 'مدیریت سامانه'],
  ['admin.perms', 'دادن و گرفتن سطح دسترسی', 'مدیریت سامانه'],
  ['admin.signups', 'تأیید یا رد درخواست‌های عضویت', 'مدیریت سامانه'],
  ['admin.logs', 'مشاهده ورودها، نشست‌ها و رویدادهای سیستمی', 'مدیریت سامانه'],
  ['admin.approve', 'تأیید یا رد مدیریتی همه موارد معلق', 'مدیریت سامانه'],
  ['admin.settings', 'تغییر تنظیمات، ظاهر و ساختار سامانه', 'مدیریت سامانه'],
  ['admin.data', 'ویرایش و حذف مستقیم داده‌ها', 'مدیریت سامانه'],
  ['admin.backup', 'پشتیبان‌گیری و بازیابی', 'مدیریت سامانه']
];
/* مجوزهای حساس: فقط امام جماعت می‌تواند آن‌ها را اعطا کند و هیچ‌کس نمی‌تواند به خودش بدهد */
const LABEL_BAD = /[<>"'`&]/;
const SENSITIVE_PERMS = ['view.all', 'orders.issue', 'finance.view', 'hr.view', 'letters.secret', 'admin.panel', 'admin.users', 'admin.passwords', 'admin.perms', 'admin.signups', 'admin.logs', 'admin.approve', 'admin.settings', 'admin.data', 'admin.backup'];
const isSensitivePerm = k => SENSITIVE_PERMS.includes(k);
const isSensitivePos = p => !!p && (p.role === 'imam' || ['view.all', 'orders.issue', 'admin.users', 'admin.passwords', 'admin.perms', 'admin.settings', 'admin.data', 'admin.backup', 'admin.approve'].some(k => permOf(p, k)));
const permLabel = k => (PERMS.find(p => p[0] === k) || [k, k])[1];
/* پیش‌فرض بر اساس نقش و مدیریت (مدیر فناوری اطلاعات همه اختیارات مدیریت سامانه را دارد) */
function permDefault(pos, k) {
  const r = pos.role, u = pos.unitId;
  const itMgr = u === U_IT && r === 'manager';
  if (r === 'imam') return true;
  if (k.startsWith('admin.') || k === 'view.all') return itMgr || (k === 'admin.users' && u === U_ADMIN && r === 'manager');
  switch (k) {
    case 'reports.view': return ['manager', 'office'].includes(r);
    case 'orders.issue': return false;
    case 'tasks.create': return ['manager', 'office'].includes(r);
    case 'letters.create': return ['manager', 'office', 'secretary'].includes(r);
    case 'letters.secret': return r === 'manager';
    case 'meetings.create': case 'assets.view': case 'finance.request': return r !== 'staff';
    case 'finance.view': return u === U_FIN;
    case 'hr.view': return u === U_ADMIN && ['manager', 'office'].includes(r);
  }
  return false;
}
function permOf(pos, k) {
  if (!pos) return false;
  const o = (pos.perms || {})[k];
  if (o === 'allow') return true;
  if (o === 'deny') return false;
  const rp = ((DB.settings.rolePerms || {})[pos.role] || {})[k];
  if (rp === 'allow') return true;
  if (rp === 'deny') return false;
  return permDefault(pos, k);
}
const can = k => !!ME && permOf(ME.pos, k);
const isAll = () => isImam() || can('view.all');
const canSeeUnit = u => isAll() || inUnit(u);
const canFinance = () => can('finance.view');
const canHR = () => can('hr.view');
const canAdminUsers = () => can('admin.users');
const canSettings = () => can('admin.settings');
const canAssets = () => can('assets.view');
const canAdminPanel = () => can('admin.panel') || can('admin.users') || can('admin.settings') || can('admin.logs');

/* ---------- ثبت رویداد (زنجیره غیرقابل‌ویرایش) ---------- */
/* رمز عبور: در نسخه نمایشی هش ساده؛ سرور این دو تابع را با scrypt جایگزین می‌کند */
let pwHash = p => 'demo$' + hash('shabab:' + en(p));
let pwCheck = (stored, p) => !!stored && (stored === pwHash(p) || stored === hash('shabab:' + en(p)));
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
function audit(act, ent, id, note = '') {
  const prev = DB.audit.length ? DB.audit[DB.audit.length - 1].h : '00000000';
  const e = { ts: stamp(), uid: ME ? ME.user.id : 'system', pos: ME ? (ME.realPos || ME.pos.id) : '', unit: ME ? ME.pos.unitId : -1, act: ME && ME.override ? act + ' (مدیریتی)' : act, ent, id, note };
  e.h = hash(prev + JSON.stringify(e));
  DB.audit.push(e);
}
function verifyAudit() {
  let prev = '00000000';
  for (let i = 0; i < DB.audit.length; i++) {
    const { h, ...rest } = DB.audit[i];
    if (hash(prev + JSON.stringify(rest)) !== h) return i;
    prev = h;
  }
  return -1;
}
function hist(obj, action, note = '') {
  obj.history = obj.history || [];
  if (ME && ME.override) note = (note ? note + ' — ' : '') + 'اقدام مدیریتی به‌جای ' + posLabel(ME.pos.id);
  obj.history.push({ ts: stamp(), uid: ME ? ME.user.id : 'system', pos: ME ? (ME.realPos || ME.pos.id) : '', action, note });
}
const histHTML = h => (h && h.length ? `<div class="hist">${h.slice().reverse().map(x => `<div><b>${esc(x.action)}</b>${x.note ? ` — ${esc(x.note)}` : ''}<small>${jdt(x.ts)} · ${esc(x.uid === 'system' ? 'سامانه' : (userById(x.uid) || {}).name || '—')}${x.pos ? ' · ' + esc(posLabel(x.pos)) : ''}</small></div>`).join('')}</div>` : '<div class="empty">سابقه‌ای ثبت نشده است.</div>');

/* ---------- اعلان و پیامک ---------- */
const SMS_EVENTS = {
  request: 'ثبت درخواست جدید', letter: 'ارجاع نامه', order: 'صدور دستور', decision: 'تأیید یا رد درخواست',
  due: 'نزدیک‌شدن مهلت انجام کار', overdue: 'معوق‌شدن وظیفه', meeting: 'ثبت جلسه', reservation: 'تغییر وضعیت رزرو'
};
function notify(posIds, ev, text, link, ref) {
  const ids = [...new Set(posIds.filter(Boolean))].filter(p => !ME || p !== ME.pos.id);
  ids.forEach(p => {
    DB.notifs.push({ id: uid(), pos: p, ev, text, link, ts: stamp(), read: false });
    const s = DB.settings.sms;
    const u = holderOf(p);
    if (s.enabled && s.events[ev] && u && u.phone && s.roles.includes((posById(p) || {}).role)) {
      /* متن پیامک هرگز شامل جزئیات محرمانه نمی‌شود؛ فقط نوع رویداد و کد پیگیری */
      DB.sms.push({ id: uid(), to: u.phone, name: u.name, text: `مجتمع شباب اهل‌الجنه: ${SMS_EVENTS[ev]}${ref ? ' — کد پیگیری ' + ref : ''}. جزئیات در کارتابل.`, ts: stamp(), status: 'در صف ارسال' });
    }
  });
}
const unitHeads = u => [unitPos(+u, 'manager'), unitPos(+u, 'office')].filter(Boolean).map(p => p.id);
const imamPos = () => DB.positions.find(p => p.role === 'imam').id;

/* بررسی مهلت‌ها و صدور اعلان نزدیک به موعد / معوق (یک‌بار برای هر مورد) */
function sweepDeadlines() {
  const t = todayISO();
  DB.flags = DB.flags || {};
  const check = (kind, x, due, targets, label) => {
    if (!due || x.done) return;
    const d = daysBetween(t, due);
    if (d < 0 && !DB.flags[kind + x.id + 'o']) { DB.flags[kind + x.id + 'o'] = 1; notify(targets, 'overdue', `${label} «${x.title}» معوق شد.`, x.link, x.no); }
    else if (d >= 0 && d <= 2 && !DB.flags[kind + x.id + 'd']) { DB.flags[kind + x.id + 'd'] = 1; notify(targets, 'due', `مهلت ${label} «${x.title}» نزدیک است (${jd(due)}).`, x.link, x.no); }
  };
  const meBefore = ME; ME = null;
  DB.tasks.forEach(k => check('t', { ...k, done: k.status === 'تکمیل‌شده', link: 'tasks' }, k.due, [k.assignee, ...unitHeads(k.unitId)], 'وظیفه'));
  DB.orders.forEach(o => check('o', { ...o, done: o.status === 'تکمیل‌شده', link: 'orders' }, o.due, [o.respPos, ...o.units.flatMap(unitHeads), imamPos()], 'دستور'));
  ME = meBefore;
}

/* =====================================================================
   لایه منطق کسب‌وکار: گردش کار، تأییدها و قواعد
   هر تابع یا موفق می‌شود و رکورد را برمی‌گرداند، یا رشته خطا برمی‌گرداند
   ===================================================================== */
const fail = m => ({ error: m });

/* ---------- دبیرخانه ---------- */
const LETTER_TYPES = { in: 'وارده', out: 'صادره', internal: 'داخلی' };
const LETTER_CATS = ['اداری', 'مالی', 'فرهنگی', 'آموزشی', 'عمرانی', 'خدماتی', 'سایر'];
const PRIORITIES = ['عادی', 'فوری', 'خیلی فوری'];
const CONF = ['عادی', 'محرمانه', 'سری'];
function canSeeLetter(l) {
  if (isAll()) return true;
  const mine = inUnit(l.unitId) || l.refs.some(r => inUnit(r.unitId)) || l.toUnit === myUnit();
  if (!mine) return false;
  if (l.conf === 'سری') return can('letters.secret');
  if (l.conf === 'محرمانه') return myRole() !== 'staff';
  return true;
}
function createLetter(v) {
  if (!can('letters.create')) return fail('ثبت نامه برای جایگاه شما مجاز نیست.');
  if (!isImam()) v.unitId = myUnit();
  if (!LETTER_TYPES[v.type]) return fail('نوع نامه را انتخاب کنید.');
  if (!String(v.subject || '').trim()) return fail('موضوع نامه را بنویسید.');
  if (v.date && !DATE_RE.test(v.date)) return fail('تاریخ نامه معتبر نیست.');
  if (!PRIORITIES.includes(v.priority || 'عادی') || !CONF.includes(v.conf || 'عادی')) return fail('اهمیت یا محرمانگی معتبر نیست.');
  const l = { id: uid(), no: nextNo(v.type), type: v.type, subject: v.subject, cat: v.cat || 'اداری', sender: v.sender || '', receiver: v.receiver || '',
    unitId: +v.unitId, toUnit: v.toUnit === '' || v.toUnit == null ? null : +v.toUnit, priority: v.priority || 'عادی', conf: v.conf || 'عادی',
    date: v.date || todayISO(), body: v.body || '', files: v.files || [], refs: [], replies: [], needReply: !!v.needReply,
    status: 'ثبت‌شده', signer: v.signer || '', created: stamp(), by: ME ? ME.user.id : 'system' };
  hist(l, 'ثبت نامه ' + LETTER_TYPES[l.type], 'شماره ' + fa(l.no));
  DB.letters.push(l);
  audit('ثبت نامه', 'letter', l.id, fa(l.no));
  if (l.type === 'internal' && l.toUnit != null) referLetter(l, l.toUnit, 'ارسال مکاتبه داخلی');
  return l;
}
const canHandleLetter = l => canSeeLetter(l) && (isImam() || can('letters.create')) && l.status !== 'بایگانی';
function referLetter(l, unitId, note) {
  unitId = +unitId;
  if (ME && !canHandleLetter(l)) return fail('ارجاع این نامه برای جایگاه شما مجاز نیست.');
  if (unitId !== 0 && !UNITS.some(u => u.id === unitId)) return fail('مدیریت مقصد را انتخاب کنید.');
  l.refs.push({ unitId, ts: stamp(), by: ME ? ME.user.id : 'system', note: note || '' });
  l.status = 'ارجاع‌شده';
  hist(l, 'ارجاع به ' + unitName(unitId), note);
  audit('ارجاع نامه', 'letter', l.id, unitShort(unitId));
  const t = unitId === 0 ? [imamPos()] : unitHeads(unitId).concat([unitPos(unitId, 'secretary')?.id]);
  notify(t, 'letter', `نامه ${fa(l.no)} با موضوع «${l.conf === 'عادی' ? l.subject : 'محرمانه'}» به ${unitShort(unitId)} ارجاع شد.`, 'letters', l.no);
  return l;
}
function replyLetter(l, text) {
  if (!canHandleLetter(l)) return fail('ثبت پاسخ برای جایگاه شما مجاز نیست.');
  if (!text) return fail('متن پاسخ را بنویسید.');
  l.replies.push({ ts: stamp(), by: ME.user.id, pos: ME.pos.id, text });
  l.status = 'پاسخ داده‌شده';
  hist(l, 'ثبت پاسخ', text.slice(0, 80));
  audit('پاسخ نامه', 'letter', l.id, l.no);
  return l;
}
function archiveLetter(l) { if (!canHandleLetter(l)) return fail('بایگانی این نامه برای جایگاه شما مجاز نیست.'); l.status = 'بایگانی'; hist(l, 'بایگانی'); audit('بایگانی نامه', 'letter', l.id, l.no); return l; }

/* ---------- دستورات امام جماعت ---------- */
const ORDER_ST = ['جدید', 'در حال بررسی', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const orderStatus = o => (o.status !== 'تکمیل‌شده' && o.due && o.due < todayISO() ? 'معوق' : o.status);
const canSeeOrder = o => isAll() || o.units.includes(myUnit());
function createOrder(v) {
  if (!isImam() && !can('orders.issue')) return fail('صدور دستور فقط برای امام جماعت یا جایگاه دارای مجوز است.');
  const oerr = validateOrder(v); if (oerr) return fail(oerr);
  const units = (v.units || []).map(Number);
  if (!units.length) return fail('دست‌کم یک مدیریت مسئول انتخاب کنید.');
  const o = { id: uid(), no: nextNo('order'), title: v.title, desc: v.desc || '', units, respPos: v.respPos || unitPos(units[0], 'manager').id,
    priority: v.priority || 'عادی', issued: v.issued || todayISO(), due: v.due || '', files: v.files || [], needReport: !!v.needReport,
    status: 'جدید', progress: 0, reports: [], created: stamp() };
  hist(o, 'صدور دستور', 'مدیریت‌های مسئول: ' + units.map(unitShort).join('، '));
  DB.orders.push(o);
  audit('صدور دستور', 'order', o.id, o.no);
  notify([o.respPos, ...units.flatMap(unitHeads)], 'order', `دستور جدید امام جماعت: «${o.title}»`, 'orders', o.no);
  return o;
}
function orderReport(o, v) {
  if (!(o.units.some(u => isMgrOrOffice(u)) && !isImam())) return fail('ثبت گزارش پیشرفت برای مدیر و مسئول دفتر مدیریت مسئول مجاز است.');
  const st = v.status || o.status;
  if (st === 'تکمیل‌شده') return fail('تکمیل نهایی دستور با تأیید امام جماعت انجام می‌شود.');
  if (st === 'منتظر تأیید' && o.needReport && !v.note) return fail('این دستور نیازمند گزارش نهایی است؛ متن گزارش را بنویسید.');
  o.status = st; o.progress = Math.max(0, Math.min(100, +v.progress || o.progress));
  if (st === 'منتظر تأیید') o.progress = 100;
  o.reports.push({ ts: stamp(), by: ME.user.id, pos: ME.pos.id, note: v.note || '', progress: o.progress, files: v.files || [] });
  hist(o, 'گزارش پیشرفت: ' + st + ' (' + fa(o.progress) + '٪)', v.note);
  audit('گزارش دستور', 'order', o.id, o.no);
  if (st === 'منتظر تأیید') notify([imamPos()], 'order', `دستور «${o.title}» برای تأیید نهایی ارسال شد.`, 'orders', o.no);
  return o;
}
function orderDecide(o, ok, note) {
  if (!isImam()) return fail('تأیید نهایی دستور با امام جماعت است.');
  if (o.status !== 'منتظر تأیید') return fail('این دستور در انتظار تأیید نیست.');
  o.status = ok ? 'تکمیل‌شده' : 'در حال انجام';
  if (ok) o.doneAt = stamp(); else o.progress = Math.min(o.progress, 80);
  hist(o, ok ? 'تأیید و تکمیل دستور' : 'بازگشت برای اصلاح', note);
  audit(ok ? 'تأیید دستور' : 'بازگشت دستور', 'order', o.id, o.no);
  notify([o.respPos, ...o.units.flatMap(unitHeads)], 'decision', `دستور «${o.title}» ${ok ? 'تأیید شد' : 'برای اصلاح بازگشت'}.`, 'orders', o.no);
  return o;
}

/* ---------- وظایف ---------- */
function validateTask(v) {
  if (!String(v.title || '').trim()) return 'عنوان وظیفه را بنویسید.';
  if (v.start && !DATE_RE.test(v.start)) return 'تاریخ شروع معتبر نیست.';
  if (v.due && !DATE_RE.test(v.due)) return 'مهلت معتبر نیست.';
  if (v.due && v.start && v.due < v.start) return 'مهلت نمی‌تواند پیش از تاریخ شروع باشد.';
  if (v.priority && !PRIORITIES.includes(v.priority)) return 'اولویت معتبر نیست.';
  return '';
}
function validateOrder(v) {
  if (!String(v.title || '').trim()) return 'عنوان دستور را بنویسید.';
  if (v.due && !DATE_RE.test(v.due)) return 'مهلت معتبر نیست.';
  if (v.due && v.issued && v.due < v.issued) return 'مهلت نمی‌تواند پیش از تاریخ صدور باشد.';
  if (v.priority && !PRIORITIES.includes(v.priority)) return 'اهمیت معتبر نیست.';
  return '';
}
const TASK_ST = ['جدید', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const taskStatus = t => (t.status !== 'تکمیل‌شده' && t.due && t.due < todayISO() ? 'معوق' : t.status);
function canSeeTask(t) {
  if (isAll()) return true;
  if (!inUnit(t.unitId)) return false;
  return myRole() !== 'staff' || t.assignee === ME.pos.id;
}
function createTask(v) {
  const u = +v.unitId;
  if (!(isMgrOrOffice(u) || (inUnit(u) && can('tasks.create')))) return fail('تعریف وظیفه برای مدیر و مسئول دفتر همان مدیریت مجاز است.');
  if (!v.title) return fail('عنوان وظیفه را بنویسید.');
  if (!v.assignee) return fail('مسئول انجام را انتخاب کنید.');
  const terr = validateTask(v); if (terr) return fail(terr);
  if (!posById(v.assignee) || posById(v.assignee).unitId !== u) return fail('مسئول انجام باید از همین مدیریت باشد.');
  const t = { id: uid(), no: nextNo('task'), unitId: u, title: v.title, desc: v.desc || '', assignee: v.assignee, start: v.start || todayISO(), due: v.due || '',
    priority: v.priority || 'عادی', files: v.files || [], status: 'جدید', created: stamp(), by: ME.user.id, src: v.src || '' };
  hist(t, 'تعریف وظیفه', 'مسئول: ' + posWho(t.assignee));
  DB.tasks.push(t);
  audit('تعریف وظیفه', 'task', t.id, t.no);
  notify([t.assignee], 'request', `وظیفه جدید به شما ارجاع شد: «${t.title}»`, 'tasks', t.no);
  return t;
}
function taskActions(t) {
  const a = [];
  const mine = ME.pos.id === t.assignee;
  const head = isMgrOrOffice(t.unitId);
  if (t.status === 'جدید' && (mine || head)) a.push(['start', 'شروع انجام']);
  if (t.status === 'در حال انجام' && (mine || head)) a.push(['submit', 'اعلام انجام و ارسال برای تأیید']);
  if (t.status === 'منتظر تأیید' && head && !mine) a.push(['approve', 'تأیید انجام'], ['return', 'بازگشت برای اصلاح']);
  if (t.status === 'منتظر تأیید' && head && mine && myRole() === 'manager') a.push(['approve', 'تأیید انجام']);
  if (t.status !== 'تکمیل‌شده' && head) a.push(['reassign', 'ارجاع به فرد دیگر']);
  if (t.status !== 'تکمیل‌شده' && (mine || head)) a.push(['note', 'ثبت یادداشت پیشرفت']);
  return a;
}
function taskAct(t, act, note, extra) {
  if (!taskActions(t).some(x => x[0] === act)) return fail('این اقدام برای جایگاه شما مجاز نیست.');
  const map = { start: 'در حال انجام', submit: 'منتظر تأیید', approve: 'تکمیل‌شده', return: 'در حال انجام' };
  if (act === 'reassign') {
    if (!extra) return fail('فرد جدید را انتخاب کنید.');
    hist(t, 'ارجاع مجدد', `از ${posWho(t.assignee)} به ${posWho(extra)}${note ? ' — ' + note : ''}`);
    t.assignee = extra;
    notify([extra], 'request', `وظیفه «${t.title}» به شما ارجاع شد.`, 'tasks', t.no);
  } else if (act === 'note') {
    if (!note) return fail('متن یادداشت را بنویسید.');
    hist(t, 'یادداشت پیشرفت', note);
  } else {
    if (act === 'return' && !note) return fail('علت بازگشت را بنویسید.');
    t.status = map[act];
    if (act === 'approve') t.doneAt = stamp();
    hist(t, 'تغییر وضعیت به «' + t.status + '»', note);
    if (act === 'submit') notify(unitHeads(t.unitId), 'request', `وظیفه «${t.title}» برای تأیید ارسال شد.`, 'tasks', t.no);
    if (act === 'approve' || act === 'return') notify([t.assignee], 'decision', `وظیفه «${t.title}» ${act === 'approve' ? 'تأیید شد' : 'برای اصلاح بازگشت'}.`, 'tasks', t.no);
  }
  audit('اقدام روی وظیفه', 'task', t.id, t.no + ' · ' + act);
  return t;
}

/* ---------- درخواست‌های داخلی و همکاری میان‌بخشی ---------- */
const REQ_STAGES = ['ثبت درخواست', 'ارجاع به مدیریت مسئول', 'بررسی و هماهنگی', 'تأیید', 'اجرا', 'گزارش نهایی', 'بایگانی'];
const reqLabel = r => (r.status === 'ردشده' ? 'ردشده' : r.status === 'لغوشده' ? 'لغوشده' : REQ_STAGES[r.stage]);
function canSeeReq(r) {
  if (isAll()) return true;
  const u = myUnit();
  const related = r.fromUnit === u || r.toUnit === u || r.coops.includes(u);
  if (!related) return false;
  if (myRole() === 'staff') return r.by === ME.user.id || r.execPos === ME.pos.id;
  return true;
}
function createRequest(v) {
  if (!v.title) return fail('عنوان درخواست را بنویسید.');
  if (v.toUnit === '' || v.toUnit == null) return fail('مدیریت مسئول را انتخاب کنید.');
  const r = { id: uid(), no: nextNo('req'), title: v.title, desc: v.desc || '', cat: v.cat || '', fromUnit: myUnit(), toUnit: +v.toUnit,
    priority: v.priority || 'عادی', needsImam: !!v.needsImam, due: v.due || '', files: v.files || [], coops: [], coopNotes: [],
    stage: 0, status: 'جاری', by: ME.user.id, byPos: ME.pos.id, created: stamp(), report: '', kind: v.kind || 'internal' };
  hist(r, 'ثبت درخواست', 'کد پیگیری ' + r.no);
  r.stage = 1;
  hist(r, 'ارجاع به ' + unitName(r.toUnit));
  DB.requests.push(r);
  audit('ثبت درخواست', 'request', r.id, r.no);
  notify(unitHeads(r.toUnit), 'request', `درخواست جدید از ${unitShort(r.fromUnit)}: «${r.title}»`, 'requests', r.no);
  return r;
}
function reqApprover(r) { return r.needsImam ? 'imam' : 'manager'; }
function reqActions(r) {
  const a = [];
  if (r.status !== 'جاری') return a;
  const head = isMgrOrOffice(r.toUnit) && (inUnit(r.toUnit) || isImam());
  if (r.stage === 1 && head) a.push(['review', 'شروع بررسی']);
  if (r.stage === 2 && head) a.push(['coop', 'درخواست همکاری از مدیریت دیگر'], ['send', 'ارسال برای تأیید']);
  if (r.stage === 2 && r.coops.some(u => isMgrOrOffice(u) && inUnit(u))) a.push(['coopnote', 'ثبت نظر / اقدام همکاری']);
  if (r.stage === 3) {
    const ok = r.needsImam ? isImam() : (isMgr(r.toUnit) && (inUnit(r.toUnit) || isImam()));
    if (ok) a.push(['approve', 'تأیید'], ['reject', 'رد درخواست']);
  }
  if (r.stage === 4 && (inUnit(r.toUnit) || isImam())) a.push(['exec', 'ثبت اجرا']);
  if (r.stage === 5 && head) a.push(['final', 'ثبت گزارش نهایی و بایگانی']);
  if (r.stage <= 2 && r.by === ME.user.id) a.push(['cancel', 'لغو درخواست']);
  return a;
}
function reqAct(r, act, note, extra) {
  if (!reqActions(r).some(x => x[0] === act)) return fail('این اقدام در این مرحله برای جایگاه شما مجاز نیست.');
  const toReq = [r.byPos];
  switch (act) {
    case 'review': r.stage = 2; hist(r, 'شروع بررسی و هماهنگی', note); break;
    case 'coop': {
      const u = +extra;
      if (!u || u === r.toUnit) return fail('مدیریت همکار را انتخاب کنید.');
      if (!r.coops.includes(u)) r.coops.push(u);
      hist(r, 'درخواست همکاری از ' + unitName(u), note);
      notify(unitHeads(u), 'request', `درخواست همکاری از ${unitShort(r.toUnit)} برای «${r.title}»`, 'requests', r.no);
      break;
    }
    case 'coopnote':
      if (!note) return fail('متن نظر یا اقدام را بنویسید.');
      r.coopNotes.push({ ts: stamp(), unit: myUnit(), by: ME.user.id, note });
      hist(r, 'نظر همکاری ' + unitShort(myUnit()), note);
      notify(unitHeads(r.toUnit), 'request', `${unitShort(myUnit())} برای «${r.title}» اقدام همکاری ثبت کرد.`, 'requests', r.no);
      break;
    case 'send':
      r.stage = 3; hist(r, 'ارسال برای تأیید ' + (r.needsImam ? 'امام جماعت' : 'مدیر ' + unitShort(r.toUnit)), note);
      notify(r.needsImam ? [imamPos()] : [unitPos(r.toUnit, 'manager').id], 'request', `درخواست «${r.title}» منتظر تأیید شماست.`, 'requests', r.no);
      break;
    case 'approve': r.stage = 4; r.approvedBy = ME.user.id; hist(r, 'تأیید درخواست', note); notify(toReq.concat(unitHeads(r.toUnit)), 'decision', `درخواست «${r.title}» تأیید شد.`, 'requests', r.no); break;
    case 'reject':
      if (!note) return fail('علت رد را بنویسید.');
      r.status = 'ردشده'; hist(r, 'رد درخواست', note); notify(toReq, 'decision', `درخواست «${r.title}» رد شد.`, 'requests', r.no); break;
    case 'exec':
      if (!note) return fail('شرح اقدام اجرایی را بنویسید.');
      r.stage = 5; hist(r, 'ثبت اجرا', note); break;
    case 'final':
      if (!note) return fail('متن گزارش نهایی را بنویسید.');
      r.report = note; r.stage = 6; r.status = 'بایگانی'; r.doneAt = stamp();
      hist(r, 'ثبت گزارش نهایی', note); hist(r, 'بایگانی');
      notify(toReq, 'decision', `درخواست «${r.title}» انجام و بایگانی شد.`, 'requests', r.no); break;
    case 'cancel': r.status = 'لغوشده'; hist(r, 'لغو توسط درخواست‌کننده', note); break;
  }
  audit('اقدام درخواست', 'request', r.id, r.no + ' · ' + act);
  return r;
}

/* ---------- رزرو فضاها ---------- */
const RES_ST = ['در انتظار تأیید', 'تأییدشده', 'ردشده', 'لغوشده'];
const overlap = (a, b) => a.date === b.date && a.start < b.end && b.start < a.end;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d\d-\d\d$/;
function resConflicts(r) {
  if (!r.space || !spaceOf(r.space).excl) return [];
  return DB.reservations.filter(x => x.id !== r.id && x.space === r.space && x.status === 'تأییدشده' && overlap(x, r));
}
/* اعتبارسنجی مشترک رزرو برای ثبت، ویرایش و تأیید */
function validateReservation(v) {
  const prog = PROGRAMS.find(p => p.id === v.program);
  if (!prog) return 'نوع برنامه را انتخاب کنید.';
  if (prog.offsite) { if (v.space) return 'برنامه بیرون از مجتمع به فضای داخلی نیاز ندارد.'; }
  else if (!SPACES.some(x => x.id === v.space)) return 'فضای برگزاری را انتخاب کنید.';
  if (!String(v.kind || '').trim()) return 'عنوان برنامه را بنویسید.';
  if (!String(v.applicant || '').trim()) return 'نام متقاضی را بنویسید.';
  if (!/^0?9\d{9}$|^0\d{10}$/.test(en(v.phone || '').replace(/\D/g, ''))) return 'شماره تماس معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹).';
  if (!DATE_RE.test(v.date || '')) return 'تاریخ را وارد کنید.';
  if (!TIME_RE.test(v.start || '') || !TIME_RE.test(v.end || '')) return 'ساعت شروع و پایان را وارد کنید.';
  if (v.end <= v.start) return 'ساعت پایان باید بعد از ساعت شروع باشد.';
  const n = Number(en(v.people));
  if (!Number.isInteger(n) || n < 1) return 'تعداد افراد باید عدد صحیح و دست‌کم یک نفر باشد.';
  const cap = resCap(v);
  if (cap && n > cap) return `ظرفیت ${resPlace(v) === 'خارج از مجتمع' ? prog.name : resPlace(v)} ${fa(cap)} نفر است.`;
  return '';
}
function createReservation(v) {
  const err = validateReservation(v); if (err) return fail(err);
  const r = { id: uid(), no: nextNo('res'), program: v.program, space: v.space || '', applicant: String(v.applicant).trim(), phone: en(v.phone).replace(/\D/g, ''), kind: String(v.kind).trim(), date: v.date, start: v.start, end: v.end,
    people: Number(en(v.people)), equip: v.equip || '', desc: v.desc || '', status: 'در انتظار تأیید', by: ME.user.id, byPos: ME.pos.id, fromUnit: myUnit(), created: stamp() };
  const c = resConflicts(r);
  hist(r, 'ثبت درخواست رزرو', c.length ? 'هشدار: با ' + fa(c.length) + ' رزرو تأییدشده هم‌زمان است' : '');
  DB.reservations.push(r);
  audit('ثبت رزرو', 'reservation', r.id, r.no);
  notify(unitHeads(resUnit(r)), 'reservation', `درخواست رزرو ${resPlace(r)} برای ${jd(r.date)}`, 'reservations', r.no);
  return r;
}
const canDecideRes = r => isMgrOrOffice(resUnit(r)) && (inUnit(resUnit(r)) || isImam());
function resDecide(r, status, note) {
  if (!RES_ST.includes(status) || status === 'در انتظار تأیید') return fail('وضعیت نامعتبر است.');
  if (status === 'لغوشده') { if (!(r.by === ME.user.id || canDecideRes(r))) return fail('اجازه لغو ندارید.'); if (!['در انتظار تأیید', 'تأییدشده'].includes(r.status)) return fail('این رزرو قابل لغو نیست.'); }
  else {
    if (!canDecideRes(r)) return fail(`تأیید رزرو ${resPlace(r)} با ${unitName(resUnit(r))} است.`);
    if (r.status !== 'در انتظار تأیید') return fail('این رزرو قبلاً تعیین تکلیف شده است.');
  }
  if (status === 'تأییدشده') {
    const err = validateReservation(r); if (err) return fail('پیش از تأیید باید اصلاح شود: ' + err);
    const c = resConflicts(r);
    if (c.length) return fail(`تداخل زمانی با رزرو تأییدشده ${fa(c[0].no)} (${tm(c[0].start)} تا ${tm(c[0].end)}). ابتدا آن را جابه‌جا یا لغو کنید.`);
  }
  if (status === 'ردشده' && !note) return fail('علت رد را بنویسید.');
  r.status = status; hist(r, 'تغییر وضعیت به «' + status + '»', note);
  audit('تصمیم رزرو', 'reservation', r.id, r.no + ' · ' + status);
  notify([r.byPos], 'reservation', `رزرو ${resPlace(r)} (${jd(r.date)}) ${status} شد.`, 'reservations', r.no);
  return r;
}

/* ---------- جلسات ---------- */
const canSeeMeeting = m => isAll() || m.invitees.includes(ME.pos.id) || m.byPos === ME.pos.id || (m.unitId === myUnit() && myRole() !== 'staff');
function validateMeeting(v) {
  if (!String(v.title || '').trim()) return 'عنوان جلسه را بنویسید.';
  if (!DATE_RE.test(v.date || '')) return 'تاریخ جلسه را وارد کنید.';
  if (!TIME_RE.test(v.start || '')) return 'ساعت شروع را وارد کنید.';
  if (v.end && !TIME_RE.test(v.end)) return 'ساعت پایان معتبر نیست.';
  if (v.end && v.end <= v.start) return 'ساعت پایان باید بعد از شروع باشد.';
  return '';
}
function createMeeting(v) {
  if (!can('meetings.create')) return fail('ثبت جلسه برای منشی، مسئول دفتر و مدیران مجاز است.');
  const err = validateMeeting(v); if (err) return fail(err);
  if (!Array.isArray(v.invitees) || !v.invitees.every(p => posById(p))) return fail('مدعوین معتبر نیستند.');
  const m = { id: uid(), no: nextNo('meet'), title: v.title, date: v.date, start: v.start, end: v.end || '', place: v.place || '', invitees: v.invitees || [],
    agenda: v.agenda || '', minutes: '', minutesFiles: [], resolutions: [], kind: v.kind || 'جلسه', unitId: myUnit(), byPos: ME.pos.id, created: stamp() };
  hist(m, 'ثبت ' + m.kind);
  DB.meetings.push(m);
  audit('ثبت جلسه', 'meeting', m.id, m.no);
  notify(m.invitees, 'meeting', `دعوت به ${m.kind} «${m.title}» — ${jd(m.date)} ساعت ${fa(m.start)}`, 'calendar', m.no);
  return m;
}
const canEditMeeting = m => isImam() || m.byPos === ME.pos.id || (m.unitId === myUnit() && myRole() !== 'staff');
function addResolution(m, v) {
  if (!canEditMeeting(m)) return fail('ثبت مصوبه با برگزارکننده جلسه است.');
  if (!v.text || !v.owner) return fail('متن مصوبه و مسئول اجرا لازم است.');
  const x = { id: uid(), text: v.text, owner: v.owner, due: v.due || '', status: 'در حال پیگیری', log: [] };
  m.resolutions.push(x);
  hist(m, 'ثبت مصوبه', v.text.slice(0, 60) + ' — مسئول: ' + posWho(v.owner));
  audit('ثبت مصوبه', 'meeting', m.id, m.no);
  notify([v.owner], 'meeting', `مصوبه جلسه «${m.title}» به شما سپرده شد.`, 'calendar', m.no);
  return x;
}
function resolutionUpdate(m, x, status, note) {
  if (!(x.owner === ME.pos.id || canEditMeeting(m))) return fail('به‌روزرسانی مصوبه با مسئول اجرا یا برگزارکننده است.');
  x.status = status; x.log.push({ ts: stamp(), by: ME.user.id, note: note || '', status });
  hist(m, 'پیگیری مصوبه: ' + status, x.text.slice(0, 50) + (note ? ' — ' + note : ''));
  audit('پیگیری مصوبه', 'meeting', m.id, m.no);
  return x;
}

/* ---------- اموال و انبار ---------- */
const ASSET_HEALTH = ['سالم', 'نیازمند تعمیر', 'خراب', 'اسقاط'];
const MOVE_TYPES = ['ورود', 'خروج', 'امانت', 'عودت', 'جابه‌جایی'];
const canSeeAsset = a => isAll() || inUnit(a.unitId) || (inUnit(U_INTERNAL) && myRole() !== 'staff');
const canManageAsset = a => isImam() || isMgrOrOffice(a.unitId) || isMgrOrOffice(U_INTERNAL);
function createAsset(v) {
  const u = +v.unitId;
  if (!(isMgrOrOffice(u) || isClerk(U_INTERNAL))) return fail('ثبت اموال برای مسئولان همان واحد یا مدیریت داخلی مجاز است.');
  if (!v.name) return fail('نام کالا را بنویسید.');
  DB.seq['asset-' + u] = (DB.seq['asset-' + u] || 0) + 1;
  const a = { id: uid(), code: `AM-${pad(u)}-${pad(DB.seq['asset-' + u], 4)}`, name: v.name, cat: v.cat || '', unitId: u, whId: v.whId || '', health: v.health || 'سالم',
    location: v.location || '', serial: v.serial || '', specs: v.specs || '', value: +v.value || 0, holder: '', loaned: false, created: stamp() };
  hist(a, 'ثبت در فهرست اموال', a.code);
  DB.assets.push(a);
  audit('ثبت مال', 'asset', a.id, a.code);
  return a;
}
function createMovement(a, v) {
  if (!canSeeAsset(a) || !canManageAsset(a)) return fail('ثبت گردش این کالا برای جایگاه شما مجاز نیست.');
  if (!MOVE_TYPES.includes(v.type)) return fail('نوع عملیات را انتخاب کنید.');
  if (!v.type) return fail('نوع عملیات را انتخاب کنید.');
  if (v.type === 'جابه‌جایی' && !v.toWh) return fail('انبار مقصد را انتخاب کنید.');
  if (v.type === 'امانت' && !v.person) return fail('نام امانت‌گیرنده لازم است.');
  if (v.type === 'عودت' && !a.loaned) return fail('این کالا در امانت نیست.');
  if (a.health === 'اسقاط' && v.type !== 'خروج') return fail('کالای اسقاط فقط قابل خروج است.');
  const needs = ['خروج', 'امانت', 'جابه‌جایی'].includes(v.type);
  const m = { id: uid(), no: nextNo('mov'), assetId: a.id, type: v.type, toWh: v.toWh || '', person: v.person || '', date: v.date || todayISO(), note: v.note || '',
    status: needs ? 'در انتظار تأیید' : 'تأییدشده', byPos: ME.pos.id, created: stamp() };
  hist(m, 'ثبت ' + m.type, needs ? 'نیازمند تأیید مسئول مجاز' : '');
  DB.movements.push(m);
  audit('ثبت گردش کالا', 'movement', m.id, a.code + ' · ' + m.type);
  if (!needs) applyMovement(a, m);
  else notify([unitPos(a.unitId, 'manager').id, unitPos(U_INTERNAL, 'manager').id], 'request', `درخواست ${m.type} کالای ${a.code} (${a.name})`, 'assets', m.no);
  return m;
}
function applyMovement(a, m) {
  if (m.type === 'خروج') { a.location = 'خارج از مجتمع'; a.out = true; }
  if (m.type === 'امانت') { a.loaned = true; a.holder = m.person; }
  if (m.type === 'عودت') { a.loaned = false; a.holder = ''; }
  if (m.type === 'جابه‌جایی') a.whId = m.toWh;
  if (m.type === 'ورود') { a.out = false; }
  hist(a, m.type + (m.person ? ' — ' + m.person : '') + (m.toWh ? ' به ' + whName(m.toWh) : ''), m.note);
}
const whName = id => (DB.warehouses.find(w => w.id === id) || {}).name || '—';
const canApproveMove = a => isImam() || isMgr(a.unitId) || isMgr(U_INTERNAL);
function decideMovement(m, ok, note) {
  const a = DB.assets.find(x => x.id === m.assetId);
  if (!canApproveMove(a)) return fail('تأیید خروج و جابه‌جایی با مدیر واحد مالک یا مدیر داخلی است.');
  if (m.status !== 'در انتظار تأیید') return fail('این مورد قبلاً تعیین تکلیف شده است.');
  m.status = ok ? 'تأییدشده' : 'ردشده'; m.approver = ME.user.id;
  hist(m, ok ? 'تأیید' : 'رد', note);
  if (ok) applyMovement(a, m);
  audit(ok ? 'تأیید گردش کالا' : 'رد گردش کالا', 'movement', m.id, a.code);
  notify([m.byPos], 'decision', `${m.type} کالای ${a.code} ${ok ? 'تأیید' : 'رد'} شد.`, 'assets', m.no);
  return m;
}

/* ---------- امور مالی ---------- */
const TX_KINDS = ['درآمد', 'هزینه', 'نذورات'];
const PAY_ST = ['ثبت درخواست', 'تأیید مدیر واحد', 'بررسی امور مالی', 'تصویب امام جماعت', 'پرداخت'];
const payLabel = p => (p.status === 'ردشده' ? 'ردشده' : p.stage === 4 ? 'پرداخت‌شده' : 'در انتظار ' + PAY_ST[nextPayStage(p)]);
const nextPayStage = p => (p.stage === 2 && !p.needImam ? 4 : p.stage + 1);
const canSeePay = p => canFinance() || isAll() || (inUnit(p.unitId) && myRole() !== 'staff');
function addTx(v) {
  if (!(isImam() || isClerk(U_FIN))) return fail('ثبت سند مالی فقط در مدیریت امور مالی انجام می‌شود.');
  if (!v.kind || !(+v.amount > 0)) return fail('نوع و مبلغ معتبر لازم است.');
  const t = { id: uid(), no: nextNo('fin'), kind: v.kind, amount: +v.amount, unitId: v.unitId === '' ? null : +v.unitId, date: v.date || todayISO(), desc: v.desc || '', docNo: v.docNo || '', files: v.files || [], src: v.src || '', created: stamp(), by: ME ? ME.user.id : 'system' };
  DB.tx.push(t);
  audit('ثبت سند مالی', 'tx', t.id, t.no + ' · ' + t.kind);
  return t;
}
function createPay(v) {
  if (!can('finance.request')) return fail('درخواست پرداخت توسط مسئولان واحد ثبت می‌شود.');
  if (!v.title || !(+v.amount > 0)) return fail('عنوان و مبلغ معتبر لازم است.');
  const p = { id: uid(), no: nextNo('pay'), unitId: myUnit() === 0 ? U_FIN : myUnit(), title: v.title, amount: +v.amount, payee: v.payee || '', desc: v.desc || '', files: v.files || [],
    stage: 0, status: 'جاری', needImam: +v.amount > DB.settings.payThreshold, byPos: ME.pos.id, created: stamp() };
  hist(p, 'ثبت درخواست پرداخت', money(p.amount) + (p.needImam ? ' — بالاتر از سقف؛ نیازمند تصویب امام جماعت' : ''));
  DB.payreqs.push(p);
  audit('ثبت درخواست پرداخت', 'pay', p.id, p.no);
  notify([unitPos(p.unitId, 'manager').id], 'request', `درخواست پرداخت «${p.title}» منتظر تأیید شماست.`, 'finance', p.no);
  return p;
}
function payCanAct(p) {
  if (p.status !== 'جاری') return false;
  const s = nextPayStage(p);
  if (s === 1) return isMgr(p.unitId) && (inUnit(p.unitId) || isImam());
  if (s === 2) return inUnit(U_FIN) && ['manager', 'office'].includes(myRole());
  if (s === 3) return isImam();
  if (s === 4) return inUnit(U_FIN) && myRole() === 'manager';
  return false;
}
function payAct(p, ok, note, docNo) {
  if (!payCanAct(p)) return fail('این مرحله از تأیید با جایگاه شما نیست.');
  const s = nextPayStage(p);
  if (!ok) {
    if (!note) return fail('علت رد را بنویسید.');
    p.status = 'ردشده'; hist(p, 'رد در مرحله «' + PAY_ST[s] + '»', note);
    notify([p.byPos], 'decision', `درخواست پرداخت «${p.title}» رد شد.`, 'finance', p.no);
  } else {
    if (s === 4 && !docNo) return fail('شماره سند پرداخت را وارد کنید.');
    p.stage = s;
    hist(p, PAY_ST[s] + (s === 4 ? ' — سند ' + docNo : ''), note);
    if (s === 4) {
      p.status = 'پرداخت‌شده'; p.docNo = docNo;
      addTx({ kind: 'هزینه', amount: p.amount, unitId: p.unitId, desc: 'پرداخت: ' + p.title + (p.payee ? ' — ' + p.payee : ''), docNo, src: p.no });
      notify([p.byPos, unitPos(p.unitId, 'manager').id], 'decision', `درخواست پرداخت «${p.title}» پرداخت شد.`, 'finance', p.no);
    } else {
      const ns = nextPayStage(p);
      const who = ns === 2 ? unitHeads(U_FIN) : ns === 3 ? [imamPos()] : [unitPos(U_FIN, 'manager').id];
      notify(who, 'request', `درخواست پرداخت «${p.title}» در مرحله «${PAY_ST[ns]}» است.`, 'finance', p.no);
    }
  }
  audit('اقدام پرداخت', 'pay', p.id, p.no + ' · ' + (ok ? PAY_ST[s] : 'رد'));
  return p;
}
const unitSpent = (u, y = jYearNow()) => sum(DB.tx.filter(t => t.kind === 'هزینه' && t.unitId === u && isoToJ(t.date)[0] === y), t => t.amount);

/* ---------- منابع انسانی ---------- */
const LEAVE_TYPES = ['استحقاقی', 'استعلاجی', 'بدون حقوق', 'ساعتی'];
function createLeave(v) {
  if (!v.from || !v.to || v.to < v.from) return fail('بازه تاریخ مرخصی معتبر نیست.');
  const l = { id: uid(), no: nextNo('leave'), uid: ME.user.id, pos: ME.pos.id, unitId: myUnit(), type: v.type || 'استحقاقی', from: v.from, to: v.to, reason: v.reason || '',
    status: myRole() === 'imam' ? 'در انتظار ثبت امور اداری' : 'در انتظار تأیید مدیر', created: stamp() };
  hist(l, 'ثبت درخواست مرخصی', `${jd(l.from)} تا ${jd(l.to)}`);
  DB.leaves.push(l);
  audit('درخواست مرخصی', 'leave', l.id, l.no);
  const approver = myRole() === 'imam' ? unitHeads(U_ADMIN) : [myRole() === 'manager' ? imamPos() : unitPos(myUnit(), 'manager').id];
  notify(approver, 'request', `درخواست مرخصی ${ME.user.name}`, 'hr', l.no);
  return l;
}
function leaveCanAct(l) {
  if (l.status === 'در انتظار تأیید مدیر') {
    const p = posById(l.pos);
    return p.role === 'manager' ? isImam() : isMgr(l.unitId) && (inUnit(l.unitId) || isImam()) && l.uid !== ME.user.id;
  }
  if (l.status === 'در انتظار ثبت امور اداری') return inUnit(U_ADMIN) && ['manager', 'office'].includes(myRole());
  return false;
}
function leaveAct(l, ok, note) {
  if (!leaveCanAct(l)) return fail('تأیید این مرحله با جایگاه شما نیست.');
  if (!ok) { if (!note) return fail('علت رد را بنویسید.'); l.status = 'ردشده'; hist(l, 'رد', note); }
  else if (l.status === 'در انتظار تأیید مدیر') { l.status = 'در انتظار ثبت امور اداری'; hist(l, 'تأیید مدیر', note); notify(unitHeads(U_ADMIN), 'request', `مرخصی ${userById(l.uid).name} برای ثبت ارسال شد.`, 'hr', l.no); }
  else { l.status = 'تأییدشده'; hist(l, 'ثبت در امور اداری', note); }
  audit('اقدام مرخصی', 'leave', l.id, l.no + ' · ' + l.status);
  if (l.status === 'تأییدشده' || l.status === 'ردشده') notify([l.pos], 'decision', `درخواست مرخصی شما ${l.status} شد.`, 'hr', l.no);
  return l;
}
function addHR(kind, v) {
  if (!canHR()) return fail('ثبت سوابق اداری فقط برای مدیریت امور اداری مجاز است.');
  const rec = { id: uid(), ...v, created: stamp(), by: ME.user.id };
  DB[kind].push(rec);
  audit('ثبت سابقه اداری', kind, rec.id, v.title || v.dest || v.type || '');
  return rec;
}

/* ---------- کاربران و جایگاه‌ها ---------- */
function assignHolder(posId, userId) {
  if (!canAdminUsers()) return fail('مدیریت کاربران مجاز نیست.');
  const p = posById(posId); const u = userById(userId);
  if (!p || !u || u.deleted) return fail('جایگاه یا کاربر یافت نشد.');
  /* جلوگیری از ارتقای دسترسی: هیچ‌کس جایگاه خود یا جایگاه حساس را تغییر نمی‌دهد */
  if (u.id === ME.user.id) return fail('تغییر جایگاه سازمانی خودتان مجاز نیست؛ این کار با امام جماعت است.');
  if (posId === ME.pos.id) return fail('تغییر متصدی جایگاه خودتان مجاز نیست.');
  if (isSensitivePos(p) && !isImam()) return fail(`«${posLabel(p.id)}» جایگاه حساس است و انتصاب به آن فقط با امام جماعت است.`);
  if (u.posId && isSensitivePos(posById(u.posId)) && !isImam()) return fail('جابه‌جایی متصدی جایگاه حساس فقط با امام جماعت است.');
  const prev = holderOf(posId);
  if (prev && prev.id === u.id) return fail('این کاربر هم‌اکنون متصدی همین جایگاه است.');
  const old = DB.posHistory.find(h => h.posId === posId && !h.to);
  if (old) old.to = todayISO();
  if (prev) prev.posId = '';
  const oldOfUser = DB.posHistory.find(h => h.userId === u.id && !h.to);
  if (oldOfUser) oldOfUser.to = todayISO();
  u.posId = posId;
  DB.posHistory.push({ posId, userId: u.id, from: todayISO(), to: '' });
  audit('تغییر متصدی جایگاه', 'position', posId, `${posLabel(posId)}: ${prev ? prev.name : '—'} ← ${u.name}`);
  return p;
}
function createUser(v) {
  if (!canAdminUsers()) return fail('مدیریت کاربران مجاز نیست.');
  if (!v.name || !v.username) return fail('نام و نام کاربری لازم است.');
  if (DB.users.some(u => u.username === v.username)) return fail('این نام کاربری قبلاً ثبت شده است.');
  const u = { id: uid(), name: v.name, username: v.username, pass: pwHash(v.pass || genPass()), posId: '', active: true, phone: en(v.phone || ''), nid: v.nid || '', hired: v.hired || todayISO() };
  DB.users.push(u);
  audit('ایجاد کاربر', 'user', u.id, u.username);
  if (v.posId) assignHolder(v.posId, u.id);
  return u;
}
function addPosition(v) {
  if (!canAdminUsers()) return fail('مدیریت جایگاه‌ها مجاز نیست.');
  if (!v.title) return fail('عنوان جایگاه را بنویسید.');
  const u = +v.unitId;
  const n = DB.positions.filter(p => p.unitId === u && p.role === 'staff').length + 1;
  const p = { id: `P${u}-k${n}-${uid().slice(0, 3)}`, unitId: u, role: 'staff', title: v.title };
  DB.positions.push(p);
  audit('ایجاد جایگاه', 'position', p.id, posLabel(p.id));
  return p;
}

/* ---------- دفاتر اختصاصی واحدها ---------- */
function addRecord(unitId, key, v) {
  if (!isClerk(unitId) && !(inUnit(unitId))) return fail('ثبت در این دفتر برای کارکنان همین مدیریت مجاز است.');
  DB.registry[unitId] = DB.registry[unitId] || {};
  DB.registry[unitId][key] = DB.registry[unitId][key] || [];
  const rec = { id: uid(), ...v, created: stamp(), by: ME.user.id };
  DB.registry[unitId][key].push(rec);
  audit('ثبت در دفتر واحد', 'registry', rec.id, unitShort(unitId) + ' · ' + key);
  return rec;
}
const reg = (u, k) => ((DB.registry[u] || {})[k] || []);

/* =====================================================================
   ساختار پایه (برای نسخه عملیاتی، بدون هیچ داده نمونه) و داده‌های نمونه نسخه نمایشی
   ===================================================================== */
function baseDB() {
  const D = {
    ver: 1, seq: {}, positions: [], users: [], posHistory: [], letters: [], orders: [], tasks: [], requests: [], reservations: [], meetings: [],
    warehouses: [], assets: [], movements: [], tx: [], payreqs: [], budgets: [], commitments: [], decrees: [], leaves: [], missions: [], contracts: [],
    registry: {}, notifs: [], sms: [], audit: [], flags: {},
    settings: {
      orgName: 'مجتمع مسجدمحور شباب اهل‌الجنه', payThreshold: 500000000,
      sms: { enabled: false, provider: 'none', sender: '', apiKey: '', webhook: '', events: { request: true, letter: true, order: true, decision: true, due: true, overdue: true, meeting: true, reservation: true }, roles: ['imam', 'manager', 'office'] },
      backups: []
    }
  };
  migrate(D);
  D.positions.push({ id: 'P0', unitId: 0, role: 'imam', title: 'امام جماعت' });
  UNITS.forEach(u => {
    D.positions.push({ id: `P${u.id}-m`, unitId: u.id, role: 'manager', title: 'مدیر' });
    D.positions.push({ id: `P${u.id}-o`, unitId: u.id, role: 'office', title: 'مسئول دفتر' });
    D.positions.push({ id: `P${u.id}-s`, unitId: u.id, role: 'secretary', title: 'منشی' });
  });
  UNITS.forEach(u => D.budgets.push({ unitId: u.id, year: jYearNow(), amount: 0 }));
  return D;
}
function seed() {
  const T = todayISO();
  const D = baseDB();
  D.budgets = [];
  D.settings.sms.enabled = true; /* نسخه نمایشی: پیامک‌ها فقط در صف نمایش داده می‌شوند */
  DB = D;
  const prevME = ME;
  const at = (off, hm = '10:00') => { SEED_TS = new Date(addDays(T, off) + 'T' + hm + ':00+03:30').toISOString(); };
  const as = pid => { ME = { user: D.users.find(u => u.posId === pid), pos: D.positions.find(p => p.id === pid) }; };

  /* جایگاه‌های کارشناسی نمونه */
  [[1, 'کارشناس تأسیسات'], [1, 'انباردار مرکزی'], [4, 'عکاس و تصویربردار'], [16, 'کارشناس شبکه'], [17, 'ناظر فنی']].forEach(([u, t], i) =>
    D.positions.push({ id: `P${u}-k${i + 1}`, unitId: u, role: 'staff', title: t }));

  /* کاربران نمونه (رمز همه: ۱۲۳۴) */
  const FN = ['علی', 'محمدرضا', 'حسین', 'مهدی', 'سعید', 'جواد', 'امیرحسین', 'حمید', 'مصطفی', 'محسن', 'یاسر', 'زهرا', 'فاطمه', 'مریم', 'معصومه', 'سمیه', 'نرگس', 'الهام', 'زینب', 'رضا', 'مجتبی', 'ابوالفضل', 'صادق', 'هادی', 'طاهره', 'سارا'];
  const LN = ['کریمی', 'حسینی', 'رحیمی', 'موسوی', 'جعفری', 'صادقی', 'نوری', 'احمدی', 'رضایی', 'کاظمی', 'باقری', 'اکبری', 'قاسمی', 'شریفی', 'عباسی', 'یوسفی', 'نجفی', 'طاهری', 'سلیمانی', 'مرادی', 'فلاحی', 'امینی', 'زارعی', 'حیدری', 'میرزایی'];
  let k = 0;
  const mk = (pid, name, user) => {
    const u = { id: 'u' + (D.users.length + 1), name, username: user, pass: pwHash('1234'), posId: pid, active: true, phone: '0912' + pad(1000000 + D.users.length * 7919 % 8999999, 7).slice(-7), nid: '', hired: addDays(T, -400 - D.users.length * 11) };
    D.users.push(u); D.posHistory.push({ posId: pid, userId: u.id, from: u.hired, to: '' });
  };
  mk('P0', 'حجت‌الاسلام سید محمد هاشمی', 'imam');
  UNITS.forEach(u => {
    ['m', 'o', 's'].forEach(r => { mk(`P${u.id}-${r}`, `${FN[(k * 7 + 3) % FN.length]} ${LN[(k * 5 + 1) % LN.length]}`, r + u.id); k++; });
  });
  D.positions.filter(p => p.role === 'staff').forEach(p => { mk(p.id, `${FN[(k * 7 + 3) % FN.length]} ${LN[(k * 5 + 1) % LN.length]}`, 'k' + p.unitId + '-' + p.id.split('-k')[1]); k++; });
  /* نمونه تغییر متصدی: سوابق جایگاه پس از تغییر فرد حفظ می‌شود */
  const former = { id: 'u0', name: 'غلامرضا فرهادی', username: 'former4', pass: pwHash('1234'), posId: '', active: false, phone: '', hired: addDays(T, -1200) };
  D.users.push(former);
  D.posHistory.unshift({ posId: 'P4-m', userId: 'u0', from: addDays(T, -1200), to: addDays(T, -420) });

  /* انبارها */
  D.warehouses.push({ id: 'w1', name: 'انبار مرکزی', unitId: 1 }, { id: 'w2', name: 'انبار تجهیزات صوت و تصویر', unitId: 4 }, { id: 'w3', name: 'انبار آشپزخانه', unitId: 1 }, { id: 'w4', name: 'انبار کالای خیریه', unitId: 12 }, { id: 'w5', name: 'انبار تجهیزات پزشکی', unitId: 9 });

  /* بودجه سالانه */
  const y = jYearNow();
  const B = [42, 65, 18, 22, 12, 30, 28, 26, 34, 20, 9, 40, 11, 14, 8, 16, 120];
  UNITS.forEach((u, i) => D.budgets.push({ unitId: u.id, year: y, amount: B[i] * 100000000 }));

  /* نامه‌ها */
  as('P1-s'); at(-12, '09:10');
  const L1 = createLetter({ type: 'in', subject: 'اعلام قطعی برنامه‌ریزی‌شده آب در محدوده مجتمع', cat: 'خدماتی', sender: 'شرکت آب و فاضلاب منطقه', receiver: 'مدیریت داخلی مجتمع', unitId: 1, priority: 'فوری', date: addDays(T, -12), body: 'به اطلاع می‌رساند به دلیل تعویض خط انتقال، آب محدوده در تاریخ اعلام‌شده از ساعت ۸ تا ۱۴ قطع خواهد بود.', needReply: false });
  as('P1-o'); at(-12, '11:00'); referLetter(L1, 2, 'جهت هماهنگی برنامه نماز و وضوخانه');
  as('P2-s'); at(-9, '10:00');
  createLetter({ type: 'out', subject: 'دعوت از سخنران مراسم دهه فاطمیه', cat: 'فرهنگی', sender: 'مدیریت امور فرهنگی و مراسمات مسجد', receiver: 'دفتر حجت‌الاسلام والمسلمین رضوانی', unitId: 2, date: addDays(T, -9), signer: 'P2-m',
    body: 'سلام علیکم\nبا احترام، به استحضار می‌رساند مراسم دهه فاطمیه در حسینیه مجتمع برگزار می‌شود. خواهشمند است در صورت امکان، سخنرانی شب‌های دوم تا پنجم را بپذیرید.\nپیشاپیش از حسن همکاری سپاسگزاریم.' });
  as('P15-s'); at(-7, '08:40');
  const L3 = createLetter({ type: 'in', subject: 'اعلام مانده حساب نذورات ماه گذشته', cat: 'مالی', sender: 'بانک قرض‌الحسنه', receiver: 'مدیریت امور مالی', unitId: 15, conf: 'محرمانه', date: addDays(T, -7), body: 'صورت‌حساب ماه گذشته پیوست است.', needReply: true });
  as('P15-m'); at(-6, '12:00'); referLetter(L3, 0, 'جهت استحضار');
  as('P6-s'); at(-5, '09:30');
  createLetter({ type: 'in', subject: 'بخشنامه برنامه‌های هفته کتاب و کتابخوانی', cat: 'آموزشی', sender: 'اداره آموزش و پرورش ناحیه', receiver: 'مدیریت دبستان', unitId: 6, date: addDays(T, -5), needReply: true, body: 'مقتضی است برنامه‌های مدرسه در هفته کتاب تا پایان هفته اعلام شود.' });
  as('P17-s'); at(-4, '10:20');
  const L5 = createLetter({ type: 'in', subject: 'صورت‌وضعیت شماره ۳ پیمانکار سالن چندمنظوره', cat: 'عمرانی', sender: 'شرکت ساختمانی بنای نو', receiver: 'مدیریت عمران و توسعه', unitId: 17, priority: 'فوری', date: addDays(T, -4), needReply: true, body: 'صورت‌وضعیت کارکرد ماه جاری جهت بررسی و پرداخت ارسال می‌گردد.' });
  as('P17-m'); at(-4, '13:00'); referLetter(L5, 15, 'جهت بررسی و پرداخت پس از تأیید ناظر');
  as('P3-s'); at(-3, '11:15');
  createLetter({ type: 'internal', subject: 'هماهنگی پوشش خبری همایش خانواده', cat: 'فرهنگی', sender: 'مدیریت روابط عمومی', receiver: 'مدیریت رسانه', unitId: 3, toUnit: 4, date: addDays(T, -3), body: 'خواهشمند است برای پوشش تصویری همایش خانواده در سالن آمفی‌تئاتر هماهنگی لازم انجام شود.' });
  as('P9-s'); at(-2, '09:00');
  createLetter({ type: 'in', subject: 'ابلاغ ضوابط ایمنی تجهیزات پزشکی', cat: 'اداری', sender: 'شبکه بهداشت و درمان', receiver: 'مدیریت درمانگاه', unitId: 9, conf: 'محرمانه', date: addDays(T, -2), body: 'ضوابط جدید جهت اجرا ابلاغ می‌گردد.' });
  as('P12-s'); at(-1, '10:00');
  createLetter({ type: 'in', subject: 'اعلام آمادگی خیّر برای تأمین سبد غذایی', cat: 'سایر', sender: 'یکی از خیرین محله', receiver: 'مدیریت خیریه', unitId: 12, conf: 'سری', date: addDays(T, -1), body: 'اعلام آمادگی برای تأمین ۸۰ سبد غذایی.', needReply: true });
  as('P14-s'); at(0, '08:30');
  createLetter({ type: 'out', subject: 'ابلاغ ساعت کاری زمستانی مجتمع', cat: 'اداری', sender: 'مدیریت امور اداری', receiver: 'کلیه مدیریت‌ها', unitId: 14, date: T, signer: 'P14-m', body: 'بدین‌وسیله ساعت کاری زمستانی مجتمع از ابتدای آذرماه از ساعت ۷:۳۰ تا ۱۴:۳۰ ابلاغ می‌گردد.' });

  /* دستورات امام جماعت */
  as('P0'); at(-14, '18:00');
  const O1 = createOrder({ title: 'برگزاری مراسم دهه فاطمیه با محوریت خانواده', desc: 'برنامه ده‌شبه شامل سخنرانی، مداحی، پذیرایی و ویژه‌برنامه کودک و نوجوان تدوین و اجرا شود. گزارش نهایی با آمار حضور ارائه گردد.', units: [2, 1, 4], respPos: 'P2-m', priority: 'فوری', issued: addDays(T, -14), due: addDays(T, 9), needReport: true });
  at(-20, '17:00');
  const O2 = createOrder({ title: 'تکمیل مستندسازی اموال مجتمع و الصاق برچسب کد', desc: 'تمامی اموال کدگذاری و برچسب QR الصاق شود.', units: [1], respPos: 'P1-o', priority: 'عادی', issued: addDays(T, -20), due: addDays(T, -2), needReport: true });
  at(-30, '19:00');
  const O3 = createOrder({ title: 'راه‌اندازی سامانه نوبت‌دهی اینترنتی درمانگاه', desc: 'با همکاری فناوری اطلاعات طراحی و اجرا شود.', units: [9, 16], respPos: 'P16-m', priority: 'عادی', issued: addDays(T, -30), due: addDays(T, 15), needReport: false });
  at(-25, '20:00');
  const O4 = createOrder({ title: 'گزارش پیشرفت سالن چندمنظوره', desc: 'گزارش مصور پیشرفت فیزیکی و مالی پروژه ارائه شود.', units: [17], respPos: 'P17-m', priority: 'خیلی فوری', issued: addDays(T, -25), due: addDays(T, -5), needReport: true });
  at(-3, '21:00');
  createOrder({ title: 'ساماندهی طرح اکرام ایتام در آستانه زمستان', desc: 'شناسایی خانواده‌ها و تأمین پوشاک زمستانی با حفظ کامل محرمانگی.', units: [12], respPos: 'P12-m', priority: 'فوری', issued: addDays(T, -3), due: addDays(T, 20), needReport: true });
  as('P2-o'); at(-10, '10:00'); orderReport(O1, { status: 'در حال انجام', progress: 45, note: 'سخنرانان شب‌های اول تا پنجم قطعی شدند؛ هماهنگی پذیرایی با مدیریت داخلی انجام شد.' });
  as('P1-o'); at(-8); orderReport(O2, { status: 'در حال انجام', progress: 70, note: 'اموال طبقه همکف و حسینیه برچسب‌گذاری شد.' });
  as('P16-m'); at(-6); orderReport(O3, { status: 'در حال انجام', progress: 35, note: 'نیازسنجی با درمانگاه انجام و نسخه آزمایشی آماده شد.' });
  as('P17-o'); at(-6); orderReport(O4, { status: 'منتظر تأیید', progress: 100, note: 'گزارش مصور پیشرفت ۶۲٪ فیزیکی و ۵۸٪ مالی پیوست شد.' });

  /* وظایف */
  const tasks = [
    [1, 'P1-k1', 'سرویس دوره‌ای موتورخانه و دیگ‌های بخار', -10, -1, 'فوری', 'در حال انجام'],
    [1, 'P1-k2', 'انبارگردانی فصلی انبار مرکزی', -6, 4, 'عادی', 'جدید'],
    [1, 'P1-o', 'هماهنگی پذیرایی مراسم دهه فاطمیه', -9, 8, 'فوری', 'در حال انجام'],
    [1, 'P1-s', 'تنظیم برنامه نظافت محوطه', -15, -6, 'عادی', 'تکمیل‌شده'],
    [2, 'P2-o', 'تدوین برنامه شب‌های دهه فاطمیه', -12, 1, 'خیلی فوری', 'منتظر تأیید'],
    [2, 'P2-s', 'ثبت‌نام کاروان راهیان نور', -8, 12, 'عادی', 'در حال انجام'],
    [3, 'P3-o', 'تهیه فهرست مهمانان همایش خانواده', -5, 2, 'فوری', 'در حال انجام'],
    [3, 'P3-s', 'به‌روزرسانی تابلو اعلانات', -20, -12, 'عادی', 'تکمیل‌شده'],
    [4, 'P4-k3', 'تدوین کلیپ گزارش اردوی زیارتی', -7, -2, 'عادی', 'در حال انجام'],
    [4, 'P4-o', 'طراحی پوستر مراسم دهه فاطمیه', -6, 1, 'فوری', 'تکمیل‌شده'],
    [5, 'P5-o', 'تنظیم جدول شیفت شب آذرماه', -4, 3, 'عادی', 'جدید'],
    [6, 'P6-o', 'برنامه‌ریزی هفته کتاب دبستان', -5, 6, 'عادی', 'در حال انجام'],
    [7, 'P7-o', 'برگزاری جلسه اولیای پایه نهم', -18, -9, 'عادی', 'تکمیل‌شده'],
    [8, 'P8-o', 'تهیه برنامه مشاوره انتخاب رشته', -10, -3, 'فوری', 'در حال انجام'],
    [9, 'P9-o', 'سرویس دستگاه‌های الکتروکاردیوگرافی', -9, -1, 'فوری', 'جدید'],
    [10, 'P10-o', 'سفارش اقلام دارویی با موجودی کم', -3, 2, 'خیلی فوری', 'در حال انجام'],
    [11, 'P11-o', 'وجین و ساماندهی قفسه‌های مرجع', -25, -10, 'عادی', 'تکمیل‌شده'],
    [12, 'P12-o', 'شناسایی خانواده‌های نیازمند پوشاک زمستانی', -3, 14, 'فوری', 'در حال انجام'],
    [13, 'P13-o', 'بازبینی ایمنی وسایل بازی', -11, -4, 'خیلی فوری', 'تکمیل‌شده'],
    [14, 'P14-o', 'تمدید قراردادهای کارکنان خدمات', -8, 5, 'فوری', 'در حال انجام'],
    [15, 'P15-o', 'تهیه گزارش مالی ماه گذشته', -6, -1, 'فوری', 'منتظر تأیید'],
    [16, 'P16-k4', 'پشتیبان‌گیری کامل از سرورها', -2, 0, 'فوری', 'در حال انجام'],
    [16, 'P16-o', 'تعریف کاربران جدید سامانه', -14, -8, 'عادی', 'تکمیل‌شده'],
    [17, 'P17-k5', 'بازدید فنی سقف سالن چندمنظوره', -5, -1, 'خیلی فوری', 'در حال انجام']
  ];
  tasks.forEach(([u, ass, title, s, d, pr, st]) => {
    as(`P${u}-m`); at(s, '09:00');
    const t = createTask({ unitId: u, title, assignee: ass, start: addDays(T, s), due: addDays(T, d), priority: pr, desc: '' });
    const steps = { 'در حال انجام': ['start'], 'منتظر تأیید': ['start', 'submit'], 'تکمیل‌شده': ['start', 'submit', 'approve'] }[st] || [];
    steps.forEach((a, i) => { as(a === 'approve' ? `P${u}-m` : ass); at(s + i + 1, '11:30'); if (a === 'approve' && ass === `P${u}-m`) as(`P${u}-o`); taskAct(t, a, a === 'submit' ? 'انجام شد؛ گزارش پیوست است.' : ''); });
  });

  /* درخواست‌های داخلی */
  const reqs = [
    [3, 4, 'پوشش تصویری همایش خانواده', 'پوشش مراسم', -3, 2, false],
    [2, 1, 'تأمین پذیرایی ۱۰ شب دهه فاطمیه', 'پذیرایی', -11, 4, false],
    [6, 16, 'راه‌اندازی رایانه‌های کارگاه رایانه دبستان', 'پشتیبانی رایانه', -9, 5, false],
    [12, 15, 'تخصیص اعتبار طرح پوشاک زمستانی', 'تخصیص بودجه', -2, 3, true],
    [9, 1, 'تعمیر سیستم سرمایش اتاق تزریقات', 'تعمیرات و نگهداری', -6, 4, false],
    [5, 2, 'هماهنگی برنامه شب شهدا در حسینیه', 'مراسم مذهبی', -15, 6, false],
    [13, 4, 'طراحی پوستر جشن تکلیف کودکان', 'طراحی پوستر', -1, 1, false],
    [11, 3, 'اطلاع‌رسانی مسابقه کتابخوانی', 'اطلاع‌رسانی عمومی', -4, 3, false]
  ];
  reqs.forEach(([from, to, title, cat, s, steps, imam]) => {
    as(`P${from}-s`); at(s, '09:20');
    const r = createRequest({ title, toUnit: to, cat, desc: 'جزئیات در پیوست و هماهنگی تلفنی.', priority: steps > 4 ? 'عادی' : 'فوری', needsImam: imam, due: addDays(T, s + 10) });
    const seq = ['review', 'send', 'approve', 'exec', 'final'];
    for (let i = 0; i < Math.min(steps, 5); i++) {
      const a = seq[i];
      as(a === 'approve' ? (imam ? 'P0' : `P${to}-m`) : `P${to}-o`); at(s + i + 1, '12:00');
      if (a === 'review' && to === 1 && from === 2) { reqAct(r, 'review', ''); as(`P${to}-o`); reqAct(r, 'coop', 'تأمین ظروف یک‌بار مصرف و هماهنگی بودجه', 15); as('P15-o'); reqAct(r, 'coopnote', 'اعتبار پذیرایی از بودجه مراسمات قابل تأمین است.'); continue; }
      reqAct(r, a, a === 'exec' ? 'اقدام انجام شد.' : a === 'final' ? 'درخواست به‌طور کامل انجام شد و گزارش به درخواست‌کننده ارسال شد.' : '');
    }
  });

  /* رزروها */
  const res = [
    ['religious', 'hosseinieh', 'هیئت محبان الزهرا', 'مراسم عزاداری', 2, '19:00', '22:30', 450, 'approve'],
    ['general', 'amphi', 'مدیریت روابط عمومی', 'همایش خانواده', 3, '16:00', '19:00', 140, 'approve'],
    ['general', 'meeting', 'مدیریت عمران و توسعه', 'جلسه پیمانکاران', 1, '10:00', '12:00', 14, 'approve'],
    ['fateheh', 'hosseinieh', 'خانواده مرحوم حاج حسن کریمی', 'مراسم ترحیم', 0, '14:00', '16:00', 250, 'approve'],
    ['general', 'cinema', 'پایگاه بسیج', 'اکران فیلم دفاع مقدس', 5, '18:00', '20:30', 55, 'pending'],
    ['lodging', 'zaersara', 'کاروان زائران مشهد', 'اسکان زائرین', 7, '14:00', '23:59', 32, 'pending'],
    ['general', 'farhangsara', 'کتابخانه مجتمع', 'نشست کتابخوانی', 4, '17:00', '19:00', 40, 'approve'],
    ['general', 'amphi', 'متوسطه دوم', 'جشن فارغ‌التحصیلی', 3, '17:30', '20:00', 130, 'pending'],
    ['religious', 'hosseinieh', 'مدیریت امور فرهنگی', 'مراسم دهه فاطمیه — شب اول', 9, '19:00', '22:30', 550, 'approve'],
    ['rahian', '', 'مدیریت امور فرهنگی', 'کاروان راهیان نور دانش‌آموزی', 20, '06:00', '22:00', 110, 'pending']
  ];
  res.forEach(([prog, sp, ap, kind, d, s, e, n, st]) => {
    as('P3-s'); at(d - 3, '10:00');
    const r = createReservation({ program: prog, space: sp, applicant: ap, phone: '09121234567', kind, date: addDays(T, d), start: s, end: e, people: n, equip: 'صوت، پروژکتور', desc: '' });
    if (r.error) throw new Error('seed reservation: ' + r.error);
    if (st === 'approve') { as(`P${resUnit(r)}-m`); at(d - 2, '12:00'); resDecide(r, 'تأییدشده', ''); }
  });

  /* جلسات */
  as('P0'); at(-6, '09:00');
  const M1 = createMeeting({ title: 'جلسه هماهنگی ماهانه مدیران', date: addDays(T, -5), start: '09:00', end: '11:00', place: 'سالن جلسات', invitees: UNITS.map(u => `P${u.id}-m`), agenda: '۱. گزارش عملکرد ماهانه مدیریت‌ها\n۲. برنامه دهه فاطمیه\n۳. پیشرفت پروژه سالن چندمنظوره' });
  M1.minutes = 'جلسه با حضور ۱۵ مدیر برگزار شد. گزارش‌ها ارائه و مصوبات زیر تعیین شد.';
  at(-5, '11:30');
  addResolution(M1, { text: 'تهیه برنامه مشترک ویژه‌برنامه کودک دهه فاطمیه', owner: 'P13-m', due: addDays(T, 3) });
  addResolution(M1, { text: 'ارائه گزارش مالی پروژه سالن چندمنظوره تا پایان هفته', owner: 'P15-m', due: addDays(T, -1) });
  addResolution(M1, { text: 'تهیه دستورالعمل استفاده از سالن آمفی‌تئاتر', owner: 'P3-m', due: addDays(T, 10) });
  as('P15-m'); at(-2); resolutionUpdate(M1, M1.resolutions[1], 'انجام‌شده', 'گزارش ارسال شد.');
  as('P2-s'); at(-2);
  createMeeting({ title: 'جلسه ستاد برگزاری دهه فاطمیه', date: T, start: '17:00', end: '18:30', place: 'دفتر مدیریت فرهنگی', invitees: ['P0', 'P2-m', 'P1-m', 'P4-m', 'P3-m'], agenda: 'نهایی‌سازی برنامه شب‌ها و تقسیم کار' });
  as('P17-s'); at(-1);
  createMeeting({ title: 'جلسه پیشرفت پروژه با پیمانکار', date: addDays(T, 1), start: '10:00', end: '12:00', place: 'سالن جلسات', invitees: ['P17-m', 'P17-k5', 'P15-o'], agenda: 'بررسی صورت‌وضعیت شماره ۳' });
  as('P0'); at(-1);
  createMeeting({ kind: 'ملاقات', title: 'ملاقات با نماینده شورای محله', date: addDays(T, 2), start: '11:00', end: '12:00', place: 'دفتر امام جماعت', invitees: ['P3-m'], agenda: 'طرح‌های مشترک محله' });
  as('P6-s'); at(0);
  createMeeting({ title: 'شورای مدرسه دبستان', date: addDays(T, 3), start: '13:00', end: '14:00', place: 'دفتر دبستان', invitees: ['P6-m', 'P6-o'], agenda: 'برنامه هفته کتاب' });

  /* اموال */
  const assets = [
    [4, 'w2', 'دوربین فیلم‌برداری سونی FX6', 'تجهیزات تصویری', 'سالم', 1850000000],
    [4, 'w2', 'میکسر صوتی ۱۶ کانال', 'تجهیزات صوتی', 'سالم', 420000000],
    [4, 'w2', 'پروژکتور ۶۰۰۰ لومن', 'تجهیزات تصویری', 'نیازمند تعمیر', 380000000],
    [1, 'w1', 'فرش دستباف حسینیه (۱۲ متری)', 'فرش و موکت', 'سالم', 650000000],
    [1, 'w1', 'صندلی تاشو (بسته ۵۰ عددی)', 'مبلمان', 'سالم', 120000000],
    [1, 'w3', 'دیگ پخت صنعتی ۱۵۰ لیتری', 'آشپزخانه', 'سالم', 95000000],
    [1, 'w3', 'یخچال صنعتی چهار درب', 'آشپزخانه', 'نیازمند تعمیر', 210000000],
    [1, 'w1', 'ژنراتور برق اضطراری ۳۰ کیلووات', 'تأسیسات', 'سالم', 980000000],
    [9, 'w5', 'دستگاه الکتروکاردیوگرافی', 'تجهیزات پزشکی', 'نیازمند تعمیر', 540000000],
    [9, 'w5', 'یخچال نگهداری واکسن', 'تجهیزات پزشکی', 'سالم', 260000000],
    [16, 'w1', 'سرور اصلی Dell R740', 'شبکه و رایانه', 'سالم', 1250000000],
    [16, 'w1', 'سوییچ شبکه ۴۸ پورت', 'شبکه و رایانه', 'سالم', 190000000],
    [12, 'w4', 'پتو زمستانی (۱۰۰ عدد)', 'اقلام خیریه', 'سالم', 150000000],
    [11, 'w1', 'قفسه کتاب فلزی', 'مبلمان', 'سالم', 45000000],
    [13, 'w1', 'سرسره پلاستیکی کودک', 'وسایل بازی', 'خراب', 38000000]
  ];
  as('P1-o'); at(-40);
  assets.forEach(([u, w, n, c, h, val], i) => createAsset({ unitId: u, whId: w, name: n, cat: c, health: h, value: val, location: whNameD(D, w), serial: 'SN' + (48210 + i * 37), specs: '' }));
  as('P4-o'); at(-3); const mv1 = createMovement(D.assets[0], { type: 'امانت', person: 'مدیریت روابط عمومی — همایش', date: addDays(T, 3), note: 'برای پوشش همایش خانواده' });
  as('P4-m'); at(-2); decideMovement(mv1, true, '');
  as('P1-o'); at(-1); createMovement(D.assets[4], { type: 'جابه‌جایی', toWh: 'w3', date: T, note: 'برای پذیرایی دهه فاطمیه' });
  as('P13-o'); at(0); createMovement(D.assets[14], { type: 'خروج', date: T, note: 'تحویل جهت اسقاط' });

  /* امور مالی */
  as('P15-o');
  const tx = [['نذورات', 185000000, null, -20, 'نذورات صندوق حسینیه'], ['نذورات', 92000000, 2, -12, 'نذر پذیرایی دهه فاطمیه'], ['درآمد', 340000000, 6, -18, 'شهریه نوبت دوم دبستان'],
    ['درآمد', 120000000, 9, -10, 'درآمد خدمات درمانگاه'], ['درآمد', 76000000, 10, -8, 'فروش داروخانه (خلاصه هفتگی)'], ['هزینه', 145000000, 1, -15, 'خرید مواد شوینده و بهداشتی'],
    ['هزینه', 88000000, 4, -11, 'خرید حافظه و باتری دوربین'], ['هزینه', 1650000000, 17, -9, 'پرداخت صورت‌وضعیت شماره ۲'], ['هزینه', 230000000, 2, -6, 'هزینه پذیرایی مراسم ماه صفر'],
    ['هزینه', 64000000, 16, -5, 'تمدید اشتراک اینترنت'], ['نذورات', 410000000, 12, -4, 'کمک‌های نقدی خیرین (تجمیعی)'], ['هزینه', 51000000, 13, -3, 'خرید وسایل بازی آموزشی'], ['درآمد', 58000000, 3, -2, 'اجاره سالن آمفی‌تئاتر']];
  tx.forEach(([kd, a, u, d, ds]) => { at(d); const t = addTx({ kind: kd, amount: a, unitId: u == null ? '' : u, date: addDays(T, d), desc: ds, docNo: 'س-' + (1200 + D.tx.length) }); });
  const pays = [[17, 'صورت‌وضعیت شماره ۳ سالن چندمنظوره', 1420000000, 'شرکت ساختمانی بنای نو', 2], [2, 'خرید پرچم و پارچه مشکی حسینیه', 86000000, 'فروشگاه نساجی امید', 2], [1, 'تعمیر یخچال صنعتی آشپزخانه', 42000000, 'خدمات فنی سرما', 1],
    [4, 'خرید لامپ پروژکتور', 35000000, 'فروشگاه تجهیزات تصویر', 4], [12, 'خرید ۸۰ سبد غذایی', 640000000, 'فروشگاه زنجیره‌ای محله', 0], [16, 'خرید هارد پشتیبان', 48000000, 'رایانه پارس', 1]];
  pays.forEach(([u, t, a, payee, steps]) => {
    as(`P${u}-o`); at(-6);
    const p = createPay({ title: t, amount: a, payee, desc: '' });
    for (let i = 0; i < steps; i++) {
      const s = nextPayStage(p);
      as(s === 1 ? `P${u}-m` : s === 2 ? 'P15-o' : s === 3 ? 'P0' : 'P15-m'); at(-5 + i);
      payAct(p, true, '', s === 4 ? 'س-پ-' + (300 + i) : '');
    }
  });
  D.commitments.push({ id: uid(), title: 'قرارداد پیمانکار سالن چندمنظوره', unitId: 17, amount: 12500000000, due: addDays(T, 120), status: 'جاری' },
    { id: uid(), title: 'قرارداد خدمات نظافت', unitId: 1, amount: 960000000, due: addDays(T, 60), status: 'جاری' },
    { id: uid(), title: 'اجاره اتوبوس اردوی راهیان نور', unitId: 2, amount: 380000000, due: addDays(T, 40), status: 'جاری' });

  /* منابع انسانی */
  as('P14-o'); at(-30);
  addHR('decrees', { uid: D.users.find(u => u.posId === 'P5-m').id, pos: 'P5-m', title: 'حکم انتصاب مدیر پایگاه بسیج', no: 'ح/' + fa(y) + '/۰۴۱', date: addDays(T, -30) });
  addHR('decrees', { uid: D.users.find(u => u.posId === 'P4-m').id, pos: 'P4-m', title: 'حکم انتصاب مدیر رسانه', no: 'ح/' + fa(y) + '/۰۱۲', date: addDays(T, -420) });
  addHR('contracts', { uid: D.users.find(u => u.posId === 'P1-k1').id, type: 'قرارداد کار معین', from: addDays(T, -300), to: addDays(T, 65), title: 'کارشناس تأسیسات' });
  addHR('contracts', { uid: D.users.find(u => u.posId === 'P1-k2').id, type: 'قرارداد کار معین', from: addDays(T, -200), to: addDays(T, 165), title: 'انباردار' });
  addHR('missions', { uid: D.users.find(u => u.posId === 'P2-m').id, dest: 'قم', from: addDays(T, 6), to: addDays(T, 7), title: 'هماهنگی سخنرانان', status: 'تأییدشده' });
  as('P4-k3'); at(-2); const lv1 = createLeave({ type: 'استحقاقی', from: addDays(T, 4), to: addDays(T, 5), reason: 'امور شخصی' });
  as('P10-o'); at(-4); const lv2 = createLeave({ type: 'استعلاجی', from: addDays(T, -3), to: addDays(T, -2), reason: 'بیماری' });
  as('P10-m'); at(-3); leaveAct(lv2, true, '');
  as('P16-k4'); at(-1); createLeave({ type: 'ساعتی', from: addDays(T, 1), to: addDays(T, 1), reason: 'مراجعه به بانک' });

  /* دفاتر اختصاصی */
  const R = (u, key, rows) => { as(`P${u}-s`); at(-3); rows.forEach(r => addRecord(u, key, r)); };
  R(4, 'media', [{ title: 'عکس‌های اردوی زیارتی مشهد', kind: 'عکس', date: addDays(T, -9), event: 'اردوی زیارتی', place: 'NAS/1405/ziarat' }, { title: 'فیلم کامل سخنرانی شب قدر', kind: 'فیلم', date: addDays(T, -60), event: 'لیالی قدر', place: 'NAS/1405/qadr' }]);
  R(5, 'guard', [{ date: T, person: 'محمد نوری', shift: '۲۰ تا ۲۴', post: 'درب اصلی', note: '' }, { date: T, person: 'علی رحیمی', shift: '۲۴ تا ۴', post: 'پارکینگ', note: '' }, { date: addDays(T, -1), person: 'حسین جعفری', shift: '۴ تا ۸', post: 'درب اصلی', note: 'بدون مورد خاص' }]);
  R(5, 'prog', [{ title: 'اردوی جهادی روستای کهنک', kind: 'جهادی', date: addDays(T, -15), count: 34, note: '' }]);
  R(6, 'edu', [{ title: 'جلسه اولیای پایه اول', grade: 'اول', kind: 'جلسه اولیا', date: addDays(T, -7), note: 'حضور ۸۵٪ اولیا' }]);
  R(7, 'edu', [{ title: 'المپیاد ریاضی درون‌مدرسه‌ای', grade: 'هشتم', kind: 'آموزشی', date: addDays(T, -4), note: '' }]);
  R(8, 'edu', [{ title: 'کارگاه مدیریت زمان کنکور', grade: 'دوازدهم', kind: 'تربیتی', date: addDays(T, -2), note: '' }]);
  R(9, 'equip', [{ title: 'دستگاه الکتروکاردیوگرافی', state: 'نیازمند سرویس', date: addDays(T, -20), note: '' }, { title: 'دستگاه استریل', state: 'فعال', date: addDays(T, -5), note: '' }]);
  R(10, 'stock', [{ title: 'آموکسی‌سیلین ۵۰۰', qty: 40, min: 100, supplier: 'پخش البرز', date: addDays(T, 300) }, { title: 'استامینوفن ۳۲۵', qty: 600, min: 200, supplier: 'پخش رازی', date: addDays(T, 420) }, { title: 'سرم نمکی', qty: 18, min: 30, supplier: 'پخش البرز', date: addDays(T, 200) }]);
  R(11, 'books', [{ title: 'مفاتیح‌الجنان', author: 'شیخ عباس قمی', code: '۱۰۲۴', state: 'موجود', member: '' }, { title: 'سلام بر ابراهیم', author: 'گروه فرهنگی ابراهیم هادی', code: '۲۳۱۸', state: 'امانت', member: 'عضو شماره ۴۴۱' }]);
  R(11, 'events', [{ title: 'مسابقه کتابخوانی نوجوانان', date: addDays(T, -10), count: 62, note: '' }]);
  R(12, 'aid', [{ donor: 'خیّر ناشناس', kind: 'نقدی', amount: 250000000, date: addDays(T, -6), use: 'طرح پوشاک زمستانی' }, { donor: 'فروشگاه محله', kind: 'غیرنقدی', amount: 90000000, date: addDays(T, -2), use: '۳۰ سبد غذایی' }]);
  R(13, 'admit', [{ date: T, session: 'صبح', count: 22, cap: 30, coach: 'خانم امینی', note: 'بدون حادثه' }, { date: addDays(T, -1), session: 'عصر', count: 29, cap: 30, coach: 'خانم زارعی', note: 'بدون حادثه' }]);
  R(16, 'systems', [{ title: 'پشتیبان‌گیری شبانه سرور', kind: 'پشتیبان‌گیری', date: addDays(T, -1), state: 'سالم', note: '' }, { title: 'فایروال اصلی', kind: 'امنیت', date: addDays(T, -7), state: 'هشدار', note: 'به‌روزرسانی میان‌افزار لازم است' }]);
  R(17, 'projects', [{ title: 'سالن چندمنظوره', contractor: 'شرکت ساختمانی بنای نو', start: addDays(T, -210), end: addDays(T, 150), progress: 62, budget: 12500000000, spent: 7250000000 },
    { title: 'بازسازی وضوخانه', contractor: 'پیمانکاری سازه‌گستر', start: addDays(T, -60), end: addDays(T, 20), progress: 85, budget: 1800000000, spent: 1520000000 },
    { title: 'عایق‌کاری بام حسینیه', contractor: '—', start: addDays(T, 15), end: addDays(T, 45), progress: 0, budget: 900000000, spent: 0 }]);

  /* نمونه ورودها و درخواست عضویت */
  [['imam', 'u1', true, 'ورود موفق', -1, '07:42'], ['m16', null, false, 'رمز نادرست', -1, '08:03'], ['m16', null, true, 'ورود موفق', -1, '08:04'], ['o3', null, true, 'ورود موفق', 0, '08:12'], ['admin', null, false, 'نام کاربری ناموجود', 0, '02:17'], ['admin', null, false, 'نام کاربری ناموجود', 0, '02:18'], ['s9', null, false, 'رمز نادرست', 0, '09:31'], ['s9', null, true, 'ورود موفق', 0, '09:32']].forEach(([un, id, ok, reason, d, hm]) => {
    at(d, hm); const u = D.users.find(x => x.username === un);
    D.logins.push({ id: uid(), ts: SEED_TS, username: un, uid: u ? u.id : '', ok, reason, agent: 'Chrome' });
    if (ok && u) u.lastLogin = SEED_TS;
  });
  ME = null; at(-1, '21:40');
  createSignup({ name: 'محمدحسین اکبری', username: 'mh.akbari', phone: '09127654321', unitId: 4, title: 'تدوینگر', pass: 'akbari123', note: 'نیروی داوطلب واحد رسانه از ماه گذشته' });
  at(0, '07:55');
  createSignup({ name: 'ریحانه موسوی', username: 'r.mousavi', phone: '09351112233', unitId: 11, title: 'کتابدار', pass: 'mousavi99', note: '' });
  SEED_TS = null;
  ME = prevME;
  D.notifs.forEach((n, i) => { if (i % 3 === 0) n.read = true; });
  D.sms = D.sms.slice(-24);
  return D;
}
function whNameD(D, id) { return (D.warehouses.find(w => w.id === id) || {}).name || ''; }

/* =====================================================================
   قواعد مدیریت سامانه: کاربران، رمزها، دسترسی‌ها، عضویت، تأیید مدیریتی، تنظیمات
   (مشترک بین مرورگر و سرور)
   ===================================================================== */
const DEFAULTS = JSON.parse(JSON.stringify({ units: UNITS, services: SERVICES, spaces: SPACES, letterCats: LETTER_CATS, leaveTypes: LEAVE_TYPES }));

/* ---------- مهاجرت داده و اعمال تنظیمات ---------- */
function migrate(D) {
  D.logins = D.logins || []; D.sessions = D.sessions || []; D.signups = D.signups || [];
  const s = D.settings;
  const def = {
    loginTitle: 'کارتابل اداری', subtitle: 'مجتمع مسجدمحور', loginText: 'سامانه یکپارچه مکاتبات، دستورات، ارجاع وظایف، درخواست‌ها، رزروها، اموال، امور مالی و منابع انسانی ۱۷ مدیریت مستقل زیر نظر امام جماعت.',
    announcement: { on: false, text: '', tone: 'info' }, maintenance: false, showDemo: true,
    theme: { palette: 'zomorrod', scale: 14 }, security: { minLen: 6, maxFails: 5, lockMin: 15, sessionMin: 60 },
    clock: { city: 'آبادان', lat: 30.3392, lng: 48.3043, prayer: true }, rolePerms: {}, units: {}, unitsOff: [], extraUnits: []
  };
  for (const k in def) if (s[k] === undefined) s[k] = def[k];
  for (const k in def.security) if (s.security[k] === undefined) s.security[k] = def.security[k];
  if (!s.clock.v2) { if (s.clock.city === 'تهران' && Math.abs(s.clock.lat - 35.6892) < 0.01) Object.assign(s.clock, def.clock); s.clock.v2 = true; }
  /* مدل جدید رزرو: نوع برنامه جدا از سالن فیزیکی */
  const OLD = { fateheh: 'hosseinieh', religious: 'hosseinieh', rahian: '', ziarat: '' };
  (D.reservations || []).forEach(r => { if (r.program === undefined) { if (r.space in OLD) { r.program = r.space; r.space = OLD[r.space]; } else r.program = r.space === 'zaersara' || r.space === 'guest' ? 'lodging' : 'general'; } });
  if (s.spaces) s.spaces = s.spaces.filter(x => !(x.id in OLD));
  /* پاک‌سازی نام‌های ساختاری قدیمی از نویسه‌های نشانه‌گذاری */
  const cl = t => (typeof t === 'string' ? t.replace(/[<>"'`&]/g, '') : t);
  (D.positions || []).forEach(p => (p.title = cl(p.title)));
  (D.users || []).forEach(u => (u.name = cl(u.name)));
  (D.warehouses || []).forEach(w => (w.name = cl(w.name)));
  Object.values(s.units || {}).forEach(u => { u.name = cl(u.name); u.short = cl(u.short); });
  (s.extraUnits || []).forEach(u => { u.name = cl(u.name); u.short = cl(u.short); });
  Object.keys(s.services || {}).forEach(k => (s.services[k] = s.services[k].map(cl)));
  (s.spaces || []).forEach(x => (x.name = cl(x.name)));
  ['letterCats', 'leaveTypes'].forEach(k => { if (s[k]) s[k] = s[k].map(cl); });
  return D;
}
function applySettings() {
  const s = DB.settings;
  UNITS.splice(0, UNITS.length, ...DEFAULTS.units.map(x => ({ ...x })), ...(s.extraUnits || []).map(x => ({ ...x })));
  UNITS.forEach(u => { Object.assign(u, s.units[u.id] || {}); u.off = (s.unitsOff || []).includes(u.id); if (!SERVICES[u.id]) SERVICES[u.id] = ['امور عمومی']; });
  Object.keys(SERVICES).forEach(k => { SERVICES[k] = (s.services && s.services[k]) || (DEFAULTS.services[k] || ['امور عمومی']).slice(); });
  SPACES.splice(0, SPACES.length, ...(s.spaces || DEFAULTS.spaces).map(x => ({ ...x })));
  LETTER_CATS.splice(0, LETTER_CATS.length, ...(s.letterCats || DEFAULTS.letterCats));
  LEAVE_TYPES.splice(0, LEAVE_TYPES.length, ...(s.leaveTypes || DEFAULTS.leaveTypes));
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
  if (typeof document === 'undefined') return;
  const t = DB.settings.theme; const p = PALETTES[t.palette] || PALETTES.zomorrod;
  const v = a => `--accent:${a[0]};--btn:${a[1]};--side:${a[2]};--side-2:${a[3]};--teal:${a[4]};--teal-soft:${a[5]};--glow:${a[6]};`;
  let el = document.getElementById('theme-vars');
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
  el.textContent = `:root{${v(p.l)}font-size:${t.scale}px}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${v(p.d)}}}
  :root[data-theme="dark"]{${v(p.d)}}`;
}

/* ---------- کاربران، رمزها و عضویت ---------- */
const adminPositions = () => DB.positions.filter(p => p.role !== 'imam' && permOf(p, 'admin.signups')).map(p => p.id);
const adminAlerts = () => (can('admin.signups') ? DB.signups.filter(x => x.status === 'در انتظار بررسی').length : 0) + (can('admin.users') ? lockedUsers().length : 0);
const lockedUsers = () => DB.users.filter(u => !u.deleted && u.lockedUntil && new Date(u.lockedUntil) > new Date());
const USERNAME_RE = /^[a-z0-9._-]{3,24}$/i;
function setPassword(u, pass, mustChange, self) {
  if (!self && !can('admin.passwords')) return fail('تعیین رمز کاربران فقط برای مدیر سامانه مجاز است.');
  if (!self && u.id === ME.user.id) return fail('رمز خودتان را از «حساب کاربری من» تغییر دهید.');
  if (!self && u.posId && isSensitivePos(posById(u.posId)) && !isImam()) return fail('تعیین رمز متصدی جایگاه حساس فقط با امام جماعت است.');
  pass = en(pass || '');
  if (pass.length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  if (self && pwCheck(u.pass, pass)) return fail('رمز جدید باید با رمز فعلی متفاوت باشد.');
  u.pass = pwHash(pass); u.mustChange = !!mustChange; u.passChanged = stamp(); u.fails = 0; u.lockedUntil = '';
  audit(self ? 'تغییر رمز توسط کاربر' : 'تعیین رمز توسط مدیر', 'user', u.id, u.username + (mustChange ? ' · تغییر در ورود بعدی الزامی' : ''));
  return u;
}
const genPass = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
function createUser2(v) {
  if (!can('admin.users')) return fail('افزودن کاربر مجاز نیست.');
  if (!v.name) return fail('نام کاربر را بنویسید.');
  if (!USERNAME_RE.test(v.username || '')) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.users.some(u => u.username === v.username && !u.deleted)) return fail('این نام کاربری قبلاً ثبت شده است.');
  if (en(v.pass || '').length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  const u = { id: 'u' + uid(), name: v.name, username: v.username, pass: pwHash(v.pass), posId: '', active: true, phone: en(v.phone || ''), nid: en(v.nid || ''), hired: v.hired || todayISO(), mustChange: !!v.mustChange, created: stamp() };
  DB.users.push(u);
  audit('ایجاد کاربر', 'user', u.id, u.username);
  if (v.posId) { const r = assignHolder(v.posId, u.id); if (r && r.error) return r; }
  return u;
}
function updateUser(u, v) {
  if (!can('admin.users')) return fail('ویرایش کاربر مجاز نیست.');
  if (u.deleted) return fail('این حساب حذف شده است.');
  if (u.posId && isSensitivePos(posById(u.posId)) && !isImam() && u.id !== ME.user.id) return fail('ویرایش حساب متصدی جایگاه حساس فقط با امام جماعت است.');
  if (!v.name) return fail('نام را بنویسید.');
  if (!USERNAME_RE.test(v.username)) return fail('نام کاربری معتبر نیست.');
  if (DB.users.some(x => x.id !== u.id && x.username === v.username && !x.deleted)) return fail('این نام کاربری متعلق به کاربر دیگری است.');
  const ch = ['name', 'username', 'phone', 'nid'].filter(k => String(u[k] || '') !== String(v[k] || ''));
  Object.assign(u, { name: v.name, username: v.username, phone: en(v.phone || ''), nid: en(v.nid || '') });
  if (v.posId !== (u.posId || '')) {
    if (!v.posId) { const h = DB.posHistory.find(x => x.userId === u.id && !x.to); if (h) h.to = todayISO(); u.posId = ''; audit('برداشتن جایگاه کاربر', 'user', u.id, u.username); }
    else { const r = assignHolder(v.posId, u.id); if (r && r.error) return r; }
  }
  if (ch.length) audit('ویرایش کاربر', 'user', u.id, u.username + ' · ' + ch.join('، '));
  return u;
}
function deleteUser(u) {
  if (!can('admin.users')) return fail('حذف کاربر مجاز نیست.');
  if (u.id === ME.user.id) return fail('حساب خودتان را نمی‌توانید حذف کنید.');
  if (u.posId && isSensitivePos(posById(u.posId)) && !isImam()) return fail('حذف متصدی جایگاه حساس فقط با امام جماعت است.');
  const h = DB.posHistory.find(x => x.userId === u.id && !x.to); if (h) h.to = todayISO();
  u.deleted = true; u.active = false; u.posId = '';
  DB.sessions.filter(s => s.uid === u.id && s.active).forEach(s => { s.active = false; s.end = stamp(); });
  audit('حذف کاربر', 'user', u.id, u.username + ' (سوابق اقدامات حفظ شد)');
  return u;
}
function setPosPerm(pos, k, val) {
  if (!can('admin.perms')) return fail('تعیین دسترسی مجاز نیست.');
  if (!PERMS.some(p => p[0] === k) || !['', 'allow', 'deny'].includes(val || '')) return fail('مجوز نامعتبر است.');
  if (pos.id === ME.pos.id) return fail('تغییر دسترسی جایگاه خودتان مجاز نیست؛ این کار با امام جماعت است.');
  if (pos.role === 'imam') return fail('دسترسی امام جماعت قابل تغییر نیست.');
  if (isSensitivePerm(k) && val === 'allow' && !isImam()) return fail(`اعطای «${permLabel(k)}» مجوز حساس است و فقط با امام جماعت انجام می‌شود.`);
  pos.perms = pos.perms || {};
  if (!val) delete pos.perms[k]; else pos.perms[k] = val;
  audit(val === 'allow' ? 'اعطای دسترسی' : val === 'deny' ? 'سلب دسترسی' : 'بازگشت دسترسی به پیش‌فرض', 'perm', pos.id, posLabel(pos.id) + ' · ' + permLabel(k));
  notify([pos.id], 'decision', `سطح دسترسی «${permLabel(k)}» برای جایگاه شما ${val === 'allow' ? 'اعطا' : val === 'deny' ? 'سلب' : 'به حالت پیش‌فرض بازگردانده'} شد.`, 'profile');
  return pos;
}
function setRolePerm(role, k, val) {
  if (!can('admin.perms')) return fail('تعیین دسترسی مجاز نیست.');
  if (!ROLES[role] || role === 'imam') return fail('نقش نامعتبر است.');
  if (!PERMS.some(p => p[0] === k) || !['', 'allow', 'deny'].includes(val || '')) return fail('مجوز نامعتبر است.');
  if (isSensitivePerm(k) && val === 'allow' && !isImam()) return fail(`اعطای «${permLabel(k)}» به یک نقش، مجوز حساس است و فقط با امام جماعت انجام می‌شود.`);
  if (role === myRole() && !isImam()) return fail('تغییر دسترسی نقش خودتان مجاز نیست.');
  const rp = DB.settings.rolePerms; rp[role] = rp[role] || {};
  if (!val) delete rp[role][k]; else rp[role][k] = val;
  audit('تغییر ماتریس دسترسی نقش', 'perm', role, ROLES[role] + ' · ' + permLabel(k) + ' · ' + (val || 'پیش‌فرض'));
  return rp;
}
function createSignup(v) {
  if (!v.name || !v.username || !v.phone || !v.unitId || !v.title || !v.pass) return fail('همه بخش‌های ستاره‌دار را تکمیل کنید.');
  if (!USERNAME_RE.test(v.username)) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.users.some(u => u.username === v.username && !u.deleted) || DB.signups.some(s => s.username === v.username && s.status === 'در انتظار بررسی')) return fail('این نام کاربری قبلاً گرفته شده است.');
  if (!/^0?9\d{9}$/.test(en(v.phone).replace(/\D/g, ''))) return fail('شماره همراه معتبر نیست.');
  if (en(v.pass).length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  DB.seq.signup = (DB.seq.signup || 0) + 1;
  const s = { id: uid(), no: 'S-' + pad(DB.seq.signup, 4), name: v.name, username: v.username, phone: en(v.phone), unitId: +v.unitId, title: v.title, note: v.note || '', passHash: pwHash(v.pass), status: 'در انتظار بررسی', created: stamp() };
  DB.signups.push(s);
  audit('درخواست عضویت', 'signup', s.id, s.username);
  notify(adminPositions(), 'request', `درخواست عضویت جدید: ${s.name} (${unitShort(s.unitId)})`, 'admin', s.no);
  return s;
}
function decideSignup(sg, ok, v) {
  if (!can('admin.signups')) return fail('بررسی درخواست عضویت مجاز نیست.');
  if (sg.status !== 'در انتظار بررسی') return fail('این درخواست قبلاً بررسی شده است.');
  if (!ok) { if (!v.note) return fail('علت رد را بنویسید.'); sg.status = 'ردشده'; sg.reason = v.note; audit('رد درخواست عضویت', 'signup', sg.id, sg.username); return sg; }
  let posId = v.posId;
  if (!posId) return fail('جایگاه سازمانی را انتخاب کنید.');
  if (posId === 'new') { const p = addPosition({ unitId: sg.unitId, title: sg.title }); if (p.error) return p; posId = p.id; }
  if (DB.users.some(u => u.username === sg.username && !u.deleted)) return fail('این نام کاربری در این فاصله توسط کاربر دیگری گرفته شده است.');
  const u = { id: 'u' + uid(), name: sg.name, username: sg.username, pass: sg.passHash, posId: '', active: true, phone: sg.phone, hired: todayISO(), created: stamp() };
  DB.users.push(u);
  const r = assignHolder(posId, u.id); if (r && r.error) return r;
  sg.status = 'تأییدشده'; sg.userId = u.id;
  audit('تأیید درخواست عضویت', 'signup', sg.id, sg.username + ' ← ' + posLabel(posId));
  return sg;
}

/* ---------- تأیید و رد مدیریتی همه موارد معلق ---------- */
function overrideAs(posId, fn) {
  const real = ME;
  ME = { user: real.user, pos: posById(posId), override: true, realPos: real.pos.id };
  try { return fn(); } finally { ME = real; }
}
function pendingAll() {
  const out = [];
  const age = t => daysBetween(isoOfStamp(t), todayISO());
  DB.requests.filter(r => r.status === 'جاری' && r.stage === 3).forEach(r => out.push({ k: 'req', id: r.id, no: r.no, type: 'درخواست', title: r.title, unit: r.toUnit, wait: r.needsImam ? 'P0' : unitPos(r.toUnit, 'manager')?.id, age: age(r.created),
    ok: n => reqAct(r, 'approve', n), no_: n => reqAct(r, 'reject', n) }));
  DB.orders.filter(o => o.status === 'منتظر تأیید').forEach(o => out.push({ k: 'order', id: o.id, no: o.no, type: 'دستور', title: o.title, unit: o.units[0], wait: 'P0', age: age(o.created), ok: n => orderDecide(o, true, n), no_: n => orderDecide(o, false, n) }));
  DB.payreqs.filter(p => p.status === 'جاری').forEach(p => { const s = nextPayStage(p); out.push({ k: 'pay', id: p.id, no: p.no, type: 'پرداخت · ' + PAY_ST[s], title: p.title + ' — ' + money(p.amount), unit: p.unitId, wait: s === 1 ? unitPos(p.unitId, 'manager').id : s === 2 ? unitPos(U_FIN, 'office').id : s === 3 ? 'P0' : unitPos(U_FIN, 'manager').id, age: age(p.created), needDoc: s === 4, ok: (n, doc) => payAct(p, true, n, doc), no_: n => payAct(p, false, n) }); });
  DB.reservations.filter(r => r.status === 'در انتظار تأیید').forEach(r => out.push({ k: 'res', id: r.id, no: r.no, type: 'رزرو', title: resPlace(r) + ' — ' + r.kind + ' (' + jd(r.date) + ')', unit: resUnit(r), wait: unitPos(resUnit(r), 'manager')?.id, age: age(r.created), ok: n => resDecide(r, 'تأییدشده', n), no_: n => resDecide(r, 'ردشده', n) }));
  DB.leaves.filter(l => l.status.startsWith('در انتظار')).forEach(l => out.push({ k: 'leave', id: l.id, no: l.no, type: 'مرخصی', title: (userById(l.uid) || {}).name + ' — ' + l.type, unit: l.unitId, wait: l.status === 'در انتظار تأیید مدیر' ? ((posById(l.pos) || {}).role === 'manager' ? 'P0' : unitPos(l.unitId, 'manager')?.id) : unitPos(U_ADMIN, 'manager')?.id, age: age(l.created), ok: n => leaveAct(l, true, n), no_: n => leaveAct(l, false, n) }));
  DB.movements.filter(m => m.status === 'در انتظار تأیید').forEach(m => { const a = DB.assets.find(x => x.id === m.assetId); out.push({ k: 'asset', id: a.id, no: m.no, type: 'گردش کالا · ' + m.type, title: a.name + ' (' + a.code + ')', unit: a.unitId, wait: unitPos(a.unitId, 'manager')?.id, age: age(m.created), ok: n => decideMovement(m, true, n), no_: n => decideMovement(m, false, n) }); });
  DB.tasks.filter(t => t.status === 'منتظر تأیید').forEach(t => out.push({ k: 'task', id: t.id, no: t.no, type: 'وظیفه', title: t.title, unit: t.unitId, wait: t.assignee === unitPos(t.unitId, 'manager').id ? t.assignee : unitPos(t.unitId, 'manager').id, age: age(t.created), ok: n => taskAct(t, 'approve', n), no_: n => taskAct(t, 'return', n) }));
  return out.filter(x => x.wait).sort((a, b) => b.age - a.age);
}

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
  const c = DB.settings.clock;
  const t = prayerTimes(todayISO(), +c.lat, +c.lng);
  return PRAYER_NAMES.map(([k, l]) => ({ k, l, t: hToHM(t[k]) }));
}
const hijri = () => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; } };
const greg = () => new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());


/* =====================================================================
   فهرست تنها عملیات‌های مجاز تغییر داده
   هر عملیات شناسه می‌گیرد (نه شیء)، مجوز را خودش بررسی می‌کند و در صورت خطا هیچ تغییری باقی نمی‌گذارد.
   در نسخه سروری همین فهرست روی سرور اجرا می‌شود و مرورگر فقط درخواست می‌فرستد.
   ===================================================================== */
const COLS = { letter: 'letters', order: 'orders', task: 'tasks', req: 'requests', res: 'reservations', meet: 'meetings', asset: 'assets', move: 'movements', pay: 'payreqs', leave: 'leaves', user: 'users', signup: 'signups' };
class OpError extends Error {}
const need = (cond, msg) => { if (!cond) throw new OpError(msg); };
function rec(col, id) { const r = (DB[col] || []).find(x => x.id === id); need(r, 'این مورد یافت نشد یا حذف شده است.'); return r; }
const str = (v, max = 4000) => String(v == null ? '' : v).slice(0, max);
/* نام‌های ساختاری (مدیریت، جایگاه، فضا، کاربر، انبار، فهرست‌ها) در همه صفحه‌ها نمایش داده می‌شوند؛ نویسه‌های نشانه‌گذاری HTML در آن‌ها پذیرفته نمی‌شود */
const label = (v, what) => { const s = str(v, 200).trim(); need(s, what + ' را بنویسید.'); need(!LABEL_BAD.test(s), `${what} نباید شامل نویسه‌های < > " ' \` & باشد.`); return s; };
const SAFE_DATA_COLS = ['letters', 'orders', 'tasks', 'requests', 'reservations', 'meetings', 'assets', 'movements', 'warehouses', 'tx', 'payreqs', 'budgets', 'commitments', 'leaves', 'missions', 'decrees', 'contracts', 'notifs', 'sms'];
const BACKUP_COLS = ['positions', 'users', 'posHistory', 'letters', 'orders', 'tasks', 'requests', 'reservations', 'meetings', 'warehouses', 'assets', 'movements', 'tx', 'payreqs', 'budgets', 'commitments', 'decrees', 'leaves', 'missions', 'contracts', 'notifs', 'sms', 'audit', 'logins', 'sessions', 'signups'];

/* ویرایش آسان رکوردها: فیلدهای مجاز، مجوز و اعتبارسنجی مشترک با ثبت اولیه */
const EDIT_RULES = {
  task: { col: 'tasks', ok: r => isMgrOrOffice(r.unitId) || can('admin.data'), f: ['title', 'desc', 'priority', 'due'], check: (r, v) => validateTask({ ...r, ...v }) },
  letter: { col: 'letters', ok: r => (canSeeLetter(r) && isClerk(r.unitId) && r.status !== 'بایگانی') || can('admin.data'), f: ['subject', 'sender', 'receiver', 'cat', 'priority', 'conf', 'date', 'body'],
    check: (r, v) => (!String(v.subject || '').trim() ? 'موضوع نامه را بنویسید.' : !LETTER_CATS.includes(v.cat) || !PRIORITIES.includes(v.priority) || !CONF.includes(v.conf) ? 'مقادیر نامعتبر است.' : !DATE_RE.test(v.date || '') ? 'تاریخ معتبر نیست.' : '') },
  order: { col: 'orders', ok: r => isImam() || can('admin.data'), f: ['title', 'desc', 'priority', 'due'], check: (r, v) => validateOrder({ ...r, ...v }) },
  meet: { col: 'meetings', ok: r => canEditMeeting(r) || can('admin.data'), f: ['title', 'date', 'place', 'start', 'end', 'agenda'], check: (r, v) => validateMeeting({ ...r, ...v }) },
  res: { col: 'reservations', ok: r => (r.by === ME.user.id && r.status === 'در انتظار تأیید') || canDecideRes(r) || can('admin.data'), f: ['kind', 'date', 'start', 'end', 'people', 'equip', 'desc'],
    check: (r, v) => { const n = { ...r, ...v, people: Number(en(v.people)) }; const e = validateReservation(n); if (e) return e; if (r.status === 'تأییدشده' && resConflicts(n).length) return 'این تغییر با رزرو تأییدشده دیگری تداخل دارد.'; return ''; }, norm: v => ({ ...v, people: Number(en(v.people)) }) },
  asset: { col: 'assets', ok: r => canManageAsset(r) || can('admin.data'), f: ['name', 'cat', 'serial', 'value', 'specs'], check: (r, v) => (!String(v.name || '').trim() ? 'نام کالا را بنویسید.' : !(Number(en(v.value || 0)) >= 0) ? 'ارزش باید عدد مثبت باشد.' : ''), norm: v => ({ ...v, value: Number(en(v.value || 0)) }) }
};
const canEditRec = (k, r) => !!(EDIT_RULES[k] && r && EDIT_RULES[k].ok(r));

const OPS = {
  /* دبیرخانه */
  createLetter: v => createLetter(v),
  referLetter: (id, unitId, note) => referLetter(rec('letters', id), unitId, str(note)),
  replyLetter: (id, text) => replyLetter(rec('letters', id), str(text)),
  archiveLetter: id => archiveLetter(rec('letters', id)),
  /* دستورات */
  createOrder: v => createOrder(v),
  orderReport: (id, v) => orderReport(rec('orders', id), v),
  orderDecide: (id, ok, note) => orderDecide(rec('orders', id), !!ok, str(note)),
  /* وظایف */
  createTask: v => createTask(v),
  taskAct: (id, act, note, extra) => taskAct(rec('tasks', id), act, str(note), extra),
  /* درخواست‌ها */
  createRequest: v => { need(UNITS.some(u => u.id === +v.toUnit && !u.off), 'مدیریت مسئول را انتخاب کنید.'); return createRequest(v); },
  reqAct: (id, act, note, extra) => reqAct(rec('requests', id), act, str(note), extra),
  /* رزرو */
  createReservation: v => createReservation(v),
  resDecide: (id, status, note) => resDecide(rec('reservations', id), status, str(note)),
  /* جلسات */
  createMeeting: v => createMeeting(v),
  addResolution: (id, v) => addResolution(rec('meetings', id), v),
  resolutionUpdate: (id, xid, status, note) => { const m = rec('meetings', id); const x = m.resolutions.find(r => r.id === xid); need(x, 'مصوبه یافت نشد.'); need(['در حال پیگیری', 'انجام‌شده'].includes(status), 'وضعیت نامعتبر است.'); return resolutionUpdate(m, x, status, str(note)); },
  meetingMinutes: (id, text, files) => { const m = rec('meetings', id); need(canEditMeeting(m), 'ثبت صورت‌جلسه با برگزارکننده جلسه است.'); need(str(text).trim(), 'متن صورت‌جلسه را بنویسید.'); m.minutes = str(text, 20000); m.minutesFiles.push(...(files || [])); hist(m, 'ثبت صورت‌جلسه'); audit('ثبت صورت‌جلسه', 'meeting', m.id, m.no); return m; },
  /* اموال */
  createAsset: v => createAsset(v),
  createMovement: (id, v) => createMovement(rec('assets', id), v),
  decideMovement: (id, ok, note) => decideMovement(rec('movements', id), !!ok, str(note)),
  assetHealth: (id, health, note) => { const a = rec('assets', id); need(canManageAsset(a), 'تغییر وضعیت این کالا برای جایگاه شما مجاز نیست.'); need(ASSET_HEALTH.includes(health), 'وضعیت نامعتبر است.'); a.health = health; hist(a, 'تغییر وضعیت سلامت به «' + health + '»', str(note)); audit('تغییر وضعیت کالا', 'asset', a.id, a.code); return a; },
  addWarehouse: v => { need(isImam() || isMgrOrOffice(U_INTERNAL), 'تعریف انبار با مدیریت داخلی است.'); v.name = label(v.name, 'نام انبار'); need(UNITS.some(u => u.id === +v.unitId), 'واحد را انتخاب کنید.'); const w = { id: 'w' + uid().slice(0, 6), name: str(v.name, 200), unitId: +v.unitId }; DB.warehouses.push(w); audit('تعریف انبار', 'warehouse', w.id, w.name); return w; },
  /* مالی */
  addTx: v => { need(v.kind !== 'هزینه', 'هزینه فقط از مسیر «درخواست پرداخت» و پس از طی مراحل تأیید ثبت می‌شود.'); return addTx(v); },
  createPay: v => createPay(v),
  payAct: (id, ok, note, doc) => payAct(rec('payreqs', id), !!ok, str(note), str(doc, 100)),
  addCommitment: v => { need(isImam() || isClerk(U_FIN), 'ثبت تعهد با مدیریت امور مالی است.'); need(str(v.title).trim() && Number(en(v.amount)) > 0 && DATE_RE.test(v.due || ''), 'عنوان، مبلغ و سررسید معتبر لازم است.'); const c = { id: uid(), title: str(v.title, 300), unitId: +v.unitId, amount: Number(en(v.amount)), due: v.due, status: 'جاری' }; DB.commitments.push(c); audit('ثبت تعهد', 'commitment', c.id, c.title); return c; },
  setBudget: (unitId, amount) => { need(isImam() || isMgr(U_FIN), 'اصلاح بودجه با امام جماعت یا مدیر امور مالی است.'); const n = Number(en(amount)); need(n >= 0, 'مبلغ معتبر نیست.'); const b = DB.budgets.find(x => x.unitId === +unitId && x.year === jYearNow()); need(b, 'بودجه این واحد یافت نشد.'); audit('اصلاح بودجه', 'budget', b.unitId, `${money(b.amount)} ← ${money(n)}`); b.amount = n; return b; },
  /* منابع انسانی */
  createLeave: v => { need(LEAVE_TYPES.includes(v.type), 'نوع مرخصی را انتخاب کنید.'); need(DATE_RE.test(v.from || '') && DATE_RE.test(v.to || ''), 'بازه تاریخ مرخصی معتبر نیست.'); return createLeave(v); },
  leaveAct: (id, ok, note) => leaveAct(rec('leaves', id), !!ok, str(note)),
  addHR: (kind, v) => { need(['missions', 'decrees', 'contracts'].includes(kind), 'نوع سابقه نامعتبر است.'); need(userById(v.uid), 'کارمند را انتخاب کنید.'); return addHR(kind, { ...v, status: 'تأییدشده' }); },
  addRecord: (unitId, key, v) => { need((REGISTRIES[unitId] || []).some(r => r.key === key), 'دفتر نامعتبر است.'); return addRecord(+unitId, key, v); },
  /* اعلان‌ها */
  readNotif: id => { const n = rec('notifs', id); need(n.pos === ME.pos.id, 'این اعلان متعلق به شما نیست.'); n.read = true; return n; },
  readAllNotifs: () => { DB.notifs.forEach(n => { if (n.pos === ME.pos.id) n.read = true; }); return {}; },
  /* ویرایش رکورد با همان اعتبارسنجی ثبت */
  editRecord: (kind, id, v) => {
    const E = EDIT_RULES[kind]; need(E, 'نوع رکورد نامعتبر است.');
    const r = rec(E.col, id); need(E.ok(r), 'ویرایش این مورد برای جایگاه شما مجاز نیست.');
    const vals = {}; E.f.forEach(k => { if (k in v) vals[k] = typeof v[k] === 'string' ? str(v[k], 20000) : v[k]; });
    const nv = E.norm ? E.norm(vals) : vals;
    const err = E.check(r, nv); need(!err, err);
    const ch = Object.keys(nv).filter(k => String(r[k] ?? '') !== String(nv[k] ?? ''));
    if (!ch.length) return r;
    ch.forEach(k => (r[k] = nv[k]));
    hist(r, 'ویرایش', ch.join('، '));
    audit('ویرایش ' + E.col, E.col, r.id, r.no || r.code || '');
    return r;
  },

  /* ---------- کاربران و دسترسی‌ها ---------- */
  createUser: v => { v.name = label(v.name, 'نام کاربر'); return createUser2(v); },
  updateUser: (id, v) => { v.name = label(v.name, 'نام کاربر'); return updateUser(rec('users', id), v); },
  deleteUser: id => deleteUser(rec('users', id)),
  setPassword: (id, pass, mustChange) => setPassword(rec('users', id), pass, !!mustChange, false),
  assignHolder: (posId, userId) => assignHolder(posId, userId),
  addPosition: v => { need(UNITS.some(u => u.id === +v.unitId), 'مدیریت را انتخاب کنید.'); v.title = label(v.title, 'عنوان جایگاه'); return addPosition(v); },
  deletePosition: id => { need(can('admin.users'), 'حذف جایگاه مجاز نیست.'); const p = posById(id); need(p, 'جایگاه یافت نشد.'); need(p.role === 'staff', 'فقط جایگاه‌های کارشناسی قابل حذف‌اند.'); need(!holderOf(p.id), 'ابتدا متصدی این جایگاه را تغییر دهید.'); need(!isSensitivePos(p) || isImam(), 'حذف جایگاه حساس فقط با امام جماعت است.'); DB.positions = DB.positions.filter(x => x.id !== id); audit('حذف جایگاه', 'position', id, posLabel(id)); return {}; },
  setPosPerm: (posId, k, val) => { const p = posById(posId); need(p, 'جایگاه یافت نشد.'); return setPosPerm(p, k, val); },
  setRolePerm: (role, k, val) => setRolePerm(role, k, val),
  toggleUser: id => { need(can('admin.users'), 'مدیریت کاربران مجاز نیست.'); const u = rec('users', id); need(u.id !== ME.user.id, 'حساب خودتان را نمی‌توانید غیرفعال کنید.'); need(!u.posId || !isSensitivePos(posById(u.posId)) || isImam(), 'غیرفعال‌کردن متصدی جایگاه حساس فقط با امام جماعت است.'); u.active = !u.active; if (!u.active) endUserSessions(u.id); audit(u.active ? 'فعال‌سازی حساب' : 'غیرفعال‌سازی حساب', 'user', u.id, u.username); return u; },
  unlockUser: id => { need(can('admin.users'), 'مدیریت کاربران مجاز نیست.'); const u = rec('users', id); u.lockedUntil = ''; u.fails = 0; audit('بازکردن قفل حساب', 'user', u.id, u.username); return u; },
  unlockAll: () => { need(can('admin.users'), 'مدیریت کاربران مجاز نیست.'); lockedUsers().forEach(u => { u.lockedUntil = ''; u.fails = 0; }); audit('بازکردن قفل همه حساب‌ها', 'user', '', ''); return {}; },
  kickUser: id => { need(can('admin.users') || can('admin.logs'), 'پایان نشست کاربران مجاز نیست.'); const u = rec('users', id); need(u.id !== ME.user.id, 'برای خروج از «خروج» استفاده کنید.'); const n = endUserSessions(u.id); audit('خروج اجباری کاربر', 'session', u.id, u.username + ' · ' + fa(n) + ' نشست'); return { n }; },
  endSession: sid => { need(can('admin.users') || can('admin.logs'), 'پایان نشست مجاز نیست.'); const s = DB.sessions.find(x => x.id === sid); need(s, 'نشست یافت نشد.'); s.active = false; s.end = stamp(); audit('پایان نشست', 'session', s.uid, (userById(s.uid) || {}).username || ''); return {}; },
  kickAll: mySid => { need(can('admin.users'), 'مدیریت کاربران مجاز نیست.'); let n = 0; DB.sessions.forEach(s => { if (s.active && s.id !== mySid && s.uid !== ME.user.id) { s.active = false; s.end = stamp(); n++; } }); audit('خروج همه کاربران', 'session', '', fa(n) + ' نشست'); return { n }; },
  forceAllChange: () => { need(can('admin.passwords'), 'تعیین رمز کاربران مجاز نیست.'); DB.users.forEach(u => { if (u.id !== ME.user.id && !u.deleted && (isImam() || !u.posId || !isSensitivePos(posById(u.posId)))) u.mustChange = true; }); audit('الزام تغییر رمز برای همه', 'user', '', ''); return {}; },
  decideSignup: (id, ok, v) => decideSignup(rec('signups', id), !!ok, v || {}),
  overrideDecision: (no, ok, note, doc) => {
    need(can('admin.approve'), 'تأیید مدیریتی برای جایگاه شما مجاز نیست.');
    const x = pendingAll().find(i => i.no === no); need(x, 'این مورد دیگر معلق نیست.');
    const src = DB[COLS[x.k === 'asset' ? 'move' : x.k]] || [];
    const item = x.k === 'asset' ? DB.movements.find(m => m.no === no) : src.find(r => r.id === x.id);
    need(!item || (item.byPos !== ME.pos.id && item.by !== ME.user.id && item.uid !== ME.user.id && item.assignee !== ME.pos.id), 'تأیید مدیریتی موردی که خودتان ثبت کرده‌اید یا ذی‌نفع آن هستید مجاز نیست.');
    if (!ok) need(str(note).trim(), 'علت رد را بنویسید.');
    return overrideAs(x.wait, () => (ok ? x.ok(str(note), str(doc, 100)) : x.no_(str(note))));
  },

  /* ---------- حساب کاربری خود ---------- */
  changeOwnPassword: (cur, p1) => { need(pwCheck(ME.user.pass, cur), 'رمز فعلی درست نیست.'); return setPassword(ME.user, p1, false, true); },
  forcedPassChange: p1 => { need(ME.user.mustChange, 'تغییر رمز الزامی نیست.'); return setPassword(ME.user, p1, false, true); },
  changeOwnPhone: phone => { need(/^0?9\d{9}$/.test(en(phone).replace(/\D/g, '')), 'شماره همراه معتبر نیست.'); ME.user.phone = en(phone).replace(/\D/g, ''); audit('تغییر تلفن توسط کاربر', 'user', ME.user.id, ''); return ME.user; },

  /* ---------- تنظیمات ---------- */
  saveSettings: (section, v) => {
    need(can('admin.settings'), 'تغییر تنظیمات برای جایگاه شما مجاز نیست.');
    const s = DB.settings;
    const num = (x, min, max, label) => { const n = Number(en(x)); need(Number.isFinite(n) && n >= min && n <= max, `${label} باید بین ${fa(min)} و ${fa(max)} باشد.`); return n; };
    if (section === 'site') { need(str(v.orgName).trim(), 'نام مجموعه را بنویسید.'); Object.assign(s, { orgName: str(v.orgName, 200), subtitle: str(v.subtitle, 200), loginTitle: str(v.loginTitle, 200), loginText: str(v.loginText, 1000) }); s.payThreshold = num(v.payThreshold, 1, 1e15, 'سقف پرداخت'); }
    else if (section === 'announcement') { s.announcement = { on: !!v.on, tone: ['info', 'warn', 'ok'].includes(v.tone) ? v.tone : 'info', text: str(v.text, 1000) }; if (v.on && v.text) notify(DB.positions.map(p => p.id), 'decision', 'اطلاعیه: ' + str(v.text, 80), 'dashboard'); }
    else if (section === 'theme') { if (v.palette) { need(PALETTES[v.palette], 'رنگ‌بندی نامعتبر است.'); s.theme.palette = v.palette; } if (v.scale) s.theme.scale = num(v.scale, 12, 18, 'اندازه متن'); }
    else if (section === 'clock') { s.clock = { city: str(v.city, 60).trim() || 'آبادان', lat: num(v.lat, -89, 89, 'عرض جغرافیایی'), lng: num(v.lng, -179, 179, 'طول جغرافیایی'), prayer: !!v.prayer, v2: true }; }
    else if (section === 'security') { Object.assign(s.security, { minLen: num(v.minLen, 6, 64, 'حداقل طول رمز'), maxFails: num(v.maxFails, 2, 20, 'تعداد تلاش'), lockMin: num(v.lockMin, 1, 1440, 'مدت قفل'), sessionMin: num(v.sessionMin, 5, 1440, 'مهلت بی‌فعالیتی') }); s.showDemo = !!v.showDemo; s.maintenance = !!v.maintenance; }
    else if (section === 'maintenance') { s.maintenance = !!v.on; }
    else if (section === 'sms') { const sm = s.sms; sm.enabled = !!v.enabled; sm.provider = ['none', 'kavenegar', 'webhook'].includes(v.provider) ? v.provider : 'none'; sm.sender = str(v.sender, 30); if (v.apiKey) sm.apiKey = str(v.apiKey, 200); if (v.webhook !== undefined) sm.webhook = str(v.webhook, 500); Object.keys(sm.events).forEach(k => (sm.events[k] = (v.events || []).includes(k))); sm.roles = (v.roles || []).filter(r => ROLES[r]); }
    else if (section === 'lists') { const L = t => str(t, 4000).split('\n').map(x => x.trim()).filter(Boolean).map(x => label(x, 'مورد فهرست')); need(L(v.letterCats).length && L(v.leaveTypes).length, 'فهرست‌ها نباید خالی باشند.'); s.letterCats = L(v.letterCats); s.leaveTypes = L(v.leaveTypes); }
    else throw new OpError('بخش تنظیمات نامعتبر است.');
    audit('تغییر تنظیمات: ' + section, 'settings', section, '');
    applySettings();
    return {};
  },
  saveUnit: (id, v) => {
    need(can('admin.settings'), 'تغییر ساختار سازمانی مجاز نیست.');
    v.name = label(v.name, 'نام کامل مدیریت'); v.short = label(v.short, 'نام کوتاه مدیریت');
    const sv = str(v.services, 4000).split('\n').map(x => x.trim()).filter(Boolean).map(x => label(x, 'نام خدمت')); need(sv.length, 'دست‌کم یک خدمت لازم است.');
    const s = DB.settings; s.services = s.services || {};
    let uidN = +id;
    if (!uidN) { uidN = Math.max(...UNITS.map(u => u.id)) + 1; s.extraUnits = s.extraUnits || []; s.extraUnits.push({ id: uidN, name: str(v.name, 200), short: str(v.short, 60), ic: 'building' }); ['manager', 'office', 'secretary'].forEach((r, i) => DB.positions.push({ id: `P${uidN}-${'mos'[i]}`, unitId: uidN, role: r, title: ['مدیر', 'مسئول دفتر', 'منشی'][i] })); DB.budgets.push({ unitId: uidN, year: jYearNow(), amount: 0 }); }
    else need(UNITS.some(u => u.id === uidN), 'مدیریت یافت نشد.');
    s.units[uidN] = { name: str(v.name, 200), short: str(v.short, 60) };
    s.services[uidN] = sv;
    audit(+id ? 'ویرایش مدیریت' : 'افزودن مدیریت', 'settings', 'unit-' + uidN, v.name);
    applySettings();
    return { id: uidN };
  },
  toggleUnit: id => { need(can('admin.settings'), 'تغییر ساختار سازمانی مجاز نیست.'); const s = DB.settings; s.unitsOff = s.unitsOff || []; const i = s.unitsOff.indexOf(+id); if (i >= 0) s.unitsOff.splice(i, 1); else s.unitsOff.push(+id); audit(i >= 0 ? 'فعال‌سازی مدیریت' : 'غیرفعال‌سازی مدیریت', 'settings', 'unit-' + id, unitName(+id)); applySettings(); return {}; },
  saveSpace: (id, v) => {
    need(can('admin.settings'), 'تغییر فضاها مجاز نیست.');
    v.name = label(v.name, 'نام فضا'); need(UNITS.some(u => u.id === +v.unit), 'مدیریت تأییدکننده را انتخاب کنید.');
    const cap = Number(en(v.cap)); need(Number.isInteger(cap) && cap >= 1 && cap <= 100000, 'ظرفیت باید عدد صحیح مثبت باشد.');
    const list = SPACES.map(s => ({ ...s }));
    if (id) { const x = list.find(s => s.id === id); need(x, 'فضا یافت نشد.'); Object.assign(x, { name: str(v.name, 200), unit: +v.unit, cap, excl: !!v.excl }); }
    else list.push({ id: 'sp' + uid().slice(0, 6), name: str(v.name, 200), unit: +v.unit, cap, excl: !!v.excl });
    DB.settings.spaces = list; audit(id ? 'ویرایش فضا' : 'افزودن فضا', 'settings', 'spaces', v.name); applySettings(); return {};
  },
  deleteSpace: id => { need(can('admin.settings'), 'تغییر فضاها مجاز نیست.'); need(!DB.reservations.some(r => r.space === id && ['در انتظار تأیید', 'تأییدشده'].includes(r.status) && r.date >= todayISO()), 'این فضا رزرو پیش رو دارد؛ ابتدا رزروها را لغو کنید.'); DB.settings.spaces = SPACES.filter(s => s.id !== id).map(s => ({ ...s })); audit('حذف فضا', 'settings', 'spaces', id); applySettings(); return {}; },
  orgReset: () => { need(can('admin.settings'), 'تغییر ساختار سازمانی مجاز نیست.'); const s = DB.settings; s.units = {}; s.unitsOff = []; delete s.services; delete s.spaces; delete s.letterCats; delete s.leaveTypes; audit('بازگردانی ساختار به پیش‌فرض', 'settings', 'org', ''); applySettings(); return {}; },

  /* ---------- ویرایش مستقیم داده (فقط مجموعه‌های عملیاتی؛ کاربران، جایگاه‌ها، نشست‌ها و رویدادها هرگز) ---------- */
  dataSave: (col, id, obj) => {
    need(can('admin.data'), 'ویرایش مستقیم داده مجاز نیست.'); need(SAFE_DATA_COLS.includes(col), 'این مجموعه از ویرایش مستقیم محافظت شده است.');
    need(obj && typeof obj === 'object' && !Array.isArray(obj), 'رکورد باید یک شیء JSON باشد.');
    const i = DB[col].findIndex(x => (x.id || '') === id || String(DB[col].indexOf(x)) === id); need(i >= 0, 'رکورد یافت نشد.');
    const old = DB[col][i]; need(!old.id || obj.id === old.id, 'شناسه رکورد قابل تغییر نیست.');
    const changed = Object.keys({ ...old, ...obj }).filter(k => JSON.stringify(old[k]) !== JSON.stringify(obj[k]));
    DB[col][i] = obj;
    audit('ویرایش مستقیم داده', col, old.id || i, changed.map(k => `${k}: ${String(JSON.stringify(old[k])).slice(0, 40)} ← ${String(JSON.stringify(obj[k])).slice(0, 40)}`).join(' | ').slice(0, 400) || 'بدون تغییر');
    return obj;
  },
  dataDelete: (col, id) => { need(can('admin.data'), 'حذف مستقیم داده مجاز نیست.'); need(SAFE_DATA_COLS.includes(col), 'این مجموعه از حذف مستقیم محافظت شده است.'); const i = DB[col].findIndex(x => (x.id || '') === id || String(DB[col].indexOf(x)) === id); need(i >= 0, 'رکورد یافت نشد.'); const r = DB[col][i]; DB[col].splice(i, 1); audit('حذف مستقیم داده', col, r.id || i, JSON.stringify(r).slice(0, 200)); return {}; }
};
function endUserSessions(userId) { let n = 0; DB.sessions.forEach(s => { if (s.uid === userId && s.active) { s.active = false; s.end = stamp(); n++; } }); return n; }

/* عملیات بدون ورود */
const PUBLIC_OPS = { createSignup: v => { v.name = label(v.name, 'نام'); v.title = label(v.title, 'سمت درخواستی'); return createSignup(v); } };

/* ---------- اعتبارسنجی کامل نسخه پشتیبان پیش از جایگزینی ---------- */
function validateBackup(d, actorId) {
  const errs = [];
  if (!d || typeof d !== 'object' || Array.isArray(d)) return ['فایل یک شیء JSON نیست.'];
  if (d.ver !== 1) errs.push('شماره نسخه پشتیبان پشتیبانی نمی‌شود.');
  BACKUP_COLS.forEach(c => { if (d[c] !== undefined && !Array.isArray(d[c])) errs.push(`بخش «${c}» باید فهرست باشد.`); });
  ['positions', 'users', 'audit'].forEach(c => { if (!Array.isArray(d[c]) || !d[c].length) errs.push(`بخش ضروری «${c}» خالی یا ناموجود است.`); });
  if (!d.settings || typeof d.settings !== 'object') errs.push('بخش تنظیمات ناموجود است.');
  if (errs.length) return errs;
  const pos = new Set();
  d.positions.forEach((p, i) => { if (!p || !p.id || !ROLES[p.role] || typeof p.unitId !== 'number') errs.push(`جایگاه ردیف ${fa(i + 1)} ناقص است.`); else pos.add(p.id); });
  if (!d.positions.some(p => p.role === 'imam')) errs.push('جایگاه امام جماعت در نسخه پشتیبان نیست.');
  const names = new Set();
  d.users.forEach((u, i) => {
    if (!u || !u.id || !u.name || !u.username || !u.pass) errs.push(`کاربر ردیف ${fa(i + 1)} ناقص است.`);
    else { if (names.has(u.username) && !u.deleted) errs.push(`نام کاربری تکراری: ${u.username}`); names.add(u.username); if (u.posId && !pos.has(u.posId)) errs.push(`کاربر ${u.username} به جایگاه ناموجود اشاره می‌کند.`); }
  });
  ['letters', 'orders', 'tasks', 'requests', 'reservations', 'meetings', 'payreqs'].forEach(c => (d[c] || []).forEach((r, i) => { if (!r || !r.id || !r.no) errs.push(`رکورد ${fa(i + 1)} از «${c}» شناسه یا شماره ندارد.`); }));
  let prev = '00000000';
  for (let i = 0; i < d.audit.length; i++) { const { h, ...rest } = d.audit[i] || {}; if (!h) { errs.push('رویدادهای سیستمی اثر انگشت ندارند.'); break; } prev = h; }
  /* جلوگیری از ارتقای دسترسی از راه بازیابی: دسترسی بازیابی‌کننده در نسخه پشتیبان نباید بیشتر از فعلی باشد */
  if (actorId) {
    const cur = userById(actorId), bu = d.users.find(u => u.id === actorId);
    if (bu && bu.posId) {
      const bp = d.positions.find(p => p.id === bu.posId);
      const savedDB = DB; let more = [];
      try { DB = { ...savedDB, settings: d.settings }; more = PERMS.map(p => p[0]).filter(k => permOf(bp, k)); } finally { DB = savedDB; }
      const now = cur && cur.posId ? PERMS.map(p => p[0]).filter(k => permOf(posById(cur.posId), k)) : [];
      const extra = more.filter(k => !now.includes(k));
      if (extra.length) errs.push('این نسخه پشتیبان به حساب شما دسترسی بیشتری از فعلی می‌دهد (' + extra.map(permLabel).join('، ') + ') و پذیرفته نمی‌شود.');
    }
  }
  return errs.slice(0, 20);
}

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

/* =====================================================================
   اتصال به سرور (نسخه عملیاتی)
   مرورگر هیچ داده‌ای ذخیره نمی‌کند؛ هر کاربر فقط داده‌های مجاز خود را از سرور می‌گیرد
   و هر تغییر به‌صورت یک درخواست به سرور فرستاده و آنجا بررسی می‌شود.
   ===================================================================== */
const Remote = {
  session: null, es: null, stale: false, csrf: '',
  async req(method, url, body, headers = {}) {
    let res;
    try {
      res = await fetch(url, { method, credentials: 'same-origin', headers: { 'X-Kartabl': '1', 'X-CSRF': this.csrf, ...(body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body) });
    } catch (e) { return { error: 'ارتباط با سرور برقرار نشد. اتصال شبکه را بررسی کنید.' }; }
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'پاسخ نامعتبر از سرور (' + res.status + ').' }; }
    if (res.status === 401 && ME) { ME = null; closeModal(); renderLogin(data.error || 'نشست شما پایان یافته است؛ دوباره وارد شوید.'); return { error: data.error || 'نشست پایان یافته است.' }; }
    if (!res.ok && !data.error) data.error = 'خطای سرور (' + res.status + ').';
    return data;
  },
  apply(r) {
    if (r.public) { DB = r.public; DB.users = DB.users || []; applySettings(); return; }
    if (!r.state) return;
    DB = r.state; this.session = r.session; this.csrf = r.csrf || this.csrf;
    applySettings();
    const u = DB.users.find(x => x.id === r.me);
    if (u) setMe(u);
  },
  async boot() {
    const r = await this.req('GET', '/api/state');
    this.apply(r);
    if (r.state && ME) { renderShell(); if (ME.user.mustChange) forcePassChange(); } else renderLogin(r.message || '');
    this.listen();
  },
  async login(username, password) {
    const r = await this.req('POST', '/api/login', { username, password });
    if (r.error) { if (r.public) this.apply({ public: r.public }); return r; }
    this.apply(r); this.listen(); return r;
  },
  async logout(msg) { await this.req('POST', '/api/logout', { msg: msg || '' }); this.session = null; if (this.es) { this.es.close(); this.es = null; } const r = await this.req('GET', '/api/state'); this.apply(r); },
  ping() { this.req('POST', '/api/ping', {}); },
  /* هر عملیات همراه نسخه رکوردی که کاربر دیده فرستاده می‌شود تا تغییر هم‌زمان دیگران بازنویسی نشود */
  async cmd(name, args) {
    let ver = null;
    if (typeof args[0] === 'string') for (const c of Object.values(COLS)) { const r = (DB[c] || []).find(x => x.id === args[0]); if (r) { ver = { col: c, id: r.id, v: r._v || 0 }; break; } }
    const r = await this.req('POST', '/api/cmd', { name, args, ver });
    if (r.state) this.apply(r);
    if (r.conflict) { if (!$('.modal-bg')) route(); return { error: r.error }; }
    if (r.error) return { error: r.error };
    return r.result || {};
  },
  async signup(v) { const r = await this.req('POST', '/api/signup', { v }); return r.error ? { error: r.error } : r.result || {}; },
  async post(url, body) { const r = await this.req('POST', url, body); if (r.state) this.apply(r); return r; },
  async refresh() { const r = await this.req('GET', '/api/state'); if (r.state) { this.apply(r); if (!$('.modal-bg')) route(); else this.stale = true; } },
  async upload(file) {
    const r = await this.req('PUT', '/api/files?name=' + encodeURIComponent(file.name), file, { 'Content-Type': file.type || 'application/octet-stream' });
    return r.error ? r : { id: r.id, name: r.name, size: r.size, type: r.type, url: '/api/files/' + r.id };
  },
  /* تغییرات دیگران: سرور فقط خبر می‌دهد که چیزی تغییر کرده و هر کاربر نسخه مجاز خودش را دوباره می‌گیرد */
  listen() {
    if (this.es || typeof EventSource === 'undefined' || !ME) return;
    this.es = new EventSource('/api/events');
    this.es.addEventListener('changed', () => { if ($('.modal-bg')) this.stale = true; else this.refresh(); });
    this.es.addEventListener('ended', e => { const m = (() => { try { return JSON.parse(e.data).msg; } catch (x) { return ''; } })(); if (this.es) { this.es.close(); this.es = null; } ME = null; closeModal(); this.req('GET', '/api/state').then(r => { this.apply(r); renderLogin(m || 'نشست شما پایان یافت.'); }); });
    this.es.onerror = () => {};
  },
  flush() { if (this.stale && !$('.modal-bg')) { this.stale = false; this.refresh(); } }
};

/* =====================================================================
   صفحات: داشبورد، کارتابل امام، مدیریت‌ها، دبیرخانه، دستورات، وظایف، درخواست‌ها
   ===================================================================== */
const PAGES = {};

/* کارهای در انتظار اقدام کاربر جاری */
function myQueue() {
  const q = [];
  const imam = isImam();
  DB.requests.forEach(r => {
    if (!canSeeReq(r)) return;
    const acts = reqActions(r).filter(a => !['cancel', 'coop'].includes(a[0]));
    if (imam ? r.stage === 3 && r.needsImam && r.status === 'جاری' : acts.length) q.push({ k: 'req', t: 'درخواست', no: r.no, title: r.title, st: reqLabel(r), due: r.due, id: r.id });
  });
  DB.tasks.forEach(t => {
    if (!canSeeTask(t) || t.status === 'تکمیل‌شده') return;
    if (t.assignee === ME.pos.id || (!imam && t.status === 'منتظر تأیید' && isMgrOrOffice(t.unitId))) q.push({ k: 'task', t: 'وظیفه', no: t.no, title: t.title, st: taskStatus(t), due: t.due, id: t.id });
  });
  DB.orders.forEach(o => {
    if (imam ? o.status === 'منتظر تأیید' : o.status !== 'تکمیل‌شده' && o.status !== 'منتظر تأیید' && o.units.some(u => isMgrOrOffice(u))) q.push({ k: 'order', t: 'دستور امام', no: o.no, title: o.title, st: orderStatus(o), due: o.due, id: o.id });
  });
  DB.payreqs.forEach(p => { if (payCanAct(p) && (!imam || nextPayStage(p) === 3)) q.push({ k: 'pay', t: 'پرداخت', no: p.no, title: p.title, st: payLabel(p), due: '', id: p.id }); });
  if (!imam) DB.reservations.forEach(r => { if (r.status === 'در انتظار تأیید' && canDecideRes(r)) q.push({ k: 'res', t: 'رزرو', no: r.no, title: resPlace(r) + ' — ' + r.kind, st: r.status, due: r.date, id: r.id }); });
  DB.leaves.forEach(l => { if (leaveCanAct(l) && (!imam || posById(l.pos).role === 'manager')) q.push({ k: 'leave', t: 'مرخصی', no: l.no, title: userById(l.uid).name + ' — ' + l.type, st: l.status, due: l.from, id: l.id }); });
  if (!imam) DB.movements.forEach(m => { const a = DB.assets.find(x => x.id === m.assetId); if (m.status === 'در انتظار تأیید' && canApproveMove(a)) q.push({ k: 'move', t: 'گردش کالا', no: m.no, title: m.type + ' — ' + a.name, st: m.status, due: m.date, id: m.id }); });
  DB.letters.forEach(l => {
    if (l.status !== 'ارجاع‌شده' || !canSeeLetter(l) || myRole() === 'staff') return;
    const last = l.refs[l.refs.length - 1];
    if (last && (last.unitId === myUnit())) q.push({ k: 'letter', t: 'نامه ارجاعی', no: fa(l.no), title: l.subject, st: l.priority !== 'عادی' ? l.priority : 'ارجاع‌شده', due: '', id: l.id });
  });
  DB.meetings.forEach(m => m.resolutions.forEach(x => { if (x.owner === ME.pos.id && x.status !== 'انجام‌شده') q.push({ k: 'meet', t: 'مصوبه جلسه', no: m.no, title: x.text, st: x.status, due: x.due, id: m.id }); }));
  return q.sort((a, b) => (a.due || '9999') > (b.due || '9999') ? 1 : -1);
}
const queueList = (q, n = 8) => q.length ? `<div class="list">${q.slice(0, n).map(x => `<a class="li" data-a="open" data-k="${x.k === 'leave' ? 'leave' : x.k === 'move' ? 'move' : x.k}" data-id="${x.id}"><div class="k">${ic({ req: 'inbox', task: 'check', order: 'flag', pay: 'wallet', res: 'door', leave: 'user', move: 'box', letter: 'mail', meet: 'cal' }[x.k])}</div><div class="t"><b>${esc(x.title)}</b><small>${x.t} · <span class="${x.k === 'letter' ? 'lno' : 'code'}">${esc(x.no)}</span>${x.due ? ' · مهلت ' + jd(x.due) : ''}</small></div>${pill(x.st)}</a>`).join('')}</div>` : empty('کاری در انتظار اقدام شما نیست.');
A.open_leave = d => showLeave(d.id);

/* ---------- کارتابل من (همه کارهای منتظر اقدام) ---------- */
PAGES.inbox = () => {
  const v = vs('inbox');
  const all = myQueue();
  const kinds = [...new Set(all.map(x => x.t))];
  const rows = all.filter(x => !v.t || x.t === v.t);
  return `${head('کارتابل من', `${fa(all.length)} مورد منتظر اقدام شما · ${esc(posLabel(ME.pos.id))}`)}
  ${kinds.length > 1 ? `<div class="chips">${['', ...kinds].map(k => `<button class="chip ${(v.t || '') === k ? 'on' : ''}" data-a="inboxF" data-v="${esc(k)}">${k || 'همه'} <b>${fa(k ? all.filter(x => x.t === k).length : all.length)}</b></button>`).join('')}</div>` : ''}
  <section class="card"><div class="cb flush">${queueList(rows, 500)}</div></section>`;
};
A.inboxF = d => { vs('inbox').t = d.v; route(); };

/* ---------- ثبت سریع (دکمه + در گوشی) ---------- */
A.quickAdd = () => {
  const items = [
    [myRole() !== 'staff', 'newReq', 'ثبت درخواست', 'inbox', {}],
    [can('letters.create'), 'newLetter', 'ثبت نامه', 'mail', {}],
    [isMgrOrOffice(myUnit()) && myUnit() > 0, 'newTask', 'وظیفه جدید', 'check', { u: myUnit() }],
    [isImam() || can('orders.issue'), 'newOrder', 'صدور دستور', 'flag', {}],
    [can('meetings.create'), 'newMeeting', 'ثبت جلسه', 'cal', {}],
    [true, 'newRes', 'درخواست رزرو', 'door', {}],
    [true, 'newLeave', 'درخواست مرخصی', 'user', {}],
    [can('finance.request') && !isImam(), 'newPay', 'درخواست پرداخت', 'wallet', {}],
    [can('admin.users'), 'admNewUser', 'کاربر جدید', 'users', {}]
  ].filter(x => x[0]);
  modal({ title: 'ثبت سریع', sheet: true, body: `<div class="quick big">${items.map(([, a, l, i, d]) => `<button class="qa" data-a="qaGo" data-go="${a}" ${Object.entries(d).map(([k, v]) => `data-${k}="${v}"`).join(' ')}>${ic(i)}<span>${l}</span></button>`).join('')}</div>` });
};
A.qaGo = d => { closeModal(); A[d.go](d); };

/* دامنه داده بر اساس جایگاه */
const scopeUnits = () => (isAll() ? UNITS.map(u => u.id).concat([0]) : [myUnit()]);
const inScope = u => scopeUnits().includes(+u);

function monthlyChart(unitFilter) {
  const [jy, jm] = isoToJ(todayISO());
  const groups = [];
  for (let i = 5; i >= 0; i--) {
    let m = jm - i, y = jy; while (m < 1) { m += 12; y--; }
    const from = jToIsoN(y, m, 1), to = jToIsoN(y, m, jMonthLen(y, m));
    const ts = DB.tasks.filter(t => unitFilter(t.unitId));
    groups.push({
      label: J_MONTHS[m - 1],
      a: ts.filter(t => t.doneAt && isoOfStamp(t.doneAt) >= from && isoOfStamp(t.doneAt) <= to).length + DB.requests.filter(r => unitFilter(r.toUnit) && r.doneAt && isoOfStamp(r.doneAt) >= from && isoOfStamp(r.doneAt) <= to).length,
      b: ts.filter(t => t.start >= from && t.start <= to).length + DB.requests.filter(r => unitFilter(r.toUnit) && isoOfStamp(r.created) >= from && isoOfStamp(r.created) <= to).length
    });
  }
  return barChart(groups, [{ k: 'b', l: 'ثبت‌شده', c: 'b2' }, { k: 'a', l: 'انجام‌شده', c: 'b1' }]);
}

/* ---------- داشبورد ---------- */
PAGES.dashboard = () => {
  const T = todayISO();
  const [jy, jm] = isoToJ(T);
  const mFrom = jToIsoN(jy, jm, 1);
  const q = myQueue();
  const L = DB.letters.filter(l => canSeeLetter(l) && l.date >= mFrom);
  const reqNew = DB.requests.filter(r => r.status === 'جاری' && r.stage === 1 && (isImam() || r.toUnit === myUnit()));
  const ord = DB.orders.filter(o => canSeeOrder(o) && o.status !== 'تکمیل‌شده');
  const open = [...DB.tasks.filter(t => canSeeTask(t) && t.status !== 'تکمیل‌شده').map(t => ({ ...t, k: 'task', st: taskStatus(t) })), ...ord.map(o => ({ ...o, k: 'order', st: orderStatus(o) }))];
  const near = open.filter(x => x.due && x.due >= T && daysBetween(T, x.due) <= 3);
  const late = open.filter(x => x.st === 'معوق');
  const today = [...DB.meetings.filter(m => canSeeMeeting(m) && m.date === T).map(m => ({ t: m.start, title: m.title, sub: m.place, k: 'meet', id: m.id, tag: m.kind })),
    ...DB.reservations.filter(r => r.date === T && r.status === 'تأییدشده').map(r => ({ t: r.start, title: r.kind, sub: resPlace(r) + (r.applicant ? ' · ' + r.applicant : ''), k: 'res', id: r.id, tag: 'رزرو' }))].sort(by('t'));
  const notifs = DB.notifs.filter(n => n.pos === ME.pos.id && !n.read).slice(-6).reverse();
  const acts = DB.audit.filter(a => isAll() || a.unit === myUnit()).slice(-8).reverse();
  const role = myRole();
  return `
  ${heroHTML()}
  <div class="tiles">
    ${tile('نامه‌های وارده / صادره', fa(L.filter(l => l.type === 'in').length) + ' / ' + fa(L.filter(l => l.type === 'out').length), J_MONTHS[jm - 1] + ' · ' + fa(L.filter(l => l.type === 'internal').length) + ' مکاتبه داخلی', '', 'letters')}
    ${tile('درخواست‌های جدید', reqNew.length, 'در مرحله ارجاع', reqNew.length ? 'warn' : '', 'requests')}
    ${tile('در انتظار اقدام شما', q.length, 'کارتابل شخصی', q.length ? 'warn' : 'ok')}
    ${tile('دستورات امام جماعت', ord.length, 'باز و در جریان', '', 'orders')}
    ${tile('نزدیک به موعد', near.length, 'تا ۳ روز آینده', near.length ? 'warn' : '', 'tasks')}
    ${tile('معوق', late.length, 'وظایف و دستورات', late.length ? 'bad' : 'ok', 'tasks')}
  </div>
  <div class="grid g-main">
    ${card('کارهای در انتظار اقدام', queueList(q, 9), `<small>${fa(q.length)} مورد</small>`, { flush: true })}
    ${card('جلسات و برنامه‌های امروز', today.length ? `<div class="list">${today.map(x => `<a class="li" data-a="open" data-k="${x.k}" data-id="${x.id}"><div class="k" style="width:52px">${fa(x.t)}</div><div class="t"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div>${pill(x.tag, 'info')}</a>`).join('')}</div>` : empty('برای امروز برنامه‌ای ثبت نشده است.'), `<a class="btn sm ghost" href="#calendar">تقویم</a>`, { flush: true })}
  </div>
  <div class="grid g3">
    ${card('دستورات امام جماعت', ord.length ? `<div class="list">${ord.slice(0, 5).map(o => `<a class="li" data-a="open" data-k="order" data-id="${o.id}"><div class="t"><b>${esc(o.title)}</b><small>${o.units.map(unitShort).join('، ')} · مهلت ${jd(o.due)}</small>${bar(o.progress, orderStatus(o) === 'معوق' ? 'bad' : '')}</div>${pill(orderStatus(o))}</a>`).join('')}</div>` : empty('دستور بازی وجود ندارد.'), '', { flush: true })}
    ${card('وظایف نزدیک به موعد و معوق', [...late, ...near].length ? `<div class="list">${[...late, ...near].slice(0, 6).map(x => `<a class="li" data-a="open" data-k="${x.k}" data-id="${x.id}"><div class="t"><b>${esc(x.title)}</b><small>${unitShort(x.unitId ?? x.units?.[0])} · <span class="code">${esc(x.no)}</span></small></div><div style="text-align:left;font-size:.78rem">${dueTxt(x.due)}</div></a>`).join('')}</div>` : empty('همه کارها در مهلت هستند.'), '', { flush: true })}
    ${card('اعلان‌های مهم', notifs.length ? `<div class="list">${notifs.map(n => `<a class="li" data-a="notif" data-id="${n.id}"><div class="k">${ic('bell')}</div><div class="t"><b>${esc(n.text)}</b><small>${jdt(n.ts)}</small></div></a>`).join('')}</div>` : empty('اعلان خوانده‌نشده‌ای ندارید.'), `<a class="btn sm ghost" href="#notifications">همه</a>`, { flush: true })}
  </div>
  <div class="grid g-main">
    ${card('نمودار عملکرد ماهانه', monthlyChart(inScope), `<small>وظایف و درخواست‌های ${isAll() ? 'همه مدیریت‌ها' : esc(unitShort(myUnit()))}</small>`)}
    ${card('آخرین اقدامات انجام‌شده', acts.length ? `<div class="list">${acts.map(a => `<div class="li"><div class="t"><b>${esc(a.act)}</b><small>${esc((userById(a.uid) || {}).name || 'سامانه')} · ${esc(a.note)} · ${jdt(a.ts)}</small></div></div>`).join('')}</div>` : empty('اقدامی ثبت نشده است.'), '', { flush: true })}
  </div>`;
};
A.notif = async d => { const n = DB.notifs.find(x => x.id === d.id); if (!n) return; await run('readNotif', n.id); location.hash = n.link; route(); };

/* ---------- کارتابل امام جماعت ---------- */
function unitStats(u, f, t) {
  const tk = DB.tasks.filter(x => x.unitId === u && inRange(x.start, f, t));
  const done = tk.filter(x => x.status === 'تکمیل‌شده');
  const durs = done.map(x => daysBetween(x.start, isoOfStamp(x.doneAt)));
  const rq = DB.requests.filter(r => r.toUnit === u && inRange(isoOfStamp(r.created), f, t));
  const rqDone = rq.filter(r => r.doneAt);
  const rdurs = rqDone.map(r => daysBetween(isoOfStamp(r.created), isoOfStamp(r.doneAt)));
  const ords = DB.orders.filter(o => o.units.includes(u));
  return {
    tasks: tk.length, done: done.length, late: tk.filter(x => taskStatus(x) === 'معوق').length,
    pct: tk.length ? Math.round((done.length / tk.length) * 100) : 0,
    avg: durs.concat(rdurs).length ? sum(durs.concat(rdurs)) / durs.concat(rdurs).length : null,
    letters: DB.letters.filter(l => l.unitId === u && inRange(l.date, f, t)).length,
    reqOpen: rq.filter(r => r.status === 'جاری').length, reqLate: rq.filter(r => r.status === 'جاری' && r.due && r.due < todayISO()).length,
    ordOpen: ords.filter(o => o.status !== 'تکمیل‌شده').length, ordLate: ords.filter(o => orderStatus(o) === 'معوق').length
  };
}
PAGES.imam = () => {
  if (!isAll()) return denied();
  const q = myQueue();
  const stats = UNITS.map(u => ({ id: u.id, u, ...unitStats(u.id) }));
  const lateOrders = DB.orders.filter(o => orderStatus(o) === 'معوق');
  const lateTasks = DB.tasks.filter(t => taskStatus(t) === 'معوق');
  const lateReq = DB.requests.filter(r => r.status === 'جاری' && r.due && r.due < todayISO());
  const pays = DB.payreqs.filter(p => p.status === 'جاری');
  return `
  ${head('کارتابل امام جماعت', 'نظارت عالی بر روند امور ۱۷ مدیریت، تصویب موارد ارجاعی و صدور دستور', btn('صدور دستور جدید', 'newOrder', {}, '', 'flag') + btn('ثبت جلسه / ملاقات', 'newMeeting', {}, 'ghost', 'cal') + `<a class="btn ghost" href="#reports">${ic('chart')}گزارش نظارتی</a>`)}
  <div class="tiles">
    ${tile('منتظر تصویب شما', q.length, 'دستور، درخواست، پرداخت', q.length ? 'warn' : 'ok')}
    ${tile('دستورات معوق', lateOrders.length, 'از ' + fa(DB.orders.filter(o => o.status !== 'تکمیل‌شده').length) + ' دستور باز', lateOrders.length ? 'bad' : 'ok', 'orders')}
    ${tile('وظایف معوق', lateTasks.length, 'در همه مدیریت‌ها', lateTasks.length ? 'bad' : 'ok')}
    ${tile('درخواست‌های معوق', lateReq.length, 'گذشته از مهلت', lateReq.length ? 'bad' : 'ok')}
    ${tile('درخواست‌های پرداخت جاری', pays.length, money(sum(pays, p => p.amount)), '', 'finance')}
  </div>
  <div class="grid g-main">
    ${card('موارد منتظر تصویب مدیریت عالی', queueList(q, 12), `<small>${fa(q.length)} مورد</small>`, { flush: true })}
    ${card('معوق‌ها', [...lateOrders.map(o => ['order', o.id, 'دستور', o.title, o.units.map(unitShort).join('، '), o.due]), ...lateReq.map(r => ['req', r.id, 'درخواست', r.title, unitShort(r.toUnit), r.due]), ...lateTasks.map(t => ['task', t.id, 'وظیفه', t.title, unitShort(t.unitId), t.due])].map(([k, id, t, title, u, due]) => `<a class="li" data-a="open" data-k="${k}" data-id="${id}"><div class="t"><b>${esc(title)}</b><small>${t} · ${esc(u)}</small></div><div style="font-size:.78rem;text-align:left">${dueTxt(due)}</div></a>`).join('') || empty('مورد معوقی وجود ندارد.'), '', { flush: true })}
  </div>
  ${card('عملکرد مدیریت‌ها', table([
    ['مدیریت', r => `<a href="#unit-${r.id}">${esc(r.u.name)}</a>`],
    ['وظایف', r => fa(r.tasks)], ['تکمیل', r => `<div class="row" style="flex-wrap:nowrap">${bar(r.pct, r.pct < 40 ? 'bad' : r.pct < 70 ? 'warn' : '')}<span class="num">${fa(r.pct)}٪</span></div>`],
    ['معوق', r => (r.late ? pill(fa(r.late), 'bad') : fa(0))], ['دستورات باز', r => fa(r.ordOpen) + (r.ordLate ? ' ' + pill(fa(r.ordLate) + ' معوق', 'bad') : '')],
    ['درخواست باز', r => fa(r.reqOpen)], ['میانگین رسیدگی', r => (r.avg == null ? '—' : fa(r.avg.toFixed(1)) + ' روز')]
  ], stats), '', { flush: true })}`;
};
const denied = (t = 'دسترسی به این بخش برای جایگاه شما تعریف نشده است.') => `${head('دسترسی محدود')}<section class="card"><div class="cb">${empty(ic('lock') + '<br>' + t)}</div></section>`;

/* ---------- فهرست ۱۷ مدیریت ---------- */
PAGES.units = () => `
  ${head('مدیریت‌های مجتمع', 'هفده مدیریت مستقل مستقیماً زیر نظر امام جماعت؛ هر مدیریت دارای مدیر، مسئول دفتر و منشی')}
  <section class="card"><div class="cb" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <div class="li" style="border:0;padding:0;cursor:default"><div class="k" style="width:46px;height:46px">${ic('dome')}</div><div class="t"><b>امام جماعت مسجد شباب اهل‌الجنه — مدیریت عالی مجتمع</b><small>${esc(holderOf('P0').name)}</small></div></div>
  </div></section>
  <div class="units">${UNITS.filter(u => !u.off || isAll()).map(u => {
    const s = unitStats(u.id); const ok = canSeeUnit(u.id);
    const tag = ok ? 'a' : 'div';
    return `<${tag} class="unit ${ok ? '' : 'locked'}" ${ok ? `href="#unit-${u.id}"` : ''}>
      <div class="uh"><div class="k">${ic(u.ic)}</div><div><b>${esc(u.name)}</b><small>مدیر: ${esc((holderOf(`P${u.id}-m`) || {}).name || '—')}</small></div></div>
      ${ok ? `<div class="row" style="flex-wrap:nowrap">${bar(s.pct)}<small class="num">${fa(s.pct)}٪</small></div><div class="us"><span>وظایف باز <b>${fa(s.tasks - s.done)}</b></span><span>معوق <b style="color:var(${s.late ? '--bad' : '--fg'})">${fa(s.late)}</b></span><span>درخواست <b>${fa(s.reqOpen)}</b></span></div>`
        : `<div class="us">اطلاعات داخلی این مدیریت فقط برای خود آن مدیریت و امام جماعت قابل مشاهده است.</div><div>${btn('درخواست همکاری', 'newReq', { to: u.id }, 'sm soft')}</div>`}
    </${tag}>`;
  }).join('')}</div>`;

/* ---------- کارتابل اختصاصی مدیریت ---------- */
function pgUnit(u) {
  const U = UNITS.find(x => x.id === u);
  if (!U) return denied('مدیریت یافت نشد.');
  if (!canSeeUnit(u)) return denied('کارتابل داخلی این مدیریت فقط برای کارکنان همان مدیریت و امام جماعت قابل مشاهده است. برای همکاری از «درخواست‌های داخلی» استفاده کنید.');
  const v = vs('unit' + u, { tab: 'overview' });
  const regs = REGISTRIES[u] || [];
  const tl = [['overview', 'نمای کلی'], ['services', 'حوزه‌ها و خدمات'], ...regs.map(r => ['reg:' + r.key, r.title]), ['tasks', 'وظایف'], ['requests', 'درخواست‌ها'], ['letters', 'مکاتبات'], ['orders', 'دستورات']];
  if (u === U_INTERNAL) tl.splice(2, 0, ['assets', 'اموال و انبار']);
  const s = unitStats(u);
  const P = unitPositions(u);
  let body = '';
  const tasks = DB.tasks.filter(t => t.unitId === u && canSeeTask(t));
  const reqs = DB.requests.filter(r => (r.toUnit === u || r.fromUnit === u || r.coops.includes(u)) && canSeeReq(r));
  switch (true) {
    case v.tab === 'overview': {
      const q = myQueue();
      body = `<div class="tiles">${tile('وظایف', s.tasks)}${tile('تکمیل‌شده', fa(s.pct) + '٪', fa(s.done) + ' مورد', 'ok')}${tile('معوق', s.late, '', s.late ? 'bad' : 'ok')}${tile('درخواست‌های باز', s.reqOpen)}${tile('دستورات باز', s.ordOpen, s.ordLate ? fa(s.ordLate) + ' معوق' : '', s.ordLate ? 'bad' : '')}${tile('مکاتبات', s.letters)}</div>
      <div class="grid g-main">${card('کارهای در انتظار اقدام من', queueList(q, 8), '', { flush: true })}
      ${card('جایگاه‌های سازمانی', `<div class="list">${P.map(p => `<div class="li"><div class="k">${ic('user')}</div><div class="t"><b>${esc(p.title)}</b><small>${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</small></div>${pill(ROLES[p.role], 'mute')}</div>`).join('')}</div>`, '', { flush: true })}</div>
      ${card('روند ماهانه', monthlyChart(x => x === u))}`;
      break;
    }
    case v.tab === 'services':
      body = `<div class="units">${SERVICES[u].map(sv => { const rs = DB.requests.filter(r => r.toUnit === u && r.cat === sv); return `<div class="unit"><div class="uh"><div class="k">${ic(U.ic)}</div><div><b>${esc(sv)}</b><small>${fa(rs.filter(r => r.status === 'جاری').length)} درخواست جاری · ${fa(rs.filter(r => r.status === 'بایگانی').length)} انجام‌شده</small></div></div><div class="row">${btn('ثبت درخواست', 'newReq', { to: u, cat: sv }, 'sm soft', 'plus')}${btn('مشاهده', 'unitSvc', { u, cat: sv }, 'sm ghost')}</div></div>`; }).join('')}</div>
      ${u === 9 || u === 10 ? `<div class="notice warn">اطلاعات پزشکی بیماران در این کارتابل ثبت نمی‌شود. تصمیمات فنی در اختیار مسئول فنی ${u === 9 ? 'درمانگاه' : 'داروخانه'} است و این کارتابل فقط امور اجرایی را پوشش می‌دهد.</div>` : ''}
      ${u === 12 ? `<div class="notice warn">گزارش‌های خیریه محرمانه است؛ هویت خیرین و مددجویان فقط برای کارکنان مدیریت خیریه و امام جماعت نمایش داده می‌شود.</div>` : ''}`;
      break;
    case v.tab.startsWith('reg:'): {
      const R = regs.find(r => 'reg:' + r.key === v.tab);
      const rows = reg(u, R.key).slice().reverse();
      body = card(R.title, table(R.fields.map(([k, l, t]) => [l, r => t === 'date' ? jd(r[k]) : t === 'number' ? (k === 'progress' ? `<div class="row" style="flex-wrap:nowrap">${bar(r[k])}<span class="num">${fa(r[k])}٪</span></div>` : /amount|budget|spent/.test(k) ? money(r[k]) : numFa(r[k])) : (TONES.ok.concat(TONES.bad, TONES.warn).includes(r[k]) ? pill(r[k]) : esc(r[k] || '—'))]).concat(u === 10 ? [['هشدار', r => (+r.qty < +r.min ? pill('کمتر از حداقل', 'bad') : pill('کافی', 'ok'))]] : []), rows, { empty: 'هنوز رکوردی ثبت نشده است.' }),
        inUnit(u) ? btn('ثبت مورد جدید', 'newRec', { u, key: R.key }, 'sm', 'plus') : '', { flush: true });
      break;
    }
    case v.tab === 'assets': body = card('اموال تحت مدیریت داخلی', assetTable(DB.assets.filter(canSeeAsset)), `<a class="btn sm ghost" href="#assets">سامانه اموال</a>`, { flush: true }); break;
    case v.tab === 'tasks': body = card('وظایف مدیریت', taskTable(tasks), isMgrOrOffice(u) ? btn('وظیفه جدید', 'newTask', { u }, 'sm', 'plus') : '', { flush: true }); break;
    case v.tab === 'requests': body = card('درخواست‌های مرتبط', reqTable(reqs), btn('درخواست همکاری', 'newReq', {}, 'sm', 'plus'), { flush: true }); break;
    case v.tab === 'letters': body = card('مکاتبات مدیریت', letterTable(DB.letters.filter(l => canSeeLetter(l) && (l.unitId === u || l.refs.some(r => r.unitId === u)))), isClerk(u) ? btn('ثبت نامه', 'newLetter', {}, 'sm', 'plus') : '', { flush: true }); break;
    case v.tab === 'orders': body = card('دستورات امام جماعت برای این مدیریت', orderTable(DB.orders.filter(o => o.units.includes(u))), '', { flush: true }); break;
  }
  return `${head(esc(U.name), `مدیر: ${esc((holderOf(`P${u}-m`) || {}).name || '—')} · مسئول دفتر: ${esc((holderOf(`P${u}-o`) || {}).name || '—')} · منشی: ${esc((holderOf(`P${u}-s`) || {}).name || '—')}`, isMgrOrOffice(u) ? btn('وظیفه جدید', 'newTask', { u }, 'soft', 'plus') : '', '<a href="#units">مدیریت‌ها</a> / کارتابل اختصاصی')}
  ${tabs('unit' + u, tl, v.tab)}${body}`;
}
A.unitSvc = d => { vs('requests').cat = d.cat; vs('requests').tab = 'in'; location.hash = 'requests'; };
A.newRec = d => {
  const R = REGISTRIES[d.u].find(r => r.key === d.key);
  formModal('ثبت در «' + R.title + '»', R.fields.map(([k, l, t]) => Array.isArray(t) ? { k, l, t: 'select', o: t } : { k, l, t: t || 'text', req: k === 'title' }), { date: todayISO() }, v => run('addRecord', +d.u, d.key, v));
};

/* ---------- دبیرخانه ---------- */
function letterTable(rows) {
  return table([
    ['شماره', l => `<span class="lno">${fa(l.no)}</span><span class="sub">${LETTER_TYPES[l.type]}</span>`],
    ['موضوع', l => `<b>${esc(l.conf === 'سری' && !isImam() && myRole() !== 'manager' ? 'محرمانه' : l.subject)}</b><span class="sub">${esc(l.type === 'in' ? 'از: ' + l.sender : 'به: ' + l.receiver)}</span>`],
    ['تاریخ', l => jd(l.date)], ['مدیریت', l => esc(unitShort(l.unitId))],
    ['اهمیت / محرمانگی', l => `${prio(l.priority)} ${l.conf !== 'عادی' ? pill(l.conf) : ''}${l.files.length ? ' ' + ic('clip') : ''}`],
    ['وضعیت', l => pill(l.status) + (l.needReply && !l.replies.length ? '<span class="sub">نیازمند پاسخ</span>' : '')]
  ], rows.sort(by('created', -1)), { click: 'letter', empty: 'نامه‌ای یافت نشد.' });
}
PAGES.letters = () => {
  const v = vs('letters', { tab: 'all' });
  let rows = DB.letters.filter(canSeeLetter);
  if (v.tab !== 'all') rows = v.tab === 'archive' ? rows.filter(l => l.status === 'بایگانی') : rows.filter(l => l.type === v.tab && l.status !== 'بایگانی');
  rows = rows.filter(l => textMatch(v.q, l.no, fa(l.no), l.subject, l.sender, l.receiver, l.body) && (!v.cat || l.cat === v.cat) && (!v.pr || l.priority === v.pr) && (!v.conf || l.conf === v.conf) && (!v.st || l.status === v.st) && (v.u === undefined || v.u === '' || l.unitId === +v.u) && inRange(l.date, v.f, v.t));
  const all = DB.letters.filter(canSeeLetter);
  return `${head('دبیرخانه و مکاتبات', 'ثبت نامه‌های وارده، صادره و داخلی با شماره‌گذاری خودکار، ارجاع، پاسخ و آرشیو دائمی', can('letters.create') ? btn('ثبت نامه', 'newLetter', {}, '', 'plus') : '')}
  ${tabs('letters', [['all', `همه (${fa(all.length)})`], ['in', 'وارده'], ['out', 'صادره'], ['internal', 'داخلی'], ['archive', 'آرشیو']], v.tab)}
  <section class="card">${filterBar('letters', [{ k: 'q', t: 'search', l: 'جست‌وجو در شماره، موضوع، فرستنده، متن…' }, { k: 'cat', l: 'طبقه‌بندی', o: LETTER_CATS }, { k: 'pr', l: 'اهمیت', o: PRIORITIES }, { k: 'conf', l: 'محرمانگی', o: CONF }, { k: 'st', l: 'وضعیت', o: ['ثبت‌شده', 'ارجاع‌شده', 'پاسخ داده‌شده', 'بایگانی'] }, ...(isAll() ? [{ k: 'u', l: 'مدیریت', o: unitOpts() }] : []), { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
  <div class="cb flush">${letterTable(rows)}</div></section>`;
};
A.letter = d => showLetter(d.id);
A.newLetter = () => {
  const u = myUnit();
  formModal('ثبت نامه', [
    { k: 'type', l: 'نوع نامه', t: 'select', o: Object.entries(LETTER_TYPES), req: true, blank: false },
    { k: 'subject', l: 'موضوع', req: true, full: true },
    { k: 'cat', l: 'طبقه‌بندی', t: 'select', o: LETTER_CATS, blank: false },
    { k: 'date', l: 'تاریخ نامه', t: 'date', req: true },
    { k: 'sender', l: 'فرستنده', req: true }, { k: 'receiver', l: 'گیرنده', req: true },
    { k: 'toUnit', l: 'مدیریت گیرنده (برای مکاتبه داخلی)', t: 'select', o: unitOpts(true).filter(x => x[0] !== u) },
    { k: 'priority', l: 'درجه اهمیت', t: 'select', o: PRIORITIES, blank: false },
    { k: 'conf', l: 'سطح محرمانگی', t: 'select', o: CONF, blank: false },
    { k: 'signer', l: 'امضاکننده (صادره)', t: 'select', o: posOpts(u) },
    { k: 'needReply', l: 'پیگیری پاسخ', t: 'check', cl: 'این نامه نیازمند پاسخ است' },
    { k: 'body', l: 'متن نامه', t: 'textarea' }, { k: 'files', l: 'ضمایم', t: 'file' }
  ], { type: 'in', date: todayISO(), cat: 'اداری', priority: 'عادی', conf: 'عادی', sender: '', receiver: unitName(u), signer: unitPos(u, 'manager')?.id },
  v => { if (v.type === 'internal' && v.toUnit === '') return fail('برای مکاتبه داخلی، مدیریت گیرنده را انتخاب کنید.'); return run('createLetter', { ...v, unitId: u }); },
  { wide: true, done: 'نامه ثبت و شماره‌گذاری شد.', reopen: l => showLetter(l.id) });
};
function letterSheet(l) {
  const sg = l.signer ? holderOf(l.signer) : null;
  return `<div class="letter print-target">
    <div class="lh">
      <div class="logo">${ic('dome')}</div>
      <div class="mid"><div class="bs">بسمه تعالی</div><b>${esc(DB.settings.orgName)}</b><small>${esc(unitName(l.unitId))}</small></div>
      <div class="meta"><div><span>شماره: </span>${fa(l.no)}</div><div><span>تاریخ: </span>${jd(l.date)}</div><div><span>پیوست: </span>${l.files.length ? fa(l.files.length) + ' برگ' : 'ندارد'}</div></div>
    </div>
    ${l.conf !== 'عادی' ? `<div class="stamp">${esc(l.conf)}</div>` : ''}
    <div><b>${l.type === 'in' ? 'از' : 'به'}:</b> ${esc(l.type === 'in' ? l.sender : l.receiver)}</div>
    ${l.type !== 'in' ? `<div><b>از:</b> ${esc(l.sender)}</div>` : `<div><b>به:</b> ${esc(l.receiver)}</div>`}
    <div><b>موضوع:</b> ${esc(l.subject)}</div><br>
    <div class="body">${esc(l.body || '—')}</div>
    ${l.type !== 'in' && sg ? `<div class="sign"><b>${esc(sg.name)}</b>${esc(posLabel(l.signer))}</div>` : ''}
  </div>`;
}
function showLetter(id) {
  const l = DB.letters.find(x => x.id === id);
  if (!l || !canSeeLetter(l)) return toast('دسترسی به این نامه مجاز نیست.');
  audit('مشاهده نامه', 'letter', l.id, l.no); Store.save();
  const can = isClerk(myUnit()) || isImam();
  modal({
    title: `نامه ${LETTER_TYPES[l.type]} ${fa(l.no)}`, wide: true,
    body: `<div class="row">${pill(l.status)} ${prio(l.priority)} ${l.conf !== 'عادی' ? pill(l.conf) : ''} ${pill(l.cat, 'mute')}</div>
    ${letterSheet(l)}
    ${l.files.length ? `<div><h3>ضمایم</h3>${files(l.files)}${l.conf === 'عادی' || isMgrOrOffice(l.unitId) ? l.files.filter(f => (f.data || f.url) && (f.type || '').startsWith('image/')).map(f => `<img src="${esc(f.data || f.url)}" alt="${esc(f.name)}" style="max-height:200px;border-radius:8px;margin-top:8px">`).join('') : '<div class="hint">مشاهده ضمایم محرمانه فقط برای مدیر و مسئول دفتر مجاز است.</div>'}</div>` : ''}
    <div class="grid g2"><div><h3>ارجاعات</h3>${l.refs.length ? `<div class="list">${l.refs.map(r => `<div class="li" style="padding:6px 0"><div class="t"><b>${esc(unitName(r.unitId))}</b><small>${jdt(r.ts)} · ${esc(userById(r.by)?.name || '')}${r.note ? ' — ' + esc(r.note) : ''}</small></div></div>`).join('')}</div>` : empty('ارجاع نشده است.')}</div>
    <div><h3>پاسخ‌ها</h3>${l.replies.length ? l.replies.map(r => `<div class="box">${esc(r.text)}<div class="hint">${esc(userById(r.by)?.name)} · ${jdt(r.ts)}</div></div>`).join('') : empty(l.needReply ? 'در انتظار پاسخ' : 'پاسخی ثبت نشده است.')}</div></div>
    <div><h3>سابقه اقدامات</h3>${histHTML(l.history)}</div>`,
    foot: `${editBtn('letter', l)}${can && l.status !== 'بایگانی' ? btn('ارجاع', 'letterRefer', { id }, '', 'send') + btn('ثبت پاسخ', 'letterReply', { id }, 'ghost') + btn('بایگانی', 'letterArchive', { id }, 'ghost', 'archive') : ''}${CAN_PRINT ? btn('چاپ / PDF', 'print', {}, 'ghost', 'print') : '<span class="hint" style="align-self:center">چاپ و خروجی PDF در نسخه مستقر روی سرور فعال است.</span>'}`
  });
  MODAL_REOPEN = () => showLetter(id);
}
A.letterRefer = d => { const l = DB.letters.find(x => x.id === d.id); actModal('ارجاع نامه ' + fa(l.no), v => run('referLetter', l.id, v.unit, v.note), { fields: [{ k: 'unit', l: 'ارجاع به', t: 'select', o: unitOpts(true), req: true }], noteLabel: 'دستور ارجاع', reopen: () => showLetter(l.id), done: 'نامه ارجاع شد.' }); };
A.letterReply = d => { const l = DB.letters.find(x => x.id === d.id); actModal('ثبت پاسخ نامه ' + fa(l.no), v => run('replyLetter', l.id, v.note), { noteReq: true, noteLabel: 'متن پاسخ', reopen: () => showLetter(l.id) }); };
A.letterArchive = async d => { const r = await run('archiveLetter', d.id); if (r.error) return toast(r.error); refresh(); showLetter(d.id); toast('نامه بایگانی شد.'); };
A.print = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); };

/* ---------- دستورات امام جماعت ---------- */
function orderTable(rows) {
  return table([
    ['شماره', o => `<span class="code">${esc(o.no)}</span>`], ['عنوان دستور', o => `<b>${esc(o.title)}</b><span class="sub">${o.units.map(unitShort).join('، ')}</span>`],
    ['مسئول اصلی', o => esc(posLabel(o.respPos))], ['صدور', o => jd(o.issued)], ['مهلت', o => dueTxt(o.status === 'تکمیل‌شده' ? '' : o.due)],
    ['پیشرفت', o => `<div class="row" style="flex-wrap:nowrap">${bar(o.progress, orderStatus(o) === 'معوق' ? 'bad' : '')}<span class="num">${fa(o.progress)}٪</span></div>`],
    ['وضعیت', o => `${pill(orderStatus(o))} ${prio(o.priority)}`]
  ], rows.sort(by('issued', -1)), { click: 'order', empty: 'دستوری ثبت نشده است.' });
}
PAGES.orders = () => {
  const v = vs('orders');
  const rows = DB.orders.filter(o => canSeeOrder(o) && (!v.st || orderStatus(o) === v.st) && (!v.u || o.units.includes(+v.u)) && (!v.pr || o.priority === v.pr) && textMatch(v.q, o.no, o.title, o.desc));
  const all = DB.orders.filter(canSeeOrder);
  return `${head('دستورات امام جماعت', 'دستورات مستقیم مدیریت عالی با تعیین مسئول، مهلت، اولویت و پیگیری تا تأیید نهایی', isImam() || can('orders.issue') ? btn('صدور دستور جدید', 'newOrder', {}, '', 'flag') : '')}
  <div class="tiles">${['جدید', 'در حال بررسی', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده', 'معوق'].map(s => tile(s, all.filter(o => orderStatus(o) === s).length, '', s === 'معوق' ? 'bad' : s === 'منتظر تأیید' ? 'warn' : s === 'تکمیل‌شده' ? 'ok' : '')).join('')}</div>
  <section class="card">${filterBar('orders', [{ k: 'q', t: 'search', l: 'جست‌وجو در دستورات…' }, { k: 'st', l: 'وضعیت', o: [...ORDER_ST, 'معوق'] }, { k: 'pr', l: 'اهمیت', o: PRIORITIES }, ...(isAll() ? [{ k: 'u', l: 'مدیریت', o: unitOpts() }] : [])])}<div class="cb flush">${orderTable(rows)}</div></section>`;
};
A.order = d => showOrder(d.id);
A.newOrder = () => formModal('صدور دستور امام جماعت', [
  { k: 'title', l: 'عنوان دستور', req: true, full: true }, { k: 'desc', l: 'شرح کامل', t: 'textarea', req: true },
  { k: 'units', l: 'مدیریت یا مدیریت‌های مسئول', t: 'multi', o: unitOpts(), req: true },
  { k: 'respPos', l: 'مسئول اصلی اقدام', t: 'select', o: UNITS.map(u => ({ group: u.name, items: posOpts(u.id) })), req: true },
  { k: 'priority', l: 'درجه اهمیت', t: 'select', o: PRIORITIES, blank: false },
  { k: 'issued', l: 'تاریخ صدور', t: 'date', req: true }, { k: 'due', l: 'مهلت انجام', t: 'date', req: true },
  { k: 'needReport', l: 'گزارش نهایی', t: 'check', cl: 'ارائه گزارش نهایی الزامی است' }, { k: 'files', l: 'فایل‌های ضمیمه', t: 'file' }
], { issued: todayISO(), due: addDays(todayISO(), 7), priority: 'عادی', needReport: true }, v => {
  const ru = String((posById(v.respPos) || {}).unitId);
  if (!v.units.includes(ru)) v.units.push(ru);
  return run('createOrder', v);
}, { wide: true, submit: 'صدور دستور', done: 'دستور صادر و به مدیریت‌های مسئول ابلاغ شد.', reopen: o => showOrder(o.id) });
function showOrder(id) {
  const o = DB.orders.find(x => x.id === id);
  if (!o || !canSeeOrder(o)) return toast('دسترسی به این دستور مجاز نیست.');
  const st = orderStatus(o);
  const canRep = !isImam() && o.units.some(u => isMgrOrOffice(u)) && !['تکمیل‌شده', 'منتظر تأیید'].includes(o.status);
  modal({
    title: 'دستور ' + o.no, wide: true,
    body: `<div><h2>${esc(o.title)}</h2><div class="row">${pill(st)} ${prio(o.priority)} ${o.needReport ? pill('نیازمند گزارش نهایی', 'info') : ''}</div></div>
    ${steps(ORDER_ST, ORDER_ST.indexOf(o.status), o.status === 'تکمیل‌شده')}
    <div class="box">${esc(o.desc)}</div>
    ${kv([['مدیریت‌های مسئول', o.units.map(unitName).join('، ')], ['مسئول اصلی اقدام', esc(posWho(o.respPos))], ['تاریخ صدور', jd(o.issued)], ['مهلت انجام', dueTxt(o.status === 'تکمیل‌شده' ? '' : o.due)], ['پیشرفت', `<div class="row">${bar(o.progress)}<span>${fa(o.progress)}٪</span></div>`], o.files.length && ['ضمایم', files(o.files)]])}
    <div><h3>گزارش‌های پیشرفت</h3>${o.reports.length ? o.reports.slice().reverse().map(r => `<div class="box" style="margin-bottom:6px">${esc(r.note || '—')}<div class="hint">${esc(userById(r.by)?.name)} · ${esc(posLabel(r.pos))} · ${jdt(r.ts)} · ${fa(r.progress)}٪</div>${files(r.files)}</div>`).join('') : empty('هنوز گزارشی ثبت نشده است.')}</div>
    <div><h3>سابقه</h3>${histHTML(o.history)}</div>`,
    foot: `${editBtn('order', o)}${canRep ? btn('ثبت گزارش پیشرفت', 'orderRep', { id }, '', 'send') : ''}${isImam() && o.status === 'منتظر تأیید' ? btn('تأیید و تکمیل', 'orderOk', { id }) + btn('بازگشت برای اصلاح', 'orderBack', { id }, 'danger') : ''}`
  });
}
A.orderRep = d => { const o = DB.orders.find(x => x.id === d.id); actModal('گزارش پیشرفت دستور', v => run('orderReport', o.id, v), { fields: [{ k: 'status', l: 'وضعیت', t: 'select', o: ['در حال بررسی', 'در حال انجام', 'منتظر تأیید'], blank: false }, { k: 'progress', l: 'درصد پیشرفت', t: 'number' }, { k: 'files', l: 'پیوست گزارش', t: 'file' }], init: { status: o.status === 'جدید' ? 'در حال بررسی' : o.status, progress: o.progress }, noteLabel: 'شرح گزارش (برای ارسال نهایی، گزارش نهایی را بنویسید)', reopen: () => showOrder(o.id) }); };
A.orderOk = d => { const o = DB.orders.find(x => x.id === d.id); actModal('تأیید نهایی دستور', v => run('orderDecide', o.id, true, v.note), { submit: 'تأیید و تکمیل', reopen: () => showOrder(o.id) }); };
A.orderBack = d => { const o = DB.orders.find(x => x.id === d.id); actModal('بازگشت دستور برای اصلاح', v => run('orderDecide', o.id, false, v.note), { noteReq: true, noteLabel: 'دلیل بازگشت', reopen: () => showOrder(o.id) }); };

/* ---------- ارجاع وظایف ---------- */
function taskTable(rows) {
  return table([
    ['شماره پیگیری', t => `<span class="code">${esc(t.no)}</span>`], ['عنوان', t => `<b>${esc(t.title)}</b><span class="sub">${esc(unitShort(t.unitId))}</span>`],
    ['مسئول انجام', t => esc(posWho(t.assignee))], ['شروع', t => jd(t.start)], ['مهلت', t => dueTxt(t.status === 'تکمیل‌شده' ? '' : t.due)],
    ['وضعیت', t => `${pill(taskStatus(t))} ${prio(t.priority)}`]
  ], rows.sort((a, b) => ((a.status === 'تکمیل‌شده') - (b.status === 'تکمیل‌شده')) || (a.due > b.due ? 1 : -1)), { click: 'task', empty: 'وظیفه‌ای یافت نشد.' });
}
PAGES.tasks = () => {
  const v = vs('tasks', { tab: 'all' });
  let rows = DB.tasks.filter(canSeeTask);
  const all = rows;
  if (v.tab === 'mine') rows = rows.filter(t => t.assignee === ME.pos.id);
  if (v.tab === 'late') rows = rows.filter(t => taskStatus(t) === 'معوق');
  if (v.tab === 'approve') rows = rows.filter(t => t.status === 'منتظر تأیید');
  rows = rows.filter(t => (!v.st || taskStatus(t) === v.st) && (!v.u || t.unitId === +v.u) && (!v.pr || t.priority === v.pr) && textMatch(v.q, t.no, t.title, t.desc));
  return `${head('ارجاع وظایف', 'تعریف وظیفه با شماره پیگیری، مسئول، مهلت و ثبت کامل تاریخچه تغییر وضعیت؛ ارجاع بین مدیریت‌ها فقط از مسیر درخواست همکاری', `${isMgrOrOffice(myUnit()) && !isImam() ? btn('وظیفه جدید', 'newTask', { u: myUnit() }, '', 'plus') : ''}${btn('درخواست همکاری از مدیریت دیگر', 'newReq', { cat: 'همکاری میان‌بخشی' }, 'ghost')}`)}
  ${tabs('tasks', [['all', `همه (${fa(all.length)})`], ['mine', `ارجاع‌شده به من (${fa(all.filter(t => t.assignee === ME.pos.id && t.status !== 'تکمیل‌شده').length)})`], ['approve', 'منتظر تأیید'], ['late', `معوق (${fa(all.filter(t => taskStatus(t) === 'معوق').length)})`]], v.tab)}
  <section class="card">${filterBar('tasks', [{ k: 'q', t: 'search', l: 'جست‌وجو در شماره یا عنوان…' }, { k: 'st', l: 'وضعیت', o: [...TASK_ST, 'معوق'] }, { k: 'pr', l: 'اولویت', o: PRIORITIES }, ...(isAll() ? [{ k: 'u', l: 'مدیریت', o: unitOpts() }] : [])])}<div class="cb flush">${taskTable(rows)}</div></section>`;
};
A.task = d => showTask(d.id);
A.newTask = d => {
  const u = +d.u;
  formModal('تعریف وظیفه — ' + unitShort(u), [
    { k: 'title', l: 'عنوان وظیفه', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' },
    { k: 'assignee', l: 'مسئول انجام', t: 'select', o: posOpts(u), req: true }, { k: 'priority', l: 'اولویت', t: 'select', o: PRIORITIES, blank: false },
    { k: 'start', l: 'تاریخ شروع', t: 'date', req: true }, { k: 'due', l: 'مهلت', t: 'date', req: true }, { k: 'files', l: 'فایل ضمیمه', t: 'file' }
  ], { start: todayISO(), due: addDays(todayISO(), 5), priority: 'عادی' }, v => run('createTask', { ...v, unitId: u }), { done: 'وظیفه ثبت و ارجاع شد.', reopen: t => showTask(t.id) });
};
function showTask(id) {
  const t = DB.tasks.find(x => x.id === id);
  if (!t || !canSeeTask(t)) return toast('دسترسی به این وظیفه مجاز نیست.');
  const acts = taskActions(t);
  modal({
    title: 'وظیفه ' + t.no, wide: true,
    body: `<div><h2>${esc(t.title)}</h2><div class="row">${pill(taskStatus(t))} ${prio(t.priority)}</div></div>
    ${steps(TASK_ST, TASK_ST.indexOf(t.status), t.status === 'تکمیل‌شده')}
    ${t.desc ? `<div class="box">${esc(t.desc)}</div>` : ''}
    ${kv([['مدیریت', esc(unitName(t.unitId))], ['مسئول انجام', esc(posWho(t.assignee))], ['تاریخ شروع', jd(t.start)], ['مهلت', dueTxt(t.status === 'تکمیل‌شده' ? '' : t.due)], ['ثبت‌کننده', esc(userById(t.by)?.name || 'سامانه')], t.files.length && ['ضمایم', files(t.files)]])}
    <div><h3>تاریخچه اقدامات</h3>${histHTML(t.history)}</div>`,
    foot: acts.map(([k, l]) => btn(l, 'taskAct', { id, act: k }, k === 'return' ? 'danger' : k === 'note' || k === 'reassign' ? 'ghost' : '')).join('') + editBtn('task', t)
  });
}
A.taskAct = d => {
  const t = DB.tasks.find(x => x.id === d.id);
  const lbl = taskActions(t).find(x => x[0] === d.act)[1];
  actModal(lbl, v => run('taskAct', t.id, d.act, v.note, v.to), { fields: d.act === 'reassign' ? [{ k: 'to', l: 'ارجاع به', t: 'select', o: posOpts(t.unitId), req: true }] : [], noteReq: ['return', 'note'].includes(d.act), reopen: () => showTask(t.id) });
};

/* ---------- درخواست‌های داخلی ---------- */
function reqTable(rows) {
  return table([
    ['کد پیگیری', r => `<span class="code">${esc(r.no)}</span>`], ['عنوان', r => `<b>${esc(r.title)}</b><span class="sub">${esc(r.cat || '—')}</span>`],
    ['از', r => esc(unitShort(r.fromUnit))], ['به', r => esc(unitShort(r.toUnit)) + (r.coops.length ? `<span class="sub">همکار: ${r.coops.map(unitShort).join('، ')}</span>` : '')],
    ['ثبت', r => jd(isoOfStamp(r.created))], ['مهلت', r => dueTxt(r.status === 'جاری' ? r.due : '')],
    ['مرحله', r => `${pill(reqLabel(r))} ${prio(r.priority)}${r.needsImam ? '<span class="sub">نیازمند تصویب امام</span>' : ''}`]
  ], rows.sort(by('created', -1)), { click: 'req', empty: 'درخواستی یافت نشد.' });
}
PAGES.requests = () => {
  const v = vs('requests', { tab: isImam() ? 'all' : 'in' });
  let rows = DB.requests.filter(canSeeReq);
  const u = myUnit();
  const cnt = { in: rows.filter(r => r.toUnit === u && r.status === 'جاری').length, out: rows.filter(r => r.fromUnit === u).length, coop: rows.filter(r => r.coops.includes(u)).length };
  if (v.tab === 'in') rows = rows.filter(r => r.toUnit === u);
  if (v.tab === 'out') rows = rows.filter(r => r.fromUnit === u);
  if (v.tab === 'coop') rows = rows.filter(r => r.coops.includes(u));
  if (v.tab === 'imam') rows = rows.filter(r => r.needsImam);
  rows = rows.filter(r => (!v.st || reqLabel(r) === v.st) && (!v.cat || r.cat === v.cat) && (!v.uu || r.toUnit === +v.uu) && textMatch(v.q, r.no, r.title, r.desc));
  return `${head('درخواست‌های داخلی', 'گردش استاندارد: ثبت ← شماره پیگیری ← ارجاع ← بررسی و هماهنگی میان‌بخشی ← تأیید ← اجرا ← گزارش نهایی ← بایگانی', btn('ثبت درخواست', 'newReq', {}, '', 'plus'))}
  ${tabs('requests', isImam() ? [['all', 'همه'], ['imam', 'نیازمند تصویب امام']] : [['in', `واردشده به مدیریت (${fa(cnt.in)})`], ['out', `ارسالی (${fa(cnt.out)})`], ['coop', `درخواست همکاری (${fa(cnt.coop)})`]], v.tab)}
  <section class="card">${filterBar('requests', [{ k: 'q', t: 'search', l: 'جست‌وجو در کد پیگیری یا عنوان…' }, { k: 'st', l: 'مرحله', o: [...REQ_STAGES.slice(1), 'ردشده', 'لغوشده'] }, ...(v.cat ? [{ k: 'cat', l: 'خدمت', o: [v.cat] }] : []), ...(isAll() ? [{ k: 'uu', l: 'مدیریت مسئول', o: unitOpts() }] : [])])}<div class="cb flush">${reqTable(rows)}</div></section>`;
};
A.req = d => showReq(d.id);
A.newReq = d => {
  const init = { svc: d.to ? `${d.to}|${d.cat || 'همکاری میان‌بخشی'}` : '', priority: 'عادی', due: addDays(todayISO(), 7) };
  formModal('ثبت درخواست', [
    { k: 'title', l: 'عنوان درخواست', req: true, full: true },
    { k: 'svc', l: 'مدیریت مسئول و نوع خدمت', t: 'select', o: serviceOpts().filter(g => g.group !== unitName(myUnit())), req: true, full: true },
    { k: 'desc', l: 'شرح درخواست', t: 'textarea' },
    { k: 'priority', l: 'اولویت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت مورد انتظار', t: 'date' },
    { k: 'needsImam', l: 'تصویب', t: 'check', cl: 'نیازمند تصویب امام جماعت' }, { k: 'files', l: 'پیوست', t: 'file' }
  ], init, v => { const [to, cat] = v.svc.split('|'); return run('createRequest', { ...v, toUnit: +to, cat }); }, { done: 'درخواست ثبت شد و کد پیگیری گرفت.', reopen: r => showReq(r.id) });
};
function showReq(id) {
  const r = DB.requests.find(x => x.id === id);
  if (!r || !canSeeReq(r)) return toast('دسترسی به این درخواست مجاز نیست.');
  const acts = reqActions(r);
  const coopOnly = !isImam() && r.coops.includes(myUnit()) && r.toUnit !== myUnit() && r.fromUnit !== myUnit();
  modal({
    title: 'درخواست ' + r.no, wide: true,
    body: `<div><h2>${esc(r.title)}</h2><div class="row">${pill(reqLabel(r))} ${prio(r.priority)} ${r.needsImam ? pill('نیازمند تصویب امام جماعت', 'info') : ''} ${pill(r.cat || 'عمومی', 'mute')}</div></div>
    ${r.status === 'ردشده' || r.status === 'لغوشده' ? `<div class="notice warn">این درخواست ${r.status} است.</div>` : steps(REQ_STAGES, r.stage, r.stage === 6)}
    ${coopOnly ? '<div class="notice">شما به‌عنوان مدیریت همکار فقط همین درخواست را می‌بینید و به اطلاعات داخلی مدیریت مسئول دسترسی ندارید.</div>' : ''}
    ${r.desc ? `<div class="box">${esc(r.desc)}</div>` : ''}
    ${kv([['درخواست‌کننده', esc(userById(r.by)?.name) + ' — ' + esc(posLabel(r.byPos))], ['مدیریت مسئول', esc(unitName(r.toUnit))], ['تأییدکننده', r.needsImam ? 'امام جماعت' : 'مدیر ' + esc(unitShort(r.toUnit))], ['مدیریت‌های همکار', r.coops.map(unitName).join('، ') || '—'], ['مهلت', dueTxt(r.status === 'جاری' ? r.due : '')], r.files.length && ['پیوست', files(r.files)], r.report && ['گزارش نهایی', esc(r.report)]])}
    ${r.coopNotes.length ? `<div><h3>نظرات همکاری</h3>${r.coopNotes.map(n => `<div class="box" style="margin-bottom:6px">${esc(n.note)}<div class="hint">${esc(unitShort(n.unit))} · ${jdt(n.ts)}</div></div>`).join('')}</div>` : ''}
    <div><h3>تاریخچه گردش (تاریخ، ساعت، اقدام‌کننده، شرح)</h3>${histHTML(r.history)}</div>`,
    foot: acts.map(([k, l]) => btn(l, 'reqAct', { id, act: k }, ['reject', 'cancel'].includes(k) ? 'danger' : k === 'coop' ? 'ghost' : '')).join('')
  });
}
A.reqAct = d => {
  const r = DB.requests.find(x => x.id === d.id);
  const lbl = reqActions(r).find(x => x[0] === d.act)[1];
  actModal(lbl, v => run('reqAct', r.id, d.act, v.note, v.unit), {
    fields: d.act === 'coop' ? [{ k: 'unit', l: 'مدیریت همکار', t: 'select', o: unitOpts().filter(x => x[0] !== r.toUnit), req: true }] : [],
    noteReq: ['reject', 'exec', 'final', 'coopnote'].includes(d.act),
    noteLabel: d.act === 'final' ? 'گزارش نهایی' : d.act === 'exec' ? 'شرح اقدام اجرایی' : d.act === 'reject' ? 'علت رد' : 'توضیح',
    reopen: () => showReq(r.id)
  });
};

/* =====================================================================
   صفحات: رزرو، تقویم و جلسات، اموال، امور مالی، منابع انسانی
   ===================================================================== */

/* ---------- تقویم شمسی ماهانه ---------- */
function monthGrid(key, evFn) {
  const v = vs(key);
  const [ty, tmn] = isoToJ(todayISO());
  const y = v.y || ty, m = v.m || tmn;
  const first = jToIsoN(y, m, 1);
  const lead = weekday(first);
  const len = jMonthLen(y, m);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ iso: addDays(first, i - lead), out: true });
  for (let d = 0; d < len; d++) cells.push({ iso: addDays(first, d) });
  while (cells.length % 7) cells.push({ iso: addDays(first, cells.length - lead), out: true });
  const T = todayISO();
  return `<div class="ch" style="border-top:1px solid var(--line)"><div class="row">${btn('ماه قبل', 'calNav', { key, d: -1 }, 'sm ghost')}<h2>${J_MONTHS[m - 1]} ${fa(y)}</h2>${btn('ماه بعد', 'calNav', { key, d: 1 }, 'sm ghost')}${btn('امروز', 'calNav', { key, d: 0 }, 'sm soft')}</div></div>
  <div class="cal">${J_WEEK.map(w => `<div class="dh">${w}</div>`).join('')}${cells.map(c => {
    const evs = evFn(c.iso);
    return `<div class="d ${c.out ? 'out' : ''} ${c.iso === T ? 'today' : ''} ${weekday(c.iso) === 6 ? 'fri' : ''}" data-a="calDay" data-key="${key}" data-iso="${c.iso}"><span class="n">${fa(isoToJ(c.iso)[2])}</span>${evs.slice(0, 3).map(e => `<span class="ev ${e.c || ''}" title="${esc(e.t)}">${esc(e.t)}</span>`).join('')}${evs.length > 3 ? `<span class="ev">+${fa(evs.length - 3)}</span>` : ''}</div>`;
  }).join('')}</div>`;
}
A.calNav = d => {
  const v = vs(d.key); const [ty, tmn] = isoToJ(todayISO());
  if (+d.d === 0) { v.y = ty; v.m = tmn; v.day = todayISO(); }
  else { let y = v.y || ty, m = (v.m || tmn) + +d.d; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } v.y = y; v.m = m; }
  if (v.wk) v.wk = addDays(v.wk || todayISO(), 7 * +d.d);
  route();
};
A.calDay = d => { const v = vs(d.key); v.day = d.iso; if (d.key === 'cal') v.mode = 'day'; route(); };

/* ---------- رزرو فضاها ---------- */
PAGES.reservations = () => {
  const v = vs('res', { tab: 'cal' });
  const list = DB.reservations.filter(r => !v.sp || r.space === v.sp || (v.sp === '-' && !r.space));
  const evFn = iso => list.filter(r => r.date === iso && r.status !== 'ردشده' && r.status !== 'لغوشده').sort(by('start')).map(r => ({ t: `${fa(r.start)} ${resPlace(r)}`, c: r.status === 'تأییدشده' ? 'res' : 'pend' }));
  const pending = DB.reservations.filter(r => r.status === 'در انتظار تأیید' && canDecideRes(r));
  const day = v.day || todayISO();
  const dayList = list.filter(r => r.date === day).sort(by('start'));
  let rows = list;
  if (v.tab === 'pending') rows = list.filter(r => r.status === 'در انتظار تأیید');
  if (v.tab === 'mine') rows = list.filter(r => r.by === ME.user.id);
  return `${head('رزرو فضاها و امکانات', 'تقویم مرکزی رزرو با کنترل تداخل زمانی؛ تأیید هر رزرو با مدیریت متولی همان فضا', btn('درخواست رزرو', 'newRes', {}, '', 'plus'))}
  <div class="tiles">${[2, 3, 1].map(u => tile(unitShort(u), DB.reservations.filter(r => resUnit(r) === u && r.status === 'تأییدشده' && r.date >= todayISO()).length, 'رزرو تأییدشده پیش رو')).join('')}${tile('منتظر تأیید شما', pending.length, '', pending.length ? 'warn' : '')}</div>
  ${tabs('res', [['cal', 'تقویم ماهانه'], ['pending', `در انتظار تأیید (${fa(DB.reservations.filter(r => r.status === 'در انتظار تأیید').length)})`], ['all', 'همه رزروها'], ['mine', 'درخواست‌های من']], v.tab)}
  <section class="card">${filterBar('res', [{ k: 'sp', l: 'همه فضاها', o: SPACES.map(s => [s.id, s.name + ' — ' + unitShort(s.unit)]).concat([['-', 'خارج از مجتمع']]) }])}
  ${v.tab === 'cal' ? `<div class="cb flush">${monthGrid('res', evFn)}</div><div class="cb"><h3>${jdLong(day)}</h3>${resTable(dayList)}</div>` : `<div class="cb flush">${resTable(rows.sort(by('date', -1)))}</div>`}</section>
  <div class="grid g2">${card('سالن‌ها و متولیان تأیید', table([['فضا', s => `<b>${esc(s.name)}</b>`], ['مدیریت تأییدکننده', s => esc(unitName(s.unit))], ['ظرفیت', s => fa(s.cap) + ' نفر'], ['کنترل تداخل', s => (s.excl ? pill('دارد', 'ok') : pill('ندارد', 'mute'))]], SPACES), '', { flush: true })}
  ${card('انواع برنامه', table([['نوع برنامه', p => `<b>${esc(p.name)}</b>`], ['محل', p => (p.offsite ? 'خارج از مجتمع — ظرفیت ' + fa(p.cap) : 'در یکی از سالن‌ها')], ['تأیید', p => esc(p.offsite ? unitName(p.unit) : 'متولی سالن')]], PROGRAMS), '', { flush: true })}</div>
  <div class="notice">تداخل بر اساس سالن واقعی کنترل می‌شود: مثلاً مراسم مذهبی و مراسم فاتحه در حسینیه نمی‌توانند هم‌زمان تأیید شوند.</div>`;
};
const resTable = rows => table([
  ['شماره', r => `<span class="code">${esc(r.no)}</span>`], ['برنامه', r => `<b>${esc(r.kind)}</b><span class="sub">${esc(programOf(r.program).name)} · ${esc(resPlace(r))}</span>`],
  ['متقاضی', r => esc(r.applicant)], ['تاریخ', r => jd(r.date)], ['ساعت', r => `${tm(r.start)} تا ${tm(r.end)}`], ['نفرات', r => fa(r.people)],
  ['وضعیت', r => pill(r.status) + (r.status === 'در انتظار تأیید' && resConflicts(r).length ? '<span class="sub" style="color:var(--bad)">تداخل با رزرو تأییدشده</span>' : '')]
], rows, { click: 'resv', empty: 'رزروی ثبت نشده است.' });
A.resv = d => showRes(d.id);
A.newRes = d => formModal('درخواست رزرو', [
  { k: 'program', l: 'نوع برنامه', t: 'select', o: PROGRAMS.map(p => [p.id, p.name + (p.offsite ? ' (خارج از مجتمع)' : '')]), req: true, blank: false },
  { k: 'space', l: 'سالن / فضای برگزاری', t: 'select', o: SPACES.map(s => [s.id, `${s.name} — ظرفیت ${fa(s.cap)}`]), blank: 'بدون فضا (برنامه خارج از مجتمع)', hint: 'برای راهیان نور و اردو خالی بگذارید.' },
  { k: 'kind', l: 'عنوان برنامه', req: true, full: true, ph: 'مثلاً: مراسم ترحیم مرحوم …' },
  { k: 'applicant', l: 'نام متقاضی', req: true }, { k: 'phone', l: 'شماره تماس', t: 'tel', req: true, ph: '09123456789' },
  { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'people', l: 'تعداد افراد', t: 'number', req: true, hint: 'عدد صحیح، حداکثر ظرفیت فضا' },
  { k: 'start', l: 'ساعت شروع', t: 'time', req: true }, { k: 'end', l: 'ساعت پایان', t: 'time', req: true },
  { k: 'equip', l: 'تجهیزات موردنیاز', ph: 'صوت، پروژکتور، پذیرایی…', full: true }, { k: 'desc', l: 'توضیحات', t: 'textarea' }
], { program: 'general', space: d && d.space || '', date: d && d.iso ? d.iso : vs('res').day || todayISO(), applicant: unitName(myUnit()), phone: ME.user.phone, start: '17:00', end: '19:00' }, v => run('createReservation', v), { done: 'درخواست رزرو ثبت و برای مدیریت متولی ارسال شد.', reopen: r => showRes(r.id) });
function showRes(id) {
  const r = DB.reservations.find(x => x.id === id); if (!r) return;
  const detail = canDecideRes(r) || r.by === ME.user.id || isAll();
  const c = resConflicts(r);
  modal({
    title: 'رزرو ' + r.no, wide: true,
    body: `<div><h2>${esc(r.kind)}</h2><div class="row">${pill(r.status)} ${pill(programOf(r.program).name, 'mute')}</div></div>
    ${c.length && r.status !== 'تأییدشده' ? `<div class="notice warn">تداخل زمانی با ${c.map(x => `${fa(x.no)} (${tm(x.start)} تا ${tm(x.end)} — ${esc(x.kind)})`).join('، ')}. تأیید این رزرو تا رفع تداخل ممکن نیست.</div>` : ''}
    ${kv([['محل برگزاری', esc(resPlace(r))], ['تاریخ', jdLong(r.date)], ['ساعت', `${tm(r.start)} تا ${tm(r.end)}`], ['تعداد افراد', fa(r.people) + (resCap(r) ? ' از ظرفیت ' + fa(resCap(r)) : '')], ['مدیریت تأییدکننده', esc(unitName(resUnit(r)))],
      detail && ['نام متقاضی', esc(r.applicant)], detail && ['شماره تماس', `<span class="code">${fa(r.phone)}</span>`], detail && ['تجهیزات موردنیاز', esc(r.equip || '—')], detail && ['توضیحات', esc(r.desc || '—')]])}
    ${!detail ? '<div class="hint">مشخصات متقاضی فقط برای مدیریت متولی و ثبت‌کننده نمایش داده می‌شود.</div>' : ''}
    <div><h3>سابقه</h3>${histHTML(r.history)}</div>`,
    foot: `${editBtn('res', r)}${r.status === 'در انتظار تأیید' && canDecideRes(r) ? btn('تأیید رزرو', 'resDo', { id, s: 'تأییدشده' }) + btn('رد', 'resDo', { id, s: 'ردشده' }, 'danger') : ''}${['در انتظار تأیید', 'تأییدشده'].includes(r.status) && (r.by === ME.user.id || canDecideRes(r)) ? btn('لغو رزرو', 'resDo', { id, s: 'لغوشده' }, 'ghost') : ''}`
  });
}
A.resDo = d => { const r = DB.reservations.find(x => x.id === d.id); actModal(d.s === 'تأییدشده' ? 'تأیید رزرو' : d.s === 'ردشده' ? 'رد رزرو' : 'لغو رزرو', v => run('resDecide', r.id, d.s, v.note), { noteReq: d.s === 'ردشده', reopen: () => showRes(r.id) }); };

/* ---------- تقویم و جلسات ---------- */
function calEvents(iso) {
  const out = [];
  DB.meetings.filter(m => m.date === iso && canSeeMeeting(m)).forEach(m => out.push({ t: `${fa(m.start)} ${m.title}`, c: '', k: 'meet', id: m.id, time: m.start, sub: m.place, tag: m.kind }));
  DB.reservations.filter(r => r.date === iso && r.status === 'تأییدشده').forEach(r => out.push({ t: `${fa(r.start)} ${resPlace(r)}`, c: 'res', k: 'res', id: r.id, time: r.start, sub: r.kind, tag: 'رزرو' }));
  DB.orders.filter(o => o.due === iso && canSeeOrder(o) && o.status !== 'تکمیل‌شده').forEach(o => out.push({ t: 'مهلت دستور: ' + o.title, c: 'due', k: 'order', id: o.id, time: '23:59', sub: o.units.map(unitShort).join('، '), tag: 'مهلت' }));
  DB.tasks.filter(t => t.due === iso && canSeeTask(t) && t.status !== 'تکمیل‌شده' && (t.assignee === ME.pos.id || isMgrOrOffice(t.unitId) && !isImam())).forEach(t => out.push({ t: 'مهلت: ' + t.title, c: 'due', k: 'task', id: t.id, time: '23:59', sub: unitShort(t.unitId), tag: 'مهلت' }));
  return out.sort(by('time'));
}
PAGES.calendar = () => {
  const v = vs('cal', { mode: 'month' });
  const day = v.day || todayISO();
  let view = '';
  if (v.mode === 'month') view = `<div class="cb flush">${monthGrid('cal', calEvents)}</div>`;
  if (v.mode === 'week') {
    const start = addDays(day, -weekday(day));
    view = `<div class="cb"><div class="row" style="margin-bottom:10px">${btn('هفته قبل', 'wkNav', { d: -7 }, 'sm ghost')}${btn('هفته بعد', 'wkNav', { d: 7 }, 'sm ghost')}<b>${jd(start)} تا ${jd(addDays(start, 6))}</b></div><div class="week">${[0, 1, 2, 3, 4, 5, 6].map(i => { const iso = addDays(start, i); return `<div class="col ${iso === todayISO() ? 'today' : ''}"><h4>${J_WEEK[i]} ${fa(isoToJ(iso)[2])}</h4>${calEvents(iso).map(e => `<span class="ev ${e.c}" data-a="open" data-k="${e.k}" data-id="${e.id}">${esc(e.t)}</span>`).join('')}</div>`; }).join('')}</div></div>`;
  }
  if (v.mode === 'day') {
    const ev = calEvents(day);
    view = `<div class="cb"><div class="row" style="margin-bottom:10px">${btn('روز قبل', 'dayNav', { d: -1 }, 'sm ghost')}${btn('روز بعد', 'dayNav', { d: 1 }, 'sm ghost')}<b>${jdLong(day)}</b></div>${ev.length ? `<div class="list">${ev.map(e => `<a class="li" data-a="open" data-k="${e.k}" data-id="${e.id}"><div class="k" style="width:56px">${e.time === '23:59' ? ic('clock') : fa(e.time)}</div><div class="t"><b>${esc(e.t)}</b><small>${esc(e.sub || '')}</small></div>${pill(e.tag, e.c === 'due' ? 'bad' : 'info')}</a>`).join('')}</div>` : empty('برنامه‌ای برای این روز ثبت نشده است.')}</div>`;
  }
  const mine = DB.meetings.filter(canSeeMeeting).sort(by('date', -1));
  const resol = DB.meetings.filter(canSeeMeeting).flatMap(m => m.resolutions.map(x => ({ ...x, m })));
  return `${head('تقویم و جلسات', 'تقویم شمسی با نمای روزانه، هفتگی و ماهانه؛ ثبت جلسه، دعوت، دستور جلسه، صورت‌جلسه و پیگیری مصوبات', myRole() !== 'staff' ? btn('ثبت جلسه', 'newMeeting', {}, '', 'plus') + btn('ثبت ملاقات', 'newMeeting', { kind: 'ملاقات' }, 'ghost') : '')}
  ${tabs('cal', [['month', 'ماهانه'], ['week', 'هفتگی'], ['day', 'روزانه']].map(x => x), v.mode).replace(/data-a="tab" data-key="cal"/g, 'data-a="calMode"')}
  <section class="card">${view}</section>
  <div class="grid g2">
    ${card('جلسات و ملاقات‌ها', table([['عنوان', m => `<b>${esc(m.title)}</b><span class="sub">${esc(m.kind)} · ${esc(m.place)}</span>`], ['تاریخ', m => jd(m.date) + `<span class="sub">${tm(m.start)}${m.end ? ' تا ' + tm(m.end) : ''}</span>`], ['مدعوین', m => fa(m.invitees.length)], ['مصوبات', m => fa(m.resolutions.length)]], mine, { click: 'meet' }), '', { flush: true })}
    ${card('پیگیری مصوبات', table([['مصوبه', x => `<b>${esc(x.text)}</b><span class="sub">${esc(x.m.title)}</span>`], ['مسئول اجرا', x => esc(posWho(x.owner))], ['مهلت', x => dueTxt(x.status === 'انجام‌شده' ? '' : x.due)], ['وضعیت', x => pill(x.status === 'در حال پیگیری' && x.due && x.due < todayISO() ? 'معوق' : x.status)]], resol.map(x => ({ ...x, id: x.m.id })), { click: 'meet', empty: 'مصوبه‌ای ثبت نشده است.' }), '', { flush: true })}
  </div>`;
};
A.calMode = d => { vs('cal').mode = d.v; route(); };
A.wkNav = d => { const v = vs('cal'); v.day = addDays(v.day || todayISO(), +d.d); route(); };
A.dayNav = d => { const v = vs('cal'); v.day = addDays(v.day || todayISO(), +d.d); route(); };
A.meet = d => showMeeting(d.id);
A.newMeeting = d => formModal(d && d.kind === 'ملاقات' ? 'ثبت ملاقات' : 'ثبت جلسه', [
  { k: 'title', l: 'عنوان', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true },
  { k: 'place', l: 'مکان', t: 'select', o: ['سالن جلسات', 'دفتر امام جماعت', 'حسینیه', 'فرهنگسرا', 'دفتر ' + unitShort(myUnit()), 'خارج از مجتمع'], blank: false },
  { k: 'start', l: 'ساعت شروع', t: 'time', req: true }, { k: 'end', l: 'ساعت پایان', t: 'time' },
  { k: 'invitees', l: 'مدعوین', t: 'multi', o: allPosChecks(), req: true }, { k: 'agenda', l: 'دستور جلسه', t: 'textarea' }
], { date: vs('cal').day || todayISO(), start: '10:00', end: '11:00' }, v => run('createMeeting', { ...v, kind: d && d.kind || 'جلسه' }), { wide: true, done: 'ثبت شد و دعوت‌نامه برای مدعوین ارسال شد.', reopen: m => showMeeting(m.id) });
function showMeeting(id) {
  const m = DB.meetings.find(x => x.id === id);
  if (!m || !canSeeMeeting(m)) return toast('دسترسی به این جلسه مجاز نیست.');
  const ed = canEditMeeting(m);
  modal({
    title: `${m.kind} ${m.no}`, wide: true,
    body: `<div><h2>${esc(m.title)}</h2></div>
    ${kv([['زمان', `${jdLong(m.date)} · ${tm(m.start)}${m.end ? ' تا ' + tm(m.end) : ''}`], ['مکان', esc(m.place)], ['برگزارکننده', esc(posWho(m.byPos))], ['مدعوین', m.invitees.map(p => esc(posLabel(p))).join('، ')]])}
    <div><h3>دستور جلسه</h3><div class="box">${esc(m.agenda || '—')}</div></div>
    <div><h3>صورت‌جلسه</h3><div class="box">${esc(m.minutes || 'هنوز صورت‌جلسه بارگذاری نشده است.')}</div>${files(m.minutesFiles)}</div>
    <div><h3>مصوبات</h3>${table([['مصوبه', x => esc(x.text)], ['مسئول اجرا', x => esc(posWho(x.owner))], ['مهلت', x => dueTxt(x.status === 'انجام‌شده' ? '' : x.due)], ['وضعیت', x => pill(x.status)], ['', x => (x.owner === ME.pos.id || ed) && x.status !== 'انجام‌شده' ? btn('پیگیری', 'resolUp', { id: m.id, x: x.id }, 'sm ghost') : '']], m.resolutions, { empty: 'مصوبه‌ای ثبت نشده است.' })}</div>
    <div><h3>سابقه</h3>${histHTML(m.history)}</div>`,
    foot: (ed ? btn('ثبت صورت‌جلسه', 'minutes', { id }, '', 'file') + btn('افزودن مصوبه', 'resolAdd', { id }, 'ghost', 'plus') : '') + editBtn('meet', m)
  });
}
A.minutes = d => { const m = DB.meetings.find(x => x.id === d.id); formModal('صورت‌جلسه', [{ k: 'minutes', l: 'متن صورت‌جلسه', t: 'textarea', req: true }, { k: 'files', l: 'بارگذاری فایل صورت‌جلسه', t: 'file' }], { minutes: m.minutes }, v => run('meetingMinutes', m.id, v.minutes, v.files), { reopen: () => showMeeting(m.id) }); };
A.resolAdd = d => { const m = DB.meetings.find(x => x.id === d.id); formModal('افزودن مصوبه', [{ k: 'text', l: 'متن مصوبه', t: 'textarea', req: true }, { k: 'owner', l: 'مسئول اجرای مصوبه', t: 'select', o: allPosOpts(), req: true }, { k: 'due', l: 'مهلت اجرا', t: 'date' }], { due: addDays(todayISO(), 7) }, v => run('addResolution', m.id, v), { reopen: () => showMeeting(m.id) }); };
A.resolUp = d => { const m = DB.meetings.find(x => x.id === d.id); const x = m.resolutions.find(r => r.id === d.x); actModal('پیگیری مصوبه', v => run('resolutionUpdate', m.id, x.id, v.status, v.note), { fields: [{ k: 'status', l: 'وضعیت', t: 'select', o: ['در حال پیگیری', 'انجام‌شده'], blank: false }], init: { status: 'انجام‌شده' }, reopen: () => showMeeting(m.id) }); };

/* ---------- اموال و انبار ---------- */
const assetTable = rows => table([
  ['کد اموال', a => `<span class="code">${esc(a.code)}</span>`], ['نام کالا', a => `<b>${esc(a.name)}</b><span class="sub">${esc(a.cat)}</span>`],
  ['واحد مالک', a => esc(unitShort(a.unitId))], ['انبار / محل', a => esc(a.out ? 'خارج از مجتمع' : whName(a.whId))],
  ['وضعیت سلامت', a => pill(a.health) + (a.loaned ? ' ' + pill('امانت', 'warn') : '')], ['ارزش', a => money(a.value)]
], rows, { click: 'asset', empty: 'کالایی ثبت نشده است.' });
PAGES.assets = () => {
  if (!canAssets()) return denied();
  const v = vs('assets', { tab: 'list' });
  const vis = DB.assets.filter(canSeeAsset);
  let body = '';
  if (v.tab === 'list') {
    const rows = vis.filter(a => textMatch(v.q, a.code, a.name, a.serial, a.cat) && (!v.h || a.health === v.h) && (!v.w || a.whId === v.w) && (!v.u || a.unitId === +v.u));
    body = `<section class="card">${filterBar('assets', [{ k: 'q', t: 'search', l: 'جست‌وجو در کد، نام، شماره سریال…' }, { k: 'h', l: 'وضعیت سلامت', o: ASSET_HEALTH }, { k: 'w', l: 'انبار', o: DB.warehouses.map(w => [w.id, w.name]) }, ...(isAll() || inUnit(U_INTERNAL) ? [{ k: 'u', l: 'واحد مالک', o: unitOpts() }] : [])])}<div class="cb flush">${assetTable(rows)}</div></section>`;
  }
  if (v.tab === 'moves') {
    const ms = DB.movements.filter(m => canSeeAsset(DB.assets.find(a => a.id === m.assetId))).sort(by('created', -1));
    body = card('گردش کالا و تأیید خروج', table([['شماره', m => `<span class="code">${esc(m.no)}</span>`], ['کالا', m => { const a = DB.assets.find(x => x.id === m.assetId); return `<b>${esc(a.name)}</b><span class="sub code">${esc(a.code)}</span>`; }], ['عملیات', m => esc(m.type) + (m.person ? `<span class="sub">${esc(m.person)}</span>` : '') + (m.toWh ? `<span class="sub">به ${esc(whName(m.toWh))}</span>` : '')], ['تاریخ', m => jd(m.date)], ['ثبت‌کننده', m => esc(posLabel(m.byPos))], ['وضعیت', m => pill(m.status)], ['', m => m.status === 'در انتظار تأیید' && canApproveMove(DB.assets.find(a => a.id === m.assetId)) ? btn('تأیید', 'moveDo', { id: m.id, ok: 1 }, 'sm') + ' ' + btn('رد', 'moveDo', { id: m.id, ok: 0 }, 'sm danger') : '']], ms), '', { flush: true });
  }
  if (v.tab === 'wh') body = `<div class="units">${DB.warehouses.filter(w => isImam() || inUnit(w.unitId) || inUnit(U_INTERNAL)).map(w => { const as = vis.filter(a => a.whId === w.id && !a.out); return `<div class="unit"><div class="uh"><div class="k">${ic('box')}</div><div><b>${esc(w.name)}</b><small>${esc(unitName(w.unitId))}</small></div></div><div class="us"><span>اقلام <b>${fa(as.length)}</b></span><span>ارزش <b>${money(sum(as, a => a.value))}</b></span><span>نیازمند تعمیر <b>${fa(as.filter(a => a.health !== 'سالم').length)}</b></span></div></div>`; }).join('')}</div>${isMgrOrOffice(U_INTERNAL) ? btn('تعریف انبار جدید', 'newWh', {}, 'soft', 'plus') : ''}`;
  if (v.tab === 'report') {
    const groups = {};
    vis.forEach(a => { const k = a.cat || 'سایر'; groups[k] = groups[k] || { id: k, cat: k, n: 0, val: 0, bad: 0, loan: 0 }; groups[k].n++; groups[k].val += a.value; if (a.health !== 'سالم') groups[k].bad++; if (a.loaned) groups[k].loan++; });
    body = `<div class="tiles">${tile('کل اقلام', vis.length)}${tile('ارزش دفتری', money(sum(vis, a => a.value)))}${tile('نیازمند تعمیر یا خراب', vis.filter(a => a.health !== 'سالم').length, '', 'warn')}${tile('در امانت', vis.filter(a => a.loaned).length)}${tile('خارج‌شده', vis.filter(a => a.out).length)}</div>
    ${card('گزارش موجودی بر اساس گروه کالا', table([['گروه', g => esc(g.cat)], ['تعداد', g => fa(g.n)], ['ارزش', g => money(g.val)], ['نیازمند تعمیر', g => fa(g.bad)], ['امانت', g => fa(g.loan)]], Object.values(groups)), '', { flush: true })}
    <div class="notice">این ماژول از طریق API (<span class="code">/api/assets</span>) برای اتصال به سامانه مستقل مدیریت اموال و انبار مسجد پیش‌بینی شده است.</div>`;
  }
  const pend = DB.movements.filter(m => m.status === 'در انتظار تأیید' && canApproveMove(DB.assets.find(a => a.id === m.assetId))).length;
  return `${head('اموال و انبار', 'کدگذاری، QR، گردش کالا، امانت، تأیید خروج و گزارش موجودی؛ هر واحد فقط اموال خود را می‌بیند', btn('ثبت کالا', 'newAsset', {}, '', 'plus'))}
  ${tabs('assets', [['list', `فهرست اموال (${fa(vis.length)})`], ['moves', `گردش و تأییدها${pend ? ' (' + fa(pend) + ')' : ''}`], ['wh', 'انبارها'], ['report', 'گزارش موجودی']], v.tab)}${body}`;
};
A.asset = d => showAsset(d.id);
A.newAsset = () => formModal('ثبت کالا در فهرست اموال', [
  { k: 'name', l: 'نام کالا', req: true, full: true }, { k: 'cat', l: 'گروه کالا', req: true },
  { k: 'unitId', l: 'واحد مالک', t: 'select', o: isImam() || inUnit(U_INTERNAL) ? unitOpts() : [[myUnit(), unitName(myUnit())]], req: true, blank: false },
  { k: 'whId', l: 'انبار', t: 'select', o: DB.warehouses.map(w => [w.id, w.name]), req: true },
  { k: 'health', l: 'وضعیت سلامت', t: 'select', o: ASSET_HEALTH, blank: false }, { k: 'serial', l: 'شماره سریال' },
  { k: 'value', l: 'ارزش (ریال)', t: 'number' }, { k: 'specs', l: 'مشخصات فنی', t: 'textarea' }
], { unitId: myUnit() > 0 ? myUnit() : 1, health: 'سالم' }, v => run('createAsset', v), { done: 'کالا ثبت و کدگذاری شد.', reopen: a => showAsset(a.id) });
A.newWh = () => formModal('تعریف انبار', [{ k: 'name', l: 'نام انبار', req: true }, { k: 'unitId', l: 'واحد', t: 'select', o: unitOpts(), req: true }], {}, v => run('addWarehouse', v));
function showAsset(id) {
  const a = DB.assets.find(x => x.id === id);
  if (!a || !canSeeAsset(a)) return toast('دسترسی به این کالا مجاز نیست.');
  const ms = DB.movements.filter(m => m.assetId === a.id).sort(by('created', -1));
  modal({
    title: 'کالا ' + a.code, wide: true,
    body: `<div class="grid g-main"><div>${kv([['نام', `<b>${esc(a.name)}</b>`], ['گروه', esc(a.cat)], ['واحد مالک', esc(unitName(a.unitId))], ['انبار', esc(a.out ? 'خارج از مجتمع' : whName(a.whId))], ['وضعیت سلامت', pill(a.health)], ['امانت', a.loaned ? pill('در امانت: ' + a.holder, 'warn') : 'خیر'], ['شماره سریال', `<span class="code">${esc(a.serial || '—')}</span>`], ['ارزش', money(a.value)], ['مشخصات فنی', esc(a.specs || '—')]])}</div>
      <div style="text-align:center"><div id="qrbox" style="display:inline-block;background:#fff;padding:8px;border-radius:8px"></div><div class="code">${esc(a.code)}</div><div class="hint">برچسب QR برای الصاق روی کالا</div></div></div>
    <div><h3>تاریخچه جابه‌جایی‌ها</h3>${table([['شماره', m => `<span class="code">${esc(m.no)}</span>`], ['عملیات', m => esc(m.type)], ['تاریخ', m => jd(m.date)], ['شرح', m => esc([m.person, m.toWh && 'به ' + whName(m.toWh), m.note].filter(Boolean).join(' — '))], ['وضعیت', m => pill(m.status)]], ms, { empty: 'گردشی ثبت نشده است.' })}</div>
    <div><h3>سابقه کالا</h3>${histHTML(a.history)}</div>`,
    foot: editBtn('asset', a) + (canManageAsset(a) ? btn('ثبت گردش (ورود، خروج، امانت، عودت، جابه‌جایی)', 'newMove', { id }, '', 'send') + btn('تغییر وضعیت سلامت', 'assetHealth', { id }, 'ghost') : '')
  });
  if (window.qrcode) try { const q = qrcode(0, 'M'); q.addData(`SHABAB-ASSET:${a.code}`); q.make(); $('#qrbox').innerHTML = q.createSvgTag(3, 2); } catch (e) {}
  else $('#qrbox').innerHTML = `<div style="width:112px;height:112px;display:grid;place-items:center;color:#333">${ic('qr')}</div>`;
}
A.newMove = d => { const a = DB.assets.find(x => x.id === d.id); formModal('ثبت گردش کالا — ' + a.code, [{ k: 'type', l: 'نوع عملیات', t: 'select', o: MOVE_TYPES, req: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'toWh', l: 'انبار مقصد (جابه‌جایی)', t: 'select', o: DB.warehouses.filter(w => w.id !== a.whId).map(w => [w.id, w.name]) }, { k: 'person', l: 'تحویل‌گیرنده / امانت‌گیرنده' }, { k: 'note', l: 'توضیح', t: 'textarea' }], { date: todayISO() }, v => run('createMovement', a.id, v), { done: 'ثبت شد؛ خروج، امانت و جابه‌جایی پس از تأیید مسئول مجاز اعمال می‌شود.', reopen: () => showAsset(a.id) }); };
A.assetHealth = d => { const a = DB.assets.find(x => x.id === d.id); actModal('وضعیت سلامت کالا', v => run('assetHealth', a.id, v.health, v.note), { fields: [{ k: 'health', l: 'وضعیت', t: 'select', o: ASSET_HEALTH, blank: false }], init: { health: a.health }, reopen: () => showAsset(a.id) }); };
A.moveDo = d => { const m = DB.movements.find(x => x.id === d.id); actModal(+d.ok ? 'تأیید ' + m.type : 'رد ' + m.type, v => run('decideMovement', m.id, !!+d.ok, v.note), { noteReq: !+d.ok }); };
function showMove(id) { location.hash = 'assets'; vs('assets').tab = 'moves'; route(); }

/* ---------- امور مالی ---------- */
const payTable = rows => table([
  ['شماره', p => `<span class="code">${esc(p.no)}</span>`], ['عنوان', p => `<b>${esc(p.title)}</b><span class="sub">${esc(p.payee)}</span>`],
  ['واحد', p => esc(unitShort(p.unitId))], ['مبلغ', p => money(p.amount)], ['ثبت', p => jd(isoOfStamp(p.created))],
  ['وضعیت', p => pill(payLabel(p)) + (p.needImam ? '<span class="sub">بالاتر از سقف — نیازمند تصویب امام</span>' : '')]
], rows.sort(by('created', -1)), { click: 'pay', empty: 'درخواست پرداختی ثبت نشده است.' });
PAGES.finance = () => {
  const full = canFinance();
  if (!full && myRole() === 'staff') return denied();
  const v = vs('fin', { tab: full ? 'sum' : 'pay' });
  const y = jYearNow();
  const yTx = DB.tx.filter(t => isoToJ(t.date)[0] === y);
  let body = '';
  if (v.tab === 'sum') {
    const budgets = DB.budgets.filter(b => b.year === y && (full || b.unitId === myUnit()));
    body = `<div class="tiles">${tile('درآمدهای سال', money(sum(yTx.filter(t => t.kind === 'درآمد'), t => t.amount)), '', 'ok')}${tile('نذورات مالی', money(sum(yTx.filter(t => t.kind === 'نذورات'), t => t.amount)), '', 'ok')}${tile('هزینه‌ها', money(sum(yTx.filter(t => t.kind === 'هزینه'), t => t.amount)), '', 'warn')}${tile('تعهدات جاری', money(sum(DB.commitments.filter(c => c.status === 'جاری'), c => c.amount)))}${tile('پرداخت‌های در انتظار', DB.payreqs.filter(p => p.status === 'جاری').length)}</div>
    ${card('بودجه و هزینه واحدها — سال ' + fa(y), table([['مدیریت', b => esc(unitName(b.unitId))], ['بودجه مصوب', b => money(b.amount)], ['هزینه‌شده', b => money(unitSpent(b.unitId))], ['مصرف', b => { const p = (unitSpent(b.unitId) / b.amount) * 100; return `<div class="row" style="flex-wrap:nowrap">${bar(p, p > 90 ? 'bad' : p > 70 ? 'warn' : '')}<span class="num">${fa(Math.round(p))}٪</span></div>`; }], ['مانده', b => money(b.amount - unitSpent(b.unitId))]], budgets.map(b => ({ ...b, id: b.unitId })), { click: full ? 'budget' : '' }), full && (isImam() || isMgr(U_FIN)) ? '<small>برای اصلاح بودجه روی ردیف بزنید</small>' : '', { flush: true })}`;
  }
  if (v.tab === 'tx') {
    const rows = DB.tx.filter(t => (!v.k || t.kind === v.k) && (!v.u || t.unitId === +v.u) && textMatch(v.q, t.no, t.desc, t.docNo) && inRange(t.date, v.f, v.t)).sort(by('date', -1));
    body = `<section class="card"><div class="ch"><h2>اسناد مالی</h2>${isClerk(U_FIN) ? btn('ثبت سند', 'newTx', {}, 'sm', 'plus') : ''}</div>${filterBar('fin', [{ k: 'q', t: 'search', l: 'جست‌وجو در شرح یا شماره سند…' }, { k: 'k', l: 'نوع', o: TX_KINDS }, { k: 'u', l: 'واحد', o: unitOpts() }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}<div class="cb flush">${table([['شماره', t => `<span class="code">${esc(t.no)}</span><span class="sub">سند ${esc(t.docNo || '—')}</span>`], ['نوع', t => pill(t.kind, t.kind === 'هزینه' ? 'warn' : 'ok')], ['شرح', t => esc(t.desc) + (t.src ? `<span class="sub">از درخواست ${esc(t.src)}</span>` : '')], ['واحد', t => esc(t.unitId == null ? 'عمومی مجتمع' : unitShort(t.unitId))], ['تاریخ', t => jd(t.date)], ['مبلغ', t => `<b>${money(t.amount)}</b>`]], rows)}</div><div class="cb"><b>جمع:</b> درآمد و نذورات ${money(sum(rows.filter(t => t.kind !== 'هزینه'), t => t.amount))} · هزینه ${money(sum(rows.filter(t => t.kind === 'هزینه'), t => t.amount))}</div></section>`;
  }
  if (v.tab === 'pay') {
    const rows = DB.payreqs.filter(canSeePay);
    body = `${card('مراحل تأیید پرداخت', steps(PAY_ST, -1) + `<div class="hint">هیچ پرداختی بدون طی این مراحل نهایی نمی‌شود. درخواست‌های بالاتر از ${money(DB.settings.payThreshold)} به تصویب امام جماعت نیاز دارند.</div>`)}
    ${card('درخواست‌های پرداخت', payTable(rows), myRole() !== 'staff' && !isImam() ? btn('درخواست پرداخت', 'newPay', {}, 'sm', 'plus') : '', { flush: true })}`;
  }
  if (v.tab === 'com') body = card('تعهدات مالی', table([['عنوان', c => esc(c.title)], ['واحد', c => esc(unitShort(c.unitId))], ['مبلغ', c => money(c.amount)], ['سررسید', c => dueTxt(c.status === 'جاری' ? c.due : '')], ['وضعیت', c => pill(c.status === 'جاری' ? 'در حال پیگیری' : c.status)]], DB.commitments.filter(c => full || c.unitId === myUnit())), isClerk(U_FIN) ? btn('ثبت تعهد', 'newCom', {}, 'sm', 'plus') : '', { flush: true });
  if (v.tab === 'units') {
    const rows = UNITS.filter(u => full || u.id === myUnit()).map(u => { const t = yTx.filter(x => x.unitId === u.id); return { id: u.id, u, inc: sum(t.filter(x => x.kind !== 'هزینه'), x => x.amount), exp: sum(t.filter(x => x.kind === 'هزینه'), x => x.amount), pend: sum(DB.payreqs.filter(p => p.unitId === u.id && p.status === 'جاری'), p => p.amount) }; });
    body = card('گزارش مالی واحدها' + (isImam() ? ' — گزارش تجمیعی مدیریت عالی' : ''), table([['مدیریت', r => esc(r.u.name)], ['درآمد و نذورات', r => money(r.inc)], ['هزینه', r => money(r.exp)], ['درخواست‌های در جریان', r => money(r.pend)], ['خالص', r => `<b style="color:var(${r.inc - r.exp < 0 ? '--bad' : '--ok'})">${money(r.inc - r.exp)}</b>`]], rows), '', { flush: true });
  }
  if (v.tab === 'docs') body = card('آرشیو مستندات مالی', table([['سند', t => `<span class="code">${esc(t.docNo || t.no)}</span>`], ['شرح', t => esc(t.desc)], ['تاریخ', t => jd(t.date)], ['پیوست', t => files(t.files) || '—']], DB.tx.slice().reverse()), '', { flush: true });
  const T = full ? [['sum', 'خلاصه و بودجه'], ['tx', 'درآمد، هزینه و نذورات'], ['pay', 'درخواست‌های پرداخت'], ['com', 'تعهدات'], ['units', 'گزارش واحدها'], ['docs', 'آرشیو مستندات']] : [['pay', 'درخواست‌های پرداخت واحد'], ['sum', 'بودجه واحد'], ['units', 'گزارش مالی واحد'], ['com', 'تعهدات واحد']];
  return `${head('امور مالی', full ? 'زیر نظر مدیریت مستقل امور مالی؛ ثبت اسناد، بودجه، تعهدات و کنترل پرداخت‌ها' : 'نمای محدود واحد شما؛ جزئیات مالی سایر واحدها نمایش داده نمی‌شود', '')}${tabs('fin', T, v.tab)}${body}`;
};
A.pay = d => showPay(d.id);
A.newPay = () => formModal('درخواست پرداخت', [{ k: 'title', l: 'بابت', req: true, full: true }, { k: 'amount', l: 'مبلغ (ریال)', t: 'number', req: true }, { k: 'payee', l: 'دریافت‌کننده', req: true }, { k: 'desc', l: 'توضیح', t: 'textarea' }, { k: 'files', l: 'فاکتور / مستندات', t: 'file' }], {}, v => run('createPay', v), { done: 'درخواست پرداخت ثبت و برای تأیید مدیر واحد ارسال شد.', reopen: p => showPay(p.id) });
A.newTx = () => formModal('ثبت سند مالی', [{ k: 'kind', l: 'نوع', t: 'select', o: TX_KINDS, req: true }, { k: 'amount', l: 'مبلغ (ریال)', t: 'number', req: true }, { k: 'unitId', l: 'واحد', t: 'select', o: unitOpts(), blank: 'عمومی مجتمع' }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'docNo', l: 'شماره سند' }, { k: 'desc', l: 'شرح', req: true, full: true }, { k: 'files', l: 'مستندات', t: 'file' }], { date: todayISO() }, v => run('addTx', v));
A.newCom = () => formModal('ثبت تعهد مالی', [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'unitId', l: 'واحد', t: 'select', o: unitOpts(), req: true }, { k: 'amount', l: 'مبلغ (ریال)', t: 'number', req: true }, { k: 'due', l: 'سررسید', t: 'date', req: true }], {}, v => run('addCommitment', v));
A.budget = d => { if (!(isImam() || isMgr(U_FIN))) return; const b = DB.budgets.find(x => x.unitId === +d.id && x.year === jYearNow()); formModal('بودجه ' + unitShort(b.unitId), [{ k: 'amount', l: 'بودجه مصوب (ریال)', t: 'number', req: true }], { amount: b.amount }, v => run('setBudget', b.unitId, v.amount)); };
function showPay(id) {
  const p = DB.payreqs.find(x => x.id === id);
  if (!p || !canSeePay(p)) return toast('دسترسی به این درخواست مالی مجاز نیست.');
  const names = PAY_ST.map((n, i) => (i === 3 && !p.needImam ? n + ' (لازم نیست)' : n));
  modal({
    title: 'درخواست پرداخت ' + p.no, wide: true,
    body: `<div><h2>${esc(p.title)}</h2>${pill(payLabel(p))}</div>${steps(names, p.status === 'جاری' ? nextPayStage(p) : p.stage, p.stage === 4)}
    ${kv([['مبلغ', `<b>${money(p.amount)}</b>`], ['دریافت‌کننده', esc(p.payee)], ['واحد درخواست‌کننده', esc(unitName(p.unitId))], ['ثبت‌کننده', esc(posWho(p.byPos))], ['تصویب امام جماعت', p.needImam ? 'لازم است (بالاتر از سقف)' : 'لازم نیست'], p.docNo && ['شماره سند پرداخت', esc(p.docNo)], p.desc && ['توضیح', esc(p.desc)], p.files.length && ['مستندات', files(p.files)]])}
    <div><h3>سابقه تأییدها</h3>${histHTML(p.history)}</div>`,
    foot: payCanAct(p) ? btn(nextPayStage(p) === 4 ? 'ثبت پرداخت' : 'تأیید: ' + PAY_ST[nextPayStage(p)], 'payDo', { id, ok: 1 }) + btn('رد', 'payDo', { id, ok: 0 }, 'danger') : ''
  });
}
A.payDo = d => { const p = DB.payreqs.find(x => x.id === d.id); const s = nextPayStage(p); actModal(+d.ok ? PAY_ST[s] : 'رد درخواست پرداخت', v => run('payAct', p.id, !!+d.ok, v.note, v.doc), { fields: +d.ok && s === 4 ? [{ k: 'doc', l: 'شماره سند پرداخت', req: true }] : [], noteReq: !+d.ok, reopen: () => showPay(p.id) }); };

/* ---------- منابع انسانی و امور اداری ---------- */
PAGES.hr = () => {
  const full = canHR();
  const v = vs('hr', { tab: full ? 'files' : 'leave' });
  let body = '';
  const approvals = DB.leaves.filter(leaveCanAct);
  if (v.tab === 'files') {
    if (!full) body = denied('پرونده‌های اداری فقط برای مدیریت امور اداری و امام جماعت قابل مشاهده است.');
    else {
      const rows = DB.users.filter(u => textMatch(v.q, u.name, u.username, posLabel(u.posId)) && (!v.u || (posById(u.posId) || {}).unitId === +v.u));
      body = `<section class="card">${filterBar('hr', [{ k: 'q', t: 'search', l: 'جست‌وجوی نام یا سمت…' }, { k: 'u', l: 'مدیریت', o: unitOpts(true) }])}<div class="cb flush">${table([['نام', u => `<b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span>`], ['سمت سازمانی', u => esc(u.posId ? posLabel(u.posId) : 'بدون جایگاه')], ['تاریخ شروع همکاری', u => jd(u.hired)], ['وضعیت', u => pill(u.active ? 'فعال' : 'غیرفعال')]], rows, { click: 'person' })}</div></section>`;
    }
  }
  if (v.tab === 'leave') {
    const mine = DB.leaves.filter(l => l.uid === ME.user.id);
    const unitL = DB.leaves.filter(l => (full || (isMgr(l.unitId) && inUnit(l.unitId))) && l.uid !== ME.user.id);
    const lt = rows => table([['شماره', l => `<span class="code">${esc(l.no)}</span>`], ['کارمند', l => esc(userById(l.uid).name) + `<span class="sub">${esc(posLabel(l.pos))}</span>`], ['نوع', l => esc(l.type)], ['از', l => jd(l.from)], ['تا', l => jd(l.to)], ['وضعیت', l => pill(l.status)]], rows.sort(by('created', -1)), { click: 'leave', empty: 'موردی نیست.' });
    body = `${card('درخواست‌های مرخصی من', lt(mine), btn('درخواست مرخصی', 'newLeave', {}, 'sm', 'plus'), { flush: true })}${unitL.length || approvals.length ? card(full ? 'همه درخواست‌های مرخصی' : 'مرخصی کارکنان واحد', lt(unitL), approvals.length ? `<small>${fa(approvals.length)} مورد منتظر اقدام شما</small>` : '', { flush: true }) : ''}`;
  }
  if (v.tab === 'mission') body = card('مأموریت‌ها', table([['کارمند', m => esc(userById(m.uid)?.name)], ['مقصد', m => esc(m.dest)], ['موضوع', m => esc(m.title)], ['از', m => jd(m.from)], ['تا', m => jd(m.to)], ['وضعیت', m => pill(m.status || 'تأییدشده')]], DB.missions.filter(m => full || m.uid === ME.user.id)), full ? btn('ثبت مأموریت', 'newHR', { k: 'missions' }, 'sm', 'plus') : '', { flush: true });
  if (v.tab === 'decree') body = card('احکام و ابلاغ‌ها', table([['شماره حکم', d => esc(d.no)], ['عنوان', d => esc(d.title)], ['کارمند', d => esc(userById(d.uid)?.name)], ['سمت', d => esc(posLabel(d.pos))], ['تاریخ', d => jd(d.date)]], DB.decrees.filter(d => full || d.uid === ME.user.id)), full ? btn('ثبت حکم / ابلاغ', 'newHR', { k: 'decrees' }, 'sm', 'plus') : '', { flush: true });
  if (v.tab === 'contract') body = full ? card('بایگانی قراردادها', table([['کارمند', c => esc(userById(c.uid)?.name)], ['نوع قرارداد', c => esc(c.type)], ['عنوان', c => esc(c.title)], ['شروع', c => jd(c.from)], ['پایان', c => dueTxt(c.to)]], DB.contracts), btn('ثبت قرارداد', 'newHR', { k: 'contracts' }, 'sm', 'plus'), { flush: true }) : denied('بایگانی قراردادها فقط برای مدیریت امور اداری قابل مشاهده است.');
  if (v.tab === 'meet') body = card('جلسات، صورت‌جلسات و پیگیری مصوبات', `<p>مدیریت جلسات، ثبت صورت‌جلسه و پیگیری مصوبات در بخش «تقویم و جلسات» یکپارچه شده است.</p><a class="btn" href="#calendar">${ic('cal')}رفتن به تقویم و جلسات</a>`);
  return `${head('منابع انسانی و امور اداری', 'زیر نظر مدیریت امور اداری؛ اطلاعات پرسنلی فقط برای اشخاص مجاز نمایش داده می‌شود', btn('پرونده من', 'person', { id: ME.user.id }, 'ghost', 'user'))}
  ${tabs('hr', [...(full ? [['files', 'پرونده اداری کارکنان']] : []), ['leave', `مرخصی${approvals.length ? ' (' + fa(approvals.length) + ')' : ''}`], ['mission', 'مأموریت‌ها'], ['decree', 'احکام و ابلاغ‌ها'], ...(full ? [['contract', 'قراردادها']] : []), ['meet', 'جلسات و مصوبات']], v.tab)}${body}`;
};
A.person = d => showPerson(d.id);
function showPerson(id) {
  const u = userById(id);
  if (!u || !(canHR() || u.id === ME.user.id)) return toast('دسترسی به پرونده اداری مجاز نیست.');
  audit('مشاهده پرونده اداری', 'person', u.id, u.name); Store.save();
  const ph = DB.posHistory.filter(h => h.userId === u.id);
  modal({
    title: 'پرونده اداری — ' + u.name, wide: true,
    body: `${kv([['نام', `<b>${esc(u.name)}</b>`], ['نام کاربری', `<span class="code">${esc(u.username)}</span>`], ['سمت فعلی', esc(u.posId ? posLabel(u.posId) : 'بدون جایگاه')], ['تلفن همراه', `<span class="code">${fa(u.phone || '—')}</span>`], ['شروع همکاری', jd(u.hired)], ['وضعیت حساب', pill(u.active ? 'فعال' : 'غیرفعال')]])}
    <div><h3>سوابق جایگاه سازمانی</h3>${table([['جایگاه', h => esc(posLabel(h.posId))], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : 'اکنون')]], ph.map(h => ({ ...h, id: h.posId })))}</div>
    <div class="grid g2"><div><h3>احکام</h3>${table([['عنوان', x => esc(x.title)], ['تاریخ', x => jd(x.date)]], DB.decrees.filter(x => x.uid === u.id))}</div><div><h3>مرخصی‌ها</h3>${table([['نوع', x => esc(x.type)], ['از', x => jd(x.from)], ['وضعیت', x => pill(x.status)]], DB.leaves.filter(x => x.uid === u.id))}</div></div>
    ${canHR() ? `<div><h3>قراردادها</h3>${table([['نوع', x => esc(x.type)], ['از', x => jd(x.from)], ['تا', x => jd(x.to)]], DB.contracts.filter(x => x.uid === u.id))}</div>` : ''}`
  });
}
A.leave = d => showLeave(d.id);
A.newLeave = () => formModal('درخواست مرخصی', [{ k: 'type', l: 'نوع مرخصی', t: 'select', o: LEAVE_TYPES, blank: false }, { k: 'from', l: 'از تاریخ', t: 'date', req: true }, { k: 'to', l: 'تا تاریخ', t: 'date', req: true }, { k: 'reason', l: 'توضیح', t: 'textarea' }], { from: addDays(todayISO(), 1), to: addDays(todayISO(), 1) }, v => run('createLeave', v), { done: 'درخواست مرخصی برای تأیید ارسال شد.' });
function showLeave(id) {
  const l = DB.leaves.find(x => x.id === id); if (!l) return;
  modal({
    title: 'مرخصی ' + l.no,
    body: `${pill(l.status)}${kv([['کارمند', esc(userById(l.uid).name)], ['سمت', esc(posLabel(l.pos))], ['نوع', esc(l.type)], ['بازه', `${jd(l.from)} تا ${jd(l.to)} (${fa(daysBetween(l.from, l.to) + 1)} روز)`], ['توضیح', esc(l.reason || '—')]])}<div><h3>سابقه</h3>${histHTML(l.history)}</div>`,
    foot: leaveCanAct(l) ? btn('تأیید', 'leaveDo', { id, ok: 1 }) + btn('رد', 'leaveDo', { id, ok: 0 }, 'danger') : ''
  });
}
A.leaveDo = d => { const l = DB.leaves.find(x => x.id === d.id); actModal(+d.ok ? 'تأیید مرخصی' : 'رد مرخصی', v => run('leaveAct', l.id, !!+d.ok, v.note), { noteReq: !+d.ok, reopen: () => showLeave(l.id) }); };
A.newHR = d => {
  const F = {
    missions: [{ k: 'uid', l: 'کارمند', t: 'select', o: DB.users.filter(u => u.active).map(u => [u.id, u.name + ' — ' + posLabel(u.posId)]), req: true }, { k: 'dest', l: 'مقصد', req: true }, { k: 'title', l: 'موضوع مأموریت', req: true }, { k: 'from', l: 'از', t: 'date', req: true }, { k: 'to', l: 'تا', t: 'date', req: true }],
    decrees: [{ k: 'uid', l: 'کارمند', t: 'select', o: DB.users.filter(u => u.active).map(u => [u.id, u.name]), req: true }, { k: 'pos', l: 'سمت سازمانی', t: 'select', o: allPosOpts(), req: true }, { k: 'title', l: 'عنوان حکم / ابلاغ', req: true }, { k: 'no', l: 'شماره', req: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }],
    contracts: [{ k: 'uid', l: 'کارمند', t: 'select', o: DB.users.map(u => [u.id, u.name]), req: true }, { k: 'type', l: 'نوع قرارداد', t: 'select', o: ['قرارداد کار معین', 'قرارداد کار موقت', 'قرارداد پاره‌وقت', 'همکاری داوطلبانه'], req: true }, { k: 'title', l: 'عنوان شغل', req: true }, { k: 'from', l: 'شروع', t: 'date', req: true }, { k: 'to', l: 'پایان', t: 'date', req: true }]
  }[d.k];
  formModal('ثبت', F, { date: todayISO(), from: todayISO(), to: addDays(todayISO(), 1) }, v => run('addHR', d.k, v));
};

/* بازکننده‌های عمومی برای جست‌وجو و صف کارها */
A.open = d => {
  const g = $('#gres'); if (g) g.hidden = true;
  ({ letter: showLetter, order: showOrder, task: showTask, req: showReq, meet: showMeeting, res: showRes, asset: showAsset, person: showPerson, pay: showPay, leave: showLeave, move: showMove })[d.k](d.id);
};

/* =====================================================================
   صفحات: گزارش‌گیری، اعلان‌ها، کاربران و دسترسی‌ها، تنظیمات و آرشیو
   ===================================================================== */

/* ---------- گزارش‌گیری و نظارت ---------- */
PAGES.reports = () => {
  if (!can('reports.view')) return denied();
  const v = vs('rep', { type: '' });
  const [jy, jm] = isoToJ(todayISO());
  if (v.f === undefined) { v.f = fa(`${jy}/${pad(jm)}/01`); v.t = jd(todayISO()); }
  const units = UNITS.filter(u => (isAll() ? !v.u || u.id === +v.u : u.id === myUnit()));
  const F = v.f, T = v.t;
  const stats = units.map(u => ({ id: u.id, u, ...unitStats(u.id, F, T) }));
  const tot = k => sum(stats, s => s[k]);
  const pct = tot('tasks') ? Math.round((tot('done') / tot('tasks')) * 100) : 0;
  const uIds = units.map(u => u.id);
  const resv = DB.reservations.filter(r => inRange(r.date, F, T) && (isAll() ? !v.u || resUnit(r) === +v.u : resUnit(r) === myUnit() || r.fromUnit === myUnit()));
  const pays = DB.payreqs.filter(p => uIds.includes(p.unitId) && inRange(isoOfStamp(p.created), F, T));
  const proj = isAll() || inUnit(U_CIVIL) ? reg(U_CIVIL, 'projects') : [];
  const st = v.st;
  /* فهرست جزئیات بر اساس نوع فعالیت و وضعیت */
  let detail = [];
  const want = t => !v.type || v.type === t;
  if (want('وظیفه')) detail.push(...DB.tasks.filter(t => uIds.includes(t.unitId) && inRange(t.start, F, T)).map(t => ({ id: t.id, k: 'task', type: 'وظیفه', no: t.no, title: t.title, unit: t.unitId, date: t.start, st: taskStatus(t) })));
  if (want('درخواست')) detail.push(...DB.requests.filter(r => uIds.includes(r.toUnit) && inRange(isoOfStamp(r.created), F, T)).map(r => ({ id: r.id, k: 'req', type: 'درخواست', no: r.no, title: r.title, unit: r.toUnit, date: isoOfStamp(r.created), st: reqLabel(r) })));
  if (want('دستور')) detail.push(...DB.orders.filter(o => o.units.some(u => uIds.includes(u)) && inRange(o.issued, F, T)).map(o => ({ id: o.id, k: 'order', type: 'دستور', no: o.no, title: o.title, unit: o.units[0], date: o.issued, st: orderStatus(o) })));
  if (want('نامه')) detail.push(...DB.letters.filter(l => uIds.includes(l.unitId) && inRange(l.date, F, T) && canSeeLetter(l)).map(l => ({ id: l.id, k: 'letter', type: 'نامه', no: fa(l.no), title: l.subject, unit: l.unitId, date: l.date, st: l.status })));
  if (st) detail = detail.filter(x => x.st === st);
  const cult = DB.requests.filter(r => r.toUnit === U_CULTURE && inRange(isoOfStamp(r.created), F, T)).length + reg(5, 'prog').filter(x => inRange(x.date, F, T)).length + reg(11, 'events').filter(x => inRange(x.date, F, T)).length;
  const chartRows = stats.slice().sort((a, b) => b.pct - a.pct);
  const hb = `<div class="chart"><svg viewBox="0 0 560 ${chartRows.length * 26 + 10}" role="img" aria-label="درصد تکمیل وظایف">${chartRows.map((s, i) => { const w = (s.pct / 100) * 330; return `<text x="552" y="${i * 26 + 20}" text-anchor="end">${esc(s.u.short)}</text><rect x="${430 - w}" y="${i * 26 + 8}" width="${w}" height="16" rx="3" class="b1"/><rect x="100" y="${i * 26 + 8}" width="330" height="16" rx="3" fill="none" stroke="var(--line)"/><text x="${Math.max(30, 422 - w)}" y="${i * 26 + 20}" text-anchor="end">${fa(s.pct)}٪</text>`; }).join('')}</svg></div>`;
  return `${head('گزارش‌گیری و نظارت', isAll() ? 'داشبورد نظارتی بر عملکرد ۱۷ مدیریت' : 'گزارش عملکرد ' + esc(unitName(myUnit())))}
  <section class="card">${filterBar('rep', [{ k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }, ...(isAll() ? [{ k: 'u', l: 'همه مدیریت‌ها', o: unitOpts() }] : []), { k: 'type', l: 'همه انواع فعالیت', o: ['وظیفه', 'درخواست', 'دستور', 'نامه'] }, { k: 'st', l: 'همه وضعیت‌ها', o: ['جدید', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده', 'معوق', 'بایگانی', 'ردشده', 'ارجاع‌شده'] }])}
  <div class="cb row">${btn('امروز', 'repRange', { r: 'd' }, 'sm ghost')}${btn('این هفته', 'repRange', { r: 'w' }, 'sm ghost')}${btn('این ماه', 'repRange', { r: 'm' }, 'sm ghost')}${btn('امسال', 'repRange', { r: 'y' }, 'sm ghost')}<span class="hint">بازه: ${esc(F || '—')} تا ${esc(T || '—')}</span></div></section>
  <div class="tiles">${tile('وظایف در بازه', tot('tasks'))}${tile('درصد تکمیل', fa(pct) + '٪', fa(tot('done')) + ' مورد', pct >= 70 ? 'ok' : 'warn')}${tile('وظایف معوق', tot('late'), '', tot('late') ? 'bad' : 'ok')}${tile('درخواست‌های معوق', tot('reqLate'), '', tot('reqLate') ? 'bad' : '')}${tile('میانگین زمان رسیدگی', (() => { const a = stats.filter(s => s.avg != null); return a.length ? fa((sum(a, s => s.avg) / a.length).toFixed(1)) + ' روز' : '—'; })())}${tile('مکاتبات', tot('letters'))}${tile('فعالیت‌های فرهنگی', cult, 'درخواست، برنامه پایگاه و کتابخانه')}</div>
  <div class="grid g-main">
    ${card('عملکرد مدیریت‌ها', table([['مدیریت', s => esc(s.u.name)], ['وظایف', s => fa(s.tasks)], ['تکمیل', s => fa(s.pct) + '٪'], ['معوق', s => (s.late ? pill(fa(s.late), 'bad') : fa(0))], ['درخواست باز', s => fa(s.reqOpen)], ['دستور باز', s => fa(s.ordOpen)], ['میانگین رسیدگی', s => (s.avg == null ? '—' : fa(s.avg.toFixed(1)) + ' روز')], ['مکاتبات', s => fa(s.letters)]], stats), '', { flush: true })}
    ${card('درصد وظایف تکمیل‌شده', hb)}
  </div>
  <div class="grid g3">
    ${card('وضعیت رزروها', `<div class="tiles">${RES_ST.map(s => tile(s, resv.filter(r => r.status === s).length)).join('')}</div>`)}
    ${card('وضعیت درخواست‌های مالی', `<div class="tiles">${['در انتظار تأیید مدیر واحد', 'در انتظار بررسی امور مالی', 'در انتظار تصویب امام جماعت', 'در انتظار پرداخت', 'پرداخت‌شده', 'ردشده'].map(s => tile(s.replace('در انتظار ', ''), pays.filter(p => payLabel(p) === s).length, s.startsWith('در انتظار') ? 'در انتظار' : '')).join('')}</div>`)}
    ${proj.length ? card('عملکرد پروژه‌های عمرانی', `<div class="list">${proj.map(p => `<div class="li"><div class="t"><b>${esc(p.title)}</b><small>${esc(p.contractor)} · پایان ${jd(p.end)} · هزینه ${fa(Math.round((p.spent / (p.budget || 1)) * 100))}٪ بودجه</small>${bar(p.progress, p.end < todayISO() && p.progress < 100 ? 'bad' : '')}</div><b class="num">${fa(p.progress)}٪</b></div>`).join('')}</div>`, '', { flush: true }) : card('روند ماهانه', monthlyChart(x => uIds.includes(x)))}
  </div>
  ${card('فهرست فعالیت‌ها بر اساس فیلتر', table([['نوع', x => pill(x.type, 'mute')], ['شماره', x => `<span class="${x.k === 'letter' ? 'lno' : 'code'}">${esc(x.no)}</span>`], ['عنوان', x => esc(x.title)], ['مدیریت', x => esc(unitShort(x.unit))], ['تاریخ', x => jd(x.date)], ['وضعیت', x => pill(x.st)]], detail.sort(by('date', -1)).slice(0, 80).map(x => ({ ...x, id: x.id + '|' + x.k })), { click: 'arch' }), `<small>${fa(detail.length)} مورد</small>`, { flush: true })}`;
};
A.repRange = d => {
  const v = vs('rep'); const T = todayISO(); const [y, m] = isoToJ(T);
  v.t = jd(T);
  v.f = d.r === 'd' ? jd(T) : d.r === 'w' ? jd(addDays(T, -weekday(T))) : d.r === 'm' ? fa(`${y}/${pad(m)}/01`) : fa(`${y}/01/01`);
  route();
};

/* ---------- اعلان‌ها ---------- */
PAGES.notifications = () => {
  const v = vs('notif', { tab: 'unread' });
  let rows = DB.notifs.filter(n => n.pos === ME.pos.id);
  const unread = rows.filter(n => !n.read).length;
  if (v.tab === 'unread') rows = rows.filter(n => !n.read);
  if (v.ev) rows = rows.filter(n => n.ev === v.ev);
  rows = rows.slice().reverse();
  return `${head('مرکز اعلان‌ها', 'اعلان داخلی رویدادهای مرتبط با جایگاه شما؛ در صورت فعال‌بودن سرویس، پیامک بدون جزئیات محرمانه ارسال می‌شود', unread ? btn('علامت‌گذاری همه به‌عنوان خوانده‌شده', 'readAll', {}, 'ghost') : '')}
  ${tabs('notif', [['unread', `خوانده‌نشده (${fa(unread)})`], ['all', 'همه']], v.tab)}
  <section class="card">${filterBar('notif', [{ k: 'ev', l: 'همه رویدادها', o: Object.entries(SMS_EVENTS) }])}<div class="cb flush">${rows.length ? `<div class="list">${rows.slice(0, 120).map(n => `<a class="li" data-a="notif" data-id="${n.id}" style="${n.read ? 'opacity:.7' : ''}"><div class="k">${ic('bell')}</div><div class="t"><b>${esc(n.text)}</b><small>${esc(SMS_EVENTS[n.ev] || '')} · ${jdt(n.ts)}</small></div>${n.read ? '' : pill('جدید', 'new')}</a>`).join('')}</div>` : empty('اعلانی وجود ندارد.')}</div></section>`;
};
A.readAll = async () => { await run('readAllNotifs'); refresh(); toast('همه اعلان‌ها خوانده شد.'); };

/* ---------- جایگاه‌ها (اقدام‌های مشترک پنل مدیریت) ---------- */
A.assign = d => formModal('تغییر متصدی — ' + posLabel(d.id), [{ k: 'user', l: 'متصدی جدید', t: 'select', o: DB.users.filter(u => u.active && !u.deleted && u.id !== ME.user.id).map(u => [u.id, `${u.name} (${u.posId ? posLabel(u.posId) : 'بدون جایگاه'})`]), req: true }], {}, v => run('assignHolder', d.id, v.user), { submit: 'ثبت انتصاب', done: 'متصدی جایگاه تغییر کرد؛ سوابق جایگاه حفظ شد.' });
A.posHist = d => modal({ title: 'سوابق جایگاه ' + posLabel(d.id), body: table([['متصدی', h => esc(userById(h.userId)?.name || '—')], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : 'اکنون')]], DB.posHistory.filter(h => h.posId === d.id).map((h, i) => ({ ...h, id: i }))) });
A.addPos = d => formModal('افزودن جایگاه به ' + unitShort(+d.u), [{ k: 'title', l: 'عنوان جایگاه', req: true, ph: 'مثلاً: معاون، کارشناس، کارمند خدمات' }], {}, v => run('addPosition', { ...v, unitId: +d.u }));

/* ---------- آرشیو و رویدادها (برای همه کاربران، در محدوده دسترسی) ---------- */
PAGES.system = () => {
  const v = vs('sys', { tab: 'archive' });
  if (!['archive', 'audit'].includes(v.tab)) v.tab = 'archive';
  let body = '';
  if (v.tab === 'archive') {
    const rows = [
      ...DB.letters.filter(l => l.status === 'بایگانی' && canSeeLetter(l)).map(l => ({ id: l.id, k: 'letter', type: 'نامه', no: fa(l.no), title: l.subject, unit: l.unitId, date: l.date })),
      ...DB.requests.filter(r => ['بایگانی', 'ردشده', 'لغوشده'].includes(r.status) && canSeeReq(r)).map(r => ({ id: r.id, k: 'req', type: 'درخواست', no: r.no, title: r.title, unit: r.toUnit, date: isoOfStamp(r.doneAt || r.created), st: r.status })),
      ...DB.orders.filter(o => o.status === 'تکمیل‌شده' && canSeeOrder(o)).map(o => ({ id: o.id, k: 'order', type: 'دستور', no: o.no, title: o.title, unit: o.units[0], date: o.issued })),
      ...DB.tasks.filter(t => t.status === 'تکمیل‌شده' && canSeeTask(t)).map(t => ({ id: t.id, k: 'task', type: 'وظیفه', no: t.no, title: t.title, unit: t.unitId, date: t.start })),
      ...DB.meetings.filter(m => m.date < todayISO() && canSeeMeeting(m)).map(m => ({ id: m.id, k: 'meet', type: m.kind, no: m.no, title: m.title, unit: m.unitId, date: m.date }))
    ].filter(x => textMatch(v.q, x.no, x.title) && (!v.ty || x.type === v.ty)).sort(by('date', -1));
    body = `<section class="card">${filterBar('sys', [{ k: 'q', t: 'search', l: 'جست‌وجو در آرشیو دائمی…' }, { k: 'ty', l: 'همه انواع', o: ['نامه', 'درخواست', 'دستور', 'وظیفه', 'جلسه', 'ملاقات'] }])}<div class="cb flush">${table([['نوع', x => pill(x.type, 'mute')], ['شماره', x => `<span class="${x.k === 'letter' ? 'lno' : 'code'}">${esc(x.no)}</span>`], ['عنوان', x => esc(x.title)], ['مدیریت', x => esc(unitShort(x.unit))], ['تاریخ', x => jd(x.date)], ['وضعیت', x => pill(x.st || 'بایگانی')]], rows.map(x => ({ ...x, id: x.id + '|' + x.k })), { click: 'arch' })}</div></section>`;
  }
  if (v.tab === 'audit') {
    const rows = DB.audit.filter(a => (isAll() || can('admin.logs') ? true : a.unit === myUnit()) && textMatch(v.aq, a.act, a.note, (userById(a.uid) || {}).name || '')).slice().reverse().slice(0, 300);
    body = `<div class="notice">رویدادها فقط ${SERVER ? 'روی سرور و در جدول افزودنی (بدون امکان ویرایش و حذف از طریق سامانه) ثبت می‌شوند' : 'در این نسخه نمایشی در همین مرورگر ثبت می‌شوند و فقط برای آشنایی است'}.</div>
    <section class="card">${filterBar('sys', [{ k: 'aq', t: 'search', l: 'جست‌وجو در رویدادها…' }])}<div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc((userById(a.uid) || {}).name || 'سامانه') + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['شرح', a => esc(a.note)]], rows.map((a, i) => ({ ...a, id: i })))}</div></section>`;
  }
  return `${head('آرشیو و رویدادها', 'آرشیو دائمی مکاتبات و اقدامات و سوابق رویدادهای واحد شما')}${tabs('sys', [['archive', 'آرشیو سامانه'], ['audit', isAll() || can('admin.logs') ? 'رویدادهای سیستمی' : 'رویدادهای واحد من']], v.tab)}${canAdminPanel() ? `<div class="notice">تنظیمات، پیامک و پشتیبان‌گیری در <a href="#admin">پنل مدیریت سامانه</a> است.</div>` : ''}${body}`;
};
A.arch = d => { const [id, k] = d.id.split('|'); A.open({ k, id }); };

/* ---------- پشتیبان‌گیری و بازیابی ---------- */
A.backup = async () => {
  if (!can('admin.backup')) return toast('پشتیبان‌گیری برای جایگاه شما مجاز نیست.');
  if (SERVER) { const r = await Remote.post('/api/backups', {}); if (r.error) return toast(r.error); toast('نسخه پشتیبان روی سرور ذخیره شد: ' + r.name); await Remote.refresh(); return; }
  const json = JSON.stringify(DB);
  DB.settings.backups.push({ ts: stamp(), by: ME.user.name, size: json.length, n: DB.letters.length + DB.tasks.length + DB.requests.length + DB.orders.length });
  audit('تهیه نسخه پشتیبان', 'backup', '', fa(Math.round(json.length / 1024)) + 'KB');
  Store.save();
  const name = `kartabl-backup-${todayISO()}.json`;
  modal({ title: 'نسخه پشتیبان', wide: true, body: `<p>فایل را دریافت کنید یا متن زیر را کپی و در فایلی با پسوند <span class="code">.json</span> ذخیره کنید.</p><p><a class="btn" href="data:application/json;charset=utf-8,${encodeURIComponent(json)}" download="${name}">${ic('archive')}دریافت فایل پشتیبان</a></p><textarea id="bk" readonly class="json" aria-label="متن نسخه پشتیبان">${esc(json)}</textarea>`, foot: btn('کپی متن', 'copyBk', {}, 'ghost', 'file') });
  route();
};
A.copyBk = () => { const t = $('#bk'); navigator.clipboard.writeText(t.value).then(() => toast('نسخه پشتیبان کپی شد.'), () => { t.select(); toast('متن انتخاب شد؛ با Ctrl+C کپی کنید.'); }); };
A.restore = () => formModal('بازیابی از نسخه پشتیبان', [{ k: 'file', l: 'فایل پشتیبان', t: 'file', single: true, hint: 'یا متن را در کادر زیر بچسبانید' }, { k: 'json', l: 'متن نسخه پشتیبان (JSON)', t: 'textarea' }], {}, async v => {
  if (!can('admin.backup')) return fail('بازیابی برای جایگاه شما مجاز نیست.');
  let text = v.json;
  if (v.file && v.file.length && v.file[0].text != null) text = v.file[0].text;
  if (!text) return fail('فایل یا متن نسخه پشتیبان را وارد کنید.');
  let d; try { d = JSON.parse(text); } catch (e) { return fail('متن واردشده JSON معتبر نیست.'); }
  if (SERVER) return Remote.post('/api/backups/restore', { data: d });
  const errs = validateBackup(d, ME.user.id);
  if (errs.length) return fail('نسخه پشتیبان پذیرفته نشد:\n• ' + errs.join('\n• '));
  try { localStorage.setItem('shabab-prerestore', JSON.stringify(DB)); } catch (e) { return fail('ذخیره خودکار نسخه فعلی پیش از بازیابی ممکن نشد؛ بازیابی انجام نشد.'); }
  const me = ME.user.id;
  const next = migrate(d);
  const prev = DB; DB = next;
  try { applySettings(); const u = userById(me); if (!u || !u.posId) throw new Error('حساب شما در نسخه پشتیبان نیست.'); setMe(u); audit('بازیابی نسخه پشتیبان', 'backup', '', 'نسخه فعلی پیش از بازیابی ذخیره شد'); }
  catch (e) { DB = prev; applySettings(); setMe(userById(me)); return fail('بازیابی انجام نشد: ' + e.message); }
  return {};
}, { done: 'اطلاعات بازیابی شد؛ نسخه قبلی به‌طور خودکار نگهداری شد.', submit: 'بررسی و بازیابی' });
A.resetDemo = () => modal({ title: 'بازنشانی داده‌های نمونه', body: '<p>همه داده‌های این مرورگر حذف و داده‌های نمونه آغازین جایگزین می‌شوند. ابتدا نسخه پشتیبان تهیه کنید.</p>', foot: btn('بله، بازنشانی شود', 'resetGo', {}, 'danger') + btn('انصراف', 'close', {}, 'ghost') });
A.resetGo = () => { if (SERVER || !can('admin.backup')) return toast('این کار فقط در نسخه نمایشی و برای مدیر سامانه است.'); const name = ME.user.username; Store.reset(); migrate(DB); applySettings(); closeModal(); const u = DB.users.find(x => x.username === name); if (u) { setMe(u); renderShell(); } else A.logout(); toast('داده‌های نمونه بازنشانی شد.'); };

/* =====================================================================
   رابط پنل مدیریت سامانه، ساعت زنده و حساب کاربری
   ===================================================================== */
function heroHTML() {
  const a = DB.settings.announcement;
  const pr = DB.settings.clock.prayer ? todayPrayers() : [];
  const role = myRole();
  return `<section class="hero">
    <div class="hero-main">
      <div class="eyebrow">${esc(posLabel(ME.pos.id))}</div>
      <h1>سلام، ${esc(ME.user.name)}</h1>
      <p>${esc(DB.settings.orgName)}</p>
      ${a.on && a.text ? `<div class="hero-note ${a.tone}">${ic('megaphone')}<span>${esc(a.text)}</span></div>` : ''}
      <div class="row">${role !== 'staff' ? btn('ثبت درخواست', 'newReq', {}, 'light', 'plus') : ''}${can('letters.create') ? btn('ثبت نامه', 'newLetter', {}, 'glass', 'mail') : ''}${isImam() || can('orders.issue') ? btn('صدور دستور', 'newOrder', {}, 'glass', 'flag') : ''}${canAdminPanel() ? `<a class="btn glass" href="#admin">${ic('shield')}پنل مدیریت</a>` : ''}</div>
    </div>
    <div class="hero-clock" aria-label="ساعت و تاریخ زنده">
      <div class="big" id="hclock">${fa(nowHMS())}</div>
      <div class="dates"><b>${jdLong(todayISO())}</b><span>${hijri()}</span><span>${greg()}</span></div>
      <div class="tz">به وقت رسمی ایران · ${esc(DB.settings.clock.city)}</div>
    </div>
    ${pr.length ? `<div class="hero-pray"><div class="ph">اوقات شرعی ${esc(DB.settings.clock.city)}</div>${pr.map(p => `<div class="pt" data-pt="${p.t}"><span>${p.l}</span><b>${fa(p.t)}</b></div>`).join('')}<div class="next" id="hnext"></div><div class="method">روش ژئوفیزیک دانشگاه تهران</div></div>` : ''}
  </section>`;
}
function liveWidgets() {
  const h = $('#hclock'); if (h) h.textContent = fa(nowHMS());
  const n = $('#hnext'); if (!n) return;
  const [H, M, S] = nowHMS().split(':').map(Number); const now = H * 60 + M + S / 60;
  const pts = $$('.hero-pray .pt').filter(x => !/طلوع|غروب|نیمه/.test(x.textContent));
  pts.forEach(x => x.classList.remove('on'));
  let nx = pts.find(x => hmToMin(x.dataset.pt) > now);
  const left = nx ? hmToMin(nx.dataset.pt) - now : hmToMin(pts[0].dataset.pt) + 1440 - now;
  nx = nx || pts[0];
  nx.classList.add('on');
  const lh = Math.floor(left / 60), lm = Math.floor(left % 60), ls = Math.floor((left * 60) % 60);
  n.innerHTML = `${esc(nx.querySelector('span').textContent)} تا <b>${fa(pad(lh) + ':' + pad(lm) + ':' + pad(ls))}</b> دیگر`;
}

/* ---------- پنل مدیریت سامانه ---------- */
const ADMIN_TABS = [
  ['overview', 'نمای کلی', 'pulse', 'admin.panel'], ['users', 'کاربران', 'users', 'admin.users'], ['signups', 'درخواست عضویت', 'user', 'admin.signups'],
  ['perms', 'سطوح دسترسی', 'key', 'admin.perms'], ['approvals', 'تأیید و رد', 'check', 'admin.approve'], ['logins', 'ورودها و نشست‌ها', 'lock', 'admin.logs'],
  ['audit', 'رویدادهای سیستمی', 'history', 'admin.logs'], ['site', 'ظاهر و محتوا', 'palette', 'admin.settings'], ['org', 'ساختار سازمانی', 'building', 'admin.settings'],
  ['security', 'امنیت', 'shield', 'admin.settings'], ['sms', 'پیامک', 'sms', 'admin.settings'], ['data', 'ویرایش داده‌ها', 'db', 'admin.data'], ['backup', 'پشتیبان‌گیری', 'archive', 'admin.backup']
];
PAGES.admin = () => {
  if (!canAdminPanel()) return denied('پنل مدیریت سامانه فقط برای مدیر فناوری اطلاعات و جایگاه‌های دارای مجوز است.');
  const tabsOk = ADMIN_TABS.filter(t => can(t[3]) || (t[0] === 'overview'));
  const v = vs('adm', { tab: tabsOk[0][0] });
  if (!tabsOk.some(t => t[0] === v.tab)) v.tab = tabsOk[0][0];
  const sg = DB.signups.filter(x => x.status === 'در انتظار بررسی').length;
  const pend = can('admin.approve') ? pendingAll().length : 0;
  const nav = `<nav class="admnav" aria-label="بخش‌های پنل مدیریت">${tabsOk.map(t => `<button data-a="tab" data-key="adm" data-v="${t[0]}" class="${v.tab === t[0] ? 'on' : ''}">${ic(t[2])}<span>${t[1]}</span>${t[0] === 'signups' && sg ? `<i>${fa(sg)}</i>` : t[0] === 'approvals' && pend ? `<i>${fa(pend)}</i>` : t[0] === 'users' && lockedUsers().length ? `<i>${fa(lockedUsers().length)}</i>` : ''}</button>`).join('')}</nav>`;
  const body = (ADMIN_VIEWS[v.tab] || ADMIN_VIEWS.overview)();
  return `${head('پنل مدیریت سامانه', 'کنترل کامل کاربران، رمزها، ورودها، دسترسی‌ها، تأییدها، ظاهر و داده‌های سامانه', v.tab === 'users' ? '' : btn('کاربر جدید', 'admNewUser', {}, '', 'plus'))}
  <div class="admin-wrap">${nav}<div class="admin-body">${body}</div></div>`;
};
PAGES.users = () => { vs('adm').tab = 'users'; return PAGES.admin(); };
const userStatus = u => (u.deleted ? pill('حذف‌شده', 'bad') : !u.active ? pill('غیرفعال', 'bad') : u.lockedUntil && new Date(u.lockedUntil) > new Date() ? pill('قفل', 'warn') : pill('فعال', 'ok')) + (u.mustChange ? ' ' + pill('تغییر رمز الزامی', 'info') : '');
const av = name => { const n = (name || '؟').replace(/^(حجت‌الاسلام|سید)\s*/g, '').replace(/^سید\s*/, '').trim(); const hue = parseInt(hash(name || ''), 16) % 360; return `<span class="av" style="--h:${hue}">${esc(n[0] || '؟')}</span>`; };
const isTodayTs = t => isoOfStamp(t) === todayISO();

const ADMIN_VIEWS = {
  overview() {
    const users = DB.users.filter(u => !u.deleted);
    const lt = DB.logins.filter(l => isTodayTs(l.ts));
    const act = DB.sessions.filter(s => s.active);
    const bad = verifyAudit();
    const size = (() => { try { return JSON.stringify(DB).length; } catch (e) { return 0; } })();
    const fails = DB.logins.filter(l => !l.ok).slice(-6).reverse();
    return `<div class="tiles">
      ${tile('کاربران فعال', users.filter(u => u.active).length, fa(users.filter(u => !u.active).length) + ' غیرفعال', 'ok')}
      ${tile('ورود موفق امروز', lt.filter(l => l.ok).length)}
      ${tile('ورود ناموفق امروز', lt.filter(l => !l.ok).length, '', lt.some(l => !l.ok) ? 'bad' : '')}
      ${tile('حساب‌های قفل', lockedUsers().length, '', lockedUsers().length ? 'warn' : '')}
      ${tile('نشست‌های فعال', act.length)}
      ${tile('درخواست عضویت', DB.signups.filter(x => x.status === 'در انتظار بررسی').length, 'در انتظار بررسی', DB.signups.some(x => x.status === 'در انتظار بررسی') ? 'warn' : '')}
      ${tile('موارد معلق سامانه', pendingAll().length, 'قابل تأیید مدیریتی')}
      ${tile('سلامت رویدادها', bad < 0 ? 'سالم' : 'آسیب‌دیده', fa(DB.audit.length) + ' رویداد', bad < 0 ? 'ok' : 'bad')}
    </div>
    <div class="grid g2">
      ${card('اقدامات سریع', `<div class="quick">${[['admNewUser', 'افزودن کاربر', 'plus'], ['go', 'درخواست‌های عضویت', 'user', 'signups'], ['go', 'سطوح دسترسی', 'key', 'perms'], ['go', 'تأیید موارد معلق', 'check', 'approvals'], ['go', 'ظاهر سامانه', 'palette', 'site'], ['go', 'ساختار سازمانی', 'building', 'org'], ['admMaint', DB.settings.maintenance ? 'خروج از حالت به‌روزرسانی' : 'حالت به‌روزرسانی', 'alert'], ['backup', 'تهیه نسخه پشتیبان', 'archive']].map(([a, l, i, t]) => `<button class="qa" data-a="${a === 'go' ? 'admTab' : a}" ${t ? `data-v="${t}"` : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</div>`)}
      ${card('آخرین ورودهای ناموفق', fails.length ? `<div class="list">${fails.map(l => `<div class="li"><div class="k bad">${ic('alert')}</div><div class="t"><b class="code">${esc(l.username || '—')}</b><small>${esc(l.reason)} · ${jdt(l.ts)}</small></div></div>`).join('')}</div>` : empty('ورود ناموفقی ثبت نشده است.'), btn('همه ورودها', 'admTab', { v: 'logins' }, 'sm ghost'), { flush: true })}
    </div>
    ${card('وضعیت سامانه', kv([['نام مجموعه', esc(DB.settings.orgName)], ['حالت به‌روزرسانی', DB.settings.maintenance ? pill('فعال', 'warn') : pill('غیرفعال', 'ok')], ['پیامک', DB.settings.sms.enabled ? pill('فعال', 'ok') : pill('غیرفعال', 'mute')], ['حجم داده', fa(Math.round(size / 1024)) + ' کیلوبایت'], ['ذخیره‌سازی', MEMORY_ONLY ? pill('فقط حافظه موقت', 'bad') : 'مرورگر (نسخه آزمایشی)'], ['آخرین پشتیبان', DB.settings.backups.length ? jdt(DB.settings.backups[DB.settings.backups.length - 1].ts) : pill('تهیه نشده', 'warn')], ['منطقه زمانی', 'Asia/Tehran']]))}`;
  },
  users() {
    const v = vs('admu');
    const rows = DB.users.filter(u => (v.del ? true : !u.deleted) && textMatch(v.q, u.name, u.username, u.phone, posLabel(u.posId))
      && (!v.u || (posById(u.posId) || {}).unitId === +v.u) && (!v.r || (posById(u.posId) || {}).role === v.r)
      && (!v.s || (v.s === 'active' ? u.active && !u.deleted : v.s === 'inactive' ? !u.active : v.s === 'locked' ? lockedUsers().includes(u) : !u.posId)));
    const ib = (a, i, l, id, cls = '') => `<button class="ibtn sm ${cls}" data-a="${a}" data-id="${id}" title="${l}" aria-label="${l}">${ic(i)}</button>`;
    return `<section class="card"><div class="ch"><h2>کاربران سامانه <small>${fa(rows.length)} نفر</small></h2><div class="row">${btn('کاربر جدید', 'admNewUser', {}, 'sm', 'plus')}</div></div>
    ${filterBar('admu', [{ k: 'q', t: 'search', l: 'جست‌وجوی نام، نام کاربری، تلفن، سمت…' }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }, { k: 'r', l: 'همه نقش‌ها', o: Object.entries(ROLES) }, { k: 's', l: 'همه وضعیت‌ها', o: [['active', 'فعال'], ['inactive', 'غیرفعال'], ['locked', 'قفل'], ['nopos', 'بدون جایگاه']] }, { k: 'del', l: 'بدون حذف‌شده‌ها', o: [['1', 'با نمایش حذف‌شده‌ها']] }])}
    <div class="cb flush">${table([
      ['کاربر', u => `<a href="#" class="who2 ulink" data-a="admUserCard" data-id="${u.id}">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span></div></a>`],
      ['جایگاه سازمانی', u => (u.posId ? esc(posLabel(u.posId)) : pill('بدون جایگاه', 'warn'))],
      ['تلفن', u => `<span class="code">${fa(u.phone || '—')}</span>`],
      ['آخرین ورود', u => (u.lastLogin ? jdt(u.lastLogin) : '<span class="sub">هرگز</span>')],
      ['وضعیت', userStatus],
      ['عملیات', u => u.deleted ? '' : `<div class="acts">${ib('admEditUser', 'edit', 'ویرایش', u.id)}${can('admin.passwords') ? ib('admPass', 'key', 'تعیین رمز', u.id) : ''}${u.posId && can('admin.perms') ? ib('admPosPerm', 'shield', 'دسترسی‌های جایگاه', u.posId) : ''}${lockedUsers().includes(u) ? ib('admUnlock', 'unlock', 'بازکردن قفل', u.id) : ''}${u.id !== ME.user.id ? ib('admKick', 'logout', 'خروج اجباری از همه نشست‌ها', u.id) + ib('admToggle', u.active ? 'lock' : 'check', u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', u.id, u.active ? '' : 'ok') + ib('admDel', 'trash', 'حذف کاربر', u.id, 'bad') : ''}</div>`]
    ], rows)}</div></section>
    ${card('جایگاه‌های سازمانی', `<div class="notice">دسترسی‌ها به جایگاه متصل است، نه به شخص. با تغییر متصدی، همه سوابق جایگاه حفظ می‌شود.</div>` + table([
      ['مدیریت', p => esc(unitShort(p.unitId))], ['جایگاه', p => `<b>${esc(p.title)}</b>`], ['نقش', p => pill(ROLES[p.role], 'mute')],
      ['متصدی', p => { const h = holderOf(p.id); return h ? esc(h.name) : pill('بدون متصدی', 'warn'); }],
      ['استثنای دسترسی', p => (Object.keys(p.perms || {}).length ? pill(fa(Object.keys(p.perms).length) + ' مورد', 'info') : '—')],
      ['', p => btn('تغییر متصدی', 'assign', { id: p.id }, 'sm ghost') + ' ' + btn('سوابق', 'posHist', { id: p.id }, 'sm ghost') + (can('admin.perms') ? ' ' + btn('دسترسی', 'admPosPerm', { id: p.id }, 'sm soft') : '') + (p.role === 'staff' ? ' ' + btn('حذف', 'admDelPos', { id: p.id }, 'sm danger') : '')]
    ], DB.positions.filter(p => !vs('admu').u || p.unitId === +vs('admu').u)), [0, ...UNITS.map(u => u.id)].includes(+vs('admu').u) && vs('admu').u ? btn('افزودن جایگاه', 'addPos', { u: vs('admu').u }, 'sm soft', 'plus') : '<small>برای افزودن جایگاه، ابتدا مدیریت را از فیلتر بالا انتخاب کنید</small>', { flush: true })}`;
  },
  signups() {
    const rows = DB.signups.slice().reverse();
    return card('درخواست‌های ایجاد حساب کاربری', table([
      ['کد', s => `<span class="code">${esc(s.no)}</span>`], ['متقاضی', s => `<b>${esc(s.name)}</b><span class="sub code">${esc(s.username)} · ${fa(s.phone)}</span>`],
      ['مدیریت / سمت', s => esc(unitShort(s.unitId)) + `<span class="sub">${esc(s.title)}</span>`], ['زمان', s => jdt(s.created)], ['توضیح', s => esc(s.note || '—')],
      ['وضعیت', s => pill(s.status) + (s.reason ? `<span class="sub">${esc(s.reason)}</span>` : '')],
      ['', s => s.status === 'در انتظار بررسی' ? btn('تأیید', 'admSignOk', { id: s.id }, 'sm') + ' ' + btn('رد', 'admSignNo', { id: s.id }, 'sm danger') : '']
    ], rows, { empty: 'درخواست عضویتی ثبت نشده است. متقاضیان از صفحه ورود «درخواست ایجاد حساب کاربری» را می‌زنند.' }), '', { flush: true });
  },
  perms() {
    const cell = (role, k) => {
      const cur = ((DB.settings.rolePerms[role] || {})[k]) || '';
      const def = permDefault({ role, unitId: role === 'imam' ? 0 : 99 }, k);
      return `<select class="pm ${cur}" data-pm="${role}|${k}" aria-label="${esc(ROLES[role] + ' — ' + permLabel(k))}"><option value="">پیش‌فرض ${def ? '✓' : '✗'}</option><option value="allow" ${cur === 'allow' ? 'selected' : ''}>مجاز</option><option value="deny" ${cur === 'deny' ? 'selected' : ''}>ممنوع</option></select>`;
    };
    let g = '';
    const rows = PERMS.map(p => { const sep = p[2] !== g; g = p[2]; return `${sep ? `<tr class="grp"><td colspan="${Object.keys(ROLES).length + 1}">${esc(p[2])}</td></tr>` : ''}<tr><td>${esc(p[1])}</td>${Object.keys(ROLES).map(r => `<td>${cell(r, p[0])}</td>`).join('')}</tr>`; }).join('');
    const over = DB.positions.filter(p => Object.keys(p.perms || {}).length);
    return `${card('ماتریس دسترسی نقش‌ها', `<div class="notice">هر تغییر فوراً اعمال و در رویدادهای سیستمی ثبت می‌شود. «پیش‌فرض» یعنی رفتار استاندارد سامانه (مثلاً «امور مالی» به‌طور پیش‌فرض فقط برای مدیریت امور مالی باز است). برای یک جایگاه خاص از «استثنای جایگاه» استفاده کنید.</div><div class="tbl-wrap matrix-wrap" tabindex="0" aria-label="ماتریس دسترسی؛ برای دیدن همه نقش‌ها افقی پیمایش کنید"><table class="matrix"><thead><tr><th>مجوز</th>${Object.values(ROLES).map(r => `<th>${r}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`, '', { flush: false })}
    ${card('استثنای دسترسی جایگاه‌ها', table([['جایگاه', p => `<b>${esc(posLabel(p.id))}</b><span class="sub">${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</span>`], ['استثناها', p => Object.entries(p.perms).map(([k, v]) => pill((v === 'allow' ? '+ ' : '− ') + permLabel(k), v === 'allow' ? 'ok' : 'bad')).join(' ')], ['', p => btn('ویرایش', 'admPosPerm', { id: p.id }, 'sm ghost')]], over, { empty: 'هنوز برای هیچ جایگاهی استثنا تعریف نشده است.' }), `<select id="pickpos" aria-label="انتخاب جایگاه"><option value="">انتخاب جایگاه برای تعیین دسترسی…</option>${allPosOpts().map(gp => `<optgroup label="${esc(gp.group)}">${gp.items.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select>`, { flush: true })}`;
  },
  approvals() {
    const v = vs('admap');
    const rows = pendingAll().filter(x => (!v.k || x.k === v.k) && (!v.u || x.unit === +v.u));
    return `<div class="notice warn">${ic('alert')} تأیید یا رد مدیریتی به‌جای جایگاه مسئول انجام می‌شود و با نام شما و عبارت «اقدام مدیریتی» در سابقه همان مورد و رویدادهای سیستمی ثبت می‌گردد.</div>
    <section class="card">${filterBar('admap', [{ k: 'k', l: 'همه انواع', o: [['req', 'درخواست'], ['order', 'دستور'], ['pay', 'پرداخت'], ['res', 'رزرو'], ['leave', 'مرخصی'], ['asset', 'گردش کالا'], ['task', 'وظیفه']] }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts() }])}
    <div class="cb flush">${table([['نوع', x => pill(x.type, 'mute')], ['شماره', x => `<span class="code">${esc(x.no)}</span>`], ['موضوع', x => `<a href="#" data-a="open" data-k="${x.k}" data-id="${x.id}">${esc(x.title)}</a>`], ['مدیریت', x => esc(unitShort(x.unit))], ['منتظر', x => esc(posWho(x.wait))], ['انتظار', x => (x.age ? fa(x.age) + ' روز' : 'امروز')], ['', x => btn('تأیید', 'admOk', { i: x.no }, 'sm') + ' ' + btn('رد', 'admNo', { i: x.no }, 'sm danger')]], rows.map(x => ({ ...x, id: x.id })), { empty: 'هیچ مورد معلقی در سامانه نیست.' })}</div></section>`;
  },
  logins() {
    const v = vs('adml');
    const rows = DB.logins.filter(l => (!v.s || (v.s === 'ok' ? l.ok : !l.ok)) && textMatch(v.q, l.username, (userById(l.uid) || {}).name || '', l.reason) && inRange(isoOfStamp(l.ts), v.f, v.t)).slice().reverse().slice(0, 300);
    const act = DB.sessions.filter(s => s.active).slice().reverse();
    return `${card('نشست‌های فعال', table([['کاربر', s => { const u = userById(s.uid) || {}; return `<div class="who2">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub">${esc(posLabel(u.posId))}</span></div></div>`; }], ['شروع', s => jdt(s.start)], ['آخرین فعالیت', s => jdt(s.last)], ['مرورگر', s => `<span class="code">${esc(s.agent || '—')}</span>`], ['', s => (s.id === (mySession() || {}).id ? pill('نشست شما', 'info') : btn('پایان نشست', 'admEndSes', { id: s.id }, 'sm danger'))]], act.map(s => ({ ...s }))), act.length > 1 ? btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'sm danger') : '', { flush: true })}
    <section class="card"><div class="ch"><h2>تاریخچه ورود <small>${fa(DB.logins.length)} مورد</small></h2></div>${filterBar('adml', [{ k: 'q', t: 'search', l: 'نام کاربری، نام یا علت…' }, { k: 's', l: 'همه نتایج', o: [['ok', 'موفق'], ['fail', 'ناموفق']] }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['زمان', l => jdt(l.ts)], ['نام کاربری', l => `<span class="code">${esc(l.username)}</span>`], ['کاربر', l => esc((userById(l.uid) || {}).name || '—')], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)], ['مرورگر', l => `<span class="code">${esc(l.agent || '')}</span>`]], rows)}</div></section>`;
  },
  audit() {
    const v = vs('adma');
    const bad = verifyAudit();
    const rows = DB.audit.map((a, i) => ({ ...a, id: i })).filter(a => textMatch(v.q, a.act, a.note, (userById(a.uid) || {}).name || '') && (!v.u || a.unit === +v.u) && (!v.e || a.ent === v.e) && inRange(isoOfStamp(a.ts), v.f, v.t)).reverse().slice(0, 400);
    const ents = [...new Set(DB.audit.map(a => a.ent))];
    return `<div class="notice ${bad >= 0 ? 'warn' : ''}">${bad >= 0 ? `زنجیره رویدادها از ردیف ${fa(bad + 1)} دست‌کاری شده است.` : `زنجیره ${fa(DB.audit.length)} رویداد سالم است. رویدادها حتی توسط مدیر سامانه قابل حذف یا ویرایش نیستند.`}</div>
    <section class="card">${filterBar('adma', [{ k: 'q', t: 'search', l: 'جست‌وجو در اقدام، کاربر یا شرح…' }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }, { k: 'e', l: 'همه موجودیت‌ها', o: ents }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc((userById(a.uid) || {}).name || 'سامانه') + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['موجودیت', a => `<span class="code">${esc(a.ent)}</span>`], ['شرح', a => esc(a.note)], ['اثر انگشت', a => `<span class="code">${a.h}</span>`]], rows)}</div></section>`;
  },
  site() {
    const s = DB.settings;
    return `${card('هویت و متن‌های سامانه', `<form class="form" id="sitef">
      ${fieldHTML({ k: 'orgName', l: 'نام مجموعه', req: true }, s.orgName)}${fieldHTML({ k: 'subtitle', l: 'زیرعنوان منوی کناری' }, s.subtitle)}
      ${fieldHTML({ k: 'loginTitle', l: 'عنوان صفحه ورود' }, s.loginTitle)}${fieldHTML({ k: 'payThreshold', l: 'سقف پرداخت بدون تصویب امام (ریال)', t: 'number' }, s.payThreshold)}
      ${fieldHTML({ k: 'loginText', l: 'متن معرفی صفحه ورود', t: 'textarea' }, s.loginText)}
    </form><div class="row mt">${btn('ذخیره', 'admSaveSite', {}, '', 'check')}</div>`)}
    ${card('اطلاعیه عمومی داشبورد', `<form class="form" id="annf">${fieldHTML({ k: 'on', l: 'نمایش', t: 'check', cl: 'اطلاعیه برای همه کاربران نمایش داده شود' }, s.announcement.on)}${fieldHTML({ k: 'tone', l: 'نوع', t: 'select', o: [['info', 'اطلاع‌رسانی'], ['warn', 'هشدار'], ['ok', 'خبر خوب']], blank: false }, s.announcement.tone)}${fieldHTML({ k: 'text', l: 'متن اطلاعیه', t: 'textarea' }, s.announcement.text)}</form><div class="row mt">${btn('انتشار اطلاعیه', 'admSaveAnn', {}, '', 'megaphone')}</div>`)}
    ${card('رنگ‌بندی و اندازه', `<div class="swatches">${Object.entries(PALETTES).map(([k, p]) => `<button class="sw ${s.theme.palette === k ? 'on' : ''}" data-a="admPal" data-v="${k}"><i style="background:linear-gradient(135deg, ${p.l[2]} 0 50%, ${p.l[4]} 50% 100%)"></i><span>${p.name}</span></button>`).join('')}</div>
      <div class="row mt"><span class="muted">اندازه متن:</span>${[13, 14, 15, 16].map(n => btn(fa(n), 'admScale', { v: n }, 'sm ' + (s.theme.scale === n ? '' : 'ghost'))).join('')}</div><div class="hint mt">تغییرات فوراً برای همه کاربران اعمال می‌شود.</div>`)}
    ${card('ساعت و اوقات شرعی', `<form class="form" id="clkf">${fieldHTML({ k: 'city', l: 'نام شهر' }, s.clock.city)}${fieldHTML({ k: 'prayer', l: 'اوقات شرعی', t: 'check', cl: 'نمایش اوقات شرعی در داشبورد' }, s.clock.prayer)}${fieldHTML({ k: 'lat', l: 'عرض جغرافیایی', hint: 'آبادان: ۳۰٫۳۳۹۲' }, s.clock.lat)}${fieldHTML({ k: 'lng', l: 'طول جغرافیایی', hint: 'آبادان: ۴۸٫۳۰۴۳' }, s.clock.lng)}</form><div class="row mt">${btn('ذخیره', 'admSaveClock', {}, '', 'clock')}</div><div class="hint mt">محاسبه به روش مؤسسه ژئوفیزیک دانشگاه تهران (فجر ۱۷٫۷°، عشا ۱۴°، مغرب ۴٫۵° زیر افق) و به وقت رسمی ایران. مختصات پیش‌فرض: آبادان (۳۰٫۳۳۹۲ شمالی، ۴۸٫۳۰۴۳ شرقی). برای دقت کامل، مختصات تأییدشده محل مسجد را وارد کنید.</div>`)}`;
  },
  org() {
    const s = DB.settings;
    return `${card('مدیریت‌ها', `<div class="notice">پیش از ورود اطلاعات واقعی، فهرست مدیریت‌ها، نام‌ها و خدمات را با ساختار نهایی مجموعه تطبیق دهید. مدیریت غیرفعال از فهرست‌ها پنهان می‌شود ولی سوابقش حفظ می‌شود.</div>` + table([['#', u => fa(u.id)], ['نام کامل', u => `<b>${esc(u.name)}</b>`], ['نام کوتاه', u => esc(u.short)], ['خدمات', u => fa(SERVICES[u.id].length)], ['وضعیت', u => (u.off ? pill('غیرفعال', 'mute') : pill('فعال', 'ok'))], ['', u => btn('ویرایش', 'admUnit', { id: u.id }, 'sm ghost', 'edit') + ' ' + btn(u.off ? 'فعال‌سازی' : 'غیرفعال‌سازی', 'admUnitToggle', { id: u.id }, 'sm ' + (u.off ? 'soft' : 'ghost'))]], UNITS), btn('افزودن مدیریت', 'admUnit', {}, 'sm', 'plus'), { flush: true })}
    ${card('فضاها و امکانات قابل رزرو', table([['نام', x => esc(x.name)], ['تأییدکننده', x => esc(unitShort(x.unit))], ['ظرفیت', x => fa(x.cap)], ['کنترل تداخل', x => (x.excl ? pill('دارد', 'ok') : pill('ندارد', 'mute'))], ['', x => btn('ویرایش', 'admSpace', { id: x.id }, 'sm ghost', 'edit') + ' ' + btn('حذف', 'admSpaceDel', { id: x.id }, 'sm danger')]], SPACES), btn('افزودن فضا', 'admSpace', {}, 'sm', 'plus'), { flush: true })}
    ${card('فهرست‌های پایه', `<form class="form" id="listf">${fieldHTML({ k: 'letterCats', l: 'طبقه‌بندی نامه‌ها (هر خط یک مورد)', t: 'textarea' }, LETTER_CATS.join('\n'))}${fieldHTML({ k: 'leaveTypes', l: 'انواع مرخصی (هر خط یک مورد)', t: 'textarea' }, LEAVE_TYPES.join('\n'))}</form><div class="row mt">${btn('ذخیره فهرست‌ها', 'admSaveLists', {}, '', 'check')}${btn('بازگردانی همه ساختار به پیش‌فرض', 'admOrgReset', {}, 'ghost')}</div>`)}`;
  },
  security() {
    const s = DB.settings.security;
    return `${card('سیاست رمز و ورود', `<form class="form" id="secf">${fieldHTML({ k: 'minLen', l: 'حداقل طول رمز عبور', t: 'number', hint: 'دست‌کم ۶ و برای بهره‌برداری واقعی ۱۰ یا بیشتر' }, s.minLen)}${fieldHTML({ k: 'maxFails', l: 'تعداد تلاش ناموفق تا قفل‌شدن حساب', t: 'number' }, s.maxFails)}${fieldHTML({ k: 'lockMin', l: 'مدت قفل حساب (دقیقه)', t: 'number' }, s.lockMin)}${fieldHTML({ k: 'sessionMin', l: 'خروج خودکار پس از بی‌فعالیتی (دقیقه)', t: 'number', hint: 'بین ۵ تا ۱۴۴۰؛ دو دقیقه پیش از خروج به کاربر هشدار داده می‌شود' }, s.sessionMin)}
      ${SERVER ? '' : fieldHTML({ k: 'showDemo', l: 'حساب‌های نمونه', t: 'check', cl: 'نمایش فهرست حساب‌های نمونه در صفحه ورود (فقط نسخه نمایشی)' }, DB.settings.showDemo)}${fieldHTML({ k: 'maintenance', l: 'حالت به‌روزرسانی', t: 'check', cl: 'فقط مدیران سامانه بتوانند وارد شوند' }, DB.settings.maintenance)}</form>
      <div class="row mt">${btn('ذخیره تنظیمات امنیتی', 'admSaveSec', {}, '', 'shield')}</div>`)}
    ${card('اقدامات اضطراری', `<div class="row">${btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'danger', 'logout')}${btn('الزام تغییر رمز برای همه', 'admForceAll', {}, 'ghost', 'key')}${btn('بازکردن قفل همه حساب‌ها', 'admUnlockAll', {}, 'ghost', 'unlock')}</div><div class="hint mt">${SERVER ? 'رمزها روی سرور با scrypt و نمک جداگانه ذخیره می‌شوند و هیچ‌کس، حتی مدیر سامانه، رمز کاربران را نمی‌بیند؛ مدیر می‌تواند رمز جدید تعیین کند. رمز متصدیان جایگاه‌های حساس فقط با امام جماعت یا خط فرمان سرور تعیین می‌شود.' : 'نسخه نمایشی: رمزها فقط برای آشنایی و با روش ساده نگهداری می‌شوند؛ برای بهره‌برداری از نسخه سروری استفاده کنید.'}</div>`)}`;
  },
  sms() {
    const s = DB.settings.sms;
    const ready = s.enabled && ((s.provider === 'kavenegar' && (s.apiKeySet || s.apiKey)) || (s.provider === 'webhook' && s.webhook));
    const st = !SERVER ? pill('نسخه نمایشی — پیامکی ارسال نمی‌شود', 'warn') : ready ? pill('فعال و تنظیم‌شده', 'ok') : s.enabled ? pill('روشن ولی تنظیم‌نشده — ارسال نمی‌شود', 'bad') : pill('خاموش', 'mute');
    const cnt = k => DB.sms.filter(x => x.status === k).length;
    return `${card('وضعیت سرویس پیامک', `<div class="row">${st}</div><div class="tiles mt">${['در صف ارسال', 'ارسال‌شده', 'تحویل‌شده', 'تحویل نشد', 'ناموفق'].map(k => tile(k, cnt(k), '', k === 'ناموفق' || k === 'تحویل نشد' ? (cnt(k) ? 'bad' : '') : k === 'تحویل‌شده' ? 'ok' : '')).join('')}</div>${SERVER ? `<div class="row mt">${btn('ارسال پیامک آزمایشی', 'smsTest', {}, 'ghost', 'send')}</div>` : ''}`)}
    ${card('تنظیمات پیامک', `<form class="form" id="smsf">
      <div class="fld"><label>سرویس پیامک</label><label class="row" style="color:var(--fg);font-weight:500"><input type="checkbox" id="sms_en" ${s.enabled ? 'checked' : ''}> ارسال پیامک روشن باشد</label></div>
      ${fieldHTML({ k: 'provider', l: 'سرویس‌دهنده', t: 'select', o: [['none', 'تنظیم نشده'], ['kavenegar', 'کاوه‌نگار'], ['webhook', 'درگاه اختصاصی (Webhook)']], blank: false }, s.provider)}
      ${fieldHTML({ k: 'sender', l: 'شماره خط فرستنده' }, s.sender)}
      ${fieldHTML({ k: 'apiKey', l: 'کلید API کاوه‌نگار', t: 'password', ph: s.apiKeyHint || '', hint: s.apiKeySet ? 'کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید. کلید هرگز به مرورگر فرستاده نمی‌شود.' : 'کلید فقط روی سرور نگهداری می‌شود.' }, '')}
      ${fieldHTML({ k: 'webhook', l: 'نشانی درگاه اختصاصی', ph: 'https://…', hint: 'برای درگاه اختصاصی: درخواست POST با to و text' }, s.webhook || '')}
      ${fieldHTML({ k: 'events', l: 'رویدادهای قابل اعلان با پیامک', t: 'multi', o: Object.entries(SMS_EVENTS) }, Object.keys(s.events).filter(k => s.events[k]))}
      ${fieldHTML({ k: 'roles', l: 'دریافت‌کنندگان (بر اساس نقش)', t: 'multi', o: Object.entries(ROLES) }, s.roles)}
    </form><div class="row mt">${btn('ذخیره', 'saveSms', {}, '', 'check')}</div><div class="notice mt">متن پیامک فقط شامل نوع رویداد و کد پیگیری است؛ جزئیات محرمانه فقط در کارتابل نمایش داده می‌شود. هر پیامک تا سه بار با فاصله فزاینده دوباره ارسال می‌شود و وضعیت تحویل از کاوه‌نگار پیگیری می‌شود.</div>`)}
    ${card('صف ارسال پیامک', table([['زمان', x => jdt(x.ts)], ['گیرنده', x => esc(x.name) + `<span class="sub code">${fa(x.to)}</span>`], ['متن', x => esc(x.text)], ['وضعیت', x => pill(x.status, ['تحویل‌شده'].includes(x.status) ? 'ok' : ['ناموفق', 'تحویل نشد'].includes(x.status) ? 'bad' : x.status === 'ارسال‌شده' ? 'info' : 'warn') + (x.lastError ? `<span class="sub">${esc(x.lastError)}${x.tries ? ' · ' + fa(x.tries) + ' تلاش' : ''}</span>` : '')]], DB.sms.slice().reverse().slice(0, 100)), '', { flush: true })}`;
  },
  data() {
    const cols = Object.keys(DATA_COLS).filter(c => SAFE_DATA_COLS.includes(c));
    const v = vs('admd', { c: cols[0] });
    if (!cols.includes(v.c)) v.c = cols[0];
    const C = DATA_COLS[v.c];
    const list = (DB[v.c] || []).map((r, i) => ({ ...r, _k: r.id || String(i) })).filter(r => textMatch(v.q, JSON.stringify(r)));
    return `<div class="notice warn">${ic('alert')} ویرایش مستقیم، قواعد گردش کار را دور می‌زند؛ فقط برای اصلاح خطا استفاده کنید. هر تغییر با مقدار قبلی در رویدادهای سیستمی ثبت می‌شود. کاربران، جایگاه‌ها، دسترسی‌ها، نشست‌ها و رویدادهای سیستمی از ویرایش مستقیم محافظت شده‌اند.</div>
    <section class="card"><div class="filters"><select data-f="admd:c" id="flt-admd-c" aria-label="مجموعه داده">${cols.map(k => `<option value="${k}" ${k === v.c ? 'selected' : ''}>${esc(DATA_COLS[k].t)} (${fa((DB[k] || []).length)})</option>`).join('')}</select><input type="search" data-f="admd:q" id="flt-admd-q" placeholder="جست‌وجو در همه فیلدها…" value="${esc(v.q || '')}" aria-label="جست‌وجو"></div>
    <div class="cb flush">${table(C.f.map(([k, l]) => [l, r => { const x = r[k]; return esc(Array.isArray(x) ? fa(x.length) + ' مورد' : x && typeof x === 'object' ? '{…}' : /^\d{4}-\d\d-\d\d$/.test(x || '') ? jd(x) : String(x ?? '—').slice(0, 60)); }]), list.slice().reverse().slice(0, 200).map(r => ({ ...r, id: v.c + '|' + r._k })), { click: 'admRec' })}</div></section>`;
  },
  backup() {
    const list = DB.settings.backups.slice().reverse();
    return `${card('نسخه پشتیبان', `<p>${SERVER ? 'سرور هر روز به‌طور خودکار نسخه پشتیبان کامل تهیه می‌کند و پیش از هر بازیابی نیز از وضعیت فعلی نسخه می‌گیرد. شصت نسخه آخر نگهداری می‌شود.' : 'در نسخه نمایشی، نسخه پشتیبان به‌صورت فایل JSON در اختیار شما قرار می‌گیرد.'}</p><div class="row">${btn('تهیه نسخه پشتیبان', 'backup', {}, '', 'archive')}${btn('بازیابی از نسخه پشتیبان', 'restore', {}, 'ghost')}${SERVER ? '' : btn('بازنشانی به داده‌های نمونه', 'resetDemo', {}, 'danger')}</div>
    <div class="notice mt">بازیابی فقط پس از بررسی کامل ساختار فایل${SERVER ? '، سلامت زنجیره رویدادها' : ''} و اطمینان از اینکه دسترسی شما را افزایش نمی‌دهد انجام می‌شود. ${SERVER ? 'رویدادهای سیستمی، ورودها و نشست‌ها هرگز به عقب برنمی‌گردند.' : 'پیش از بازیابی، نسخه فعلی خودکار نگهداری می‌شود.'}</div>
    ${list.length ? `<h3 class="mt">سوابق پشتیبان‌گیری</h3>${table([['زمان', b => jdt(b.ts)], ['کاربر', b => esc(b.by)], ['حجم', b => fa(Math.round(b.size / 1024)) + ' KB'], ['رکوردها', b => fa(b.n)], ['', b => (SERVER && b.name ? `<a class="btn sm ghost" href="/api/backups/${encodeURIComponent(b.name)}" download>${ic('archive')}دریافت</a>` : '')]], list.map((b, i) => ({ ...b, id: i })))}` : ''}`)}`;
  }
};
const DATA_COLS = {
  users: { t: 'کاربران', f: [['name', 'نام'], ['username', 'نام کاربری'], ['posId', 'جایگاه'], ['active', 'فعال']] },
  positions: { t: 'جایگاه‌ها', f: [['id', 'شناسه'], ['title', 'عنوان'], ['unitId', 'مدیریت'], ['role', 'نقش']] },
  letters: { t: 'نامه‌ها', f: [['no', 'شماره'], ['subject', 'موضوع'], ['date', 'تاریخ'], ['status', 'وضعیت']] },
  orders: { t: 'دستورات', f: [['no', 'شماره'], ['title', 'عنوان'], ['due', 'مهلت'], ['status', 'وضعیت']] },
  tasks: { t: 'وظایف', f: [['no', 'شماره'], ['title', 'عنوان'], ['due', 'مهلت'], ['status', 'وضعیت']] },
  requests: { t: 'درخواست‌ها', f: [['no', 'شماره'], ['title', 'عنوان'], ['stage', 'مرحله'], ['status', 'وضعیت']] },
  reservations: { t: 'رزروها', f: [['no', 'شماره'], ['space', 'فضا'], ['date', 'تاریخ'], ['status', 'وضعیت']] },
  meetings: { t: 'جلسات', f: [['no', 'شماره'], ['title', 'عنوان'], ['date', 'تاریخ'], ['resolutions', 'مصوبات']] },
  assets: { t: 'اموال', f: [['code', 'کد'], ['name', 'نام'], ['health', 'وضعیت'], ['value', 'ارزش']] },
  movements: { t: 'گردش کالا', f: [['no', 'شماره'], ['type', 'نوع'], ['date', 'تاریخ'], ['status', 'وضعیت']] },
  warehouses: { t: 'انبارها', f: [['id', 'شناسه'], ['name', 'نام'], ['unitId', 'مدیریت']] },
  tx: { t: 'اسناد مالی', f: [['no', 'شماره'], ['kind', 'نوع'], ['amount', 'مبلغ'], ['date', 'تاریخ']] },
  payreqs: { t: 'درخواست‌های پرداخت', f: [['no', 'شماره'], ['title', 'عنوان'], ['amount', 'مبلغ'], ['status', 'وضعیت']] },
  budgets: { t: 'بودجه‌ها', f: [['unitId', 'مدیریت'], ['year', 'سال'], ['amount', 'مبلغ']] },
  commitments: { t: 'تعهدات', f: [['title', 'عنوان'], ['amount', 'مبلغ'], ['due', 'سررسید'], ['status', 'وضعیت']] },
  leaves: { t: 'مرخصی‌ها', f: [['no', 'شماره'], ['type', 'نوع'], ['from', 'از'], ['status', 'وضعیت']] },
  missions: { t: 'مأموریت‌ها', f: [['dest', 'مقصد'], ['title', 'موضوع'], ['from', 'از']] },
  decrees: { t: 'احکام', f: [['no', 'شماره'], ['title', 'عنوان'], ['date', 'تاریخ']] },
  contracts: { t: 'قراردادها', f: [['type', 'نوع'], ['title', 'عنوان'], ['to', 'پایان']] },
  signups: { t: 'درخواست‌های عضویت', f: [['no', 'کد'], ['name', 'نام'], ['username', 'نام کاربری'], ['status', 'وضعیت']] },
  notifs: { t: 'اعلان‌ها', f: [['text', 'متن'], ['pos', 'جایگاه'], ['read', 'خوانده']] },
  sms: { t: 'صف پیامک', f: [['name', 'گیرنده'], ['text', 'متن'], ['status', 'وضعیت']] },
  logins: { t: 'تاریخچه ورود', f: [['username', 'نام کاربری'], ['ok', 'موفق'], ['reason', 'شرح']] },
  sessions: { t: 'نشست‌ها', f: [['uid', 'کاربر'], ['start', 'شروع'], ['active', 'فعال']] }
};

/* ---------- اقدام‌های پنل مدیریت ---------- */
A.admUserCard = d => {
  const u = userById(d.id);
  const lg = DB.logins.filter(l => l.uid === u.id).slice(-8).reverse();
  const ss = DB.sessions.filter(x => x.uid === u.id && x.active);
  const self = u.id === ME.user.id;
  const b2 = (a, l, i, cls = 'ghost') => btn(l, a, { id: u.id }, cls, i);
  modal({ title: 'مدیریت کاربر', wide: true,
    body: `<div class="who2 big">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span></div><div style="margin-inline-start:auto">${userStatus(u)}</div></div>
    ${kv([['جایگاه سازمانی', u.posId ? esc(posLabel(u.posId)) : pill('بدون جایگاه', 'warn')], ['تلفن همراه', `<span class="code">${fa(u.phone || '—')}</span>`], ['کد ملی', `<span class="code">${fa(u.nid || '—')}</span>`], ['آخرین ورود', u.lastLogin ? jdt(u.lastLogin) : 'هرگز'], ['آخرین تغییر رمز', u.passChanged ? jdt(u.passChanged) : '—'], ['نشست‌های فعال', fa(ss.length)], ['تلاش ناموفق اخیر', fa(u.fails || 0)]])}
    <div><h3>ورودهای اخیر</h3>${table([['زمان', l => jdt(l.ts)], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)]], lg, { empty: 'ورودی ثبت نشده است.' })}</div>`,
    foot: u.deleted ? '' : `${b2('admEditUser', 'ویرایش اطلاعات', 'edit', '')}${can('admin.passwords') ? b2('admPass', 'تعیین رمز جدید', 'key') : ''}${u.posId && can('admin.perms') ? btn('دسترسی‌ها', 'admPosPerm', { id: u.posId }, 'ghost', 'shield') : ''}${lockedUsers().includes(u) ? b2('admUnlock', 'بازکردن قفل', 'unlock') : ''}${self ? '' : b2('admKick', 'خروج اجباری', 'logout') + b2('admToggle', u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', u.active ? 'lock' : 'check') + b2('admDel', 'حذف کاربر', 'trash', 'danger')}` });
};
A.admTab = d => { vs('adm').tab = d.v; route(); };
const userForm = () => [
  { k: 'name', l: 'نام و نام خانوادگی', req: true }, { k: 'username', l: 'نام کاربری', req: true, hint: 'انگلیسی، ۳ تا ۲۴ نویسه' },
  { k: 'phone', l: 'تلفن همراه', t: 'tel' }, { k: 'nid', l: 'کد ملی' },
  { k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: allPosOpts(), blank: 'بدون جایگاه' }
];
const toastRes = (r, okMsg) => { if (r && r.error) toast(r.error); else { refresh(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); } };
A.admNewUser = () => formModal('افزودن کاربر', [...userForm(), { k: 'pass', l: 'رمز اولیه', req: true, hint: 'دست‌کم ' + fa(DB.settings.security.minLen) + ' نویسه؛ رمز تصادفی پیشنهاد شده است' }, { k: 'mustChange', l: 'امنیت', t: 'check', cl: 'کاربر در اولین ورود رمز را تغییر دهد' }], { pass: genPass(), mustChange: true }, v => run('createUser', v), { done: 'کاربر ساخته شد.', submit: 'ایجاد کاربر' });
A.admEditUser = d => { const u = userById(d.id); formModal('ویرایش کاربر', userForm(), u, v => run('updateUser', u.id, v), { done: 'اطلاعات کاربر ذخیره شد.' }); };
A.admPass = d => {
  const u = userById(d.id);
  formModal('تعیین رمز', [{ k: 'pass', l: 'رمز جدید', req: true, hint: 'یک رمز تصادفی پیشنهاد شده؛ می‌توانید آن را تغییر دهید' }, { k: 'mustChange', l: 'امنیت', t: 'check', cl: 'کاربر در ورود بعدی رمز را تغییر دهد' }], { pass: genPass(), mustChange: true }, async v => {
    const r = await run('setPassword', u.id, v.pass, v.mustChange); if (r.error) return r;
    setTimeout(() => { const m = modal({ title: 'رمز جدید', body: `<p>رمز جدید <b>${esc(u.name)}</b> را به او اعلام کنید. این رمز دوباره نمایش داده نمی‌شود.</p><div class="secret code">${esc(en(v.pass))}</div>`, foot: btn('کپی رمز', 'copyTxt', { t: en(v.pass) }, '', 'file') }); }, 50);
    return r;
  }, { submit: 'تعیین رمز', done: 'رمز تعیین شد.' });
};
A.copyTxt = d => navigator.clipboard.writeText(d.t).then(() => toast('کپی شد.'), () => toast('کپی ممکن نشد؛ متن را انتخاب و کپی کنید.'));
A.admUnlock = async d => toastRes(await run('unlockUser', d.id), 'قفل حساب باز شد.');
A.admUnlockAll = async () => toastRes(await run('unlockAll'), 'قفل همه حساب‌ها باز شد.');
A.admToggle = async d => toastRes(await run('toggleUser', d.id), r => (r.active ? 'حساب فعال شد.' : 'حساب غیرفعال شد و نشست‌های آن بسته شد.'));
A.admKick = async d => toastRes(await run('kickUser', d.id), r => (r.n ? `${fa(r.n)} نشست بسته شد.` : 'این کاربر نشست فعالی ندارد.'));
A.admEndSes = async d => toastRes(await run('endSession', d.id), 'نشست بسته شد.');
A.admKickAll = () => confirmBox('خروج همه کاربران', 'همه نشست‌ها به‌جز نشست شما بسته می‌شوند و کاربران باید دوباره وارد شوند.', 'خروج همه', () => run('kickAll', (mySession() || {}).id), r => fa(r.n) + ' نشست بسته شد.');
A.admForceAll = () => confirmBox('الزام تغییر رمز', 'همه کاربران (به‌جز شما و متصدیان جایگاه‌های حساس، مگر با تأیید امام جماعت) در ورود بعدی باید رمز جدید تعیین کنند.', 'اعمال', () => run('forceAllChange'), 'اعمال شد.');
A.admDel = d => { const u = userById(d.id); confirmBox('حذف کاربر', `حساب <b>${esc(u.name)}</b> حذف می‌شود و دیگر امکان ورود ندارد. سوابق اقدامات او در سامانه باقی می‌ماند.`, 'حذف کاربر', () => run('deleteUser', u.id), 'کاربر حذف شد.'); };
A.admDelPos = d => confirmBox('حذف جایگاه', `جایگاه «${esc(posLabel(d.id))}» حذف شود؟`, 'حذف', () => run('deletePosition', d.id), 'جایگاه حذف شد.');
function confirmBox(title, text, okLabel, fn, okMsg) {
  modal({ title, body: `<p>${text}</p><div class="err" id="cferr" role="alert"></div>`, foot: `<button class="btn danger" id="cfok">${esc(okLabel)}</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  $('#cfok').addEventListener('click', async () => { const r = await fn(); if (r && r.error) { $('#cferr').textContent = r.error; return; } closeModal(); refresh(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); });
}
A.admPosPerm = d => {
  const p = posById(d.id); if (!p) return;
  const groups = [...new Set(PERMS.map(x => x[2]))];
  const self = p.id === ME.pos.id;
  modal({
    title: 'دسترسی‌های جایگاه — ' + posLabel(p.id), wide: true,
    body: `<div class="notice ${self ? 'warn' : ''}">${self ? 'این جایگاه خود شماست؛ تغییر دسترسی خود مجاز نیست و فقط امام جماعت می‌تواند آن را تغییر دهد.' : `متصدی فعلی: <b>${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</b>. تغییرات فوراً ذخیره می‌شود. مجوزهای نشان‌دار ${pill('حساس', 'warn')} را فقط امام جماعت می‌تواند اعطا کند.`}</div><div class="err" id="permerr" role="alert"></div>${groups.map(g => `<div><h3>${esc(g)}</h3><div class="permgrid">${PERMS.filter(x => x[2] === g).map(([k, l]) => { const o = (p.perms || {})[k] || ''; const eff = permOf(p, k); return `<div class="perm"><div><b>${esc(l)}</b><small>${eff ? pill('دارد', 'ok') : pill('ندارد', 'mute')}${isSensitivePerm(k) ? ' ' + pill('حساس', 'warn') : ''}</small></div><div class="seg" role="radiogroup" aria-label="${esc(l)}">${[['', 'پیش‌فرض'], ['allow', 'اعطا'], ['deny', 'سلب']].map(([v, t]) => `<button role="radio" aria-checked="${o === v}" class="${o === v ? 'on ' + v : ''}" data-a="admSetPerm" data-p="${p.id}" data-k="${k}" data-v="${v}" ${self ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>`; }).join('')}</div></div>`).join('')}`
  });
};
A.admSetPerm = async d => { const r = await run('setPosPerm', d.p, d.k, d.v); if (r.error) { const e = $('#permerr'); if (e) e.textContent = r.error; else toast(r.error); return; } refresh(); A.admPosPerm({ id: d.p }); toast('دسترسی به‌روز شد.'); };
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.pm) { const [role, k] = t.dataset.pm.split('|'); const r = await run('setRolePerm', role, k, t.value); if (r.error) { toast(r.error); route(); } else { refresh(); toast('ماتریس دسترسی به‌روز شد.'); } }
  if (t.id === 'pickpos' && t.value) A.admPosPerm({ id: t.value });
});
A.admSignOk = d => { const s = DB.signups.find(x => x.id === d.id); const free = DB.positions.filter(p => p.unitId === s.unitId && !holderOf(p.id) && !isSensitivePos(p)).map(p => [p.id, posLabel(p.id) + ' (خالی)']);
  formModal('تأیید عضویت — ' + s.name, [{ k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: [['new', `ایجاد جایگاه جدید «${s.title}» در ${unitShort(s.unitId)}`], ...free], req: true, blank: false }], { posId: 'new' }, v => run('decideSignup', s.id, true, v), { submit: 'تأیید و ایجاد حساب', done: 'حساب کاربری ایجاد شد.' }); };
A.admSignNo = d => actModal('رد درخواست عضویت', v => run('decideSignup', d.id, false, v), { noteReq: true, noteLabel: 'علت رد' });
const findPending = no => pendingAll().find(x => x.no === no);
A.admOk = d => { const x = findPending(d.i); if (!x) return toast('این مورد دیگر معلق نیست.'); actModal('تأیید مدیریتی — ' + x.type, v => run('overrideDecision', x.no, true, v.note, v.doc), { fields: x.needDoc ? [{ k: 'doc', l: 'شماره سند پرداخت', req: true }] : [], submit: 'تأیید', done: 'تأیید مدیریتی ثبت شد.' }); };
A.admNo = d => { const x = findPending(d.i); if (!x) return toast('این مورد دیگر معلق نیست.'); actModal('رد مدیریتی — ' + x.type, v => run('overrideDecision', x.no, false, v.note), { noteReq: true, noteLabel: 'علت رد', submit: 'رد', done: 'رد مدیریتی ثبت شد.' }); };
const formVals = id => { const f = $('#' + id); const o = {}; [...f.elements].forEach(el => { if (!el.name) return; if (el.type === 'checkbox' && f.querySelectorAll(`input[name="${el.name}"]`).length > 1) { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); return o; };
const saveSet = async (section, v, msg) => { const r = await run('saveSettings', section, v); if (r.error) return toast(r.error); if (section === 'site') renderShell(); else refresh(); toast(msg || 'ذخیره شد.'); };
A.admMaint = () => saveSet('maintenance', { on: !DB.settings.maintenance }, DB.settings.maintenance ? 'سامانه برای همه باز شد.' : 'حالت به‌روزرسانی فعال شد.');
A.admSaveSite = () => saveSet('site', formVals('sitef'));
A.admSaveAnn = () => { const v = formVals('annf'); saveSet('announcement', v, v.on ? 'اطلاعیه منتشر شد.' : 'اطلاعیه پنهان شد.'); };
A.admPal = d => saveSet('theme', { palette: d.v }, 'رنگ‌بندی تغییر کرد.');
A.admScale = d => saveSet('theme', { scale: +d.v }, 'اندازه متن تغییر کرد.');
A.admSaveClock = () => saveSet('clock', formVals('clkf'));
A.admSaveSec = () => saveSet('security', formVals('secf'), 'تنظیمات امنیتی ذخیره شد.');
A.saveSms = () => { const v = formVals('smsf'); v.enabled = $('#sms_en').checked; v.events = v.events || []; v.roles = v.roles || []; saveSet('sms', v, 'تنظیمات پیامک ذخیره شد.'); };
A.smsTest = () => formModal('ارسال پیامک آزمایشی', [{ k: 'to', l: 'شماره همراه', t: 'tel', req: true }], { to: ME.user.phone || '' }, async v => { if (!SERVER) return fail('ارسال واقعی پیامک فقط در نسخه سروری ممکن است.'); return Remote.post('/api/sms/test', { to: v.to }); }, { submit: 'ارسال', done: 'نتیجه در صف ارسال نمایش داده می‌شود.' });
A.admUnit = d => { const u = d.id ? UNITS.find(x => x.id === +d.id) : null; formModal(u ? 'ویرایش مدیریت' : 'افزودن مدیریت', [{ k: 'name', l: 'نام کامل', req: true }, { k: 'short', l: 'نام کوتاه', req: true }, { k: 'services', l: 'خدمات قابل درخواست (هر خط یک خدمت)', t: 'textarea', req: true }], u ? { name: u.name, short: u.short, services: SERVICES[u.id].join('\n') } : { services: 'امور عمومی' }, v => run('saveUnit', u ? u.id : 0, v), { done: u ? 'مدیریت ذخیره شد.' : 'مدیریت جدید با سه جایگاه مدیر، مسئول دفتر و منشی ساخته شد.' }); };
A.admUnitToggle = d => { const u = UNITS.find(x => x.id === +d.id); confirmBox(u.off ? 'فعال‌سازی مدیریت' : 'غیرفعال‌سازی مدیریت', u.off ? `«${esc(u.name)}» دوباره در فهرست‌ها نمایش داده می‌شود.` : `«${esc(u.name)}» از فهرست‌ها و فرم‌ها پنهان می‌شود؛ سوابق و جایگاه‌های آن حفظ می‌شود.`, u.off ? 'فعال شود' : 'غیرفعال شود', () => run('toggleUnit', u.id), 'انجام شد.'); };
A.admSpace = d => { const x = d.id ? SPACES.find(s => s.id === d.id) : { cap: 50, excl: true, unit: 3 }; formModal(d.id ? 'ویرایش فضا' : 'افزودن فضا', [{ k: 'name', l: 'نام', req: true }, { k: 'unit', l: 'مدیریت تأییدکننده', t: 'select', o: unitOpts(), req: true, blank: false }, { k: 'cap', l: 'ظرفیت (نفر)', t: 'number', req: true }, { k: 'excl', l: 'کنترل تداخل', t: 'check', cl: 'رزرو هم‌زمان مجاز نباشد' }], x, v => run('saveSpace', d.id || '', v)); };
A.admSpaceDel = d => confirmBox('حذف فضا', 'این فضا از فهرست رزرو حذف شود؟ سوابق رزروهای گذشته حفظ می‌شود.', 'حذف', () => run('deleteSpace', d.id), 'فضا حذف شد.');
A.admSaveLists = () => saveSet('lists', formVals('listf'));
A.admOrgReset = () => confirmBox('بازگردانی ساختار', 'نام مدیریت‌ها، خدمات، فضاها و فهرست‌های پایه به حالت اولیه برمی‌گردد.', 'بازگردانی', () => run('orgReset'), 'بازگردانی شد.');
A.admRec = d => {
  const [c, id] = d.id.split('|'); const rec0 = DB[c].find((x, i) => (x.id || String(i)) === id);
  if (!rec0) return;
  modal({ title: `${DATA_COLS[c].t} — ویرایش مستقیم`, wide: true, body: `<textarea id="rec" class="json" spellcheck="false" aria-label="متن رکورد">${esc(JSON.stringify(rec0, null, 2))}</textarea><div class="err" id="recerr" role="alert"></div>`,
    foot: `${btn('ذخیره تغییرات', 'admRecSave', { id: d.id }, '', 'check')}${btn('حذف رکورد', 'admRecDel', { id: d.id }, 'danger', 'trash')}${btn('انصراف', 'close', {}, 'ghost')}` });
};
A.admRecSave = async d => { const [c, id] = d.id.split('|'); let v; try { v = JSON.parse($('#rec').value); } catch (e) { $('#recerr').textContent = 'متن JSON معتبر نیست: ' + e.message; return; }
  const r = await run('dataSave', c, id, v); if (r.error) { $('#recerr').textContent = r.error; return; } closeModal(); refresh(); toast('رکورد ذخیره شد.'); };
A.admRecDel = d => { const [c, id] = d.id.split('|'); confirmBox('حذف رکورد', 'این رکورد برای همیشه حذف شود؟ اثر آن در رویدادهای سیستمی می‌ماند.', 'حذف', () => run('dataDelete', c, id), 'حذف شد.'); };

/* ---------- ویرایش آسان رکوردها از پنجره جزئیات (قواعد در ops.js) ---------- */
const EDIT_FORMS = {
  task: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اولویت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }],
  letter: [{ k: 'subject', l: 'موضوع', req: true, full: true }, { k: 'sender', l: 'فرستنده' }, { k: 'receiver', l: 'گیرنده' }, { k: 'cat', l: 'طبقه‌بندی', t: 'select', o: LETTER_CATS, blank: false }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'conf', l: 'محرمانگی', t: 'select', o: CONF, blank: false }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'body', l: 'متن', t: 'textarea' }],
  order: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }],
  meet: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'place', l: 'مکان' }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time' }, { k: 'agenda', l: 'دستور جلسه', t: 'textarea' }],
  res: [{ k: 'kind', l: 'عنوان برنامه', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'people', l: 'تعداد افراد', t: 'number', req: true }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time', req: true }, { k: 'equip', l: 'تجهیزات' }, { k: 'desc', l: 'توضیحات', t: 'textarea' }],
  asset: [{ k: 'name', l: 'نام', req: true, full: true }, { k: 'cat', l: 'گروه' }, { k: 'serial', l: 'شماره سریال' }, { k: 'value', l: 'ارزش (ریال)', t: 'number' }, { k: 'specs', l: 'مشخصات فنی', t: 'textarea' }]
};
const EDIT_BACK = { task: id => showTask(id), letter: id => showLetter(id), order: id => showOrder(id), meet: id => showMeeting(id), res: id => showRes(id), asset: id => showAsset(id) };
const editBtn = (k, r) => (canEditRec(k, r) ? btn('ویرایش', 'editRec', { k, id: r.id }, 'ghost', 'edit') : '');
A.editRec = d => { const r = DB[EDIT_RULES[d.k].col].find(x => x.id === d.id); formModal('ویرایش', EDIT_FORMS[d.k], r, v => run('editRecord', d.k, d.id, v), { submit: 'ذخیره تغییرات', done: 'تغییرات ذخیره شد.', reopen: () => EDIT_BACK[d.k](d.id) }); };

/* ---------- حساب کاربری من ---------- */
PAGES.profile = () => {
  const u = ME.user;
  const mine = DB.logins.filter(l => l.uid === u.id).slice().reverse().slice(0, 15);
  const perms = PERMS.filter(p => can(p[0]));
  return `${head('حساب کاربری من', esc(posLabel(ME.pos.id)))}
  <div class="grid g-main">
    ${card('مشخصات', `<div class="who2 big">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span></div></div>${kv([['جایگاه', esc(posLabel(ME.pos.id))], ['مدیریت', esc(unitName(ME.pos.unitId))], ['تلفن همراه', `<span class="code">${fa(u.phone || '—')}</span>`], ['آخرین تغییر رمز', u.passChanged ? jdt(u.passChanged) : '—'], ['ورود فعلی', jdt((mySession() || {}).start)]])}<div class="row mt">${btn('تغییر رمز عبور', 'myPass', {}, '', 'key')}${btn('ویرایش تلفن', 'myPhone', {}, 'ghost', 'edit')}${btn('تغییر حالت روشن / تاریک', 'theme', {}, 'ghost', 'moon')}</div>`)}
    ${card('دسترسی‌های جایگاه من', perms.length ? `<div class="row">${perms.map(p => pill(p[1], 'ok')).join('')}</div>` : empty('فقط دسترسی‌های پایه'))}
  </div>
  ${card('تاریخچه ورود من', table([['زمان', l => jdt(l.ts)], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)], ['مرورگر', l => `<span class="code">${esc(l.agent || '')}</span>`]], mine), '<small>اگر ورودی را نمی‌شناسید، رمز خود را تغییر دهید</small>', { flush: true })}`;
};
A.myPass = () => formModal('تغییر رمز عبور', [{ k: 'cur', l: 'رمز فعلی', t: 'password', req: true }, { k: 'p1', l: 'رمز جدید', t: 'password', req: true, hint: 'دست‌کم ' + fa(DB.settings.security.minLen) + ' نویسه' }, { k: 'p2', l: 'تکرار رمز جدید', t: 'password', req: true }], {}, v => {
  if (v.p1 !== v.p2) return fail('رمز جدید و تکرار آن یکسان نیست.');
  return run('changeOwnPassword', v.cur, v.p1);
}, { submit: 'تغییر رمز', done: 'رمز عبور شما تغییر کرد.', noDraft: true });
A.myPhone = () => formModal('تلفن همراه', [{ k: 'phone', l: 'شماره همراه', t: 'tel', req: true }], ME.user, v => run('changeOwnPhone', v.phone));

/* =====================================================================
   همگام‌سازی با پایگاه داده مشترک
   هر بخش پایگاه داده (کاربران، نامه‌ها، رویدادها…) یک سند جدا در مجموعه «kartabl» است؛
   سندهای بزرگ به قطعه‌های کوچک‌تر شکسته می‌شوند. اگر پایگاه مشترک در دسترس نباشد
   (نسخه مستقل یا کاربر واردنشده)، داده فقط در همین مرورگر می‌ماند.
   ===================================================================== */
const Sync = {
  db: null, col: null, mode: 'local', busy: false, readonly: false,
  last: {}, base: {}, baseJs: {}, mine: {}, counts: {}, timer: null, pending: null, queued: false,
  CHUNK: 60000,
  label() {
    if (this.mode === 'local') return 'ذخیره فقط در همین مرورگر';
    if (this.readonly) return 'دسترسی فقط مشاهده؛ تغییرات ذخیره نمی‌شود';
    return this.busy ? 'در حال ذخیره در پایگاه داده مشترک…' : 'همگام با پایگاه داده مشترک';
  },
  async init() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    let db = null;
    try { db = await window.claude.use('db'); } catch (e) { db = null; }
    if (!db) return;
    try { this.assets = await window.claude.use('assets'); } catch (e) { this.assets = null; }
    this.db = db; this.col = db.collection('kartabl');
    let snap;
    try { snap = await this.col.get(); } catch (e) { return this.fail(e); }
    const remote = this.assemble(snap.docs);
    this.mode = 'shared';
    if (!Object.keys(remote).length) await this.pushAll();
    else this.apply(remote);
    this.col.onSnapshot(s => { const r = this.assemble(s.docs); if ($('.modal-bg')) this.pending = r; else this.apply(r); }, e => this.fail(e));
    showSync();
  },
  assemble(docs) {
    const g = {};
    docs.forEach(d => { const x = d.data(); if (!x || typeof x.k !== 'string') return; (g[x.k] = g[x.k] || []).push(x); });
    const out = {};
    for (const k in g) {
      const parts = g[k];
      const head = parts.find(p => p.i === 0); if (!head) continue;
      const set = parts.filter(p => p.rev === head.rev).sort((a, b) => a.i - b.i);
      if (set.length !== head.n) continue; // نوشتن هنوز کامل نشده است
      this.counts[k] = Math.max(this.counts[k] || 0, parts.length);
      out[k] = set.map(p => p.s).join('');
    }
    return out;
  },
  /* دفتر تغییرات محلی: هر مورد افزوده، ویرایش یا حذف‌شده تا زمانی که نسخه مشترک دقیقاً همان را
     داشته باشد دوباره اعمال می‌شود؛ بنابراین تغییرات هم‌زمان چند کاربر از بین نمی‌رود */
  key(k, x) {
    if (!x || typeof x !== 'object') return JSON.stringify(x);
    if (k === 'audit') return x.ts + '|' + x.uid + '|' + x.act + '|' + x.id;
    return x.id || (x.posId && x.userId ? x.posId + '|' + x.userId + '|' + x.from : x.unitId != null && x.year ? x.unitId + '|' + x.year : JSON.stringify(x));
  },
  norm(k, x) { if (k === 'audit' && x) { const { h, ...r } = x; return JSON.stringify(r); } return JSON.stringify(x); },
  record(k) {
    const base = this.base[k], cur = DB[k];
    if (base === undefined) return;
    const M = (this.mine[k] = this.mine[k] || new Map());
    if (Array.isArray(cur) && Array.isArray(base)) {
      const B = new Map(base.map(x => [this.key(k, x), x]));
      const C = new Map(cur.map(x => [this.key(k, x), x]));
      C.forEach((x, kx) => { if (!B.has(kx) || this.norm(k, B.get(kx)) !== this.norm(k, x)) M.set(kx, x); });
      B.forEach((x, kx) => { if (!C.has(kx)) M.set(kx, null); });
    } else if (cur && base && typeof cur === 'object' && typeof base === 'object' && !Array.isArray(cur)) {
      Object.keys(cur).forEach(f => { if (JSON.stringify(cur[f]) !== JSON.stringify(base[f])) M.set(f, cur[f]); });
      Object.keys(base).forEach(f => { if (!(f in cur)) M.set(f, undefined); });
    } else if (JSON.stringify(cur) !== JSON.stringify(base)) M.set('$', cur);
  },
  rebase(k, r) {
    const M = this.mine[k];
    if (!M || !M.size) return r;
    if (Array.isArray(r)) {
      const out = r.slice(); const idx = new Map(out.map((x, i) => [this.key(k, x), i]));
      const appended = [];
      M.forEach((v, kx) => {
        const i = idx.get(kx);
        if (v === null) { if (i === undefined) M.delete(kx); else out[i] = undefined; return; }
        if (i !== undefined && this.norm(k, out[i]) === this.norm(k, v)) { M.delete(kx); return; }
        if (i !== undefined) out[i] = v; else appended.push(v);
      });
      const res = out.filter(x => x !== undefined);
      /* شماره پیگیری تکراری (ثبت هم‌زمان در دو دستگاه): مورد محلی شماره آزاد بعدی را می‌گیرد */
      const nos = new Set(r.map(x => x && x.no).filter(Boolean));
      appended.forEach(v => {
        if (!v || !v.no || !nos.has(v.no)) return;
        const m = String(v.no).match(/^(.*[\/-])(\d+)$/); if (!m) return;
        let max = 0; res.concat(appended).forEach(x => { const mm = x && String(x.no || '').match(/^(.*[\/-])(\d+)$/); if (mm && mm[1] === m[1]) max = Math.max(max, +mm[2]); });
        const old = v.no; v.no = m[1] + pad(max + 1, m[2].length); nos.add(v.no);
        Object.keys(DB.seq).forEach(sk => { if (DB.seq[sk] < max + 1 && old.includes(sk.split('-').pop())) DB.seq[sk] = Math.max(DB.seq[sk], max + 1); });
        (v.history = v.history || []).push({ ts: stamp(), uid: 'system', pos: '', action: 'اصلاح شماره', note: `شماره ${fa(old)} هم‌زمان در دستگاه دیگری ثبت شده بود؛ شماره جدید ${fa(v.no)}` });
      });
      if (k === 'audit') {
        let prev = res.length ? res[res.length - 1].h : '00000000';
        appended.sort((x, y) => (x.ts > y.ts ? 1 : -1)).forEach(e => { const { h, ...rest } = e; const ne = { ...rest }; ne.h = hash(prev + JSON.stringify(rest)); prev = ne.h; res.push(ne); });
        return res;
      }
      return res.concat(appended);
    }
    if (r && typeof r === 'object') {
      const out = { ...r };
      M.forEach((v, f) => { if (JSON.stringify(r[f]) === JSON.stringify(v)) M.delete(f); else if (v === undefined) delete out[f]; else out[f] = v; });
      return out;
    }
    const v = M.get('$'); if (JSON.stringify(v) === JSON.stringify(r)) { M.delete('$'); return r; } return v;
  },
  apply(remote) {
    let changed = false, ahead = false;
    for (const k in remote) {
      if (remote[k] === this.baseJs[k]) continue;
      let r; try { r = JSON.parse(remote[k]); } catch (e) { continue; } // قطعه ناقص؛ در دریافت بعدی کامل می‌شود
      if (DB[k] !== undefined && JSON.stringify(DB[k]) !== this.last[k]) this.record(k); // تغییر محلیِ هنوز ارسال‌نشده
      const merged = this.rebase(k, r);
      DB[k] = merged; this.base[k] = r; this.baseJs[k] = remote[k];
      this.last[k] = remote[k];
      if (JSON.stringify(merged) !== remote[k]) ahead = true;
      changed = true;
    }
    if (ahead) this.schedule();
    if (!changed) return;
    migrate(DB); applySettings();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
    if (ME) {
      const u = userById(ME.user.id);
      if (u && u.posId) setMe(u);
      if (!$('.modal-bg')) route();
    }
  },
  flushPending() { if (this.pending) { const r = this.pending; this.pending = null; this.apply(r); } },
  schedule() {
    if (this.mode !== 'shared' || this.readonly) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 350);
  },
  async push() {
    if (this.busy) { this.queued = true; return; }
    this.busy = true; showSync();
    try {
      for (const k of Object.keys(DB)) {
        const js = JSON.stringify(DB[k]);
        if (js === this.last[k]) continue;
        this.record(k);
        await this.write(k, js);
      }
    } catch (e) { this.fail(e); }
    this.busy = false; showSync();
    if (this.queued) { this.queued = false; this.push(); }
  },
  async pushAll() { this.last = {}; await this.push(); Object.keys(DB).forEach(k => { this.base[k] = JSON.parse(JSON.stringify(DB[k])); this.baseJs[k] = JSON.stringify(DB[k]); }); this.mine = {}; },
  async write(k, js) {
    const rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const n = Math.max(1, Math.ceil(js.length / this.CHUNK));
    for (let i = n - 1; i >= 0; i--) {
      const body = { k, i, n, rev, s: js.slice(i * this.CHUNK, (i + 1) * this.CHUNK) };
      try { await this.col.doc(`${k}~${i}`).set(body); }
      catch (e) { if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 400 + Math.random() * 600)); await this.col.doc(`${k}~${i}`).set(body); } else throw e; }
    }
    for (let i = n; i < (this.counts[k] || 0); i++) { try { await this.col.doc(`${k}~${i}`).delete(); } catch (e) {} }
    this.counts[k] = n;
    this.last[k] = js;
  },
  fail(e) {
    const c = e && e.code;
    if (c === 'not_granted' || c === 'revoked' || c === 'capability_disabled' || c === 'capability_removed') { this.readonly = this.mode === 'shared'; if (!this.readonly) this.mode = 'local'; }
    if (c === 'quota_exceeded') toast('ظرفیت پایگاه داده پر شده است؛ مدیر سامانه باید سوابق قدیمی را بایگانی کند.');
    else if (this.readonly) toast('شما دسترسی ویرایش این سامانه را ندارید؛ تغییرات ذخیره نمی‌شود.');
    showSync();
  }
};
function showSync() {
  const el = $('#syncst'); if (!el) return;
  el.textContent = Sync.label();
  el.className = 'syncst ' + (Sync.mode === 'local' ? 'local' : Sync.readonly ? 'ro' : Sync.busy ? 'busy' : 'ok');
}

/* ---------- راه‌اندازی ---------- */
/* ردیف‌ها و کارت‌های کلیک‌پذیر با صفحه‌کلید هم قابل استفاده‌اند */
function a11yClickables(root = document) {
  $$('[data-a]:not(button):not(a[href]):not(input):not(select):not(textarea)', root).forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
}
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-a][role="button"]')) { e.preventDefault(); e.target.click(); }
});
new MutationObserver(() => a11yClickables()).observe(document.documentElement, { childList: true, subtree: true });

function boot() {
  document.documentElement.lang = 'fa';
  document.documentElement.dir = 'rtl';
  const t = pref.get('theme', ''); if (t) document.documentElement.dataset.theme = t;
  window.addEventListener('hashchange', () => { closeModal(); route(); window.scrollTo(0, 0); });
  setInterval(tick, 1000);
  if (SERVER) { Remote.boot(); return; }
  Store.load();
  migrate(DB); applySettings();
  sweepDeadlines(); Store.save();
  const [sid, ses] = (sess.get() || '').split('|');
  const u = sid && userById(sid);
  const s = DB.sessions.find(x => x.id === ses);
  if (u && u.active && !u.deleted && u.posId && s && s.active) { setMe(u); renderShell(); } else { sess.set(null); renderLogin(); }
  Sync.init();
}
boot();
