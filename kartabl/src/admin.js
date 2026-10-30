/* =====================================================================
   پنل مدیریت سامانه (مدیر فناوری اطلاعات)، تنظیمات، ساعت زنده و حساب کاربری
   ===================================================================== */
const DEFAULTS = JSON.parse(JSON.stringify({ units: UNITS, services: SERVICES, spaces: SPACES, letterCats: LETTER_CATS, leaveTypes: LEAVE_TYPES }));

/* ---------- مهاجرت داده و اعمال تنظیمات ---------- */
function migrate(D) {
  D.logins = D.logins || []; D.sessions = D.sessions || []; D.signups = D.signups || [];
  const s = D.settings;
  const def = {
    loginTitle: 'کارتابل اداری', subtitle: 'مجتمع مسجدمحور', loginText: 'سامانه یکپارچه مکاتبات، دستورات، ارجاع وظایف، درخواست‌ها، رزروها، اموال، امور مالی و منابع انسانی ۱۷ مدیریت مستقل زیر نظر امام جماعت.',
    announcement: { on: false, text: '', tone: 'info' }, maintenance: false, showDemo: true,
    theme: { palette: 'zomorrod', scale: 14 }, security: { minLen: 6, maxFails: 5, lockMin: 15, sessionMin: 60 },
    clock: { city: 'تهران', lat: 35.6892, lng: 51.389, prayer: true }, rolePerms: {}, units: {}
  };
  for (const k in def) if (s[k] === undefined) s[k] = def[k];
  for (const k in def.security) if (s.security[k] === undefined) s.security[k] = def.security[k];
  return D;
}
function applySettings() {
  const s = DB.settings;
  UNITS.forEach(u => { const d = DEFAULTS.units.find(x => x.id === u.id); Object.assign(u, d, s.units[u.id] || {}); });
  Object.keys(SERVICES).forEach(k => { SERVICES[k] = (s.services && s.services[k]) || DEFAULTS.services[k].slice(); });
  SPACES.splice(0, SPACES.length, ...(s.spaces || DEFAULTS.spaces).map(x => ({ ...x })));
  LETTER_CATS.splice(0, LETTER_CATS.length, ...(s.letterCats || DEFAULTS.letterCats));
  LEAVE_TYPES.splice(0, LEAVE_TYPES.length, ...(s.leaveTypes || DEFAULTS.leaveTypes));
  applyTheme();
}
const PALETTES = {
  zomorrod: { name: 'زمردی', l: ['#0f4b3a', '#0f4b3a', '#0d3a2e', '#12493a', '#2f8f88', '#e1f1ef', '#8fd9c6'], d: ['#6cc9ad', '#3c9e82', '#07110e', '#10241e', '#62c3ba', '#163532', '#6cc9ad'] },
  firouzeh: { name: 'فیروزه‌ای', l: ['#0b5e66', '#0b6670', '#0a3f45', '#0f525a', '#1f9aa3', '#dff2f3', '#8fe0e4'], d: ['#6fd0d6', '#3aa9b1', '#061214', '#0d2628', '#5ccad2', '#12333a', '#6fd0d6'] },
  lajvard: { name: 'لاجوردی', l: ['#1d3f7a', '#1f4688', '#142b55', '#1c3a6e', '#3a78c2', '#e3ecf8', '#a9c6f2'], d: ['#8fb4ee', '#5585cf', '#070d18', '#101d33', '#7aa6e8', '#15243d', '#8fb4ee'] },
  kahroba: { name: 'کهربایی', l: ['#6b4a12', '#7a5414', '#3d2c10', '#523b16', '#b07d2a', '#f6ecd9', '#f0cf8e'], d: ['#e7c27a', '#c49a4a', '#120d05', '#251b0c', '#d9b067', '#33270f', '#e7c27a'] },
  anar: { name: 'اناری', l: ['#7a1f2b', '#86222f', '#4a131b', '#621a24', '#b8434f', '#f8e4e6', '#f2a7af'], d: ['#ef9aa3', '#c55a66', '#14070a', '#2a1014', '#e3808b', '#3a171c', '#ef9aa3'] }
};
function applyTheme() {
  const t = DB.settings.theme; const p = PALETTES[t.palette] || PALETTES.zomorrod;
  const v = a => `--accent:${a[0]};--btn:${a[1]};--side:${a[2]};--side-2:${a[3]};--teal:${a[4]};--teal-soft:${a[5]};--glow:${a[6]};`;
  let el = document.getElementById('theme-vars');
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
  el.textContent = `:root{${v(p.l)}font-size:${t.scale}px}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${v(p.d)}}}
  :root[data-theme="dark"]{${v(p.d)}}`;
}

