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
  addWarehouse: v => { need(isImam() || isMgrOrOffice(U_INTERNAL), 'تعریف انبار با مدیریت داخلی است.'); need(str(v.name).trim(), 'نام انبار را بنویسید.'); need(UNITS.some(u => u.id === +v.unitId), 'واحد را انتخاب کنید.'); const w = { id: 'w' + uid().slice(0, 6), name: str(v.name, 200), unitId: +v.unitId }; DB.warehouses.push(w); audit('تعریف انبار', 'warehouse', w.id, w.name); return w; },
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
  createUser: v => createUser2(v),
  updateUser: (id, v) => updateUser(rec('users', id), v),
  deleteUser: id => deleteUser(rec('users', id)),
  setPassword: (id, pass, mustChange) => setPassword(rec('users', id), pass, !!mustChange, false),
  assignHolder: (posId, userId) => assignHolder(posId, userId),
  addPosition: v => { need(UNITS.some(u => u.id === +v.unitId), 'مدیریت را انتخاب کنید.'); return addPosition(v); },
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
    else if (section === 'lists') { const L = t => str(t, 4000).split('\n').map(x => x.trim()).filter(Boolean); need(L(v.letterCats).length && L(v.leaveTypes).length, 'فهرست‌ها نباید خالی باشند.'); s.letterCats = L(v.letterCats); s.leaveTypes = L(v.leaveTypes); }
    else throw new OpError('بخش تنظیمات نامعتبر است.');
    audit('تغییر تنظیمات: ' + section, 'settings', section, '');
    applySettings();
    return {};
  },
  saveUnit: (id, v) => {
    need(can('admin.settings'), 'تغییر ساختار سازمانی مجاز نیست.');
    need(str(v.name).trim() && str(v.short).trim(), 'نام کامل و کوتاه لازم است.');
    const sv = str(v.services, 4000).split('\n').map(x => x.trim()).filter(Boolean); need(sv.length, 'دست‌کم یک خدمت لازم است.');
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
    need(str(v.name).trim(), 'نام فضا را بنویسید.'); need(UNITS.some(u => u.id === +v.unit), 'مدیریت تأییدکننده را انتخاب کنید.');
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
const PUBLIC_OPS = { createSignup: v => createSignup(v) };

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
