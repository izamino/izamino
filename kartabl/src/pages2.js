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
