/* =====================================================================
   رابط پنل مدیریت سامانه، ساعت زنده و حساب کاربری
   ===================================================================== */
function heroHTML() {
  const a = DB.settings.announcement;
  const pr = DB.settings.clock.prayer ? todayPrayers() : [];
  const role = myRole();
  return `<section class="hero">
    <div class="hero-main">
      <div class="eyebrow">${esc(posLabel(ME.pos.id))}</div>
      <h1>سلام، ${esc(ME.user.name)}</h1>
      <p>${esc(DB.settings.orgName)}</p>
      ${a.on && a.text ? `<div class="hero-note ${a.tone}">${ic('megaphone')}<span>${esc(a.text)}</span></div>` : ''}
      <div class="row">${role !== 'staff' ? btn('ثبت درخواست', 'newReq', {}, 'light', 'plus') : ''}${can('letters.create') ? btn('ثبت نامه', 'newLetter', {}, 'glass', 'mail') : ''}${isImam() || can('orders.issue') ? btn('صدور دستور', 'newOrder', {}, 'glass', 'flag') : ''}${canAdminPanel() ? `<a class="btn glass" href="#admin">${ic('shield')}پنل مدیریت</a>` : ''}</div>
    </div>
    <div class="hero-clock" aria-label="ساعت و تاریخ زنده">
      <div class="big" id="hclock">${fa(nowHMS())}</div>
      <div class="dates"><b>${jdLong(todayISO())}</b><span>${hijri()}</span><span>${greg()}</span></div>
      <div class="tz">به وقت رسمی ایران · ${esc(DB.settings.clock.city)}</div>
    </div>
    ${pr.length ? `<div class="hero-pray"><div class="ph">اوقات شرعی ${esc(DB.settings.clock.city)}</div>${pr.map(p => `<div class="pt" data-pt="${p.t}"><span>${p.l}</span><b>${fa(p.t)}</b></div>`).join('')}<div class="next" id="hnext"></div><div class="method">روش ژئوفیزیک دانشگاه تهران</div></div>` : ''}
  </section>`;
}
function liveWidgets() {
  const h = $('#hclock'); if (h) h.textContent = fa(nowHMS());
  const n = $('#hnext'); if (!n) return;
  const [H, M, S] = nowHMS().split(':').map(Number); const now = H * 60 + M + S / 60;
  const pts = $$('.hero-pray .pt').filter(x => !/طلوع|غروب|نیمه/.test(x.textContent));
  pts.forEach(x => x.classList.remove('on'));
  let nx = pts.find(x => hmToMin(x.dataset.pt) > now);
  const left = nx ? hmToMin(nx.dataset.pt) - now : hmToMin(pts[0].dataset.pt) + 1440 - now;
  nx = nx || pts[0];
  nx.classList.add('on');
  const lh = Math.floor(left / 60), lm = Math.floor(left % 60), ls = Math.floor((left * 60) % 60);
  n.innerHTML = `${esc(nx.querySelector('span').textContent)} تا <b>${fa(pad(lh) + ':' + pad(lm) + ':' + pad(ls))}</b> دیگر`;
}

/* ---------- پنل مدیریت سامانه ---------- */
const ADMIN_TABS = [
  ['overview', 'نمای کلی', 'pulse', 'admin.panel'], ['users', 'کاربران', 'users', 'admin.users'], ['signups', 'درخواست عضویت', 'user', 'admin.signups'],
  ['perms', 'سطوح دسترسی', 'key', 'admin.perms'], ['approvals', 'تأیید و رد', 'check', 'admin.approve'], ['logins', 'ورودها و نشست‌ها', 'lock', 'admin.logs'],
  ['audit', 'رویدادهای سیستمی', 'history', 'admin.logs'], ['site', 'ظاهر و محتوا', 'palette', 'admin.settings'], ['org', 'ساختار سازمانی', 'building', 'admin.settings'],
  ['security', 'امنیت', 'shield', 'admin.settings'], ['sms', 'پیامک', 'sms', 'admin.settings'], ['data', 'ویرایش داده‌ها', 'db', 'admin.data'], ['backup', 'پشتیبان‌گیری', 'archive', 'admin.backup']
];
PAGES.admin = () => {
  if (!canAdminPanel()) return denied('پنل مدیریت سامانه فقط برای مدیر فناوری اطلاعات و جایگاه‌های دارای مجوز است.');
  const tabsOk = ADMIN_TABS.filter(t => can(t[3]) || (t[0] === 'overview'));
  const v = vs('adm', { tab: tabsOk[0][0] });
  if (!tabsOk.some(t => t[0] === v.tab)) v.tab = tabsOk[0][0];
  const sg = DB.signups.filter(x => x.status === 'در انتظار بررسی').length;
  const pend = can('admin.approve') ? pendingAll().length : 0;
  const nav = `<nav class="admnav" aria-label="بخش‌های پنل مدیریت">${tabsOk.map(t => `<button data-a="tab" data-key="adm" data-v="${t[0]}" class="${v.tab === t[0] ? 'on' : ''}">${ic(t[2])}<span>${t[1]}</span>${t[0] === 'signups' && sg ? `<i>${fa(sg)}</i>` : t[0] === 'approvals' && pend ? `<i>${fa(pend)}</i>` : t[0] === 'users' && lockedUsers().length ? `<i>${fa(lockedUsers().length)}</i>` : ''}</button>`).join('')}</nav>`;
  const body = (ADMIN_VIEWS[v.tab] || ADMIN_VIEWS.overview)();
  return `${head('پنل مدیریت سامانه', 'کنترل کامل کاربران، رمزها، ورودها، دسترسی‌ها، تأییدها، ظاهر و داده‌های سامانه', v.tab === 'users' ? '' : btn('کاربر جدید', 'admNewUser', {}, '', 'plus'))}
  <div class="admin-wrap">${nav}<div class="admin-body">${body}</div></div>`;
};
PAGES.users = () => { vs('adm').tab = 'users'; return PAGES.admin(); };
const userStatus = u => (u.deleted ? pill('حذف‌شده', 'bad') : !u.active ? pill('غیرفعال', 'bad') : u.lockedUntil && new Date(u.lockedUntil) > new Date() ? pill('قفل', 'warn') : pill('فعال', 'ok')) + (u.mustChange ? ' ' + pill('تغییر رمز الزامی', 'info') : '');
const av = name => { const n = (name || '؟').replace(/^(حجت‌الاسلام|سید)\s*/g, '').replace(/^سید\s*/, '').trim(); const hue = parseInt(hash(name || ''), 16) % 360; return `<span class="av" style="--h:${hue}">${esc(n[0] || '؟')}</span>`; };
const isTodayTs = t => isoOfStamp(t) === todayISO();

