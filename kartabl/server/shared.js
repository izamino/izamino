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
