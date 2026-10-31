/* =====================================================================
   جایگاه‌ها و متصدیان، نظارت مدیر بر دفتر خودش، مدیریت دسترسی‌های دفتر و حساب متصدی
   ===================================================================== */
const ceilingOf = (p, k) => permOf({ ...p, mgrDeny: {} }, k);
const canManageOffice = u => isImam() || (myRole() === 'manager' && inUnit(u));
const canOversee = u => canManageOffice(u) || isAll();
const officePermsFor = u => OFFICE_PERMS.filter(k => k !== 'library.manage' || u === U_LIB);

/* کارت جایگاه: نام پنل ثابت است؛ نام فرد فقط به‌عنوان «متصدی فعلی» */
function positionCard(p) {
  const h = accountOf(p.id);
  const admin = can('admin.users') && !(isSensitivePos(p) && !isImam());
  const contact = admin || canHR() || canManageOffice(p.unitId) || (h && h.id === ME.user.id);
  return `<div class="poscard">
    <div class="pc-h"><div class="k">${ic(p.role === 'manager' ? 'shield' : p.role === 'office' ? 'file' : p.role === 'secretary' ? 'mail' : 'user')}</div><div><b>${esc(panelName(p))}</b><small>${esc(ROLES[p.role])}${h ? ` · <span class="code">${esc(h.username)}</span>` : ''}</small></div></div>
    <dl class="kv">
      <dt>متصدی فعلی</dt><dd>${h ? `<b>${esc(h.name)}</b>` : pill('بدون متصدی', 'warn')}</dd>
      ${h && contact ? `<dt>شماره تماس</dt><dd><span class="code">${fa(h.phone || '—')}</span></dd>` : ''}
      ${h ? `<dt>شروع مسئولیت</dt><dd>${jd(holderSince(p.id) || h.start || h.hired)}</dd>` : ''}
    </dl>
    <div class="row">${h && (admin || h.id === ME.user.id) ? btn('ویرایش مشخصات', 'holderEdit', { id: h.id }, 'sm ghost', 'edit') : ''}${admin && p.id !== ME.pos.id ? btn('تغییر متصدی و تحویل مسئولیت', 'handover', { id: p.id }, 'sm soft', 'users') : ''}${btn('سوابق متصدیان', 'posHist', { id: p.id }, 'sm ghost', 'history')}</div>
  </div>`;
}
const positionsGrid = u => `<div class="posgrid">${unitPositions(u).map(positionCard).join('')}</div>`;

