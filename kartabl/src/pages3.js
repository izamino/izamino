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
  const resv = DB.reservations.filter(r => inRange(r.date, F, T) && (isAll() ? !v.u || resUnit(r) === +v.u : resUnit(r) === myUnit() || r.fromUnit === myUnit()));
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
A.readAll = async () => { await run('readAllNotifs'); refresh(); toast('همه اعلان‌ها خوانده شد.'); };

/* ---------- جایگاه‌ها (اقدام‌های مشترک پنل مدیریت) ---------- */
A.assign = d => formModal('تغییر متصدی — ' + posLabel(d.id), [{ k: 'user', l: 'متصدی جدید', t: 'select', o: DB.users.filter(u => u.active && !u.deleted && u.id !== ME.user.id).map(u => [u.id, `${u.name} (${u.posId ? posLabel(u.posId) : 'بدون جایگاه'})`]), req: true }], {}, v => run('assignHolder', d.id, v.user), { submit: 'ثبت انتصاب', done: 'متصدی جایگاه تغییر کرد؛ سوابق جایگاه حفظ شد.' });
A.posHist = d => modal({ title: 'سوابق جایگاه ' + posLabel(d.id), body: table([['متصدی', h => esc(userById(h.userId)?.name || '—')], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : 'اکنون')]], DB.posHistory.filter(h => h.posId === d.id).map((h, i) => ({ ...h, id: i }))) });
A.addPos = d => formModal('افزودن جایگاه به ' + unitShort(+d.u), [{ k: 'title', l: 'عنوان جایگاه', req: true, ph: 'مثلاً: معاون، کارشناس، کارمند خدمات' }], {}, v => run('addPosition', { ...v, unitId: +d.u }));

/* ---------- آرشیو و رویدادها (برای همه کاربران، در محدوده دسترسی) ---------- */
PAGES.system = () => {
  const v = vs('sys', { tab: 'archive' });
  if (!['archive', 'audit'].includes(v.tab)) v.tab = 'archive';
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
    const rows = DB.audit.filter(a => (isAll() || can('admin.logs') ? true : a.unit === myUnit()) && textMatch(v.aq, a.act, a.note, (userById(a.uid) || {}).name || '')).slice().reverse().slice(0, 300);
    body = `<div class="notice">رویدادها فقط ${SERVER ? 'روی سرور و در جدول افزودنی (بدون امکان ویرایش و حذف از طریق سامانه) ثبت می‌شوند' : 'در این نسخه نمایشی در همین مرورگر ثبت می‌شوند و فقط برای آشنایی است'}.</div>
    <section class="card">${filterBar('sys', [{ k: 'aq', t: 'search', l: 'جست‌وجو در رویدادها…' }])}<div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc((userById(a.uid) || {}).name || 'سامانه') + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['شرح', a => esc(a.note)]], rows.map((a, i) => ({ ...a, id: i })))}</div></section>`;
  }
  return `${head('آرشیو و رویدادها', 'آرشیو دائمی مکاتبات و اقدامات و سوابق رویدادهای واحد شما')}${tabs('sys', [['archive', 'آرشیو سامانه'], ['audit', isAll() || can('admin.logs') ? 'رویدادهای سیستمی' : 'رویدادهای واحد من']], v.tab)}${canAdminPanel() ? `<div class="notice">تنظیمات، پیامک و پشتیبان‌گیری در <a href="#admin">پنل مدیریت سامانه</a> است.</div>` : ''}${body}`;
};
A.arch = d => { const [id, k] = d.id.split('|'); A.open({ k, id }); };

