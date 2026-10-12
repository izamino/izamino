'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);
const forbidden = (msg = 'شما اجازه این کار را ندارید.') => new HttpError(403, msg);
const notFound = (msg = 'مورد پیدا نشد.') => new HttpError(404, msg);

/** Round to 3 decimals so 12.5 + 0.1 style sums stay clean. */
const r3 = (x) => Math.round(Number(x) * 1000) / 1000;

const DIGITS = { '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9,
  '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
function toLatin(s) {
  return String(s ?? '').replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d]).replace(/٫/g, '.');
}

/** Parse a positive quantity (accepts Persian digits and decimal separator). */
function qty(v, label = 'مقدار', { allowZero = false } = {}) {
  const n = Number(toLatin(v).replace(/[,٬\s]/g, ''));
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) throw bad(`${label} باید عددی بزرگ‌تر از صفر باشد.`);
  return r3(n);
}

const str = (v, max = 500) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
function required(v, label, max) {
  const s = str(v, max);
  if (!s) throw bad(`${label} را وارد کنید.`);
  return s;
}

/** ISO date YYYY-MM-DD or null. */
function date(v, label = 'تاریخ') {
  if (v == null || v === '') return null;
  const s = toLatin(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw bad(`${label} نامعتبر است.`);
  return s;
}

/** Today in Tehran as YYYY-MM-DD. */
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const jalaliFmt = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran',
});
/** Gregorian ISO (date or SQLite UTC datetime) → Jalali "1405/07/20". */
function jalali(v) {
  if (!v) return '';
  const d = v.length <= 10 ? new Date(v + 'T12:00:00Z') : new Date(v.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(jalaliFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}/${p.month}/${p.day}`;
}

module.exports = { HttpError, bad, forbidden, notFound, r3, toLatin, qty, str, required, date, today, addDays, jalali };
