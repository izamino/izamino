/* =====================================================================
   قواعد نمایش و اقدام (رونوشت قواعد سرور برای نمایش دکمه‌ها؛ کنترل نهایی همیشه روی سرور است)
   ===================================================================== */
const LETTER_TYPES = { in: 'وارده', out: 'صادره', internal: 'داخلی' };
const LETTER_ST = ['ثبت‌شده', 'ارجاع‌شده', 'پاسخ داده‌شده', 'مختومه'];
const ORDER_ST = ['جدید', 'در حال بررسی', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const TASK_ST = ['جدید', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const REQ_STAGES = ['ثبت درخواست', 'ارجاع به مدیریت مسئول', 'بررسی و هماهنگی', 'تأیید', 'اجرا', 'گزارش نهایی', 'بایگانی'];
const RES_ST = ['در انتظار تأیید', 'تأییدشده', 'ردشده', 'لغوشده'];
const ASSET_HEALTH = ['سالم', 'نیازمند تعمیر', 'خراب', 'اسقاط'];
const MOVE_TYPES = ['ورود', 'خروج', 'امانت', 'عودت', 'جابه‌جایی'];
const PAY_ST = ['ثبت درخواست', 'تأیید مدیر واحد', 'بررسی امور مالی', 'تصویب امام جماعت', 'پرداخت'];
const DATE_RE = /^\d{4}-\d\d-\d\d$/;

/* ---------- نامه ---------- */
const letterUnits = l => [...new Set([+l.unitId, ...(l.toUnit != null ? [+l.toUnit] : []), ...(l.refs || []).map(r => +r.unitId)])];
const canSeeLetter = l => !!l;
const canHandleLetter = l => (isImam() || can('letters.refer')) && l.status !== 'مختومه';
const canCloseLetter = l => isImam() || (can('letters.close') && letterUnits(l).includes(myUnit()));
const lstateOf = l => (DB.lstate || []).find(s => s.l === l.id) || {};
const isUnseen = l => { const s = lstateOf(l); return !s.seen || (l.updated && l.updated > s.seen); };
const isArchivedMine = l => !!lstateOf(l).arch;

/* ---------- دستور ---------- */
const orderStatus = o => (o.status !== 'تکمیل‌شده' && o.due && o.due < todayISO() ? 'معوق' : o.status);
const canSeeOrder = () => true;

/* ---------- وظیفه ---------- */
const taskStatus = t => (t.status !== 'تکمیل‌شده' && t.due && t.due < todayISO() ? 'معوق' : t.status);
const canSeeTask = () => true;
function taskActions(t) {
  const a = []; const mine = t.assignee === ME.pos.id;
  const head = isImam() || (inUnit(t.unitId) && can('tasks.create'));
  const appr = isImam() || (inUnit(t.unitId) && can('tasks.approve'));
  if (t.status === 'تکمیل‌شده') { if (appr) a.push(['reopen', 'بازگشایی (با ثبت علت)']); return a; }
  if (t.status === 'جدید' && (mine || head)) a.push(['start', 'شروع انجام']);
  if (t.status === 'در حال انجام' && (mine || head)) a.push(['submit', 'اعلام انجام و ارسال برای تأیید']);
  if (t.status === 'منتظر تأیید' && appr && (!mine || myRole() === 'manager' || isImam())) a.push(['approve', 'تأیید انجام'], ['return', 'بازگشت برای اصلاح']);
  if (head) a.push(['reassign', 'ارجاع به فرد دیگر']);
  if (mine || head) a.push(['note', 'ثبت یادداشت پیشرفت']);
  return a;
}

/* ---------- درخواست ---------- */
const reqLabel = r => (['ردشده', 'لغوشده'].includes(r.status) ? r.status : REQ_STAGES[r.stage]);
const canSeeReq = () => true;
function reqActions(r) {
  const a = []; if (r.status !== 'جاری') return a;
  const h = isImam() || (inUnit(r.toUnit) && can('requests.handle'));
  if (r.stage === 1 && h) a.push(['review', 'شروع بررسی']);
  if (r.stage === 2 && h) a.push(['coop', 'درخواست همکاری از مدیریت دیگر'], ['send', 'ارسال برای تأیید']);
  if (r.stage === 2 && !isImam() && r.coops.includes(myUnit()) && can('requests.handle')) a.push(['coopnote', 'ثبت نظر یا اقدام همکاری']);
  if (r.stage === 3 && (r.needsImam ? isImam() : isImam() || (inUnit(r.toUnit) && myRole() === 'manager'))) a.push(['approve', 'تأیید'], ['reject', 'رد درخواست']);
  if (r.stage === 4 && h) a.push(['exec', 'ثبت اجرا']);
  if (r.stage === 5 && h) a.push(['final', 'ثبت گزارش نهایی و بایگانی']);
  if (r.stage <= 2 && r.by === ME.user.id) a.push(['cancel', 'لغو درخواست']);
  return a;
}

/* ---------- رزرو ---------- */
const canDecideRes = r => isImam() || (inUnit(resUnit(r)) && can('reservations.decide'));
const resConflicts = r => (!r.space || !spaceOf(r.space).excl ? [] : DB.reservations.filter(x => x.id !== r.id && x.space === r.space && x.status === 'تأییدشده' && x.date === r.date && r.start < x.end && x.start < r.end));

/* ---------- جلسه ---------- */
const canSeeMeeting = () => true;
const canEditMeeting = m => isImam() || m.byPos === ME.pos.id || (m.unitId === myUnit() && can('meetings.create') && myRole() !== 'secretary');

/* ---------- اموال ---------- */
const canSeeAsset = () => true;
const canManageAsset = a => isImam() || (can('assets.manage') && (inUnit(a.unitId) || inUnit(U_INTERNAL)));
const canApproveMove = a => !!a && (isImam() || (myRole() === 'manager' && (inUnit(a.unitId) || inUnit(U_INTERNAL))));
const whName = id => (DB.warehouses.find(w => w.id === id) || {}).name || '—';

/* ---------- مالی ---------- */
const nextPayStage = p => (p.stage === 2 && !p.needImam ? 4 : p.stage + 1);
const payLabel = p => (p.status === 'ردشده' ? 'ردشده' : p.status === 'پرداخت‌شده' ? 'پرداخت‌شده' : 'در انتظار ' + PAY_ST[nextPayStage(p)]);
const canSeePay = () => true;
function payCanAct(p) {
  if (p.status !== 'جاری') return false;
  const s = nextPayStage(p);
  if (s === 1) return !isImam() && inUnit(p.unitId) && myRole() === 'manager';
  if (s === 2) return inUnit(U_FIN) && can('finance.post');
  if (s === 3) return isImam();
  if (s === 4) return inUnit(U_FIN) && can('finance.approve');
  return false;
}

/* ---------- منابع انسانی ---------- */
function leaveCanAct(l) {
  if (l.status === 'در انتظار تأیید مدیر') { const p = posById(l.pos); return p && p.role === 'manager' ? isImam() : inUnit(l.unitId) && myRole() === 'manager' && l.uid !== ME.user.id; }
  if (l.status === 'در انتظار ثبت امور اداری') return inUnit(U_ADMIN) && can('hr.view');
  return false;
}

/* ---------- ابزار اختصاصی ---------- */
const toolOf = r => toolDef(r.unitId, r.tool);
const canEditToolRec = r => { const lv = toolLevel(r.unitId, r.tool); return lv === 'all' || (lv === 'own' && (r.byPos === ME.pos.id || r.assignee === ME.pos.id)); };
const toolLocked = r => { const t = toolOf(r); return !!t && t.fin.includes(r.status); };
