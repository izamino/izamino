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

/* فضاها و امکانات قابل رزرو و مدیریت تأییدکننده */
const SPACES = [
  { id: 'hosseinieh', name: 'حسینیه', unit: 2, cap: 600, excl: true },
  { id: 'fateheh', name: 'مراسم فاتحه و ترحیم', unit: 2, cap: 400, excl: false },
  { id: 'religious', name: 'مراسم مذهبی', unit: 2, cap: 800, excl: false },
  { id: 'rahian', name: 'راهیان نور', unit: 2, cap: 120, excl: false },
  { id: 'ziarat', name: 'اردوی زیارتی', unit: 2, cap: 90, excl: false },
  { id: 'farhangsara', name: 'فرهنگسرا', unit: 3, cap: 80, excl: true },
  { id: 'amphi', name: 'سالن آمفی‌تئاتر ۱۴۴ نفره', unit: 3, cap: 144, excl: true },
  { id: 'cinema', name: 'سینما', unit: 3, cap: 60, excl: true },
  { id: 'meeting', name: 'سالن جلسات', unit: 3, cap: 24, excl: true },
  { id: 'zaersara', name: 'زائرسرا', unit: 1, cap: 40, excl: true },
  { id: 'guest', name: 'مهمانسرا و خدمات اسکان', unit: 1, cap: 16, excl: true }
];
const spaceOf = id => SPACES.find(s => s.id === id) || { name: id, unit: 1 };

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
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) { MEMORY_ONLY = true; } },
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
const canSeeUnit = u => isImam() || inUnit(u);
const canFinance = () => isImam() || inUnit(U_FIN);
const canHR = () => isImam() || (inUnit(U_ADMIN) && ['manager', 'office'].includes(myRole()));
const canAdminUsers = () => isImam() || (inUnit(U_IT) && myRole() === 'manager') || (inUnit(U_ADMIN) && myRole() === 'manager');
const canSettings = () => isImam() || (inUnit(U_IT) && myRole() === 'manager');
const canAssets = () => isImam() || myRole() !== 'staff';

/* جدول مجوزها برای نمایش در صفحه مدیریت دسترسی */
const PERM_MATRIX = [
  ['مشاهده همه مدیریت‌ها و گزارش نظارتی', ['imam']],
  ['صدور دستور امام جماعت', ['imam']],
  ['تصویب نهایی موارد نیازمند مدیریت عالی', ['imam']],
  ['تعریف و ارجاع وظیفه در واحد', ['imam', 'manager', 'office']],
  ['تأیید درخواست در حدود اختیارات واحد', ['imam', 'manager']],
  ['پیگیری دستور و ثبت گزارش پیشرفت', ['manager', 'office']],
  ['ثبت نامه وارده و صادره', ['manager', 'office', 'secretary']],
  ['ثبت جلسه و ملاقات', ['imam', 'manager', 'office', 'secretary']],
  ['ثبت درخواست داخلی و همکاری', ['imam', 'manager', 'office', 'secretary', 'staff']],
  ['مشاهده وظایف ارجاع‌شده به خود', ['imam', 'manager', 'office', 'secretary', 'staff']]
];

/* ---------- ثبت رویداد (زنجیره غیرقابل‌ویرایش) ---------- */
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }
function audit(act, ent, id, note = '') {
  const prev = DB.audit.length ? DB.audit[DB.audit.length - 1].h : '00000000';
  const e = { ts: stamp(), uid: ME ? ME.user.id : 'system', pos: ME ? ME.pos.id : '', unit: ME ? ME.pos.unitId : -1, act, ent, id, note };
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
  obj.history.push({ ts: stamp(), uid: ME ? ME.user.id : 'system', pos: ME ? ME.pos.id : '', action, note });
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
