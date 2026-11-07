/* =====================================================================
   صفحات: گزارش‌گیری، اعلان‌ها، کاربران و دسترسی‌ها، تنظیمات و آرشیو
   ===================================================================== */

/* ---------- گزارش‌گیری و نظارت ---------- */
PAGES.reports = () => {
  if (!can('reports.view')) return denied();
  const v = vs('rep', { type: '' });
  const [jy, jm] = isoToJ(todayISO());
  if (v.f === undefined) { v.f = fa(`${jy}/${pad(jm)}/01`); v.t = jd(todayISO()); }
  const units = UNITS.filter(u => !u.off && (isAll() ? !v.u || u.id === +v.u : u.id === myUnit()));
  const F = v.f, T = v.t;
  const stats = units.map(u => ({ id: u.id, u, ...unitStats(u.id, F, T) }));
  const tot = k => sum(stats, s => s[k]);
  const pct = tot('tasks') ? Math.round((tot('done') / tot('tasks')) * 100) : 0;
  const uIds = units.map(u => u.id);
  const toolsIn = (DB.toolrecs || []).filter(r => uIds.includes(r.unitId) && inRange(r.data.date || r.data.from || r.data.start || isoOfStamp(r.created), F, T));
  const resv = DB.reservations.filter(r => inRange(r.date, F, T) && (isAll() ? !v.u || resUnit(r) === +v.u : resUnit(r) === myUnit() || r.fromUnit === myUnit()));
  const pays = DB.payreqs.filter(p => uIds.includes(p.unitId) && inRange(isoOfStamp(p.created), F, T));
  const proj = (DB.toolrecs || []).filter(r => r.unitId === U_CIVIL && r.tool === 'projects').map(r => ({ ...r.data, title: r.data.title, end: r.due, status: r.status }));
  const st = v.st;
  /* فهرست جزئیات بر اساس نوع فعالیت و وضعیت */
  let detail = [];
  const want = t => !v.type || v.type === t;
  if (want('وظیفه')) detail.push(...DB.tasks.filter(t => uIds.includes(t.unitId) && inRange(t.start, F, T)).map(t => ({ id: t.id, k: 'task', type: 'وظیفه', no: t.no, title: t.title, unit: t.unitId, date: t.start, st: taskStatus(t) })));
  if (want('درخواست')) detail.push(...DB.requests.filter(r => uIds.includes(r.toUnit) && inRange(isoOfStamp(r.created), F, T)).map(r => ({ id: r.id, k: 'req', type: 'درخواست', no: r.no, title: r.title, unit: r.toUnit, date: isoOfStamp(r.created), st: reqLabel(r) })));
  if (want('دستور')) detail.push(...DB.orders.filter(o => o.units.some(u => uIds.includes(u)) && inRange(o.issued, F, T)).map(o => ({ id: o.id, k: 'order', type: 'دستور', no: o.no, title: o.title, unit: o.units[0], date: o.issued, st: orderStatus(o) })));
  if (want('ابزار')) detail.push(...toolsIn.map(r => ({ id: r.id, k: 'tool', type: (toolOf(r) || {}).t || 'ابزار', no: r.no, title: r.data.title || r.data.person || '', unit: r.unitId, date: isoOfStamp(r.created), st: r.status })));
  if (want('نامه')) detail.push(...DB.letters.filter(l => uIds.includes(l.unitId) && inRange(l.date, F, T)).map(l => ({ id: l.id, k: 'letter', type: 'نامه', no: fa(l.no), title: l.subject, unit: l.unitId, date: l.date, st: l.status })));
  if (st) detail = detail.filter(x => x.st === st);
  const cult = toolsIn.length;
  const chartRows = stats.slice().sort((a, b) => b.pct - a.pct);
  const hb = `<div class="chart"><svg viewBox="0 0 560 ${chartRows.length * 26 + 10}" role="img" aria-label="درصد تکمیل وظایف">${chartRows.map((s, i) => { const w = (s.pct / 100) * 330; return `<text x="552" y="${i * 26 + 20}" text-anchor="end">${esc(s.u.short)}</text><rect x="${430 - w}" y="${i * 26 + 8}" width="${w}" height="16" rx="3" class="b1"/><rect x="100" y="${i * 26 + 8}" width="330" height="16" rx="3" fill="none" stroke="var(--line)"/><text x="${Math.max(30, 422 - w)}" y="${i * 26 + 20}" text-anchor="end">${fa(s.pct)}٪</text>`; }).join('')}</svg></div>`;
  return `${head('گزارش‌گیری و نظارت', isAll() ? (v.u ? 'گزارش عملکرد ' + esc(unitName(+v.u)) : `داشبورد نظارتی بر عملکرد همه ${fa(UNITS.filter(u => !u.off).length)} مدیریت`) : 'گزارش عملکرد ' + esc(unitName(myUnit())), btn('چاپ گزارش', 'print', {}, 'ghost', 'print'))}
  <section class="card">${filterBar('rep', [{ k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }, ...(isAll() ? [{ k: 'u', l: 'همه مدیریت‌ها', o: unitOpts() }] : []), { k: 'type', l: 'همه انواع فعالیت', o: ['وظیفه', 'درخواست', 'دستور', 'نامه', 'ابزار'] }, { k: 'st', l: 'همه وضعیت‌ها', o: ['جدید', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده', 'معوق', 'بایگانی', 'ردشده', 'ارجاع‌شده'] }])}
  <div class="cb row">${btn('امروز', 'repRange', { r: 'd' }, 'sm ghost')}${btn('این هفته', 'repRange', { r: 'w' }, 'sm ghost')}${btn('این ماه', 'repRange', { r: 'm' }, 'sm ghost')}${btn('امسال', 'repRange', { r: 'y' }, 'sm ghost')}<span class="hint">بازه: ${esc(F || '—')} تا ${esc(T || '—')}</span></div></section>
  <div class="tiles">${tile('وظایف در بازه', tot('tasks'))}${tile('درصد تکمیل', fa(pct) + '٪', fa(tot('done')) + ' مورد', pct >= 70 ? 'ok' : 'warn')}${tile('وظایف معوق', tot('late'), '', tot('late') ? 'bad' : 'ok')}${tile('درخواست‌های معوق', tot('reqLate'), '', tot('reqLate') ? 'bad' : '')}${tile('میانگین زمان رسیدگی', (() => { const a = stats.filter(s => s.avg != null); return a.length ? fa((sum(a, s => s.avg) / a.length).toFixed(1)) + ' روز' : '—'; })())}${tile('مکاتبات', tot('letters'))}${tile('موارد ابزارهای مدیریت‌ها', cult, fa(toolsIn.filter(r => r.pending).length) + ' منتظر تأیید')}</div>
  <div class="grid g-main">
    ${card('عملکرد مدیریت‌ها', table([['مدیریت', s => esc(s.u.name)], ['وظایف', s => fa(s.tasks)], ['تکمیل', s => fa(s.pct) + '٪'], ['معوق', s => (s.late ? pill(fa(s.late), 'bad') : fa(0))], ['درخواست باز', s => fa(s.reqOpen)], ['دستور باز', s => fa(s.ordOpen)], ['میانگین رسیدگی', s => (s.avg == null ? '—' : fa(s.avg.toFixed(1)) + ' روز')], ['مکاتبات', s => fa(s.letters)]], stats), '', { flush: true })}
    ${card('درصد وظایف تکمیل‌شده', hb)}
  </div>
  <div class="grid g3">
    ${card('وضعیت رزروها', `<div class="tiles">${RES_ST.map(s => tile(s, resv.filter(r => r.status === s).length)).join('')}</div>`)}
    ${card('وضعیت درخواست‌های مالی', `<div class="tiles">${['در انتظار تأیید مدیر واحد', 'در انتظار بررسی امور مالی', 'در انتظار تصویب امام جماعت', 'در انتظار پرداخت', 'پرداخت‌شده', 'ردشده'].map(s => tile(s.replace('در انتظار ', ''), pays.filter(p => payLabel(p) === s).length, s.startsWith('در انتظار') ? 'در انتظار' : '')).join('')}</div>`)}
    ${proj.length ? card('عملکرد پروژه‌های عمرانی', `<div class="list">${proj.map(p => `<div class="li"><div class="t"><b>${esc(p.title)}</b><small>${esc(p.contractor || '')} · ${p.end ? 'پایان ' + jd(p.end) + ' · ' : ''}هزینه ${fa(Math.round(((+p.spent || 0) / (+p.budget || 1)) * 100))}٪ بودجه · ${esc(p.status)}</small>${bar(+p.progress || 0, p.end && p.end < todayISO() && +p.progress < 100 ? 'bad' : '')}</div><b class="num">${fa(p.progress || 0)}٪</b></div>`).join('')}</div>`, '', { flush: true }) : card('روند ماهانه', monthlyChart(x => uIds.includes(x)))}
  </div>
  ${isAll() ? card('موارد ابزارهای اختصاصی به تفکیک مدیریت', table([['مدیریت', x => esc(x.u.name)], ['کل', x => fa(x.n)], ['باز', x => fa(x.open)], ['منتظر تأیید', x => (x.p ? pill(fa(x.p), 'warn') : fa(0))], ['معوق', x => (x.late ? pill(fa(x.late), 'bad') : fa(0))]], units.map(u => { const rs = toolsIn.filter(r => r.unitId === u.id); return { id: u.id, u, n: rs.length, open: rs.filter(r => !toolLocked(r)).length, p: rs.filter(r => r.pending).length, late: rs.filter(r => r.due && r.due < todayISO() && !toolLocked(r)).length }; }).filter(x => x.n)), '', { flush: true }) : ''}
  ${card('فهرست فعالیت‌ها بر اساس فیلتر', table([['نوع', x => pill(x.type, 'mute')], ['شماره', x => `<span class="${x.k === 'letter' ? 'lno' : 'code'}">${esc(x.no)}</span>`], ['عنوان', x => esc(x.title)], ['مدیریت', x => esc(unitShort(x.unit))], ['تاریخ', x => jd(x.date)], ['وضعیت', x => pill(x.st)]], detail.sort(by('date', -1)).slice(0, 80).map(x => ({ ...x, id: x.id + '|' + x.k })), { click: 'arch' }), `<small>${fa(detail.length)} مورد</small>`, { flush: true })}`;
};
A.repRange = d => {
  const v = vs('rep'); const T = todayISO(); const [y, m] = isoToJ(T);
  v.t = jd(T);
  v.f = d.r === 'd' ? jd(T) : d.r === 'w' ? jd(addDays(T, -weekday(T))) : d.r === 'm' ? fa(`${y}/${pad(m)}/01`) : fa(`${y}/01/01`);
  route();
};