const ADMIN_VIEWS = {
  overview() {
    const users = DB.users.filter(u => !u.deleted);
    const lt = DB.logins.filter(l => isTodayTs(l.ts));
    const act = DB.sessions.filter(s => s.active);
    const bad = verifyAudit();
    const size = (() => { try { return JSON.stringify(DB).length; } catch (e) { return 0; } })();
    const fails = DB.logins.filter(l => !l.ok).slice(-6).reverse();
    return `<div class="tiles">
      ${tile('کاربران فعال', users.filter(u => u.active).length, fa(users.filter(u => !u.active).length) + ' غیرفعال', 'ok')}
      ${tile('ورود موفق امروز', lt.filter(l => l.ok).length)}
      ${tile('ورود ناموفق امروز', lt.filter(l => !l.ok).length, '', lt.some(l => !l.ok) ? 'bad' : '')}
      ${tile('حساب‌های قفل', lockedUsers().length, '', lockedUsers().length ? 'warn' : '')}
      ${tile('نشست‌های فعال', act.length)}
      ${tile('درخواست عضویت', DB.signups.filter(x => x.status === 'در انتظار بررسی').length, 'در انتظار بررسی', DB.signups.some(x => x.status === 'در انتظار بررسی') ? 'warn' : '')}
      ${tile('موارد معلق سامانه', pendingAll().length, 'قابل تأیید مدیریتی')}
      ${tile('سلامت رویدادها', bad < 0 ? 'سالم' : 'آسیب‌دیده', fa(DB.audit.length) + ' رویداد', bad < 0 ? 'ok' : 'bad')}
    </div>
    <div class="grid g2">
      ${card('اقدامات سریع', `<div class="quick">${[['admNewUser', 'افزودن کاربر', 'plus'], ['go', 'درخواست‌های عضویت', 'user', 'signups'], ['go', 'سطوح دسترسی', 'key', 'perms'], ['go', 'تأیید موارد معلق', 'check', 'approvals'], ['go', 'ظاهر سامانه', 'palette', 'site'], ['go', 'ساختار سازمانی', 'building', 'org'], ['admMaint', DB.settings.maintenance ? 'خروج از حالت به‌روزرسانی' : 'حالت به‌روزرسانی', 'alert'], ['backup', 'تهیه نسخه پشتیبان', 'archive']].map(([a, l, i, t]) => `<button class="qa" data-a="${a === 'go' ? 'admTab' : a}" ${t ? `data-v="${t}"` : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</div>`)}
      ${card('آخرین ورودهای ناموفق', fails.length ? `<div class="list">${fails.map(l => `<div class="li"><div class="k bad">${ic('alert')}</div><div class="t"><b class="code">${esc(l.username || '—')}</b><small>${esc(l.reason)} · ${jdt(l.ts)}</small></div></div>`).join('')}</div>` : empty('ورود ناموفقی ثبت نشده است.'), btn('همه ورودها', 'admTab', { v: 'logins' }, 'sm ghost'), { flush: true })}
    </div>
    ${card('وضعیت سامانه', kv([['نام مجموعه', esc(DB.settings.orgName)], ['حالت به‌روزرسانی', DB.settings.maintenance ? pill('فعال', 'warn') : pill('غیرفعال', 'ok')], ['پیامک', DB.settings.sms.enabled ? pill('فعال', 'ok') : pill('غیرفعال', 'mute')], ['حجم داده', fa(Math.round(size / 1024)) + ' کیلوبایت'], ['ذخیره‌سازی', MEMORY_ONLY ? pill('فقط حافظه موقت', 'bad') : 'مرورگر (نسخه آزمایشی)'], ['آخرین پشتیبان', DB.settings.backups.length ? jdt(DB.settings.backups[DB.settings.backups.length - 1].ts) : pill('تهیه نشده', 'warn')], ['منطقه زمانی', 'Asia/Tehran']]))}`;
  },
  users() {
    const v = vs('admu');
    const rows = DB.users.filter(u => (v.del ? true : !u.deleted) && textMatch(v.q, u.name, u.username, u.phone, posLabel(u.posId))
      && (!v.u || (posById(u.posId) || {}).unitId === +v.u) && (!v.r || (posById(u.posId) || {}).role === v.r)
      && (!v.s || (v.s === 'active' ? u.active && !u.deleted : v.s === 'inactive' ? !u.active : v.s === 'locked' ? lockedUsers().includes(u) : !u.posId)));
    const ib = (a, i, l, id, cls = '') => `<button class="ibtn sm ${cls}" data-a="${a}" data-id="${id}" title="${l}" aria-label="${l}">${ic(i)}</button>`;
    return `<section class="card"><div class="ch"><h2>کاربران سامانه <small>${fa(rows.length)} نفر</small></h2><div class="row">${btn('کاربر جدید', 'admNewUser', {}, 'sm', 'plus')}</div></div>
    ${filterBar('admu', [{ k: 'q', t: 'search', l: 'جست‌وجوی نام، نام کاربری، تلفن، سمت…' }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }, { k: 'r', l: 'همه نقش‌ها', o: Object.entries(ROLES) }, { k: 's', l: 'همه وضعیت‌ها', o: [['active', 'فعال'], ['inactive', 'غیرفعال'], ['locked', 'قفل'], ['nopos', 'بدون جایگاه']] }, { k: 'del', l: 'بدون حذف‌شده‌ها', o: [['1', 'با نمایش حذف‌شده‌ها']] }])}
    <div class="cb flush">${table([
      ['کاربر', u => `<a href="#" class="who2 ulink" data-a="admUserCard" data-id="${u.id}">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span></div></a>`],
      ['جایگاه سازمانی', u => (u.posId ? esc(posLabel(u.posId)) : pill('بدون جایگاه', 'warn'))],
      ['تلفن', u => `<span class="code">${fa(u.phone || '—')}</span>`],
      ['آخرین ورود', u => (u.lastLogin ? jdt(u.lastLogin) : '<span class="sub">هرگز</span>')],
      ['وضعیت', userStatus],
      ['عملیات', u => u.deleted ? '' : `<div class="acts">${ib('admEditUser', 'edit', 'ویرایش', u.id)}${can('admin.passwords') ? ib('admPass', 'key', 'تعیین رمز', u.id) : ''}${u.posId && can('admin.perms') ? ib('admPosPerm', 'shield', 'دسترسی‌های جایگاه', u.posId) : ''}${lockedUsers().includes(u) ? ib('admUnlock', 'unlock', 'بازکردن قفل', u.id) : ''}${u.id !== ME.user.id ? ib('admKick', 'logout', 'خروج اجباری از همه نشست‌ها', u.id) + ib('admToggle', u.active ? 'lock' : 'check', u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', u.id, u.active ? '' : 'ok') + ib('admDel', 'trash', 'حذف کاربر', u.id, 'bad') : ''}</div>`]
    ], rows)}</div></section>
    ${card('جایگاه‌های سازمانی', `<div class="notice">دسترسی‌ها به جایگاه متصل است، نه به شخص. با تغییر متصدی، همه سوابق جایگاه حفظ می‌شود.</div>` + table([
      ['مدیریت', p => esc(unitShort(p.unitId))], ['جایگاه', p => `<b>${esc(p.title)}</b>`], ['نقش', p => pill(ROLES[p.role], 'mute')],
      ['متصدی', p => { const h = holderOf(p.id); return h ? esc(h.name) : pill('بدون متصدی', 'warn'); }],
      ['استثنای دسترسی', p => (Object.keys(p.perms || {}).length ? pill(fa(Object.keys(p.perms).length) + ' مورد', 'info') : '—')],
      ['', p => btn('تغییر متصدی', 'assign', { id: p.id }, 'sm ghost') + ' ' + btn('سوابق', 'posHist', { id: p.id }, 'sm ghost') + (can('admin.perms') ? ' ' + btn('دسترسی', 'admPosPerm', { id: p.id }, 'sm soft') : '') + (p.role === 'staff' ? ' ' + btn('حذف', 'admDelPos', { id: p.id }, 'sm danger') : '')]
    ], DB.positions.filter(p => !vs('admu').u || p.unitId === +vs('admu').u)), [0, ...UNITS.map(u => u.id)].includes(+vs('admu').u) && vs('admu').u ? btn('افزودن جایگاه', 'addPos', { u: vs('admu').u }, 'sm soft', 'plus') : '<small>برای افزودن جایگاه، ابتدا مدیریت را از فیلتر بالا انتخاب کنید</small>', { flush: true })}`;
  },
  signups() {
    const rows = DB.signups.slice().reverse();
    return card('درخواست‌های ایجاد حساب کاربری', table([
      ['کد', s => `<span class="code">${esc(s.no)}</span>`], ['متقاضی', s => `<b>${esc(s.name)}</b><span class="sub code">${esc(s.username)} · ${fa(s.phone)}</span>`],
      ['مدیریت / سمت', s => esc(unitShort(s.unitId)) + `<span class="sub">${esc(s.title)}</span>`], ['زمان', s => jdt(s.created)], ['توضیح', s => esc(s.note || '—')],
      ['وضعیت', s => pill(s.status) + (s.reason ? `<span class="sub">${esc(s.reason)}</span>` : '')],
      ['', s => s.status === 'در انتظار بررسی' ? btn('تأیید', 'admSignOk', { id: s.id }, 'sm') + ' ' + btn('رد', 'admSignNo', { id: s.id }, 'sm danger') : '']
    ], rows, { empty: 'درخواست عضویتی ثبت نشده است. متقاضیان از صفحه ورود «درخواست ایجاد حساب کاربری» را می‌زنند.' }), '', { flush: true });
  },
  perms() {
    const cell = (role, k) => {
      const cur = ((DB.settings.rolePerms[role] || {})[k]) || '';
      const def = permDefault({ role, unitId: role === 'imam' ? 0 : 99 }, k);
      return `<select class="pm ${cur}" data-pm="${role}|${k}" aria-label="${esc(ROLES[role] + ' — ' + permLabel(k))}"><option value="">پیش‌فرض ${def ? '✓' : '✗'}</option><option value="allow" ${cur === 'allow' ? 'selected' : ''}>مجاز</option><option value="deny" ${cur === 'deny' ? 'selected' : ''}>ممنوع</option></select>`;
    };
    let g = '';
    const rows = PERMS.map(p => { const sep = p[2] !== g; g = p[2]; return `${sep ? `<tr class="grp"><td colspan="${Object.keys(ROLES).length + 1}">${esc(p[2])}</td></tr>` : ''}<tr><td>${esc(p[1])}</td>${Object.keys(ROLES).map(r => `<td>${cell(r, p[0])}</td>`).join('')}</tr>`; }).join('');
    const over = DB.positions.filter(p => Object.keys(p.perms || {}).length);
    return `${card('ماتریس دسترسی نقش‌ها', `<div class="notice">هر تغییر فوراً اعمال و در رویدادهای سیستمی ثبت می‌شود. «پیش‌فرض» یعنی رفتار استاندارد سامانه (مثلاً «امور مالی» به‌طور پیش‌فرض فقط برای مدیریت امور مالی باز است). برای یک جایگاه خاص از «استثنای جایگاه» استفاده کنید.</div><div class="tbl-wrap matrix-wrap" tabindex="0" aria-label="ماتریس دسترسی؛ برای دیدن همه نقش‌ها افقی پیمایش کنید"><table class="matrix"><thead><tr><th>مجوز</th>${Object.values(ROLES).map(r => `<th>${r}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`, '', { flush: false })}
    ${card('استثنای دسترسی جایگاه‌ها', table([['جایگاه', p => `<b>${esc(posLabel(p.id))}</b><span class="sub">${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</span>`], ['استثناها', p => Object.entries(p.perms).map(([k, v]) => pill((v === 'allow' ? '+ ' : '− ') + permLabel(k), v === 'allow' ? 'ok' : 'bad')).join(' ')], ['', p => btn('ویرایش', 'admPosPerm', { id: p.id }, 'sm ghost')]], over, { empty: 'هنوز برای هیچ جایگاهی استثنا تعریف نشده است.' }), `<select id="pickpos" aria-label="انتخاب جایگاه"><option value="">انتخاب جایگاه برای تعیین دسترسی…</option>${allPosOpts().map(gp => `<optgroup label="${esc(gp.group)}">${gp.items.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select>`, { flush: true })}`;
  },
  approvals() {
    const v = vs('admap');
    const rows = pendingAll().filter(x => (!v.k || x.k === v.k) && (!v.u || x.unit === +v.u));
    return `<div class="notice warn">${ic('alert')} تأیید یا رد مدیریتی به‌جای جایگاه مسئول انجام می‌شود و با نام شما و عبارت «اقدام مدیریتی» در سابقه همان مورد و رویدادهای سیستمی ثبت می‌گردد.</div>
    <section class="card">${filterBar('admap', [{ k: 'k', l: 'همه انواع', o: [['req', 'درخواست'], ['order', 'دستور'], ['pay', 'پرداخت'], ['res', 'رزرو'], ['leave', 'مرخصی'], ['asset', 'گردش کالا'], ['task', 'وظیفه']] }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts() }])}
    <div class="cb flush">${table([['نوع', x => pill(x.type, 'mute')], ['شماره', x => `<span class="code">${esc(x.no)}</span>`], ['موضوع', x => `<a href="#" data-a="open" data-k="${x.k}" data-id="${x.id}">${esc(x.title)}</a>`], ['مدیریت', x => esc(unitShort(x.unit))], ['منتظر', x => esc(posWho(x.wait))], ['انتظار', x => (x.age ? fa(x.age) + ' روز' : 'امروز')], ['', x => btn('تأیید', 'admOk', { i: x.no }, 'sm') + ' ' + btn('رد', 'admNo', { i: x.no }, 'sm danger')]], rows.map(x => ({ ...x, id: x.id })), { empty: 'هیچ مورد معلقی در سامانه نیست.' })}</div></section>`;
  },
  logins() {
    const v = vs('adml');
    const rows = DB.logins.filter(l => (!v.s || (v.s === 'ok' ? l.ok : !l.ok)) && textMatch(v.q, l.username, (userById(l.uid) || {}).name || '', l.reason) && inRange(isoOfStamp(l.ts), v.f, v.t)).slice().reverse().slice(0, 300);
    const act = DB.sessions.filter(s => s.active).slice().reverse();
    return `${card('نشست‌های فعال', table([['کاربر', s => { const u = userById(s.uid) || {}; return `<div class="who2">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub">${esc(posLabel(u.posId))}</span></div></div>`; }], ['شروع', s => jdt(s.start)], ['آخرین فعالیت', s => jdt(s.last)], ['مرورگر', s => `<span class="code">${esc(s.agent || '—')}</span>`], ['', s => (s.id === (mySession() || {}).id ? pill('نشست شما', 'info') : btn('پایان نشست', 'admEndSes', { id: s.id }, 'sm danger'))]], act.map(s => ({ ...s }))), act.length > 1 ? btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'sm danger') : '', { flush: true })}
    <section class="card"><div class="ch"><h2>تاریخچه ورود <small>${fa(DB.logins.length)} مورد</small></h2></div>${filterBar('adml', [{ k: 'q', t: 'search', l: 'نام کاربری، نام یا علت…' }, { k: 's', l: 'همه نتایج', o: [['ok', 'موفق'], ['fail', 'ناموفق']] }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['زمان', l => jdt(l.ts)], ['نام کاربری', l => `<span class="code">${esc(l.username)}</span>`], ['کاربر', l => esc((userById(l.uid) || {}).name || '—')], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)], ['مرورگر', l => `<span class="code">${esc(l.agent || '')}</span>`]], rows)}</div></section>`;
  },
  audit() {
    const v = vs('adma');
    const bad = verifyAudit();
    const rows = DB.audit.map((a, i) => ({ ...a, id: i })).filter(a => textMatch(v.q, a.act, a.note, (userById(a.uid) || {}).name || '') && (!v.u || a.unit === +v.u) && (!v.e || a.ent === v.e) && inRange(isoOfStamp(a.ts), v.f, v.t)).reverse().slice(0, 400);
    const ents = [...new Set(DB.audit.map(a => a.ent))];
    return `<div class="notice ${bad >= 0 ? 'warn' : ''}">${bad >= 0 ? `زنجیره رویدادها از ردیف ${fa(bad + 1)} دست‌کاری شده است.` : `زنجیره ${fa(DB.audit.length)} رویداد سالم است. رویدادها حتی توسط مدیر سامانه قابل حذف یا ویرایش نیستند.`}</div>
    <section class="card">${filterBar('adma', [{ k: 'q', t: 'search', l: 'جست‌وجو در اقدام، کاربر یا شرح…' }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }, { k: 'e', l: 'همه موجودیت‌ها', o: ents }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc((userById(a.uid) || {}).name || 'سامانه') + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['موجودیت', a => `<span class="code">${esc(a.ent)}</span>`], ['شرح', a => esc(a.note)], ['اثر انگشت', a => `<span class="code">${a.h}</span>`]], rows)}</div></section>`;
  },
  site() {
    const s = DB.settings;
    return `${card('هویت و متن‌های سامانه', `<form class="form" id="sitef">
      ${fieldHTML({ k: 'orgName', l: 'نام مجموعه', req: true }, s.orgName)}${fieldHTML({ k: 'subtitle', l: 'زیرعنوان منوی کناری' }, s.subtitle)}
      ${fieldHTML({ k: 'loginTitle', l: 'عنوان صفحه ورود' }, s.loginTitle)}${fieldHTML({ k: 'payThreshold', l: 'سقف پرداخت بدون تصویب امام (ریال)', t: 'number' }, s.payThreshold)}
      ${fieldHTML({ k: 'loginText', l: 'متن معرفی صفحه ورود', t: 'textarea' }, s.loginText)}
    </form><div class="row mt">${btn('ذخیره', 'admSaveSite', {}, '', 'check')}</div>`)}
    ${card('اطلاعیه عمومی داشبورد', `<form class="form" id="annf">${fieldHTML({ k: 'on', l: 'نمایش', t: 'check', cl: 'اطلاعیه برای همه کاربران نمایش داده شود' }, s.announcement.on)}${fieldHTML({ k: 'tone', l: 'نوع', t: 'select', o: [['info', 'اطلاع‌رسانی'], ['warn', 'هشدار'], ['ok', 'خبر خوب']], blank: false }, s.announcement.tone)}${fieldHTML({ k: 'text', l: 'متن اطلاعیه', t: 'textarea' }, s.announcement.text)}</form><div class="row mt">${btn('انتشار اطلاعیه', 'admSaveAnn', {}, '', 'megaphone')}</div>`)}
    ${card('رنگ‌بندی و اندازه', `<div class="swatches">${Object.entries(PALETTES).map(([k, p]) => `<button class="sw ${s.theme.palette === k ? 'on' : ''}" data-a="admPal" data-v="${k}"><i style="background:linear-gradient(135deg, ${p.l[2]} 0 50%, ${p.l[4]} 50% 100%)"></i><span>${p.name}</span></button>`).join('')}</div>
      <div class="row mt"><span class="muted">اندازه متن:</span>${[13, 14, 15, 16].map(n => btn(fa(n), 'admScale', { v: n }, 'sm ' + (s.theme.scale === n ? '' : 'ghost'))).join('')}</div><div class="hint mt">تغییرات فوراً برای همه کاربران اعمال می‌شود.</div>`)}
    ${card('ساعت و اوقات شرعی', `<form class="form" id="clkf">${fieldHTML({ k: 'city', l: 'نام شهر' }, s.clock.city)}${fieldHTML({ k: 'prayer', l: 'اوقات شرعی', t: 'check', cl: 'نمایش اوقات شرعی در داشبورد' }, s.clock.prayer)}${fieldHTML({ k: 'lat', l: 'عرض جغرافیایی', hint: 'آبادان: ۳۰٫۳۳۹۲' }, s.clock.lat)}${fieldHTML({ k: 'lng', l: 'طول جغرافیایی', hint: 'آبادان: ۴۸٫۳۰۴۳' }, s.clock.lng)}</form><div class="row mt">${btn('ذخیره', 'admSaveClock', {}, '', 'clock')}</div><div class="hint mt">محاسبه به روش مؤسسه ژئوفیزیک دانشگاه تهران (فجر ۱۷٫۷°، عشا ۱۴°، مغرب ۴٫۵° زیر افق) و به وقت رسمی ایران. مختصات پیش‌فرض: آبادان (۳۰٫۳۳۹۲ شمالی، ۴۸٫۳۰۴۳ شرقی). برای دقت کامل، مختصات تأییدشده محل مسجد را وارد کنید.</div>`)}`;
  },
  org() {
    const s = DB.settings;
    return `${card('مدیریت‌ها', `<div class="notice">پیش از ورود اطلاعات واقعی، فهرست مدیریت‌ها، نام‌ها و خدمات را با ساختار نهایی مجموعه تطبیق دهید. مدیریت غیرفعال از فهرست‌ها پنهان می‌شود ولی سوابقش حفظ می‌شود.</div>` + table([['#', u => fa(u.id)], ['نام کامل', u => `<b>${esc(u.name)}</b>`], ['نام کوتاه', u => esc(u.short)], ['خدمات', u => fa(SERVICES[u.id].length)], ['وضعیت', u => (u.off ? pill('غیرفعال', 'mute') : pill('فعال', 'ok'))], ['', u => btn('ویرایش', 'admUnit', { id: u.id }, 'sm ghost', 'edit') + ' ' + btn(u.off ? 'فعال‌سازی' : 'غیرفعال‌سازی', 'admUnitToggle', { id: u.id }, 'sm ' + (u.off ? 'soft' : 'ghost'))]], UNITS), btn('افزودن مدیریت', 'admUnit', {}, 'sm', 'plus'), { flush: true })}
    ${card('فضاها و امکانات قابل رزرو', table([['نام', x => esc(x.name)], ['تأییدکننده', x => esc(unitShort(x.unit))], ['ظرفیت', x => fa(x.cap)], ['کنترل تداخل', x => (x.excl ? pill('دارد', 'ok') : pill('ندارد', 'mute'))], ['', x => btn('ویرایش', 'admSpace', { id: x.id }, 'sm ghost', 'edit') + ' ' + btn('حذف', 'admSpaceDel', { id: x.id }, 'sm danger')]], SPACES), btn('افزودن فضا', 'admSpace', {}, 'sm', 'plus'), { flush: true })}
    ${card('فهرست‌های پایه', `<form class="form" id="listf">${fieldHTML({ k: 'letterCats', l: 'طبقه‌بندی نامه‌ها (هر خط یک مورد)', t: 'textarea' }, LETTER_CATS.join('\n'))}${fieldHTML({ k: 'leaveTypes', l: 'انواع مرخصی (هر خط یک مورد)', t: 'textarea' }, LEAVE_TYPES.join('\n'))}</form><div class="row mt">${btn('ذخیره فهرست‌ها', 'admSaveLists', {}, '', 'check')}${btn('بازگردانی همه ساختار به پیش‌فرض', 'admOrgReset', {}, 'ghost')}</div>`)}`;
  },
  security() {
    const s = DB.settings.security;
    return `${card('سیاست رمز و ورود', `<form class="form" id="secf">${fieldHTML({ k: 'minLen', l: 'حداقل طول رمز عبور', t: 'number', hint: 'دست‌کم ۶ و برای بهره‌برداری واقعی ۱۰ یا بیشتر' }, s.minLen)}${fieldHTML({ k: 'maxFails', l: 'تعداد تلاش ناموفق تا قفل‌شدن حساب', t: 'number' }, s.maxFails)}${fieldHTML({ k: 'lockMin', l: 'مدت قفل حساب (دقیقه)', t: 'number' }, s.lockMin)}${fieldHTML({ k: 'sessionMin', l: 'خروج خودکار پس از بی‌فعالیتی (دقیقه)', t: 'number', hint: 'بین ۵ تا ۱۴۴۰؛ دو دقیقه پیش از خروج به کاربر هشدار داده می‌شود' }, s.sessionMin)}
      ${SERVER ? '' : fieldHTML({ k: 'showDemo', l: 'حساب‌های نمونه', t: 'check', cl: 'نمایش فهرست حساب‌های نمونه در صفحه ورود (فقط نسخه نمایشی)' }, DB.settings.showDemo)}${fieldHTML({ k: 'maintenance', l: 'حالت به‌روزرسانی', t: 'check', cl: 'فقط مدیران سامانه بتوانند وارد شوند' }, DB.settings.maintenance)}</form>
      <div class="row mt">${btn('ذخیره تنظیمات امنیتی', 'admSaveSec', {}, '', 'shield')}</div>`)}
    ${card('اقدامات اضطراری', `<div class="row">${btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'danger', 'logout')}${btn('الزام تغییر رمز برای همه', 'admForceAll', {}, 'ghost', 'key')}${btn('بازکردن قفل همه حساب‌ها', 'admUnlockAll', {}, 'ghost', 'unlock')}</div><div class="hint mt">${SERVER ? 'رمزها روی سرور با scrypt و نمک جداگانه ذخیره می‌شوند و هیچ‌کس، حتی مدیر سامانه، رمز کاربران را نمی‌بیند؛ مدیر می‌تواند رمز جدید تعیین کند. رمز متصدیان جایگاه‌های حساس فقط با امام جماعت یا خط فرمان سرور تعیین می‌شود.' : 'نسخه نمایشی: رمزها فقط برای آشنایی و با روش ساده نگهداری می‌شوند؛ برای بهره‌برداری از نسخه سروری استفاده کنید.'}</div>`)}`;
  },
  sms() {
    const s = DB.settings.sms;
    const ready = s.enabled && ((s.provider === 'kavenegar' && (s.apiKeySet || s.apiKey)) || (s.provider === 'webhook' && s.webhook));
    const st = !SERVER ? pill('نسخه نمایشی — پیامکی ارسال نمی‌شود', 'warn') : ready ? pill('فعال و تنظیم‌شده', 'ok') : s.enabled ? pill('روشن ولی تنظیم‌نشده — ارسال نمی‌شود', 'bad') : pill('خاموش', 'mute');
    const cnt = k => DB.sms.filter(x => x.status === k).length;
    return `${card('وضعیت سرویس پیامک', `<div class="row">${st}</div><div class="tiles mt">${['در صف ارسال', 'ارسال‌شده', 'تحویل‌شده', 'تحویل نشد', 'ناموفق'].map(k => tile(k, cnt(k), '', k === 'ناموفق' || k === 'تحویل نشد' ? (cnt(k) ? 'bad' : '') : k === 'تحویل‌شده' ? 'ok' : '')).join('')}</div>${SERVER ? `<div class="row mt">${btn('ارسال پیامک آزمایشی', 'smsTest', {}, 'ghost', 'send')}</div>` : ''}`)}
    ${card('تنظیمات پیامک', `<form class="form" id="smsf">
      <div class="fld"><label>سرویس پیامک</label><label class="row" style="color:var(--fg);font-weight:500"><input type="checkbox" id="sms_en" ${s.enabled ? 'checked' : ''}> ارسال پیامک روشن باشد</label></div>
      ${fieldHTML({ k: 'provider', l: 'سرویس‌دهنده', t: 'select', o: [['none', 'تنظیم نشده'], ['kavenegar', 'کاوه‌نگار'], ['webhook', 'درگاه اختصاصی (Webhook)']], blank: false }, s.provider)}
      ${fieldHTML({ k: 'sender', l: 'شماره خط فرستنده' }, s.sender)}
      ${fieldHTML({ k: 'apiKey', l: 'کلید API کاوه‌نگار', t: 'password', ph: s.apiKeyHint || '', hint: s.apiKeySet ? 'کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید. کلید هرگز به مرورگر فرستاده نمی‌شود.' : 'کلید فقط روی سرور نگهداری می‌شود.' }, '')}
      ${fieldHTML({ k: 'webhook', l: 'نشانی درگاه اختصاصی', ph: 'https://…', hint: 'برای درگاه اختصاصی: درخواست POST با to و text' }, s.webhook || '')}
      ${fieldHTML({ k: 'events', l: 'رویدادهای قابل اعلان با پیامک', t: 'multi', o: Object.entries(SMS_EVENTS) }, Object.keys(s.events).filter(k => s.events[k]))}
      ${fieldHTML({ k: 'roles', l: 'دریافت‌کنندگان (بر اساس نقش)', t: 'multi', o: Object.entries(ROLES) }, s.roles)}
    </form><div class="row mt">${btn('ذخیره', 'saveSms', {}, '', 'check')}</div><div class="notice mt">متن پیامک فقط شامل نوع رویداد و کد پیگیری است؛ جزئیات محرمانه فقط در کارتابل نمایش داده می‌شود. هر پیامک تا سه بار با فاصله فزاینده دوباره ارسال می‌شود و وضعیت تحویل از کاوه‌نگار پیگیری می‌شود.</div>`)}
    ${card('صف ارسال پیامک', table([['زمان', x => jdt(x.ts)], ['گیرنده', x => esc(x.name) + `<span class="sub code">${fa(x.to)}</span>`], ['متن', x => esc(x.text)], ['وضعیت', x => pill(x.status, ['تحویل‌شده'].includes(x.status) ? 'ok' : ['ناموفق', 'تحویل نشد'].includes(x.status) ? 'bad' : x.status === 'ارسال‌شده' ? 'info' : 'warn') + (x.lastError ? `<span class="sub">${esc(x.lastError)}${x.tries ? ' · ' + fa(x.tries) + ' تلاش' : ''}</span>` : '')]], DB.sms.slice().reverse().slice(0, 100)), '', { flush: true })}`;
  },
  data() {
    const cols = Object.keys(DATA_COLS).filter(c => SAFE_DATA_COLS.includes(c));
    const v = vs('admd', { c: cols[0] });
    if (!cols.includes(v.c)) v.c = cols[0];
    const C = DATA_COLS[v.c];
    const list = (DB[v.c] || []).map((r, i) => ({ ...r, _k: r.id || String(i) })).filter(r => textMatch(v.q, JSON.stringify(r)));
    return `<div class="notice warn">${ic('alert')} ویرایش مستقیم، قواعد گردش کار را دور می‌زند؛ فقط برای اصلاح خطا استفاده کنید. هر تغییر با مقدار قبلی در رویدادهای سیستمی ثبت می‌شود. کاربران، جایگاه‌ها، دسترسی‌ها، نشست‌ها و رویدادهای سیستمی از ویرایش مستقیم محافظت شده‌اند.</div>
    <section class="card"><div class="filters"><select data-f="admd:c" id="flt-admd-c" aria-label="مجموعه داده">${cols.map(k => `<option value="${k}" ${k === v.c ? 'selected' : ''}>${esc(DATA_COLS[k].t)} (${fa((DB[k] || []).length)})</option>`).join('')}</select><input type="search" data-f="admd:q" id="flt-admd-q" placeholder="جست‌وجو در همه فیلدها…" value="${esc(v.q || '')}" aria-label="جست‌وجو"></div>
    <div class="cb flush">${table(C.f.map(([k, l]) => [l, r => { const x = r[k]; return esc(Array.isArray(x) ? fa(x.length) + ' مورد' : x && typeof x === 'object' ? '{…}' : /^\d{4}-\d\d-\d\d$/.test(x || '') ? jd(x) : String(x ?? '—').slice(0, 60)); }]), list.slice().reverse().slice(0, 200).map(r => ({ ...r, id: v.c + '|' + r._k })), { click: 'admRec' })}</div></section>`;
  },
  backup() {
    const list = DB.settings.backups.slice().reverse();
    return `${card('نسخه پشتیبان', `<p>${SERVER ? 'سرور هر روز به‌طور خودکار نسخه پشتیبان کامل تهیه می‌کند و پیش از هر بازیابی نیز از وضعیت فعلی نسخه می‌گیرد. شصت نسخه آخر نگهداری می‌شود.' : 'در نسخه نمایشی، نسخه پشتیبان به‌صورت فایل JSON در اختیار شما قرار می‌گیرد.'}</p><div class="row">${btn('تهیه نسخه پشتیبان', 'backup', {}, '', 'archive')}${btn('بازیابی از نسخه پشتیبان', 'restore', {}, 'ghost')}${SERVER ? '' : btn('بازنشانی به داده‌های نمونه', 'resetDemo', {}, 'danger')}</div>
    <div class="notice mt">بازیابی فقط پس از بررسی کامل ساختار فایل${SERVER ? '، سلامت زنجیره رویدادها' : ''} و اطمینان از اینکه دسترسی شما را افزایش نمی‌دهد انجام می‌شود. ${SERVER ? 'رویدادهای سیستمی، ورودها و نشست‌ها هرگز به عقب برنمی‌گردند.' : 'پیش از بازیابی، نسخه فعلی خودکار نگهداری می‌شود.'}</div>
    ${list.length ? `<h3 class="mt">سوابق پشتیبان‌گیری</h3>${table([['زمان', b => jdt(b.ts)], ['کاربر', b => esc(b.by)], ['حجم', b => fa(Math.round(b.size / 1024)) + ' KB'], ['رکوردها', b => fa(b.n)], ['', b => (SERVER && b.name ? `<a class="btn sm ghost" href="/api/backups/${encodeURIComponent(b.name)}" download>${ic('archive')}دریافت</a>` : '')]], list.map((b, i) => ({ ...b, id: i })))}` : ''}`)}`;
  }
};
const DATA_COLS = {
  users: { t: 'کاربران', f: [['name', 'نام'], ['username', 'نام کاربری'], ['posId', 'جایگاه'], ['active', 'فعال']] },
  positions: { t: 'جایگاه‌ها', f: [['id', 'شناسه'], ['title', 'عنوان'], ['unitId', 'مدیریت'], ['role', 'نقش']] },
  letters: { t: 'نامه‌ها', f: [['no', 'شماره'], ['subject', 'موضوع'], ['date', 'تاریخ'], ['status', 'وضعیت']] },
  orders: { t: 'دستورات', f: [['no', 'شماره'], ['title', 'عنوان'], ['due', 'مهلت'], ['status', 'وضعیت']] },
  tasks: { t: 'وظایف', f: [['no', 'شماره'], ['title', 'عنوان'], ['due', 'مهلت'], ['status', 'وضعیت']] },
  requests: { t: 'درخواست‌ها', f: [['no', 'شماره'], ['title', 'عنوان'], ['stage', 'مرحله'], ['status', 'وضعیت']] },
  reservations: { t: 'رزروها', f: [['no', 'شماره'], ['space', 'فضا'], ['date', 'تاریخ'], ['status', 'وضعیت']] },
  meetings: { t: 'جلسات', f: [['no', 'شماره'], ['title', 'عنوان'], ['date', 'تاریخ'], ['resolutions', 'مصوبات']] },
  assets: { t: 'اموال', f: [['code', 'کد'], ['name', 'نام'], ['health', 'وضعیت'], ['value', 'ارزش']] },
  movements: { t: 'گردش کالا', f: [['no', 'شماره'], ['type', 'نوع'], ['date', 'تاریخ'], ['status', 'وضعیت']] },
  warehouses: { t: 'انبارها', f: [['id', 'شناسه'], ['name', 'نام'], ['unitId', 'مدیریت']] },
  tx: { t: 'اسناد مالی', f: [['no', 'شماره'], ['kind', 'نوع'], ['amount', 'مبلغ'], ['date', 'تاریخ']] },
  payreqs: { t: 'درخواست‌های پرداخت', f: [['no', 'شماره'], ['title', 'عنوان'], ['amount', 'مبلغ'], ['status', 'وضعیت']] },
  budgets: { t: 'بودجه‌ها', f: [['unitId', 'مدیریت'], ['year', 'سال'], ['amount', 'مبلغ']] },
  commitments: { t: 'تعهدات', f: [['title', 'عنوان'], ['amount', 'مبلغ'], ['due', 'سررسید'], ['status', 'وضعیت']] },
  leaves: { t: 'مرخصی‌ها', f: [['no', 'شماره'], ['type', 'نوع'], ['from', 'از'], ['status', 'وضعیت']] },
  missions: { t: 'مأموریت‌ها', f: [['dest', 'مقصد'], ['title', 'موضوع'], ['from', 'از']] },
  decrees: { t: 'احکام', f: [['no', 'شماره'], ['title', 'عنوان'], ['date', 'تاریخ']] },
  contracts: { t: 'قراردادها', f: [['type', 'نوع'], ['title', 'عنوان'], ['to', 'پایان']] },
  signups: { t: 'درخواست‌های عضویت', f: [['no', 'کد'], ['name', 'نام'], ['username', 'نام کاربری'], ['status', 'وضعیت']] },
  notifs: { t: 'اعلان‌ها', f: [['text', 'متن'], ['pos', 'جایگاه'], ['read', 'خوانده']] },
  sms: { t: 'صف پیامک', f: [['name', 'گیرنده'], ['text', 'متن'], ['status', 'وضعیت']] },
  logins: { t: 'تاریخچه ورود', f: [['username', 'نام کاربری'], ['ok', 'موفق'], ['reason', 'شرح']] },
  sessions: { t: 'نشست‌ها', f: [['uid', 'کاربر'], ['start', 'شروع'], ['active', 'فعال']] }
};

/* ---------- اقدام‌های پنل مدیریت ---------- */
A.admUserCard = d => {
  const u = userById(d.id);
  const lg = DB.logins.filter(l => l.uid === u.id).slice(-8).reverse();
  const ss = DB.sessions.filter(x => x.uid === u.id && x.active);
  const self = u.id === ME.user.id;
  const b2 = (a, l, i, cls = 'ghost') => btn(l, a, { id: u.id }, cls, i);
  modal({ title: 'مدیریت کاربر', wide: true,
    body: `<div class="who2 big">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span></div><div style="margin-inline-start:auto">${userStatus(u)}</div></div>
    ${kv([['جایگاه سازمانی', u.posId ? esc(posLabel(u.posId)) : pill('بدون جایگاه', 'warn')], ['تلفن همراه', `<span class="code">${fa(u.phone || '—')}</span>`], ['کد ملی', `<span class="code">${fa(u.nid || '—')}</span>`], ['آخرین ورود', u.lastLogin ? jdt(u.lastLogin) : 'هرگز'], ['آخرین تغییر رمز', u.passChanged ? jdt(u.passChanged) : '—'], ['نشست‌های فعال', fa(ss.length)], ['تلاش ناموفق اخیر', fa(u.fails || 0)]])}
    <div><h3>ورودهای اخیر</h3>${table([['زمان', l => jdt(l.ts)], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)]], lg, { empty: 'ورودی ثبت نشده است.' })}</div>`,
    foot: u.deleted ? '' : `${b2('admEditUser', 'ویرایش اطلاعات', 'edit', '')}${can('admin.passwords') ? b2('admPass', 'تعیین رمز جدید', 'key') : ''}${u.posId && can('admin.perms') ? btn('دسترسی‌ها', 'admPosPerm', { id: u.posId }, 'ghost', 'shield') : ''}${lockedUsers().includes(u) ? b2('admUnlock', 'بازکردن قفل', 'unlock') : ''}${self ? '' : b2('admKick', 'خروج اجباری', 'logout') + b2('admToggle', u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', u.active ? 'lock' : 'check') + b2('admDel', 'حذف کاربر', 'trash', 'danger')}` });
};
A.admTab = d => { vs('adm').tab = d.v; route(); };
const userForm = () => [
  { k: 'name', l: 'نام و نام خانوادگی', req: true }, { k: 'username', l: 'نام کاربری', req: true, hint: 'انگلیسی، ۳ تا ۲۴ نویسه' },
  { k: 'phone', l: 'تلفن همراه', t: 'tel' }, { k: 'nid', l: 'کد ملی' },
  { k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: allPosOpts(), blank: 'بدون جایگاه' }
];
const toastRes = (r, okMsg) => { if (r && r.error) toast(r.error); else { refresh(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); } };
A.admNewUser = () => formModal('افزودن کاربر', [...userForm(), { k: 'pass', l: 'رمز اولیه', req: true, hint: 'دست‌کم ' + fa(DB.settings.security.minLen) + ' نویسه؛ رمز تصادفی پیشنهاد شده است' }, { k: 'mustChange', l: 'امنیت', t: 'check', cl: 'کاربر در اولین ورود رمز را تغییر دهد' }], { pass: genPass(), mustChange: true }, v => run('createUser', v), { done: 'کاربر ساخته شد.', submit: 'ایجاد کاربر' });
A.admEditUser = d => { const u = userById(d.id); formModal('ویرایش کاربر', userForm(), u, v => run('updateUser', u.id, v), { done: 'اطلاعات کاربر ذخیره شد.' }); };
A.admPass = d => {
  const u = userById(d.id);
  formModal('تعیین رمز', [{ k: 'pass', l: 'رمز جدید', req: true, hint: 'یک رمز تصادفی پیشنهاد شده؛ می‌توانید آن را تغییر دهید' }, { k: 'mustChange', l: 'امنیت', t: 'check', cl: 'کاربر در ورود بعدی رمز را تغییر دهد' }], { pass: genPass(), mustChange: true }, async v => {
    const r = await run('setPassword', u.id, v.pass, v.mustChange); if (r.error) return r;
    setTimeout(() => { const m = modal({ title: 'رمز جدید', body: `<p>رمز جدید <b>${esc(u.name)}</b> را به او اعلام کنید. این رمز دوباره نمایش داده نمی‌شود.</p><div class="secret code">${esc(en(v.pass))}</div>`, foot: btn('کپی رمز', 'copyTxt', { t: en(v.pass) }, '', 'file') }); }, 50);
    return r;
  }, { submit: 'تعیین رمز', done: 'رمز تعیین شد.' });
};
A.copyTxt = d => navigator.clipboard.writeText(d.t).then(() => toast('کپی شد.'), () => toast('کپی ممکن نشد؛ متن را انتخاب و کپی کنید.'));
A.admUnlock = async d => toastRes(await run('unlockUser', d.id), 'قفل حساب باز شد.');
A.admUnlockAll = async () => toastRes(await run('unlockAll'), 'قفل همه حساب‌ها باز شد.');
A.admToggle = async d => toastRes(await run('toggleUser', d.id), r => (r.active ? 'حساب فعال شد.' : 'حساب غیرفعال شد و نشست‌های آن بسته شد.'));
A.admKick = async d => toastRes(await run('kickUser', d.id), r => (r.n ? `${fa(r.n)} نشست بسته شد.` : 'این کاربر نشست فعالی ندارد.'));
A.admEndSes = async d => toastRes(await run('endSession', d.id), 'نشست بسته شد.');
A.admKickAll = () => confirmBox('خروج همه کاربران', 'همه نشست‌ها به‌جز نشست شما بسته می‌شوند و کاربران باید دوباره وارد شوند.', 'خروج همه', () => run('kickAll', (mySession() || {}).id), r => fa(r.n) + ' نشست بسته شد.');
A.admForceAll = () => confirmBox('الزام تغییر رمز', 'همه کاربران (به‌جز شما و متصدیان جایگاه‌های حساس، مگر با تأیید امام جماعت) در ورود بعدی باید رمز جدید تعیین کنند.', 'اعمال', () => run('forceAllChange'), 'اعمال شد.');
A.admDel = d => { const u = userById(d.id); confirmBox('حذف کاربر', `حساب <b>${esc(u.name)}</b> حذف می‌شود و دیگر امکان ورود ندارد. سوابق اقدامات او در سامانه باقی می‌ماند.`, 'حذف کاربر', () => run('deleteUser', u.id), 'کاربر حذف شد.'); };
A.admDelPos = d => confirmBox('حذف جایگاه', `جایگاه «${esc(posLabel(d.id))}» حذف شود؟`, 'حذف', () => run('deletePosition', d.id), 'جایگاه حذف شد.');
function confirmBox(title, text, okLabel, fn, okMsg) {
  modal({ title, body: `<p>${text}</p><div class="err" id="cferr" role="alert"></div>`, foot: `<button class="btn danger" id="cfok">${esc(okLabel)}</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  $('#cfok').addEventListener('click', async () => { const r = await fn(); if (r && r.error) { $('#cferr').textContent = r.error; return; } closeModal(); refresh(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); });
}
A.admPosPerm = d => {
  const p = posById(d.id); if (!p) return;
  const groups = [...new Set(PERMS.map(x => x[2]))];
  const self = p.id === ME.pos.id;
  modal({
    title: 'دسترسی‌های جایگاه — ' + posLabel(p.id), wide: true,
    body: `<div class="notice ${self ? 'warn' : ''}">${self ? 'این جایگاه خود شماست؛ تغییر دسترسی خود مجاز نیست و فقط امام جماعت می‌تواند آن را تغییر دهد.' : `متصدی فعلی: <b>${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</b>. تغییرات فوراً ذخیره می‌شود. مجوزهای نشان‌دار ${pill('حساس', 'warn')} را فقط امام جماعت می‌تواند اعطا کند.`}</div><div class="err" id="permerr" role="alert"></div>${groups.map(g => `<div><h3>${esc(g)}</h3><div class="permgrid">${PERMS.filter(x => x[2] === g).map(([k, l]) => { const o = (p.perms || {})[k] || ''; const eff = permOf(p, k); return `<div class="perm"><div><b>${esc(l)}</b><small>${eff ? pill('دارد', 'ok') : pill('ندارد', 'mute')}${isSensitivePerm(k) ? ' ' + pill('حساس', 'warn') : ''}</small></div><div class="seg" role="radiogroup" aria-label="${esc(l)}">${[['', 'پیش‌فرض'], ['allow', 'اعطا'], ['deny', 'سلب']].map(([v, t]) => `<button role="radio" aria-checked="${o === v}" class="${o === v ? 'on ' + v : ''}" data-a="admSetPerm" data-p="${p.id}" data-k="${k}" data-v="${v}" ${self ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>`; }).join('')}</div></div>`).join('')}`
  });
};
A.admSetPerm = async d => { const r = await run('setPosPerm', d.p, d.k, d.v); if (r.error) { const e = $('#permerr'); if (e) e.textContent = r.error; else toast(r.error); return; } refresh(); A.admPosPerm({ id: d.p }); toast('دسترسی به‌روز شد.'); };
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.pm) { const [role, k] = t.dataset.pm.split('|'); const r = await run('setRolePerm', role, k, t.value); if (r.error) { toast(r.error); route(); } else { refresh(); toast('ماتریس دسترسی به‌روز شد.'); } }
  if (t.id === 'pickpos' && t.value) A.admPosPerm({ id: t.value });
});
A.admSignOk = d => { const s = DB.signups.find(x => x.id === d.id); const free = DB.positions.filter(p => p.unitId === s.unitId && !holderOf(p.id) && !isSensitivePos(p)).map(p => [p.id, posLabel(p.id) + ' (خالی)']);
  formModal('تأیید عضویت — ' + s.name, [{ k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: [['new', `ایجاد جایگاه جدید «${s.title}» در ${unitShort(s.unitId)}`], ...free], req: true, blank: false }], { posId: 'new' }, v => run('decideSignup', s.id, true, v), { submit: 'تأیید و ایجاد حساب', done: 'حساب کاربری ایجاد شد.' }); };
