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
  if (!v.subject) return fail('موضوع نامه را بنویسید.');
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
function referLetter(l, unitId, note) {
  unitId = +unitId;
  l.refs.push({ unitId, ts: stamp(), by: ME ? ME.user.id : 'system', note: note || '' });
  l.status = 'ارجاع‌شده';
  hist(l, 'ارجاع به ' + unitName(unitId), note);
  audit('ارجاع نامه', 'letter', l.id, unitShort(unitId));
  const t = unitId === 0 ? [imamPos()] : unitHeads(unitId).concat([unitPos(unitId, 'secretary')?.id]);
  notify(t, 'letter', `نامه ${fa(l.no)} با موضوع «${l.conf === 'عادی' ? l.subject : 'محرمانه'}» به ${unitShort(unitId)} ارجاع شد.`, 'letters', l.no);
  return l;
}
function replyLetter(l, text) {
  if (!text) return fail('متن پاسخ را بنویسید.');
  l.replies.push({ ts: stamp(), by: ME.user.id, pos: ME.pos.id, text });
  l.status = 'پاسخ داده‌شده';
  hist(l, 'ثبت پاسخ', text.slice(0, 80));
  audit('پاسخ نامه', 'letter', l.id, l.no);
  return l;
}
function archiveLetter(l) { l.status = 'بایگانی'; hist(l, 'بایگانی'); audit('بایگانی نامه', 'letter', l.id, l.no); return l; }

/* ---------- دستورات امام جماعت ---------- */
const ORDER_ST = ['جدید', 'در حال بررسی', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const orderStatus = o => (o.status !== 'تکمیل‌شده' && o.due && o.due < todayISO() ? 'معوق' : o.status);
const canSeeOrder = o => isAll() || o.units.includes(myUnit());
function createOrder(v) {
  if (!isImam() && !can('orders.issue')) return fail('صدور دستور فقط برای امام جماعت یا جایگاه دارای مجوز است.');
  if (!v.title) return fail('عنوان دستور را بنویسید.');
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
  if (v.due && v.start && v.due < v.start) return fail('مهلت نمی‌تواند پیش از تاریخ شروع باشد.');
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
function resConflicts(r) {
  if (!spaceOf(r.space).excl) return [];
  return DB.reservations.filter(x => x.id !== r.id && x.space === r.space && x.status === 'تأییدشده' && overlap(x, r));
}
function createReservation(v) {
  if (!v.space) return fail('فضا یا برنامه را انتخاب کنید.');
  if (!v.applicant || !v.phone) return fail('نام متقاضی و شماره تماس لازم است.');
  if (!/^0?9\d{9}$|^0\d{10}$/.test(en(v.phone).replace(/\D/g, ''))) return fail('شماره تماس معتبر نیست.');
  if (!v.date) return fail('تاریخ را وارد کنید.');
  if (!v.start || !v.end || v.end <= v.start) return fail('ساعت پایان باید بعد از ساعت شروع باشد.');
  const sp = spaceOf(v.space);
  if (+v.people > sp.cap) return fail(`ظرفیت ${sp.name} ${fa(sp.cap)} نفر است.`);
  const r = { id: uid(), no: nextNo('res'), space: v.space, applicant: v.applicant, phone: en(v.phone), kind: v.kind || '', date: v.date, start: v.start, end: v.end,
    people: +v.people || 0, equip: v.equip || '', desc: v.desc || '', status: 'در انتظار تأیید', by: ME.user.id, byPos: ME.pos.id, fromUnit: myUnit(), created: stamp() };
  const c = resConflicts(r);
  hist(r, 'ثبت درخواست رزرو', c.length ? 'هشدار: با ' + fa(c.length) + ' رزرو تأییدشده هم‌زمان است' : '');
  DB.reservations.push(r);
  audit('ثبت رزرو', 'reservation', r.id, r.no);
  notify([unitPos(sp.unit, 'manager').id, unitPos(sp.unit, 'office').id], 'reservation', `درخواست رزرو ${sp.name} برای ${jd(r.date)}`, 'reservations', r.no);
  return r;
}
const canDecideRes = r => isMgr(spaceOf(r.space).unit) || (isMgrOrOffice(spaceOf(r.space).unit) && myRole() === 'office');
function resDecide(r, status, note) {
  const sp = spaceOf(r.space);
  if (status === 'لغوشده') { if (!(r.by === ME.user.id || canDecideRes(r))) return fail('اجازه لغو ندارید.'); }
  else if (!canDecideRes(r)) return fail(`تأیید رزرو ${sp.name} با ${unitName(sp.unit)} است.`);
  if (status === 'تأییدشده') {
    const c = resConflicts(r);
    if (c.length) return fail(`تداخل زمانی با رزرو تأییدشده ${fa(c[0].no)} (${tm(c[0].start)} تا ${tm(c[0].end)}). ابتدا آن را جابه‌جا یا لغو کنید.`);
  }
  if (status === 'ردشده' && !note) return fail('علت رد را بنویسید.');
  r.status = status; hist(r, 'تغییر وضعیت به «' + status + '»', note);
  audit('تصمیم رزرو', 'reservation', r.id, r.no + ' · ' + status);
  notify([r.byPos], 'reservation', `رزرو ${sp.name} (${jd(r.date)}) ${status} شد.`, 'reservations', r.no);
  return r;
}

/* ---------- جلسات ---------- */
const canSeeMeeting = m => isAll() || m.invitees.includes(ME.pos.id) || m.byPos === ME.pos.id || (m.unitId === myUnit() && myRole() !== 'staff');
function createMeeting(v) {
  if (!can('meetings.create')) return fail('ثبت جلسه برای منشی، مسئول دفتر و مدیران مجاز است.');
  if (!v.title || !v.date || !v.start) return fail('عنوان، تاریخ و ساعت جلسه لازم است.');
  if (v.end && v.end <= v.start) return fail('ساعت پایان باید بعد از شروع باشد.');
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
  if (!canManageAsset(a) && myRole() === 'staff') return fail('ثبت جابه‌جایی برای این کالا مجاز نیست.');
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
    status: 'در انتظار تأیید مدیر', created: stamp() };
  hist(l, 'ثبت درخواست مرخصی', `${jd(l.from)} تا ${jd(l.to)}`);
  DB.leaves.push(l);
  audit('درخواست مرخصی', 'leave', l.id, l.no);
  const approver = myRole() === 'manager' || myUnit() === 0 ? imamPos() : unitPos(myUnit(), 'manager').id;
  notify([approver], 'request', `درخواست مرخصی ${ME.user.name}`, 'hr', l.no);
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
  if (!p || !u) return fail('جایگاه یا کاربر یافت نشد.');
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
  const u = { id: uid(), name: v.name, username: v.username, pass: hash('shabab:' + (v.pass || '1234')), posId: '', active: true, phone: en(v.phone || ''), nid: v.nid || '', hired: v.hired || todayISO() };
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