/* ---------- اعلان‌ها: صفحه‌بندی، فیلتر و رفتن مستقیم به موضوع ---------- */
PAGES.notifications = () => {
  const v = vs('notif', { tab: 'unread' });
  let rows = DB.notifs.slice();
  const unread = rows.filter(n => !n.read).length;
  if (v.tab === 'unread') rows = rows.filter(n => !n.read);
  if (v.ev) rows = rows.filter(n => n.ev === v.ev);
  if (v.q) rows = rows.filter(n => textMatch(v.q, n.text));
  rows = rows.reverse();
  const p = paged('notif', rows);
  return `${head('مرکز اعلان‌ها', 'رویدادهای مرتبط با پنل شما؛ با «مشاهده و اقدام» مستقیم به همان مورد می‌روید', unread ? btn('خواندن همه (' + fa(unread) + ')', 'readAll', {}, 'ghost') : '')}
  ${tabs('notif', [['unread', `خوانده‌نشده (${fa(unread)})`], ['all', `همه (${fa(DB.notifs.length)})`]], v.tab)}
  <section class="card">${filterBar('notif', [{ k: 'q', t: 'search', l: 'جست‌وجو در اعلان‌ها…' }, { k: 'ev', l: 'همه رویدادها', o: Object.entries(SMS_EVENTS) }])}<div class="cb flush">${p.rows.length ? `<div class="list">${p.rows.map(n => `<div class="li ${n.read ? 'read' : ''}"><div class="k">${ic(n.ev === 'message' ? 'chat' : n.ev === 'letter' ? 'mail' : n.ev === 'overdue' ? 'alert' : 'bell')}</div><div class="t"><b>${esc(n.text)}</b><small>${esc(SMS_EVENTS[n.ev] || '')} · ${jdt(n.ts)}</small></div>${n.read ? '' : pill('جدید', 'new')}${n.open || n.link ? btn('مشاهده و اقدام', 'notif', { id: n.id }, 'sm soft') : ''}${n.read ? '' : btn('خواندم', 'notifRead', { id: n.id }, 'sm ghost')}</div>`).join('')}</div>${p.more}` : empty(v.tab === 'unread' ? 'اعلان خوانده‌نشده‌ای ندارید.' : 'اعلانی وجود ندارد.')}</div></section>`;
};
A.readAll = async () => { await run('readAllNotifs'); refresh(); toast('همه اعلان‌ها خوانده شد.'); };
A.notifRead = async d => { await run('readNotif', d.id); refresh(); };