A.admSignNo = d => actModal('رد درخواست عضویت', v => run('decideSignup', d.id, false, v), { noteReq: true, noteLabel: 'علت رد' });
const findPending = no => pendingAll().find(x => x.no === no);
A.admOk = d => { const x = findPending(d.i); if (!x) return toast('این مورد دیگر معلق نیست.'); actModal('تأیید مدیریتی — ' + x.type, v => run('overrideDecision', x.no, true, v.note, v.doc), { fields: x.needDoc ? [{ k: 'doc', l: 'شماره سند پرداخت', req: true }] : [], submit: 'تأیید', done: 'تأیید مدیریتی ثبت شد.' }); };
A.admNo = d => { const x = findPending(d.i); if (!x) return toast('این مورد دیگر معلق نیست.'); actModal('رد مدیریتی — ' + x.type, v => run('overrideDecision', x.no, false, v.note), { noteReq: true, noteLabel: 'علت رد', submit: 'رد', done: 'رد مدیریتی ثبت شد.' }); };
const formVals = id => { const f = $('#' + id); const o = {}; [...f.elements].forEach(el => { if (!el.name) return; if (el.type === 'checkbox' && f.querySelectorAll(`input[name="${el.name}"]`).length > 1) { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); return o; };
const saveSet = async (section, v, msg) => { const r = await run('saveSettings', section, v); if (r.error) return toast(r.error); if (section === 'site') renderShell(); else refresh(); toast(msg || 'ذخیره شد.'); };
A.admMaint = () => saveSet('maintenance', { on: !DB.settings.maintenance }, DB.settings.maintenance ? 'سامانه برای همه باز شد.' : 'حالت به‌روزرسانی فعال شد.');
A.admSaveSite = () => saveSet('site', formVals('sitef'));
A.admSaveAnn = () => { const v = formVals('annf'); saveSet('announcement', v, v.on ? 'اطلاعیه منتشر شد.' : 'اطلاعیه پنهان شد.'); };
A.admPal = d => saveSet('theme', { palette: d.v }, 'رنگ‌بندی تغییر کرد.');
A.admScale = d => saveSet('theme', { scale: +d.v }, 'اندازه متن تغییر کرد.');
A.admSaveClock = () => saveSet('clock', formVals('clkf'));
A.admSaveSec = () => saveSet('security', formVals('secf'), 'تنظیمات امنیتی ذخیره شد.');
A.saveSms = () => { const v = formVals('smsf'); v.enabled = $('#sms_en').checked; v.events = v.events || []; v.roles = v.roles || []; saveSet('sms', v, 'تنظیمات پیامک ذخیره شد.'); };
A.smsTest = () => formModal('ارسال پیامک آزمایشی', [{ k: 'to', l: 'شماره همراه', t: 'tel', req: true }], { to: ME.user.phone || '' }, async v => { if (!SERVER) return fail('ارسال واقعی پیامک فقط در نسخه سروری ممکن است.'); return Remote.post('/api/sms/test', { to: v.to }); }, { submit: 'ارسال', done: 'نتیجه در صف ارسال نمایش داده می‌شود.' });
A.admUnit = d => { const u = d.id ? UNITS.find(x => x.id === +d.id) : null; formModal(u ? 'ویرایش مدیریت' : 'افزودن مدیریت', [{ k: 'name', l: 'نام کامل', req: true }, { k: 'short', l: 'نام کوتاه', req: true }, { k: 'services', l: 'خدمات قابل درخواست (هر خط یک خدمت)', t: 'textarea', req: true }], u ? { name: u.name, short: u.short, services: SERVICES[u.id].join('\n') } : { services: 'امور عمومی' }, v => run('saveUnit', u ? u.id : 0, v), { done: u ? 'مدیریت ذخیره شد.' : 'مدیریت جدید با سه جایگاه مدیر، مسئول دفتر و منشی ساخته شد.' }); };
A.admUnitToggle = d => { const u = UNITS.find(x => x.id === +d.id); confirmBox(u.off ? 'فعال‌سازی مدیریت' : 'غیرفعال‌سازی مدیریت', u.off ? `«${esc(u.name)}» دوباره در فهرست‌ها نمایش داده می‌شود.` : `«${esc(u.name)}» از فهرست‌ها و فرم‌ها پنهان می‌شود؛ سوابق و جایگاه‌های آن حفظ می‌شود.`, u.off ? 'فعال شود' : 'غیرفعال شود', () => run('toggleUnit', u.id), 'انجام شد.'); };
A.admSpace = d => { const x = d.id ? SPACES.find(s => s.id === d.id) : { cap: 50, excl: true, unit: 3 }; formModal(d.id ? 'ویرایش فضا' : 'افزودن فضا', [{ k: 'name', l: 'نام', req: true }, { k: 'unit', l: 'مدیریت تأییدکننده', t: 'select', o: unitOpts(), req: true, blank: false }, { k: 'cap', l: 'ظرفیت (نفر)', t: 'number', req: true }, { k: 'excl', l: 'کنترل تداخل', t: 'check', cl: 'رزرو هم‌زمان مجاز نباشد' }], x, v => run('saveSpace', d.id || '', v)); };
A.admSpaceDel = d => confirmBox('حذف فضا', 'این فضا از فهرست رزرو حذف شود؟ سوابق رزروهای گذشته حفظ می‌شود.', 'حذف', () => run('deleteSpace', d.id), 'فضا حذف شد.');
A.admSaveLists = () => saveSet('lists', formVals('listf'));
A.admOrgReset = () => confirmBox('بازگردانی ساختار', 'نام مدیریت‌ها، خدمات، فضاها و فهرست‌های پایه به حالت اولیه برمی‌گردد.', 'بازگردانی', () => run('orgReset'), 'بازگردانی شد.');
A.admRec = d => {
  const [c, id] = d.id.split('|'); const rec0 = DB[c].find((x, i) => (x.id || String(i)) === id);
  if (!rec0) return;
  modal({ title: `${DATA_COLS[c].t} — ویرایش مستقیم`, wide: true, body: `<textarea id="rec" class="json" spellcheck="false" aria-label="متن رکورد">${esc(JSON.stringify(rec0, null, 2))}</textarea><div class="err" id="recerr" role="alert"></div>`,
    foot: `${btn('ذخیره تغییرات', 'admRecSave', { id: d.id }, '', 'check')}${btn('حذف رکورد', 'admRecDel', { id: d.id }, 'danger', 'trash')}${btn('انصراف', 'close', {}, 'ghost')}` });
};
A.admRecSave = async d => { const [c, id] = d.id.split('|'); let v; try { v = JSON.parse($('#rec').value); } catch (e) { $('#recerr').textContent = 'متن JSON معتبر نیست: ' + e.message; return; }
  const r = await run('dataSave', c, id, v); if (r.error) { $('#recerr').textContent = r.error; return; } closeModal(); refresh(); toast('رکورد ذخیره شد.'); };
A.admRecDel = d => { const [c, id] = d.id.split('|'); confirmBox('حذف رکورد', 'این رکورد برای همیشه حذف شود؟ اثر آن در رویدادهای سیستمی می‌ماند.', 'حذف', () => run('dataDelete', c, id), 'حذف شد.'); };

/* ---------- ویرایش آسان رکوردها از پنجره جزئیات (قواعد در ops.js) ---------- */
const EDIT_FORMS = {
  task: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اولویت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }],
  letter: [{ k: 'subject', l: 'موضوع', req: true, full: true }, { k: 'sender', l: 'فرستنده' }, { k: 'receiver', l: 'گیرنده' }, { k: 'cat', l: 'طبقه‌بندی', t: 'select', o: LETTER_CATS, blank: false }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'conf', l: 'محرمانگی', t: 'select', o: CONF, blank: false }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'body', l: 'متن', t: 'textarea' }],
  order: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }],
  meet: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'place', l: 'مکان' }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time' }, { k: 'agenda', l: 'دستور جلسه', t: 'textarea' }],
  res: [{ k: 'kind', l: 'عنوان برنامه', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'people', l: 'تعداد افراد', t: 'number', req: true }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time', req: true }, { k: 'equip', l: 'تجهیزات' }, { k: 'desc', l: 'توضیحات', t: 'textarea' }],
  asset: [{ k: 'name', l: 'نام', req: true, full: true }, { k: 'cat', l: 'گروه' }, { k: 'serial', l: 'شماره سریال' }, { k: 'value', l: 'ارزش (ریال)', t: 'number' }, { k: 'specs', l: 'مشخصات فنی', t: 'textarea' }]
};
const EDIT_BACK = { task: id => showTask(id), letter: id => showLetter(id), order: id => showOrder(id), meet: id => showMeeting(id), res: id => showRes(id), asset: id => showAsset(id) };
const editBtn = (k, r) => (canEditRec(k, r) ? btn('ویرایش', 'editRec', { k, id: r.id }, 'ghost', 'edit') : '');
A.editRec = d => { const r = DB[EDIT_RULES[d.k].col].find(x => x.id === d.id); formModal('ویرایش', EDIT_FORMS[d.k], r, v => run('editRecord', d.k, d.id, v), { submit: 'ذخیره تغییرات', done: 'تغییرات ذخیره شد.', reopen: () => EDIT_BACK[d.k](d.id) }); };

