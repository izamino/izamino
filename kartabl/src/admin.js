/* =====================================================================
   رابط پنل مدیریت سامانه، ساعت زنده و حساب کاربری
   ===================================================================== */
function heroHTML() {
  const a = DB.settings.announcement || {};
  const pr = DB.settings.clock && DB.settings.clock.prayer ? todayPrayers() : [];
  const role = myRole();
  return `<section class="hero">
    <div class="hero-main">
      <div class="eyebrow">${esc(DB.settings.orgName)}</div>
      <h1>${esc(panelName(ME.pos))}</h1>
      <p>متصدی فعلی: ${esc(ME.user.name)}</p>
      ${a.on && a.text ? `<div class="hero-note ${a.tone}">${ic('megaphone')}<span>${esc(a.text)}</span></div>` : ''}
      <div class="row">${can('letters.create') ? btn('نوشتن نامه', 'newLetter', {}, 'light', 'edit') : ''}${can('requests.create') ? btn('ثبت درخواست', 'newReq', {}, 'glass', 'plus') : ''}${can('messages.use') ? btn('پیام', 'newMsg', {}, 'glass', 'chat') : ''}${isImam() || can('orders.issue') ? btn('صدور دستور', 'newOrder', {}, 'glass', 'flag') : ''}${canAdminPanel() ? `<a class="btn glass" href="#admin">${ic('shield')}پنل مدیریت</a>` : ''}</div>
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
  ['overview', 'نمای کلی', 'pulse', ''], ['users', 'حساب‌ها و رمزها', 'users', 'admin.users'], ['perms', 'سطوح دسترسی', 'key', 'admin.perms'],
  ['logins', 'ورودها و نشست‌ها', 'lock', 'admin.logs'], ['audit', 'رویدادهای سیستمی', 'history', 'admin.logs'], ['site', 'ظاهر و سربرگ', 'palette', 'admin.settings'], ['org', 'ساختار سازمانی', 'building', 'admin.settings'],
  ['security', 'امنیت', 'shield', 'admin.settings'], ['sms', 'پیامک', 'sms', 'admin.settings'], ['backup', 'پشتیبان‌گیری', 'archive', 'admin.backup']
];
PAGES.admin = () => {
  if (!canAdminPanel() && !isImam()) return denied('پنل مدیریت سامانه فقط برای مدیر فناوری اطلاعات و جایگاه‌های دارای مجوز است.');
  const tabsOk = ADMIN_TABS.filter(t => !t[3] || can(t[3]));
  const v = vs('adm', { tab: tabsOk[0][0] });
  if (!tabsOk.some(t => t[0] === v.tab)) v.tab = tabsOk[0][0];
  const nav = `<nav class="admnav" aria-label="بخش‌های پنل مدیریت">${tabsOk.map(t => `<button data-a="tab" data-key="adm" data-v="${t[0]}" class="${v.tab === t[0] ? 'on' : ''}">${ic(t[2])}<span>${t[1]}</span>${t[0] === 'users' && lockedUsers().length ? `<i>${fa(lockedUsers().length)}</i>` : ''}</button>`).join('')}</nav>`;
  const body = (ADMIN_VIEWS[v.tab] || ADMIN_VIEWS.overview)();
  return `${head('پنل مدیریت سامانه', 'نام کاربری و رمز حساب‌ها، مشخصات و تحویل متصدیان، دسترسی‌ها، ورودها، ظاهر، سربرگ، پیامک و پشتیبان‌گیری')}
  <div class="admin-wrap">${nav}<div class="admin-body">${body}</div></div>`;
};
PAGES.users = () => { vs('adm').tab = 'users'; return PAGES.admin(); };
const lockedUsers = () => DB.users.filter(u => !u.deleted && u.lockedUntil && new Date(u.lockedUntil) > new Date());
const userStatus = u => (u.deleted ? pill('حذف‌شده', 'bad') : !u.active ? pill('غیرفعال', 'bad') : u.lockedUntil && new Date(u.lockedUntil) > new Date() ? pill('قفل', 'warn') : pill('فعال', 'ok')) + (u.named === false ? ' ' + pill('نام ثبت نشده', 'info') : '');
const av = name => { const n = (name || '؟').replace(/^(حجت‌الاسلام و?(المسلمین)?|سید|دکتر)\s*/g, '').trim(); const hue = parseInt(hash(name || ''), 16) % 360; return `<span class="av" style="--h:${hue}">${esc(n[0] || '؟')}</span>`; };
const isTodayTs = t => isoOfStamp(t) === todayISO();
const lastBackup = () => (DB.settings.backups || []).slice(-1)[0];

const ADMIN_VIEWS = {
  overview() {
    const users = DB.users.filter(u => !u.deleted);
    const lt = DB.logins.filter(l => isTodayTs(l.ts));
    const act = DB.sessions.filter(s => s.active);
    const fails = DB.logins.filter(l => !l.ok).slice(0, 6);
    const lb = lastBackup(); const lc = DB.settings.lastCheck;
    const noAcc = DB.positions.filter(p => !accountOf(p.id));
    return `<div class="tiles">
      ${tile('حساب‌های فعال', users.filter(u => u.active).length, fa(noAcc.length) + ' پنل بدون حساب', noAcc.length ? 'warn' : 'ok')}
      ${tile('ورود موفق امروز', lt.filter(l => l.ok).length)}
      ${tile('ورود ناموفق امروز', lt.filter(l => !l.ok).length, '', lt.some(l => !l.ok) ? 'bad' : '')}
      ${tile('حساب‌های قفل', lockedUsers().length, '', lockedUsers().length ? 'warn' : '')}
      ${tile('نشست‌های فعال', act.length)}
      ${can('admin.backup') ? tile('آخرین پشتیبان', lb ? jdt(lb.ts) : 'تهیه نشده', lb ? (lb.ok ? 'موفق' : 'ناموفق: ' + esc(lb.error || '')) : '', !lb || !lb.ok ? 'bad' : 'ok') + tile('آخرین آزمون بازیابی', lc ? jdt(lc.ts) : 'انجام نشده', lc ? (lc.ok ? 'موفق' : 'ناموفق') : '', lc && lc.ok ? 'ok' : 'warn') : ''}
    </div>
    <div class="grid g2">
      ${card('اقدامات سریع', `<div class="quick">${[['users', 'حساب‌ها و رمزها', 'key'], ['perms', 'سطوح دسترسی', 'shield'], ['site', 'ظاهر و سربرگ نامه', 'palette'], ['org', 'ساختار سازمانی', 'building'], ['backup', 'پشتیبان‌گیری', 'archive']].filter(([t]) => ADMIN_TABS.some(x => x[0] === t && (!x[3] || can(x[3])))).map(([t, l, i]) => `<button class="qa" data-a="admTab" data-v="${t}">${ic(i)}<span>${l}</span></button>`).join('')}${can('admin.settings') ? `<button class="qa" data-a="admMaint">${ic('alert')}<span>${DB.settings.maintenance ? 'خروج از حالت به‌روزرسانی' : 'حالت به‌روزرسانی'}</span></button>` : ''}</div>`)}
      ${card('آخرین ورودهای ناموفق', fails.length ? `<div class="list">${fails.map(l => `<div class="li"><div class="k bad">${ic('alert')}</div><div class="t"><b class="code">${esc(l.username || '—')}</b><small>${esc(l.reason)} · ${jdt(l.ts)}${l.ip ? ' · ' + esc(l.ip) : ''}</small></div></div>`).join('')}</div>` : empty('ورود ناموفقی ثبت نشده است.'), '', { flush: true })}
    </div>`;
  },
  users() {
    const v = vs('admu');
    const rows = DB.positions.filter(p => (!v.u || p.unitId === +v.u) && (!v.r || p.role === v.r)).map(p => ({ id: p.id, p, u: accountOf(p.id) }))
      .filter(x => textMatch(v.q, panelName(x.p), x.u ? x.u.name : '', x.u ? x.u.username || '' : '', x.u ? x.u.phone || '' : '') && (!v.s || (v.s === 'none' ? !x.u : x.u && (v.s === 'locked' ? lockedUsers().includes(x.u) : v.s === 'inactive' ? !x.u.active : v.s === 'unnamed' ? !x.u.named : x.u.active))));
    const ib = (a, i, l, id, cls = '') => `<button class="ibtn sm ${cls}" data-a="${a}" data-id="${id}" title="${l}" aria-label="${l}">${ic(i)}</button>`;
    return `<div class="notice">هر پنل سازمانی یک حساب ثابت دارد. فقط مدیریت فناوری اطلاعات نام کاربری و رمز حساب‌ها را تعیین یا تغییر می‌دهد؛ متصدیان رمز را تغییر نمی‌دهند و فقط نام و مشخصات خود را ثبت می‌کنند. با تغییر رمز، نشست‌های باز آن حساب بسته می‌شود.</div>
    <section class="card"><div class="ch"><h2>پنل‌ها و حساب‌ها <small>${fa(rows.length)} پنل</small></h2></div>
    ${filterBar('admu', [{ k: 'q', t: 'search', l: 'جست‌وجوی پنل، نام، نام کاربری، تلفن…' }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }, { k: 'r', l: 'همه نقش‌ها', o: Object.entries(ROLES) }, { k: 's', l: 'همه وضعیت‌ها', o: [['active', 'فعال'], ['inactive', 'غیرفعال'], ['locked', 'قفل'], ['unnamed', 'نام ثبت‌نشده'], ['none', 'بدون حساب']] }])}
    <div class="cb flush">${table([
      ['پنل', x => `<b>${esc(panelName(x.p))}</b>`],
      ['نام کاربری', x => (x.u ? `<span class="code">${esc(x.u.username || '')}</span>` : pill('بدون حساب', 'warn'))],
      ['متصدی فعلی', x => (x.u ? esc(x.u.name) + `<span class="sub">از ${jd(holderSince(x.p.id) || x.u.start)}</span>` : '—')],
      ['تلفن', x => (x.u ? `<span class="code">${fa(x.u.phone || '—')}</span>` : '')],
      ['آخرین ورود', x => (x.u && x.u.lastLogin ? jdt(x.u.lastLogin) : '<span class="sub">هرگز</span>')],
      ['وضعیت', x => (x.u ? userStatus(x.u) : '')],
      ['عملیات', x => (!x.u ? (can('admin.passwords') ? btn('ایجاد حساب', 'admCreate', { id: x.p.id }, 'sm soft', 'plus') : '') : `<div class="acts">${ib('admUname', 'user', 'تغییر نام کاربری', x.u.id)}${can('admin.passwords') ? ib('admPass', 'key', 'تعیین رمز جدید', x.u.id) : ''}${ib('admEditUser', 'edit', 'ویرایش مشخصات متصدی', x.u.id)}${x.p.id !== ME.pos.id && (x.p.role !== 'imam' || isImam()) ? ib('handover', 'users', 'تحویل مسئولیت به فرد جدید', x.p.id) : ''}${can('admin.perms') && x.p.role !== 'imam' ? ib('admPosPerm', 'shield', 'دسترسی‌های پنل', x.p.id) : ''}${ib('posHist', 'history', 'سوابق متصدیان', x.p.id)}${lockedUsers().includes(x.u) ? ib('admUnlock', 'unlock', 'بازکردن قفل', x.u.id) : ''}${x.u.id !== ME.user.id ? ib('admKick', 'logout', 'خروج اجباری', x.u.id) + ib('admToggle', x.u.active ? 'lock' : 'check', x.u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', x.u.id, x.u.active ? '' : 'ok') : ''}</div>`)]
    ], rows)}</div></section>`;
  },
  perms() {
    const ROLE3 = ['manager', 'office', 'secretary'];
    const cell = (role, P) => {
      const cur = ((DB.settings.rolePerms || {})[role] || {})[P.k] || '';
      const d = ORG.PERM_DEFAULTS[P.k]; const def = !d ? false : Array.isArray(d) ? d.includes(role) : d.r.includes(role);
      return `<select class="pm ${cur}" data-pm="${role}|${P.k}" aria-label="${esc(ROLES[role] + ' — ' + P.l)}"><option value="">پیش‌فرض ${def ? (Array.isArray(d) ? '✓' : '✓ ' + unitShort(d.u)) : '✗'}</option><option value="allow" ${cur === 'allow' ? 'selected' : ''}>مجاز</option><option value="deny" ${cur === 'deny' ? 'selected' : ''}>ممنوع</option></select>`;
    };
    let g = '';
    const rows = PERMS.map(P => { const sep = P.g !== g; g = P.g; return `${sep ? `<tr class="grp"><td colspan="4">${esc(P.g)}</td></tr>` : ''}<tr><td>${P.p ? '<span class="sub">↳</span> ' : ''}${esc(P.l)}${P.s ? ' ' + pill('حساس', 'warn') : ''}</td>${ROLE3.map(r => `<td>${cell(r, P)}</td>`).join('')}</tr>`; }).join('');
    const mgrs = DB.positions.filter(p => p.role === 'manager');
    const ceil = PERMS.filter(P => P.d);
    return `${card('سقف اختیار مدیران', `<div class="notice">هر مدیر فقط در همین سقف می‌تواند به مسئول دفتر و منشی خودش اختیار بدهد. سقف هر مدیر را امام جماعت یا مدیر سامانه تعیین می‌کند (اعطای مجوزهای حساس فقط با امام جماعت). برای تغییر سقف یک مدیر روی نام آن بزنید.</div><div class="tbl-wrap matrix-wrap" tabindex="0"><table class="matrix ceil"><thead><tr><th>مدیریت</th>${ceil.map(P => `<th title="${esc(P.l)}"><span>${esc(P.l)}</span></th>`).join('')}</tr></thead><tbody>${mgrs.map(p => `<tr><td><a href="#" data-a="admPosPerm" data-id="${p.id}">${esc(unitShort(p.unitId))}</a></td>${ceil.map(P => `<td>${permOf(p, P.k) ? '✓' : '<span class="sub">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)}
    ${card('ماتریس پیش‌فرض نقش‌ها', `<div class="notice">«پیش‌فرض» رفتار استاندارد سامانه است. تغییر این ماتریس برای همه مدیریت‌ها اعمال می‌شود؛ برای یک پنل خاص از «دسترسی‌های پنل» در بخش حساب‌ها استفاده کنید. اختیار مسئول دفتر و منشی را مدیر هر بخش در «تعیین دسترسی دفتر» همان مدیریت تنظیم می‌کند.</div><div class="tbl-wrap matrix-wrap" tabindex="0"><table class="matrix"><thead><tr><th>مجوز</th>${ROLE3.map(r => `<th>${ROLES[r]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`)}`;
  },
  logins() {
    const v = vs('adml');
    const rows = DB.logins.filter(l => (!v.s || (v.s === 'ok' ? l.ok : !l.ok)) && textMatch(v.q, l.username, (userById(l.uid) || {}).name || '', l.reason, l.ip || '') && inRange(isoOfStamp(l.ts), v.f, v.t)).slice(0, 300);
    const act = DB.sessions.filter(s => s.active);
    return `${card('نشست‌های فعال', table([['کاربر', s => { const u = userById(s.uid) || {}; return `<div class="who2">${av(u.name)}<div><b>${esc(u.name)}</b><span class="sub">${esc(posLabel(u.posId))}</span></div></div>`; }], ['شروع', s => jdt(s.start)], ['آخرین فعالیت', s => jdt(s.last)], ['مرورگر', s => `<span class="code">${esc(s.agent || '—')}</span>`], ['', s => (s.id === (Remote.session || {}).id ? pill('نشست شما', 'info') : btn('پایان نشست', 'admEndSes', { id: s.id }, 'sm danger'))]], act.map(s => ({ ...s }))), act.length > 1 ? btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'sm danger') : '', { flush: true })}
    <section class="card"><div class="ch"><h2>تاریخچه ورود <small>۶۰۰ مورد آخر</small></h2></div>${filterBar('adml', [{ k: 'q', t: 'search', l: 'نام کاربری، نام یا علت…' }, { k: 's', l: 'همه نتایج', o: [['ok', 'موفق'], ['fail', 'ناموفق']] }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['زمان', l => jdt(l.ts)], ['نام کاربری', l => `<span class="code">${esc(l.username)}</span>`], ['کاربر', l => esc((userById(l.uid) || {}).name || '—')], ['نتیجه', l => pill(l.ok ? 'موفق' : 'ناموفق', l.ok ? 'ok' : 'bad')], ['شرح', l => esc(l.reason)], ['نشانی شبکه', l => `<span class="code">${esc(l.ip || '')}</span>`], ['مرورگر', l => `<span class="code">${esc(l.agent || '')}</span>`]], rows.map((l, i) => ({ ...l, id: i })))}</div></section>`;
  },
  audit() {
    const v = vs('adma');
    const rows = DB.audit.map((a, i) => ({ ...a, _i: i })).filter(a => textMatch(v.q, a.act, a.note, who(a.uid, a.nm)) && (!v.u || a.unit === +v.u) && (!v.e || a.ent === v.e) && inRange(isoOfStamp(a.ts), v.f, v.t)).reverse();
    const ents = [...new Set(DB.audit.map(a => a.ent))];
    const p = paged('adma', rows);
    return `<div class="notice">رویدادها روی سرور با زنجیره اثر انگشت SHA-256 ثبت می‌شوند و از طریق سامانه قابل ویرایش یا حذف نیستند. بررسی سلامت کامل زنجیره با دستور <span class="code">php cli.php verify-audit</span> روی هاست انجام می‌شود.</div>
    <section class="card">${filterBar('adma', [{ k: 'q', t: 'search', l: 'جست‌وجو در اقدام، کاربر یا شرح…' }, { k: 'u', l: 'همه مدیریت‌ها', o: unitOpts(true) }, { k: 'e', l: 'همه موجودیت‌ها', o: ents }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['زمان', a => jdt(a.ts)], ['کاربر', a => esc(who(a.uid, a.nm)) + `<span class="sub">${esc(a.pos ? posLabel(a.pos) : '')}</span>`], ['اقدام', a => esc(a.act)], ['موجودیت', a => `<span class="code">${esc(a.ent)}</span>`], ['شرح', a => esc(a.note)]], p.rows.map(a => ({ ...a, id: a._i })))}${p.more}</div></section>`;
  },
  site() {
    const s = DB.settings; s.announcement = s.announcement || {}; s.theme = s.theme || {}; s.clock = s.clock || {};
    return `${card('هویت و متن‌های سامانه', `<form class="form" id="sitef">
      ${fieldHTML({ k: 'orgName', l: 'نام مجموعه', req: true }, s.orgName)}${fieldHTML({ k: 'subtitle', l: 'زیرعنوان منوی کناری' }, s.subtitle)}
      ${fieldHTML({ k: 'loginTitle', l: 'عنوان صفحه ورود' }, s.loginTitle)}${fieldHTML({ k: 'payThreshold', l: 'سقف پرداخت بدون تصویب امام (ریال)', t: 'money' }, s.payThreshold)}
      ${fieldHTML({ k: 'loginText', l: 'متن معرفی صفحه ورود', t: 'textarea' }, s.loginText)}
    </form><div class="row mt">${btn('ذخیره', 'admSaveSite', {}, '', 'check')}</div>`)}
    ${card('اطلاعیه عمومی داشبورد', `<form class="form" id="annf">${fieldHTML({ k: 'on', l: 'نمایش', t: 'check', cl: 'اطلاعیه برای همه کاربران نمایش داده شود' }, s.announcement.on)}${fieldHTML({ k: 'tone', l: 'نوع', t: 'select', o: [['info', 'اطلاع‌رسانی'], ['warn', 'هشدار'], ['ok', 'خبر خوب']], blank: false }, s.announcement.tone)}${fieldHTML({ k: 'text', l: 'متن اطلاعیه', t: 'textarea' }, s.announcement.text)}</form><div class="row mt">${btn('انتشار اطلاعیه', 'admSaveAnn', {}, '', 'megaphone')}</div>`)}
    ${card('رنگ‌بندی و اندازه', `<div class="swatches">${Object.entries(PALETTES).map(([k, p]) => `<button class="sw ${s.theme.palette === k ? 'on' : ''}" data-a="admPal" data-v="${k}"><i style="background:linear-gradient(135deg, ${p.l[2]} 0 50%, ${p.l[4]} 50% 100%)"></i><span>${p.name}</span></button>`).join('')}</div>
      <div class="row mt"><span class="muted">اندازه متن:</span>${[13, 14, 15, 16].map(n => btn(fa(n), 'admScale', { v: n }, 'sm ' + (s.theme.scale === n ? '' : 'ghost'))).join('')}</div><div class="hint mt">تغییرات فوراً برای همه کاربران اعمال می‌شود.</div>`)}
    ${card('سربرگ نامه‌ها', (() => { const lh = s.letterhead || {}; return `<form class="form" id="lhf">
      ${fieldHTML({ k: 'mode', l: 'نوع سربرگ', t: 'select', o: [['bw', 'سربرگ سیاه‌وسفید سامانه (پیش‌فرض)'], ['image', 'تصویر سربرگ اختصاصی مسجد']], blank: false }, lh.mode || 'bw')}
      ${fieldHTML({ k: 'motto', l: 'شعار یا عبارت زیر نشان (اختیاری)' }, lh.motto)}${fieldHTML({ k: 'address', l: 'نشانی (پانویس نامه)' }, lh.address)}${fieldHTML({ k: 'phone', l: 'تلفن' }, lh.phone)}${fieldHTML({ k: 'site', l: 'وبگاه یا پست الکترونیک' }, lh.site)}${fieldHTML({ k: 'footer', l: 'متن اضافه پانویس' }, lh.footer)}
      ${fieldHTML({ k: 'image', l: 'تصویر سربرگ (PNG یا JPG با عرض کامل A4)', t: 'file', single: true }, '')}${lh.image ? `<div class="fld full"><span class="hint">تصویر فعلی: ${esc(lh.image.name)}</span> <label class="row" style="font-weight:500"><input type="checkbox" name="dropImage"> حذف تصویر فعلی</label></div>` : ''}
    </form><div class="row mt">${btn('ذخیره سربرگ', 'admSaveLh', {}, '', 'check')}${btn('پیش‌نمایش', 'admLhPrev', {}, 'ghost', 'eye')}</div><div class="hint mt">تا زمانی که تصویر سربرگ مسجد بارگذاری نشده، نامه‌ها با سربرگ رسمی سیاه‌وسفید سامانه (بسمه تعالی، نشان، نام مجموعه و مدیریت، شماره، تاریخ و پیوست) چاپ می‌شوند.</div>`; })())}
    ${card('ساعت و اوقات شرعی', `<form class="form" id="clkf">${fieldHTML({ k: 'city', l: 'نام شهر' }, s.clock.city)}${fieldHTML({ k: 'prayer', l: 'اوقات شرعی', t: 'check', cl: 'نمایش اوقات شرعی در داشبورد' }, s.clock.prayer)}${fieldHTML({ k: 'lat', l: 'عرض جغرافیایی', hint: 'آبادان: ۳۰٫۳۳۹۲' }, s.clock.lat)}${fieldHTML({ k: 'lng', l: 'طول جغرافیایی', hint: 'آبادان: ۴۸٫۳۰۴۳' }, s.clock.lng)}</form><div class="row mt">${btn('ذخیره', 'admSaveClock', {}, '', 'clock')}</div><div class="hint mt">محاسبه به روش مؤسسه ژئوفیزیک دانشگاه تهران (فجر ۱۷٫۷°، عشا ۱۴°، مغرب ۴٫۵° زیر افق) و به وقت رسمی ایران. مختصات پیش‌فرض: آبادان (۳۰٫۳۳۹۲ شمالی، ۴۸٫۳۰۴۳ شرقی). برای دقت کامل، مختصات تأییدشده محل مسجد را وارد کنید.</div>`)}`;
  },
  org() {
    const s = DB.settings;
    return `${card('مدیریت‌ها', `<div class="notice">مدیریت غیرفعال از فهرست‌ها پنهان می‌شود ولی سوابقش حفظ می‌شود. مدیریت تازه با سه پنل مدیر، مسئول دفتر و منشی ساخته می‌شود و حساب آن‌ها از «حساب‌ها و رمزها» ایجاد می‌شود.</div>` + table([['#', u => fa(u.id)], ['نام کامل', u => `<b>${esc(u.name)}</b>`], ['نام کوتاه', u => esc(u.short)], ['خدمات', u => fa(SERVICES[u.id].length)], ['وضعیت', u => (u.off ? pill('غیرفعال', 'mute') : pill('فعال', 'ok'))], ['', u => btn('ویرایش', 'admUnit', { id: u.id }, 'sm ghost', 'edit') + ' ' + btn(u.off ? 'فعال‌سازی' : 'غیرفعال‌سازی', 'admUnitToggle', { id: u.id }, 'sm ' + (u.off ? 'soft' : 'ghost'))]], UNITS), btn('افزودن مدیریت', 'admUnit', {}, 'sm', 'plus'), { flush: true })}
    ${card('فضاها و امکانات قابل رزرو', table([['نام', x => esc(x.name)], ['تأییدکننده', x => esc(unitShort(x.unit))], ['ظرفیت', x => fa(x.cap)], ['کنترل تداخل', x => (x.excl ? pill('دارد', 'ok') : pill('ندارد', 'mute'))], ['', x => btn('ویرایش', 'admSpace', { id: x.id }, 'sm ghost', 'edit') + ' ' + btn('حذف', 'admSpaceDel', { id: x.id }, 'sm danger')]], SPACES), btn('افزودن فضا', 'admSpace', {}, 'sm', 'plus'), { flush: true })}
    ${card('فهرست‌های پایه', `<form class="form" id="listf">${fieldHTML({ k: 'letterCats', l: 'طبقه‌بندی نامه‌ها (هر خط یک مورد)', t: 'textarea' }, LETTER_CATS.join('\n'))}${fieldHTML({ k: 'leaveTypes', l: 'انواع مرخصی (هر خط یک مورد)', t: 'textarea' }, LEAVE_TYPES.join('\n'))}</form><div class="row mt">${btn('ذخیره فهرست‌ها', 'admSaveLists', {}, '', 'check')}</div>`)}`;
  },
  security() {
    const s = DB.settings.security || {};
    return `${card('سیاست رمز و ورود', `<form class="form" id="secf">${fieldHTML({ k: 'minLen', l: 'حداقل طول رمز عبور', t: 'number', hint: 'دست‌کم ۴؛ پیشنهاد ۸ یا بیشتر' }, s.minLen)}${fieldHTML({ k: 'maxFails', l: 'تعداد تلاش ناموفق تا قفل‌شدن حساب', t: 'number' }, s.maxFails)}${fieldHTML({ k: 'lockMin', l: 'مدت قفل حساب (دقیقه)', t: 'number' }, s.lockMin)}${fieldHTML({ k: 'sessionMin', l: 'خروج خودکار پس از بی‌فعالیتی (دقیقه)', t: 'number', hint: 'بین ۱۰ تا ۱۴۴۰؛ تایپ و کار در فرم‌ها فعالیت حساب می‌شود و دو دقیقه پیش از خروج هشدار داده می‌شود' }, s.sessionMin)}
      ${fieldHTML({ k: 'maintenance', l: 'حالت به‌روزرسانی', t: 'check', cl: 'فقط مدیر سامانه بتواند وارد شود' }, DB.settings.maintenance)}</form>
      <div class="row mt">${btn('ذخیره تنظیمات امنیتی', 'admSaveSec', {}, '', 'shield')}</div>
      <div class="hint mt">محدودیت تلاش برای هر حساب جداگانه شمرده می‌شود و ورودهای موفق شمرده نمی‌شوند؛ بنابراین کارکنانی که از یک اینترنت مشترک وارد می‌شوند مسدود نمی‌شوند. فقط اگر از یک نشانی شبکه بیش از ۶۰ تلاش ناموفق در ۱۵ دقیقه ثبت شود، آن نشانی موقتاً مسدود می‌شود.</div>`)}
    ${card('اقدامات اضطراری', `<div class="row">${btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'danger', 'logout')}</div><div class="hint mt">رمزها با الگوریتم استاندارد PHP (bcrypt) و نمک جداگانه ذخیره می‌شوند و هیچ‌کس رمز کاربران را نمی‌بیند. اگر رمز مدیر فناوری اطلاعات فراموش شد، روی هاست دستور <span class="code">php cli.php reset-password it.manager رمز‌جدید</span> را اجرا کنید.</div>`)}`;
  },
  sms() {
    const s = DB.settings.sms || { events: {}, roles: [] };
    const ready = s.enabled && ((s.provider === 'kavenegar' && (s.apiKeySet || s.apiKey)) || (s.provider === 'webhook' && s.webhook));
    const st = ready ? pill('فعال و تنظیم‌شده', 'ok') : s.enabled ? pill('روشن ولی تنظیم‌نشده — ارسال نمی‌شود', 'bad') : pill('خاموش', 'mute');
    const cnt = k => DB.sms.filter(x => x.status === k).length;
    return `${card('وضعیت سرویس پیامک', `<div class="row">${st}</div><div class="tiles mt">${['در صف ارسال', 'ارسال‌شده', 'تحویل‌شده', 'تحویل نشد', 'ناموفق'].map(k => tile(k, cnt(k), '', k === 'ناموفق' || k === 'تحویل نشد' ? (cnt(k) ? 'bad' : '') : k === 'تحویل‌شده' ? 'ok' : '')).join('')}</div><div class="row mt">${btn('ارسال پیامک آزمایشی', 'smsTest', {}, 'ghost', 'send')}</div>`)}
    ${card('تنظیمات پیامک', `<form class="form" id="smsf">
      <div class="fld"><label>سرویس پیامک</label><label class="row" style="color:var(--fg);font-weight:500"><input type="checkbox" id="sms_en" ${s.enabled ? 'checked' : ''}> ارسال پیامک روشن باشد</label></div>
      ${fieldHTML({ k: 'provider', l: 'سرویس‌دهنده', t: 'select', o: [['none', 'تنظیم نشده'], ['kavenegar', 'کاوه‌نگار'], ['webhook', 'درگاه اختصاصی (Webhook)']], blank: false }, s.provider)}
      ${fieldHTML({ k: 'sender', l: 'شماره خط فرستنده' }, s.sender)}
      ${fieldHTML({ k: 'apiKey', l: 'کلید API کاوه‌نگار', t: 'password', ph: s.apiKeyHint || '', hint: s.apiKeySet ? 'کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید. کلید هرگز به مرورگر فرستاده نمی‌شود.' : 'کلید فقط روی سرور نگهداری می‌شود.' }, '')}
      ${fieldHTML({ k: 'webhook', l: 'نشانی درگاه اختصاصی', ph: 'https://…', hint: 'برای درگاه اختصاصی: درخواست POST با to و text' }, s.webhook || '')}
      ${fieldHTML({ k: 'events', l: 'رویدادهای قابل اعلان با پیامک', t: 'multi', o: Object.entries(SMS_EVENTS) }, Object.keys(s.events).filter(k => s.events[k]))}
      ${fieldHTML({ k: 'roles', l: 'دریافت‌کنندگان (بر اساس نقش)', t: 'multi', o: Object.entries(ROLES) }, s.roles)}
    </form><div class="row mt">${btn('ذخیره', 'saveSms', {}, '', 'check')}</div><div class="notice mt">متن پیامک فقط شامل نوع رویداد و کد پیگیری است؛ جزئیات محرمانه فقط در کارتابل نمایش داده می‌شود. هر پیامک تا سه بار دوباره ارسال می‌شود. ارسال با «زمان‌بندی کارها»ی هاست یا با بازدید کاربران انجام می‌شود.</div>`)}
    ${card('صف ارسال پیامک', table([['زمان', x => jdt(x.ts)], ['گیرنده', x => esc(x.name) + `<span class="sub code">${fa(x.to)}</span>`], ['متن', x => esc(x.text)], ['وضعیت', x => pill(x.status, ['تحویل‌شده'].includes(x.status) ? 'ok' : ['ناموفق', 'تحویل نشد'].includes(x.status) ? 'bad' : x.status === 'ارسال‌شده' ? 'info' : 'warn') + (x.lastError ? `<span class="sub">${esc(x.lastError)}${x.tries ? ' · ' + fa(x.tries) + ' تلاش' : ''}</span>` : '')]], DB.sms.slice().reverse().slice(0, 100)), '', { flush: true })}`;
  },
  backup() {
    const list = (DB.settings.backups || []).slice().reverse();
    const lc = DB.settings.lastCheck;
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return `${card('پشتیبان‌گیری', `<p>سامانه هر روز به‌طور خودکار نسخه پشتیبان فشرده و کامل (همه داده‌ها و رویدادها) در پوشه <span class="code">data/backups</span> تهیه می‌کند و ۴۵ نسخه آخر را نگه می‌دارد. پیش از هر بازیابی هم از وضعیت فعلی نسخه گرفته می‌شود. فایل‌های پیوست در پوشه <span class="code">data/files</span> هستند؛ این پوشه را هم در پشتیبان هاست نگه دارید.</p>
      <div class="row">${btn('تهیه نسخه پشتیبان اکنون', 'backup', {}, '', 'archive')}${btn('فهرست و دریافت نسخه‌ها', 'bkList', {}, 'ghost')}${btn('آزمون بازیابی آخرین نسخه', 'bkCheck', {}, 'ghost', 'check')}${btn('بازیابی از فایل', 'restore', {}, 'danger')}</div>
      ${lc ? `<div class="notice mt ${lc.ok ? '' : 'warn'}"><b>آخرین آزمون بازیابی (${jdt(lc.ts)}):</b> ${lc.ok ? 'موفق — ' : 'ناموفق — '}${esc(lc.msg || '')}</div>` : '<div class="notice warn mt">هنوز آزمون بازیابی انجام نشده است؛ ماهی یک بار «آزمون بازیابی» را اجرا کنید.</div>'}`)}
    ${card('زمان‌بندی خودکار روی هاست (Cron)', `<p>در کنترل‌پنل هاست (بخش Cron Jobs) یک کار هر ۱۵ دقیقه با دستور زیر تعریف کنید تا اعلان مهلت‌ها، پیامک‌ها و پشتیبان روزانه مستقل از بازدید کاربران اجرا شود:</p><div class="secret code" id="cronurl">wget -q -O /dev/null "${esc(base)}api.php?r=cron&amp;key=${esc(DB.settings.cronKey || '…')}"</div><div class="row mt">${btn('کپی دستور', 'copyCron', {}, 'ghost', 'copy')}</div><div class="hint mt">اگر هاست دسترسی خط فرمان دارد، می‌توانید به‌جای آن از <span class="code">php cli.php cron</span> در پوشه سامانه استفاده کنید. اگر زمان‌بندی تعریف نشود، همین کارها با بازدید کاربران (هر ۵ دقیقه یک بار) انجام می‌شود.</div>`)}
    ${list.length ? card('سوابق پشتیبان‌گیری', table([['زمان', b => jdt(b.ts)], ['نوع', b => pill({ auto: 'خودکار', cron: 'زمان‌بندی', manual: 'دستی', 'pre-restore': 'پیش از بازیابی' }[b.kind] || b.kind, 'mute')], ['کاربر', b => esc(b.by)], ['حجم', b => fa(Math.round((b.size || 0) / 1024)) + ' KB'], ['نتیجه', b => (b.ok ? pill('موفق', 'ok') : pill('ناموفق', 'bad') + `<span class="sub">${esc(b.error || '')}</span>`)], ['', b => (b.ok ? `<a class="btn sm ghost" href="api.php?r=backupdl&name=${encodeURIComponent(b.name)}">${ic('archive')}دریافت</a>` : '')]], list.map((b, i) => ({ ...b, id: i }))), '', { flush: true }) : ''}`;
  }
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
const toastRes = (r, okMsg) => { if (r && r.error) toast(r.error); else { refresh(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); } };
A.admEditUser = d => A.holderEdit(d);
A.admUname = d => { const u = userById(d.id); formModal('تغییر نام کاربری — ' + panelName(posById(u.posId)), [{ k: 'username', l: 'نام کاربری جدید', req: true, hint: '۳ تا ۳۲ نویسه: حروف انگلیسی، عدد، نقطه، خط تیره' }], { username: u.username }, v => run('setUsername', u.id, v.username), { noDraft: true, done: 'نام کاربری تغییر کرد.' }); };
A.admPass = d => {
  const u = userById(d.id);
  formModal('تعیین رمز — ' + panelName(posById(u.posId)), [{ k: 'pass', l: 'رمز جدید', req: true, hint: 'دست‌کم ' + fa((DB.settings.security || {}).minLen || 6) + ' نویسه؛ رمز پیشنهادی را می‌توانید تغییر دهید' }], { pass: genPass() }, async v => {
    const r = await run('setPassword', u.id, v.pass); if (r.error) return r;
    setTimeout(() => modal({ title: 'رمز جدید ثبت شد', body: `<p>رمز جدید حساب <span class="code">${esc(u.username)}</span> (${esc(u.name)}) را حضوری یا از راه امن به متصدی اعلام کنید. این رمز دوباره نمایش داده نمی‌شود.${r.ended ? ' ' + fa(r.ended) + ' نشست باز این حساب بسته شد.' : ''}</p><div class="secret code">${esc(en(v.pass))}</div>`, foot: btn('کپی رمز', 'copyTxt', { t: en(v.pass) }, '', 'copy') }), 50);
    return r;
  }, { submit: 'ثبت رمز', done: 'رمز ثبت شد.', noDraft: true });
};
A.admCreate = d => { const p = posById(d.id); formModal('ایجاد حساب — ' + panelName(p), [{ k: 'username', l: 'نام کاربری', req: true }, { k: 'pass', l: 'رمز عبور', req: true }], { username: posUsername(p), pass: genPass() }, v => run('createAccount', p.id, v.username, v.pass), { noDraft: true, done: 'حساب ساخته شد؛ متصدی در اولین ورود نام خود را ثبت می‌کند.' }); };
const genPass = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; const a = new Uint32Array(10); crypto.getRandomValues(a); return [...a].map(x => c[x % c.length]).join(''); };
A.copyTxt = d => navigator.clipboard.writeText(d.t).then(() => toast('کپی شد.'), () => toast('کپی ممکن نشد؛ متن را انتخاب و کپی کنید.'));
A.admUnlock = async d => toastRes(await run('unlockUser', d.id), 'قفل حساب باز شد.');
A.admToggle = async d => toastRes(await run('toggleUser', d.id), r => (r.active ? 'حساب فعال شد.' : 'حساب غیرفعال شد و نشست‌های آن بسته شد.'));
A.admKick = async d => toastRes(await run('kickUser', d.id), r => (r.n ? `${fa(r.n)} نشست بسته شد.` : 'این کاربر نشست فعالی ندارد.'));
A.admEndSes = async d => toastRes(await run('endSession', d.id), 'نشست بسته شد.');
A.admKickAll = () => confirmBox('خروج همه کاربران', 'همه نشست‌ها به‌جز نشست شما بسته می‌شوند و کاربران باید دوباره وارد شوند.', 'خروج همه', () => run('kickAll'), r => fa(r.n) + ' نشست بسته شد.');
function confirmBox(title, text, okLabel, fn, okMsg) {
  modal({ title, body: `<p>${text}</p><div class="err" id="cferr" role="alert"></div>`, foot: `<button class="btn danger" id="cfok">${esc(okLabel)}</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  $('#cfok').addEventListener('click', async () => { const r = await fn(); if (r && r.error) { $('#cferr').textContent = r.error; return; } closeModal(); refresh(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); });
}
A.admPosPerm = d => {
  const p = posById(d.id); if (!p) return;
  const groups = [...new Set(PERMS.map(x => x.g))];
  const self = p.id === ME.pos.id;
  modal({
    title: 'دسترسی‌های ' + panelName(p), wide: true,
    body: `<div class="notice ${self ? 'warn' : ''}">${self ? 'این جایگاه خود شماست؛ تغییر دسترسی خود مجاز نیست و فقط امام جماعت می‌تواند آن را تغییر دهد.' : `متصدی فعلی: <b>${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</b>. تغییرات فوراً ذخیره می‌شود. مجوزهای نشان‌دار ${pill('حساس', 'warn')} را فقط امام جماعت می‌تواند اعطا کند.`}</div><div class="err" id="permerr" role="alert"></div>${groups.map(g => `<div><h3>${esc(g)}</h3><div class="permgrid">${PERMS.filter(x => x.g === g).map(({ k, l, s: sens, p: par }) => { const o = (p.perms || {})[k] || ''; const eff = permOf(p, k); return `<div class="perm"><div><b>${esc(l)}</b><small>${eff ? pill('دارد', 'ok') : pill('ندارد', 'mute')}${sens ? ' ' + pill('حساس', 'warn') : ''}${par ? ' <span class="sub">وابسته به «' + esc(permLabel(par)) + '»</span>' : ''}</small></div><div class="seg" role="radiogroup" aria-label="${esc(l)}">${[['', 'پیش‌فرض'], ['allow', 'اعطا'], ['deny', 'سلب']].map(([v, t]) => `<button role="radio" aria-checked="${o === v}" class="${o === v ? 'on ' + v : ''}" data-a="admSetPerm" data-p="${p.id}" data-k="${k}" data-v="${v}" ${self ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>`; }).join('')}</div></div>`).join('')}`
  });
};
A.admSetPerm = async d => { const r = await run('setPosPerm', d.p, d.k, d.v); if (r.error) { const e = $('#permerr'); if (e) e.textContent = r.error; else toast(r.error); return; } refresh(); A.admPosPerm({ id: d.p }); toast('دسترسی به‌روز شد.'); };
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.pm) { const [role, k] = t.dataset.pm.split('|'); const r = await run('setRolePerm', role, k, t.value); if (r.error) { toast(r.error); route(); } else { refresh(); toast('ماتریس دسترسی به‌روز شد.'); } }
  if (t.id === 'pickpos' && t.value) A.admPosPerm({ id: t.value });
});
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
A.smsTest = () => formModal('ارسال پیامک آزمایشی', [{ k: 'to', l: 'شماره همراه', t: 'tel', req: true }], { to: ME.user.phone || '' }, async v => { const r = await Remote.post('smstest', { to: v.to }); if (r.error) return r; setTimeout(() => toast('وضعیت: ' + r.status + (r.error ? ' — ' + r.error : '')), 400); return r; }, { submit: 'ارسال', done: 'درخواست ارسال شد.', noDraft: true });
A.admSaveLh = async () => { const f = $('#lhf'); const v = formVals('lhf'); try { const fl = f.elements.image.files[0]; v.image = fl ? [await readFile(fl)] : []; } catch (e) { return toast(e.message); } v.dropImage = !!(f.elements.dropImage && f.elements.dropImage.checked); saveSet('letterhead', v, 'سربرگ ذخیره شد.'); };
A.admLhPrev = () => { const demo = { no: '۱۴۰۵/د/۰۰۰۱', type: 'internal', date: todayISO(), subject: 'نمونه موضوع نامه', sender: unitName(myUnit()), receiver: 'مدیریت محترم …', conf: 'عادی', files: [], unitId: myUnit(), body: '<p>با سلام و احترام،</p><p>این پیش‌نمایش سربرگ نامه‌های سامانه است.</p>', snap: { signerName: ME.user.name, signerPos: posLabel(ME.pos.id), unitName: unitName(myUnit()), issued: todayISO() } }; modal({ title: 'پیش‌نمایش سربرگ', wide: true, body: letterSheet(demo), foot: btn('چاپ آزمایشی', 'print', {}, 'ghost', 'print') }); };
A.copyCron = () => A.copyTxt({ t: $('#cronurl').textContent });
A.backup = async () => { const r = await Remote.post('backup', {}); if (r.error) return toast(r.error); toast('نسخه پشتیبان ساخته شد: ' + r.entry.name); route(); };
A.bkList = async () => { const r = await Remote.req('GET', 'backups'); if (r.error) return toast(r.error); modal({ title: 'نسخه‌های پشتیبان روی هاست', wide: true, body: table([['فایل', b => `<span class="code">${esc(b.name)}</span>`], ['حجم', b => fa(Math.round(b.size / 1024)) + ' KB'], ['', b => `<a class="btn sm ghost" href="api.php?r=backupdl&name=${encodeURIComponent(b.name)}">دریافت</a> ${btn('آزمون', 'bkCheck', { n: b.name }, 'sm ghost')} ${btn('بازیابی', 'bkRestore', { n: b.name }, 'sm danger')}`]], r.list.map((b, i) => ({ ...b, id: i })), { empty: 'هنوز نسخه‌ای ساخته نشده است.' }) }); };
A.bkCheck = async d => { let n = d && d.n; if (!n) { const r = await Remote.req('GET', 'backups'); n = r.list && r.list[0] && r.list[0].name; if (!n) return toast('نسخه پشتیبانی وجود ندارد؛ ابتدا نسخه تهیه کنید.'); } const r = await Remote.post('backupcheck', {}, '&name=' + encodeURIComponent(n)); if (r.error) return toast(r.error); closeModal(); route(); toast(r.ok ? 'آزمون بازیابی موفق بود: ' + r.summary : 'نسخه پشتیبان مشکل دارد: ' + r.errors.join(' | ')); };
A.bkRestore = d => confirmBox('بازیابی نسخه پشتیبان', `همه داده‌های فعلی با محتوای <span class="code">${esc(d.n)}</span> جایگزین می‌شود. پیش از بازیابی، از وضعیت فعلی نسخه پشتیبان گرفته می‌شود و همه کاربران دیگر از سامانه خارج می‌شوند.`, 'بازیابی', () => Remote.post('restore', {}, '&name=' + encodeURIComponent(d.n)), 'بازیابی انجام شد.');
A.restore = () => formModal('بازیابی از فایل پشتیبان', [{ k: 'file', l: 'فایل پشتیبان (.json.gz)', t: 'file', single: true }], {}, async () => {
  const el = $('#f_file'); const f = el && el.files[0]; if (!f) return fail('فایل را انتخاب کنید.');
  const r = await Remote.req('POST', 'restore', f); if (r.state) Remote.apply(r); return r;
}, { done: 'بازیابی انجام شد؛ نسخه قبلی به‌طور خودکار نگهداری شد.', submit: 'بررسی و بازیابی', noDraft: true });
A.admUnit = d => { const u = d.id ? UNITS.find(x => x.id === +d.id) : null; formModal(u ? 'ویرایش مدیریت' : 'افزودن مدیریت', [{ k: 'name', l: 'نام کامل', req: true }, { k: 'short', l: 'نام کوتاه', req: true }, { k: 'services', l: 'خدمات قابل درخواست (هر خط یک خدمت)', t: 'textarea', req: true }], u ? { name: u.name, short: u.short, services: SERVICES[u.id].join('\n') } : { services: 'امور عمومی' }, v => run('saveUnit', u ? u.id : 0, v), { done: u ? 'مدیریت ذخیره شد.' : 'مدیریت جدید با سه جایگاه مدیر، مسئول دفتر و منشی ساخته شد.' }); };
A.admUnitToggle = d => { const u = UNITS.find(x => x.id === +d.id); confirmBox(u.off ? 'فعال‌سازی مدیریت' : 'غیرفعال‌سازی مدیریت', u.off ? `«${esc(u.name)}» دوباره در فهرست‌ها نمایش داده می‌شود.` : `«${esc(u.name)}» از فهرست‌ها و فرم‌ها پنهان می‌شود؛ سوابق و جایگاه‌های آن حفظ می‌شود.`, u.off ? 'فعال شود' : 'غیرفعال شود', () => run('toggleUnit', u.id), 'انجام شد.'); };
A.admSpace = d => { const x = d.id ? SPACES.find(s => s.id === d.id) : { cap: 50, excl: true, unit: 3 }; formModal(d.id ? 'ویرایش فضا' : 'افزودن فضا', [{ k: 'name', l: 'نام', req: true }, { k: 'unit', l: 'مدیریت تأییدکننده', t: 'select', o: unitOpts(), req: true, blank: false }, { k: 'cap', l: 'ظرفیت (نفر)', t: 'number', req: true }, { k: 'excl', l: 'کنترل تداخل', t: 'check', cl: 'رزرو هم‌زمان مجاز نباشد' }], x, v => run('saveSpace', d.id || '', v)); };
A.admSpaceDel = d => confirmBox('حذف فضا', 'این فضا از فهرست رزرو حذف شود؟ سوابق رزروهای گذشته حفظ می‌شود.', 'حذف', () => run('deleteSpace', d.id), 'فضا حذف شد.');
A.admSaveLists = () => saveSet('lists', formVals('listf'));
/* ---------- ویرایش آسان رکوردها از پنجره جزئیات (قواعد در ops.js) ---------- */
const EDIT_FORMS = {
  task: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اولویت', t: 'select', o: PRIORITIES, blank: false }, { k: 'start', l: 'شروع', t: 'date', req: true }, { k: 'due', l: 'مهلت', t: 'date', req: true }, { k: '_note', l: 'علت ویرایش', t: 'textarea' }],
  letter: [{ k: 'subject', l: 'موضوع', req: true, full: true }, { k: 'sender', l: 'فرستنده' }, { k: 'receiver', l: 'گیرنده' }, { k: 'cat', l: 'طبقه‌بندی', t: 'select', o: LETTER_CATS, blank: false }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'conf', l: 'محرمانگی', t: 'select', o: CONF, blank: false }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'due', l: 'مهلت اقدام', t: 'date' }, { k: '_note', l: 'علت ویرایش', t: 'textarea' }],
  order: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }, { k: '_note', l: 'علت ویرایش', t: 'textarea' }],
  meet: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'place', l: 'مکان' }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time' }, { k: 'agenda', l: 'دستور جلسه', t: 'textarea' }],
  asset: [{ k: 'name', l: 'نام', req: true, full: true }, { k: 'cat', l: 'گروه' }, { k: 'serial', l: 'شماره سریال' }, { k: 'location', l: 'محل' }, { k: 'value', l: 'ارزش (ریال)', t: 'money' }, { k: 'specs', l: 'مشخصات فنی', t: 'textarea' }]
};
const EDIT_BACK = { task: id => showTask(id), letter: id => showLetter(id), order: id => showOrder(id), meet: id => showMeeting(id), asset: id => showAsset(id) };
const EDIT_COL = { task: 'tasks', letter: 'letters', order: 'orders', meet: 'meetings', asset: 'assets' };
const EDIT_OK = {
  task: r => (isImam() || (inUnit(r.unitId) && can('tasks.create'))) && r.status !== 'تکمیل‌شده',
  letter: r => (isImam() || (inUnit(r.unitId) && can('letters.create'))) && r.status !== 'مختومه',
  order: r => isImam() && r.status !== 'تکمیل‌شده', meet: r => canEditMeeting(r), asset: r => canManageAsset(r)
};
const editBtn = (k, r) => (EDIT_OK[k] && EDIT_OK[k](r) ? btn('ویرایش', 'editRec', { k, id: r.id }, 'ghost', 'edit') : '');
A.editRec = d => {
  const r = DB[EDIT_COL[d.k]].find(x => x.id === d.id);
  if (d.k === 'letter') return editLetter(r);
  formModal('ویرایش', EDIT_FORMS[d.k], r, v => run('editRecord', d.k, d.id, v), { submit: 'ذخیره تغییرات', noDraft: true, done: 'تغییرات با مقدار قبل و بعد در سابقه ثبت شد.', reopen: () => EDIT_BACK[d.k](d.id) });
};
function editLetter(l) {
  const bg = modal({ title: 'ویرایش نامه ' + fa(l.no), wide: true, body: `<form class="form" id="mform" novalidate>${EDIT_FORMS.letter.map(f => fieldHTML(f, l[f.k])).join('')}<div class="fld full"><label>متن نامه</label>${editorHTML('ebody', l.body || '')}</div></form><div class="err" id="merr" role="alert"></div>`, foot: `<button class="btn" id="esave">ذخیره تغییرات</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  $('#esave', bg).addEventListener('click', async e => {
    const b = e.currentTarget; if (b.disabled) return;
    const { out, errs } = await readForm($('#mform', bg), EDIT_FORMS.letter);
    if (Object.keys(errs).length) { $('#merr').textContent = Object.values(errs)[0]; return; }
    b.disabled = true; const r = await run('editRecord', 'letter', l.id, { ...out, body: editorVal('ebody') }); b.disabled = false;
    if (r.error) { $('#merr').textContent = r.error; return; }
    closeModal(); refresh(); showLetter(l.id); toast('تغییرات ذخیره شد.');
  });
}
