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
  const resv = DB.reservations.filter(r => inRange(r.date, F, T) && (isAll() ? !v.u || spaceOf(r.space).unit === +v.u : spaceOf(r.space).unit === myUnit() || r.fromUnit === myUnit()));
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
A.readAll = () => { DB.notifs.forEach(n => { if (n.pos === ME.pos.id) n.read = true; }); refresh(); toast('همه اعلان‌ها خوانده شد.'); };

/* ---------- کاربران و دسترسی‌ها ---------- */
PAGES.users = () => {
  if (!canAdminUsers()) return denied();
  const v = vs('usr', { tab: 'pos' });
  let body = '';
  if (v.tab === 'pos') {
    const groups = [{ id: 0, name: 'مدیریت عالی' }, ...UNITS];
    body = groups.filter(g => !v.u || g.id === +v.u).map(g => card(esc(g.name), table([
      ['جایگاه', p => `<b>${esc(p.title)}</b><span class="sub code">${esc(p.id)}</span>`], ['نقش', p => pill(ROLES[p.role], 'mute')],
      ['متصدی فعلی', p => { const h = holderOf(p.id); return h ? esc(h.name) : pill('بدون متصدی', 'warn'); }],
      ['سابقه متصدیان', p => fa(DB.posHistory.filter(h => h.posId === p.id).length) + ' نفر'],
      ['', p => btn('تغییر متصدی', 'assign', { id: p.id }, 'sm ghost') + ' ' + btn('سوابق', 'posHist', { id: p.id }, 'sm ghost')]
    ], unitPositions(g.id)), g.id ? btn('افزودن جایگاه (کارشناس / کارمند)', 'addPos', { u: g.id }, 'sm soft', 'plus') : '', { flush: true })).join('');
    body = `<section class="card">${filterBar('usr', [{ k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }])}</section><div class="notice">دسترسی‌ها به جایگاه سازمانی متصل است، نه به شخص. با تغییر متصدی، تمام سوابق، نامه‌ها، وظایف و تاریخچه جایگاه برای متصدی جدید باقی می‌ماند.</div>${body}`;
  }
  if (v.tab === 'users') {
    const rows = DB.users.filter(u => textMatch(v.q, u.name, u.username));
    body = `<section class="card"><div class="ch"><h2>حساب‌های کاربری</h2>${btn('کاربر جدید', 'newUser', {}, 'sm', 'plus')}</div>${filterBar('usr', [{ k: 'q', t: 'search', l: 'جست‌وجوی نام یا نام کاربری…' }])}<div class="cb flush">${table([['نام', u => `<b>${esc(u.name)}</b>`], ['نام کاربری', u => `<span class="code">${esc(u.username)}</span>`], ['جایگاه', u => esc(u.posId ? posLabel(u.posId) : '—')], ['تلفن', u => `<span class="code">${fa(u.phone || '—')}</span>`], ['وضعیت', u => pill(u.active ? 'فعال' : 'غیرفعال')], ['', u => u.id === ME.user.id ? '' : btn(u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', 'toggleUser', { id: u.id }, 'sm ' + (u.active ? 'danger' : 'soft')) + ' ' + btn('بازنشانی رمز', 'resetPass', { id: u.id }, 'sm ghost')]], rows)}</div></section>`;
  }
  if (v.tab === 'matrix') body = card('ماتریس سطح دسترسی بر اساس نقش سازمانی', table([['مجوز', r => esc(r[0])], ...Object.entries(ROLES).map(([k, l]) => [l, r => (r[1].includes(k) ? pill('✓', 'ok') : '—')])], PERM_MATRIX.map((r, i) => Object.assign(r, { id: i }))) + `<div class="cb"><div class="notice">تفکیک داده‌ها: اطلاعات مالی فقط برای مدیریت امور مالی و امام جماعت؛ پرونده‌های پرسنلی فقط برای مدیریت امور اداری؛ اطلاعات درمانگاه و داروخانه و خیریه فقط برای همان مدیریت. نامه‌های «سری» فقط برای مدیر واحد و امام جماعت قابل مشاهده‌اند.</div></div>`, '', { flush: true });
  return `${head('کاربران و دسترسی‌ها', 'تعریف جایگاه‌ها، انتساب متصدی، فعال یا غیرفعال‌سازی حساب و ماتریس سطح دسترسی')}${tabs('usr', [['pos', `جایگاه‌های سازمانی (${fa(DB.positions.length)})`], ['users', `حساب‌های کاربری (${fa(DB.users.length)})`], ['matrix', 'ماتریس دسترسی']], v.tab)}${body}`;
};
A.assign = d => formModal('تغییر متصدی — ' + posLabel(d.id), [{ k: 'user', l: 'متصدی جدید', t: 'select', o: DB.users.filter(u => u.active).map(u => [u.id, `${u.name} (${u.posId ? posLabel(u.posId) : 'بدون جایگاه'})`]), req: true }], {}, v => assignHolder(d.id, v.user), { submit: 'ثبت انتصاب', done: 'متصدی جایگاه تغییر کرد؛ سوابق جایگاه حفظ شد.' });
A.posHist = d => modal({ title: 'سوابق جایگاه ' + posLabel(d.id), body: table([['متصدی', h => esc(userById(h.userId)?.name)], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : 'اکنون')]], DB.posHistory.filter(h => h.posId === d.id).map((h, i) => ({ ...h, id: i }))) + `<div class="hint">تعداد اقدامات ثبت‌شده با این جایگاه: ${fa(DB.audit.filter(a => a.pos === d.id).length)}</div>` });
A.addPos = d => formModal('افزودن جایگاه به ' + unitShort(+d.u), [{ k: 'title', l: 'عنوان جایگاه', req: true, ph: 'مثلاً: معاون، کارشناس، کارمند خدمات' }], {}, v => addPosition({ ...v, unitId: d.u }));
A.newUser = () => formModal('کاربر جدید', [{ k: 'name', l: 'نام و نام خانوادگی', req: true }, { k: 'username', l: 'نام کاربری', req: true }, { k: 'pass', l: 'رمز اولیه', t: 'password', req: true }, { k: 'phone', l: 'تلفن همراه', t: 'tel' }, { k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: allPosOpts() }], {}, v => createUser(v));
A.toggleUser = d => { const u = userById(d.id); u.active = !u.active; audit(u.active ? 'فعال‌سازی حساب' : 'غیرفعال‌سازی حساب', 'user', u.id, u.username); refresh(); toast(u.active ? 'حساب فعال شد.' : 'حساب غیرفعال شد.'); };
A.resetPass = d => formModal('بازنشانی رمز', [{ k: 'pass', l: 'رمز جدید', t: 'password', req: true }], {}, v => { const u = userById(d.id); u.pass = hash('shabab:' + en(v.pass)); audit('بازنشانی رمز', 'user', u.id, u.username); return u; });