/* ---------- حساب کاربری من ---------- */
PAGES.profile = () => {
  const u = ME.user;
  const mine = DB.logins.filter(l => l.uid === u.id).slice().reverse().slice(0, 15);
  const perms = PERMS.filter(p => can(p[0]));
  return `${head('حساب کاربری من', esc(posLabel(ME.pos.id)))}
  <div class="grid g-main">
    ${card('مشخصات', `<div class="who2 big">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub code">${esc(u.username)}</span></div></div>${kv([['جایگاه', esc(posLabel(ME.pos.id))], ['مدیریت', esc(unitName(ME.pos.unitId))], ['تلفن همراه', `<span class="code">${fa(u.phone || '—')}</span>`], ['آخرین تغییر رمز', u.passChanged ? jdt(u.passChanged) : '—'], ['ورود فعلی', jdt((mySession() || {}).start)]])}<div class="row mt">${btn('تغییر رمز عبور', 'myPass', {}, '', 'key')}${btn('ویرایش تلفن', 'myPhone', {}, 'ghost', 'edit')}${btn('تغییر حالت روشن / تاریک', 'theme', {}, 'ghost', 'moon')}</div>`)}
    ${card('دسترسی‌های جایگاه من', perms.length ? `<div class="row">${perms.map(p => pill(p[1], 'ok')).join('')}</div>` : empty('فقط دسترسی‌های پایه'))}
  </div>
  ${card('تاریخچه ورود من', table([['زمان', l => jdt(l.ts)], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)], ['مرورگر', l => `<span class="code">${esc(l.agent || '')}</span>`]], mine), '<small>اگر ورودی را نمی‌شناسید، رمز خود را تغییر دهید</small>', { flush: true })}`;
};
A.myPass = () => formModal('تغییر رمز عبور', [{ k: 'cur', l: 'رمز فعلی', t: 'password', req: true }, { k: 'p1', l: 'رمز جدید', t: 'password', req: true, hint: 'دست‌کم ' + fa(DB.settings.security.minLen) + ' نویسه' }, { k: 'p2', l: 'تکرار رمز جدید', t: 'password', req: true }], {}, v => {
  if (v.p1 !== v.p2) return fail('رمز جدید و تکرار آن یکسان نیست.');
  return run('changeOwnPassword', v.cur, v.p1);
}, { submit: 'تغییر رمز', done: 'رمز عبور شما تغییر کرد.', noDraft: true });
A.myPhone = () => formModal('تلفن همراه', [{ k: 'phone', l: 'شماره همراه', t: 'tel', req: true }], ME.user, v => run('changeOwnPhone', v.phone));
