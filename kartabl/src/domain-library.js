/* =====================================================================
   کتابخانه عمومی: فهرست کتاب‌ها با نسخه‌های واقعی، حساب اعضا (جدا از کارکنان)، رزرو و امانت
   فرایند: انتخاب کتاب ← ورود عضو ← ثبت درخواست ← بررسی کتابدار ← تأیید و اختصاص نسخه آزاد ← تحویل و موعد بازگشت ← بازگشت و آزادشدن نسخه
   ثبت درخواست به‌تنهایی به معنای تحویل نیست و هر نسخه در هر لحظه فقط به یک نفر اختصاص دارد.
   ===================================================================== */
const LOAN = { pending: 'در انتظار بررسی', ready: 'تأییدشده؛ آماده تحویل', rejected: 'ردشده', out: 'در امانت', returned: 'بازگردانده‌شده', cancelled: 'لغوشده', expired: 'منقضی؛ مراجعه نشد' };
const LOAN_TYPES = ['امانت', 'رزرو'];
const BOOK_CATS = ['قرآن و معارف', 'تاریخ و سیره', 'ادبیات و داستان', 'کودک و نوجوان', 'دفاع مقدس', 'خانواده و تربیت', 'علمی و آموزشی', 'سایر'];
const COPY_ST = { free: 'موجود', held: 'رزروشده', out: 'در امانت', off: 'خارج از دسترس' };
const MEMBER_RE = /^[a-z0-9._-]{3,24}$/i;
const LIB_LIMIT = 3; /* حداکثر درخواست و امانت فعال هر عضو */
const canLib = () => !!ME && (isImam() || can('library.manage'));
const canSeeLib = () => canLib() || isAll();
const freeCopies = b => b.copies.filter(c => c.status === COPY_ST.free);
const bookOf = id => DB.books.find(b => b.id === id);
const memberOf = id => DB.members.find(m => m.id === id);
const loanLate = l => l.status === LOAN.out && l.due && l.due < todayISO();
const activeLoan = l => [LOAN.pending, LOAN.ready, LOAN.out].includes(l.status);
function bookPublic(b) {
  return { id: b.id, code: b.code, title: b.title, author: b.author, publisher: b.publisher || '', year: b.year || '', category: b.category, desc: b.desc || '',
    total: b.copies.filter(c => c.status !== COPY_ST.off).length, available: freeCopies(b).length };
}
function lhist(l, action, note, by) { (l.history = l.history || []).push({ ts: stamp(), action, note: note || '', by: by || (ME ? ME.user.name : 'عضو') }); }
const libHeads = () => DB.positions.filter(p => p.unitId === U_LIB && permOf(p, 'library.manage')).map(p => p.id);