/* ---------- جایگاه‌ها (اقدام‌های مشترک پنل مدیریت) ---------- */
A.assign = d => A.handover(d);
A.posHist = d => modal({ title: 'سوابق متصدیان ' + panelName(posById(d.id)), wide: true, body: table([['متصدی', h => `<b>${esc(h.name || (userById(h.userId) || {}).name || '—')}</b>${h.title ? `<span class="sub">${esc(h.title)}</span>` : ''}`], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : pill('متصدی فعلی', 'ok'))], ['ثبت تحویل', h => esc(h.by || '—')], ['صورت تحویل', h => esc(h.closeNote || h.note || '—')]], (DB.posHistory || []).filter(h => h.posId === d.id).slice().reverse().map((h, i) => ({ ...h, id: i })), { empty: 'سابقه‌ای ثبت نشده است یا اجازه دیدن آن را ندارید.' }) });


/* ---------- آرشیو و رویدادها (برای همه کاربران، در محدوده دسترسی) ---------- */
PAGES.system = () => {
  const v = vs('sys', { tab: 'archive' });
  if (!['archive', 'audit'].includes(v.tab)) v.tab = 'archive';
  let body = '';
  if (v.tab === 'archive') {
    const rows = [
      ...DB.letters.filter(l => l.status === 'مختومه').map(l => ({ id: l.id, k: 'letter', type: 'نامه', no: fa(l.no), title: l.subject, unit: l.unitId, date: l.date, st: 'مختومه' })),
      ...DB.requests.filter(r => ['بایگانی', 'ردشده', 'لغوشده'].includes(r.status) && canSeeReq(r)).map(r => ({ id: r.id, k: 'req', type: 'درخواست', no: r.no, title: r.title, unit: r.toUnit, date: isoOfStamp(r.doneAt || r.created), st: r.status })),
      ...DB.orders.filter(o => o.status === 'تکمیل‌شده' && canSeeOrder(o)).map(o => ({ id: o.id, k: 'order', type: 'دستور', no: o.no, title: o.title, unit: o.units[0], date: o.issued })),
      ...DB.tasks.filter(t => t.status === 'تکمیل‌شده' && canSeeTask(t)).map(t => ({ id: t.id, k: 'task', type: 'وظیفه', no: t.no, title: t.title, unit: t.unitId, date: t.start })),
      ...DB.meetings.filter(m => m.date < todayISO() && canSeeMeeting(m)).map(m => ({ id: m.id, k: 'meet', type: m.kind, no: m.no, title: m.title, unit: m.unitId, date: m.date }))
    ].filter(x => textMatch(v.q, x.no, x.title) && (!v.ty || x.type === v.ty)).sort(by('date', -1));
    body = `<section class="card">${filterBar('sys', [{ k: 'q', t: 'search', l: 'جست‌وجو در آرشیو دائمی…' }, { k: 'ty', l: 'همه انواع', o: ['نامه', 'درخواست', 'دستور', 'وظیفه', 'جلسه', 'ملاقات'] }])}<div class="cb flush">${table([['نوع', x => pill(x.type, 'mute')], ['شماره', x => `<span class="${x.k === 'letter' ? 'lno' : 'code'}">${esc(x.no)}</span>`], ['عنوان', x => esc(x.title)], ['مدیریت', x => esc(unitShort(x.unit))], ['تاریخ', x => jd(x.date)], ['وضعیت', x => pill(x.st || 'بایگانی')]], rows.map(x => ({ ...x, id: x.id + '|' + x.k })), { click: 'arch' })}</div></section>`;
  }
  if (v.tab === 'audit') {
    const rows = DB.audit.filter(a => textMatch(v.aq, a.act, a.note, who(a.uid, a.nm))).slice().reverse().slice(0, 400);
    body = `<div class="notice">رویدادها روی سرور در جدولی با زنجیره اثر انگشت ثبت می‌شوند و از طریق سامانه قابل ویرایش یا حذف نیستند.</div>
    <section class="card">${filterBar('sys', [{ k: 'aq', t: 'search', l: 'جست‌وجو در رویدادها…' }])}<div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc(who(a.uid, a.nm)) + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['شرح', a => esc(a.note)]], rows.map((a, i) => ({ ...a, id: i })))}</div></section>`;
  }
  return `${head('آرشیو و رویدادها', 'آرشیو دائمی مکاتبات و اقدامات و سوابق رویدادهای واحد شما')}${tabs('sys', [['archive', 'آرشیو سامانه'], ['audit', isAll() || can('admin.logs') ? 'رویدادهای سیستمی' : 'رویدادهای واحد من']], v.tab)}${canAdminPanel() ? `<div class="notice">تنظیمات، پیامک و پشتیبان‌گیری در <a href="#admin">پنل مدیریت سامانه</a> است.</div>` : ''}${body}`;
};
A.arch = d => { const [id, k] = d.id.split('|'); A.open({ k, id }); };