/* ---------- نظارت مدیر بر مسئول دفتر و منشی ---------- */
function staffStats(p, days = 30) {
  const from = addDays(todayISO(), -days);
  const ts = DB.tasks.filter(t => t.assignee === p.id);
  const open = ts.filter(t => t.status !== 'تکمیل‌شده');
  const done = ts.filter(t => t.status === 'تکمیل‌شده');
  const doneP = done.filter(t => t.doneAt && isoOfStamp(t.doneAt) >= from);
  const durs = done.filter(t => t.doneAt).map(t => daysBetween(t.start, isoOfStamp(t.doneAt)));
  const acts = DB.audit.filter(a => a.pos === p.id && isoOfStamp(a.ts) >= from);
  return {
    total: ts.length, open: open.length, late: open.filter(t => taskStatus(t) === 'معوق').length, done: done.length, doneP: doneP.length,
    avg: durs.length ? sum(durs) / durs.length : null, onTime: done.filter(t => t.doneAt && (!t.due || isoOfStamp(t.doneAt) <= t.due)).length,
    letters: acts.filter(a => a.act === 'ثبت نامه').length, refers: acts.filter(a => a.act === 'ارجاع نامه').length,
    reqs: DB.requests.filter(r => r.byPos === p.id && isoOfStamp(r.created) >= from).length, acts, openList: open
  };
}
function oversightView(u) {
  if (!canOversee(u)) return denied('نظارت بر دفتر فقط برای مدیر همین مدیریت است.');
  const office = unitPositions(u).filter(p => ['office', 'secretary'].includes(p.role));
  const v = vs('ovs' + u, { days: '30' });
  const days = +v.days || 30;
  return `<div class="notice">نظارت فقط بر مسئول دفتر و منشی همین مدیریت است؛ مدیر هیچ بخشی، صرفاً به دلیل مدیر بودن، به کارکنان یا اطلاعات بخش‌های دیگر دسترسی ندارد.</div>
  <div class="chips">${[['7', 'هفت روز اخیر'], ['30', 'سی روز اخیر'], ['90', 'سه ماه اخیر']].map(([d, l]) => `<button class="chip ${String(days) === d ? 'on' : ''}" data-a="ovsDays" data-u="${u}" data-v="${d}">${l}</button>`).join('')}</div>
  ${office.map(p => {
    const h = accountOf(p.id); const s = staffStats(p, days);
    return card(esc(panelName(p)), `<div class="muted">متصدی فعلی: <b>${esc(h ? h.name : 'بدون متصدی')}</b></div>
      <div class="tiles mt">${tile('وظایف ارجاع‌شده', s.total)}${tile('باقی‌مانده', s.open, '', s.open ? 'warn' : 'ok')}${tile('معوق', s.late, '', s.late ? 'bad' : 'ok')}${tile('انجام‌شده در بازه', s.doneP, s.done ? `${fa(Math.round((s.onTime / s.done) * 100))}٪ به‌موقع` : '', 'ok')}${tile('میانگین زمان انجام', s.avg == null ? '—' : fa(s.avg.toFixed(1)) + ' روز')}${tile('نامه ثبت‌شده', s.letters, fa(s.refers) + ' ارجاع')}${tile('درخواست ثبت‌شده', s.reqs)}${tile('اقدامات ثبت‌شده', s.acts.length)}</div>
      <div class="grid g2 mt"><div><h3>کارهای باقی‌مانده</h3>${s.openList.length ? `<div class="list">${s.openList.sort((a, b) => (a.due > b.due ? 1 : -1)).slice(0, 6).map(t => `<a class="li" data-a="task" data-id="${t.id}"><div class="t"><b>${esc(t.title)}</b><small class="code">${esc(t.no)}</small></div><div style="font-size:.78rem;text-align:left">${dueTxt(t.due)}</div></a>`).join('')}</div>` : empty('کار باقی‌مانده‌ای ندارد.')}</div>
      <div><h3>آخرین اقدامات</h3>${s.acts.length ? `<div class="list">${s.acts.slice(-6).reverse().map(a => `<div class="li"><div class="t"><b>${esc(a.act)}</b><small>${esc(who(a.uid, a.nm))} · ${esc(a.note || '')} · ${jdt(a.ts)}</small></div></div>`).join('')}</div>` : empty('در این بازه اقدامی ثبت نشده است.')}</div></div>`,
      canManageOffice(u) ? btn('ارجاع کار', 'newTask', { u, to: p.id }, 'sm', 'plus') + ' ' + btn('گزارش عملکرد', 'staffReport', { id: p.id, days }, 'sm ghost', 'chart') : '');
  }).join('')}`;
}
A.ovsDays = d => { vs('ovs' + d.u).days = d.v; route(); };
A.staffReport = d => {
  const p = posById(d.id); const s = staffStats(p, +d.days || 30); const h = accountOf(p.id);
  modal({ title: 'گزارش عملکرد ' + panelName(p), wide: true, body: `${kv([['متصدی فعلی', esc(h ? h.name : '—')], ['بازه', fa(d.days) + ' روز اخیر'], ['وظایف ارجاع‌شده (کل)', fa(s.total)], ['انجام‌شده در بازه', fa(s.doneP)], ['به‌موقع از کل انجام‌شده', s.done ? fa(Math.round((s.onTime / s.done) * 100)) + '٪' : '—'], ['باقی‌مانده / معوق', `${fa(s.open)} / ${fa(s.late)}`], ['میانگین زمان انجام', s.avg == null ? '—' : fa(s.avg.toFixed(1)) + ' روز'], ['نامه ثبت‌شده / ارجاع', `${fa(s.letters)} / ${fa(s.refers)}`], ['درخواست ثبت‌شده', fa(s.reqs)]])}
    <h3>همه اقدامات بازه</h3>${table([['زمان', a => jdt(a.ts)], ['اقدام', a => esc(a.act)], ['انجام‌دهنده', a => esc(who(a.uid, a.nm))], ['شرح', a => esc(a.note || '')]], s.acts.slice().reverse().map((a, i) => ({ ...a, id: i })), { empty: 'اقدامی ثبت نشده است.' })}` });
};