/* ---------- کتاب‌ها (کتابدار) ---------- */
function saveBook(id, v) {
  if (!canLib()) return fail('مدیریت کتاب‌ها فقط برای کتابداران مجاز است.');
  const title = String(v.title || '').trim(), author = String(v.author || '').trim();
  if (!title || !author) return fail('عنوان و نویسنده کتاب را بنویسید.');
  if (!BOOK_CATS.includes(v.category)) return fail('موضوع کتاب را انتخاب کنید.');
  const year = String(en(v.year || '')).trim();
  if (year && !/^\d{4}$/.test(year)) return fail('سال انتشار باید چهار رقم باشد.');
  const fields = { title: title.slice(0, 300), author: author.slice(0, 200), publisher: String(v.publisher || '').slice(0, 200), year, category: v.category, desc: String(v.desc || '').slice(0, 2000) };
  if (id) {
    const b = bookOf(id); if (!b) return fail('کتاب یافت نشد.');
    Object.assign(b, fields); audit('ویرایش کتاب', 'book', b.id, b.code + ' · ' + b.title); return b;
  }
  const n = Number(en(v.copies || 1));
  if (!Number.isInteger(n) || n < 1 || n > 50) return fail('تعداد نسخه باید عدد صحیح بین ۱ تا ۵۰ باشد.');
  DB.seq.book = (DB.seq.book || 0) + 1;
  const code = 'KT-' + pad(DB.seq.book, 4);
  const b = { id: uid(), code, ...fields, copies: [], created: stamp() };
  for (let i = 1; i <= n; i++) b.copies.push({ id: uid(), code: `${code}-${i}`, status: COPY_ST.free });
  DB.books.push(b);
  audit('ثبت کتاب', 'book', b.id, `${code} · ${b.title} · ${fa(n)} نسخه`);
  return b;
}
function addCopies(bookId, n) {
  if (!canLib()) return fail('مدیریت نسخه‌ها فقط برای کتابداران مجاز است.');
  const b = bookOf(bookId); if (!b) return fail('کتاب یافت نشد.');
  n = Number(en(n)); if (!Number.isInteger(n) || n < 1 || n > 50) return fail('تعداد نسخه باید عدد صحیح بین ۱ تا ۵۰ باشد.');
  const start = b.copies.length;
  for (let i = 1; i <= n; i++) b.copies.push({ id: uid(), code: `${b.code}-${start + i}`, status: COPY_ST.free });
  audit('افزودن نسخه کتاب', 'book', b.id, `${b.code} · ${fa(n)} نسخه`);
  return b;
}
function setCopyStatus(bookId, copyId, available) {
  if (!canLib()) return fail('مدیریت نسخه‌ها فقط برای کتابداران مجاز است.');
  const b = bookOf(bookId); const c = b && b.copies.find(x => x.id === copyId); if (!c) return fail('نسخه یافت نشد.');
  if ([COPY_ST.held, COPY_ST.out].includes(c.status)) return fail('این نسخه در رزرو یا امانت است و تا بازگشت قابل تغییر نیست.');
  c.status = available ? COPY_ST.free : COPY_ST.off;
  audit('تغییر وضعیت نسخه کتاب', 'book', b.id, `${c.code} · ${c.status}`);
  return b;
}

/* ---------- اعضا ---------- */
function libSignup(v) {
  const name = String(v.name || '').trim(), username = String(v.username || '').trim().toLowerCase();
  if (!name || LABEL_BAD.test(name)) return fail('نام و نام خانوادگی را بدون نویسه‌های < > " \' ` & بنویسید.');
  if (!MEMBER_RE.test(username)) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.members.some(m => m.username === username)) return fail('این نام کاربری قبلاً گرفته شده است.');
  const phone = en(v.phone || '').replace(/\D/g, '');
  if (!/^0?9\d{9}$/.test(phone)) return fail('شماره همراه معتبر نیست.');
  if (en(v.pass || '').length < 8) return fail('رمز عبور باید دست‌کم ۸ نویسه باشد.');
  DB.seq.member = (DB.seq.member || 0) + 1;
  const m = { id: uid(), no: 'M-' + pad(DB.seq.member, 5), name: name.slice(0, 100), username, phone, pass: pwHash(v.pass), active: true, created: stamp() };
  DB.members.push(m);
  audit('عضویت در کتابخانه', 'member', m.id, m.no);
  return m;
}
/* درخواست رزرو یا امانت از سوی عضو (عضو به‌صورت صریح داده می‌شود؛ حساب عضو هیچ اختیار اداری ندارد) */
function libRequest(mem, bookId, type, note) {
  if (!mem || !mem.active) return fail('برای ثبت درخواست وارد حساب عضویت شوید.');
  const b = bookOf(bookId); if (!b) return fail('کتاب یافت نشد.');
  if (!LOAN_TYPES.includes(type)) return fail('نوع درخواست را انتخاب کنید.');
  if (!b.copies.some(c => c.status !== COPY_ST.off)) return fail('این کتاب در حال حاضر در دسترس نیست.');
  const mine = DB.loans.filter(l => l.memberId === mem.id && activeLoan(l));
  if (mine.some(l => l.bookId === b.id)) return fail('برای این کتاب درخواست یا امانت فعال دارید.');
  if (mine.length >= LIB_LIMIT) return fail(`حداکثر ${fa(LIB_LIMIT)} درخواست و امانت فعال مجاز است.`);
  if (type === 'امانت' && !freeCopies(b).length) return fail('فعلاً نسخه آزادی برای امانت نیست؛ می‌توانید «رزرو» ثبت کنید تا پس از آزادشدن به شما اختصاص یابد.');
  DB.seq.loan = (DB.seq.loan || 0) + 1;
  const l = { id: uid(), no: 'K-' + pad(DB.seq.loan, 5), bookId: b.id, memberId: mem.id, type, note: String(note || '').slice(0, 500), status: LOAN.pending, reply: '', requested: stamp(), history: [] };
  lhist(l, 'ثبت درخواست ' + type, l.note, mem.name);
  DB.loans.push(l);
  notify(libHeads(), 'request', `درخواست ${type} کتاب «${b.title}» از عضو ${mem.no}`, 'library-admin', l.no);
  return l;
}
function libCancel(mem, loanId) {
  const l = DB.loans.find(x => x.id === loanId && x.memberId === (mem && mem.id));
  if (!l) return fail('درخواست یافت نشد.');
  if (![LOAN.pending, LOAN.ready].includes(l.status)) return fail('این درخواست قابل لغو نیست.');
  releaseCopy(l);
  l.status = LOAN.cancelled; lhist(l, 'لغو توسط عضو', '', mem.name);
  return l;
}
function releaseCopy(l) { const b = bookOf(l.bookId); const c = b && b.copies.find(x => x.id === l.copyId); if (c && c.status !== COPY_ST.off) c.status = COPY_ST.free; }