/* ---------- تنظیمات و آرشیو ---------- */
PAGES.system = () => {
  const adm = canSettings();
  const v = vs('sys', { tab: 'archive' });
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
    const bad = verifyAudit();
    const rows = DB.audit.filter(a => (adm || isImam() ? true : a.unit === myUnit()) && textMatch(v.aq, a.act, a.note, (userById(a.uid) || {}).name || '')).slice().reverse().slice(0, 200);
    body = `<div class="notice ${bad >= 0 ? 'warn' : ''}">${bad >= 0 ? `زنجیره رویدادها از ردیف ${fa(bad + 1)} دست‌کاری شده است.` : `زنجیره ${fa(DB.audit.length)} رویداد سالم است؛ هر رویداد با اثر انگشت رویداد قبلی پیوند خورده و کاربران امکان حذف یا ویرایش تاریخچه را ندارند.`}</div>
    <section class="card">${filterBar('sys', [{ k: 'aq', t: 'search', l: 'جست‌وجو در رویدادها…' }])}<div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc((userById(a.uid) || {}).name || 'سامانه') + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['شرح', a => esc(a.note)], ['اثر انگشت', a => `<span class="code">${a.h}</span>`]], rows.map((a, i) => ({ ...a, id: i })))}</div></section>`;
  }
  if (v.tab === 'general') body = !adm ? denied() : card('تنظیمات عمومی', `<form class="form" id="genf">${fieldHTML({ k: 'orgName', l: 'نام مجموعه' }, DB.settings.orgName)}${fieldHTML({ k: 'payThreshold', l: 'سقف پرداخت بدون نیاز به تصویب امام جماعت (ریال)', t: 'number' }, DB.settings.payThreshold)}</form><div class="row" style="margin-top:12px">${btn('ذخیره تنظیمات', 'saveGen')}</div><div class="notice" style="margin-top:12px">منطقه زمانی رسمی سامانه: <b>تهران (Asia/Tehran)</b>. همه زمان‌ها به‌صورت UTC ذخیره و به وقت تهران با تقویم شمسی نمایش داده می‌شوند.</div>`);
  if (v.tab === 'sms') {
    const s = DB.settings.sms;
    body = !adm ? denied() : `${card('تنظیمات پیامک', `<form class="form" id="smsf">
      <div class="fld"><label>سرویس پیامک</label><label class="row" style="color:var(--fg);font-weight:500"><input type="checkbox" id="sms_en" ${s.enabled ? 'checked' : ''}> ارسال پیامک فعال باشد</label></div>
      ${fieldHTML({ k: 'provider', l: 'سرویس‌دهنده' }, s.provider)}${fieldHTML({ k: 'sender', l: 'شماره فرستنده' }, s.sender)}
      ${fieldHTML({ k: 'events', l: 'رویدادهای قابل اعلان با پیامک', t: 'multi', o: Object.entries(SMS_EVENTS) }, Object.keys(s.events).filter(k => s.events[k]))}
      ${fieldHTML({ k: 'roles', l: 'دریافت‌کنندگان (بر اساس نقش)', t: 'multi', o: Object.entries(ROLES) }, s.roles)}
    </form><div class="row" style="margin-top:12px">${btn('ذخیره', 'saveSms')}</div><div class="notice" style="margin-top:12px">برای جلوگیری از افشای اطلاعات محرمانه، متن پیامک فقط شامل نوع رویداد و کد پیگیری است و جزئیات تنها در کارتابل قابل مشاهده است.</div>`)}
    ${card('صف ارسال پیامک', table([['زمان', x => jdt(x.ts)], ['گیرنده', x => esc(x.name) + `<span class="sub code">${fa(x.to)}</span>`], ['متن', x => esc(x.text)], ['وضعیت', x => pill(x.status, 'mute')]], DB.sms.slice().reverse().slice(0, 60)), '<small>اتصال به درگاه پیامکی در نسخه سروری انجام می‌شود</small>', { flush: true })}`;
  }
  if (v.tab === 'backup') body = !adm ? denied() : `${card('نسخه پشتیبان', `<p>نسخه پشتیبان کامل پایگاه داده (شامل تاریخچه اقدامات) به‌صورت JSON. آن را کپی و در محل امن نگهداری کنید.</p><div class="row">${btn('تهیه نسخه پشتیبان', 'backup', {}, '', 'archive')}${btn('بازیابی از نسخه پشتیبان', 'restore', {}, 'ghost')}${btn('بازنشانی به داده‌های نمونه', 'resetDemo', {}, 'danger')}</div>
    ${DB.settings.backups.length ? `<h3 style="margin-top:14px">سوابق پشتیبان‌گیری</h3>${table([['زمان', b => jdt(b.ts)], ['کاربر', b => esc(b.by)], ['حجم', b => fa(Math.round(b.size / 1024)) + ' KB'], ['رکوردها', b => fa(b.n)]], DB.settings.backups.slice().reverse().map((b, i) => ({ ...b, id: i })))}` : ''}`)}`;
  const T = [['archive', 'آرشیو سامانه'], ['audit', 'رویدادهای سیستمی'], ...(adm ? [['general', 'تنظیمات عمومی'], ['sms', 'اطلاع‌رسانی و پیامک'], ['backup', 'پشتیبان‌گیری']] : [])];
  return `${head('تنظیمات و آرشیو سامانه', 'آرشیو دائمی، ثبت رویدادهای سیستمی، تنظیمات پیامک و نسخه پشتیبان')}${tabs('sys', T, v.tab)}${body}`;
};
A.arch = d => { const [k, id] = [d.id.split('|')[1], d.id.split('|')[0]]; A.open({ k, id }); };
A.saveGen = () => { const f = $('#genf'); DB.settings.orgName = f.elements.orgName.value.trim() || DB.settings.orgName; const n = +en(f.elements.payThreshold.value).replace(/\D/g, ''); if (n > 0) DB.settings.payThreshold = n; audit('تغییر تنظیمات عمومی', 'settings', 'general', ''); refresh(); toast('تنظیمات ذخیره شد.'); };
A.saveSms = () => { const f = $('#smsf'); const s = DB.settings.sms; s.enabled = $('#sms_en').checked; s.provider = f.elements.provider.value; s.sender = f.elements.sender.value; const ev = $$('input[name="events"]:checked', f).map(x => x.value); Object.keys(s.events).forEach(k => (s.events[k] = ev.includes(k))); s.roles = $$('input[name="roles"]:checked', f).map(x => x.value); audit('تغییر تنظیمات پیامک', 'settings', 'sms', ''); refresh(); toast('تنظیمات پیامک ذخیره شد.'); };
A.backup = () => {
  const { settings, ...rest } = DB;
  const json = JSON.stringify(DB);
  DB.settings.backups.push({ ts: stamp(), by: ME.user.name, size: json.length, n: DB.letters.length + DB.tasks.length + DB.requests.length + DB.orders.length });
  audit('تهیه نسخه پشتیبان', 'backup', '', fa(Math.round(json.length / 1024)) + 'KB');
  Store.save();
  modal({ title: 'نسخه پشتیبان', wide: true, body: `<p>کل متن زیر را کپی و در فایلی با پسوند <span class="code">.json</span> ذخیره کنید.</p><textarea id="bk" readonly style="width:100%;height:240px;direction:ltr;font-family:monospace;font-size:11px">${esc(json)}</textarea>`, foot: btn('کپی', 'copyBk', {}, '', 'file') });
  route();
};
A.copyBk = () => { const t = $('#bk'); navigator.clipboard.writeText(t.value).then(() => toast('نسخه پشتیبان کپی شد.'), () => { t.select(); toast('متن انتخاب شد؛ با Ctrl+C کپی کنید.'); }); };
A.restore = () => formModal('بازیابی از نسخه پشتیبان', [{ k: 'json', l: 'متن نسخه پشتیبان (JSON)', t: 'textarea', req: true }], {}, v => { try { const d = JSON.parse(v.json); if (d.ver !== 1 || !d.audit) return fail('نسخه پشتیبان معتبر نیست.'); const me = ME.user.id; DB = migrate(d); applySettings(); const u = userById(me); if (u) setMe(u); audit('بازیابی نسخه پشتیبان', 'backup', '', ''); return d; } catch (e) { return fail('متن واردشده JSON معتبر نیست.'); } }, { done: 'اطلاعات بازیابی شد.' });
A.resetDemo = () => modal({ title: 'بازنشانی داده‌ها', body: '<p>همه داده‌های فعلی حذف و داده‌های نمونه آغازین جایگزین می‌شوند. این کار برگشت‌پذیر نیست؛ ابتدا نسخه پشتیبان تهیه کنید.</p>', foot: btn('بله، بازنشانی شود', 'resetGo', {}, 'danger') + btn('انصراف', 'close', {}, 'ghost') });
A.resetGo = () => { const name = ME.user.username; Store.reset(); migrate(DB); applySettings(); closeModal(); const u = DB.users.find(x => x.username === name); if (u) { setMe(u); renderShell(); } else A.logout(); toast('داده‌های نمونه بازنشانی شد.'); };