/* ---------- مدیریت دسترسی‌های دفتر (مدیر همان بخش) ---------- */
function officePermsView(u) {
  if (!canManageOffice(u)) return denied('تنظیم دسترسی‌های دفتر فقط با مدیر همین مدیریت است.');
  const office = unitPositions(u).filter(p => ['office', 'secretary'].includes(p.role));
  const log = DB.audit.filter(a => a.ent === 'perm' && office.some(p => p.id === a.id) && /دسترسی دفتر/.test(a.act)).slice(-30).reverse();
  return `<div class="notice">در این بخش فقط می‌توانید دسترسی‌های مسئول دفتر و منشی همین مدیریت را <b>محدود</b> یا دوباره <b>فعال</b> کنید. دسترسی‌ای که در سقف تعیین‌شده مدیریت عالی نیست قابل اعطا نیست، و اختیارات مدیریت سامانه، جایگاه امام جماعت و دسترسی خودتان از اینجا قابل تغییر نیست. هر تغییر با نام شما و زمان ثبت می‌شود و روی سرور هم هنگام مشاهده و اجرا بررسی می‌شود.</div>
  ${office.map(p => card(esc(panelName(p)), `<div class="muted">متصدی فعلی: <b>${esc((accountOf(p.id) || {}).name || 'بدون متصدی')}</b></div>
    <div class="permlist mt">${officePermsFor(u).map(k => { const ceil = ceilingOf(p, k); const denied_ = !!(p.mgrDeny || {})[k]; const eff = permOf(p, k);
      return `<div class="perm"><div><b>${esc(permLabel(k))}</b><small>${eff ? pill('فعال', 'ok') : denied_ ? pill('محدودشده توسط مدیر', 'warn') : pill('خارج از سقف مدیریت عالی', 'mute')}</small></div>
      ${denied_ ? btn('فعال‌سازی دوباره', 'offPerm', { p: p.id, k, r: 0 }, 'sm soft') : ceil ? btn('محدود کن', 'offPerm', { p: p.id, k, r: 1 }, 'sm ghost') : '<span class="hint">قابل اعطا نیست</span>'}</div>`; }).join('')}</div>`, '', {})).join('')}
  ${card('سابقه تغییر دسترسی‌های دفتر', table([['زمان', a => jdt(a.ts)], ['تغییردهنده', a => esc(who(a.uid, a.nm))], ['تغییر', a => esc(a.act)], ['شرح', a => esc(a.note)]], log.map((a, i) => ({ ...a, id: i })), { empty: 'هنوز تغییری ثبت نشده است.' }), '', { flush: true })}`;
}
A.offPerm = async d => { const r = await run('setOfficeRestriction', d.p, d.k, !!+d.r); if (r.error) return toast(r.error); refresh(); toast(+d.r ? 'دسترسی محدود شد.' : 'دسترسی دوباره فعال شد.'); };

/* ---------- ویرایش مشخصات متصدی و تحویل رسمی مسئولیت ---------- */
const holderFields = () => [{ k: 'first', l: 'نام', req: true }, { k: 'last', l: 'نام خانوادگی', req: true }, { k: 'phone', l: 'شماره تماس', t: 'tel' }, { k: 'nid', l: 'کد ملی' }];
A.holderEdit = d => {
  const u = userById(d.id); if (!u) return;
  const self = u.id === ME.user.id;
  formModal('ویرایش مشخصات متصدی', holderFields(), u, v => run(self ? 'updateOwnHolder' : 'updateHolder', ...(self ? [v] : [u.id, v])), { pre: `<div class="notice">این فرم فقط نام و اطلاعات تماس <b>متصدی فعلی</b> را اصلاح می‌کند؛ نام پنل، نام کاربری، رمز و سوابق تغییر نمی‌کند. برای سپردن جایگاه به فرد دیگر از «تغییر متصدی و تحویل مسئولیت» استفاده کنید.</div>`, done: 'مشخصات ذخیره شد.' });
};
A.handover = d => {
  const p = posById(d.id); if (!p) return;
  const cur = accountOf(p.id);
  formModal('تغییر متصدی و تحویل مسئولیت', [...holderFields(), { k: 'start', l: 'تاریخ شروع مسئولیت', t: 'date', req: true }, { k: 'note', l: 'شرح تحویل مسئولیت', t: 'textarea', ph: 'مثلاً: تحویل پرونده‌ها و کارهای در جریان طبق صورت‌جلسه …' }], { start: todayISO() }, async v => {
    const r = await run('handover', p.id, v); if (r.error) return r;
    setTimeout(() => modal({ title: 'تحویل مسئولیت ثبت شد', body: `<p>${esc(panelName(p))} به <b>${esc(v.first + ' ' + v.last)}</b> سپرده شد. نشست‌های متصدی قبلی بسته شد و رمز قبلی دیگر کار نمی‌کند. کارهای در انتظار این جایگاه به متصدی جدید منتقل شده است.</p>${kv([['نام کاربری (ثابت)', `<span class="code">${esc(r.username)}</span>`], ['رمز اولیه', `<span class="secret code">${esc(r.tempPass || '')}</span>`]])}<div class="notice warn mt">این رمز فقط همین یک بار نمایش داده می‌شود؛ آن را حضوری به متصدی جدید تحویل دهید. تغییر رمز در اولین ورود الزامی است.</div>`, foot: btn('کپی رمز', 'copyTxt', { t: r.tempPass || '' }, '', 'file') }), 60);
    return r;
  }, { pre: `<div class="notice">${esc(panelName(p))} · متصدی فعلی: <b>${esc(cur ? cur.name : 'بدون متصدی')}</b>. با ثبت این فرم، پنل و نام کاربری <span class="code">${esc(cur ? cur.username : posUsername(p))}</span> ثابت می‌ماند، سوابق حفظ می‌شود و فقط متصدی، رمز و نشست‌ها عوض می‌شود.</div>`, submit: 'ثبت تحویل مسئولیت', done: 'تحویل مسئولیت ثبت شد.' });
};