/* ---------- کاربران، رمزها و عضویت ---------- */
const adminPositions = () => DB.positions.filter(p => p.role !== 'imam' && permOf(p, 'admin.signups')).map(p => p.id);
const adminAlerts = () => (can('admin.signups') ? DB.signups.filter(x => x.status === 'در انتظار بررسی').length : 0) + (can('admin.users') ? lockedUsers().length : 0);
const lockedUsers = () => DB.users.filter(u => !u.deleted && u.lockedUntil && new Date(u.lockedUntil) > new Date());
const USERNAME_RE = /^[a-z0-9._-]{3,24}$/i;
function setPassword(u, pass, mustChange, self) {
  if (!self && !can('admin.passwords')) return fail('تعیین رمز کاربران فقط برای مدیر سامانه مجاز است.');
  pass = en(pass || '');
  if (pass.length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  if (self && hash('shabab:' + pass) === u.pass) return fail('رمز جدید باید با رمز فعلی متفاوت باشد.');
  u.pass = hash('shabab:' + pass); u.mustChange = !!mustChange; u.passChanged = stamp(); u.fails = 0; u.lockedUntil = '';
  audit(self ? 'تغییر رمز توسط کاربر' : 'تعیین رمز توسط مدیر', 'user', u.id, u.username + (mustChange ? ' · تغییر در ورود بعدی الزامی' : ''));
  return u;
}
const genPass = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
function createUser2(v) {
  if (!can('admin.users')) return fail('افزودن کاربر مجاز نیست.');
  if (!v.name) return fail('نام کاربر را بنویسید.');
  if (!USERNAME_RE.test(v.username || '')) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.users.some(u => u.username === v.username && !u.deleted)) return fail('این نام کاربری قبلاً ثبت شده است.');
  if (en(v.pass || '').length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  const u = { id: 'u' + uid(), name: v.name, username: v.username, pass: hash('shabab:' + en(v.pass)), posId: '', active: true, phone: en(v.phone || ''), nid: en(v.nid || ''), hired: v.hired || todayISO(), mustChange: !!v.mustChange, created: stamp() };
  DB.users.push(u);
  audit('ایجاد کاربر', 'user', u.id, u.username);
  if (v.posId) { const r = assignHolder(v.posId, u.id); if (r && r.error) return r; }
  return u;
}
function updateUser(u, v) {
  if (!can('admin.users')) return fail('ویرایش کاربر مجاز نیست.');
  if (!v.name) return fail('نام را بنویسید.');
  if (!USERNAME_RE.test(v.username)) return fail('نام کاربری معتبر نیست.');
  if (DB.users.some(x => x.id !== u.id && x.username === v.username && !x.deleted)) return fail('این نام کاربری متعلق به کاربر دیگری است.');
  const ch = ['name', 'username', 'phone', 'nid'].filter(k => String(u[k] || '') !== String(v[k] || ''));
  Object.assign(u, { name: v.name, username: v.username, phone: en(v.phone || ''), nid: en(v.nid || '') });
  if (v.posId !== (u.posId || '')) {
    if (!v.posId) { const h = DB.posHistory.find(x => x.userId === u.id && !x.to); if (h) h.to = todayISO(); u.posId = ''; audit('برداشتن جایگاه کاربر', 'user', u.id, u.username); }
    else { const r = assignHolder(v.posId, u.id); if (r && r.error) return r; }
  }
  if (ch.length) audit('ویرایش کاربر', 'user', u.id, u.username + ' · ' + ch.join('، '));
  return u;
}
function deleteUser(u) {
  if (!can('admin.users')) return fail('حذف کاربر مجاز نیست.');
  if (u.id === ME.user.id) return fail('حساب خودتان را نمی‌توانید حذف کنید.');
  const h = DB.posHistory.find(x => x.userId === u.id && !x.to); if (h) h.to = todayISO();
  u.deleted = true; u.active = false; u.posId = '';
  DB.sessions.filter(s => s.uid === u.id && s.active).forEach(s => { s.active = false; s.end = stamp(); });
  audit('حذف کاربر', 'user', u.id, u.username + ' (سوابق اقدامات حفظ شد)');
  return u;
}
function setPosPerm(pos, k, val) {
  if (!can('admin.perms')) return fail('تعیین دسترسی مجاز نیست.');
  if (pos.id === ME.pos.id && k.startsWith('admin.') && val === 'deny') return fail('برای جلوگیری از قفل‌شدن سامانه، اختیار مدیریتی جایگاه خودتان را نمی‌توانید بگیرید.');
  pos.perms = pos.perms || {};
  if (!val) delete pos.perms[k]; else pos.perms[k] = val;
  audit(val === 'allow' ? 'اعطای دسترسی' : val === 'deny' ? 'سلب دسترسی' : 'بازگشت دسترسی به پیش‌فرض', 'perm', pos.id, posLabel(pos.id) + ' · ' + permLabel(k));
  notify([pos.id], 'decision', `سطح دسترسی «${permLabel(k)}» برای جایگاه شما ${val === 'allow' ? 'اعطا' : val === 'deny' ? 'سلب' : 'به حالت پیش‌فرض بازگردانده'} شد.`, 'profile');
  return pos;
}
function setRolePerm(role, k, val) {
  if (!can('admin.perms')) return fail('تعیین دسترسی مجاز نیست.');
  const rp = DB.settings.rolePerms; rp[role] = rp[role] || {};
  if (!val) delete rp[role][k]; else rp[role][k] = val;
  audit('تغییر ماتریس دسترسی نقش', 'perm', role, ROLES[role] + ' · ' + permLabel(k) + ' · ' + (val || 'پیش‌فرض'));
  return rp;
}
function createSignup(v) {
  if (!v.name || !v.username || !v.phone || !v.unitId || !v.title || !v.pass) return fail('همه بخش‌های ستاره‌دار را تکمیل کنید.');
  if (!USERNAME_RE.test(v.username)) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.users.some(u => u.username === v.username && !u.deleted) || DB.signups.some(s => s.username === v.username && s.status === 'در انتظار بررسی')) return fail('این نام کاربری قبلاً گرفته شده است.');
  if (!/^0?9\d{9}$/.test(en(v.phone).replace(/\D/g, ''))) return fail('شماره همراه معتبر نیست.');
  if (en(v.pass).length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  DB.seq.signup = (DB.seq.signup || 0) + 1;
  const s = { id: uid(), no: 'S-' + pad(DB.seq.signup, 4), name: v.name, username: v.username, phone: en(v.phone), unitId: +v.unitId, title: v.title, note: v.note || '', passHash: hash('shabab:' + en(v.pass)), status: 'در انتظار بررسی', created: stamp() };
  DB.signups.push(s);
  audit('درخواست عضویت', 'signup', s.id, s.username);
  notify(adminPositions(), 'request', `درخواست عضویت جدید: ${s.name} (${unitShort(s.unitId)})`, 'admin', s.no);
  return s;
}
function decideSignup(sg, ok, v) {
  if (!can('admin.signups')) return fail('بررسی درخواست عضویت مجاز نیست.');
  if (sg.status !== 'در انتظار بررسی') return fail('این درخواست قبلاً بررسی شده است.');
  if (!ok) { if (!v.note) return fail('علت رد را بنویسید.'); sg.status = 'ردشده'; sg.reason = v.note; audit('رد درخواست عضویت', 'signup', sg.id, sg.username); return sg; }
  let posId = v.posId;
  if (!posId) return fail('جایگاه سازمانی را انتخاب کنید.');
  if (posId === 'new') { const p = addPosition({ unitId: sg.unitId, title: sg.title }); if (p.error) return p; posId = p.id; }
  if (DB.users.some(u => u.username === sg.username && !u.deleted)) return fail('این نام کاربری در این فاصله توسط کاربر دیگری گرفته شده است.');
  const u = { id: 'u' + uid(), name: sg.name, username: sg.username, pass: sg.passHash, posId: '', active: true, phone: sg.phone, hired: todayISO(), created: stamp() };
  DB.users.push(u);
  const r = assignHolder(posId, u.id); if (r && r.error) return r;
  sg.status = 'تأییدشده'; sg.userId = u.id;
  audit('تأیید درخواست عضویت', 'signup', sg.id, sg.username + ' ← ' + posLabel(posId));
  return sg;
}

/* ---------- تأیید و رد مدیریتی همه موارد معلق ---------- */
function overrideAs(posId, fn) {
  const real = ME;
  ME = { user: real.user, pos: posById(posId), override: true, realPos: real.pos.id };
  try { return fn(); } finally { ME = real; }
}
function pendingAll() {
  const out = [];
  const age = t => daysBetween(isoOfStamp(t), todayISO());
  DB.requests.filter(r => r.status === 'جاری' && r.stage === 3).forEach(r => out.push({ k: 'req', id: r.id, no: r.no, type: 'درخواست', title: r.title, unit: r.toUnit, wait: r.needsImam ? 'P0' : unitPos(r.toUnit, 'manager').id, age: age(r.created),
    ok: n => reqAct(r, 'approve', n), no_: n => reqAct(r, 'reject', n) }));
  DB.orders.filter(o => o.status === 'منتظر تأیید').forEach(o => out.push({ k: 'order', id: o.id, no: o.no, type: 'دستور', title: o.title, unit: o.units[0], wait: 'P0', age: age(o.created), ok: n => orderDecide(o, true, n), no_: n => orderDecide(o, false, n) }));
  DB.payreqs.filter(p => p.status === 'جاری').forEach(p => { const s = nextPayStage(p); out.push({ k: 'pay', id: p.id, no: p.no, type: 'پرداخت · ' + PAY_ST[s], title: p.title + ' — ' + money(p.amount), unit: p.unitId, wait: s === 1 ? unitPos(p.unitId, 'manager').id : s === 2 ? unitPos(U_FIN, 'office').id : s === 3 ? 'P0' : unitPos(U_FIN, 'manager').id, age: age(p.created), needDoc: s === 4, ok: (n, doc) => payAct(p, true, n, doc), no_: n => payAct(p, false, n) }); });
  DB.reservations.filter(r => r.status === 'در انتظار تأیید').forEach(r => out.push({ k: 'res', id: r.id, no: r.no, type: 'رزرو', title: spaceOf(r.space).name + ' — ' + r.kind + ' (' + jd(r.date) + ')', unit: spaceOf(r.space).unit, wait: unitPos(spaceOf(r.space).unit, 'manager').id, age: age(r.created), ok: n => resDecide(r, 'تأییدشده', n), no_: n => resDecide(r, 'ردشده', n) }));
  DB.leaves.filter(l => l.status.startsWith('در انتظار')).forEach(l => out.push({ k: 'leave', id: l.id, no: l.no, type: 'مرخصی', title: (userById(l.uid) || {}).name + ' — ' + l.type, unit: l.unitId, wait: l.status === 'در انتظار تأیید مدیر' ? (posById(l.pos).role === 'manager' ? 'P0' : unitPos(l.unitId, 'manager').id) : unitPos(U_ADMIN, 'manager').id, age: age(l.created), ok: n => leaveAct(l, true, n), no_: n => leaveAct(l, false, n) }));
  DB.movements.filter(m => m.status === 'در انتظار تأیید').forEach(m => { const a = DB.assets.find(x => x.id === m.assetId); out.push({ k: 'asset', id: a.id, no: m.no, type: 'گردش کالا · ' + m.type, title: a.name + ' (' + a.code + ')', unit: a.unitId, wait: unitPos(a.unitId, 'manager').id, age: age(m.created), ok: n => decideMovement(m, true, n), no_: n => decideMovement(m, false, n) }); });
  DB.tasks.filter(t => t.status === 'منتظر تأیید').forEach(t => out.push({ k: 'task', id: t.id, no: t.no, type: 'وظیفه', title: t.title, unit: t.unitId, wait: t.assignee === unitPos(t.unitId, 'manager').id ? t.assignee : unitPos(t.unitId, 'manager').id, age: age(t.created), ok: n => taskAct(t, 'approve', n), no_: n => taskAct(t, 'return', n) }));
  return out.sort((a, b) => b.age - a.age);
}

/* ---------- اوقات شرعی (روش ژئوفیزیک دانشگاه تهران) ---------- */
function prayerTimes(iso, lat, lng, tz = 3.5) {
  const rad = d => (d * Math.PI) / 180, deg = r => (r * 180) / Math.PI;
  const fix = (a, b) => a - b * Math.floor(a / b);
  let [y, m, d] = iso.split('-').map(Number);
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  const jdate = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 - lng / (15 * 24);
  const sun = t => {
    const D = jdate + t - 2451545, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360), e = 23.439 - 0.00000036 * D;
    const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
    return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - fix(RA, 24) };
  };
  const mid = t => fix(12 - sun(t).eqt, 24);
  const angT = (ang, t, ccw) => { const dc = sun(t).decl, n = mid(t); const T = deg(Math.acos((-Math.sin(rad(ang)) - Math.sin(rad(dc)) * Math.sin(rad(lat))) / (Math.cos(rad(dc)) * Math.cos(rad(lat))))) / 15; return n + (ccw ? -T : T); };
  const adj = h => h + tz - lng / 15;
  const t = { fajr: adj(angT(17.7, 5 / 24, true)), sunrise: adj(angT(0.833, 6 / 24, true)), dhuhr: adj(mid(0.5)), sunset: adj(angT(0.833, 0.75)), maghrib: adj(angT(4.5, 0.75)), isha: adj(angT(14, 0.75)) };
  t.midnight = t.sunset + (t.fajr + 24 - t.sunset) / 2;
  return t;
}
const PRAYER_NAMES = [['fajr', 'اذان صبح'], ['sunrise', 'طلوع آفتاب'], ['dhuhr', 'اذان ظهر'], ['sunset', 'غروب آفتاب'], ['maghrib', 'اذان مغرب'], ['midnight', 'نیمه‌شب شرعی']];
const hToHM = h => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return pad(H) + ':' + pad(M); };
const hmToMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
function todayPrayers() {
  const c = DB.settings.clock;
  const t = prayerTimes(todayISO(), +c.lat, +c.lng);
  return PRAYER_NAMES.map(([k, l]) => ({ k, l, t: hToHM(t[k]) }));
}
const hijri = () => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; } };
const greg = () => new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

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
    ${pr.length ? `<div class="hero-pray"><div class="ph">اوقات شرعی ${esc(DB.settings.clock.city)}</div>${pr.map(p => `<div class="pt" data-pt="${p.t}"><span>${p.l}</span><b>${fa(p.t)}</b></div>`).join('')}<div class="next" id="hnext"></div></div>` : ''}
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
  return `${head('پنل مدیریت سامانه', 'کنترل کامل کاربران، رمزها، ورودها، دسترسی‌ها، تأییدها، ظاهر و داده‌های سامانه', `${btn('کاربر جدید', 'admNewUser', {}, '', 'plus')}`)}
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
    return `${card('ماتریس دسترسی نقش‌ها', `<div class="notice">هر تغییر فوراً اعمال و در رویدادهای سیستمی ثبت می‌شود. «پیش‌فرض» یعنی رفتار استاندارد سامانه (مثلاً «امور مالی» به‌طور پیش‌فرض فقط برای مدیریت امور مالی باز است). برای یک جایگاه خاص از «استثنای جایگاه» استفاده کنید.</div><div class="tbl-wrap"><table class="matrix"><thead><tr><th>مجوز</th>${Object.values(ROLES).map(r => `<th>${r}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`, '', { flush: false })}
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
    ${card('ساعت و اوقات شرعی', `<form class="form" id="clkf">${fieldHTML({ k: 'city', l: 'نام شهر' }, s.clock.city)}${fieldHTML({ k: 'prayer', l: 'اوقات شرعی', t: 'check', cl: 'نمایش اوقات شرعی در داشبورد' }, s.clock.prayer)}${fieldHTML({ k: 'lat', l: 'عرض جغرافیایی', hint: 'تهران: ۳۵٫۶۸۹۲' }, s.clock.lat)}${fieldHTML({ k: 'lng', l: 'طول جغرافیایی', hint: 'تهران: ۵۱٫۳۸۹۰' }, s.clock.lng)}</form><div class="row mt">${btn('ذخیره', 'admSaveClock', {}, '', 'clock')}</div><div class="hint mt">محاسبه به روش مؤسسه ژئوفیزیک دانشگاه تهران (فجر ۱۷٫۷°، مغرب ۴٫۵°).</div>`)}`;
  },
  org() {
    const s = DB.settings;
    return `${card('نام مدیریت‌ها', table([['#', u => fa(u.id)], ['نام کامل', u => esc(u.name)], ['نام کوتاه', u => esc(u.short)], ['خدمات', u => fa(SERVICES[u.id].length)], ['', u => btn('ویرایش', 'admUnit', { id: u.id }, 'sm ghost', 'edit')]], UNITS), '', { flush: true })}
    ${card('فضاها و امکانات قابل رزرو', table([['نام', x => esc(x.name)], ['تأییدکننده', x => esc(unitShort(x.unit))], ['ظرفیت', x => fa(x.cap)], ['کنترل تداخل', x => (x.excl ? pill('دارد', 'ok') : pill('ندارد', 'mute'))], ['', x => btn('ویرایش', 'admSpace', { id: x.id }, 'sm ghost', 'edit') + ' ' + btn('حذف', 'admSpaceDel', { id: x.id }, 'sm danger')]], SPACES), btn('افزودن فضا', 'admSpace', {}, 'sm', 'plus'), { flush: true })}
    ${card('فهرست‌های پایه', `<form class="form" id="listf">${fieldHTML({ k: 'letterCats', l: 'طبقه‌بندی نامه‌ها (هر خط یک مورد)', t: 'textarea' }, LETTER_CATS.join('\n'))}${fieldHTML({ k: 'leaveTypes', l: 'انواع مرخصی (هر خط یک مورد)', t: 'textarea' }, LEAVE_TYPES.join('\n'))}</form><div class="row mt">${btn('ذخیره فهرست‌ها', 'admSaveLists', {}, '', 'check')}${btn('بازگردانی همه ساختار به پیش‌فرض', 'admOrgReset', {}, 'ghost')}</div>`)}`;
  },
  security() {
    const s = DB.settings.security;
    return `${card('سیاست رمز و ورود', `<form class="form" id="secf">${fieldHTML({ k: 'minLen', l: 'حداقل طول رمز عبور', t: 'number' }, s.minLen)}${fieldHTML({ k: 'maxFails', l: 'تعداد تلاش ناموفق تا قفل‌شدن حساب', t: 'number' }, s.maxFails)}${fieldHTML({ k: 'lockMin', l: 'مدت قفل حساب (دقیقه)', t: 'number' }, s.lockMin)}${fieldHTML({ k: 'sessionMin', l: 'خروج خودکار پس از بی‌فعالیتی (دقیقه، صفر = خاموش)', t: 'number' }, s.sessionMin)}
      ${fieldHTML({ k: 'showDemo', l: 'حساب‌های نمونه', t: 'check', cl: 'نمایش فهرست حساب‌های نمونه در صفحه ورود' }, DB.settings.showDemo)}${fieldHTML({ k: 'maintenance', l: 'حالت به‌روزرسانی', t: 'check', cl: 'فقط مدیران سامانه بتوانند وارد شوند' }, DB.settings.maintenance)}</form>
      <div class="row mt">${btn('ذخیره تنظیمات امنیتی', 'admSaveSec', {}, '', 'shield')}</div>`)}
    ${card('اقدامات اضطراری', `<div class="row">${btn('خروج همه کاربران به‌جز من', 'admKickAll', {}, 'danger', 'logout')}${btn('الزام تغییر رمز برای همه', 'admForceAll', {}, 'ghost', 'key')}${btn('بازکردن قفل همه حساب‌ها', 'admUnlockAll', {}, 'ghost', 'unlock')}</div><div class="hint mt">رمزها به‌صورت هش‌شده ذخیره می‌شوند و هیچ‌کس، حتی مدیر سامانه، رمز کاربران را نمی‌بیند؛ مدیر می‌تواند رمز جدید تعیین کند.</div>`)}`;
  },
  sms() {
    const s = DB.settings.sms;
    return `${card('تنظیمات پیامک', `<form class="form" id="smsf">
      <div class="fld"><label>سرویس پیامک</label><label class="row" style="color:var(--fg);font-weight:500"><input type="checkbox" id="sms_en" ${s.enabled ? 'checked' : ''}> ارسال پیامک فعال باشد</label></div>
      ${fieldHTML({ k: 'provider', l: 'سرویس‌دهنده' }, s.provider)}${fieldHTML({ k: 'sender', l: 'شماره فرستنده' }, s.sender)}
      ${fieldHTML({ k: 'events', l: 'رویدادهای قابل اعلان با پیامک', t: 'multi', o: Object.entries(SMS_EVENTS) }, Object.keys(s.events).filter(k => s.events[k]))}
      ${fieldHTML({ k: 'roles', l: 'دریافت‌کنندگان (بر اساس نقش)', t: 'multi', o: Object.entries(ROLES) }, s.roles)}
    </form><div class="row mt">${btn('ذخیره', 'saveSms', {}, '', 'check')}</div><div class="notice mt">متن پیامک فقط شامل نوع رویداد و کد پیگیری است؛ جزئیات محرمانه فقط در کارتابل نمایش داده می‌شود.</div>`)}
    ${card('صف ارسال پیامک', table([['زمان', x => jdt(x.ts)], ['گیرنده', x => esc(x.name) + `<span class="sub code">${fa(x.to)}</span>`], ['متن', x => esc(x.text)], ['وضعیت', x => pill(x.status, 'mute')]], DB.sms.slice().reverse().slice(0, 80)), '', { flush: true })}`;
  },
  data() {
    const v = vs('admd', { c: 'users' });
    const C = DATA_COLS[v.c];
    const list = (DB[v.c] || []).map((r, i) => ({ ...r, id: r.id || String(i), _i: i })).filter(r => textMatch(v.q, JSON.stringify(r)));
    return `<div class="notice warn">${ic('alert')} ویرایش مستقیم، قواعد گردش کار را دور می‌زند؛ فقط برای اصلاح خطا استفاده کنید. هر تغییر با مقدار قبلی در رویدادهای سیستمی ثبت می‌شود. رویدادهای سیستمی قابل ویرایش نیستند.</div>
    <section class="card"><div class="filters"><select data-f="admd:c" id="flt-admd-c" aria-label="مجموعه داده">${Object.entries(DATA_COLS).map(([k, c]) => `<option value="${k}" ${k === v.c ? 'selected' : ''}>${c.t} (${fa((DB[k] || []).length)})</option>`).join('')}</select><input type="search" data-f="admd:q" id="flt-admd-q" placeholder="جست‌وجو در همه فیلدها…" value="${esc(v.q || '')}"></div>
    <div class="cb flush">${table(C.f.map(([k, l]) => [l, r => { const x = r[k]; return esc(Array.isArray(x) ? fa(x.length) + ' مورد' : x && typeof x === 'object' ? '{…}' : /^\d{4}-\d\d-\d\d$/.test(x || '') ? jd(x) : String(x ?? '—').slice(0, 60)); }]), list.slice().reverse().slice(0, 200).map(r => ({ ...r, id: v.c + '|' + r._i })), { click: 'admRec' })}</div></section>`;
  },
  backup() {
    return `${card('نسخه پشتیبان', `<p>نسخه پشتیبان کامل پایگاه داده، شامل تاریخچه اقدامات، به‌صورت JSON تهیه می‌شود. آن را کپی و در محل امن نگهداری کنید.</p><div class="row">${btn('تهیه نسخه پشتیبان', 'backup', {}, '', 'archive')}${btn('بازیابی از نسخه پشتیبان', 'restore', {}, 'ghost')}${btn('بازنشانی به داده‌های نمونه', 'resetDemo', {}, 'danger')}</div>
    ${DB.settings.backups.length ? `<h3 class="mt">سوابق پشتیبان‌گیری</h3>${table([['زمان', b => jdt(b.ts)], ['کاربر', b => esc(b.by)], ['حجم', b => fa(Math.round(b.size / 1024)) + ' KB'], ['رکوردها', b => fa(b.n)]], DB.settings.backups.slice().reverse().map((b, i) => ({ ...b, id: i })))}` : ''}`)}`;
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
const userForm = (u = {}) => [
  { k: 'name', l: 'نام و نام خانوادگی', req: true }, { k: 'username', l: 'نام کاربری', req: true, hint: 'انگلیسی، ۳ تا ۲۴ نویسه' },
  { k: 'phone', l: 'تلفن همراه', t: 'tel' }, { k: 'nid', l: 'کد ملی' },
  { k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: allPosOpts(), blank: 'بدون جایگاه' }
];
A.admNewUser = () => formModal('افزودن کاربر', [...userForm(), { k: 'pass', l: 'رمز اولیه', req: true, hint: 'دست‌کم ' + fa(DB.settings.security.minLen) + ' نویسه' }, { k: 'mustChange', l: 'امنیت', t: 'check', cl: 'کاربر در اولین ورود رمز را تغییر دهد' }], { pass: genPass(), mustChange: true }, v => createUser2(v), { done: 'کاربر ساخته شد.', submit: 'ایجاد کاربر' });
A.admEditUser = d => { const u = userById(d.id); formModal('ویرایش کاربر — ' + u.name, userForm(), u, v => updateUser(u, v), { done: 'اطلاعات کاربر ذخیره شد.' }); };
A.admPass = d => {
  const u = userById(d.id); const p = genPass();
  formModal('تعیین رمز — ' + u.name, [{ k: 'pass', l: 'رمز جدید', req: true, hint: 'یک رمز تصادفی پیشنهاد شده؛ می‌توانید آن را تغییر دهید' }, { k: 'mustChange', l: 'امنیت', t: 'check', cl: 'کاربر در ورود بعدی رمز را تغییر دهد' }], { pass: p, mustChange: true }, v => {
    const r = setPassword(u, v.pass, v.mustChange); if (r.error) return r;
    setTimeout(() => modal({ title: 'رمز جدید', body: `<p>رمز جدید <b>${esc(u.name)}</b> را به او اعلام کنید. این رمز دوباره نمایش داده نمی‌شود.</p><div class="secret code">${esc(en(v.pass))}</div>`, foot: btn('کپی رمز', 'copyTxt', { t: en(v.pass) }, '', 'file') }), 50);
    return r;
  }, { submit: 'تعیین رمز', done: 'رمز تعیین شد.' });
};
A.copyTxt = d => navigator.clipboard.writeText(d.t).then(() => toast('کپی شد.'), () => toast('کپی ممکن نشد؛ متن را انتخاب و کپی کنید.'));
A.admUnlock = d => { const u = userById(d.id); u.lockedUntil = ''; u.fails = 0; audit('بازکردن قفل حساب', 'user', u.id, u.username); refresh(); toast('قفل حساب باز شد.'); };
A.admUnlockAll = () => { lockedUsers().forEach(u => { u.lockedUntil = ''; u.fails = 0; }); audit('بازکردن قفل همه حساب‌ها', 'user', '', ''); refresh(); toast('قفل همه حساب‌ها باز شد.'); };
A.admToggle = d => { const u = userById(d.id); u.active = !u.active; if (!u.active) DB.sessions.filter(s => s.uid === u.id && s.active).forEach(s => { s.active = false; s.end = stamp(); }); audit(u.active ? 'فعال‌سازی حساب' : 'غیرفعال‌سازی حساب', 'user', u.id, u.username); refresh(); toast(u.active ? 'حساب فعال شد.' : 'حساب غیرفعال شد و نشست‌های آن بسته شد.'); };
A.admKick = d => { const u = userById(d.id); const n = DB.sessions.filter(s => s.uid === u.id && s.active); n.forEach(s => { s.active = false; s.end = stamp(); }); audit('خروج اجباری کاربر', 'session', u.id, u.username + ' · ' + fa(n.length) + ' نشست'); refresh(); toast(n.length ? `${fa(n.length)} نشست بسته شد.` : 'این کاربر نشست فعالی ندارد.'); };
A.admEndSes = d => { const s = DB.sessions.find(x => x.id === d.id); s.active = false; s.end = stamp(); audit('پایان نشست', 'session', s.uid, (userById(s.uid) || {}).username || ''); refresh(); toast('نشست بسته شد.'); };
A.admKickAll = () => confirmBox('خروج همه کاربران', 'همه نشست‌ها به‌جز نشست شما بسته می‌شوند و کاربران باید دوباره وارد شوند.', 'خروج همه', () => { const me = (mySession() || {}).id; let n = 0; DB.sessions.forEach(s => { if (s.active && s.id !== me) { s.active = false; s.end = stamp(); n++; } }); audit('خروج همه کاربران', 'session', '', fa(n) + ' نشست'); toast(fa(n) + ' نشست بسته شد.'); });
A.admForceAll = () => confirmBox('الزام تغییر رمز', 'همه کاربران (به‌جز شما) در ورود بعدی باید رمز جدید تعیین کنند.', 'اعمال', () => { DB.users.forEach(u => { if (u.id !== ME.user.id && !u.deleted) u.mustChange = true; }); audit('الزام تغییر رمز برای همه', 'user', '', ''); toast('اعمال شد.'); });
A.admDel = d => { const u = userById(d.id); confirmBox('حذف کاربر', `حساب <b>${esc(u.name)}</b> حذف می‌شود و دیگر امکان ورود ندارد. سوابق اقدامات او در سامانه باقی می‌ماند.`, 'حذف کاربر', () => { const r = deleteUser(u); if (r.error) toast(r.error); else toast('کاربر حذف شد.'); }); };
A.admDelPos = d => { const p = posById(d.id); if (holderOf(p.id)) return toast('ابتدا متصدی این جایگاه را تغییر دهید یا بردارید.'); confirmBox('حذف جایگاه', `جایگاه «${esc(posLabel(p.id))}» حذف شود؟`, 'حذف', () => { DB.positions = DB.positions.filter(x => x.id !== p.id); audit('حذف جایگاه', 'position', p.id, posLabel(p.id)); toast('جایگاه حذف شد.'); }); };
function confirmBox(title, text, okLabel, fn) {
  modal({ title, body: `<p>${text}</p>`, foot: `<button class="btn danger" id="cfok">${okLabel}</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  $('#cfok').addEventListener('click', () => { fn(); closeModal(); refresh(); });
}
A.admPosPerm = d => {
  const p = posById(d.id);
  const groups = [...new Set(PERMS.map(x => x[2]))];
  modal({
    title: 'دسترسی‌های جایگاه — ' + posLabel(p.id), wide: true,
    body: `<div class="notice">متصدی فعلی: <b>${esc((holderOf(p.id) || {}).name || 'بدون متصدی')}</b>. تغییرات فوراً ذخیره می‌شود.</div>${groups.map(g => `<div><h3>${g}</h3><div class="permgrid">${PERMS.filter(x => x[2] === g).map(([k, l]) => { const o = (p.perms || {})[k] || ''; const eff = permOf(p, k); return `<div class="perm"><div><b>${esc(l)}</b><small>${eff ? pill('دارد', 'ok') : pill('ندارد', 'mute')}</small></div><div class="seg" role="radiogroup" aria-label="${esc(l)}">${[['', 'پیش‌فرض'], ['allow', 'اعطا'], ['deny', 'سلب']].map(([v, t]) => `<button class="${o === v ? 'on ' + v : ''}" data-a="admSetPerm" data-p="${p.id}" data-k="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`; }).join('')}</div></div>`).join('')}`
  });
};
A.admSetPerm = d => { const p = posById(d.p); const r = setPosPerm(p, d.k, d.v); if (r.error) return toast(r.error); Store.save(); A.admPosPerm({ id: p.id }); route(); toast('دسترسی به‌روز شد.'); };
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.pm) { const [role, k] = t.dataset.pm.split('|'); const r = setRolePerm(role, k, t.value); if (r.error) toast(r.error); else { refresh(); toast('ماتریس دسترسی به‌روز شد.'); } }
  if (t.id === 'pickpos' && t.value) A.admPosPerm({ id: t.value });
});
A.admSignOk = d => { const s = DB.signups.find(x => x.id === d.id); const free = DB.positions.filter(p => p.unitId === s.unitId && !holderOf(p.id)).map(p => [p.id, posLabel(p.id) + ' (خالی)']);
  formModal('تأیید عضویت — ' + s.name, [{ k: 'posId', l: 'جایگاه سازمانی', t: 'select', o: [['new', `ایجاد جایگاه جدید «${s.title}» در ${unitShort(s.unitId)}`], ...free, ...posOpts(s.unitId).filter(x => holderOf(x[0]))], req: true }], { posId: 'new' }, v => decideSignup(s, true, v), { submit: 'تأیید و ایجاد حساب', done: 'حساب کاربری ایجاد شد.' }); };
