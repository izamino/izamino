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
  if (!imam) DB.reservations.forEach(r => { if (r.status === 'در انتظار تأیید' && canDecideRes(r)) q.push({ k: 'res', t: 'رزرو', no: r.no, title: spaceOf(r.space).name + ' — ' + r.kind, st: r.status, due: r.date, id: r.id }); });
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
    ...DB.reservations.filter(r => r.date === T && r.status === 'تأییدشده').map(r => ({ t: r.start, title: r.kind, sub: spaceOf(r.space).name + ' · ' + r.applicant, k: 'res', id: r.id, tag: 'رزرو' }))].sort(by('t'));
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
A.notif = d => { const n = DB.notifs.find(x => x.id === d.id); n.read = true; Store.save(); location.hash = n.link; route(); };

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
  <div class="units">${UNITS.map(u => {
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
  formModal('ثبت در «' + R.title + '»', R.fields.map(([k, l, t]) => Array.isArray(t) ? { k, l, t: 'select', o: t } : { k, l, t: t || 'text', req: k === 'title' }), { date: todayISO() }, v => addRecord(+d.u, d.key, v));
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
  v => { if (v.type === 'internal' && v.toUnit === '') return fail('برای مکاتبه داخلی، مدیریت گیرنده را انتخاب کنید.'); return createLetter({ ...v, unitId: u }); },
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
A.letterRefer = d => { const l = DB.letters.find(x => x.id === d.id); actModal('ارجاع نامه ' + fa(l.no), v => referLetter(l, v.unit, v.note), { fields: [{ k: 'unit', l: 'ارجاع به', t: 'select', o: unitOpts(true), req: true }], noteLabel: 'دستور ارجاع', reopen: () => showLetter(l.id), done: 'نامه ارجاع شد.' }); };
A.letterReply = d => { const l = DB.letters.find(x => x.id === d.id); actModal('ثبت پاسخ نامه ' + fa(l.no), v => replyLetter(l, v.note), { noteReq: true, noteLabel: 'متن پاسخ', reopen: () => showLetter(l.id) }); };
A.letterArchive = d => { const l = DB.letters.find(x => x.id === d.id); archiveLetter(l); refresh(); showLetter(l.id); toast('نامه بایگانی شد.'); };
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
  if (v.due < v.issued) return fail('مهلت نمی‌تواند پیش از تاریخ صدور باشد.');
  if (!v.units.includes(String(posById(v.respPos).unitId))) v.units.push(String(posById(v.respPos).unitId));
  return createOrder(v);
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
A.orderRep = d => { const o = DB.orders.find(x => x.id === d.id); actModal('گزارش پیشرفت دستور', v => orderReport(o, v), { fields: [{ k: 'status', l: 'وضعیت', t: 'select', o: ['در حال بررسی', 'در حال انجام', 'منتظر تأیید'], blank: false }, { k: 'progress', l: 'درصد پیشرفت', t: 'number' }, { k: 'files', l: 'پیوست گزارش', t: 'file' }], init: { status: o.status === 'جدید' ? 'در حال بررسی' : o.status, progress: o.progress }, noteLabel: 'شرح گزارش (برای ارسال نهایی، گزارش نهایی را بنویسید)', reopen: () => showOrder(o.id) }); };
A.orderOk = d => { const o = DB.orders.find(x => x.id === d.id); actModal('تأیید نهایی دستور', v => orderDecide(o, true, v.note), { submit: 'تأیید و تکمیل', reopen: () => showOrder(o.id) }); };
A.orderBack = d => { const o = DB.orders.find(x => x.id === d.id); actModal('بازگشت دستور برای اصلاح', v => orderDecide(o, false, v.note), { noteReq: true, noteLabel: 'دلیل بازگشت', reopen: () => showOrder(o.id) }); };

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
  ], { start: todayISO(), due: addDays(todayISO(), 5), priority: 'عادی' }, v => createTask({ ...v, unitId: u }), { done: 'وظیفه ثبت و ارجاع شد.', reopen: t => showTask(t.id) });
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
  actModal(lbl, v => taskAct(t, d.act, v.note, v.to), { fields: d.act === 'reassign' ? [{ k: 'to', l: 'ارجاع به', t: 'select', o: posOpts(t.unitId), req: true }] : [], noteReq: ['return', 'note'].includes(d.act), reopen: () => showTask(t.id) });
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
  ], init, v => { const [to, cat] = v.svc.split('|'); return createRequest({ ...v, toUnit: +to, cat }); }, { done: 'درخواست ثبت شد و کد پیگیری گرفت.', reopen: r => showReq(r.id) });
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
  actModal(lbl, v => reqAct(r, d.act, v.note, v.unit), {
    fields: d.act === 'coop' ? [{ k: 'unit', l: 'مدیریت همکار', t: 'select', o: unitOpts().filter(x => x[0] !== r.toUnit), req: true }] : [],
    noteReq: ['reject', 'exec', 'final', 'coopnote'].includes(d.act),
    noteLabel: d.act === 'final' ? 'گزارش نهایی' : d.act === 'exec' ? 'شرح اقدام اجرایی' : d.act === 'reject' ? 'علت رد' : 'توضیح',
    reopen: () => showReq(r.id)
  });
};