/* ---------- بررسی، تحویل و بازگشت (کتابدار) ---------- */
function loanDecide(id, ok, reply, pickupDays) {
  if (!canLib()) return fail('بررسی درخواست‌ها فقط برای کتابداران مجاز است.');
  const l = DB.loans.find(x => x.id === id); if (!l) return fail('درخواست یافت نشد.');
  if (l.status !== LOAN.pending) return fail('این درخواست قبلاً بررسی شده است.');
  if (!ok) { if (!String(reply || '').trim()) return fail('علت رد را برای عضو بنویسید.'); l.status = LOAN.rejected; l.reply = String(reply).slice(0, 500); lhist(l, 'رد درخواست', l.reply); audit('رد درخواست کتاب', 'loan', l.id, l.no); return l; }
  const b = bookOf(l.bookId); const c = b && freeCopies(b)[0];
  if (!c) return fail('نسخه آزادی برای این کتاب نیست؛ پس از بازگشت یک نسخه دوباره تلاش کنید یا به عضو پاسخ دهید.');
  const days = Number(en(pickupDays || 3)); if (!Number.isInteger(days) || days < 1 || days > 14) return fail('مهلت مراجعه باید بین ۱ تا ۱۴ روز باشد.');
  c.status = COPY_ST.held; l.copyId = c.id; l.status = LOAN.ready; l.readyUntil = addDays(todayISO(), days);
  l.reply = String(reply || '').slice(0, 500) || `نسخه ${c.code} برای شما کنار گذاشته شد؛ تا ${jd(l.readyUntil)} برای تحویل مراجعه کنید.`;
  lhist(l, 'تأیید و اختصاص نسخه ' + c.code, l.reply);
  audit('تأیید درخواست کتاب', 'loan', l.id, l.no + ' · ' + c.code);
  return l;
}
function loanDeliver(id, dueDays) {
  if (!canLib()) return fail('ثبت تحویل فقط برای کتابداران مجاز است.');
  const l = DB.loans.find(x => x.id === id); if (!l) return fail('درخواست یافت نشد.');
  if (l.status !== LOAN.ready) return fail('فقط درخواست تأییدشده و آماده تحویل قابل تحویل است.');
  const days = Number(en(dueDays || 14)); if (!Number.isInteger(days) || days < 1 || days > 60) return fail('مدت امانت باید بین ۱ تا ۶۰ روز باشد.');
  const b = bookOf(l.bookId); const c = b.copies.find(x => x.id === l.copyId);
  if (!c || c.status !== COPY_ST.held) return fail('نسخه اختصاص‌یافته در دسترس نیست.');
  c.status = COPY_ST.out; l.status = LOAN.out; l.deliveredAt = stamp(); l.due = addDays(todayISO(), days);
  lhist(l, 'تحویل کتاب به عضو', `نسخه ${c.code} · موعد بازگشت ${jd(l.due)}`);
  audit('تحویل کتاب', 'loan', l.id, l.no + ' · ' + c.code);
  return l;
}
function loanReturn(id) {
  if (!canLib()) return fail('ثبت بازگشت فقط برای کتابداران مجاز است.');
  const l = DB.loans.find(x => x.id === id); if (!l) return fail('درخواست یافت نشد.');
  if (l.status !== LOAN.out) return fail('این کتاب در امانت نیست.');
  const late = l.due && l.due < todayISO() ? daysBetween(l.due, todayISO()) : 0;
  releaseCopy(l); l.status = LOAN.returned; l.returnedAt = stamp(); l.lateDays = late;
  lhist(l, 'بازگشت کتاب', late ? `${fa(late)} روز تأخیر` : 'بدون تأخیر');
  audit('بازگشت کتاب', 'loan', l.id, l.no);
  return l;
}
function loanExpire(id, note) {
  if (!canLib()) return fail('این کار فقط برای کتابداران مجاز است.');
  const l = DB.loans.find(x => x.id === id); if (!l) return fail('درخواست یافت نشد.');
  if (l.status !== LOAN.ready) return fail('فقط درخواست آماده تحویل قابل لغو است.');
  releaseCopy(l); l.status = LOAN.expired; l.reply = String(note || 'عضو در مهلت مراجعه نکرد.').slice(0, 500);
  lhist(l, 'لغو به دلیل عدم مراجعه', l.reply); audit('لغو آماده‌تحویل کتاب', 'loan', l.id, l.no);
  return l;
}
function loanReply(id, text) {
  if (!canLib()) return fail('پاسخ‌گویی فقط برای کتابداران مجاز است.');
  const l = DB.loans.find(x => x.id === id); if (!l) return fail('درخواست یافت نشد.');
  if (!String(text || '').trim()) return fail('متن پاسخ را بنویسید.');
  l.reply = String(text).slice(0, 500); lhist(l, 'پاسخ کتابدار', l.reply);
  return l;
}
function memberToggle(id) {
  if (!canLib()) return fail('مدیریت اعضا فقط برای کتابداران مجاز است.');
  const m = memberOf(id); if (!m) return fail('عضو یافت نشد.');
  m.active = !m.active; audit(m.active ? 'فعال‌سازی عضو کتابخانه' : 'غیرفعال‌سازی عضو کتابخانه', 'member', m.id, m.no);
  return m;
}
/* داده‌ای که عضو می‌بیند: کتاب‌ها و فقط درخواست‌ها و امانت‌های خودش */
function memberView(mem) {
  const loans = DB.loans.filter(l => l.memberId === mem.id).map(l => { const b = bookOf(l.bookId) || {}; const c = (b.copies || []).find(x => x.id === l.copyId); return { id: l.id, no: l.no, type: l.type, status: l.status, reply: l.reply, requested: l.requested, readyUntil: l.readyUntil || '', due: l.due || '', deliveredAt: l.deliveredAt || '', returnedAt: l.returnedAt || '', lateDays: l.lateDays || 0, late: loanLate(l), book: { id: b.id, title: b.title, author: b.author, code: b.code }, copy: c ? c.code : '', history: (l.history || []).map(h => ({ ts: h.ts, action: h.action, note: h.note })) }; });
  return { member: { id: mem.id, no: mem.no, name: mem.name, username: mem.username, phone: mem.phone, created: mem.created }, loans };
}
const publicBooks = () => DB.books.map(bookPublic);