/* ---------- پشتیبان‌گیری و بازیابی ---------- */
A.backup = async () => {
  if (!can('admin.backup')) return toast('پشتیبان‌گیری برای جایگاه شما مجاز نیست.');
  if (SERVER) { const r = await Remote.post('/api/backups', {}); if (r.error) return toast(r.error); toast('نسخه پشتیبان روی سرور ذخیره شد: ' + r.name); await Remote.refresh(); return; }
  const json = JSON.stringify(DB);
  DB.settings.backups.push({ ts: stamp(), by: ME.user.name, size: json.length, n: DB.letters.length + DB.tasks.length + DB.requests.length + DB.orders.length });
  audit('تهیه نسخه پشتیبان', 'backup', '', fa(Math.round(json.length / 1024)) + 'KB');
  Store.save();
  const name = `kartabl-backup-${todayISO()}.json`;
  modal({ title: 'نسخه پشتیبان', wide: true, body: `<p>فایل را دریافت کنید یا متن زیر را کپی و در فایلی با پسوند <span class="code">.json</span> ذخیره کنید.</p>${CAN_PRINT ? `<p><a class="btn" href="data:application/json;charset=utf-8,${encodeURIComponent(json)}" download="${name}">${ic('archive')}دریافت فایل پشتیبان</a></p>` : ''}<textarea id="bk" readonly class="json" aria-label="متن نسخه پشتیبان">${esc(json)}</textarea>`, foot: btn('کپی متن', 'copyBk', {}, 'ghost', 'file') });
  route();
};
A.copyBk = () => { const t = $('#bk'); navigator.clipboard.writeText(t.value).then(() => toast('نسخه پشتیبان کپی شد.'), () => { t.select(); toast('متن انتخاب شد؛ با Ctrl+C کپی کنید.'); }); };
A.restore = () => formModal('بازیابی از نسخه پشتیبان', [{ k: 'file', l: 'فایل پشتیبان', t: 'file', single: true, hint: 'یا متن را در کادر زیر بچسبانید' }, { k: 'json', l: 'متن نسخه پشتیبان (JSON)', t: 'textarea' }], {}, async v => {
  if (!can('admin.backup')) return fail('بازیابی برای جایگاه شما مجاز نیست.');
  let text = v.json;
  if (v.file && v.file.length && v.file[0].text != null) text = v.file[0].text;
  if (!text) return fail('فایل یا متن نسخه پشتیبان را وارد کنید.');
  let d; try { d = JSON.parse(text); } catch (e) { return fail('متن واردشده JSON معتبر نیست.'); }
  if (SERVER) return Remote.post('/api/backups/restore', { data: d });
  const errs = validateBackup(d, ME.user.id);
  if (errs.length) return fail('نسخه پشتیبان پذیرفته نشد:\n• ' + errs.join('\n• '));
  try { localStorage.setItem('shabab-prerestore', JSON.stringify(DB)); } catch (e) { return fail('ذخیره خودکار نسخه فعلی پیش از بازیابی ممکن نشد؛ بازیابی انجام نشد.'); }
  const me = ME.user.id;
  const next = migrate(d);
  const prev = DB; DB = next;
  try { applySettings(); const u = userById(me); if (!u || !u.posId) throw new Error('حساب شما در نسخه پشتیبان نیست.'); setMe(u); audit('بازیابی نسخه پشتیبان', 'backup', '', 'نسخه فعلی پیش از بازیابی ذخیره شد'); }
  catch (e) { DB = prev; applySettings(); setMe(userById(me)); return fail('بازیابی انجام نشد: ' + e.message); }
  return {};
}, { done: 'اطلاعات بازیابی شد؛ نسخه قبلی به‌طور خودکار نگهداری شد.', submit: 'بررسی و بازیابی' });
A.resetDemo = () => modal({ title: 'بازنشانی داده‌های نمونه', body: '<p>همه داده‌های این مرورگر حذف و داده‌های نمونه آغازین جایگزین می‌شوند. ابتدا نسخه پشتیبان تهیه کنید.</p>', foot: btn('بله، بازنشانی شود', 'resetGo', {}, 'danger') + btn('انصراف', 'close', {}, 'ghost') });
A.resetGo = () => { if (SERVER || !can('admin.backup')) return toast('این کار فقط در نسخه نمایشی و برای مدیر سامانه است.'); const name = ME.user.username; Store.reset(); migrate(DB); applySettings(); closeModal(); const u = DB.users.find(x => x.username === name); if (u) { setMe(u); renderShell(); } else A.logout(); toast('داده‌های نمونه بازنشانی شد.'); };