A.admSignNo = d => { const s = DB.signups.find(x => x.id === d.id); actModal('رد درخواست عضویت', v => decideSignup(s, false, v), { noteReq: true, noteLabel: 'علت رد' }); };
const findPending = no => pendingAll().find(x => x.no === no);
A.admOk = d => { const x = findPending(d.i); if (!x) return; actModal('تأیید مدیریتی — ' + x.type, v => overrideAs(x.wait, () => x.ok(v.note, v.doc)), { fields: x.needDoc ? [{ k: 'doc', l: 'شماره سند پرداخت', req: true }] : [], submit: 'تأیید', done: 'تأیید مدیریتی ثبت شد.' }); };
A.admNo = d => { const x = findPending(d.i); if (!x) return; actModal('رد مدیریتی — ' + x.type, v => overrideAs(x.wait, () => x.no_(v.note)), { noteReq: true, noteLabel: 'علت رد', submit: 'رد', done: 'رد مدیریتی ثبت شد.' }); };
A.admMaint = () => { DB.settings.maintenance = !DB.settings.maintenance; audit(DB.settings.maintenance ? 'فعال‌سازی حالت به‌روزرسانی' : 'غیرفعال‌سازی حالت به‌روزرسانی', 'settings', 'security', ''); refresh(); toast(DB.settings.maintenance ? 'حالت به‌روزرسانی فعال شد.' : 'سامانه برای همه باز شد.'); };
const formVals = id => { const f = $('#' + id); const o = {}; [...f.elements].forEach(el => { if (!el.name) return; o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); return o; };
A.admSaveSite = () => { const v = formVals('sitef'); const s = DB.settings; if (!v.orgName) return toast('نام مجموعه را بنویسید.'); Object.assign(s, { orgName: v.orgName, subtitle: v.subtitle, loginTitle: v.loginTitle, loginText: v.loginText }); const n = +en(v.payThreshold).replace(/\D/g, ''); if (n > 0) s.payThreshold = n; audit('تغییر هویت و متن‌های سامانه', 'settings', 'site', ''); renderShell(); toast('ذخیره شد.'); };
A.admSaveAnn = () => { const v = formVals('annf'); DB.settings.announcement = { on: v.on, tone: v.tone, text: v.text }; audit('انتشار اطلاعیه عمومی', 'settings', 'announcement', v.text.slice(0, 60)); if (v.on && v.text) notify(DB.positions.map(p => p.id), 'decision', 'اطلاعیه: ' + v.text.slice(0, 80), 'dashboard'); refresh(); toast(v.on ? 'اطلاعیه منتشر شد.' : 'اطلاعیه پنهان شد.'); };
A.admPal = d => { DB.settings.theme.palette = d.v; audit('تغییر رنگ‌بندی', 'settings', 'theme', PALETTES[d.v].name); applyTheme(); refresh(); };
A.admScale = d => { DB.settings.theme.scale = +d.v; audit('تغییر اندازه متن', 'settings', 'theme', d.v); applyTheme(); refresh(); };
A.admSaveClock = () => { const v = formVals('clkf'); const lat = +en(v.lat), lng = +en(v.lng); if (!(lat > -90 && lat < 90 && lng > -180 && lng < 180)) return toast('مختصات جغرافیایی معتبر نیست.'); DB.settings.clock = { city: v.city || 'تهران', lat, lng, prayer: v.prayer }; audit('تغییر تنظیمات ساعت و اوقات شرعی', 'settings', 'clock', v.city); refresh(); toast('ذخیره شد.'); };
A.admSaveSec = () => { const v = formVals('secf'); const s = DB.settings.security; const num = (x, min, max) => { const n = +en(x); return n >= min && n <= max ? n : null; };
  const m = num(v.minLen, 4, 32), f = num(v.maxFails, 2, 20), l = num(v.lockMin, 1, 1440), t = num(v.sessionMin, 0, 1440);
  if ([m, f, l, t].includes(null)) return toast('مقادیر معتبر نیست (طول رمز ۴ تا ۳۲، تلاش ۲ تا ۲۰).');
  Object.assign(s, { minLen: m, maxFails: f, lockMin: l, sessionMin: t }); DB.settings.showDemo = v.showDemo; DB.settings.maintenance = v.maintenance;
  audit('تغییر تنظیمات امنیتی', 'settings', 'security', ''); refresh(); toast('تنظیمات امنیتی ذخیره شد.'); };
A.admUnit = d => { const u = UNITS.find(x => x.id === +d.id); formModal('ویرایش ' + u.name, [{ k: 'name', l: 'نام کامل', req: true }, { k: 'short', l: 'نام کوتاه', req: true }, { k: 'services', l: 'خدمات قابل درخواست (هر خط یک خدمت)', t: 'textarea' }], { name: u.name, short: u.short, services: SERVICES[u.id].join('\n') }, v => {
  DB.settings.units[u.id] = { name: v.name, short: v.short };
  DB.settings.services = DB.settings.services || {}; DB.settings.services[u.id] = v.services.split('\n').map(x => x.trim()).filter(Boolean);
  if (!DB.settings.services[u.id].length) return fail('دست‌کم یک خدمت لازم است.');
  audit('ویرایش مدیریت', 'settings', 'unit-' + u.id, v.name); applySettings(); return u; }); };
A.admSpace = d => { const x = d.id ? SPACES.find(s => s.id === d.id) : { cap: 50, excl: true, unit: 3 };
  formModal(d.id ? 'ویرایش فضا' : 'افزودن فضا', [{ k: 'name', l: 'نام', req: true }, { k: 'unit', l: 'مدیریت تأییدکننده', t: 'select', o: unitOpts(), req: true, blank: false }, { k: 'cap', l: 'ظرفیت (نفر)', t: 'number', req: true }, { k: 'excl', l: 'کنترل تداخل', t: 'check', cl: 'رزرو هم‌زمان مجاز نباشد' }], x, v => {
    const list = SPACES.map(s => ({ ...s }));
    if (d.id) Object.assign(list.find(s => s.id === d.id), { name: v.name, unit: +v.unit, cap: +v.cap, excl: v.excl });
    else list.push({ id: 'sp' + uid().slice(0, 6), name: v.name, unit: +v.unit, cap: +v.cap, excl: v.excl });
    DB.settings.spaces = list; audit(d.id ? 'ویرایش فضا' : 'افزودن فضا', 'settings', 'spaces', v.name); applySettings(); return x; }); };
A.admSpaceDel = d => { if (DB.reservations.some(r => r.space === d.id && r.status !== 'لغوشده' && r.date >= todayISO())) return toast('این فضا رزرو پیش رو دارد؛ ابتدا رزروها را لغو کنید.'); confirmBox('حذف فضا', 'این فضا از فهرست رزرو حذف شود؟ سوابق رزروهای گذشته حفظ می‌شود.', 'حذف', () => { DB.settings.spaces = SPACES.filter(s => s.id !== d.id).map(s => ({ ...s })); audit('حذف فضا', 'settings', 'spaces', d.id); applySettings(); }); };
A.admSaveLists = () => { const v = formVals('listf'); const L = t => t.split('\n').map(x => x.trim()).filter(Boolean); if (!L(v.letterCats).length || !L(v.leaveTypes).length) return toast('فهرست‌ها نباید خالی باشند.'); DB.settings.letterCats = L(v.letterCats); DB.settings.leaveTypes = L(v.leaveTypes); audit('ویرایش فهرست‌های پایه', 'settings', 'lists', ''); applySettings(); refresh(); toast('ذخیره شد.'); };
A.admOrgReset = () => confirmBox('بازگردانی ساختار', 'نام مدیریت‌ها، خدمات، فضاها و فهرست‌های پایه به حالت اولیه برمی‌گردد.', 'بازگردانی', () => { const s = DB.settings; s.units = {}; delete s.services; delete s.spaces; delete s.letterCats; delete s.leaveTypes; audit('بازگردانی ساختار به پیش‌فرض', 'settings', 'org', ''); applySettings(); toast('بازگردانی شد.'); });
A.admRec = d => {
  const [c, i] = d.id.split('|'); const rec = DB[c][+i];
  const safe = { ...rec }; if (c === 'users') delete safe.pass;
  modal({ title: `${DATA_COLS[c].t} — ویرایش مستقیم`, wide: true, body: `<textarea id="rec" class="json" spellcheck="false">${esc(JSON.stringify(safe, null, 2))}</textarea><div class="err" id="recerr"></div>${c === 'users' ? '<div class="hint">رمز عبور در این ویرایشگر نمایش داده نمی‌شود؛ برای تغییر رمز از «کاربران › تعیین رمز» استفاده کنید.</div>' : ''}`,
    foot: `${btn('ذخیره تغییرات', 'admRecSave', { id: d.id }, '', 'check')}${btn('حذف رکورد', 'admRecDel', { id: d.id }, 'danger', 'trash')}${btn('انصراف', 'close', {}, 'ghost')}` });
};
A.admRecSave = d => { const [c, i] = d.id.split('|'); let v; try { v = JSON.parse($('#rec').value); } catch (e) { $('#recerr').textContent = 'متن JSON معتبر نیست: ' + e.message; return; }
  const old = DB[c][+i]; if (c === 'users') v.pass = old.pass;
  const changed = Object.keys({ ...old, ...v }).filter(k => JSON.stringify(old[k]) !== JSON.stringify(v[k]));
  DB[c][+i] = v; audit('ویرایش مستقیم داده', c, v.id || i, changed.map(k => `${k}: ${String(JSON.stringify(old[k])).slice(0, 40)} ← ${String(JSON.stringify(v[k])).slice(0, 40)}`).join(' | ').slice(0, 400) || 'بدون تغییر');
  closeModal(); refresh(); toast('رکورد ذخیره شد.'); };
A.admRecDel = d => { const [c, i] = d.id.split('|'); const r = DB[c][+i]; if (c === 'users' && r.id === ME.user.id) return toast('حساب خودتان را نمی‌توانید حذف کنید.'); confirmBox('حذف رکورد', 'این رکورد برای همیشه حذف شود؟ اثر آن در رویدادهای سیستمی می‌ماند.', 'حذف', () => { DB[c].splice(+i, 1); audit('حذف مستقیم داده', c, r.id || i, JSON.stringify(r).slice(0, 200)); toast('حذف شد.'); }); };

/* ---------- ویرایش آسان رکوردها از پنجره جزئیات ---------- */
const EDITS = {
  task: { col: 'tasks', ok: r => isMgrOrOffice(r.unitId) || can('admin.data'), f: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اولویت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }], back: showTask },
  letter: { col: 'letters', ok: r => (isClerk(r.unitId) && r.status !== 'بایگانی') || can('admin.data'), f: [{ k: 'subject', l: 'موضوع', req: true, full: true }, { k: 'sender', l: 'فرستنده' }, { k: 'receiver', l: 'گیرنده' }, { k: 'cat', l: 'طبقه‌بندی', t: 'select', o: LETTER_CATS, blank: false }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'conf', l: 'محرمانگی', t: 'select', o: CONF, blank: false }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'body', l: 'متن', t: 'textarea' }], back: showLetter },
  order: { col: 'orders', ok: r => isImam() || can('admin.data'), f: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'priority', l: 'اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'due', l: 'مهلت', t: 'date', req: true }], back: showOrder },
  meet: { col: 'meetings', ok: r => canEditMeeting(r) || can('admin.data'), f: [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'place', l: 'مکان' }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time' }, { k: 'agenda', l: 'دستور جلسه', t: 'textarea' }], back: showMeeting },
  res: { col: 'reservations', ok: r => (r.by === ME.user.id && r.status === 'در انتظار تأیید') || canDecideRes(r) || can('admin.data'), f: [{ k: 'kind', l: 'نوع برنامه', req: true }, { k: 'date', l: 'تاریخ', t: 'date', req: true }, { k: 'start', l: 'شروع', t: 'time', req: true }, { k: 'end', l: 'پایان', t: 'time', req: true }, { k: 'people', l: 'تعداد افراد', t: 'number' }, { k: 'equip', l: 'تجهیزات' }, { k: 'desc', l: 'توضیحات', t: 'textarea' }], back: showRes,
    check: (r, v) => { if (v.end <= v.start) return 'ساعت پایان باید بعد از شروع باشد.'; if (r.status === 'تأییدشده' && resConflicts({ ...r, ...v }).length) return 'این تغییر با رزرو تأییدشده دیگری تداخل دارد.'; } },
  asset: { col: 'assets', ok: r => canManageAsset(r) || can('admin.data'), f: [{ k: 'name', l: 'نام', req: true, full: true }, { k: 'cat', l: 'گروه' }, { k: 'serial', l: 'شماره سریال' }, { k: 'value', l: 'ارزش (ریال)', t: 'number' }, { k: 'specs', l: 'مشخصات فنی', t: 'textarea' }], back: showAsset }
};
const editBtn = (k, r) => (EDITS[k].ok(r) ? btn('ویرایش', 'editRec', { k, id: r.id }, 'ghost', 'edit') : '');
A.editRec = d => {
  const E = EDITS[d.k]; const r = DB[E.col].find(x => x.id === d.id);
  formModal('ویرایش', E.f, r, v => {
    if (!E.ok(r)) return fail('ویرایش این مورد برای جایگاه شما مجاز نیست.');
    const err = E.check && E.check(r, v); if (err) return fail(err);
    const ch = E.f.map(f => f.k).filter(k => String(r[k] ?? '') !== String(v[k] ?? ''));
    if (!ch.length) return r;
    ch.forEach(k => (r[k] = v[k]));
    hist(r, 'ویرایش', ch.map(k => E.f.find(f => f.k === k).l).join('، '));
    audit('ویرایش ' + E.col, E.col, r.id, r.no || r.code || '');
    return r;
  }, { submit: 'ذخیره تغییرات', done: 'تغییرات ذخیره شد.', reopen: () => E.back(r.id) });
};

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
  if (hash('shabab:' + en(v.cur)) !== ME.user.pass) return fail('رمز فعلی درست نیست.');
  if (v.p1 !== v.p2) return fail('رمز جدید و تکرار آن یکسان نیست.');
  return setPassword(ME.user, v.p1, false, true);
}, { submit: 'تغییر رمز', done: 'رمز عبور شما تغییر کرد.' });
A.myPhone = () => formModal('تلفن همراه', [{ k: 'phone', l: 'شماره همراه', t: 'tel', req: true }], ME.user, v => { if (!/^0?9\d{9}$/.test(en(v.phone).replace(/\D/g, ''))) return fail('شماره همراه معتبر نیست.'); ME.user.phone = en(v.phone); audit('تغییر تلفن توسط کاربر', 'user', ME.user.id, ''); return ME.user; });

/* ---------- تنظیمات و آرشیو (برای همه کاربران) ---------- */
const _systemPage = PAGES.system;
PAGES.system = () => {
  const v = vs('sys', { tab: 'archive' });
  if (!['archive', 'audit'].includes(v.tab)) v.tab = 'archive';
  return _systemPage().replace(/<div class="tabs"[\s\S]*?<\/div>/, tabs('sys', [['archive', 'آرشیو سامانه'], ['audit', 'رویدادهای واحد من']], v.tab) + (canAdminPanel() ? `<div class="notice">تنظیمات، پیامک و پشتیبان‌گیری به <a href="#admin">پنل مدیریت سامانه</a> منتقل شده است.</div>` : ''));
};