/* ---------- حساب و مشخصات متصدی فعلی (پنل خود کاربر) ---------- */
PAGES.profile = () => {
  const u = ME.user, p = ME.pos;
  const mine = DB.logins.filter(l => l.uid === u.id).slice().reverse().slice(0, 15);
  const perms = PERMS.filter(x => can(x[0]));
  const restricted = Object.keys(p.mgrDeny || {}).filter(k => p.mgrDeny[k]);
  const hist = DB.posHistory.filter(h => h.posId === p.id).slice().reverse();
  return `${head(esc(panelName(p)), 'حساب سازمانی این جایگاه و مشخصات متصدی فعلی')}
  <div class="grid g-main">
    ${card('مشخصات متصدی فعلی', `<div class="who2 big">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub">${esc(posLabel(p.id))}</span></div></div>
      ${kv([['نام', esc(u.first || '—')], ['نام خانوادگی', esc(u.last || '—')], ['شماره تماس', `<span class="code">${fa(u.phone || '—')}</span>`], ['عنوان جایگاه سازمانی', esc(posLabel(p.id))], ['تاریخ شروع مسئولیت', jd(holderSince(p.id) || u.start || u.hired)], ['نام کاربری جایگاه (ثابت)', `<span class="code">${esc(u.username)}</span>`], ['آخرین تغییر رمز', u.passChanged ? jdt(u.passChanged) : '—']])}
      <div class="row mt">${btn('ویرایش مشخصات', 'holderEdit', { id: u.id }, '', 'edit')}${btn('تغییر رمز عبور', 'myPass', {}, 'ghost', 'key')}${btn('حالت روشن / تاریک', 'theme', {}, 'ghost', 'moon')}</div>
      <div class="hint mt">تحویل رسمی این جایگاه به فرد دیگر فقط از مسیر «تغییر متصدی و تحویل مسئولیت» توسط مدیر سامانه یا امام جماعت انجام می‌شود.</div>`)}
    ${card('دسترسی‌های این جایگاه', (perms.length ? `<div class="row">${perms.map(x => pill(x[1], 'ok')).join('')}</div>` : empty('فقط دسترسی‌های پایه')) + (restricted.length ? `<h3 class="mt">محدودشده توسط مدیر بخش</h3><div class="row">${restricted.map(k => pill(permLabel(k), 'warn')).join('')}</div>` : ''))}
  </div>
  ${card('سوابق متصدیان این جایگاه', table([['متصدی', h => esc(h.name || '—')], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : 'اکنون')], ['ثبت‌کننده تحویل', h => esc(h.by || '—')]], hist.map((h, i) => ({ ...h, id: i }))), '', { flush: true })}
  ${card('تاریخچه ورود به این حساب', table([['زمان', l => jdt(l.ts)], ['متصدی', l => esc(who(l.uid, l.nm))], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)]], mine), '<small>اگر ورودی را نمی‌شناسید، رمز خود را تغییر دهید</small>', { flush: true })}`;
};
