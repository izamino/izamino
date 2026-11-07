/* =====================================================================
   جایگاه‌ها و متصدیان، نظارت مدیر بر دفتر خودش، مدیریت دسترسی‌های دفتر و حساب متصدی
   ===================================================================== */
const canManageOffice = u => isImam() || can('admin.perms') || (myRole() === 'manager' && inUnit(u));
const canOversee = u => canManageOffice(u) || isAll();

/* کارت جایگاه: نام پنل ثابت است؛ نام فرد فقط به‌عنوان «متصدی فعلی» */
function positionCard(p) {
  const h = accountOf(p.id);
  const admin = can('admin.users') || isImam();
  const contact = admin || canHR() || canManageOffice(p.unitId) || (h && h.id === ME.user.id);
  return `<div class="poscard">
    <div class="pc-h"><div class="k">${ic(p.role === 'manager' ? 'shield' : p.role === 'office' ? 'file' : p.role === 'secretary' ? 'mail' : 'user')}</div><div><b>${esc(panelName(p))}</b><small>${esc(ROLES[p.role])}${h && h.username ? ` · <span class="code">${esc(h.username)}</span>` : ''}</small></div></div>
    <dl class="kv">
      <dt>متصدی فعلی</dt><dd>${h ? `<b>${esc(h.name)}</b>` : pill('بدون متصدی', 'warn')}</dd>
      ${h && contact ? `<dt>شماره تماس</dt><dd><span class="code">${fa(h.phone || '—')}</span></dd>` : ''}
      ${h ? `<dt>شروع مسئولیت</dt><dd>${jd(holderSince(p.id) || h.start)}</dd>` : ''}${h && h.title ? `<dt>عنوان</dt><dd>${esc(h.title)}</dd>` : ''}
    </dl>
    <div class="row">${h && (admin || h.id === ME.user.id) ? btn('ویرایش مشخصات', 'holderEdit', { id: h.id }, 'sm ghost', 'edit') : ''}${admin && p.id !== ME.pos.id && (p.role !== 'imam' || isImam()) && h ? btn('تحویل مسئولیت به فرد جدید', 'handover', { id: p.id }, 'sm soft', 'users') : ''}${btn('سوابق متصدیان', 'posHist', { id: p.id }, 'sm ghost', 'history')}</div>
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

/* ---------- تعیین دسترسی مسئول دفتر و منشی توسط مدیر همان بخش ---------- */
const DELEG = () => PERMS.filter(p => p.d);
const TOOL_LV = [['none', 'بدون دسترسی'], ['view', 'فقط مشاهده'], ['own', 'کارهای خود و ارجاع‌شده'], ['all', 'همه کارهای مدیریت']];
function officePermsView(u) {
  if (!canManageOffice(u)) return denied('تعیین دسترسی‌های دفتر فقط با مدیر همین مدیریت است.');
  const office = unitPositions(u).filter(p => ['office', 'secretary'].includes(p.role));
  const mgr = unitPos(u, 'manager');
  const groups = [...new Set(DELEG().map(p => p.g))];
  const log = DB.audit.filter(a => a.ent === 'perm' && office.some(p => p.id === a.id)).slice(-40).reverse();
  const tools = TOOLS[u] || [];
  return `<div class="notice">مدیر هر بخش تعیین می‌کند مسئول دفتر و منشی همین مدیریت چه کارهایی انجام دهند. فقط اختیاراتی که خودتان دارید (سقف تعیین‌شده امام جماعت) قابل واگذاری است. هر مجوز «مجوز پایه» دارد؛ تا مجوز پایه فعال نباشد، زیرمجوز اثری ندارد. هر تغییر با نام شما ثبت و روی سرور هنگام هر اقدام کنترل می‌شود.</div>
  ${office.map(p => { const h = accountOf(p.id);
    const rows = groups.map(g => `<tr class="grp"><td colspan="3">${esc(g)}</td></tr>` + DELEG().filter(x => x.g === g).map(P => {
      const set = (p.mgr || {})[P.k] || ''; const eff = permOf(p, P.k); const ceil = permOf(mgr, P.k); const parentOk = !P.p || permOf(p, P.p);
      const why = !ceil ? 'خارج از سقف اختیار مدیر' : !parentOk ? 'ابتدا «' + permLabel(P.p) + '» را فعال کنید' : '';
      return `<tr class="${!parentOk ? 'dep' : ''}"><td>${P.p ? '<span class="sub">↳</span> ' : ''}<b>${esc(P.l)}</b>${why ? `<span class="sub">${esc(why)}</span>` : ''}</td><td>${eff ? pill('فعال', 'ok') : pill('غیرفعال', 'mute')}</td>
        <td><div class="seg" role="radiogroup" aria-label="${esc(P.l)}">${[['', 'پیش‌فرض'], ['allow', 'مجاز'], ['deny', 'غیرمجاز']].map(([vv, t]) => `<button role="radio" aria-checked="${set === vv}" class="${set === vv ? 'on ' + vv : ''}" data-a="offPerm" data-p="${p.id}" data-k="${P.k}" data-v="${vv}" ${vv === 'allow' && (!ceil || !parentOk) ? 'disabled' : ''}>${t}</button>`).join('')}</div></td></tr>`;
    }).join('')).join('');
    const trows = tools.map(t => { const lv = (p.toolLv || {})[t.k] || 'none'; return `<tr><td><b>${esc(t.t)}</b>${t.conf ? ' ' + pill('محرمانه', 'warn') : ''}${t.ap ? '<span class="sub">نهایی‌شدن با تأیید مدیر</span>' : ''}</td><td><select data-toollv="${p.id}|${t.k}" aria-label="${esc(t.t)}">${TOOL_LV.map(([k, l]) => `<option value="${k}" ${k === lv ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`; }).join('');
    return card(esc(panelName(p)), `<div class="muted">متصدی فعلی: <b>${esc(h ? h.name : 'بدون متصدی')}</b></div>
      <div class="tbl-wrap mt"><table class="permtbl"><thead><tr><th>اختیار</th><th>وضعیت مؤثر</th><th>تعیین مدیر</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${tools.length ? `<h3 class="mt">دسترسی به ابزارهای اختصاصی مدیریت</h3><div class="tbl-wrap"><table class="permtbl"><thead><tr><th>ابزار</th><th>سطح دسترسی</th></tr></thead><tbody>${trows}</tbody></table></div>` : ''}`);
  }).join('')}
  ${card('سابقه تغییر دسترسی‌های دفتر', table([['زمان', a => jdt(a.ts)], ['تغییردهنده', a => esc(who(a.uid, a.nm))], ['تغییر', a => esc(a.act)], ['شرح', a => esc(a.note)]], log.map((a, i) => ({ ...a, id: i })), { empty: 'هنوز تغییری ثبت نشده است.' }), '', { flush: true })}`;
}
A.offPerm = async d => { const r = await run('setOfficePerm', d.p, d.k, d.v); if (r.error) return toast(r.error); refresh(); toast('دسترسی ذخیره شد.'); };
document.addEventListener('change', async e => { const t = e.target; if (!t.dataset || !t.dataset.toollv) return; const [p, k] = t.dataset.toollv.split('|'); const r = await run('setToolLevel', p, k, t.value); if (r.error) { toast(r.error); route(); } else { refresh(); toast('سطح دسترسی ابزار ذخیره شد.'); } });

/* ---------- ویرایش مشخصات متصدی و تحویل رسمی مسئولیت ---------- */
const holderFields = () => [{ k: 'first', l: 'نام', req: true }, { k: 'last', l: 'نام خانوادگی', req: true }, { k: 'phone', l: 'شماره تماس', t: 'tel' }, { k: 'title', l: 'عنوان یا سمت (اختیاری)' }];
A.holderEdit = d => {
  const u = userById(d.id); if (!u) return;
  const self = u.id === ME.user.id;
  formModal('ویرایش مشخصات متصدی', [...holderFields(), ...(self ? [] : [{ k: 'start', l: 'تاریخ شروع مسئولیت', t: 'date' }])], { ...u, start: holderSince(u.posId) || u.start }, v => run(self ? 'updateOwnHolder' : 'updateHolder', ...(self ? [v] : [u.id, v])), { noDraft: true, pre: `<div class="notice">این فرم فقط نام و اطلاعات <b>متصدی فعلی</b> را اصلاح می‌کند؛ نام پنل، نام کاربری، رمز و سوابق تغییر نمی‌کند. برای سپردن جایگاه به فرد دیگر از «تحویل مسئولیت به فرد جدید» استفاده کنید.</div>`, done: 'مشخصات ذخیره شد.' });
};
A.handover = d => {
  const p = posById(d.id); if (!p) return;
  const cur = accountOf(p.id);
  formModal('تحویل مسئولیت به متصدی جدید', [...holderFields(), { k: 'start', l: 'تاریخ شروع مسئولیت', t: 'date', req: true }, { k: 'pass', l: 'رمز جدید حساب (اختیاری)', hint: 'اگر خالی بماند، رمز فعلی حساب تغییر نمی‌کند؛ نشست‌های متصدی قبلی در هر حال بسته می‌شود.' }, { k: 'note', l: 'صورت تحویل مسئولیت', t: 'textarea', ph: 'مثلاً: تحویل پرونده‌ها، اموال و کارهای در جریان طبق صورت‌جلسه …' }],
    { start: todayISO() }, v => run('handover', p.id, v),
    { noDraft: true, pre: `<div class="notice">${esc(panelName(p))} · متصدی فعلی: <b>${esc(cur ? cur.name : 'بدون متصدی')}</b>. با ثبت این فرم، پنل و نام کاربری <span class="code">${esc(cur && cur.username ? cur.username : posUsername(p))}</span> ثابت می‌ماند، سابقه متصدی قبلی با تاریخ پایان و صورت تحویل بسته می‌شود و همه کارهای جاری پنل به متصدی جدید می‌رسد.</div>`, submit: 'ثبت تحویل مسئولیت', done: 'تحویل مسئولیت ثبت شد.' });
};

/* ---------- حساب و مشخصات متصدی فعلی (پنل خود کاربر) ---------- */
PAGES.profile = () => {
  const u = ME.user, p = ME.pos;
  const mine = DB.logins.filter(l => l.uid === u.id).slice(0, 15);
  const perms = PERMS.filter(x => can(x.k));
  const restricted = Object.keys(p.mgr || {}).filter(k => p.mgr[k] === 'deny');
  const tl = Object.entries(p.toolLv || {}).filter(([, l]) => l !== 'none');
  const hist = DB.posHistory.filter(h => h.posId === p.id).slice().reverse();
  return `${head(esc(panelName(p)), 'حساب سازمانی این جایگاه و مشخصات متصدی فعلی')}
  <div class="grid g-main">
    ${card('مشخصات متصدی فعلی', `<div class="who2 big">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub">${esc(posLabel(p.id))}</span></div></div>
      ${kv([['نام', esc(u.first || '—')], ['نام خانوادگی', esc(u.last || '—')], ['عنوان', esc(u.title || '—')], ['شماره تماس', `<span class="code">${fa(u.phone || '—')}</span>`], ['پنل سازمانی', esc(panelName(p))], ['تاریخ شروع مسئولیت', jd(holderSince(p.id) || u.start)], ['نام کاربری', `<span class="code">${esc(u.username || '')}</span>`]])}
      <div class="row mt">${btn('ویرایش نام و مشخصات', 'holderEdit', { id: u.id }, '', 'edit')}${btn('حالت روشن / تاریک', 'theme', {}, 'ghost', 'moon')}</div>
      <div class="hint mt">نام کاربری و رمز عبور را فقط مدیریت فناوری اطلاعات تعیین یا تغییر می‌دهد. تحویل این پنل به فرد دیگر هم از همان مسیر انجام می‌شود.</div>`)}
    ${card('دسترسی‌های این پنل', (isImam() ? '<p>امام جماعت به همه بخش‌ها دسترسی کامل دارد.</p>' : perms.length ? `<div class="row">${perms.map(x => pill(x.l, 'ok')).join('')}</div>` : empty('فقط دسترسی‌های پایه')) + (restricted.length ? `<h3 class="mt">محدودشده توسط مدیر بخش</h3><div class="row">${restricted.map(k => pill(permLabel(k), 'warn')).join('')}</div>` : '') + (tl.length ? `<h3 class="mt">ابزارهای اختصاصی</h3><div class="row">${tl.map(([k, l]) => pill((toolDef(p.unitId, k) || {}).t + ' — ' + (TOOL_LV.find(x => x[0] === l) || [, l])[1], 'info')).join('')}</div>` : ''))}
  </div>
  ${card('سوابق متصدیان این پنل', table([['متصدی', h => esc(h.name || '—')], ['از', h => jd(h.from)], ['تا', h => (h.to ? jd(h.to) : 'اکنون')], ['ثبت‌کننده تحویل', h => esc(h.by || '—')], ['صورت تحویل', h => esc(h.closeNote || h.note || '—')]], hist.map((h, i) => ({ ...h, id: i }))), '', { flush: true })}
  ${card('تاریخچه ورود به این حساب', table([['زمان', l => jdt(l.ts)], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)], ['مرورگر', l => `<span class="code">${esc(l.agent || '')}</span>`]], mine.map((l, i) => ({ ...l, id: i }))), '<small>اگر ورودی را نمی‌شناسید، به مدیریت فناوری اطلاعات اطلاع دهید</small>', { flush: true })}`;
};
